import express, { Request, Response } from "express";
import { DocumentDBService } from "./db";

export const securityRouter = express.Router();

// Mock device/session databases, loaded in-memory and synced via activity system
const ACTIVE_SESSIONS = [
  { id: "sess-01", device: "Chrome 124 on macOS (Primary)", location: "Singapore", ip: "119.56.24.180", isCurrent: true, lastActive: new Date().toISOString() },
  { id: "sess-02", device: "Safari 17 on iPhone 15", location: "Bangalore, India", ip: "106.51.78.12", isCurrent: false, lastActive: new Date(Date.now() - 3600000 * 4).toISOString() },
  { id: "sess-03", device: "CollabDocs Desktop Client v1.2", location: "San Francisco, USA", ip: "64.233.160.101", isCurrent: false, lastActive: new Date(Date.now() - 3600000 * 24 * 2).toISOString() }
];

const TRUSTED_DEVICES = [
  { id: "dev-01", name: "Sarah's Apple MacBook Pro 16", type: "Laptop", registeredAt: "2026-01-15T08:30:00Z" },
  { id: "dev-02", name: "CollabDocs iOS App (iPhone 15)", type: "Mobile", registeredAt: "2026-03-22T14:15:00Z" }
];

let twoFactorConfig = {
  enabled: false,
  phoneNumber: "",
  method: "authenticator"
};

let passwordPolicy = {
  minLength: 8,
  requireNumbers: true,
  requireSpecialChars: true,
  requireUppercase: true,
  expiryDays: 90
};

// --- AUDIT LOGGING ---
export async function logAuditEvent(userId: string, userName: string, type: string, details: string, docId = "none", workspaceId = "none") {
  try {
    await DocumentDBService.createActivity({
      docId,
      workspaceId,
      userId,
      userName,
      type: "edited", // map to generic type so existing db.ts interface is happy
      details: `[AUDIT] [${type.toUpperCase()}] ${details}`
    });
  } catch (err) {
    console.error("Failed to log audit event:", err);
  }
}

// 1. Get Audit Logs
securityRouter.get("/audit-logs", async (req: Request, res: Response) => {
  try {
    const workspaces = await DocumentDBService.getWorkspaces();
    const activities = workspaces.length > 0 
      ? await DocumentDBService.getWorkspaceActivities(workspaces[0].id)
      : [];
    
    // Fallback to reading all activities if workspace lists are empty
    const auditLogs = activities
      .filter(act => act.details.includes("[AUDIT]"))
      .map(act => {
        const parts = act.details.split("] ");
        const type = parts[0]?.replace("[AUDIT] [", "") || "GENERAL";
        const message = parts.slice(1).join("] ");
        return {
          id: act.id,
          userName: act.userName,
          userId: act.userId,
          type,
          message,
          createdAt: act.createdAt
        };
      });

    return res.json(auditLogs);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// 2. Get Device Sessions
securityRouter.get("/sessions", (req: Request, res: Response) => {
  return res.json({ sessions: ACTIVE_SESSIONS, trustedDevices: TRUSTED_DEVICES });
});

// 3. Revoke Session
securityRouter.delete("/sessions/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const idx = ACTIVE_SESSIONS.findIndex(s => s.id === id);
  if (idx !== -1) {
    ACTIVE_SESSIONS.splice(idx, 1);
    return res.json({ success: true, message: "Session revoked successfully." });
  }
  return res.status(404).json({ error: "Session not found." });
});

// 4. Register Trusted Device
securityRouter.post("/devices", (req: Request, res: Response) => {
  const { name, type } = req.body;
  const newDevice = {
    id: `dev-${Date.now()}`,
    name: name || "Authorized Workspace Device",
    type: type || "Desktop",
    registeredAt: new Date().toISOString()
  };
  TRUSTED_DEVICES.push(newDevice);
  return res.json({ success: true, device: newDevice });
});

// 5. Get 2FA Settings
securityRouter.get("/2fa", (req: Request, res: Response) => {
  return res.json(twoFactorConfig);
});

// 6. Update 2FA Configuration
securityRouter.post("/2fa", (req: Request, res: Response) => {
  const { enabled, phoneNumber, method } = req.body;
  twoFactorConfig = {
    enabled: !!enabled,
    phoneNumber: phoneNumber || "",
    method: method || "authenticator"
  };
  return res.json({ success: true, config: twoFactorConfig });
});

// 7. Get Password Policy
securityRouter.get("/password-policy", (req: Request, res: Response) => {
  return res.json(passwordPolicy);
});
