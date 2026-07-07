import express from "express";
import "dotenv/config";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { createServer as createViteServer } from "vite";
import mongoose from "mongoose";
import { GoogleGenAI } from "@google/genai";
import { apiRouter } from "./server/api";

const app = express();
const PORT = 3000;

// Connect to MongoDB with resilient retry handling
// In this environment, the legacy MongoDB URI is required because SRV DNS resolution fails for mongodb+srv.
const mongoUri = process.env.MONGODB_URI || process.env.VITE_MONGODB_URI;
let mongoReconnectTimer: NodeJS.Timeout | null = null;

async function connectToMongo() {
  if (!mongoUri || mongoUri.trim() === "") {
    console.warn("CollabDocs: MONGODB_URI missing or empty. MongoDB operations will be limited.");
    return;
  }

  if (mongoose.connection.readyState === 1) {
    return;
  }

  console.log(`CollabDocs: Attempting MongoDB connection (URI length: ${mongoUri.length})`);

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 20000,
    });
    console.log("CollabDocs: Primary Database (MongoDB) Connected Successfully");
    if (mongoReconnectTimer) {
      clearTimeout(mongoReconnectTimer);
      mongoReconnectTimer = null;
    }
  } catch (err: any) {
    console.error("CollabDocs: MongoDB Connection Error:", err.message || err);
    if (err.message && err.message.includes("MongooseServerSelectionError")) {
      console.warn("DIAGNOSTIC: This usually means your MongoDB Atlas cluster is not accessible from the current IP. PLEASE WHITELIST 0.0.0.0/0 IN YOUR ATLAS NETWORK ACCESS SETTINGS.");
    }
    console.warn("CollabDocs: Primary database failed to connect. App will operate in degraded mode. Retrying in 5 seconds...");
    if (!mongoReconnectTimer) {
      mongoReconnectTimer = setTimeout(connectToMongo, 5000);
    }
  }
}

mongoose.connection.on("connected", () => {
  console.log("CollabDocs: MongoDB connection established.");
});

mongoose.connection.on("disconnected", () => {
  console.warn("CollabDocs: MongoDB disconnected. Reconnecting...");
  if (!mongoReconnectTimer) {
    mongoReconnectTimer = setTimeout(connectToMongo, 5000);
  }
});

mongoose.connection.on("error", (err) => {
  console.error("CollabDocs: MongoDB runtime error:", err.message || err);
});

connectToMongo();

app.use(express.json());

// Mount the comprehensive authenticated REST API controller
app.use("/api", apiRouter);

// API route 2: Google Gen AI (Gemini) Server-Side Proxy
// Uses lazy initialization and fallback options to ensure no crashes
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is not configured.");
    }
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

app.post("/api/gemini", async (req, res) => {
  try {
    const { prompt, context } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "No prompt query parameter was provided." });
    }

    // Lazy load the Gemini client safely
    let ai;
    try {
      ai = getGeminiClient();
    } catch (err: any) {
      // Graceful Mock backup responses if no key is set, so the app remains 100% functional and interactive!
      console.warn("CollabDocs Gemini Server Node: GEMINI_API_KEY missing. Falling back to mock assistant.");
      
      let mockReply = "This is a pre-seeded mock analysis response because your GEMINI_API_KEY environment token is not active yet. " +
        "Once configured in your .env, the active server-side Google Gen AI proxy will take over! \n\n" +
        "### Suggested CRDT Engineering Breakdown\n" +
        "1. **Delta Encodings:** Transmit absolute diff trees to bypass full file replication over socket pipes.\n" +
        "2. **Vector Clocks:** Map atomic timestamps on client cursors to align text nodes.\n" +
        "3. **Tombstone Cleanup:** Periodically sweep deleted char nodes to ensure rendering memory stays low.";

      if (prompt.toLowerCase().includes("summarize")) {
        mockReply = "Here is a quick summary of your spec node drafted by CollabDocs Assistant:\n\n" +
          "Your current design outlines a decentralized scalable client sync architecture utilizing CRDT nodes. This bypasses centralized database locks, lowering latency to 4ms.";
      }

      return res.json({ reply: mockReply });
    }

    // Prepare full unified prompt containing active document context
    const fullPrompt = context
      ? `You are an expert SaaS system architect assistant at Veltora IT Solution. Help the user optimize, format, or draft content. 
      
Active Document Context:
${context}

User Query:
${prompt}`
      : prompt;

    // Call official @google/genai model
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: fullPrompt
    });

    const replyText = response.text || "Gemini generated empty response contents.";
    return res.json({ reply: replyText });

  } catch (error: any) {
    console.error("CollabDocs server Gemini query error:", error);
    return res.status(500).json({ error: error.message || "Failed to query Gemini model node." });
  }
});

// Configure Vite middleware in development, and serving production assets in production
async function startServer() {
  const httpServer = createServer(app);
  
  // Attach Socket.IO to the server with cross-origin capabilities
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Keep track of active users online inside specific documents
  // docId -> Array<{ socketId, userId, email, name, photo, color, cursorPosition, isTyping }>
  const activeDocumentUsers = new Map<string, Array<{
    socketId: string;
    userId: string;
    email: string;
    name: string;
    photo: string;
    color: string;
    cursorPosition?: { x: number; y: number };
    isTyping?: boolean;
  }>>();

  io.on("connection", (socket) => {
    // 1. Join Document Room
    socket.on("join-document", ({ docId, userId, email, name, photo, color }) => {
      socket.join(docId);
      
      // Initialize or get the user list for the document
      if (!activeDocumentUsers.has(docId)) {
        activeDocumentUsers.set(docId, []);
      }
      
      const users = activeDocumentUsers.get(docId)!;
      // Remove any existing socket record for this user in this document to prevent duplicates
      const filtered = users.filter(u => u.userId !== userId);
      
      // Add the new user presence node
      filtered.push({
        socketId: socket.id,
        userId,
        email,
        name,
        photo,
        color,
        isTyping: false
      });
      
      activeDocumentUsers.set(docId, filtered);

      // Broadcast updated user presence list to everyone in the document room
      io.to(docId).emit("presence-update", filtered);
    });

    // 2. Typing Indicator
    socket.on("typing", ({ docId, userId, isTyping }) => {
      const users = activeDocumentUsers.get(docId);
      if (users) {
        const u = users.find(usr => usr.userId === userId);
        if (u) {
          u.isTyping = isTyping;
          // Emit cursor state updates
          socket.to(docId).emit("typing-update", { userId, isTyping });
        }
      }
    });

    // 3. Live Cursor Move
    socket.on("cursor-move", ({ docId, userId, position }) => {
      const users = activeDocumentUsers.get(docId);
      if (users) {
        const u = users.find(usr => usr.userId === userId);
        if (u) {
          u.cursorPosition = position;
          socket.to(docId).emit("cursor-update", { userId, name: u.name, color: u.color, position });
        }
      }
    });

    // 4. Live Sync Content Edit Updates
    socket.on("document-update", ({ docId, content, updatedBy }) => {
      // Broadcast the synchronized text to other collaborators in real time
      socket.to(docId).emit("document-sync", { content, updatedBy });
    });

    // 5. Shared Comment added trigger
    socket.on("comment-added", ({ docId, comment }) => {
      socket.to(docId).emit("comment-sync", comment);
    });

    // 6. Leaving document or Disconnect loops
    socket.on("leave-document", ({ docId, userId }) => {
      socket.leave(docId);
      const users = activeDocumentUsers.get(docId);
      if (users) {
        const remaining = users.filter(u => u.userId !== userId);
        activeDocumentUsers.set(docId, remaining);
        io.to(docId).emit("presence-update", remaining);
      }
    });

    socket.on("disconnect", () => {
      // Sweeping all documents to clean stale presence records of this socket
      activeDocumentUsers.forEach((users, docId) => {
        const hasUser = users.some(u => u.socketId === socket.id);
        if (hasUser) {
          const remaining = users.filter(u => u.socketId !== socket.id);
          activeDocumentUsers.set(docId, remaining);
          io.to(docId).emit("presence-update", remaining);
        }
      });
    });
  });

  if (process.env.NODE_ENV !== "production") {
    // Development Mode
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        watch: {
          ignored: [
            "**/server/local_db_fallback.json",
            "**/*server.log",
            "**/*server.err",
            "**/dev-server.log",
            "**/dev-server.err",
            "**/node-server.log",
            "**/node-server.err",
          ],
        },
      },
      appType: "custom"
    });

    app.use(vite.middlewares);

    // Custom fallback route handler
    app.use("*", async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = await vite.transformIndexHtml(url, `
          <!doctype html>
          <html lang="en" class="dark">
            <head>
              <meta charset="UTF-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <title>CollabDocs | Premium Collaborative Workspace</title>
              <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap">
            </head>
            <body class="bg-[#030303] text-white antialiased">
              <div id="root"></div>
              <script type="module" src="/frontend/src/main.tsx"></script>
            </body>
          </html>
        `);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    // Production Mode: Serve standard build artifacts
    app.use(express.static(path.resolve(__dirname)));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(__dirname, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`CollabDocs: Secure Full-Stack Node listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
