import fs from "fs";
import path from "path";

const FILE_PATH = path.join(process.cwd(), "server", "local_db_fallback.json");

interface LocalSchema {
  users: Record<string, any>;
  workspaces: Record<string, any>;
  folders: Record<string, any>;
  documents: Record<string, any>;
  comments: Record<string, any>;
  notifications: Record<string, any>;
  activities: Record<string, any>;
  subscriptions: Record<string, any>;
  payments: Record<string, any>;
  invoices: Record<string, any>;
  transactions: Record<string, any>;
}

const defaultDb: LocalSchema = {
  users: {},
  workspaces: {},
  folders: {},
  documents: {},
  comments: {},
  notifications: {},
  activities: {},
  subscriptions: {},
  payments: {},
  invoices: {},
  transactions: {},
};

class LocalJSONDB {
  private data: LocalSchema = { ...defaultDb };
  private initialized = false;

  private init() {
    if (this.initialized) return;
    try {
      const dir = path.dirname(FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (fs.existsSync(FILE_PATH)) {
        const fileContent = fs.readFileSync(FILE_PATH, "utf-8");
        this.data = JSON.parse(fileContent);
      } else {
        this.save();
      }
    } catch (e) {
      console.error("[LocalJSONDB] Initialization failed, using in-memory state:", e);
    }
    this.initialized = true;
  }

  private save() {
    try {
      fs.writeFileSync(FILE_PATH, JSON.stringify(this.data, null, 2), "utf-8");
    } catch (e) {
      console.error("[LocalJSONDB] Save failed:", e);
    }
  }

  // Users
  getUser(id: string) {
    this.init();
    return this.data.users[id];
  }

  getUserByEmail(email: string) {
    this.init();
    return Object.values(this.data.users).find((u: any) => u.email === email);
  }

  getUsers() {
    this.init();
    return Object.values(this.data.users);
  }

  saveUser(user: any) {
    this.init();
    this.data.users[user.id] = { ...this.data.users[user.id], ...user };
    this.save();
    return this.data.users[user.id];
  }

  updateUser(id: string, updates: any) {
    this.init();
    if (this.data.users[id]) {
      this.data.users[id] = { ...this.data.users[id], ...updates };
      this.save();
      return this.data.users[id];
    }
    return undefined;
  }

  // Workspaces
  getWorkspaces() {
    this.init();
    return Object.values(this.data.workspaces);
  }

  getWorkspace(id: string) {
    this.init();
    return this.data.workspaces[id];
  }

  getUserWorkspaces(userId: string) {
    this.init();
    return Object.values(this.data.workspaces).filter((ws: any) => 
      ws.memberUserIds?.includes(userId) || ws.ownerId === userId
    );
  }

  saveWorkspace(ws: any) {
    this.init();
    this.data.workspaces[ws.id] = ws;
    this.save();
    return ws;
  }

  updateWorkspace(id: string, updates: any) {
    this.init();
    if (this.data.workspaces[id]) {
      this.data.workspaces[id] = { ...this.data.workspaces[id], ...updates };
      this.save();
      return this.data.workspaces[id];
    }
    return undefined;
  }

  deleteWorkspace(id: string) {
    this.init();
    if (this.data.workspaces[id]) {
      delete this.data.workspaces[id];
      this.save();
      return true;
    }
    return false;
  }

  // Folders
  getWorkspaceFolders(workspaceId: string) {
    this.init();
    return Object.values(this.data.folders).filter((f: any) => f.workspaceId === workspaceId);
  }

  saveFolder(folder: any) {
    this.init();
    this.data.folders[folder.id] = folder;
    this.save();
    return folder;
  }

  updateFolder(id: string, updates: any) {
    this.init();
    if (this.data.folders[id]) {
      this.data.folders[id] = { ...this.data.folders[id], ...updates };
      this.save();
      return this.data.folders[id];
    }
    return undefined;
  }

  deleteFolder(id: string) {
    this.init();
    if (this.data.folders[id]) {
      delete this.data.folders[id];
      this.save();
      return true;
    }
    return false;
  }

  // Documents
  getDocuments() {
    this.init();
    return Object.values(this.data.documents);
  }

  getWorkspaceDocuments(workspaceId: string) {
    this.init();
    return Object.values(this.data.documents).filter((d: any) => d.workspaceId === workspaceId);
  }

  getDocument(id: string) {
    this.init();
    return this.data.documents[id];
  }

  saveDocument(doc: any) {
    this.init();
    this.data.documents[doc.id] = doc;
    this.save();
    return doc;
  }

  updateDocument(id: string, updates: any) {
    this.init();
    if (this.data.documents[id]) {
      this.data.documents[id] = { ...this.data.documents[id], ...updates, updatedAt: new Date().toISOString() };
      this.save();
      return this.data.documents[id];
    }
    return undefined;
  }

  deleteDocument(id: string) {
    this.init();
    if (this.data.documents[id]) {
      delete this.data.documents[id];
      this.save();
      return true;
    }
    return false;
  }

  // Comments
  getComments(docId: string) {
    this.init();
    return Object.values(this.data.comments).filter((c: any) => c.docId === docId);
  }

  saveComment(comment: any) {
    this.init();
    this.data.comments[comment.id] = comment;
    this.save();
    return comment;
  }

  updateComment(id: string, updates: any) {
    this.init();
    if (this.data.comments[id]) {
      this.data.comments[id] = { ...this.data.comments[id], ...updates };
      this.save();
      return this.data.comments[id];
    }
    return undefined;
  }

  deleteComment(id: string) {
    this.init();
    if (this.data.comments[id]) {
      delete this.data.comments[id];
      this.save();
      return true;
    }
    return false;
  }

  // Notifications
  getUserNotifications(userId: string) {
    this.init();
    return Object.values(this.data.notifications)
      .filter((n: any) => n.userId === userId)
      .sort((a: any, b: any) => b.createdAt.localeCompare(a.createdAt));
  }

  saveNotification(notification: any) {
    this.init();
    this.data.notifications[notification.id] = notification;
    this.save();
    return notification;
  }

  markNotificationRead(userId: string, id: string) {
    this.init();
    const notif = this.data.notifications[id];
    if (notif && notif.userId === userId) {
      notif.isRead = true;
      this.save();
      return notif;
    }
    return undefined;
  }

  // Activities
  getWorkspaceActivities(workspaceId: string) {
    this.init();
    return Object.values(this.data.activities)
      .filter((act: any) => act.workspaceId === workspaceId)
      .sort((a: any, b: any) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 50);
  }

  saveActivity(activity: any) {
    this.init();
    this.data.activities[activity.id] = activity;
    this.save();
    return activity;
  }

  // SaaS billing
  getSubscriptions() {
    this.init();
    return Object.values(this.data.subscriptions);
  }

  saveSubscription(sub: any) {
    this.init();
    this.data.subscriptions[sub.id] = sub;
    this.save();
    return sub;
  }

  updateSubscription(id: string, updates: any) {
    this.init();
    const sub = Object.values(this.data.subscriptions).find((s: any) => s.id === id);
    if (sub) {
      const updated = { ...sub, ...updates };
      this.data.subscriptions[updated.id] = updated;
      this.save();
      return updated;
    }
    return undefined;
  }

  getPayments() {
    this.init();
    return Object.values(this.data.payments);
  }

  savePayment(pay: any) {
    this.init();
    this.data.payments[pay.id] = pay;
    this.save();
    return pay;
  }

  getUserInvoices(userId: string) {
    this.init();
    return Object.values(this.data.invoices).filter((inv: any) => inv.userId === userId);
  }

  saveInvoice(inv: any) {
    this.init();
    this.data.invoices[inv.id] = inv;
    this.save();
    return inv;
  }

  getTransactions() {
    this.init();
    return Object.values(this.data.transactions);
  }

  getUserTransactions(userId: string) {
    this.init();
    return Object.values(this.data.transactions).filter((tx: any) => tx.userId === userId);
  }

  saveTransaction(tx: any) {
    this.init();
    this.data.transactions[tx.id] = tx;
    this.save();
    return tx;
  }
}

export const localJsonDb = new LocalJSONDB();
