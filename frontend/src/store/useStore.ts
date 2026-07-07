import { create } from "zustand";
import { io, Socket } from "socket.io-client";
import { User, Document, Theme, Comment, VersionHistory } from "../types";
import { 
  auth, 
  db, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  googleProvider,
  githubProvider,
  handleFirestoreError,
  OperationType
} from "../lib/firebase";
import { 
  signInWithPopup, 
  onAuthStateChanged,
  getIdToken,
  User as FirebaseUser,
  updateProfile
} from "firebase/auth";
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  addDoc,
  Timestamp,
  serverTimestamp,
  arrayUnion,
  arrayRemove
} from "firebase/firestore";

// Enhanced Client Interfaces corresponding to our database models
export interface Workspace {
  id: string;
  name: string;
  avatar: string;
  ownerId: string;
  members: Array<{
    userId: string;
    email: string;
    role: "owner" | "editor" | "viewer";
  }>;
}

export interface Folder {
  id: string;
  name: string;
  workspaceId: string;
  parentId: string | null;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  description: string;
  isRead: boolean;
  createdAt: string;
}

export interface Activity {
  id: string;
  docId: string;
  workspaceId: string;
  userId: string;
  userName: string;
  type: "created" | "edited" | "shared" | "comment_added" | "collaborator_joined";
  details: string;
  createdAt: string;
}

export interface CollaboratorPresence {
  userId: string;
  email: string;
  name: string;
  photo: string;
  color: string;
  cursorPosition?: { x: number; y: number };
  isTyping?: boolean;
}

interface AppState {
  // Appearance
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;

  // Session & Authentication
  user: User | null;
  token: string | null;
  isLoadingUser: boolean;
  login: (email: string, pass: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>;
  loginWithGithub: () => Promise<boolean>;
  register: (email: string, pass: string, name: string) => Promise<boolean>;
  logout: () => void;
  initializeAuth: () => (() => void) | void;
  fetchMe: () => Promise<void>;
  updateProfile: (profileUpdates: Partial<User>) => Promise<User | null>;
  upgradePlan: () => Promise<void>;

  // SaaS Billing & Cloud Sync Actions
  backupCloudDocuments: () => Promise<{ success: boolean; count?: number; lastSyncTime?: string; error?: string; premiumLocked?: boolean }>;
  restoreCloudDocuments: () => Promise<{ success: boolean; count?: number; error?: string; premiumLocked?: boolean }>;
  cancelSubscription: () => Promise<boolean>;
  resumeSubscription: () => Promise<boolean>;
  fetchInvoices: () => Promise<any[]>;
  fetchTransactions: () => Promise<any[]>;

  // Workspaces
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  setActiveWorkspaceId: (id: string | null) => void;
  fetchWorkspaces: () => Promise<void>;
  createWorkspace: (name: string) => Promise<void>;
  updateWorkspace: (name: string, avatar: string) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  inviteCollaborator: (email: string, role: string) => Promise<{ success: boolean; message?: string; limitReached?: boolean }>;

  // Folders
  folders: Folder[];
  fetchFolders: () => Promise<void>;
  createFolder: (name: string, parentId: string | null) => Promise<void>;
  updateFolder: (id: string, name: string, parentId: string | null) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;

  // Documents
  documents: Document[];
  activeDocumentId: string | null;
  setActiveDocumentId: (id: string | null) => void;
  fetchDocuments: () => Promise<void>;
  createDocument: (title: string, folderId: string | null) => Promise<Document | null>;
  updateDocument: (id: string, updates: Partial<Document>) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  starDocument: (id: string) => Promise<void>;
  archiveDocument: (id: string) => Promise<void>;
  moveDocument: (id: string, folderId: string | null) => Promise<void>;
  duplicateDocument: (id: string) => Promise<void>;

  // Real-time Collaboration Comments
  comments: Comment[];
  fetchComments: (docId: string) => Promise<void>;
  addComment: (text: string, parentId: string | null) => Promise<void>;
  resolveComment: (id: string) => Promise<void>;

  // Version history
  history: VersionHistory[];
  historyUnsubscribe: (() => void) | null;
  fetchHistory: (docId: string) => void;
  saveVersionSnapshot: (title: string) => Promise<void>;
  clearHistory: () => void;

  // Real-time Notifications & Activities
  notifications: Notification[];
  activities: Activity[];
  fetchNotifications: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  fetchActivities: () => Promise<void>;

  // Socket client and Presence management
  socket: Socket | null;
  activeCollaborators: CollaboratorPresence[];
  initSocket: () => void;
  joinDocumentRoom: (docId: string) => void;
  leaveDocumentRoom: (docId: string) => void;
  sendTyping: (isTyping: boolean) => void;
  sendCursorMove: (x: number, y: number) => void;
  sendDocumentUpdate: (content: string) => void;

  // AI Operations
  aiHistory: any[];
  fetchAiHistory: () => Promise<void>;
  clearAiHistory: () => Promise<void>;
  runAiTask: (docId: string | null, task: string, prompt: string, textContext: string) => Promise<{ response: string; error?: string; premiumLocked?: boolean }>;

  // Security Operations
  fetchAuditLogs: () => Promise<any[]>;
  fetchSessions: () => Promise<{ sessions: any[]; trustedDevices: any[] }>;
  revokeSession: (id: string) => Promise<boolean>;
  registerTrustedDevice: (name: string, type: string) => Promise<any>;
  fetchTwoFactor: () => Promise<any>;
  updateTwoFactor: (config: any) => Promise<any>;

  // Collaboration & Whiteboard
  fetchWhiteboard: (workspaceId: string) => Promise<any[]>;
  saveWhiteboard: (workspaceId: string, elements: any[]) => Promise<boolean>;
  fetchReplayFrames: (docId: string) => Promise<any[]>;
  logReplayFrame: (docId: string, title: string, content: string) => Promise<void>;
  submitVoiceComment: (docId: string, text: string, voiceBlobBase64: string, duration: number) => Promise<any>;
  updateDocStatus: (docId: string, status: string, isLocked: boolean) => Promise<any>;

  // Plugins Operations
  fetchPlugins: () => Promise<any[]>;
  togglePlugin: (id: string) => Promise<any>;

  // Enterprise Operations
  fetchBranding: () => Promise<any>;
  updateBranding: (branding: any) => Promise<any>;
  fetchTeams: () => Promise<any[]>;
  createTeam: (name: string, dept: string, lead: string) => Promise<any>;
  inviteUser: (email: string, role: string) => Promise<any>;
  fetchPermissions: (targetId: string) => Promise<any>;
  updatePermissions: (targetId: string, rules: any) => Promise<any>;
}

const API_BASE = "/api";

export const useStore = create<AppState>((set, get) => ({
  // Theme management
  theme: (localStorage.getItem("collabdocs_theme") as Theme) || "dark",
  setTheme: (theme) => {
    localStorage.setItem("collabdocs_theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    set({ theme });
  },
  toggleTheme: () => {
    const nextTheme = get().theme === "dark" ? "light" : "dark";
    get().setTheme(nextTheme);
  },

  // Auth management
  user: localStorage.getItem("collabdocs_user") ? JSON.parse(localStorage.getItem("collabdocs_user")!) : null,
  token: localStorage.getItem("collabdocs_token") || null,
  isLoadingUser: true,

  initializeAuth: () => {
    // If we have a local mock token on reload, preserve that session instead of letting Firebase clear it
    const savedToken = localStorage.getItem("collabdocs_token");
    if (savedToken && savedToken.startsWith("mock-token-")) {
      console.log("[Store] Found active local session. Skipping Firebase auth listener initialization.");
      get().fetchMe().then(() => {
        set({ isLoadingUser: false });
      }).catch(() => {
        set({ isLoadingUser: false });
      });
      return;
    }

    if (!auth) {
      set({ isLoadingUser: false });
      return;
    }
    
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        console.log("[Store] Auth state changed: User logged in", firebaseUser.email);
        try {
          const token = await firebaseUser.getIdToken(true);
          
          let res = await fetch(`${API_BASE}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          // If profile not found in DB, attempt automatic registration/sync
          if (res.status === 404) {
            console.log("[Store] Profile missing in backend, attempting sync...");
            res = await fetch(`${API_BASE}/auth/register`, {
              method: "POST",
              headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
              },
              body: JSON.stringify({
                email: firebaseUser.email,
                displayName: firebaseUser.displayName || "User"
              })
            });
            console.log("[Store] Registration attempt status:", res.status);
          }
          
          console.log("[Store] Auth fetch response status:", res.status);
          if (res.ok) {
            const data = await res.json();
            console.log("[Store] Auth fetch data:", data);
            const userData = data.user || data; // Handle both direct and nested responses
            
            const user: User = {
              uid: userData.uid || userData.id,
              email: userData.email,
              displayName: userData.displayName,
              firstName: userData.firstName || null,
              lastName: userData.lastName || null,
              bio: userData.bio || null,
              organization: userData.organization || null,
              timezone: userData.timezone || null,
              language: userData.language || null,
              provider: userData.provider || null,
              photoURL: userData.photoURL,
              emailVerified: firebaseUser.emailVerified,
              plan: userData.plan,
              planStatus: userData.planStatus,
              subscriptionId: userData.subscriptionId,
              renewalDate: userData.renewalDate,
              billingStatus: userData.billingStatus,
              createdAt: userData.createdAt
            };
            
            localStorage.setItem("collabdocs_token", token);
            localStorage.setItem("collabdocs_user", JSON.stringify(user));
            
            set({ 
              user, 
              token, 
              isLoadingUser: false,
              activeWorkspaceId: data.workspaceId || get().activeWorkspaceId 
            });
            
            get().initSocket();
            await get().fetchWorkspaces();
          } else {
            console.error("[Store] Backend sync failed with status:", res.status);
            set({ isLoadingUser: false });
          }
        } catch (error) {
          console.error("[Store] Auth initialization error:", error);
          set({ isLoadingUser: false });
        }
      } else {
        // Only wipe session if the current token is NOT a local mock token
        const currentToken = get().token || localStorage.getItem("collabdocs_token");
        if (currentToken && currentToken.startsWith("mock-token-")) {
          console.log("[Store] Retaining local authenticated session.");
          set({ isLoadingUser: false });
          return;
        }

        console.log("[Store] Auth state changed: User logged out");
        localStorage.removeItem("collabdocs_token");
        localStorage.removeItem("collabdocs_user");
        set({ user: null, token: null, isLoadingUser: false, workspaces: [], activeWorkspaceId: null });
      }
    });
  },

  login: async (email, password) => {
    set({ isLoadingUser: true });
    try {
      if (!auth) throw new Error("Firebase Auth not initialized");
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      const token = await firebaseUser.getIdToken(true);

      // We still hit the backend to sync user profile and get a workspace
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login credentials unauthorized");

      localStorage.setItem("collabdocs_token", data.token);
      localStorage.setItem("collabdocs_user", JSON.stringify(data.user));

      set({
        token: data.token,
        user: data.user,
        activeWorkspaceId: data.workspaceId,
        isLoadingUser: false
      });

      // Fetch newly loaded account workspaces
      get().initSocket();
      await get().fetchWorkspaces();
      return true;
    } catch (e: any) {
      console.warn("Store Login: Firebase authentication failed/disabled. Falling back to local authentication...", e.message);
      try {
        const res = await fetch(`${API_BASE}/auth/local-login`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Local credentials unauthorized");

        localStorage.setItem("collabdocs_token", data.token);
        localStorage.setItem("collabdocs_user", JSON.stringify(data.user));

        set({
          token: data.token,
          user: data.user,
          activeWorkspaceId: data.workspaceId,
          isLoadingUser: false
        });

        get().initSocket();
        await get().fetchWorkspaces();
        return true;
      } catch (localError: any) {
        console.error("Local login fallback also failed:", localError.message);
        set({ isLoadingUser: false });
        throw localError;
      }
    }
  },

  loginWithGoogle: async () => {
    set({ isLoadingUser: true });
    try {
      if (!auth) throw new Error("Firebase Auth not initialized");
      const userCredential = await signInWithPopup(auth, googleProvider);
      const firebaseUser = userCredential.user;
      const token = await firebaseUser.getIdToken(true);

      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Google login failed");

      // Use either data.token (if returned) or the firebase token
      const sessionToken = data.token || token;
      localStorage.setItem("collabdocs_token", sessionToken);
      localStorage.setItem("collabdocs_user", JSON.stringify(data.user));

      set({
        token: sessionToken,
        user: data.user,
        activeWorkspaceId: data.workspaceId,
        isLoadingUser: false
      });

      get().initSocket();
      await get().fetchWorkspaces();
      return true;
    } catch (e: any) {
      console.error("Google Login failure:", e.message);
      set({ isLoadingUser: false });
      throw e;
    }
  },

  loginWithGithub: async () => {
    set({ isLoadingUser: true });
    try {
      if (!auth) throw new Error("Firebase Auth not initialized");
      const userCredential = await signInWithPopup(auth, githubProvider);
      const firebaseUser = userCredential.user;
      const token = await firebaseUser.getIdToken(true);

      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "GitHub login failed");

      const sessionToken = data.token || token;
      localStorage.setItem("collabdocs_token", sessionToken);
      localStorage.setItem("collabdocs_user", JSON.stringify(data.user));

      set({
        token: sessionToken,
        user: data.user,
        activeWorkspaceId: data.workspaceId,
        isLoadingUser: false
      });

      get().initSocket();
      await get().fetchWorkspaces();
      return true;
    } catch (e: any) {
      console.error("GitHub Login failure:", e.message);
      set({ isLoadingUser: false });
      throw e;
    }
  },

  register: async (email, password, name) => {
    set({ isLoadingUser: true });
    try {
      if (!auth) throw new Error("Firebase Auth not initialized");
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      await updateProfile(firebaseUser, { displayName: name });
      const token = await firebaseUser.getIdToken(true);

      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ email, displayName: name })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sign-up dispatcher error.");

      localStorage.setItem("collabdocs_token", data.token);
      localStorage.setItem("collabdocs_user", JSON.stringify(data.user));

      set({
        token: data.token,
        user: data.user,
        activeWorkspaceId: data.workspaceId,
        isLoadingUser: false
      });

      get().initSocket();
      await get().fetchWorkspaces();
      return true;
    } catch (e: any) {
      console.warn("Store Register: Firebase registration failed/disabled. Falling back to local registration...", e.message);
      try {
        const res = await fetch(`${API_BASE}/auth/local-register`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ email, password, displayName: name })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Local registration rejected");

        localStorage.setItem("collabdocs_token", data.token);
        localStorage.setItem("collabdocs_user", JSON.stringify(data.user));

        set({
          token: data.token,
          user: data.user,
          activeWorkspaceId: data.workspaceId,
          isLoadingUser: false
        });

        get().initSocket();
        await get().fetchWorkspaces();
        return true;
      } catch (localError: any) {
        console.error("Local registration fallback also failed:", localError.message);
        set({ isLoadingUser: false });
        throw localError;
      }
    }
  },

  logout: () => {
    if (auth) signOut(auth);
    if (get().socket) {
      get().socket?.disconnect();
    }
    localStorage.removeItem("collabdocs_token");
    localStorage.removeItem("collabdocs_user");
    localStorage.removeItem("collabdocs_active_ws");
    set({
      user: null,
      token: null,
      workspaces: [],
      folders: [],
      documents: [],
      comments: [],
      history: [],
      notifications: [],
      activities: [],
      activeWorkspaceId: null,
      activeDocumentId: null,
      socket: null,
      activeCollaborators: []
    });
  },

  fetchMe: async () => {
    const { token } = get();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const userData = data.user || data;
        const cleanUser: User = {
          uid: userData.uid || userData.id,
          email: userData.email,
          displayName: userData.displayName,
          firstName: userData.firstName || null,
          lastName: userData.lastName || null,
          bio: userData.bio || null,
          organization: userData.organization || null,
          timezone: userData.timezone || null,
          language: userData.language || null,
          provider: userData.provider || null,
          photoURL: userData.photoURL,
          emailVerified: userData.emailVerified,
          plan: userData.plan,
          planStatus: userData.planStatus,
          subscriptionId: userData.subscriptionId,
          renewalDate: userData.renewalDate,
          billingStatus: userData.billingStatus,
          createdAt: userData.createdAt
        };
        localStorage.setItem("collabdocs_user", JSON.stringify(cleanUser));
        set({ user: cleanUser });
      }
    } catch (e) {
      console.warn("Could not fetch identity cluster:", e);
    }
  },

  updateProfile: async (profileUpdates) => {
    const { token, user } = get();
    if (!token || !user) return null;
    try {
      const res = await fetch(`${API_BASE}/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(profileUpdates)
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Profile update failed.");
      }
      const data = await res.json();
      const updatedUser = {
        uid: data.user.uid || data.user.id,
        email: data.user.email,
        displayName: data.user.displayName,
        firstName: data.user.firstName || null,
        lastName: data.user.lastName || null,
        bio: data.user.bio || null,
        organization: data.user.organization || null,
        timezone: data.user.timezone || null,
        language: data.user.language || null,
        provider: data.user.provider || null,
        photoURL: data.user.photoURL,
        emailVerified: data.user.emailVerified,
        plan: data.user.plan,
        planStatus: data.user.planStatus,
        subscriptionId: data.user.subscriptionId,
        renewalDate: data.user.renewalDate,
        billingStatus: data.user.billingStatus,
        createdAt: data.user.createdAt
      };
      localStorage.setItem("collabdocs_user", JSON.stringify(updatedUser));
      set({ user: updatedUser });
      return updatedUser;
    } catch (e: any) {
      console.error("Profile update error:", e);
      return null;
    }
  },

  upgradePlan: async () => {
    const { token } = get();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/auth/upgrade`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("collabdocs_token", data.token);
        localStorage.setItem("collabdocs_user", JSON.stringify(data.user));
        set({ token: data.token, user: data.user });
        await get().fetchNotifications();
      }
    } catch (e) {
      console.error("Upgrade action error:", e);
    }
  },

  backupCloudDocuments: async () => {
    const { token, documents } = get();
    if (!token) return { success: false, error: "Not authenticated" };
    try {
      const res = await fetch(`${API_BASE}/cloud-sync/backup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ documents })
      });
      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: data.error || "Failed backup sync",
          premiumLocked: !!data.premiumLocked
        };
      }
      if (data.documents) {
        set({ documents: data.documents });
      }
      return { success: true, lastSyncTime: data.lastSyncTime };
    } catch (e: any) {
      console.error("Cloud backup sync error:", e);
      return { success: false, error: e.message };
    }
  },

  restoreCloudDocuments: async () => {
    const { token } = get();
    if (!token) return { success: false, error: "Not authenticated" };
    try {
      const res = await fetch(`${API_BASE}/cloud-sync/restore`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: data.error || "Failed restore sync",
          premiumLocked: !!data.premiumLocked
        };
      }
      if (data.documents) {
        set({ documents: data.documents });
      }
      return { success: true };
    } catch (e: any) {
      console.error("Cloud restore sync error:", e);
      return { success: false, error: e.message };
    }
  },

  cancelSubscription: async () => {
    const { token } = get();
    if (!token) return false;
    try {
      const res = await fetch(`${API_BASE}/billing/cancel`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const user = get().user;
        if (user) {
          const updated = { ...user, planStatus: "canceled" as any };
          localStorage.setItem("collabdocs_user", JSON.stringify(updated));
          set({ user: updated });
        }
        await get().fetchNotifications();
        return true;
      }
      return false;
    } catch (e) {
      console.error("Cancel subscription error:", e);
      return false;
    }
  },

  resumeSubscription: async () => {
    const { token } = get();
    if (!token) return false;
    try {
      const res = await fetch(`${API_BASE}/billing/resume`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const user = get().user;
        if (user) {
          const updated = { ...user, planStatus: "active" as any };
          localStorage.setItem("collabdocs_user", JSON.stringify(updated));
          set({ user: updated });
        }
        await get().fetchNotifications();
        return true;
      }
      return false;
    } catch (e) {
      console.error("Resume subscription error:", e);
      return false;
    }
  },

  fetchInvoices: async () => {
    const { token } = get();
    if (!token) return [];
    try {
      const res = await fetch(`${API_BASE}/billing/invoices`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        return await res.json();
      }
      return [];
    } catch (e) {
      console.error("Fetch invoices error:", e);
      return [];
    }
  },

  fetchTransactions: async () => {
    const { token } = get();
    if (!token) return [];
    try {
      const res = await fetch(`${API_BASE}/billing/transactions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        return await res.json();
      }
      return [];
    } catch (e) {
      console.error("Fetch transactions error:", e);
      return [];
    }
  },

  // Workspaces Actions
  workspaces: [],
  activeWorkspaceId: localStorage.getItem("collabdocs_active_ws") || null,
  setActiveWorkspaceId: (id) => {
    if (id) {
      localStorage.setItem("collabdocs_active_ws", id);
    } else {
      localStorage.removeItem("collabdocs_active_ws");
    }
    set({ activeWorkspaceId: id });
    get().fetchFolders();
    get().fetchDocuments();
    get().fetchActivities();
  },

  fetchWorkspaces: async () => {
    const { token } = get();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/workspaces`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const list = await res.json();
        set({ workspaces: list });
        if (list.length > 0 && !get().activeWorkspaceId) {
          get().setActiveWorkspaceId(list[0].id);
        } else if (get().activeWorkspaceId) {
          // Re-trigger folder/doc pulls for active workspace
          get().fetchFolders();
          get().fetchDocuments();
          get().fetchActivities();
        }
      }
    } catch (e) {
      console.error("Workspace retrieve error:", e);
    }
  },

  createWorkspace: async (name) => {
    const { token } = get();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/workspaces`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name })
      });
      if (res.ok) {
        const newWs = await res.json();
        set((state) => ({ workspaces: [...state.workspaces, newWs] }));
        get().setActiveWorkspaceId(newWs.id);
      }
    } catch (e) {
      console.error("Workspace spawn error:", e);
    }
  },

  updateWorkspace: async (name, avatar) => {
    const { token, activeWorkspaceId } = get();
    if (!token || !activeWorkspaceId) return;
    try {
      const res = await fetch(`${API_BASE}/workspaces/${activeWorkspaceId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name, avatar })
      });
      if (res.ok) {
        const updated = await res.json();
        set((state) => ({
          workspaces: state.workspaces.map((w) => (w.id === activeWorkspaceId ? updated : w))
        }));
      }
    } catch (e) {
      console.error("Workspace update error:", e);
    }
  },

  deleteWorkspace: async (id) => {
    const { token } = get();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/workspaces/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const remaining = get().workspaces.filter((w) => w.id !== id);
        set({ workspaces: remaining });
        if (get().activeWorkspaceId === id) {
          get().setActiveWorkspaceId(remaining.length > 0 ? remaining[0].id : null);
        }
      }
    } catch (e) {
      console.error("Workspace destroy error:", e);
    }
  },

  inviteCollaborator: async (email, role) => {
    const { token, activeWorkspaceId } = get();
    if (!token || !activeWorkspaceId) return { success: false, message: "No active workspace." };
    try {
      const res = await fetch(`${API_BASE}/workspaces/${activeWorkspaceId}/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ email, role })
      });
      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          limitReached: data.limitReached || false,
          message: data.error || "Collaborator invitation rejected."
        };
      }
      set((state) => ({
        workspaces: state.workspaces.map((w) => (w.id === activeWorkspaceId ? data : w))
      }));
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message || "Invite networking error." };
    }
  },

  // Folders Actions
  folders: [],
  fetchFolders: async () => {
    const { token, activeWorkspaceId } = get();
    if (!token || !activeWorkspaceId) return;
    try {
      const res = await fetch(`${API_BASE}/folders/${activeWorkspaceId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const folders = await res.json();
        set({ folders });
      }
    } catch (e) {
      console.error("Folder list retrieval error:", e);
    }
  },

  createFolder: async (name, parentId) => {
    const { token, activeWorkspaceId } = get();
    if (!token || !activeWorkspaceId) return;
    try {
      const res = await fetch(`${API_BASE}/folders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name, workspaceId: activeWorkspaceId, parentId })
      });
      if (res.ok) {
        const folder = await res.json();
        set((state) => ({ folders: [...state.folders, folder] }));
      }
    } catch (e) {
      console.error("Folder creation error:", e);
    }
  },

  updateFolder: async (id, name, parentId) => {
    const { token } = get();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/folders/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name, parentId })
      });
      if (res.ok) {
        const updated = await res.json();
        set((state) => ({
          folders: state.folders.map((f) => (f.id === id ? updated : f))
        }));
      }
    } catch (e) {
      console.error("Folder rename/move error:", e);
    }
  },

  deleteFolder: async (id) => {
    const { token } = get();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/folders/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        set((state) => ({
          folders: state.folders.filter((f) => f.id !== id),
          documents: state.documents.map((d) => (d.folderId === id ? { ...d, folderId: null } : d))
        }));
      }
    } catch (e) {
      console.error("Folder deletion error:", e);
    }
  },

  // Documents Actions
  documents: [],
  activeDocumentId: null,
  setActiveDocumentId: (id) => {
    set({ activeDocumentId: id });
  },

  fetchDocuments: async () => {
    const { token, activeWorkspaceId } = get();
    if (!token || !activeWorkspaceId) return;
    try {
      const res = await fetch(`${API_BASE}/documents/${activeWorkspaceId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const list = await res.json();
        set({ documents: list });
        if (list.length > 0 && !get().activeDocumentId) {
          set({ activeDocumentId: list[0].id });
        }
      }
    } catch (e) {
      console.error("Document retrieval error:", e);
    }
  },

  createDocument: async (title, folderId) => {
    const { token, activeWorkspaceId, leaveDocumentRoom, joinDocumentRoom } = get();
    if (!token || !activeWorkspaceId) return null;
    try {
      const res = await fetch(`${API_BASE}/documents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          content: "",
          workspaceId: activeWorkspaceId,
          folderId
        })
      });
      if (res.ok) {
        const newDoc = await res.json();
        set((state) => ({ documents: [newDoc, ...state.documents] }));
        
        const oldDocId = get().activeDocumentId;
        if (oldDocId) leaveDocumentRoom(oldDocId);

        set({ activeDocumentId: newDoc.id });
        joinDocumentRoom(newDoc.id);

        await get().fetchActivities();
        return newDoc;
      }
      return null;
    } catch (e) {
      console.error("Document spawn error:", e);
      return null;
    }
  },

  updateDocument: async (id, updates) => {
    const { token, activeWorkspaceId, socket, sendDocumentUpdate } = get();

    // Optimistic UI updates
    set((state) => ({
      documents: state.documents.map((d) => (d.id === id ? { ...d, ...updates, updatedAt: new Date().toISOString() } : d))
    }));

    // Broadcast if edit content is included
    if (updates.content !== undefined) {
      sendDocumentUpdate(updates.content);
      get().logReplayFrame(id, updates.title || "Live Edit Snapshot", updates.content);
    }

    if (!token || !activeWorkspaceId) return;
    try {
      await fetch(`${API_BASE}/documents/${activeWorkspaceId}/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });
    } catch (e) {
      console.error("Document update error:", e);
    }
  },

  deleteDocument: async (id) => {
    const { token, activeWorkspaceId, activeDocumentId, leaveDocumentRoom } = get();
    if (activeDocumentId === id) {
      leaveDocumentRoom(id);
    }
    
    const remaining = get().documents.filter((d) => d.id !== id);
    set({
      documents: remaining,
      activeDocumentId: remaining.length > 0 ? remaining[0].id : null
    });

    if (!token || !activeWorkspaceId) return;
    try {
      await fetch(`${API_BASE}/documents/${activeWorkspaceId}/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (e) {
      console.error("Document permanent wipe failure:", e);
    }
  },

  starDocument: async (id) => {
    const { token, activeWorkspaceId } = get();
    set((state) => ({
      documents: state.documents.map((d) => (d.id === id ? { ...d, isStarred: !d.isStarred } : d))
    }));

    if (!token || !activeWorkspaceId) return;
    try {
      await fetch(`${API_BASE}/documents/${activeWorkspaceId}/${id}/star`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (e) {
      console.error("Document favorite toggle error:", e);
    }
  },

  archiveDocument: async (id) => {
    const { token, activeWorkspaceId } = get();
    set((state) => ({
      documents: state.documents.map((d) => (d.id === id ? { ...d, isArchived: !d.isArchived } : d))
    }));

    if (!token || !activeWorkspaceId) return;
    try {
      await fetch(`${API_BASE}/documents/${activeWorkspaceId}/${id}/archive`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (e) {
      console.error("Document archive status toggle error:", e);
    }
  },

  moveDocument: async (id, folderId) => {
    const { token, activeWorkspaceId } = get();
    set((state) => ({
      documents: state.documents.map((d) => (d.id === id ? { ...d, folderId } : d))
    }));

    if (!token || !activeWorkspaceId) return;
    try {
      await fetch(`${API_BASE}/documents/${activeWorkspaceId}/${id}/move`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ folderId })
      });
    } catch (e) {
      console.error("Document move target folder error:", e);
    }
  },

  duplicateDocument: async (id) => {
    const { token, activeWorkspaceId } = get();
    if (!token || !activeWorkspaceId) return;
    try {
      const res = await fetch(`${API_BASE}/documents/${activeWorkspaceId}/${id}/duplicate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const copy = await res.json();
        set((state) => ({ documents: [copy, ...state.documents] }));
      }
    } catch (e) {
      console.error("Document duplication error:", e);
    }
  },

  // Collaborative Comments
  comments: [],
  fetchComments: async (docId) => {
    const { token, activeWorkspaceId } = get();
    if (!token || !activeWorkspaceId) return;
    try {
      const res = await fetch(`${API_BASE}/comments/${activeWorkspaceId}/${docId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const list = await res.json();
        set({ comments: list });
      }
    } catch (e) {
      console.error("Comments collection retrieve error:", e);
    }
  },

  addComment: async (text, parentId) => {
    const { token, activeDocumentId, activeWorkspaceId, socket } = get();
    if (!activeDocumentId || !activeWorkspaceId) return;

    // Direct optimistic state insertion for immediate user response
    const tempComment: Comment = {
      id: `temp-${Date.now()}`,
      docId: activeDocumentId,
      author: get().user?.displayName || "Guest Architect",
      authorPhoto: get().user?.photoURL || "",
      text,
      createdAt: new Date().toISOString()
    };
    set((state) => ({ comments: [...state.comments, tempComment] }));

    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ workspaceId: activeWorkspaceId, docId: activeDocumentId, text, parentId })
      });
      if (res.ok) {
        const savedComment = await res.json();
        // Swap temp comment with saved DB comment
        set((state) => ({
          comments: state.comments.map((c) => (c.id === tempComment.id ? savedComment : c))
        }));

        // Broadcast comment event to workspace room
        if (socket) {
          socket.emit("comment-added", { docId: activeDocumentId, comment: savedComment });
        }
        await get().fetchActivities();
      }
    } catch (e) {
      console.error("Comment dispatch error:", e);
    }
  },

  resolveComment: async (id) => {
    const { token } = get();
    set((state) => ({
      comments: state.comments.filter((c) => c.id !== id)
    }));

    if (!token) return;
    try {
      await fetch(`${API_BASE}/comments/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isResolved: true })
      });
    } catch (e) {
      console.error("Resolve comment error:", e);
    }
  },

  // Version History Actions
  history: [],
  historyUnsubscribe: null,
  fetchHistory: (docId) => {
    const { historyUnsubscribe, activeWorkspaceId } = get();
    if (historyUnsubscribe) historyUnsubscribe();
    if (!activeWorkspaceId || !db) return;

    const path = `workspaces/${activeWorkspaceId}/documents/${docId}/versions`;
    const q = query(collection(db, path), orderBy("updatedAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as VersionHistory[];
      set({ history: list });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });

    set({ historyUnsubscribe: unsubscribe });
  },

  saveVersionSnapshot: async (title) => {
    const { activeDocumentId, activeWorkspaceId, documents, user } = get();
    if (!activeDocumentId || !activeWorkspaceId || !db) return;

    const currentDoc = documents.find((d) => d.id === activeDocumentId);
    if (!currentDoc) return;

    const path = `workspaces/${activeWorkspaceId}/documents/${activeDocumentId}/versions`;
    try {
      await addDoc(collection(db, path), {
        docId: activeDocumentId,
        title,
        content: currentDoc.content,
        updatedBy: user?.displayName || user?.email || "Unknown Agent",
        updatedAt: new Date().toISOString()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, path);
    }
  },

  clearHistory: () => {
    const { historyUnsubscribe } = get();
    if (historyUnsubscribe) historyUnsubscribe();
    set({ history: [], historyUnsubscribe: null });
  },

  // Real-time notifications and Activities logs
  notifications: [],
  activities: [],

  fetchNotifications: async () => {
    const { token } = get();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const list = await res.json();
        set({ notifications: list });
      }
    } catch (e) {
      console.warn("Notifications download error:", e);
    }
  },

  markNotificationRead: async (id) => {
    const { token } = get();
    set((state) => ({
      notifications: state.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    }));

    if (!token) return;
    try {
      await fetch(`${API_BASE}/notifications/${id}/read`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (e) {
      console.error("Mark read notification error:", e);
    }
  },

  fetchActivities: async () => {
    const { token, activeWorkspaceId } = get();
    if (!token || !activeWorkspaceId) return;
    try {
      const res = await fetch(`${API_BASE}/activities/${activeWorkspaceId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const list = await res.json();
        set({ activities: list });
      }
    } catch (e) {
      console.warn("Activities download error:", e);
    }
  },

  // Socket management & cursors updates
  socket: null,
  activeCollaborators: [],

  initSocket: () => {
    const currentSocket = get().socket;
    if (currentSocket) return; // Already setup

    const newSocket = io(window.location.origin, {
      transports: ["websocket", "polling"],
      autoConnect: true
    });

    // Wire up events
    newSocket.on("presence-update", (usersList: CollaboratorPresence[]) => {
      // Exclude current client from remote active collaborators lists
      const selfId = get().user?.uid || "guest";
      const remoteUsers = usersList.filter((u) => u.userId !== selfId);
      set({ activeCollaborators: remoteUsers });
    });

    newSocket.on("cursor-update", ({ userId, name, color, position }) => {
      set((state) => ({
        activeCollaborators: state.activeCollaborators.map((c) =>
          c.userId === userId ? { ...c, cursorPosition: position } : c
        )
      }));
    });

    newSocket.on("typing-update", ({ userId, isTyping }) => {
      set((state) => ({
        activeCollaborators: state.activeCollaborators.map((c) =>
          c.userId === userId ? { ...c, isTyping } : c
        )
      }));
    });

    newSocket.on("document-sync", ({ content, updatedBy }) => {
      // Synchronize text changes into active doc without overriding cursor focuses
      const activeId = get().activeDocumentId;
      if (activeId) {
        set((state) => ({
          documents: state.documents.map((d) => (d.id === activeId ? { ...d, content } : d))
        }));
      }
    });

    newSocket.on("comment-sync", (comment: Comment) => {
      // Add socket comments to active array
      set((state) => {
        const exists = state.comments.some((c) => c.id === comment.id);
        if (exists) return state;
        return { comments: [...state.comments, comment] };
      });
    });

    set({ socket: newSocket });
  },

  joinDocumentRoom: (docId) => {
    const { socket, user } = get();
    if (!socket || !docId) return;

    socket.emit("join-document", {
      docId,
      userId: user?.uid || "guest",
      email: user?.email || "guest@veltora.com",
      name: user?.displayName || "Guest Architect",
      photo: user?.photoURL || "https://api.dicebear.com/7.x/initials/svg?seed=Guest",
      color: user?.plan === "premium" ? "#F59E0B" : "#6366F1"
    });
  },

  leaveDocumentRoom: (docId) => {
    const { socket, user } = get();
    if (!socket || !docId) return;

    socket.emit("leave-document", {
      docId,
      userId: user?.uid || "guest"
    });
  },

  sendTyping: (isTyping) => {
    const { socket, activeDocumentId, user } = get();
    if (!socket || !activeDocumentId) return;

    socket.emit("typing", {
      docId: activeDocumentId,
      userId: user?.uid || "guest",
      isTyping
    });
  },

  sendCursorMove: (x, y) => {
    const { socket, activeDocumentId, user } = get();
    if (!socket || !activeDocumentId) return;

    socket.emit("cursor-move", {
      docId: activeDocumentId,
      userId: user?.uid || "guest",
      position: { x, y }
    });
  },

  sendDocumentUpdate: (content) => {
    const { socket, activeDocumentId, user } = get();
    if (!socket || !activeDocumentId) return;

    socket.emit("document-update", {
      docId: activeDocumentId,
      content,
      updatedBy: user?.displayName || "Collaborator"
    });
  },

  // AI Operations
  aiHistory: [],
  fetchAiHistory: async () => {
    const { token } = get();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/ai/history`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const history = await res.json();
        set({ aiHistory: history });
      }
    } catch (err) {
      console.error("fetchAiHistory failed:", err);
    }
  },
  clearAiHistory: async () => {
    const { token } = get();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/ai/history`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        set({ aiHistory: [] });
      }
    } catch (err) {
      console.error("clearAiHistory failed:", err);
    }
  },
  runAiTask: async (docId, task, prompt, textContext) => {
    const { token } = get();
    if (!token) return { response: "", error: "Unauthorized" };
    try {
      const res = await fetch(`${API_BASE}/ai/completion`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ docId, task, prompt, textContext })
      });
      const data = await res.json();
      if (!res.ok) {
        return { response: "", error: data.error || "AI failure", premiumLocked: data.premiumLocked };
      }
      get().fetchAiHistory();
      return { response: data.response };
    } catch (err: any) {
      return { response: "", error: err.message || "Network error" };
    }
  },

  // Security Operations
  fetchAuditLogs: async () => {
    const { token } = get();
    if (!token) return [];
    try {
      const res = await fetch(`${API_BASE}/security/audit-logs`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) return await res.json();
    } catch (err) {
      console.error(err);
    }
    return [];
  },
  fetchSessions: async () => {
    const { token } = get();
    if (!token) return { sessions: [], trustedDevices: [] };
    try {
      const res = await fetch(`${API_BASE}/security/sessions`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) return await res.json();
    } catch (err) {
      console.error(err);
    }
    return { sessions: [], trustedDevices: [] };
  },
  revokeSession: async (id) => {
    const { token } = get();
    if (!token) return false;
    try {
      const res = await fetch(`${API_BASE}/security/sessions/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      return res.ok;
    } catch (err) {
      console.error(err);
    }
    return false;
  },
  registerTrustedDevice: async (name, type) => {
    const { token } = get();
    if (!token) return null;
    try {
      const res = await fetch(`${API_BASE}/security/devices`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ name, type })
      });
      if (res.ok) return await res.json();
    } catch (err) {
      console.error(err);
    }
    return null;
  },
  fetchTwoFactor: async () => {
    const { token } = get();
    if (!token) return null;
    try {
      const res = await fetch(`${API_BASE}/security/2fa`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) return await res.json();
    } catch (err) {
      console.error(err);
    }
    return null;
  },
  updateTwoFactor: async (config) => {
    const { token } = get();
    if (!token) return null;
    try {
      const res = await fetch(`${API_BASE}/security/2fa`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(config)
      });
      if (res.ok) return await res.json();
    } catch (err) {
      console.error(err);
    }
    return null;
  },

  // Collaboration & Whiteboard
  fetchWhiteboard: async (workspaceId) => {
    const { token } = get();
    if (!token) return [];
    try {
      const res = await fetch(`${API_BASE}/collaboration/whiteboard/${workspaceId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) return await res.json();
    } catch (err) {
      console.error(err);
    }
    return [];
  },
  saveWhiteboard: async (workspaceId, elements) => {
    const { token } = get();
    if (!token) return false;
    try {
      const res = await fetch(`${API_BASE}/collaboration/whiteboard/${workspaceId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ elements })
      });
      return res.ok;
    } catch (err) {
      console.error(err);
    }
    return false;
  },
  fetchReplayFrames: async (docId) => {
    const { token } = get();
    if (!token) return [];
    try {
      const res = await fetch(`${API_BASE}/collaboration/replay/${docId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) return await res.json();
    } catch (err) {
      console.error(err);
    }
    return [];
  },
  logReplayFrame: async (docId, title, content) => {
    const { token } = get();
    if (!token) return;
    try {
      await fetch(`${API_BASE}/collaboration/replay/${docId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ title, content })
      });
    } catch (err) {
      console.error(err);
    }
  },
  submitVoiceComment: async (docId, text, voiceBlobBase64, duration) => {
    const { token } = get();
    if (!token) return null;
    try {
      const res = await fetch(`${API_BASE}/collaboration/voice-comment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ docId, text, voiceBlobBase64, duration })
      });
      if (res.ok) {
        get().fetchComments(docId);
        return await res.json();
      }
    } catch (err) {
      console.error(err);
    }
    return null;
  },
  updateDocStatus: async (docId, status, isLocked) => {
    const { token } = get();
    if (!token) return null;
    try {
      const res = await fetch(`${API_BASE}/collaboration/documents/${docId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ status, isLocked })
      });
      if (res.ok) return await res.json();
    } catch (err) {
      console.error(err);
    }
    return null;
  },

  // Plugins Operations
  fetchPlugins: async () => {
    const { token } = get();
    if (!token) return [];
    try {
      const res = await fetch(`${API_BASE}/plugins`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) return await res.json();
    } catch (err) {
      console.error(err);
    }
    return [];
  },
  togglePlugin: async (id) => {
    const { token } = get();
    if (!token) return null;
    try {
      const res = await fetch(`${API_BASE}/plugins/${id}/toggle`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) return await res.json();
    } catch (err) {
      console.error(err);
    }
    return null;
  },

  // Enterprise Operations
  fetchBranding: async () => {
    const { token } = get();
    if (!token) return null;
    try {
      const res = await fetch(`${API_BASE}/enterprise/branding`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) return await res.json();
    } catch (err) {
      console.error(err);
    }
    return null;
  },
  updateBranding: async (branding) => {
    const { token } = get();
    if (!token) return null;
    try {
      const res = await fetch(`${API_BASE}/enterprise/branding`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(branding)
      });
      if (res.ok) return await res.json();
    } catch (err) {
      console.error(err);
    }
    return null;
  },
  fetchTeams: async () => {
    const { token } = get();
    if (!token) return [];
    try {
      const res = await fetch(`${API_BASE}/enterprise/teams`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) return await res.json();
    } catch (err) {
      console.error(err);
    }
    return [];
  },
  createTeam: async (name, dept, lead) => {
    const { token } = get();
    if (!token) return null;
    try {
      const res = await fetch(`${API_BASE}/enterprise/teams`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ name, department: dept, lead })
      });
      if (res.ok) return await res.json();
    } catch (err) {
      console.error(err);
    }
    return null;
  },
  inviteUser: async (email, role) => {
    const { token, activeWorkspaceId } = get();
    if (!token || !activeWorkspaceId) return null;
    try {
      const res = await fetch(`${API_BASE}/enterprise/invitations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ email, role, workspaceId: activeWorkspaceId })
      });
      if (res.ok) return await res.json();
    } catch (err) {
      console.error(err);
    }
    return null;
  },
  fetchPermissions: async (targetId) => {
    const { token } = get();
    if (!token) return null;
    try {
      const res = await fetch(`${API_BASE}/enterprise/permissions/${targetId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) return await res.json();
    } catch (err) {
      console.error(err);
    }
    return null;
  },
  updatePermissions: async (targetId, rules) => {
    const { token } = get();
    if (!token) return null;
    try {
      const res = await fetch(`${API_BASE}/enterprise/permissions/${targetId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(rules)
      });
      if (res.ok) return await res.json();
    } catch (err) {
      console.error(err);
    }
    return null;
  }
}));
