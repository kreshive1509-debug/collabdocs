import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, default: null },
  emailVerified: { type: Boolean, default: false },
  displayName: { type: String, default: "User" },
  firstName: { type: String, default: "" },
  lastName: { type: String, default: "" },
  bio: { type: String, default: "" },
  organization: { type: String, default: "" },
  timezone: { type: String, default: "" },
  language: { type: String, default: "" },
  provider: { type: String, default: "password" },
  photoURL: { type: String, default: "" },
  plan: { type: String, enum: ["free", "pro_monthly", "pro_yearly", "premium"], default: "free" },
  planStatus: { type: String, enum: ["active", "canceled", "expired", "pending"], default: "active" },
  subscriptionId: { type: String, default: null },
  renewalDate: { type: String, default: null },
  billingStatus: { type: String, enum: ["paid", "unpaid", "overdue"], default: "unpaid" },
  role: { type: String, default: "user" },
  createdAt: { type: String, default: () => new Date().toISOString() }
}, { timestamps: true });

const WorkspaceSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  avatar: { type: String },
  ownerId: { type: String, required: true },
  memberUserIds: [String],
  members: [{
    userId: String,
    email: String,
    role: { type: String, enum: ["owner", "editor", "viewer"] }
  }]
}, { timestamps: true });

const FolderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  workspaceId: { type: String, required: true },
  parentId: { type: String, default: null }
}, { timestamps: true });

const DocumentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, default: "Untitled" },
  content: { type: String, default: "" },
  workspaceId: { type: String, required: true },
  folderId: { type: String, default: null },
  isStarred: { type: Boolean, default: false },
  isArchived: { type: Boolean, default: false },
  ownerId: { type: String, required: true },
  collaborators: [String],
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() }
}, { timestamps: true });

const CommentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  docId: { type: String, required: true },
  author: { type: String },
  authorPhoto: { type: String },
  text: { type: String, required: true },
  parentId: { type: String, default: null },
  isResolved: { type: Boolean, default: false },
  createdAt: { type: String, default: () => new Date().toISOString() }
}, { timestamps: true });

const ActivitySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  docId: { type: String, required: true },
  workspaceId: { type: String, required: true },
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  type: { type: String, required: true },
  details: { type: String, required: true },
  createdAt: { type: String, default: () => new Date().toISOString() }
}, { timestamps: true });

const SubscriptionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  plan: { type: String, enum: ["pro_monthly", "pro_yearly"], required: true },
  status: { type: String, enum: ["active", "canceled", "expired", "pending"], default: "active" },
  razorpaySubscriptionId: { type: String },
  renewalDate: { type: String, required: true },
  billingStatus: { type: String, enum: ["paid", "unpaid", "overdue"], default: "unpaid" },
  createdAt: { type: String, default: () => new Date().toISOString() }
}, { timestamps: true });

const PaymentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: "USD" },
  status: { type: String, enum: ["success", "failed", "pending"], default: "pending" },
  razorpayOrderId: { type: String, required: true },
  razorpayPaymentId: { type: String, default: null },
  razorpaySignature: { type: String, default: null },
  plan: { type: String, required: true },
  createdAt: { type: String, default: () => new Date().toISOString() }
}, { timestamps: true });

const InvoiceSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  invoiceNo: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  userEmail: { type: String, required: true },
  plan: { type: String, required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ["paid", "unpaid"], default: "unpaid" },
  dueDate: { type: String, required: true },
  paidAt: { type: String, default: null },
  createdAt: { type: String, default: () => new Date().toISOString() }
}, { timestamps: true });

const TransactionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  type: { type: String, required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ["success", "failed"], required: true },
  details: { type: String },
  createdAt: { type: String, default: () => new Date().toISOString() }
}, { timestamps: true });

export const User = mongoose.model("User", UserSchema);
export const Workspace = mongoose.model("Workspace", WorkspaceSchema);
export const Folder = mongoose.model("Folder", FolderSchema);
export const Document = mongoose.model("Document", DocumentSchema);
export const Comment = mongoose.model("Comment", CommentSchema);
export const Activity = mongoose.model("Activity", ActivitySchema);
export const Subscription = mongoose.model("Subscription", SubscriptionSchema);
export const Payment = mongoose.model("Payment", PaymentSchema);
export const Invoice = mongoose.model("Invoice", InvoiceSchema);
export const Transaction = mongoose.model("Transaction", TransactionSchema);
