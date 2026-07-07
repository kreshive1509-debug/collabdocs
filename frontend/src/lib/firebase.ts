import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  GithubAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  signInWithPopup
} from "firebase/auth";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || ""
};

const databaseIdEnv = import.meta.env.VITE_FIREBASE_DATABASE_ID;

let databaseId = databaseIdEnv || "(default)";

// STRICT SANITIZATION: If it starts with G- (Measurement ID) or AIza (API Key), it's definitely wrong.
if (databaseId.startsWith("G-") || databaseId.startsWith("AIza") || databaseId.length > 30) {
  console.warn(`[Firebase Client] Detected invalid Database ID: ${databaseId}. Resetting to (default).`);
  databaseId = "(default)";
}

const source = import.meta.env.VITE_FIREBASE_PROJECT_ID ? "VITE_ENV_VAR" : "NOT_CONFIGURED";

// Diagnostic logs for user to verify config in browser console
console.log(`[Firebase Client] Initializing for Project: ${config.projectId || "UNKNOWN"} (Source: ${source})`);
if (config.apiKey) {
  const keyPreview = `${config.apiKey.substring(0, 8)}...${config.apiKey.substring(Math.max(0, config.apiKey.length - 4))}`;
  console.log(`[Firebase Client] API Key detected (Length: ${config.apiKey.length}, Preview: ${keyPreview})`);
} else {
  console.warn("⚠️ [Firebase Client] API Key is missing. Authentication will NOT work.");
}

if (databaseId && databaseId !== "(default)") {
  console.log(`[Firebase Client] Using Database ID: ${databaseId}`);
}

if (!config.authDomain && config.projectId) {
  config.authDomain = `${config.projectId}.firebaseapp.com`;
  console.log(`[Firebase Client] Inferred AuthDomain: ${config.authDomain}`);
}

let app;
try {
  if (config.apiKey && config.projectId) {
    app = getApps().length === 0 ? initializeApp(config) : getApp();
  } else {
    console.error("❌ [Firebase Client] Missing critical configuration (apiKey or projectId).");
  }
} catch (error) {
  console.error("Firebase initialization failed:", error);
}

const auth = app ? getAuth(app) : null;
const db = app ? (databaseId && databaseId !== "(default)" ? getFirestore(app, databaseId) : getFirestore(app)) : null;
const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

// Connection validation
if (db) {
  const testConnection = async () => {
    try {
      await getDocFromServer(doc(db, "_test_", "connection"));
    } catch (error) {
      if (error instanceof Error && error.message.includes("client is offline")) {
        console.error("Firebase connection failed. Please check your configuration.");
      }
    }
  };
  testConnection();
}

export { 
  app, 
  auth, 
  db,
  googleProvider, 
  githubProvider, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  signInWithPopup
};
