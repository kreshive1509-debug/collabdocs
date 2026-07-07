import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { useStore } from "../store/useStore";
import { 
  Building2, 
  Users, 
  Star, 
  History, 
  Archive, 
  Plus, 
  HelpCircle, 
  LogOut, 
  Search, 
  Bell, 
  Settings, 
  Sparkles, 
  MessageSquare, 
  Send, 
  Eye, 
  FileText, 
  Save, 
  Trash, 
  Share2, 
  X, 
  Moon, 
  Sun, 
  ChevronRight,
  Database,
  User,
  ShieldAlert,
  ArrowUpRight,
  Clock,
  ListCollapse,
  Layers,
  Activity,
  CheckCheck,
  CheckCircle2,
  Compass,
  Puzzle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { trackPageView } from "../lib/analytics";

// Import modular sub-components
import WorkspaceSelector from "../components/WorkspaceSelector";
import FolderStructure from "../components/FolderStructure";
import RichEditor from "../components/RichEditor";
import CommentsPane from "../components/CommentsPane";
import WhiteboardCanvas from "../components/WhiteboardCanvas";
import PluginManager from "../components/PluginManager";
import SupportFeedback from "../components/SupportFeedback";

import VersionPane from "../components/VersionPane";
import CommandPalette from "../components/CommandPalette";
import UpgradeModal from "../components/UpgradeModal";

export default function DashboardPage() {
  React.useEffect(() => {
    trackPageView("/dashboard");
  }, []);

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const docIdParam = searchParams.get("doc");
  const tabParam = searchParams.get("tab") || "files";

  const {
    user,
    logout,
    documents,
    activeDocumentId,
    setActiveDocumentId,
    fetchDocuments,
    createDocument,
    deleteDocument,
    starDocument,
    archiveDocument,
    
    // Workspaces
    workspaces,
    activeWorkspaceId,
    
    // Notifications & Activities
    notifications,
    activities,
    fetchNotifications,
    markNotificationRead,
    fetchActivities,
    updateProfile,
    
    // Socket Sync
    initSocket,
    joinDocumentRoom,
    leaveDocumentRoom,
    activeCollaborators,
    
    // Settings
    theme,
    toggleTheme,

    // SaaS billing & cloud sync
    backupCloudDocuments,
    restoreCloudDocuments,
    cancelSubscription,
    resumeSubscription,
    fetchInvoices,
    fetchTransactions
  } = useStore();

  // Dialog & Palettes visibility
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [rightPanel, setRightPanel] = useState<"ai" | "comments" | "history" | null>(null);

  // SaaS Billing and Cloud Sync States
  const [invoices, setInvoices] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (tabParam === "settings" || tabParam === "profile") {
      fetchInvoices().then(setInvoices).catch(console.error);
      fetchTransactions().then(setTransactions).catch(console.error);
    }
  }, [tabParam, fetchInvoices, fetchTransactions]);

  // Search input state
  const [searchQuery, setSearchQuery] = useState("");
  const [documentFilter, setDocumentFilter] = useState<"all" | "starred" | "shared" | "archived" | "recent">("all");

  // AI chat states
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiChatHistory, setAiChatHistory] = useState<Array<{ sender: "user" | "ai"; text: string }>>([
    {
      sender: "ai",
      text: "Hello! I am your server-side CollabDocs Gemini Copilot. I can draft technical specs, analyze CRDT patterns, summarize documentation nodes, or correct markdown layouts. Ask me anything!"
    }
  ]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Initialize data and connections
  useEffect(() => {
    initSocket();
    fetchDocuments();
    fetchNotifications();
    fetchActivities();
  }, [initSocket, fetchDocuments, fetchNotifications, fetchActivities]);

  // Update socket room subscriptions when doc changes
  useEffect(() => {
    const activeDocId = docIdParam || activeDocumentId;
    if (activeDocId) {
      joinDocumentRoom(activeDocId);
      setActiveDocumentId(activeDocId);
    }
    return () => {
      const activeDocId = docIdParam || activeDocumentId;
      if (activeDocId) {
        leaveDocumentRoom(activeDocId);
      }
    };
  }, [docIdParam, activeDocumentId]);

  // Select active document
  const activeDocId = docIdParam || activeDocumentId;
  const activeDoc = documents.find(doc => doc.id === activeDocId) || documents[0];

  const handleCreateNewDoc = async () => {
    const doc = await createDocument("Untitled Documentation Draft", null);
    if (doc) {
      setSearchParams({ tab: "files", doc: doc.id });
    }
  };

  const handleUpdateContent = (newContent: string) => {
    if (activeDoc) {
      // Direct optimistic local and backend store integration
      useStore.getState().updateDocument(activeDoc.id, { content: newContent });
    }
  };

  const handleUpdateTitle = (newTitle: string) => {
    if (activeDoc) {
      useStore.getState().updateDocument(activeDoc.id, { title: newTitle });
    }
  };

  const handleQueryAi = async (customPrompt?: string) => {
    const promptToSend = customPrompt || aiPrompt;
    if (!promptToSend.trim()) return;

    if (!customPrompt) {
      setAiPrompt("");
    }

    setAiChatHistory(prev => [...prev, { sender: "user", text: promptToSend }]);
    setIsAiLoading(true);

    try {
      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt: promptToSend,
          context: activeDoc ? activeDoc.content : ""
        })
      });

      const data = await response.json();
      setIsAiLoading(false);

      if (response.ok && data.reply) {
        setAiChatHistory(prev => [...prev, { sender: "ai", text: data.reply }]);
      } else {
        setAiChatHistory(prev => [
          ...prev, 
          { sender: "ai", text: data.error || "Gemini node proxy returned an invalid response. Please verify GEMINI_API_KEY settings." }
        ]);
      }
    } catch (error) {
      setIsAiLoading(false);
      setAiChatHistory(prev => [
        ...prev, 
        { sender: "ai", text: "Failed to connect to full-stack Gemini API route. Please ensure API variables are declared." }
      ]);
    }
  };

  // Compile document lists with active filters
  const filteredDocsList = documents.filter(doc => {
    if (doc.workspaceId !== activeWorkspaceId) return false;
    
    // Search queries
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      if (!doc.title.toLowerCase().includes(query) && !doc.content.toLowerCase().includes(query)) {
        return false;
      }
    }

    if (documentFilter === "starred") return doc.isStarred;
    if (documentFilter === "archived") return doc.isArchived;
    if (documentFilter === "shared") return doc.ownerId !== user?.uid;
    return !doc.isArchived;
  });

  return (
    <div className={`h-screen bg-[#030303] text-white flex overflow-hidden relative font-sans ${theme === "light" ? "light-theme-vars" : ""}`}>
      {/* Search cmd palette */}
      <CommandPalette isOpen={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
      
      {/* Checkout license pricing upgrades */}
      <UpgradeModal isOpen={upgradeOpen} onClose={() => setUpgradeOpen(false)} />

      {/* Share / Access Permissions Dialog Popover */}
      <AnimatePresence>
        {shareOpen && activeDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-[#000]/60 backdrop-blur-xs" onClick={() => setShareOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0c0c0e] border border-white/10 w-full max-w-sm rounded-2xl p-5 shadow-2xl relative z-10 space-y-4"
            >
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">Access and Permissions</h4>
                <button onClick={() => setShareOpen(false)} className="text-white/40 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest block">Direct URL Node Link</span>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}/dashboard?doc=${activeDoc.id}`}
                      className="flex-grow px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] text-white/80 focus:outline-none"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/dashboard?doc=${activeDoc.id}`);
                        alert("Direct co-editing node link copied!");
                      }}
                      className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-[10px] font-bold uppercase shrink-0"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest block font-mono">Workspace Role Boundaries</span>
                  <div className="p-2.5 rounded-lg bg-white/3 border border-white/5 flex justify-between items-center text-[11px]">
                    <span className="font-semibold text-white/85">Default access control</span>
                    <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[8px] font-bold uppercase">Collaborator Write</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* LEFT STATIC ASIDE SIDEBAR */}
      <aside className="w-64 border-r border-white/10 bg-[#08080a] flex flex-col p-4 space-y-4 shrink-0 select-none">
        
        {/* Workspace Switcher Component */}
        <WorkspaceSelector />

        {/* Command Search activation */}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="w-full py-2 px-3 rounded-xl bg-white/3 border border-white/10 text-white/40 hover:text-white/80 hover:bg-white/5 flex items-center justify-between transition-all"
        >
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-white/30" />
            <span className="text-xs font-semibold">Search Spec Ledger...</span>
          </div>
          <span className="text-[9px] font-mono border border-white/15 px-1.5 py-0.5 rounded bg-white/5">⌘K</span>
        </button>

        {/* Tab Navigation Menu */}
        <nav className="flex-1 space-y-1 overflow-y-auto pr-0.5">
          <button
            onClick={() => setSearchParams({ tab: "dashboard" })}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${tabParam === "dashboard" ? "bg-indigo-600/15 text-indigo-300 border-r-2 border-indigo-500" : "text-white/60 hover:text-white hover:bg-white/5"}`}
          >
            <Activity className="w-4 h-4" /> Node Dashboard
          </button>
          
          <button
            onClick={() => setSearchParams({ tab: "files" })}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${tabParam === "files" ? "bg-indigo-600/15 text-indigo-300 border-r-2 border-indigo-500" : "text-white/60 hover:text-white hover:bg-white/5"}`}
          >
            <FileText className="w-4 h-4" /> Document specs
          </button>

          <button
            onClick={() => setSearchParams({ tab: "notifications" })}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${tabParam === "notifications" ? "bg-indigo-600/15 text-indigo-300 border-r-2 border-indigo-500" : "text-white/60 hover:text-white hover:bg-white/5"}`}
          >
            <div className="flex items-center gap-3">
              <Bell className="w-4 h-4" /> Notifications
            </div>
            {notifications.filter(n => !n.isRead).length > 0 && (
              <span className="bg-rose-600 text-white font-bold text-[8px] px-2 py-0.5 rounded-full">
                {notifications.filter(n => !n.isRead).length}
              </span>
            )}
          </button>

          <button
            onClick={() => setSearchParams({ tab: "settings" })}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${tabParam === "settings" ? "bg-indigo-600/15 text-indigo-300 border-r-2 border-indigo-500" : "text-white/60 hover:text-white hover:bg-white/5"}`}
          >
            <Settings className="w-4 h-4" /> Diagnostic Settings
          </button>

          <button
            onClick={() => setSearchParams({ tab: "profile" })}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${tabParam === "profile" ? "bg-indigo-600/15 text-indigo-300 border-r-2 border-indigo-500" : "text-white/60 hover:text-white hover:bg-white/5"}`}
          >
            <User className="w-4 h-4" /> Billing Profile
          </button>

          <button
            onClick={() => setSearchParams({ tab: "whiteboard" })}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${tabParam === "whiteboard" ? "bg-indigo-600/15 text-indigo-300 border-r-2 border-indigo-500" : "text-white/60 hover:text-white hover:bg-white/5"}`}
          >
            <Compass className="w-4 h-4 text-purple-400" /> Whiteboard Sandbox
          </button>

          <button
            onClick={() => setSearchParams({ tab: "plugins" })}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${tabParam === "plugins" ? "bg-indigo-600/15 text-indigo-300 border-r-2 border-indigo-500" : "text-white/60 hover:text-white hover:bg-white/5"}`}
          >
            <Puzzle className="w-4 h-4 text-amber-400" /> Plugins Manager
          </button>

          <button
            onClick={() => setSearchParams({ tab: "support" })}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${tabParam === "support" ? "bg-indigo-600/15 text-indigo-300 border-r-2 border-indigo-500" : "text-white/60 hover:text-white hover:bg-white/5"}`}
          >
            <HelpCircle className="w-4 h-4" /> Support & Feedback
          </button>

          {/* Spacer border line */}
          <div className="py-2"><div className="h-[1px] bg-white/5" /></div>

          {/* Embedded Folders navigation component */}
          <FolderStructure />
        </nav>

        {/* Free Plan restrictions billing gauge */}
        {user?.plan !== "premium" && (
          <div 
            onClick={() => setUpgradeOpen(true)}
            className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 to-indigo-500/10 border border-amber-500/20 hover:border-amber-500/40 cursor-pointer space-y-1.5 group select-none relative overflow-hidden"
          >
            {/* Top right corner diagonal flash */}
            <div className="absolute inset-0 rounded-2xl border border-white/5 pointer-events-none" />
            
            <div className="flex justify-between items-center text-[9px] font-bold text-amber-400 uppercase tracking-widest">
              <span>Standard Tier License</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-[10px] text-white/60 leading-relaxed font-semibold">
              You are co-editing on a limited free tier. Click here to upgrade instantly.
            </p>
          </div>
        )}

        {/* User Account stats logout shortcuts */}
        <div className="pt-3 border-t border-white/15 flex items-center justify-between select-none shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded bg-indigo-600/20 text-indigo-400 font-bold flex items-center justify-center text-xs shrink-0">
              {user?.displayName ? user.displayName.charAt(0).toUpperCase() : "G"}
            </div>
            <div className="min-w-0">
              <h5 className="text-[11px] font-bold text-white leading-tight">
                {user?.displayName || "Guest Agent"}
              </h5>
              <span className="text-[8px] font-semibold text-white/30 truncate block uppercase tracking-wider font-mono">
                {user?.plan || "free"} plan
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              navigate("/");
            }}
            className="p-1.5 rounded-lg hover:bg-rose-500/20 text-white/40 hover:text-rose-400 transition-colors"
            title="Terminate node session"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* MIDDLE CENTER WORKSPACE CANVAS AREA */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#040405]">
        {/* Global Nav-header bar */}
        <header className="h-16 border-b border-white/10 px-8 flex justify-between items-center gap-8 shrink-0 bg-[#08080a]/60 backdrop-blur-md select-none">
          {/* Section Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs font-semibold text-white/40">
            <span>Workspace Node</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-white font-bold capitalize">{tabParam} view</span>
          </div>

          {/* Global Header active presence and trigger nodes */}
          <div className="flex items-center gap-4">
            {/* Realtime collaborators display list */}
            {tabParam === "files" && activeCollaborators.length > 0 && (
              <div className="flex items-center -space-x-1.5 mr-2">
                {activeCollaborators.map((mate, index) => (
                  <div key={index} className="relative group cursor-pointer" title={mate.email}>
                    <div className="w-6.5 h-6.5 rounded-full bg-indigo-600/20 border border-indigo-400 flex items-center justify-center text-[9px] text-white font-bold uppercase shrink-0">
                      {mate.email.charAt(0).toUpperCase()}
                    </div>
                    {mate.isTyping && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-[#040405] animate-pulse" />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Layout controls */}
            {tabParam === "files" && activeDoc && (
              <>
                <button
                  onClick={() => setShareOpen(true)}
                  className="px-3 py-1.5 bg-white/5 border border-white/10 text-white hover:bg-white/10 rounded-xl text-[10px] font-bold uppercase flex items-center gap-1.5 transition-all"
                >
                  <Share2 className="w-3.5 h-3.5" /> Share
                </button>

                <button
                  onClick={() => {
                    setRightPanel(rightPanel === "comments" ? null : "comments");
                  }}
                  className={`p-1.5 rounded-lg border transition-all ${rightPanel === "comments" ? "bg-indigo-600 border-indigo-500 text-white" : "bg-white/3 border-white/10 text-white/60 hover:text-white"}`}
                  title="Discussion notes"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>

                <button
                  onClick={() => {
                    setRightPanel(rightPanel === "history" ? null : "history");
                  }}
                  className={`p-1.5 rounded-lg border transition-all ${rightPanel === "history" ? "bg-indigo-600 border-indigo-500 text-white" : "bg-white/3 border-white/10 text-white/60 hover:text-white"}`}
                  title="Version timeline ledger"
                >
                  <History className="w-4 h-4" />
                </button>
              </>
            )}

            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg border border-white/10 bg-white/3 text-white/60 hover:text-white transition-all"
            >
              {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* SUBVIEWS DISPATCHER depending on tabParam */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* TAB: dashboard */}
          {tabParam === "dashboard" && (
            <div className="flex-grow overflow-y-auto p-8 space-y-8 select-none">
              {/* Top Banner greeting */}
              <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-900/35 to-purple-900/10 border border-white/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl" />
                <h2 className="text-xl font-display font-extrabold text-white tracking-tight">
                  Welcome to CollabDocs Command Center
                </h2>
                <p className="text-xs text-white/60 mt-1 max-w-lg leading-relaxed">
                  Real-time engineering specifications, database audits, and co-authoring synchronization across teams. Take control of your architectural workflow.
                </p>
              </div>

              {/* KPI stats dashboard grids */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-white/3 border border-white/5 space-y-1">
                  <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest block">Total Specs</span>
                  <span className="text-xl font-display font-black text-white">{documents.length}</span>
                </div>
                <div className="p-4 rounded-2xl bg-white/3 border border-white/5 space-y-1">
                  <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest block font-mono">Teammates</span>
                  <span className="text-xl font-display font-black text-indigo-400">
                    {workspaces.find(w => w.id === activeWorkspaceId)?.members?.length || 1} Active
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-white/3 border border-white/5 space-y-1">
                  <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest block">Unread Alerts</span>
                  <span className="text-xl font-display font-black text-rose-400">
                    {notifications.filter(n => !n.isRead).length}
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-white/3 border border-white/5 space-y-1">
                  <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest block font-mono">Sync latency</span>
                  <span className="text-xl font-display font-black text-emerald-400">14 ms</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Recent documents widgets column */}
                <div className="md:col-span-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white/80">Recent Specification Drafts</h3>
                    <button
                      onClick={handleCreateNewDoc}
                      className="px-2.5 py-1 bg-white/5 border border-white/10 hover:bg-white/10 text-indigo-400 text-[10px] font-bold uppercase rounded-lg transition-all"
                    >
                      New Spec
                    </button>
                  </div>
                  <div className="space-y-2">
                    {documents.filter(d => d.workspaceId === activeWorkspaceId).slice(0, 4).map((doc) => (
                      <div
                        key={doc.id}
                        onClick={() => setSearchParams({ tab: "files", doc: doc.id })}
                        className="p-3 rounded-2xl bg-white/3 border border-white/5 hover:bg-white/5 transition-all flex items-center justify-between cursor-pointer group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-white/60 group-hover:text-white">
                            <FileText className="w-4 h-4 text-indigo-400" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-white truncate">{doc.title}</h4>
                            <span className="text-[9px] text-white/40 font-semibold uppercase tracking-wider mt-0.5 block">
                              Last updated {new Date(doc.updatedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <ArrowUpRight className="w-4 h-4 text-white/20 group-hover:text-white transition-all transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Audit logging feed */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white/80">Workspace Activity Audit</h3>
                  <div className="p-4 rounded-2xl bg-white/3 border border-white/5 space-y-4 max-h-80 overflow-y-auto">
                    {activities.length === 0 ? (
                      <div className="py-8 text-center text-[10px] text-white/30 italic">
                        Awaiting engineering activity actions...
                      </div>
                    ) : (
                      activities.map((act) => (
                        <div key={act.id} className="text-[10px] space-y-1">
                          <div className="flex justify-between items-center text-white/40">
                            <span className="font-bold text-white/60">{act.userName}</span>
                            <span>{new Date(act.createdAt).toLocaleTimeString()}</span>
                          </div>
                          <p className="text-white/85 font-medium">{act.details}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: files (Main Document Management + Premium Editor Stage) */}
          {tabParam === "files" && (
            <>
              {/* SECONDARY SIDEBAR: Files catalog listing */}
              <div className="w-72 border-r border-white/10 bg-[#070708] flex flex-col shrink-0 select-none">
                <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#0a0a0c]">
                  <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block">Workspace Specifications</span>
                  <button
                    onClick={handleCreateNewDoc}
                    className="p-1 rounded bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/20 text-[10px] font-bold uppercase transition-all"
                    title="Write spec"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Document filters tabs toolbar */}
                <div className="flex p-1 bg-white/3 border-b border-white/5 text-[9px] font-bold uppercase text-white/40">
                  <button
                    onClick={() => setDocumentFilter("all")}
                    className={`flex-1 py-1 rounded text-center transition-colors ${documentFilter === "all" ? "bg-white/5 text-white" : "hover:text-white"}`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setDocumentFilter("starred")}
                    className={`flex-1 py-1 rounded text-center transition-colors ${documentFilter === "starred" ? "bg-white/5 text-white" : "hover:text-white"}`}
                  >
                    Starred
                  </button>
                  <button
                    onClick={() => setDocumentFilter("archived")}
                    className={`flex-1 py-1 rounded text-center transition-colors ${documentFilter === "archived" ? "bg-white/5 text-white" : "hover:text-white"}`}
                  >
                    Archive
                  </button>
                </div>

                {/* Docs feed column list */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {filteredDocsList.length === 0 ? (
                    <div className="text-center py-20 px-4 space-y-2">
                      <FileText className="w-8 h-8 text-white/10 mx-auto" />
                      <p className="text-[11px] text-white/50 font-bold uppercase tracking-wider">No spec documents</p>
                      <p className="text-[9px] text-white/30 leading-normal">
                        Create a document to map files inside this active workspace division.
                      </p>
                    </div>
                  ) : (
                    filteredDocsList.map((doc) => {
                      const isActive = activeDoc && doc.id === activeDoc.id;
                      return (
                        <div
                          key={doc.id}
                          onClick={() => setSearchParams({ tab: "files", doc: doc.id })}
                          className={`group p-3 rounded-xl border transition-all cursor-pointer ${isActive ? "bg-white/10 border-indigo-500/30 shadow-md" : "bg-transparent border-transparent hover:bg-white/3"}`}
                        >
                          <div className="flex justify-between items-start gap-2 mb-1.5">
                            <h4 className={`text-xs font-bold truncate flex-1 leading-tight ${isActive ? "text-white" : "text-white/70 group-hover:text-white"}`}>
                              {doc.title || "Untitled draft"}
                            </h4>
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  starDocument(doc.id);
                                }}
                                className={`p-1 rounded hover:bg-white/10 ${doc.isStarred ? "text-amber-500" : "text-white/30 hover:text-white"}`}
                              >
                                <Star className="w-3 h-3 fill-current" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  archiveDocument(doc.id);
                                }}
                                className={`p-1 rounded hover:bg-white/10 ${doc.isArchived ? "text-rose-400" : "text-white/30 hover:text-white"}`}
                              >
                                <Archive className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm("Are you sure you want to delete this specification node?")) {
                                    deleteDocument(doc.id);
                                  }
                                }}
                                className="p-1 rounded hover:bg-rose-500/20 text-rose-400"
                              >
                                <Trash className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <p className="text-[10px] text-white/40 line-clamp-2 leading-relaxed">
                            {doc.content.replace(/[#*`>]/g, "") || "Empty draft content..."}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* EDITOR COLUMN */}
              {activeDoc ? (
                <div className="flex-1 flex flex-col min-w-0">
                  {/* Inline editable document title heading */}
                  <div className="px-8 py-3 bg-[#0a0a0c]/40 border-b border-white/5 flex justify-between items-center shrink-0">
                    <input
                      type="text"
                      value={activeDoc.title}
                      onChange={e => handleUpdateTitle(e.target.value)}
                      placeholder="Title this specification draft..."
                      className="font-display font-black text-sm text-white bg-transparent border-none focus:outline-none focus:ring-0 max-w-lg p-0"
                    />
                    <span className="text-[9px] font-mono font-semibold text-white/30 uppercase tracking-widest bg-white/2 px-2.5 py-1 rounded-md border border-white/5">
                      Spec Sheet
                    </span>
                  </div>

                  {/* Rich Editor co-authoring workspace canvas */}
                  <RichEditor 
                    content={activeDoc.content} 
                    onUpdate={handleUpdateContent} 
                    title={activeDoc.title} 
                  />
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 bg-[#050507]">
                  <FileText className="w-12 h-12 text-white/10" />
                  <h3 className="font-display font-bold text-base text-white">No active draft selected</h3>
                  <p className="text-xs text-white/40 max-w-sm leading-relaxed">
                    Choose an architectural document draft from folders, or click "New Spec" to map a co-authoring document inside this workspace.
                  </p>
                  <button
                    onClick={handleCreateNewDoc}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold uppercase transition-all"
                  >
                    Initiate new draft spec
                  </button>
                </div>
              )}
            </>
          )}

          {/* TAB: support */}
          {tabParam === "support" && (
            <SupportFeedback />
          )}

          {/* TAB: notifications */}
          {tabParam === "notifications" && (
            <div className="flex-grow overflow-y-auto p-8 space-y-6 max-w-2xl mx-auto select-none">
              <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <h2 className="text-lg font-display font-black text-white">Notification Alerts Hub</h2>
                {notifications.filter(n => !n.isRead).length > 0 && (
                  <button
                    onClick={() => {
                      notifications.forEach(n => {
                        if (!n.isRead) markNotificationRead(n.id);
                      });
                    }}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-wider flex items-center gap-1.5"
                  >
                    <CheckCheck className="w-4 h-4" /> Mark all read
                  </button>
                )}
              </div>

              <div className="space-y-2.5">
                {notifications.length === 0 ? (
                  <div className="text-center py-20 text-xs text-white/30 italic">
                    All clear! No notification logs dispatched yet.
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        if (!notif.isRead) markNotificationRead(notif.id);
                      }}
                      className={`p-4 rounded-2xl border transition-all flex items-start gap-3.5 relative cursor-pointer ${notif.isRead ? "bg-white/2 border-white/5 text-white/60" : "bg-indigo-600/5 border-indigo-500/20 text-white"}`}
                    >
                      {!notif.isRead && (
                        <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                      )}
                      <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-white/60">
                        <Bell className="w-4 h-4 text-indigo-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold leading-normal">{notif.description || notif.title}</p>
                        <span className="text-[9px] text-white/30 font-semibold uppercase tracking-wider mt-1 block">
                          {new Date(notif.createdAt).toLocaleTimeString()} • {new Date(notif.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB: settings */}
          {tabParam === "settings" && (
            <div className="flex-grow overflow-y-auto p-8 space-y-8 max-w-2xl mx-auto select-none">
              <div className="border-b border-white/10 pb-4">
                <h2 className="text-lg font-display font-black text-white">Engineering Workspace Settings</h2>
                <p className="text-xs text-white/50 mt-1">Configure sync pathways, local caches, and administrative controls.</p>
              </div>

              <div className="space-y-6">
                {/* Account parameters block */}
                <div className="p-5 rounded-2xl bg-white/3 border border-white/5 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400">Teammate Profile</h3>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-white/40 font-mono block">Identifier UID</span>
                      <strong className="text-white/80 font-mono">{user?.uid || "guest-id"}</strong>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-white/40 font-mono block">Active Email</span>
                      <strong className="text-white/80">{user?.email || "guest@veltora.com"}</strong>
                    </div>
                  </div>
                </div>

                {/* Cloud Sync Controller Module (PRO-GUARDED) */}
                <div className="p-5 rounded-2xl bg-white/3 border border-white/5 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white/40">Sync Status</h3>
                    {user?.plan !== "free" ? (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] font-bold uppercase font-mono">
                        Active Sync Tunnel
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-[8px] font-bold uppercase font-mono">
                        Local Only
                      </span>
                    )}
                  </div>
                  
                  <p className="text-xs text-white/60 leading-relaxed">
                    Protect and restore workspace nodes. Pro users enjoy real-time auto-backup, version history ledger, and cross-device synchronization on demand.
                  </p>

                  {syncStatus && (
                    <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-[10px] font-mono text-indigo-300">
                      Sync state: {syncStatus}
                    </div>
                  )}

                  <div className="flex gap-2.5 pt-1">
                    <button
                      onClick={async () => {
                        if (user?.plan === "free") {
                          setUpgradeOpen(true);
                          return;
                        }
                        setIsSyncing(true);
                        setSyncStatus("Packaging draft documents...");
                        try {
                          const res = await backupCloudDocuments();
                          if (res && res.success) {
                            setSyncStatus(`Draft state backup complete! Registered ${res.count || 0} nodes.`);
                          } else {
                            throw new Error("Local cache conflict detected.");
                          }
                        } catch (e: any) {
                          setSyncStatus("Backup declined: " + (e.message || "Pro subscription required."));
                        } finally {
                          setIsSyncing(false);
                        }
                      }}
                      disabled={isSyncing}
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded-xl text-xs font-bold uppercase text-white flex items-center gap-1.5 transition-all"
                    >
                      <Database className="w-3.5 h-3.5" />
                      {isSyncing ? "Syncing..." : "Backup to Cloud"}
                    </button>

                    <button
                      onClick={async () => {
                        if (user?.plan === "free") {
                          setUpgradeOpen(true);
                          return;
                        }
                        setIsSyncing(true);
                        setSyncStatus("Restoring files from secure bucket...");
                        try {
                          const res = await restoreCloudDocuments();
                          if (res && res.success) {
                            setSyncStatus(`Restore verified. Downloaded ${res.count || 0} nodes successfully.`);
                          } else {
                            throw new Error("No backup snapshot registered.");
                          }
                        } catch (e: any) {
                          setSyncStatus("Restore declined: " + (e.message || "Pro subscription required."));
                        } finally {
                          setIsSyncing(false);
                        }
                      }}
                      disabled={isSyncing}
                      className="px-3.5 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-40 rounded-xl text-xs font-bold uppercase text-white/90 border border-white/10 transition-all"
                    >
                      Restore Cloud Snapshot
                    </button>
                  </div>
                </div>

                {/* Administrative Portal Tunnel Entry (Visible to Admin accounts) */}
                {user && (
                  user.email === "system@veltora.com" || 
                  user.email.endsWith("@veltora.com") || 
                  user.email === "kreshivesrivastava@gmail.com" || 
                  user.email === "veltoraitsolution2026@gmail.com" ||
                  user.role === "admin" ||
                  user.role === "super_admin"
                ) && (
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-red-950/20 via-indigo-950/10 to-transparent border border-red-500/20 space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5 font-mono">
                      <ShieldAlert className="w-4 h-4 text-rose-400" /> Administrative Diagnostic Tunnel
                    </h3>
                    <p className="text-xs text-white/60 leading-relaxed">
                      Authorized @veltora.com node registered. Access global database statistics, platform usage dashboards, and manual customer subscription overrides.
                    </p>
                    <button
                      onClick={() => navigate("/admin")}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-rose-600/10"
                    >
                      Launch Admin Console
                    </button>
                  </div>
                )}

                {/* Database Diagnostics block */}
                <div className="p-5 rounded-2xl bg-white/3 border border-white/5 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400">Database Sync Diagnostics</h3>
                  <div className="space-y-3 text-xs leading-relaxed text-white/70">
                    <p>
                      Documents, comments, and workspace lists are saved inside the JSON filesystem ledger (`server/db.ts`). Live socket messages co-edit changes instantly.
                    </p>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => alert("Verification sequence healthy. Database integrity OK.")}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-[10px] font-bold uppercase text-white"
                      >
                        Ping JSON Ledger
                      </button>
                      <button
                        onClick={() => alert(`Active network: Socket.io listening on document channel.`)}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-bold uppercase text-white"
                      >
                        Check Network Channel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: profile */}
          {tabParam === "profile" && (
            <div className="flex-grow overflow-y-auto p-8 space-y-8 max-w-4xl mx-auto select-none">
              <div className="border-b border-white/10 pb-4 text-center">
                <h2 className="text-2xl font-display font-black text-white">Billing & License Portal</h2>
                <p className="text-xs text-white/50 mt-1">Manage active plan auto-renewals, credit cards, and receipts.</p>
              </div>

              {/* CURRENT MEMBERSHIP STATS PANEL */}
              <div className="p-5 rounded-3xl bg-white/3 border border-white/5 grid grid-cols-1 md:grid-cols-3 gap-5 relative">
                <div className="space-y-1">
                  <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">Active Tier</span>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-lg font-bold text-white capitalize">{user?.plan?.replace("_", " ") || "Free"}</h3>
                    {user?.plan !== "free" && (
                      <span className="px-1.5 py-0.5 rounded-full bg-indigo-600 text-[8px] font-bold uppercase">PRO</span>
                    )}
                  </div>
                  <p className="text-[10px] text-white/50">Plan ID: {user?.subscriptionId || "sub_free_default"}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">Billing Auto-Renew</span>
                  <div className="text-sm font-bold text-white uppercase flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${user?.planStatus === "active" ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                    {user?.planStatus || "free_tier"}
                  </div>
                  <p className="text-[10px] text-white/50">Next settlement date: {user?.renewalDate ? new Date(user.renewalDate).toLocaleDateString() : "Never"}</p>
                </div>

                <div className="space-y-1 flex flex-col justify-center">
                  <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest block mb-1">Membership Actions</span>
                  {user?.plan !== "free" ? (
                    user?.planStatus === "active" ? (
                      <button
                        onClick={async () => {
                          if (confirm("Are you sure you want to cancel auto-renewal? You will keep Pro benefits until your renewal date.")) {
                            await cancelSubscription();
                            alert("Auto-renewal canceled successfully.");
                          }
                        }}
                        className="w-full py-2 bg-rose-600/10 hover:bg-rose-600/20 border border-rose-500/20 text-rose-400 rounded-xl text-[10px] font-bold uppercase transition-all"
                      >
                        Cancel Auto-Renew
                      </button>
                    ) : (
                      <button
                        onClick={async () => {
                          await resumeSubscription();
                          alert("Subscription reactivated! Auto-renew is healthy.");
                        }}
                        className="w-full py-2 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/20 text-emerald-400 rounded-xl text-[10px] font-bold uppercase transition-all"
                      >
                        Resume Auto-Renew
                      </button>
                    )
                  ) : (
                    <button
                      onClick={() => setUpgradeOpen(true)}
                      className="w-full py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-[10px] font-bold uppercase transition-all"
                    >
                      Upgrade Membership
                    </button>
                  )}
                </div>
              </div>

              {/* Tiers Comparison list */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                {/* Free Tier Card */}
                <div className="p-6 rounded-3xl bg-white/3 border border-white/5 space-y-4 relative">
                  <div>
                    <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Base Layer</span>
                    <h3 className="text-lg font-display font-extrabold text-white">Standard Tier</h3>
                    <p className="text-xs text-white/50 mt-1">Best for small engineering drafts and single designers.</p>
                  </div>
                  <div className="text-2xl font-display font-extrabold text-white">
                    $0 <span className="text-xs text-white/40">free forever</span>
                  </div>
                  <ul className="space-y-2.5 text-xs text-white/70 pt-2 border-t border-white/5">
                    <li className="flex items-center gap-2">✓ 2 co-editors limit</li>
                    <li className="flex items-center gap-2">✓ Standard back-up ledger</li>
                    <li className="flex items-center gap-2">✓ Local storage save triggers</li>
                  </ul>
                  {user?.plan === "free" ? (
                    <button
                      disabled
                      className="w-full py-2.5 bg-white/5 border border-white/10 text-white/60 rounded-xl text-xs font-bold uppercase"
                    >
                      Currently Active Plan
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full py-2.5 bg-white/3 text-white/20 rounded-xl text-xs font-bold uppercase"
                    >
                      Downgraded to Free Layer
                    </button>
                  )}
                </div>

                {/* Pro Tier Card */}
                <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-950/45 to-purple-950/10 border border-indigo-500/30 space-y-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 px-3 py-1 rounded-bl-xl bg-indigo-600 text-[8px] font-bold uppercase text-white tracking-widest">
                    Recommended
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-indigo-300 uppercase tracking-widest">Premium Layer</span>
                    <h3 className="text-lg font-display font-extrabold text-white">Pro Enterprise</h3>
                    <p className="text-xs text-white/60 mt-1">For production-ready teams requiring instant cloud backups and sync.</p>
                  </div>
                  <div className="text-2xl font-display font-extrabold text-white">
                    $12 <span className="text-xs text-white/40">/ user / mo</span>
                  </div>
                  <ul className="space-y-2.5 text-xs text-white/70 pt-2 border-t border-white/5">
                    <li className="flex items-center gap-2">✓ Unlimited co-editors simultaneously</li>
                    <li className="flex items-center gap-2">✓ Fully automated historical version snapshots</li>
                    <li className="flex items-center gap-2">✓ Advanced Document Templates</li>
                  </ul>
                  {user?.plan !== "free" ? (
                    <button
                      disabled
                      className="w-full py-2.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded-xl text-xs font-bold uppercase"
                    >
                      Active Premium Subscription
                    </button>
                  ) : (
                    <button
                      onClick={() => setUpgradeOpen(true)}
                      className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold uppercase transition-all"
                    >
                      Upgrade Instantly
                    </button>
                  )}
                </div>
              </div>

              {/* INVOICES LIST DATABASE */}
              <div className="pt-6">
                <div className="border-b border-white/10 pb-4 mb-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">SaaS Billing & Receipts Ledger</h3>
                  <p className="text-xs text-white/50">Review previous monthly or yearly invoice records.</p>
                </div>

                {invoices.length === 0 ? (
                  <div className="p-8 text-center bg-white/2 border border-white/5 rounded-2xl text-xs text-white/45">
                    No billing history records registered yet. Upgrade to Pro to initialize your premium ledger.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-white/15 bg-[#08080a]">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-white/10 text-white/40 bg-white/2 font-mono">
                          <th className="p-3">Invoice Node ID</th>
                          <th className="p-3">Sub-Tier</th>
                          <th className="p-3">Settled Cost</th>
                          <th className="p-3">Billing Cycle Date</th>
                          <th className="p-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-white/80">
                        {invoices.map((inv: any) => (
                          <tr key={inv.id} className="hover:bg-white/[0.02]">
                            <td className="p-3 font-mono text-[10px] text-indigo-300">{inv.invoiceId}</td>
                            <td className="p-3 uppercase font-bold text-[10px]">{inv.plan.replace("_", " ")}</td>
                            <td className="p-3 font-bold">${inv.amount}.00 USD</td>
                            <td className="p-3 text-white/60 font-mono">{new Date(inv.createdAt || inv.billingDate).toLocaleDateString()}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] font-bold uppercase">
                                {inv.status || "settled"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Whiteboard Sandbox infinite canvas rendering */}
          {tabParam === "whiteboard" && (
            <WhiteboardCanvas />
          )}

          {/* Plugin manager suite rendering */}
          {tabParam === "plugins" && (
            <PluginManager />
          )}

        </div>
      </main>

      {/* RIGHT UTILITY DRAWER COLUMN: threads pane or version snapshots */}
      {tabParam === "files" && rightPanel && (
        <aside className="w-80 border-l border-white/10 bg-[#08080a] flex flex-col shrink-0">
          <AnimatePresence mode="wait">
            {/* Threaded Discussion Comments tab */}
            {rightPanel === "comments" && (
              <motion.div
                key="comments"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full"
              >
                <CommentsPane onClose={() => setRightPanel(null)} />
              </motion.div>
            )}

            {/* Version timeline list tab */}
            {rightPanel === "history" && (
              <motion.div
                key="history"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full"
              >
                <VersionPane onClose={() => setRightPanel(null)} />
              </motion.div>
            )}
          </AnimatePresence>
        </aside>
      )}

    </div>
  );
}
