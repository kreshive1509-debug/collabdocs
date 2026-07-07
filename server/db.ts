import mongoose from "mongoose";
import { adminDb, handleFirestoreError, isFirebaseAdminConfigured, isFirestoreQuotaError, OperationType, shouldUseFirestore, markFirestoreUnavailable } from "./firebaseAdmin";
import { User, Workspace, Folder, Document, Comment, Activity, Subscription, Payment, Invoice, Transaction } from "./mongoModels";
import { localJsonDb } from "./localJsonDb";

export type DatabaseProviderName = "mongodb" | "firestore" | "local";

export interface DatabaseProviderStatus {
  provider: DatabaseProviderName;
  priority: number;
  active: boolean;
  healthy: boolean;
  available: boolean;
  lastChecked: number;
  lastError?: string;
  manualOverride: boolean;
}

abstract class DatabaseProvider {
  readonly provider: DatabaseProviderName;
  readonly priority: number;
  lastChecked = Date.now();
  lastError?: string;
  manualOverride = false;

  constructor(provider: DatabaseProviderName, priority: number) {
    this.provider = provider;
    this.priority = priority;
  }

  abstract isHealthy(): Promise<boolean>;

  async getStatus(active: boolean): Promise<DatabaseProviderStatus> {
    const healthy = await this.isHealthy();
    return {
      provider: this.provider,
      priority: this.priority,
      active,
      healthy,
      available: healthy,
      lastChecked: this.lastChecked,
      lastError: this.lastError,
      manualOverride: this.manualOverride
    };
  }

  markError(error?: unknown) {
    this.lastChecked = Date.now();
    this.lastError = error ? String((error as any).message || error) : undefined;
  }
}

class MongoDBProvider extends DatabaseProvider {
  constructor() {
    super("mongodb", 1);
  }

  async isHealthy(): Promise<boolean> {
    const connected = mongoose.connection.readyState === 1;
    this.lastChecked = Date.now();
    if (!connected) {
      this.lastError = "MongoDB connection is not established.";
    } else {
      this.lastError = undefined;
    }
    return connected;
  }
}

class FirestoreProvider extends DatabaseProvider {
  constructor() {
    super("firestore", 2);
  }

  async isHealthy(): Promise<boolean> {
    const healthy = isFirebaseAdminConfigured && shouldUseFirestore();
    this.lastChecked = Date.now();
    if (!healthy) {
      this.lastError = !isFirebaseAdminConfigured
        ? "Firestore admin is not configured."
        : "Firestore is currently throttled or under cooldown.";
    } else {
      this.lastError = undefined;
    }
    return healthy;
  }

  markFailed(error?: unknown) {
    this.markError(error);
    if (error && isFirestoreQuotaError(error)) {
      markFirestoreUnavailable(error);
    }
  }
}

class LocalFallbackProvider extends DatabaseProvider {
  constructor() {
    super("local", 3);
  }

  async isHealthy(): Promise<boolean> {
    this.lastChecked = Date.now();
    this.lastError = undefined;
    return true;
  }
}

class DatabaseProviderManager {
  private providers = new Map<DatabaseProviderName, DatabaseProvider>();
  private activeProvider: DatabaseProviderName = "mongodb";
  private manualOverride: DatabaseProviderName | null = null;
  private autoFailoverEnabled = true;

  constructor() {
    this.providers.set("mongodb", new MongoDBProvider());
    this.providers.set("firestore", new FirestoreProvider());
    this.providers.set("local", new LocalFallbackProvider());
  }

  async resolveActiveProvider(): Promise<DatabaseProviderName> {
    if (this.manualOverride) {
      const overrideProvider = this.providers.get(this.manualOverride)!;
      if (await overrideProvider.isHealthy()) {
        this.activeProvider = overrideProvider.provider;
        return overrideProvider.provider;
      }

      this.manualOverride = null;
      this.providers.get("local")!.manualOverride = false;
    }

    const currentProvider = this.providers.get(this.activeProvider)!;
    if (await currentProvider.isHealthy()) {
      return currentProvider.provider;
    }

    for (const provider of Array.from(this.providers.values()).sort((a, b) => a.priority - b.priority)) {
      if (await provider.isHealthy()) {
        this.activeProvider = provider.provider;
        return provider.provider;
      }
    }

    return "local";
  }

  async markProviderFailed(providerName: DatabaseProviderName, error?: unknown): Promise<void> {
    const provider = this.providers.get(providerName);
    if (!provider) return;

    provider.markError(error);

    if (providerName === "firestore" && provider instanceof FirestoreProvider) {
      provider.markFailed(error);
    }

    if (this.autoFailoverEnabled && this.activeProvider === providerName) {
      await this.resolveActiveProvider();
    }
  }

  async getStatus(): Promise<{ currentProvider: DatabaseProviderName; manualOverride: DatabaseProviderName | null; autoFailoverEnabled: boolean; providers: DatabaseProviderStatus[] }> {
    const current = this.manualOverride || this.activeProvider;
    const statuses: DatabaseProviderStatus[] = [];
    for (const provider of Array.from(this.providers.values()).sort((a, b) => a.priority - b.priority)) {
      statuses.push(await provider.getStatus(provider.provider === current));
    }
    return {
      currentProvider: current,
      manualOverride: this.manualOverride,
      autoFailoverEnabled: this.autoFailoverEnabled,
      providers: statuses
    };
  }

  setPreferredProvider(providerName: DatabaseProviderName): void {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Unsupported database provider: ${providerName}`);
    }
    this.manualOverride = providerName;
    this.activeProvider = providerName;
    provider.manualOverride = true;
  }

  resetPreferredProvider(): void {
    if (this.manualOverride) {
      const current = this.providers.get(this.manualOverride);
      if (current) {
        current.manualOverride = false;
      }
    }
    this.manualOverride = null;
  }

  setAutoFailoverEnabled(enabled: boolean): void {
    this.autoFailoverEnabled = enabled;
    if (enabled) {
      this.resetPreferredProvider();
    }
  }
}

// Define strict interfaces mirroring our Firestore schema
export interface UserDB {
  id: string;
  email: string;
  password?: string | null;
  emailVerified: boolean;
  displayName: string;
  firstName: string;
  lastName: string;
  bio: string;
  organization: string;
  timezone: string;
  language: string;
  provider: string;
  photoURL: string;
  plan: "free" | "pro_monthly" | "pro_yearly" | "premium";
  planStatus: "active" | "canceled" | "expired" | "pending";
  subscriptionId: string | null;
  renewalDate: string | null;
  billingStatus: "paid" | "unpaid" | "overdue";
  role?: string;
  createdAt: string;
}

export interface WorkspaceDB {
  id: string;
  name: string;
  avatar: string;
  ownerId: string;
  memberUserIds: string[];
  members: Array<{
    userId: string;
    email: string;
    role: "owner" | "editor" | "viewer";
  }>;
}

export interface FolderDB {
  id: string;
  name: string;
  workspaceId: string;
  parentId: string | null;
}

export interface DocumentDB {
  id: string;
  title: string;
  content: string;
  workspaceId: string;
  folderId: string | null;
  isStarred: boolean;
  isArchived: boolean;
  ownerId: string;
  collaborators: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CommentDB {
  id: string;
  docId: string;
  author: string;
  authorPhoto: string;
  text: string;
  parentId: string | null;
  isResolved: boolean;
  createdAt: string;
}

export interface NotificationDB {
  id: string;
  userId: string;
  title: string;
  description: string;
  isRead: boolean;
  createdAt: string;
}

export interface ActivityDB {
  id: string;
  docId: string;
  workspaceId: string;
  userId: string;
  userName: string;
  type: string;
  details: string;
  createdAt: string;
}

export interface SubscriptionDB {
  id: string;
  userId: string;
  plan: "pro_monthly" | "pro_yearly";
  status: "active" | "canceled" | "expired" | "pending";
  razorpaySubscriptionId: string;
  renewalDate: string;
  billingStatus: "paid" | "unpaid" | "overdue";
  createdAt: string;
}

export interface PaymentDB {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: "success" | "failed" | "pending";
  razorpayOrderId: string;
  razorpayPaymentId: string | null;
  razorpaySignature: string | null;
  plan: string;
  createdAt: string;
}

export interface InvoiceDB {
  id: string;
  invoiceNo: string;
  userId: string;
  userName: string;
  userEmail: string;
  plan: string;
  amount: number;
  status: "paid" | "unpaid";
  dueDate: string;
  paidAt: string | null;
  createdAt: string;
}

export interface TransactionDB {
  id: string;
  userId: string;
  type: string;
  amount: number;
  status: "success" | "failed";
  details: string;
  createdAt: string;
}

export class DocumentDBService {
  private static providerManager = new DatabaseProviderManager();

  static async getDatabaseProviderStatus() {
    return this.providerManager.getStatus();
  }

  static setDatabaseProvider(providerName: DatabaseProviderName) {
    return this.providerManager.setPreferredProvider(providerName);
  }

  static resetDatabaseProviderPreference() {
    return this.providerManager.resetPreferredProvider();
  }

  static setAutoFailoverEnabled(enabled: boolean) {
    return this.providerManager.setAutoFailoverEnabled(enabled);
  }

  private static isMongoConnected(): boolean {
    return mongoose.connection.readyState === 1;
  }

  private static async resolveProviderOrder(): Promise<DatabaseProviderName[]> {
    const activeProvider = await this.providerManager.resolveActiveProvider();
    if (activeProvider === "mongodb") {
      return ["mongodb", "firestore", "local"];
    }
    if (activeProvider === "firestore") {
      return ["firestore", "mongodb", "local"];
    }
    return ["local", "mongodb", "firestore"];
  }

  private static async executeWithProviderFallback<T>(
    mongoHandler: (() => Promise<T>) | undefined,
    firestoreHandler: (() => Promise<T>) | undefined,
    localHandler: () => Promise<T>,
    operationType: OperationType,
    path: string | null
  ): Promise<T> {
    const providerOrder = await this.resolveProviderOrder();

    for (const provider of providerOrder) {
      if (provider === "mongodb" && mongoHandler) {
        try {
          return await mongoHandler();
        } catch (err) {
          console.warn(`[DB] MongoDB ${operationType} failed, trying fallback providers:`, err);
          await this.providerManager.markProviderFailed("mongodb", err);
        }
      }

      if (provider === "firestore" && firestoreHandler) {
        try {
          return await firestoreHandler();
        } catch (err) {
          console.warn(`[DB] Firestore ${operationType} failed, trying fallback providers:`, err);
          await this.providerManager.markProviderFailed("firestore", err);
        }
      }

      if (provider === "local") {
        return await localHandler();
      }
    }

    return await localHandler();
  }

  // User collection queries
  static async getUsers(): Promise<UserDB[]> {
    return this.executeWithProviderFallback(
      async () => {
        const users = await User.find();
        return users.map(u => {
          const obj = u.toObject() as any;
          return { ...obj, id: obj.id || obj._id?.toString() } as UserDB;
        });
      },
      async () => {
        const snapshot = await adminDb.collection("users").get();
        return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as UserDB));
      },
      async () => localJsonDb.getUsers() as UserDB[],
      OperationType.LIST,
      "users"
    );
  }

  static async getUserByEmail(email: string): Promise<UserDB | undefined> {
    return this.executeWithProviderFallback(
      async () => {
        const user = await User.findOne({ email });
        if (!user) return undefined;
        const obj = user.toObject() as any;
        return { ...obj, id: obj.id || obj._id?.toString() } as UserDB;
      },
      async () => {
        const snapshot = await adminDb.collection("users").where("email", "==", email).limit(1).get();
        if (snapshot.empty) return undefined;
        return { ...snapshot.docs[0].data(), id: snapshot.docs[0].id } as UserDB;
      },
      async () => localJsonDb.getUserByEmail(email) as UserDB | undefined,
      OperationType.GET,
      `users/email/${email}`
    );
  }

  static async getUserById(id: string): Promise<UserDB | undefined> {
    return this.executeWithProviderFallback(
      async () => {
        const user = await User.findOne({ id }).maxTimeMS(2000);
        if (!user) return undefined;
        const obj = user.toObject() as any;
        return { ...obj, id: obj.id || obj._id?.toString() } as UserDB;
      },
      async () => {
        const doc = await adminDb.collection("users").doc(id).get();
        if (!doc.exists) return undefined;
        return { ...doc.data(), id: doc.id } as UserDB;
      },
      async () => localJsonDb.getUser(id) as UserDB | undefined,
      OperationType.GET,
      `users/${id}`
    );
  }

  static async createUser(user: Partial<UserDB> & { id: string; email: string; emailVerified?: boolean }): Promise<UserDB> {
    const newUser: UserDB = {
      emailVerified: false,
      plan: "free",
      planStatus: "active",
      subscriptionId: null,
      renewalDate: null,
      billingStatus: "unpaid",
      role: "user",
      createdAt: new Date().toISOString(),
      displayName: "User",
      firstName: "",
      lastName: "",
      bio: "",
      organization: "",
      timezone: "",
      language: "",
      provider: "password",
      photoURL: "",
      ...user
    } as UserDB;

    localJsonDb.saveUser(newUser);

    return this.executeWithProviderFallback(
      async () => {
        await User.findOneAndUpdate({ id: newUser.id }, { ...newUser }, { upsert: true, returnDocument: "after" }).maxTimeMS(3000);
        return newUser;
      },
      async () => {
        await adminDb.collection("users").doc(newUser.id).set(newUser);
        return newUser;
      },
      async () => newUser,
      OperationType.CREATE,
      `users/${newUser.id}`
    );
  }

  static async updateUser(id: string, updates: Partial<UserDB>): Promise<UserDB | undefined> {
    localJsonDb.updateUser(id, updates);

    return this.executeWithProviderFallback(
      async () => {
        await User.findOneAndUpdate({ id }, updates, { returnDocument: "after" });
        return this.getUserById(id);
      },
      async () => {
        await adminDb.collection("users").doc(id).update(updates);
        return this.getUserById(id);
      },
      async () => localJsonDb.getUser(id) as UserDB | undefined,
      OperationType.UPDATE,
      `users/${id}`
    );
  }

  static async getWorkspaces(): Promise<WorkspaceDB[]> {
    return this.executeWithProviderFallback(
      async () => {
        const workspaces = await Workspace.find();
        return workspaces.map(w => {
          const obj = w.toObject() as any;
          return { ...obj, id: obj.id || obj._id?.toString() } as WorkspaceDB;
        });
      },
      async () => {
        const snapshot = await adminDb.collection("workspaces").get();
        return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as WorkspaceDB));
      },
      async () => localJsonDb.getWorkspaces() as WorkspaceDB[],
      OperationType.LIST,
      "workspaces"
    );
  }

  static async getWorkspaceById(id: string): Promise<WorkspaceDB | undefined> {
    return this.executeWithProviderFallback(
      async () => {
        const ws = await Workspace.findOne({ id }).maxTimeMS(2000);
        if (!ws) return undefined;
        const obj = ws.toObject() as any;
        return { ...obj, id: obj.id || obj._id?.toString() } as WorkspaceDB;
      },
      async () => {
        const doc = await adminDb.collection("workspaces").doc(id).get();
        if (!doc.exists) return undefined;
        return { ...doc.data(), id: doc.id } as WorkspaceDB;
      },
      async () => localJsonDb.getWorkspace(id) as WorkspaceDB | undefined,
      OperationType.GET,
      `workspaces/${id}`
    );
  }

  static async getUserWorkspaces(userId: string): Promise<WorkspaceDB[]> {
    return this.executeWithProviderFallback(
      async () => {
        const workspaces = await Workspace.find({ memberUserIds: userId });
        return workspaces.map(w => {
          const obj = w.toObject() as any;
          return { ...obj, id: obj.id || obj._id?.toString() } as WorkspaceDB;
        });
      },
      async () => {
        const snapshot = await adminDb.collection("workspaces").where("memberUserIds", "array-contains", userId).get();
        return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as WorkspaceDB));
      },
      async () => localJsonDb.getUserWorkspaces(userId) as WorkspaceDB[],
      OperationType.LIST,
      `workspaces/user/${userId}`
    );
  }

  static async createWorkspace(name: string, ownerId: string, email: string): Promise<WorkspaceDB> {
    const id = `ws-${Date.now()}`;
    const newWs: WorkspaceDB = {
      id,
      name,
      avatar: name.charAt(0).toUpperCase(),
      ownerId,
      memberUserIds: [ownerId],
      members: [{ userId: ownerId, email, role: "owner" }]
    };

    localJsonDb.saveWorkspace(newWs);

    return this.executeWithProviderFallback(
      async () => {
        await new Workspace(newWs).save();
        return newWs;
      },
      async () => {
        await adminDb.collection("workspaces").doc(id).set(newWs);
        return newWs;
      },
      async () => newWs,
      OperationType.CREATE,
      `workspaces/${id}`
    );
  }

  static async updateWorkspace(id: string, updates: Partial<WorkspaceDB>): Promise<WorkspaceDB | undefined> {
    localJsonDb.updateWorkspace(id, updates);

    return this.executeWithProviderFallback(
      async () => {
        await Workspace.findOneAndUpdate({ id }, updates, { returnDocument: "after" });
        return this.getWorkspaceById(id);
      },
      async () => {
        await adminDb.collection("workspaces").doc(id).update(updates);
        return this.getWorkspaceById(id);
      },
      async () => localJsonDb.getWorkspace(id) as WorkspaceDB | undefined,
      OperationType.UPDATE,
      `workspaces/${id}`
    );
  }

  static async deleteWorkspace(id: string): Promise<boolean> {
    localJsonDb.deleteWorkspace(id);

    return this.executeWithProviderFallback(
      async () => {
        await Workspace.deleteOne({ id });
        return true;
      },
      async () => {
        await adminDb.collection("workspaces").doc(id).delete();
        return true;
      },
      async () => true,
      OperationType.DELETE,
      `workspaces/${id}`
    );
  }

  // Folder queries
  static async getWorkspaceFolders(workspaceId: string): Promise<FolderDB[]> {
    return this.executeWithProviderFallback(
      async () => {
        const folders = await Folder.find({ workspaceId });
        return folders.map(f => {
          const obj = f.toObject() as any;
          return { ...obj, id: obj.id || obj._id?.toString() } as FolderDB;
        });
      },
      async () => {
        const snapshot = await adminDb.collection("workspaces").doc(workspaceId).collection("folders").get();
        return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as FolderDB));
      },
      async () => localJsonDb.getWorkspaceFolders(workspaceId) as FolderDB[],
      OperationType.LIST,
      `workspaces/${workspaceId}/folders`
    );
  }

  static async createFolder(name: string, workspaceId: string, parentId: string | null): Promise<FolderDB> {
    const id = `fold-${Date.now()}`;
    const newFolder: FolderDB = { id, name, workspaceId, parentId };

    localJsonDb.saveFolder(newFolder);

    return this.executeWithProviderFallback(
      async () => {
        await new Folder(newFolder).save();
        return newFolder;
      },
      async () => {
        await adminDb.collection("workspaces").doc(workspaceId).collection("folders").doc(id).set(newFolder);
        return newFolder;
      },
      async () => newFolder,
      OperationType.CREATE,
      `workspaces/${workspaceId}/folders/${id}`
    );
  }

  static async updateFolder(workspaceId: string, id: string, updates: Partial<FolderDB>): Promise<FolderDB | undefined> {
    localJsonDb.updateFolder(id, updates);

    return this.executeWithProviderFallback(
      async () => {
        await Folder.findOneAndUpdate({ id }, updates, { returnDocument: "after" });
        const folder = await Folder.findOne({ id });
        return folder ? (folder.toObject() as any as FolderDB) : undefined;
      },
      async () => {
        await adminDb.collection("workspaces").doc(workspaceId).collection("folders").doc(id).update(updates);
        const doc = await adminDb.collection("workspaces").doc(workspaceId).collection("folders").doc(id).get();
        return doc.exists ? ({ ...doc.data(), id: doc.id } as FolderDB) : undefined;
      },
      async () => localJsonDb.updateFolder(id, updates) as FolderDB | undefined,
      OperationType.UPDATE,
      `workspaces/${workspaceId}/folders/${id}`
    );
  }

  static async deleteFolder(workspaceId: string, id: string): Promise<boolean> {
    localJsonDb.deleteFolder(id);

    return this.executeWithProviderFallback(
      async () => {
        await Folder.deleteOne({ id });
        return true;
      },
      async () => {
        await adminDb.collection("workspaces").doc(workspaceId).collection("folders").doc(id).delete();
        return true;
      },
      async () => true,
      OperationType.DELETE,
      `workspaces/${workspaceId}/folders/${id}`
    );
  }

  // Documents queries
  static async getDocuments(): Promise<DocumentDB[]> {
    return this.executeWithProviderFallback(
      async () => {
        const docs = await Document.find();
        return docs.map(d => {
          const obj = d.toObject() as any;
          return { ...obj, id: obj.id || obj._id?.toString() } as DocumentDB;
        });
      },
      undefined,
      async () => localJsonDb.getDocuments() as DocumentDB[],
      OperationType.LIST,
      "documents"
    );
  }

  static async getWorkspaceDocuments(workspaceId: string): Promise<DocumentDB[]> {
    return this.executeWithProviderFallback(
      async () => {
        const docs = await Document.find({ workspaceId });
        return docs.map(d => {
          const obj = d.toObject() as any;
          return { ...obj, id: obj.id || obj._id?.toString() } as DocumentDB;
        });
      },
      async () => {
        const snapshot = await adminDb.collection("workspaces").doc(workspaceId).collection("documents").get();
        return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as DocumentDB));
      },
      async () => localJsonDb.getWorkspaceDocuments(workspaceId) as DocumentDB[],
      OperationType.LIST,
      `workspaces/${workspaceId}/documents`
    );
  }

  static async getDocumentById(workspaceId: string, id: string): Promise<DocumentDB | undefined> {
    return this.executeWithProviderFallback(
      async () => {
        const doc = await Document.findOne({ id, workspaceId });
        if (!doc) return undefined;
        const obj = doc.toObject() as any;
        return { ...obj, id: obj.id || obj._id?.toString() } as DocumentDB;
      },
      async () => {
        const doc = await adminDb.collection("workspaces").doc(workspaceId).collection("documents").doc(id).get();
        if (!doc.exists) return undefined;
        return { ...doc.data(), id: doc.id } as DocumentDB;
      },
      async () => localJsonDb.getDocument(id) as DocumentDB | undefined,
      OperationType.GET,
      `workspaces/${workspaceId}/documents/${id}`
    );
  }

  static async findDocumentById(id: string): Promise<DocumentDB | undefined> {
    return this.executeWithProviderFallback(
      async () => {
        const doc = await Document.findOne({ id });
        if (!doc) return undefined;
        const obj = doc.toObject() as any;
        return { ...obj, id: obj.id || obj._id?.toString() } as DocumentDB;
      },
      async () => {
        const snapshot = await adminDb.collectionGroup("documents").where("id", "==", id).limit(1).get();
        if (snapshot.empty) return undefined;
        return { ...snapshot.docs[0].data(), id: snapshot.docs[0].id } as DocumentDB;
      },
      async () => localJsonDb.getDocument(id) as DocumentDB | undefined,
      OperationType.GET,
      `documents/${id}`
    );
  }

  static async createDocument(data: Omit<DocumentDB, "id" | "createdAt" | "updatedAt" | "isStarred" | "isArchived">): Promise<DocumentDB> {
    const id = `doc-${Date.now()}`;
    const newDoc: DocumentDB = {
      ...data,
      id,
      isStarred: false,
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    localJsonDb.saveDocument(newDoc);

    return this.executeWithProviderFallback(
      async () => {
        await new Document(newDoc).save();
        return newDoc;
      },
      async () => {
        await adminDb.collection("workspaces").doc(data.workspaceId).collection("documents").doc(id).set(newDoc);
        return newDoc;
      },
      async () => newDoc,
      OperationType.CREATE,
      `workspaces/${data.workspaceId}/documents/${id}`
    );
  }

  static async updateDocument(workspaceId: string, id: string, updates: Partial<DocumentDB>): Promise<DocumentDB | undefined> {
    const updatedAt = new Date().toISOString();
    const localUpdates = { ...updates, updatedAt };
    localJsonDb.updateDocument(id, localUpdates);

    return this.executeWithProviderFallback(
      async () => {
        await Document.findOneAndUpdate({ id }, localUpdates, { returnDocument: "after" });
        return this.getDocumentById(workspaceId, id);
      },
      async () => {
        const docRef = adminDb.collection("workspaces").doc(workspaceId).collection("documents").doc(id);
        await docRef.update(localUpdates);
        const snap = await docRef.get();
        return snap.exists ? ({ ...(snap.data() as any), id: snap.id } as DocumentDB) : undefined;
      },
      async () => localJsonDb.getDocument(id) as DocumentDB | undefined,
      OperationType.UPDATE,
      `workspaces/${workspaceId}/documents/${id}`
    );
  }

  static async deleteDocument(workspaceId: string, id: string): Promise<boolean> {
    localJsonDb.deleteDocument(id);

    return this.executeWithProviderFallback(
      async () => {
        await Document.deleteOne({ id });
        return true;
      },
      async () => {
        await adminDb.collection("workspaces").doc(workspaceId).collection("documents").doc(id).delete();
        return true;
      },
      async () => true,
      OperationType.DELETE,
      `workspaces/${workspaceId}/documents/${id}`
    );
  }

  // Comments queries
  static async deleteComment(workspaceId: string, docId: string, id: string): Promise<boolean> {
    localJsonDb.deleteComment(id);

    return this.executeWithProviderFallback(
      async () => {
        await Comment.deleteOne({ id });
        return true;
      },
      async () => {
        await adminDb.collection("workspaces").doc(workspaceId).collection("documents").doc(docId).collection("comments").doc(id).delete();
        return true;
      },
      async () => true,
      OperationType.DELETE,
      `workspaces/${workspaceId}/documents/${docId}/comments/${id}`
    );
  }

  static async updateComment(workspaceId: string, docId: string, id: string, updates: Partial<CommentDB>): Promise<CommentDB | undefined> {
    localJsonDb.updateComment(id, updates);

    return this.executeWithProviderFallback(
      async () => {
        await Comment.findOneAndUpdate({ id }, updates, { returnDocument: "after" });
        return localJsonDb.getComments(docId).find((c: any) => c.id === id) as CommentDB | undefined;
      },
      async () => {
        const docRef = adminDb.collection("workspaces").doc(workspaceId).collection("documents").doc(docId).collection("comments").doc(id);
        await docRef.update(updates);
        const snap = await docRef.get();
        return snap.exists ? ({ id: snap.id, ...(snap.data() as any) } as CommentDB) : undefined;
      },
      async () => localJsonDb.getComments(docId).find((c: any) => c.id === id) as CommentDB | undefined,
      OperationType.UPDATE,
      `workspaces/${workspaceId}/documents/${docId}/comments/${id}`
    );
  }

  static async getComments(workspaceId: string, docId: string): Promise<CommentDB[]> {
    return this.executeWithProviderFallback(
      async () => {
        const comments = await Comment.find({ docId });
        return comments.map(c => {
          const obj = c.toObject() as any;
          return { ...obj, id: obj.id || obj._id?.toString() } as CommentDB;
        });
      },
      async () => {
        const snapshot = await adminDb.collection("workspaces").doc(workspaceId).collection("documents").doc(docId).collection("comments").get();
        return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as CommentDB));
      },
      async () => localJsonDb.getComments(docId) as CommentDB[],
      OperationType.LIST,
      `workspaces/${workspaceId}/documents/${docId}/comments`
    );
  }

  static async createComment(workspaceId: string, docId: string, data: Omit<CommentDB, "id" | "createdAt" | "isResolved">): Promise<CommentDB> {
    const id = `comment-${Date.now()}`;
    const newComment: CommentDB = {
      ...data,
      id,
      isResolved: false,
      createdAt: new Date().toISOString()
    };

    localJsonDb.saveComment(newComment);

    return this.executeWithProviderFallback(
      async () => {
        await new Comment(newComment).save();
        return newComment;
      },
      async () => {
        await adminDb.collection("workspaces").doc(workspaceId).collection("documents").doc(docId).collection("comments").doc(id).set(newComment);
        return newComment;
      },
      async () => newComment,
      OperationType.CREATE,
      `workspaces/${workspaceId}/documents/${docId}/comments/${id}`
    );
  }

  static async getDocumentVersions(workspaceId: string, docId: string): Promise<any[]> {
    return this.executeWithProviderFallback(
      undefined,
      async () => {
        const snapshot = await adminDb.collection("workspaces").doc(workspaceId).collection("documents").doc(docId).collection("versions").orderBy("createdAt", "desc").get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      },
      async () => [],
      OperationType.LIST,
      `workspaces/${workspaceId}/documents/${docId}/versions`
    );
  }

  static async createVersionSnapshot(workspaceId: string, docId: string, title: string, content: string, updatedBy: string): Promise<any> {
    const id = `ver-${Date.now()}`;
    const newVer = {
      id,
      docId,
      title,
      content,
      updatedBy,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    return this.executeWithProviderFallback(
      undefined,
      async () => {
        await adminDb.collection("workspaces").doc(workspaceId).collection("documents").doc(docId).collection("versions").doc(id).set(newVer);
        return newVer;
      },
      async () => newVer,
      OperationType.CREATE,
      `workspaces/${workspaceId}/documents/${docId}/versions/${id}`
    );
  }

  static async createVersionSnapshotById(docId: string, title: string, content: string, updatedBy: string): Promise<any> {
    const doc = await this.findDocumentById(docId);
    if (!doc) return null;
    return this.createVersionSnapshot(doc.workspaceId, docId, title, content, updatedBy);
  }

  static async getDocumentVersionsById(docId: string): Promise<any[]> {
    const doc = await this.findDocumentById(docId);
    if (!doc) return [];
    return this.getDocumentVersions(doc.workspaceId, docId);
  }

  static async updateCommentById(id: string, updates: Partial<CommentDB>): Promise<CommentDB | undefined> {
    localJsonDb.updateComment(id, updates);

    return this.executeWithProviderFallback(
      async () => {
        await Comment.findOneAndUpdate({ id }, updates, { returnDocument: "after" });
        return localJsonDb.getComments("").find((c: any) => c.id === id) as CommentDB | undefined;
      },
      async () => {
        const snapshot = await adminDb.collectionGroup("comments").where("id", "==", id).limit(1).get();
        if (snapshot.empty) return undefined;
        await snapshot.docs[0].ref.update(updates);
        const updated = await snapshot.docs[0].ref.get();
        return updated.exists ? ({ id: updated.id, ...(updated.data() as any) } as CommentDB) : undefined;
      },
      async () => localJsonDb.getComments("").find((c: any) => c.id === id) as CommentDB | undefined,
      OperationType.UPDATE,
      `comments/${id}`
    );
  }

  static async deleteCommentById(id: string): Promise<boolean> {
    localJsonDb.deleteComment(id);

    return this.executeWithProviderFallback(
      async () => {
        await Comment.deleteOne({ id });
        return true;
      },
      async () => {
        const snapshot = await adminDb.collectionGroup("comments").where("id", "==", id).limit(1).get();
        if (!snapshot.empty) {
          await snapshot.docs[0].ref.delete();
        }
        return true;
      },
      async () => true,
      OperationType.DELETE,
      `comments/${id}`
    );
  }

  // Notifications queries
  static async getUserNotifications(userId: string): Promise<NotificationDB[]> {
    return this.executeWithProviderFallback(
      undefined,
      async () => {
        const snapshot = await adminDb.collection("users").doc(userId).collection("notifications").orderBy("createdAt", "desc").get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NotificationDB));
      },
      async () => localJsonDb.getUserNotifications(userId) as NotificationDB[],
      OperationType.LIST,
      `users/${userId}/notifications`
    );
  }

  static async createNotification(userId: string, title: string, description: string): Promise<NotificationDB> {
    const id = `notif-${Date.now()}`;
    const newNotif: NotificationDB = {
      id,
      userId,
      title,
      description,
      isRead: false,
      createdAt: new Date().toISOString()
    };

    localJsonDb.saveNotification(newNotif);

    return this.executeWithProviderFallback(
      undefined,
      async () => {
        await adminDb.collection("users").doc(userId).collection("notifications").doc(id).set(newNotif);
        return newNotif;
      },
      async () => newNotif,
      OperationType.CREATE,
      `users/${userId}/notifications/${id}`
    );
  }

  static async markNotificationRead(userId: string, id: string): Promise<NotificationDB | undefined> {
    localJsonDb.markNotificationRead(userId, id);

    return this.executeWithProviderFallback(
      undefined,
      async () => {
        await adminDb.collection("users").doc(userId).collection("notifications").doc(id).update({ isRead: true });
        const snap = await adminDb.collection("users").doc(userId).collection("notifications").doc(id).get();
        if (!snap.exists) return undefined;
        return { id: snap.id, ...(snap.data() as any) } as NotificationDB;
      },
      async () => localJsonDb.getUserNotifications(userId).find((n: any) => n.id === id) as NotificationDB | undefined,
      OperationType.UPDATE,
      `users/${userId}/notifications/${id}`
    );
  }

  // Activities queries
  static async getWorkspaceActivities(workspaceId: string): Promise<ActivityDB[]> {
    return this.executeWithProviderFallback(
      async () => {
        const activities = await Activity.find({ workspaceId }).sort({ createdAt: -1 }).limit(50);
        return activities.map(a => {
          const obj = a.toObject() as any;
          return { ...obj, id: obj.id || obj._id?.toString() } as ActivityDB;
        });
      },
      async () => {
        const snapshot = await adminDb.collection("workspaces").doc(workspaceId).collection("activities").orderBy("createdAt", "desc").limit(50).get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActivityDB));
      },
      async () => localJsonDb.getWorkspaceActivities(workspaceId) as ActivityDB[],
      OperationType.LIST,
      `workspaces/${workspaceId}/activities`
    );
  }

  static async createActivity(data: Omit<ActivityDB, "id" | "createdAt">): Promise<ActivityDB> {
    const id = `act-${Date.now()}`;
    const newAct: ActivityDB = { ...data, id, createdAt: new Date().toISOString() };

    localJsonDb.saveActivity(newAct);

    return this.executeWithProviderFallback(
      async () => {
        await new Activity(newAct).save();
        return newAct;
      },
      async () => {
        await adminDb.collection("workspaces").doc(data.workspaceId).collection("activities").doc(id).set(newAct);
        return newAct;
      },
      async () => newAct,
      OperationType.CREATE,
      `workspaces/${data.workspaceId}/activities/${id}`
    );
  }

  // SaaS methods
  static async getSubscriptions(): Promise<SubscriptionDB[]> {
    return this.executeWithProviderFallback(
      async () => {
        const subs = await Subscription.find();
        return subs.map(s => {
          const obj = s.toObject() as any;
          return { ...obj, id: obj.id || obj._id?.toString() } as SubscriptionDB;
        });
      },
      async () => {
        const snapshot = await adminDb.collectionGroup("subscriptions").get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SubscriptionDB));
      },
      async () => localJsonDb.getSubscriptions() as SubscriptionDB[],
      OperationType.LIST,
      "subscriptions"
    );
  }

  static async updateSubscription(id: string, updates: Partial<SubscriptionDB>): Promise<SubscriptionDB | undefined> {
    localJsonDb.updateSubscription(id, updates);

    return this.executeWithProviderFallback(
      async () => {
        await Subscription.findOneAndUpdate({ id }, updates, { returnDocument: "after" });
        const sub = await Subscription.findOne({ id });
        return sub ? (sub.toObject() as any as SubscriptionDB) : undefined;
      },
      async () => {
        const snapshot = await adminDb.collectionGroup("subscriptions").where("id", "==", id).limit(1).get();
        if (snapshot.empty) return undefined;
        const docRef = snapshot.docs[0].ref;
        await docRef.update(updates);
        const updated = await docRef.get();
        return updated.exists ? ({ id: updated.id, ...(updated.data() as any) } as SubscriptionDB) : undefined;
      },
      async () => localJsonDb.getSubscriptions().find((s: any) => s.id === id) as SubscriptionDB | undefined,
      OperationType.UPDATE,
      `subscriptions/${id}`
    );
  }

  static async createSubscription(data: Omit<SubscriptionDB, "id" | "createdAt">): Promise<SubscriptionDB> {
    const id = `sub-${Date.now()}`;
    const newSub: SubscriptionDB = { ...data, id, createdAt: new Date().toISOString() };

    localJsonDb.saveSubscription(newSub);

    return this.executeWithProviderFallback(
      async () => {
        await new Subscription(newSub).save();
        return newSub;
      },
      async () => {
        await adminDb.collection("users").doc(data.userId).collection("subscriptions").doc(id).set(newSub);
        return newSub;
      },
      async () => newSub,
      OperationType.CREATE,
      `users/${data.userId}/subscriptions/${id}`
    );
  }

  static async getPayments(): Promise<PaymentDB[]> {
    return this.executeWithProviderFallback(
      async () => {
        const payments = await Payment.find();
        return payments.map(p => {
          const obj = p.toObject() as any;
          return { ...obj, id: obj.id || obj._id?.toString() } as PaymentDB;
        });
      },
      async () => {
        const snapshot = await adminDb.collectionGroup("payments").get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaymentDB));
      },
      async () => localJsonDb.getPayments() as PaymentDB[],
      OperationType.LIST,
      "payments"
    );
  }

  static async createPayment(data: Omit<PaymentDB, "id" | "createdAt">): Promise<PaymentDB> {
    const id = `pay-${Date.now()}`;
    const newPay: PaymentDB = { ...data, id, createdAt: new Date().toISOString() };

    localJsonDb.savePayment(newPay);

    return this.executeWithProviderFallback(
      async () => {
        await new Payment(newPay).save();
        return newPay;
      },
      async () => {
        await adminDb.collection("users").doc(data.userId).collection("payments").doc(id).set(newPay);
        return newPay;
      },
      async () => newPay,
      OperationType.CREATE,
      `users/${data.userId}/payments/${id}`
    );
  }

  static async createInvoice(data: Omit<InvoiceDB, "id" | "createdAt" | "invoiceNo">): Promise<InvoiceDB> {
    const id = `inv-${Date.now()}`;
    const invoiceNo = `INV-${new Date().getFullYear()}-${Date.now()}`;
    const newInv: InvoiceDB = { ...data, id, invoiceNo, createdAt: new Date().toISOString() };

    localJsonDb.saveInvoice(newInv);

    return this.executeWithProviderFallback(
      async () => {
        await new Invoice(newInv).save();
        return newInv;
      },
      async () => {
        await adminDb.collection("users").doc(data.userId).collection("invoices").doc(id).set(newInv);
        return newInv;
      },
      async () => newInv,
      OperationType.CREATE,
      `users/${data.userId}/invoices/${id}`
    );
  }

  static async getUserInvoices(userId: string): Promise<InvoiceDB[]> {
    return this.executeWithProviderFallback(
      async () => {
        const invoices = await Invoice.find({ userId });
        return invoices.map(i => {
          const obj = i.toObject() as any;
          return { ...obj, id: obj.id || obj._id?.toString() } as InvoiceDB;
        });
      },
      async () => {
        const snapshot = await adminDb.collection("users").doc(userId).collection("invoices").get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InvoiceDB));
      },
      async () => localJsonDb.getUserInvoices(userId) as InvoiceDB[],
      OperationType.LIST,
      `users/${userId}/invoices`
    );
  }

  static async getTransactions(): Promise<TransactionDB[]> {
    return this.executeWithProviderFallback(
      async () => {
        const txs = await Transaction.find();
        return txs.map(t => {
          const obj = t.toObject() as any;
          return { ...obj, id: obj.id || obj._id?.toString() } as TransactionDB;
        });
      },
      async () => {
        const snapshot = await adminDb.collectionGroup("transactions").get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TransactionDB));
      },
      async () => localJsonDb.getTransactions() as TransactionDB[],
      OperationType.LIST,
      "transactions"
    );
  }

  static async getUserTransactions(userId: string): Promise<TransactionDB[]> {
    return this.executeWithProviderFallback(
      async () => {
        const txs = await Transaction.find({ userId });
        return txs.map(t => {
          const obj = t.toObject() as any;
          return { ...obj, id: obj.id || obj._id?.toString() } as TransactionDB;
        });
      },
      async () => {
        const snapshot = await adminDb.collection("users").doc(userId).collection("transactions").get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TransactionDB));
      },
      async () => localJsonDb.getUserTransactions(userId) as TransactionDB[],
      OperationType.LIST,
      `users/${userId}/transactions`
    );
  }

  static async createTransaction(data: Omit<TransactionDB, "id" | "createdAt">): Promise<TransactionDB> {
    const id = `tx-${Date.now()}`;
    const newTx: TransactionDB = { ...data, id, createdAt: new Date().toISOString() };

    localJsonDb.saveTransaction(newTx);

    return this.executeWithProviderFallback(
      async () => {
        await new Transaction(newTx).save();
        return newTx;
      },
      async () => {
        await adminDb.collection("users").doc(data.userId).collection("transactions").doc(id).set(newTx);
        return newTx;
      },
      async () => newTx,
      OperationType.CREATE,
      `users/${data.userId}/transactions/${id}`
    );
  }
}
