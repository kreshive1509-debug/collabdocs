import express, { Request, Response } from "express";
import { DocumentDBService } from "./db";
import { logAuditEvent } from "./securityController";

export const enterpriseRouter = express.Router();

// Mock databases for organization, teams, roles, and invitation links
let customBranding = {
  companyName: "Veltora IT Solution",
  logoUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBV055YE8Lzv7MmtDo0RoUI4HWVS8jxQQl5lYqMdY6-KNE-X-QO0cOevZL_diwbgELbL_V-rdsi5Z4JPW0s92jf8XYoW43XerKbdFgKef2pfwAEkMA3UL9yf-r6FpMj6OAH5hwP2pBsiIQiSk-lJhDMdxJKxfbSQY-3G76Kq6RpmnRaQnSZeITiERnUmGliW-K0RMYeQ00iTziuDbU3lkHbQimvH_p4zVHb10vbyh_YES_xw9eQRFjULyKHLIjgpl_lOSltzKGLd2Y1",
  primaryColor: "#6366f1",
  themeStyle: "slate_luxury"
};

const TEAMS_LIST = [
  { id: "team-eng", name: "Engineering Core Architecture", department: "R&D", lead: "Sarah Chen", membersCount: 14 },
  { id: "team-prod", name: "Enterprise SaaS Design", department: "Product", lead: "Alex Rivera", membersCount: 6 },
  { id: "team-sec", name: "Infra & Cybersecurity audit", department: "SecOps", lead: "Marcus Vance", membersCount: 4 }
];

const CUSTOM_ROLES = [
  { name: "Owner", key: "owner", description: "Full root access to delete/rename entire organizations.", scope: "workspace" },
  { name: "Admin", key: "admin", description: "Can configure billing plans, plugins, and custom branding templates.", scope: "workspace" },
  { name: "Editor", key: "editor", description: "Can write, modify, delete and format draft folders.", scope: "document" },
  { name: "Commenter", key: "commenter", description: "Can leave notes and voice recording commentary only.", scope: "document" },
  { name: "Viewer", key: "viewer", description: "Can review files, logs, and replay edit sequences.", scope: "document" }
];

const INVITATIONS: Array<{ id: string; email: string; workspaceId: string; role: string; token: string; accepted: boolean }> = [];
const PERMISSION_RULES: Record<string, { read: string[]; write: string[]; comment: string[] }> = {};

// 1. Get Workspace Custom Branding
enterpriseRouter.get("/branding", (req: Request, res: Response) => {
  return res.json(customBranding);
});

// 2. Update Workspace Custom Branding
enterpriseRouter.put("/branding", async (req: Request, res: Response) => {
  const { companyName, logoUrl, primaryColor, themeStyle } = req.body;
  const userObj = (req as any).user;

  customBranding = {
    companyName: companyName || customBranding.companyName,
    logoUrl: logoUrl || customBranding.logoUrl,
    primaryColor: primaryColor || customBranding.primaryColor,
    themeStyle: themeStyle || customBranding.themeStyle
  };

  if (userObj) {
    await logAuditEvent(
      userObj.id || userObj.uid,
      userObj.displayName || "Administrator",
      "branding_update",
      `Updated company branding to companyName: ${customBranding.companyName}`
    );
  }

  return res.json({ success: true, branding: customBranding });
});

// 3. Get Organization Teams
enterpriseRouter.get("/teams", (req: Request, res: Response) => {
  return res.json(TEAMS_LIST);
});

// 4. Create Workspace Team
enterpriseRouter.post("/teams", (req: Request, res: Response) => {
  const { name, department, lead } = req.body;
  const userObj = (req as any).user;

  const newTeam = {
    id: `team-${Date.now()}`,
    name: name || "New Functional Team",
    department: department || "General Operations",
    lead: lead || userObj?.displayName || "Lead",
    membersCount: 1
  };
  TEAMS_LIST.push(newTeam);

  return res.json({ success: true, team: newTeam });
});

// 5. Get Custom Roles
enterpriseRouter.get("/roles", (req: Request, res: Response) => {
  return res.json(CUSTOM_ROLES);
});

// 6. Generate Workspace Invitation Link
enterpriseRouter.post("/invitations", async (req: Request, res: Response) => {
  const { email, workspaceId, role } = req.body;
  const userObj = (req as any).user;

  if (!email || !workspaceId) {
    return res.status(400).json({ error: "Missing email target or workspace scope." });
  }

  const token = `invite-${Math.random().toString(36).substring(2, 10)}`;
  const invitation = {
    id: `inv-${Date.now()}`,
    email,
    workspaceId,
    role: role || "editor",
    token,
    accepted: false
  };

  INVITATIONS.push(invitation);

  if (userObj) {
    await logAuditEvent(
      userObj.id || userObj.uid,
      userObj.displayName || "Owner",
      "invitation_created",
      `Dispatched workspace invite link to ${email} for role '${role || "editor"}'`
    );
  }

  return res.json({
    success: true,
    invitation,
    inviteLink: `/join?token=${token}`
  });
});

// 7. Get Document/Folder Permission Rules
enterpriseRouter.get("/permissions/:targetId", (req: Request, res: Response) => {
  const { targetId } = req.params;
  const rules = PERMISSION_RULES[targetId] || {
    read: ["*"], // default public workspace scope
    write: [],
    comment: ["*"]
  };
  return res.json(rules);
});

// 8. Update Document/Folder Permission Rules
enterpriseRouter.put("/permissions/:targetId", async (req: Request, res: Response) => {
  const { targetId } = req.params;
  const { read, write, comment } = req.body;
  const userObj = (req as any).user;

  PERMISSION_RULES[targetId] = {
    read: read || ["*"],
    write: write || [],
    comment: comment || ["*"]
  };

  if (userObj) {
    await logAuditEvent(
      userObj.id || userObj.uid,
      userObj.displayName || "Manager",
      "permissions_update",
      `Set granular rules on target node [${targetId}]: readCount=${PERMISSION_RULES[targetId].read.length}, writeCount=${PERMISSION_RULES[targetId].write.length}`
    );
  }

  return res.json({ success: true, rules: PERMISSION_RULES[targetId] });
});
