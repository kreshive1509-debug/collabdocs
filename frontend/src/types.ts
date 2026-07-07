export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  firstName?: string | null;
  lastName?: string | null;
  bio?: string | null;
  organization?: string | null;
  timezone?: string | null;
  language?: string | null;
  provider?: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  role?: string;
  plan?: "free" | "pro_monthly" | "pro_yearly" | "premium"; // Backward compatible and SaaS support
  planStatus?: "active" | "canceled" | "expired" | "pending";
  subscriptionId?: string | null;
  renewalDate?: string | null;
  billingStatus?: "paid" | "unpaid" | "overdue";
  createdAt?: string;
}

export interface Subscription {
  id: string;
  userId: string;
  plan: "pro_monthly" | "pro_yearly";
  status: "active" | "canceled" | "expired" | "pending";
  razorpaySubscriptionId: string;
  renewalDate: string;
  billingStatus: "paid" | "unpaid" | "overdue";
  createdAt: string;
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  userId: string;
  userName: string;
  userEmail: string;
  plan: "pro_monthly" | "pro_yearly";
  amount: number;
  status: "paid" | "unpaid";
  dueDate: string;
  paidAt: string | null;
  createdAt: string;
}

export interface Payment {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: "success" | "failed" | "pending";
  razorpayOrderId: string;
  razorpayPaymentId: string | null;
  razorpaySignature: string | null;
  plan: "pro_monthly" | "pro_yearly";
  createdAt: string;
}

export interface Document {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  collaborators: string[]; // List of user emails or IDs
  isStarred?: boolean;
  isArchived?: boolean;
  folderId?: string | null;
  workspaceId?: string;
}

export interface Comment {
  id: string;
  docId: string;
  author: string;
  authorPhoto?: string;
  text: string;
  parentId?: string | null;
  createdAt: string;
}

export interface VersionHistory {
  id: string;
  docId: string;
  title: string;
  content: string;
  updatedBy: string;
  updatedAt: string;
}

export type Theme = "light" | "dark";
