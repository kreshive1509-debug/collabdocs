import React, { useState } from "react";
import { useStore } from "../store/useStore";
import { 
  Building2, 
  ChevronDown, 
  Plus, 
  Settings, 
  Trash2, 
  Users, 
  UserPlus, 
  Edit, 
  Check, 
  X,
  Mail
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function WorkspaceSelector() {
  const {
    workspaces,
    activeWorkspaceId,
    setActiveWorkspaceId,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    inviteCollaborator
  } = useStore();

  const [isOpen, setIsOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [showManageMembers, setShowManageMembers] = useState(false);

  const [newWsName, setNewWsName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteMethod, setInviteMethod] = useState<"email" | "link">("email");
  const [generatedLink, setGeneratedLink] = useState("");
  const [inviteRole, setInviteRole] = useState<"owner" | "admin" | "editor" | "viewer">("editor");
  const [editWsNameId, setEditWsNameId] = useState<string | null>(null);
  const [editWsNameText, setEditWsNameText] = useState("");

  const activeWs = workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0];

  const handleCreateWsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) return;

    await createWorkspace(newWsName);
    setNewWsName("");
    setShowCreateForm(false);
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteMethod === "email") {
      if (!inviteEmail.trim() || !activeWorkspaceId) return;
      await inviteCollaborator(inviteEmail, inviteRole);
      setInviteEmail("");
    } else {
      setGeneratedLink(`https://collabdocs.veltora.com/join/${activeWorkspaceId}`);
    }
  };

  const handleRenameWs = async (id: string) => {
    if (!editWsNameText.trim()) return;
    await updateWorkspace(editWsNameText, activeWs?.avatar || "💼");
    setEditWsNameId(null);
  };

  const handleDeleteWs = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (workspaces.length <= 1) {
      alert("At least one workspace division must remain active.");
      return;
    }
    if (confirm("Are you sure you want to delete this workspace and all associated folders and specs?")) {
      await deleteWorkspace(id);
    }
  };

  return (
    <div className="relative select-none">
      {/* Selector Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-between transition-all"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <div className="text-left min-w-0">
            <h4 className="text-xs font-bold text-white truncate leading-tight">
              {activeWs?.name || "Initializing..."}
            </h4>
            <span className="text-[9px] text-white/40 font-semibold tracking-wider uppercase">
              {activeWs?.members?.length || 1} node members
            </span>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-white/40 transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Switcher Drop Sheet */}
      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute left-0 right-0 mt-2 bg-[#0c0c0e] border border-white/10 rounded-2xl shadow-2xl p-2 z-40 space-y-1 overflow-hidden"
            >
              <div className="px-2.5 py-1.5 text-[8px] font-bold text-white/30 uppercase tracking-widest border-b border-white/5 mb-1">
                Organizations & Nodes
              </div>

              {/* Workspaces List */}
              <div className="max-h-48 overflow-y-auto space-y-1">
                {workspaces.map((ws) => (
                  <div
                    key={ws.id}
                    onClick={() => {
                      setActiveWorkspaceId(ws.id);
                      setIsOpen(false);
                    }}
                    className={`p-2 rounded-xl transition-all flex items-center justify-between group cursor-pointer ${ws.id === activeWorkspaceId ? "bg-white/5 border border-white/5" : "hover:bg-white/3 border border-transparent"}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-6 h-6 rounded bg-white/10 flex items-center justify-center text-xs font-bold text-white/80">
                        {ws.name.charAt(0).toUpperCase()}
                      </div>
                      {editWsNameId === ws.id ? (
                        <input
                          type="text"
                          value={editWsNameText}
                          onChange={e => setEditWsNameText(e.target.value)}
                          onClick={e => e.stopPropagation()}
                          onKeyDown={e => {
                            if (e.key === "Enter") handleRenameWs(ws.id);
                          }}
                          className="px-1.5 py-0.5 bg-white/5 border border-white/20 rounded text-[11px] text-white"
                        />
                      ) : (
                        <span className="text-xs font-bold text-white/95 truncate">{ws.name}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {editWsNameId === ws.id ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRenameWs(ws.id);
                          }}
                          className="p-1 rounded bg-indigo-600 text-white"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditWsNameId(ws.id);
                            setEditWsNameText(ws.name);
                          }}
                          className="p-1 rounded hover:bg-white/10 text-white/60 hover:text-white"
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        onClick={(e) => handleDeleteWs(ws.id, e)}
                        className="p-1 rounded hover:bg-rose-500/20 text-white/40 hover:text-rose-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Toggle actions */}
              <div className="pt-2 border-t border-white/5 flex gap-1 justify-between select-none">
                <button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="flex-1 py-1.5 rounded-lg hover:bg-white/5 text-[9px] font-bold text-indigo-400 uppercase tracking-wider flex items-center justify-center gap-1"
                >
                  <Plus className="w-3 h-3" /> New Node
                </button>
                <button
                  onClick={() => setShowInviteForm(!showInviteForm)}
                  className="flex-1 py-1.5 rounded-lg hover:bg-white/5 text-[9px] font-bold text-purple-400 uppercase tracking-wider flex items-center justify-center gap-1"
                >
                  <UserPlus className="w-3 h-3" /> Invite
                </button>
              </div>

              {/* Inline Create form sheet */}
              {showCreateForm && (
                <form onSubmit={handleCreateWsSubmit} className="pt-2 border-t border-white/5 space-y-1.5 p-1">
                  <input
                    type="text"
                    value={newWsName}
                    onChange={e => setNewWsName(e.target.value)}
                    placeholder="Workspace Title"
                    className="w-full px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white"
                  />
                  <div className="flex gap-1 justify-end">
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="px-2 py-1 text-[9px] text-white/40 uppercase font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[9px] font-bold uppercase"
                    >
                      Create
                    </button>
                  </div>
                </form>
              )}

              {/* Inline Invite form sheet */}
              {showInviteForm && (
                <form onSubmit={handleInviteSubmit} className="pt-2 border-t border-white/5 space-y-1.5 p-1">
                  <div className="flex gap-2 mb-2">
                    <button type="button" onClick={() => setInviteMethod("email")} className={`text-[9px] font-bold uppercase ${inviteMethod === "email" ? "text-indigo-400" : "text-white/40"}`}>Email</button>
                    <button type="button" onClick={() => setInviteMethod("link")} className={`text-[9px] font-bold uppercase ${inviteMethod === "link" ? "text-indigo-400" : "text-white/40"}`}>Get Link</button>
                  </div>
                  {inviteMethod === "email" ? (
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                      placeholder="teammate@veltora.com"
                      className="w-full px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white"
                    />
                  ) : (
                    <input
                      type="text"
                      value={generatedLink}
                      readOnly
                      placeholder="Click invite to generate link"
                      className="w-full px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-indigo-300"
                    />
                  )}
                  <div className="flex justify-between items-center">
                    <select
                      value={inviteRole}
                      onChange={e => setInviteRole(e.target.value as any)}
                      className="bg-[#141416] border border-white/10 text-white text-[10px] rounded px-1.5 py-1"
                    >
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                      <option value="admin">Admin</option>
                    </select>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => { setShowInviteForm(false); setGeneratedLink(""); }}
                        className="px-2 py-1 text-[9px] text-white/40 uppercase font-bold"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-[9px] font-bold uppercase"
                      >
                        {inviteMethod === "email" ? "Send Invite" : "Generate Link"}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
