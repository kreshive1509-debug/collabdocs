import React, { useState, useEffect } from "react";
import { useStore } from "../store/useStore";
import { Folder, FolderPlus, FileText, ChevronRight, ChevronDown, Plus, Edit, Trash2, Check, X, ArrowRightLeft } from "lucide-react";
import { useSearchParams } from "react-router-dom";

export default function FolderStructure() {
  const {
    folders,
    documents,
    activeWorkspaceId,
    createFolder,
    updateFolder,
    deleteFolder,
    moveDocument,
    activeDocumentId,
    setActiveDocumentId
  } = useStore();

  const [, setSearchParams] = useSearchParams();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [editFolderId, setEditFolderId] = useState<string | null>(null);
  const [editFolderNameText, setEditFolderNameText] = useState("");
  
  // Assign docs to folder states
  const [moveDocId, setMoveDocId] = useState<string | null>(null);

  const activeWorkspaceFolders = folders.filter(f => f.workspaceId === activeWorkspaceId);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    await createFolder(newFolderName, null);
    setNewFolderName("");
    setShowAddFolder(false);
  };

  const handleRenameFolder = async (id: string) => {
    if (!editFolderNameText.trim()) return;
    await updateFolder(id, editFolderNameText, null);
    setEditFolderId(null);
  };

  const handleDeleteFolder = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this folder? Documents inside will remain un-nested.")) {
      await deleteFolder(id);
    }
  };

  const toggleCollapse = (id: string) => {
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSelectDoc = (docId: string) => {
    setActiveDocumentId(docId);
    setSearchParams({ doc: docId });
  };

  return (
    <div className="space-y-4 select-none">
      {/* Section Header */}
      <div className="flex items-center justify-between px-2 text-[10px] font-bold text-white/40 uppercase tracking-widest">
        <span>Folders & Navigation</span>
        <button
          onClick={() => setShowAddFolder(!showAddFolder)}
          className="text-indigo-400 hover:text-indigo-300 transition-colors"
          title="Create Folder Shard"
        >
          <FolderPlus className="w-4 h-4" />
        </button>
      </div>

      {/* Inline Create Folder Form */}
      {showAddFolder && (
        <form onSubmit={handleCreateFolder} className="px-2 space-y-2">
          <input
            type="text"
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            placeholder="Folder name (e.g. Spec Drifts)"
            className="w-full px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500/50"
          />
          <div className="flex justify-end gap-1">
            <button
              type="button"
              onClick={() => setShowAddFolder(false)}
              className="px-2 py-1 text-[9px] text-white/40 font-bold uppercase"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[9px] font-bold uppercase"
            >
              Save
            </button>
          </div>
        </form>
      )}

      {/* Folders list */}
      <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
        {activeWorkspaceFolders.length === 0 ? (
          <div className="px-2 py-4 text-center text-[10px] text-white/20 italic">
            No folders mapped inside this workspace.
          </div>
        ) : (
          activeWorkspaceFolders.map((fold) => {
            const folderDocs = documents.filter(d => d.folderId === fold.id);
            const isCollapsed = collapsed[fold.id];

            return (
              <div key={fold.id} className="space-y-1">
                {/* Folder Row */}
                <div 
                  onClick={() => toggleCollapse(fold.id)}
                  className="group px-2 py-1.5 rounded-xl hover:bg-white/5 transition-all flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    {isCollapsed ? (
                      <ChevronRight className="w-3.5 h-3.5 text-white/30 shrink-0" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-white/30 shrink-0" />
                    )}
                    <Folder className="w-4 h-4 text-indigo-400 shrink-0" />
                    
                    {editFolderId === fold.id ? (
                      <input
                        type="text"
                        value={editFolderNameText}
                        onChange={e => setEditFolderNameText(e.target.value)}
                        onClick={e => e.stopPropagation()}
                        onKeyDown={e => {
                          if (e.key === "Enter") handleRenameFolder(fold.id);
                        }}
                        className="px-1.5 py-0.5 bg-white/5 border border-white/25 rounded text-[11px] text-white"
                      />
                    ) : (
                      <span className="text-xs font-bold text-white/80 truncate">{fold.name}</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {editFolderId === fold.id ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRenameFolder(fold.id);
                        }}
                        className="p-1 rounded bg-indigo-600 text-white"
                      >
                        <Check className="w-2.5 h-2.5" />
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditFolderId(fold.id);
                          setEditFolderNameText(fold.name);
                        }}
                        className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white"
                      >
                        <Edit className="w-2.5 h-2.5" />
                      </button>
                    )}
                    <button
                      onClick={(e) => handleDeleteFolder(fold.id, e)}
                      className="p-1 rounded hover:bg-rose-500/20 text-white/30 hover:text-rose-400"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>

                {/* Sub-documents under this folder */}
                {!isCollapsed && (
                  <div className="pl-6 space-y-1 border-l border-white/5 ml-4">
                    {folderDocs.length === 0 ? (
                      <div className="p-2 text-[10px] text-white/20 italic">
                        Empty Folder
                      </div>
                    ) : (
                      folderDocs.map((doc) => (
                        <button
                          key={doc.id}
                          onClick={() => handleSelectDoc(doc.id)}
                          className={`w-full text-left p-1.5 rounded-lg hover:bg-white/5 transition-all flex items-center gap-1.5 group ${activeDocumentId === doc.id ? "bg-white/5 text-indigo-300" : "text-white/60"}`}
                        >
                          <FileText className="w-3.5 h-3.5 text-white/30 shrink-0" />
                          <span className="text-xs font-semibold truncate flex-1">{doc.title}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setMoveDocId(doc.id);
                            }}
                            className="p-1 rounded opacity-0 group-hover:opacity-100 text-white/30 hover:text-white shrink-0 hover:bg-white/5"
                            title="Re-nest doc"
                          >
                            <ArrowRightLeft className="w-3 h-3" />
                          </button>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Move doc modal overlay */}
      {moveDocId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-[#000]/60 backdrop-blur-xs" onClick={() => setMoveDocId(null)} />
          <div className="bg-[#0c0c0e] border border-white/10 rounded-2xl p-4 w-64 shadow-2xl relative z-10 space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Re-nest Document</h4>
            <div className="space-y-1">
              <button
                onClick={async () => {
                  await moveDocument(moveDocId, null);
                  setMoveDocId(null);
                }}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-white/5 text-xs text-white/70 hover:text-white"
              >
                No Folder (Root)
              </button>
              {activeWorkspaceFolders.map(f => (
                <button
                  key={f.id}
                  onClick={async () => {
                    await moveDocument(moveDocId, f.id);
                    setMoveDocId(null);
                  }}
                  className="w-full text-left px-2 py-1.5 rounded hover:bg-white/5 text-xs text-white/70 hover:text-white"
                >
                  📁 {f.name}
                </button>
              ))}
            </div>
            <button
              onClick={() => setMoveDocId(null)}
              className="w-full py-1 bg-white/5 text-white/40 hover:text-white rounded text-[10px] font-bold uppercase"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
