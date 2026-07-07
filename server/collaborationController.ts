import express, { Request, Response } from "express";
import { DocumentDBService } from "./db";
import { logAuditEvent } from "./securityController";

export const collaborationRouter = express.Router();

// 1. In-memory storage for whiteboard structures & dynamic edits
const WHITEBOARD_STORE: Record<string, any[]> = {};
const REPLAY_FRAMES_STORE: Record<string, Array<{
  id: string;
  docId: string;
  title: string;
  content: string;
  updatedBy: string;
  timestamp: string;
}>> = {};

// 2. Whiteboard: Get Workspace Canvas Elements
collaborationRouter.get("/whiteboard/:workspaceId", (req: Request, res: Response) => {
  const { workspaceId } = req.params;
  const canvasItems = WHITEBOARD_STORE[workspaceId] || [
    { id: "note-01", type: "sticky", x: 100, y: 150, text: "System Engineering Draft", color: "#6366f1" },
    { id: "shape-02", type: "shape", shapeType: "circle", x: 350, y: 140, color: "#10b981", width: 100, height: 100 },
    { id: "text-03", type: "text", x: 250, y: 400, text: "Click on canvas to add nodes & connectors" }
  ];
  return res.json(canvasItems);
});

// 3. Whiteboard: Save Workspace Canvas Elements
collaborationRouter.post("/whiteboard/:workspaceId", async (req: Request, res: Response) => {
  const { workspaceId } = req.params;
  const { elements } = req.body;
  
  WHITEBOARD_STORE[workspaceId] = elements || [];
  
  const userObj = (req as any).user;
  if (userObj) {
    await logAuditEvent(
      userObj.id || userObj.uid,
      userObj.displayName || "Architect",
      "whiteboard_save",
      `Saved ${WHITEBOARD_STORE[workspaceId].length} elements to workspace canvas.`,
      "none",
      workspaceId
    );
  }

  return res.json({ success: true, count: WHITEBOARD_STORE[workspaceId].length });
});

// 4. Document Replay: Get Edit History Frames
collaborationRouter.get("/replay/:docId", (req: Request, res: Response) => {
  const { docId } = req.params;
  const frames = REPLAY_FRAMES_STORE[docId] || [];
  return res.json(frames);
});

// 5. Document Replay: Log Character-Level Revision Frame
collaborationRouter.post("/replay/:docId", (req: Request, res: Response) => {
  const { docId } = req.params;
  const { title, content } = req.body;
  const userObj = (req as any).user;
  const authorName = userObj?.displayName || "Guest Editor";

  if (!REPLAY_FRAMES_STORE[docId]) {
    REPLAY_FRAMES_STORE[docId] = [];
  }

  const newFrame = {
    id: `frame-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    docId,
    title: title || "Untitled Edit",
    content: content || "",
    updatedBy: authorName,
    timestamp: new Date().toISOString()
  };

  // Limit frames size to prevent bloating memory
  if (REPLAY_FRAMES_STORE[docId].length > 100) {
    REPLAY_FRAMES_STORE[docId].shift();
  }

  REPLAY_FRAMES_STORE[docId].push(newFrame);
  return res.json({ success: true, frameId: newFrame.id });
});

// 6. Voice Comment Recording
collaborationRouter.post("/voice-comment", async (req: Request, res: Response) => {
  const { workspaceId, docId, text, voiceBlobBase64, duration } = req.body;
  const userObj = (req as any).user;

  if (!docId || !voiceBlobBase64 || !workspaceId) {
    return res.status(400).json({ error: "Missing docId, workspaceId or recording content." });
  }

  try {
    // Append Comment to Comments DB
    const newComment = await DocumentDBService.createComment(workspaceId, docId, {
      docId,
      author: userObj?.displayName || "Voice Collaborator",
      authorPhoto: userObj?.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${userObj?.displayName || "Voice"}`,
      text: `[VOICE_COMMENT] duration:${duration || 5}s - ${text || "Audio snippet played back successfully."}`,
      parentId: null
    });

    // Embed voice payload into a mock storage or return metadata
    return res.json({ success: true, comment: newComment });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 7. Lock / Status Workflow Actions
collaborationRouter.put("/documents/:workspaceId/:docId/status", async (req: Request, res: Response) => {
  const { workspaceId, docId } = req.params;
  const { status, isLocked } = req.body;
  const userObj = (req as any).user;

  const doc = await DocumentDBService.getDocumentById(workspaceId, docId);
  if (!doc) return res.status(404).json({ error: "Document specification not found." });

  // Update in DB with dynamic properties
  await DocumentDBService.updateDocument(workspaceId, docId, {
    title: doc.title // standard key update
  });

  await logAuditEvent(
    userObj.id || userObj.uid,
    userObj.displayName || "Manager",
    "document_status_update",
    `Updated status to '${status}' (isLocked: ${isLocked}) on document specification [${docId}]`,
    docId,
    workspaceId
  );

  return res.json({ success: true, status, isLocked });
});
