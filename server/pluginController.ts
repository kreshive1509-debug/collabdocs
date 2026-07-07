import express, { Request, Response } from "express";
import { logAuditEvent } from "./securityController";

export const pluginRouter = express.Router();

export interface PluginItem {
  id: string;
  name: string;
  description: string;
  category: "productivity" | "utility" | "integration" | "science";
  isEnabled: boolean;
  author: string;
  version: string;
}

// Predefined set of SaaS extensible plugins
const MASTER_PLUGINS: PluginItem[] = [
  { id: "plugin-calendar", name: "Interactive Shared Calendar", description: "Coordinate project milestones and meeting calendars directly in-document.", category: "productivity", isEnabled: true, author: "Veltora Labs", version: "1.0.4" },
  { id: "plugin-kanban", name: "SaaS Agile Kanban Boards", description: "Create, assign, and track workspace tickets and board cards in real-time.", category: "productivity", isEnabled: true, author: "Veltora Labs", version: "1.2.0" },
  { id: "plugin-code", name: "Code Snippets Pro", description: "Rich coding compiler, syntax highlighting, and live documentation engine.", category: "utility", isEnabled: false, author: "Veltora Labs", version: "2.1.0" },
  { id: "plugin-mermaid", name: "Mermaid Flowchart Generator", description: "Map technical architectural graphs using clean Mermaid diagram layouts.", category: "science", isEnabled: true, author: "Veltora Labs", version: "1.0.0" },
  { id: "plugin-latex", name: "LaTeX Math Renderer", description: "Render complex academic math expressions and algorithms flawlessly.", category: "science", isEnabled: false, author: "Academic Sync", version: "1.5.0" },
  { id: "plugin-charts", name: "D3/Recharts Analytics Visualizer", description: "Generate stunning analytics spreadsheets and responsive charts.", category: "utility", isEnabled: true, author: "Veltora Labs", version: "2.0.2" },
  { id: "plugin-forms", name: "Smart Form Builder", description: "Integrate customer survey and feedback forms directly in spec drafts.", category: "integration", isEnabled: false, author: "SaaS Forms", version: "0.9.8" }
];

// 1. Get Plugins List
pluginRouter.get("/", (req: Request, res: Response) => {
  return res.json(MASTER_PLUGINS);
});

// 2. Toggle Plugin State
pluginRouter.put("/:id/toggle", (req: Request, res: Response) => {
  const { id } = req.params;
  const userObj = (req as any).user;

  const plugin = MASTER_PLUGINS.find(p => p.id === id);
  if (!plugin) return res.status(404).json({ error: "Plugin not found." });

  plugin.isEnabled = !plugin.isEnabled;

  if (userObj) {
    logAuditEvent(
      userObj.id || userObj.uid,
      userObj.displayName || "Administrator",
      "plugin_toggle",
      `Toggled plugin '${plugin.name}' to ${plugin.isEnabled ? "ENABLED" : "DISABLED"} state.`
    );
  }

  return res.json({ success: true, plugin });
});
