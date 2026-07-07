import express, { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import crypto from "crypto";
import { DocumentDBService } from "./db";
import * as mailer from "./email";
import { adminAuth, adminDb, isFirebaseAdminConfigured } from "./firebaseAdmin";

// Import our modular enterprise and AI SaaS sub-routers
import { aiRouter } from "./aiController";
import { securityRouter } from "./securityController";
import { collaborationRouter } from "./collaborationController";
import { pluginRouter } from "./pluginController";
import { enterpriseRouter } from "./enterpriseController";

function parseFullName(name: string | null | undefined) {
  const normalized = (name || "").trim();
  const parts = normalized.split(/\s+/).filter(Boolean);
  return {
    displayName: normalized || "User",
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" ") || ""
  };
}

function getProviderFromToken(decodedToken: any) {
  if (decodedToken.firebase?.sign_in_provider) return decodedToken.firebase.sign_in_provider;
  if (decodedToken.provider_id) return decodedToken.provider_id;
  return "password";
}

async function syncFirebaseAuthProfile(uid: string, profile: { displayName?: string; photoURL?: string }) {
  if (!isFirebaseAdminConfigured || typeof (adminAuth as any).updateUser !== "function") {
    return;
  }
  try {
    await (adminAuth as any).updateUser(uid, profile);
  } catch (error: any) {
    console.warn("[Auth] Firebase Auth profile sync failed:", error?.message || error);
  }
}

export const apiRouter = express.Router();

// Mount SaaS Enterprise Controllers
apiRouter.use("/ai", authenticateToken, aiRouter);
apiRouter.use("/security", authenticateToken, securityRouter);
apiRouter.use("/collaboration", authenticateToken, collaborationRouter);
apiRouter.use("/plugins", authenticateToken, pluginRouter);
apiRouter.use("/enterprise", authenticateToken, enterpriseRouter);

// Extend Request interface to support authenticated user metadata
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    emailVerified: boolean;
    displayName: string;
    photoURL: string;
    plan: "free" | "pro_monthly" | "pro_yearly" | "premium";
    role?: string;
  };
}

// Firebase ID Token Authentication Middleware
export async function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token || token === "undefined" || token === "null") {
    return res.status(401).json({ error: "Access denied. Auth token is missing or malformed." });
  }

  // Handle local fallback mock tokens directly
  if (token.startsWith("mock-token-")) {
    const uid = token.replace("mock-token-", "");
    try {
      const liveUser = await DocumentDBService.getUserById(uid);
      if (!liveUser) {
        return res.status(403).json({ error: "Mock session user not found." });
      }
      req.user = {
        id: liveUser.id,
        email: liveUser.email,
        emailVerified: liveUser.emailVerified,
        displayName: liveUser.displayName,
        photoURL: liveUser.photoURL,
        plan: liveUser.plan,
        role: liveUser.role || "user"
      };
      return next();
    } catch (e: any) {
      console.error("Local mock token resolution error:", e);
      return res.status(500).json({ error: "Failed to resolve local mock session." });
    }
  }

  // Basic check for JWT format to avoid unnecessary calls to Firebase Admin
  if (!token.includes(".")) {
      console.warn("[Auth] Token does not look like a JWT:", token.substring(0, 20) + "...");
      return res.status(403).json({ error: "Auth token format is invalid." });
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    // Fetch live user from DB to get the most recent plan details
    const liveUser = await DocumentDBService.getUserById(decodedToken.uid);
    
    if (liveUser) {
      req.user = {
        id: liveUser.id,
        email: liveUser.email,
        emailVerified: liveUser.emailVerified || decodedToken.email_verified || false,
        displayName: liveUser.displayName,
        photoURL: liveUser.photoURL,
        plan: liveUser.plan,
        role: liveUser.role || "user"
      };
    } else {
      // Temporary fallback for just-registered users or missing DB records
      req.user = {
        id: decodedToken.uid,
        email: decodedToken.email || "",
        emailVerified: decodedToken.email_verified || false,
        displayName: (decodedToken as any).name || "User",
        photoURL: (decodedToken as any).picture || "",
        plan: "free",
        role: "user"
      };
    }
    next();
  } catch (error) {
    console.error("Auth verification failed:", error);
    return res.status(403).json({ error: "Auth token is stale or invalid." });
  }
}

// API Health Check & Diagnostics
apiRouter.get("/health", async (req, res) => {
  const mongoState = mongoose.connection.readyState;
  const mongoStates = ["disconnected", "connected", "connecting", "disconnecting"];
  const mongoStatus = mongoStates[mongoState] || "unknown";
  
  let firestoreStatus = "unknown";
  try {
    if (isFirebaseAdminConfigured && adminDb) {
      firestoreStatus = "available";
    } else {
      firestoreStatus = "local_fallback";
    }
  } catch (e) {
    firestoreStatus = "error";
  }

  res.json({
    status: "ok",
    databases: {
      mongodb: {
        status: mongoStatus,
        readyState: mongoState,
        host: mongoose.connection.host || "none",
        models: Object.keys(mongoose.models)
      },
      firestore: {
        status: firestoreStatus
      }
    },
    environment: {
      nodeEnv: process.env.NODE_ENV,
      projectId: process.env.FIREBASE_PROJECT_ID || "not_set",
      hasMongoUri: !!(process.env.MONGODB_URI || process.env.VITE_MONGODB_URI)
    }
  });
});

// Authentication Controller Endpoints

apiRouter.post("/auth/password-reset", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "A valid email address is required." });
    }

    if (!isFirebaseAdminConfigured || typeof (adminAuth as any).generatePasswordResetLink !== "function") {
      return res.status(503).json({ error: "Firebase Admin password reset is not configured." });
    }

    if (!mailer.isSmtpConfigured()) {
      return res.status(503).json({ error: "SMTP is not configured. Please set SMTP_EMAIL, SMTP_PASSWORD, and SMTP_HOST." });
    }

    const resetLink = await (adminAuth as any).generatePasswordResetLink(email);
    const mailResult = await mailer.sendPasswordResetLink(email, resetLink);

    if (!mailResult.success) {
      return res.status(502).json({ error: mailResult.error || "SMTP password reset email failed." });
    }

    return res.json({ success: true });
  } catch (e: any) {
    console.error("Password reset dispatch error:", e);
    if (e?.code === "auth/user-not-found") {
      return res.status(404).json({ error: "No Firebase Auth account exists for this email address." });
    }
    return res.status(500).json({ error: e.message || "Password reset dispatch failed." });
  }
});

// Register new account
apiRouter.post("/auth/register", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers["authorization"];
    const idToken = authHeader && authHeader.split(" ")[1];
    
    if (!idToken) {
      return res.status(401).json({ error: "Firebase ID token required." });
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const { email, displayName } = req.body;

    const existing = await DocumentDBService.getUserById(decodedToken.uid);
    console.log("[Auth] Existing user check:", existing ? "Found" : "Not Found");
    if (existing) {
      return res.json({
        user: {
          uid: existing.id,
          email: existing.email,
          emailVerified: existing.emailVerified,
          displayName: existing.displayName,
          firstName: existing.firstName,
          lastName: existing.lastName,
          bio: existing.bio,
          organization: existing.organization,
          timezone: existing.timezone,
          language: existing.language,
          provider: existing.provider,
          photoURL: existing.photoURL,
          plan: existing.plan,
          role: existing.role || "user",
          createdAt: existing.createdAt
        },
        workspaceId: (await DocumentDBService.getUserWorkspaces(existing.id))[0]?.id || null
      });
    }

    console.log("[Auth] Creating new user for:", decodedToken.uid);
    const rawDisplayName = displayName || (decodedToken as any).name || "Subscriber";
    const parsedName = parseFullName(rawDisplayName);
    const provider = getProviderFromToken(decodedToken);
    const photoURL = (decodedToken as any).picture || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(parsedName.displayName)}`;

    const newUser = await DocumentDBService.createUser({
      id: decodedToken.uid,
      email: email || decodedToken.email || "",
      emailVerified: decodedToken.email_verified || false,
      displayName: parsedName.displayName,
      firstName: parsedName.firstName,
      lastName: parsedName.lastName,
      bio: "",
      organization: "",
      timezone: "",
      language: "",
      provider,
      photoURL,
      planStatus: "active",
      subscriptionId: null,
      renewalDate: null,
      billingStatus: "unpaid"
    });
    console.log("[Auth] New user created:", newUser.id);

    const newWorkspace = await DocumentDBService.createWorkspace(
      `${newUser.displayName}'s Workspace`,
      newUser.id,
      newUser.email
    );

    const emailResult = await mailer.sendWelcomeEmail(newUser.email, newUser.displayName);
    if (!emailResult.success) {
      console.warn("Welcome email failed for user:", newUser.email, emailResult.error);
    }

    return res.json({
      token: idToken,
      user: {
        uid: newUser.id,
        email: newUser.email,
        emailVerified: newUser.emailVerified,
        displayName: newUser.displayName,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        bio: newUser.bio,
        organization: newUser.organization,
        timezone: newUser.timezone,
        language: newUser.language,
        provider: newUser.provider,
        photoURL: newUser.photoURL,
        plan: newUser.plan,
        role: newUser.role || "user",
        createdAt: newUser.createdAt
      },
      workspaceId: newWorkspace.id
    });
  } catch (e: any) {
    console.error("Registration error:", e);
    return res.status(500).json({ error: e.message || "Sign-up dispatcher error." });
  }
});

// Authenticate and Login Sync
apiRouter.post("/auth/login", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers["authorization"];
    const idToken = authHeader && authHeader.split(" ")[1];
    
    if (!idToken) {
      return res.status(401).json({ error: "Firebase ID token required." });
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    let user = await DocumentDBService.getUserById(decodedToken.uid);
    
    if (!user) {
      console.log(`[Auth] User missing in DB, auto-registering: ${decodedToken.uid}`);
      const rawDisplayName = (decodedToken as any).name || "User";
      const parsedName = parseFullName(rawDisplayName);
      const provider = getProviderFromToken(decodedToken);
      const photoURL = (decodedToken as any).picture || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(parsedName.displayName)}`;

      user = await DocumentDBService.createUser({
        id: decodedToken.uid,
        email: decodedToken.email || "",
        emailVerified: decodedToken.email_verified || false,
        displayName: parsedName.displayName,
        firstName: parsedName.firstName,
        lastName: parsedName.lastName,
        bio: "",
        organization: "",
        timezone: "",
        language: "",
        provider,
        photoURL,
        planStatus: "active",
        subscriptionId: null,
        renewalDate: null,
        billingStatus: "unpaid"
      });
      await DocumentDBService.createWorkspace(
        `${user.displayName}'s Workspace`,
        user.id,
        user.email
      );
    }

    // Fetch user's workspaces
    const workspaces = await DocumentDBService.getUserWorkspaces(user.id);
    const primaryWorkspaceId = workspaces.length > 0 ? workspaces[0].id : null;

    return res.json({
      token: idToken,
      user: {
        uid: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        displayName: user.displayName,
        firstName: user.firstName,
        lastName: user.lastName,
        bio: user.bio,
        organization: user.organization,
        timezone: user.timezone,
        language: user.language,
        provider: user.provider,
        photoURL: user.photoURL,
        plan: user.plan,
        role: user.role || "user",
        createdAt: user.createdAt
      },
      workspaceId: primaryWorkspaceId
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || "Auth login error." });
  }
});

// Local Auth Register Fallback
apiRouter.post("/auth/local-register", async (req: Request, res: Response) => {
  try {
    const { email, password, displayName } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const existing = await DocumentDBService.getUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: "An account with this email already exists." });
    }

    const uid = `local-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    console.log("[Auth] Creating new local user for:", uid);

    const displayNameValue = displayName || "Local User";
    const parsedName = parseFullName(displayNameValue);
    const newUser = await DocumentDBService.createUser({
      id: uid,
      email,
      password,
      emailVerified: true,
      displayName: parsedName.displayName,
      firstName: parsedName.firstName,
      lastName: parsedName.lastName,
      bio: "",
      organization: "",
      timezone: "",
      language: "",
      provider: "password",
      photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(parsedName.displayName)}`,
      planStatus: "active",
      subscriptionId: null,
      renewalDate: null,
      billingStatus: "unpaid"
    });

    const emailResult = await mailer.sendWelcomeEmail(newUser.email, newUser.displayName);
    if (!emailResult.success) {
      console.warn("Welcome email failed for local user:", newUser.email, emailResult.error);
    }

    const newWorkspace = await DocumentDBService.createWorkspace(
      `${newUser.displayName}'s Workspace`,
      newUser.id,
      newUser.email
    );

    const mockToken = `mock-token-${uid}`;

    return res.json({
      token: mockToken,
      user: {
        uid: newUser.id,
        email: newUser.email,
        emailVerified: newUser.emailVerified,
        displayName: newUser.displayName,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        bio: newUser.bio,
        organization: newUser.organization,
        timezone: newUser.timezone,
        language: newUser.language,
        provider: newUser.provider,
        photoURL: newUser.photoURL,
        plan: newUser.plan,
        role: newUser.role || "user",
        createdAt: newUser.createdAt
      },
      workspaceId: newWorkspace.id
    });
  } catch (e: any) {
    console.error("Local registration error:", e);
    return res.status(500).json({ error: e.message || "Local sign-up error." });
  }
});

// Local Auth Login Fallback
apiRouter.post("/auth/local-login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const user = await DocumentDBService.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: "Invalid credentials. Please check your email and password." });
    }

    if (user.password !== password) {
      return res.status(401).json({ error: "Invalid credentials. Please check your email and password." });
    }

    const workspaces = await DocumentDBService.getUserWorkspaces(user.id);
    const primaryWorkspaceId = workspaces.length > 0 ? workspaces[0].id : null;

    const mockToken = `mock-token-${user.id}`;

    return res.json({
      token: mockToken,
      user: {
        uid: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        displayName: user.displayName,
        firstName: user.firstName,
        lastName: user.lastName,
        bio: user.bio,
        organization: user.organization,
        timezone: user.timezone,
        language: user.language,
        provider: user.provider,
        photoURL: user.photoURL,
        plan: user.plan,
        role: user.role || "user",
        createdAt: user.createdAt
      },
      workspaceId: primaryWorkspaceId
    });
  } catch (e: any) {
    console.error("Local login error:", e);
    return res.status(500).json({ error: e.message || "Local login error." });
  }
});

apiRouter.post("/auth/logout", async (_req: Request, res: Response) => {
  return res.json({ success: true, message: "Session cleared." });
});

// Fetch active identity session
apiRouter.get("/auth/me", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await DocumentDBService.getUserById(req.user!.id);
    if (!user) {
      return res.status(404).json({ error: "User identity node not found in core cluster." });
    }
    return res.json({
      uid: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
      displayName: user.displayName,
      firstName: user.firstName,
      lastName: user.lastName,
      bio: user.bio,
      organization: user.organization,
      timezone: user.timezone,
      language: user.language,
      provider: user.provider,
      photoURL: user.photoURL,
      plan: user.plan,
      createdAt: user.createdAt
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || "Me identity error." });
  }
});

apiRouter.put("/auth/profile", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      displayName,
      firstName,
      lastName,
      bio,
      organization,
      timezone,
      language,
      photoURL
    } = req.body;

    const updates: Partial<Record<string, unknown>> = {};
    if (typeof displayName === "string") updates.displayName = displayName.trim();
    if (typeof firstName === "string") updates.firstName = firstName.trim();
    if (typeof lastName === "string") updates.lastName = lastName.trim();
    if (typeof bio === "string") updates.bio = bio.trim();
    if (typeof organization === "string") updates.organization = organization.trim();
    if (typeof timezone === "string") updates.timezone = timezone.trim();
    if (typeof language === "string") updates.language = language.trim();
    if (typeof photoURL === "string") updates.photoURL = photoURL.trim();

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No profile fields were provided for update." });
    }

    const existingUser = await DocumentDBService.getUserById(req.user!.id);
    if (!existingUser) {
      return res.status(404).json({ error: "User profile not found." });
    }

    const updatedUser = await DocumentDBService.updateUser(req.user!.id, updates as any);
    if (!updatedUser) {
      return res.status(404).json({ error: "Failed to update user profile." });
    }

    if (typeof displayName === "string" || typeof photoURL === "string") {
      await syncFirebaseAuthProfile(req.user!.id, {
        displayName: typeof displayName === "string" ? displayName.trim() : undefined,
        photoURL: typeof photoURL === "string" ? photoURL.trim() : undefined
      });
    }

    if (typeof displayName === "string" && displayName.trim() && existingUser.displayName !== displayName.trim()) {
      const ownedWorkspaces = await DocumentDBService.getUserWorkspaces(req.user!.id);
      await Promise.all(
        ownedWorkspaces
          .filter((workspace) => workspace.ownerId === req.user!.id && workspace.name === `${existingUser.displayName}'s Workspace`)
          .map((workspace) => DocumentDBService.updateWorkspace(workspace.id, { name: `${displayName.trim()}'s Workspace` }))
      );
    }

    return res.json({
      user: {
        uid: updatedUser.id,
        email: updatedUser.email,
        emailVerified: updatedUser.emailVerified,
        displayName: updatedUser.displayName,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        bio: updatedUser.bio,
        organization: updatedUser.organization,
        timezone: updatedUser.timezone,
        language: updatedUser.language,
        provider: updatedUser.provider,
        photoURL: updatedUser.photoURL,
        plan: updatedUser.plan,
        role: updatedUser.role || "user",
        createdAt: updatedUser.createdAt
      }
    });
  } catch (e: any) {
    console.error("Profile update error:", e);
    return res.status(500).json({ error: e.message || "Profile update failed." });
  }
});

// Update plan status (Premium Plan Upgrade trigger)
apiRouter.post("/auth/upgrade", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updatedUser = await DocumentDBService.updateUser(req.user!.id, { plan: "premium" });
    if (!updatedUser) {
      return res.status(404).json({ error: "User not found." });
    }
    
    // Create notification & activity
    await DocumentDBService.createNotification(
      updatedUser.id,
      "Upgrade Dispatched Successfully",
      "Welcome to CollabDocs Premium. Unlimited collaboration, cross-device sync, and full cloud backups are now unlocked!"
    );

    return res.json({
      user: {
        uid: updatedUser.id,
        email: updatedUser.email,
        displayName: updatedUser.displayName,
        photoURL: updatedUser.photoURL,
        plan: updatedUser.plan,
        createdAt: updatedUser.createdAt
      }
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});


// ==========================================
// SUPPORT & FEEDBACK CONTROLLER
// ==========================================

apiRouter.post("/support/feedback", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, contact, email, type, issue } = req.body;
    if (!issue || !email || !name) return res.status(400).json({ error: "All fields are required." });
    
    const message = `
Name: ${name}
Contact: ${contact}
Email: ${email}
Type: ${type}

Issue:
${issue}
    `;

    await mailer.sendSupportFeedback(email, message);
    await mailer.sendSupportAutomatedResponse(email, name, type);
    return res.json({ success: true, message: "Feedback sent successfully." });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// ==========================================
// WORKSPACE CONTROLLER ENDPOINTS
// ==========================================

// Get user's workspaces
apiRouter.get("/workspaces", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const list = await DocumentDBService.getUserWorkspaces(req.user!.id);
    return res.json(list);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// Create new workspace
apiRouter.post("/workspaces", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Workspace title is empty." });

    const newWs = await DocumentDBService.createWorkspace(name, req.user!.id, req.user!.email);
    
    // Seed general folder
    await DocumentDBService.createFolder("Main Drafts", newWs.id, null);

    return res.json(newWs);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// Update workspace (Rename or Settings)
apiRouter.put("/workspaces/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, avatar } = req.body;
    const ws = await DocumentDBService.getWorkspaceById(req.params.id);

    if (!ws) return res.status(404).json({ error: "Workspace not found." });
    if (ws.ownerId !== req.user!.id) {
      return res.status(403).json({ error: "You are not authorized to update this workspace settings." });
    }

    const updated = await DocumentDBService.updateWorkspace(req.params.id, { name, avatar });
    return res.json(updated);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// Invite collaborators by email
apiRouter.post("/workspaces/:id/invite", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, role } = req.body; // role: 'editor' | 'viewer'
    if (!email) return res.status(400).json({ error: "Invite email address is empty." });

    const ws = await DocumentDBService.getWorkspaceById(req.params.id);
    if (!ws) return res.status(404).json({ error: "Workspace not found." });

    // Free plan restricts collaborators to max 2 members total in workspace
    if (req.user!.plan === "free" && ws.members.length >= 2) {
      return res.status(403).json({
        error: "Free Plan Limited",
        limitReached: true,
        message: "Your current Free Plan supports up to 2 collaborators. Please upgrade to unlock unlimited teammates!"
      });
    }

    // Check if user is registered, if yes add them. Otherwise, add as pending email.
    const registered = await DocumentDBService.getUserByEmail(email);
    const userId = registered ? registered.id : `pending-${Date.now()}`;

    // Add to members if they aren't already there
    const alreadyMember = ws.members.some((m) => m.email.toLowerCase() === email.toLowerCase());
    if (alreadyMember) {
      return res.status(400).json({ error: "This teammate is already a member of this workspace." });
    }

    const updatedMembers = [...ws.members, { userId, email, role: role || "editor" }];
    const updatedMemberIds = [...(ws.memberUserIds || []), userId];
    const updated = await DocumentDBService.updateWorkspace(ws.id, { 
      members: updatedMembers, 
      memberUserIds: updatedMemberIds 
    });

    // Notify the user if they exist
    if (registered) {
      await DocumentDBService.createNotification(
        registered.id,
        "Invited to Workspace",
        `${req.user!.displayName} invited you to collaborate in "${ws.name}"`
      );
    }
    
    // Always dispatch email invitation
    await mailer.sendWorkspaceInviteEmail(email, ws.name, req.user!.displayName).catch(console.error);

    return res.json(updated);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// Delete workspace
apiRouter.delete("/workspaces/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ws = await DocumentDBService.getWorkspaceById(req.params.id);
    if (!ws) return res.status(404).json({ error: "Workspace not found." });
    if (ws.ownerId !== req.user!.id) {
      return res.status(403).json({ error: "Only the workspace owner can destroy this cluster." });
    }

    await DocumentDBService.deleteWorkspace(req.params.id);
    return res.json({ success: true, message: "Workspace node destroyed successfully." });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});


// ==========================================
// FOLDER CONTROLLER ENDPOINTS
// ==========================================

// Get all folders inside a workspace
apiRouter.get("/folders/:workspaceId", authenticateToken, async (req: Request, res: Response) => {
  try {
    const list = await DocumentDBService.getWorkspaceFolders(req.params.workspaceId);
    return res.json(list);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// Create new folder (supports nested parent folders)
apiRouter.post("/folders", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, workspaceId, parentId } = req.body;
    if (!name || !workspaceId) {
      return res.status(400).json({ error: "Folder name and workspace identity are required." });
    }

    const newFolder = await DocumentDBService.createFolder(name, workspaceId, parentId || null);
    return res.json(newFolder);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// Update folder (rename or reposition nested hierarchy)
apiRouter.put("/folders/:workspaceId/:id", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { name, parentId } = req.body;
    const updated = await DocumentDBService.updateFolder(req.params.workspaceId, req.params.id, { name, parentId: parentId || null });
    if (!updated) return res.status(404).json({ error: "Folder node not found." });
    return res.json(updated);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// Delete folder
apiRouter.delete("/folders/:workspaceId/:id", authenticateToken, async (req: Request, res: Response) => {
  try {
    const success = await DocumentDBService.deleteFolder(req.params.workspaceId, req.params.id);
    if (!success) return res.status(404).json({ error: "Folder not found." });
    return res.json({ success: true, message: "Folder deleted and nested documents unassigned." });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});


// ==========================================
// DOCUMENT CONTROLLER ENDPOINTS
// ==========================================

// Get all documents inside a workspace
apiRouter.get("/documents/:workspaceId", authenticateToken, async (req: Request, res: Response) => {
  try {
    const list = await DocumentDBService.getWorkspaceDocuments(req.params.workspaceId);
    return res.json(list);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// Create new document
apiRouter.post("/documents", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, content, workspaceId, folderId, collaborators } = req.body;

    if (!workspaceId) {
      return res.status(400).json({ error: "Workspace association is required to dispatch file node." });
    }

    const newDoc = await DocumentDBService.createDocument({
      title: title || "Untitled Document",
      content: content || "",
      workspaceId,
      folderId: folderId || null,
      ownerId: req.user!.id,
      collaborators: collaborators || [req.user!.email]
    });

    // Write activity log
    await DocumentDBService.createActivity({
      docId: newDoc.id,
      workspaceId,
      userId: req.user!.id,
      userName: req.user!.displayName,
      type: "created",
      details: `${req.user!.displayName} created a new draft "${newDoc.title}".`
    });

    return res.json(newDoc);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// Update document details (Title, content, or auto-saves)
apiRouter.put("/documents/:workspaceId/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, content } = req.body;
    const doc = await DocumentDBService.getDocumentById(req.params.workspaceId, req.params.id);

    if (!doc) return res.status(404).json({ error: "Document node not found." });

    const updated = await DocumentDBService.updateDocument(req.params.workspaceId, req.params.id, { title, content });

    // Track activity for title rename or heavy edits
    if (title && title !== doc.title) {
      await DocumentDBService.createActivity({
        docId: doc.id,
        workspaceId: doc.workspaceId,
        userId: req.user!.id,
        userName: req.user!.displayName,
        type: "edited",
        details: `${req.user!.displayName} renamed document to "${title}".`
      });
    }

    return res.json(updated);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// Duplicate document
apiRouter.post("/documents/:workspaceId/:id/duplicate", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const source = await DocumentDBService.getDocumentById(req.params.workspaceId, req.params.id);
    if (!source) return res.status(404).json({ error: "Source file not found." });

    const copy = await DocumentDBService.createDocument({
      title: `${source.title} (Copy)`,
      content: source.content,
      workspaceId: source.workspaceId,
      folderId: source.folderId,
      ownerId: req.user!.id,
      collaborators: source.collaborators
    });

    return res.json(copy);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// Star/Favorite document toggle
apiRouter.post("/documents/:workspaceId/:id/star", authenticateToken, async (req: Request, res: Response) => {
  try {
    const doc = await DocumentDBService.getDocumentById(req.params.workspaceId, req.params.id);
    if (!doc) return res.status(404).json({ error: "Document not found." });

    const updated = await DocumentDBService.updateDocument(req.params.workspaceId, doc.id, { isStarred: !doc.isStarred });
    return res.json(updated);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// Archive / Delete document toggle
apiRouter.post("/documents/:workspaceId/:id/archive", authenticateToken, async (req: Request, res: Response) => {
  try {
    const doc = await DocumentDBService.getDocumentById(req.params.workspaceId, req.params.id);
    if (!doc) return res.status(404).json({ error: "Document not found." });

    const updated = await DocumentDBService.updateDocument(req.params.workspaceId, doc.id, { isArchived: !doc.isArchived });
    return res.json(updated);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// Delete document permanently
apiRouter.delete("/documents/:workspaceId/:id", authenticateToken, async (req: Request, res: Response) => {
  try {
    const success = await DocumentDBService.deleteDocument(req.params.workspaceId, req.params.id);
    if (!success) return res.status(404).json({ error: "Document not found." });
    return res.json({ success: true, message: "Document wiped from cloud databases." });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// Move document to a folder
apiRouter.post("/documents/:workspaceId/:id/move", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { folderId } = req.body;
    const doc = await DocumentDBService.getDocumentById(req.params.workspaceId, req.params.id);
    if (!doc) return res.status(404).json({ error: "Document not found." });

    const updated = await DocumentDBService.updateDocument(req.params.workspaceId, doc.id, { folderId: folderId || null });
    return res.json(updated);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});


// ==========================================
// COMMENTS CONTROLLER ENDPOINTS
// ==========================================

// Get comments for a document
apiRouter.get("/comments/:workspaceId/:docId", authenticateToken, async (req: Request, res: Response) => {
  try {
    const list = await DocumentDBService.getComments(req.params.workspaceId, req.params.docId);
    return res.json(list);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// Add comment or reply
apiRouter.post("/comments", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workspaceId, docId, text, parentId } = req.body;
    if (!docId || !text || !workspaceId) return res.status(400).json({ error: "Message content and workspace/doc identity required." });

    const newComment = await DocumentDBService.createComment(workspaceId, docId, {
      docId,
      author: req.user!.displayName,
      authorPhoto: req.user!.photoURL,
      text,
      parentId: parentId || null
    });

    const doc = await DocumentDBService.getDocumentById(workspaceId, docId);
    if (doc) {
      await DocumentDBService.createActivity({
        docId,
        workspaceId,
        userId: req.user!.id,
        userName: req.user!.displayName,
        type: "comment_added",
        details: `${req.user!.displayName} posted a discussion note in "${doc.title}": "${text.substring(0, 30)}..."`
      });
    }

    return res.json(newComment);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// Resolve comment / thread
apiRouter.put("/comments/:id", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { isResolved, text } = req.body;
    const updated = await DocumentDBService.updateCommentById(req.params.id, { isResolved, text });
    if (!updated) return res.status(404).json({ error: "Comment node not found." });
    return res.json(updated);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// Delete comment
apiRouter.delete("/comments/:id", authenticateToken, async (req: Request, res: Response) => {
  try {
    await DocumentDBService.deleteCommentById(req.params.id);
    return res.json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});


// ==========================================
// NOTIFICATIONS CONTROLLER
// ==========================================

// Get user notifications
apiRouter.get("/notifications", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const list = await DocumentDBService.getUserNotifications(req.user!.id);
    return res.json(list);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// Mark notification read
apiRouter.put("/notifications/:id/read", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = await DocumentDBService.markNotificationRead(req.user!.id, req.params.id);
    if (!updated) return res.status(404).json({ error: "Notification not found." });
    return res.json(updated);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});


// ==========================================
// VERSION SNAPSHOT CONTROLLER
// ==========================================

// Get history list
apiRouter.get("/versions/:docId", authenticateToken, async (req: Request, res: Response) => {
  try {
    const list = await DocumentDBService.getDocumentVersionsById(req.params.docId);
    return res.json(list);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// Take snapshot
apiRouter.post("/versions/:docId", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, content } = req.body;
    if (!title || !content) return res.status(400).json({ error: "Title and snapshot contents are required." });

    const newVer = await DocumentDBService.createVersionSnapshotById(req.params.docId, title, content, req.user!.displayName);
    return res.json(newVer);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});


// ==========================================
// TIMELINE ACTIVITIES CONTROLLER
// ==========================================

// Get timeline activity feed
apiRouter.get("/activities/:workspaceId", authenticateToken, async (req: Request, res: Response) => {
  try {
    const list = await DocumentDBService.getWorkspaceActivities(req.params.workspaceId);
    return res.json(list);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});


// ==========================================
// SAAS BILLING & SUBSCRIPTIONS API
// ==========================================

// Get active subscription and billing details
apiRouter.get("/billing/subscription", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const user = await DocumentDBService.getUserById(userId);
    if (!user) return res.status(404).json({ error: "User profile not found." });

    const subscriptions = await DocumentDBService.getSubscriptions();
    const activeSub = subscriptions.find(s => s.userId === userId && s.status === "active");
    const transactions = await DocumentDBService.getTransactions();
    const history = transactions.filter(t => t.userId === userId);

    return res.json({
      plan: user.plan,
      planStatus: user.planStatus || "active",
      subscriptionId: user.subscriptionId,
      renewalDate: user.renewalDate,
      billingStatus: user.billingStatus || "unpaid",
      activeSub,
      history
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// Create subscription order (Razorpay Checkout)
apiRouter.post("/billing/checkout", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { plan } = req.body; // "pro_monthly" | "pro_yearly"
    if (plan !== "pro_monthly" && plan !== "pro_yearly") {
      return res.status(400).json({ error: "Invalid SaaS plan requested." });
    }

    const userId = req.user!.id;
    const user = await DocumentDBService.getUserById(userId);
    if (!user) return res.status(404).json({ error: "User not found." });

    const amount = plan === "pro_monthly" ? 19 : 159; // Monthly: $19, Yearly: $159 (20% discount applied)

    // Check if Razorpay keys are configured
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (keyId && keySecret) {
      console.log(`[Billing] Creating live Razorpay order for user: ${userId}, plan: ${plan}`);
      try {
        const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
        const orderResponse = await fetch("https://api.razorpay.com/v1/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Basic ${authHeader}`
          },
          body: JSON.stringify({
            amount: amount * 100, // amount in paise/cents
            currency: "USD",
            receipt: `receipt_${userId}_${Date.now()}`
          })
        });

        if (orderResponse.ok) {
          const razorpayOrder = await orderResponse.json();
          return res.json({
            success: true,
            isMock: false,
            key: keyId,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            orderId: razorpayOrder.id,
            plan
          });
        } else {
          const errData = await orderResponse.json();
          console.error("Razorpay order generation failed on Razorpay servers:", errData);
          throw new Error(errData.error?.description || "Razorpay orders server rejected request");
        }
      } catch (err: any) {
        console.warn("Could not generate real Razorpay Order ID. Falling back to key checkout without order_id:", err.message);
        return res.json({
          success: true,
          isMock: false,
          key: keyId,
          amount: amount * 100,
          currency: "USD",
          plan
        });
      }
    } else {
      // Highly functional sandbox simulation for preview
      const simulatedOrderId = `order_sandbox_${Date.now()}`;
      return res.json({
        success: true,
        isMock: true,
        key: "rzp_test_veltora_simulated_key_2026",
        amount,
        currency: "USD",
        orderId: simulatedOrderId,
        plan
      });
    }
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// Verify Razorpay Subscription Signature & Complete Upgrade
apiRouter.post("/billing/verify", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = req.body;
    const userId = req.user!.id;
    const user = await DocumentDBService.getUserById(userId);

    if (!user) return res.status(404).json({ error: "User identity context lost." });

    // Validate real Razorpay signatures if secret is configured
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (keySecret && razorpay_order_id && razorpay_payment_id && razorpay_signature && !razorpay_payment_id.startsWith("pay_sandbox_")) {
      console.log(`[Billing] Verifying live Razorpay payment signature for user ${userId}`);
      const generated_signature = crypto
        .createHmac("sha256", keySecret)
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest("hex");

      if (generated_signature !== razorpay_signature) {
        console.error("Razorpay signature verification mismatch!");
        return res.status(400).json({ error: "Razorpay signature verification mismatch. Transaction might be compromised." });
      }
    }

    const amount = plan === "pro_monthly" ? 19 : 159;
    const renewalDays = plan === "pro_monthly" ? 30 : 365;
    const renewalDateObj = new Date();
    renewalDateObj.setDate(renewalDateObj.getDate() + renewalDays);
    const renewalDateStr = renewalDateObj.toISOString();

    // 1. Log payment
    const payment = await DocumentDBService.createPayment({
      userId,
      amount,
      currency: "USD",
      status: "success",
      razorpayOrderId: razorpay_order_id || `order_sim_${Date.now()}`,
      razorpayPaymentId: razorpay_payment_id || `pay_sim_${Date.now()}`,
      razorpaySignature: razorpay_signature || `sig_sim_${Date.now()}`,
      plan
    });

    // 2. Create subscription record
    const subId = `sub_rzp_${Date.now()}`;
    await DocumentDBService.createSubscription({
      userId,
      plan,
      status: "active",
      razorpaySubscriptionId: subId,
      renewalDate: renewalDateStr,
      billingStatus: "paid"
    });

    // 3. Update User Plan states
    await DocumentDBService.updateUser(userId, {
      plan,
      planStatus: "active",
      subscriptionId: subId,
      renewalDate: renewalDateStr,
      billingStatus: "paid"
    });

    // 4. Create transactional Audit log
    await DocumentDBService.createTransaction({
      userId,
      type: "subscription_created",
      amount,
      status: "success",
      details: `Upgraded successfully to ${plan === "pro_monthly" ? "Pro Monthly" : "Pro Yearly"} plan.`
    });

    // 5. Create Invoice Node
    const invoice = await DocumentDBService.createInvoice({
      userId,
      userName: user.displayName,
      userEmail: user.email,
      plan,
      amount,
      status: "paid",
      dueDate: renewalDateStr,
      paidAt: new Date().toISOString()
    });

    // 6. Broadcast Real-time In-App Notification
    await DocumentDBService.createNotification(
      userId,
      "SaaS Upgrade Approved",
      `Thank you! Your upgrade to ${plan === "pro_monthly" ? "Pro Monthly" : "Pro Yearly"} is complete. Unlimited cloud backup and AI is now unlocked.`
    );

    // 7. Dispatch Transactional SaaS Emails asynchronously via Nodemailer
    mailer.sendWelcomeEmail(user.email, user.displayName).catch(console.error);
    mailer.sendSubscriptionActivated(user.email, user.displayName, plan, renewalDateStr).catch(console.error);
    mailer.sendPaymentSuccessful(user.email, user.displayName, amount, invoice.invoiceNo).catch(console.error);
    mailer.sendInvoiceEmail(user.email, user.displayName, invoice.invoiceNo, amount).catch(console.error);

    return res.json({
      success: true,
      message: "Subscription verified and SaaS features unlocked.",
      user: {
        uid: user.id,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        plan,
        planStatus: "active",
        renewalDate: renewalDateStr,
        billingStatus: "paid"
      }
    });
  } catch (e: any) {
    console.error("Verification endpoint fail:", e);
    return res.status(500).json({ error: e.message });
  }
});

// Cancel active subscription auto-renew
apiRouter.post("/billing/cancel", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const user = await DocumentDBService.getUserById(userId);
    if (!user) return res.status(404).json({ error: "User profile not found." });

    if (user.plan === "free") {
      return res.status(400).json({ error: "No active paid subscription was found on this account." });
    }

    // Mark plan status as canceled but retain premium plan benefits until renewal date
    await DocumentDBService.updateUser(userId, {
      planStatus: "canceled"
    });

    // Find subscription and update
    const subscriptions = await DocumentDBService.getSubscriptions();
    const activeSub = subscriptions.find(s => s.userId === userId && s.status === "active");
    if (activeSub) {
      await DocumentDBService.updateSubscription(activeSub.id, { status: "canceled" });
    }

    await DocumentDBService.createTransaction({
      userId,
      type: "subscription_canceled",
      amount: 0,
      status: "success",
      details: "Subscription auto-renewal canceled by user."
    });

    await DocumentDBService.createNotification(
      userId,
      "Auto-Renew Canceled",
      `Your subscription will remain active until ${new Date(user.renewalDate || "").toLocaleDateString()}, after which your account will revert to the Free tier.`
    );

    mailer.sendSubscriptionExpired(user.email, user.displayName).catch(console.error);

    return res.json({ success: true, planStatus: "canceled" });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// Resume active subscription
apiRouter.post("/billing/resume", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const user = await DocumentDBService.getUserById(userId);
    if (!user) return res.status(404).json({ error: "User profile not found." });

    if (user.plan === "free" || user.planStatus !== "canceled") {
      return res.status(400).json({ error: "No cancelation state detected to resume." });
    }

    await DocumentDBService.updateUser(userId, {
      planStatus: "active"
    });

    const subscriptions = await DocumentDBService.getSubscriptions();
    const activeSub = subscriptions.find(s => s.userId === userId && s.status === "canceled");
    if (activeSub) {
      await DocumentDBService.updateSubscription(activeSub.id, { status: "active" });
    }

    await DocumentDBService.createTransaction({
      userId,
      type: "subscription_resumed",
      amount: 0,
      status: "success",
      details: "Subscription auto-renewal restored."
    });

    await DocumentDBService.createNotification(
      userId,
      "Subscription Resumed",
      "Excellent choice! Auto-renewal is re-enabled. Cloud sync has been kept online."
    );

    return res.json({ success: true, planStatus: "active" });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// Get Invoice List for Auth User
apiRouter.get("/billing/invoices", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const list = await DocumentDBService.getUserInvoices(req.user!.id);
    return res.json(list);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// Get Transactions List for Auth User
apiRouter.get("/billing/transactions", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const list = await DocumentDBService.getUserTransactions(req.user!.id);
    return res.json(list);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});


// ==========================================
// CLOUD STORAGE & SYNCHRONIZATION API
// ==========================================

// Auto-Backup user local drafts to cloud MongoDB
apiRouter.post("/cloud-sync/backup", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { documents } = req.body; // Array of documents
    const userId = req.user!.id;
    const user = await DocumentDBService.getUserById(userId);

    if (!user) return res.status(404).json({ error: "User not found." });

    if (!Array.isArray(documents)) {
      return res.status(400).json({ error: "Payload documents list is empty." });
    }

    const syncedDocs: any[] = [];
    const currentDbDocs = await DocumentDBService.getDocuments();

    for (const clientDoc of documents) {
      // Check if document exists remotely
      const remoteDoc = currentDbDocs.find(d => d.id === clientDoc.id);

      if (remoteDoc) {
        // Conflict Resolution: Last-write-wins based on updatedAt timestamp
        const clientTime = new Date(clientDoc.updatedAt).getTime();
        const remoteTime = new Date(remoteDoc.updatedAt).getTime();

        if (clientTime > remoteTime) {
          // Client has the newer edits, overwrite database
          const updated = await DocumentDBService.updateDocument(remoteDoc.workspaceId, remoteDoc.id, {
            title: clientDoc.title,
            content: clientDoc.content,
            folderId: clientDoc.folderId,
            isStarred: clientDoc.isStarred,
            isArchived: clientDoc.isArchived
          });
          syncedDocs.push(updated);
        } else {
          // Database has newer edits, reject client overwrite and send back database version
          syncedDocs.push(remoteDoc);
        }
      } else {
        // Create new record in Cloud MongoDB
        const created = await DocumentDBService.createDocument({
          title: clientDoc.title,
          content: clientDoc.content,
          workspaceId: clientDoc.workspaceId || "ws-1",
          folderId: clientDoc.folderId || null,
          ownerId: userId,
          collaborators: clientDoc.collaborators || [user.email]
        });
        syncedDocs.push(created);
      }
    }

    return res.json({
      success: true,
      lastSyncTime: new Date().toISOString(),
      documents: syncedDocs
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// Auto-Restore / Restore client local state from Cloud MongoDB
apiRouter.get("/cloud-sync/restore", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const user = await DocumentDBService.getUserById(userId);

    if (!user) return res.status(404).json({ error: "User not found." });

    // Gather all documents where the user is owner or listed as collaborator
    const allDocs = await DocumentDBService.getDocuments();
    const userDocs = allDocs.filter(d => d.ownerId === userId || d.collaborators.includes(user.email));

    return res.json({
      success: true,
      documents: userDocs
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});


// ==========================================
// SYSTEM ADMIN PANEL CONTROLLER
// ==========================================

// Middleware validating administrative privileges
async function verifyAdminPrivilege(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const userId = req.user?.id;
  const user = await DocumentDBService.getUserById(userId || "");

  if (!user) {
    return res.status(401).json({ error: "Unauthorized access." });
  }

  // Define administrators: users with role admin or super_admin, system@veltora.com, any account under veltora.com domain, kreshivesrivastava@gmail.com, or veltoraitsolution2026@gmail.com
  const isVeltoraAdmin = user.email === "system@veltora.com" || 
                         user.email.endsWith("@veltora.com") || 
                         user.email === "kreshivesrivastava@gmail.com" || 
                         user.email === "veltoraitsolution2026@gmail.com" ||
                         user.role === "admin" ||
                         user.role === "super_admin";
  if (isVeltoraAdmin) {
    return next();
  }

  return res.status(403).json({ error: "Admin privilege required. Access denied." });
}

// Fetch Admin Panel Dashboard Metrics
apiRouter.get("/admin/stats", authenticateToken, verifyAdminPrivilege, async (req: Request, res: Response) => {
  try {
    const users = await DocumentDBService.getUsers();
    const documents = await DocumentDBService.getDocuments();
    const payments = await DocumentDBService.getPayments();
    const subscriptions = await DocumentDBService.getSubscriptions();

    const totalUsers = users.length;
    const totalDocs = documents.length;

    // Revenue calculations
    const totalRevenue = payments.reduce((acc, curr) => acc + curr.amount, 0);
    const monthlyRevenue = payments.filter(p => p.plan === "pro_monthly").reduce((acc, curr) => acc + curr.amount, 0);
    const yearlyRevenue = payments.filter(p => p.plan === "pro_yearly").reduce((acc, curr) => acc + curr.amount, 0);

    const proUsersCount = users.filter(u => u.plan !== "free").length;
    const freeUsersCount = users.filter(u => u.plan === "free").length;

    // Active documents created metrics
    const avgDocsPerUser = totalUsers > 0 ? (totalDocs / totalUsers).toFixed(1) : "0";

    // Dynamic growth tracking chart calculations (Daily/Monthly active indicators)
    const activeUsersGrowth = [
      { name: "Jan", dau: Math.round(totalUsers * 0.15), mau: Math.round(totalUsers * 0.45), revenue: Math.round(totalRevenue * 0.2) },
      { name: "Feb", dau: Math.round(totalUsers * 0.25), mau: Math.round(totalUsers * 0.55), revenue: Math.round(totalRevenue * 0.35) },
      { name: "Mar", dau: Math.round(totalUsers * 0.40), mau: Math.round(totalUsers * 0.65), revenue: Math.round(totalRevenue * 0.5) },
      { name: "Apr", dau: Math.round(totalUsers * 0.55), mau: Math.round(totalUsers * 0.75), revenue: Math.round(totalRevenue * 0.65) },
      { name: "May", dau: Math.round(totalUsers * 0.75), mau: Math.round(totalUsers * 0.85), revenue: Math.round(totalRevenue * 0.85) },
      { name: "Jun", dau: Math.round(totalUsers * 0.90), mau: Math.round(totalUsers * 1.0), revenue: totalRevenue }
    ];

    // Compute live storage metrics
    const storageUsageBytes = totalDocs * 1024; // assume ~1KB average document size
    const storageMetrics = {
      used: (storageUsageBytes / (1024 * 1024)).toFixed(3) + " MB",
      limit: "500 GB",
      percentage: ((storageUsageBytes / (500 * 1024 * 1024 * 1024)) * 100).toFixed(4)
    };

    // System Health Status
    const systemHealth = {
      serverUptime: process.uptime().toFixed(0) + " seconds",
      memoryUsage: (process.memoryUsage().heapUsed / (1024 * 1024)).toFixed(1) + " MB",
      apiStatus: "healthy",
      socketConnections: 24, // simulated active sockets
      cpuLoad: "1.2%"
    };

    return res.json({
      metrics: {
        totalUsers,
        proUsersCount,
        freeUsersCount,
        totalDocs,
        avgDocsPerUser,
        totalRevenue,
        monthlyRevenue,
        yearlyRevenue
      },
      charts: {
        activeUsersGrowth,
        revenueDistribution: [
          { name: "Pro Monthly", value: monthlyRevenue },
          { name: "Pro Yearly", value: yearlyRevenue }
        ]
      },
      storageMetrics,
      systemHealth
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// List SaaS Users
apiRouter.get("/admin/users", authenticateToken, verifyAdminPrivilege, async (req: Request, res: Response) => {
  try {
    const users = await DocumentDBService.getUsers();
    const list = users.map(u => ({
      id: u.id,
      email: u.email,
      displayName: u.displayName,
      photoURL: u.photoURL,
      plan: u.plan,
      planStatus: u.planStatus || "active",
      renewalDate: u.renewalDate,
      billingStatus: u.billingStatus || "paid",
      role: u.role || "user",
      createdAt: u.createdAt
    }));
    return res.json(list);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// List Active Subscriptions
apiRouter.get("/admin/subscriptions", authenticateToken, verifyAdminPrivilege, async (req: Request, res: Response) => {
  try {
    const list = await DocumentDBService.getSubscriptions();
    return res.json(list);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// List Completed Payments
apiRouter.get("/admin/payments", authenticateToken, verifyAdminPrivilege, async (req: Request, res: Response) => {
  try {
    const list = await DocumentDBService.getPayments();
    return res.json(list);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// Database provider management
apiRouter.get("/admin/database-provider-status", authenticateToken, verifyAdminPrivilege, async (req: Request, res: Response) => {
  try {
    const status = await DocumentDBService.getDatabaseProviderStatus();
    return res.json(status);
  } catch (e: any) {
    return res.status(500).json({ error: e.message || "Failed to retrieve database provider status." });
  }
});

apiRouter.post("/admin/database-provider", authenticateToken, verifyAdminPrivilege, async (req: Request, res: Response) => {
  try {
    const { provider } = req.body;
    const supportedProviders = ["mongodb", "firestore", "local"];
    if (!supportedProviders.includes(provider)) {
      return res.status(400).json({ error: "Unsupported provider. Must be mongodb, firestore, or local." });
    }

    DocumentDBService.setDatabaseProvider(provider);
    return res.json({ success: true, currentProvider: provider });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || "Failed to set database provider." });
  }
});

apiRouter.delete("/admin/database-provider", authenticateToken, verifyAdminPrivilege, async (req: Request, res: Response) => {
  try {
    DocumentDBService.resetDatabaseProviderPreference();
    return res.json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || "Failed to reset database provider override." });
  }
});

apiRouter.put("/admin/database-provider/failover", authenticateToken, verifyAdminPrivilege, async (req: Request, res: Response) => {
  try {
    const enabled = req.body.enabled === true || req.body.enabled === "true";
    DocumentDBService.setAutoFailoverEnabled(enabled);
    return res.json({ success: true, autoFailoverEnabled: enabled });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || "Failed to update auto-failover setting." });
  }
});

// Re-assign user role manually (Support override)
apiRouter.put("/admin/users/:id/role", authenticateToken, verifyAdminPrivilege, async (req: Request, res: Response) => {
  try {
    const { role } = req.body;
    const isPowerRole = role === "admin" || role === "super_admin";
    const updated = await DocumentDBService.updateUser(req.params.id, {
      role: role,
      plan: isPowerRole ? "pro_yearly" : "free"
    });
    if (!updated) return res.status(404).json({ error: "User not found." });
    return res.json(updated);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// Manual Billing Plan Override (Admin support panel)
apiRouter.put("/admin/users/:id/plan", authenticateToken, verifyAdminPrivilege, async (req: Request, res: Response) => {
  try {
    const { plan, planStatus, billingStatus, renewalDate } = req.body;
    const updated = await DocumentDBService.updateUser(req.params.id, {
      plan,
      planStatus,
      billingStatus,
      renewalDate
    });

    if (!updated) return res.status(404).json({ error: "User not found." });

    await DocumentDBService.createNotification(
      req.params.id,
      "Account Support Override",
      `A system administrator has manually updated your billing parameters to: ${plan.toUpperCase()}`
    );

    return res.json(updated);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});
