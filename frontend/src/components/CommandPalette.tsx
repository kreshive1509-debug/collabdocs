import React, { useState, useEffect, useRef } from "react";
import { useStore } from "../store/useStore";
import { Search, FileText, Folder, Settings, User, Sparkles, Moon, Sun, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useSearchParams } from "react-router-dom";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const { documents, folders, workspaces, toggleTheme, logout } = useStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [, setSearchParams] = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setSearchQuery("");
    }
  }, [isOpen]);

  // Handle global shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Compile search nodes
  const documentNodes = documents.map(d => ({
    id: d.id,
    type: "document" as const,
    title: d.title,
    desc: d.content.substring(0, 60).replace(/[#*`\n]/g, "") || "Empty specification draft...",
    action: () => {
      setSearchParams({ doc: d.id });
      onClose();
    }
  }));

  const folderNodes = folders.map(f => ({
    id: f.id,
    type: "folder" as const,
    title: f.name,
    desc: "Collaborative folder division inside workspace",
    action: () => {
      setSearchParams({ tab: "files", folder: f.id });
      onClose();
    }
  }));

  const actionNodes = [
    {
      id: "theme-toggle",
      type: "action" as const,
      title: "Toggle Visual Theme Mode",
      desc: "Switch workspace aesthetics between Light & Premium Dark mode",
      icon: <Sun className="w-4 h-4 text-amber-400" />,
      action: () => {
        toggleTheme();
        onClose();
      }
    },
    {
      id: "action-logout",
      type: "action" as const,
      title: "Sign Out and Lock Session",
      desc: "Terminate active authentication token session safely",
      icon: <Settings className="w-4 h-4 text-rose-400" />,
      action: () => {
        logout();
        onClose();
      }
    }
  ];

  const allNodes = [...documentNodes, ...folderNodes, ...actionNodes];
  const filteredNodes = allNodes.filter(
    node =>
      node.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] p-4">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#000]/70 backdrop-blur-sm"
          />

          {/* Dialog Body */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -10 }}
            className="bg-[#0b0b0d]/95 border border-white/10 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden relative z-10 flex flex-col max-h-[60vh]"
          >
            {/* Search Input Area */}
            <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
              <Search className="w-5 h-5 text-white/40 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search documents, folders, or trigger console commands..."
                className="w-full bg-transparent text-sm focus:outline-none placeholder-white/20 text-white font-medium"
              />
              <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-white/10 text-white/40 select-none">
                ESC
              </span>
            </div>

            {/* Nodes List */}
            <div className="flex-grow overflow-y-auto p-2 space-y-1">
              {filteredNodes.length === 0 ? (
                <div className="py-12 text-center text-xs text-white/30 italic">
                  No matching files or console actions found in search index.
                </div>
              ) : (
                filteredNodes.map(node => (
                  <button
                    key={node.id}
                    onClick={node.action}
                    className="w-full text-left p-3 rounded-xl hover:bg-white/5 transition-all flex items-center gap-3.5 group relative"
                  >
                    {/* Hover visual highlight border */}
                    <div className="absolute inset-0 rounded-xl border border-transparent group-hover:border-white/5 pointer-events-none" />

                    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-white/60 group-hover:text-white transition-colors">
                      {node.type === "document" && <FileText className="w-4 h-4 text-indigo-400" />}
                      {node.type === "folder" && <Folder className="w-4 h-4 text-purple-400" />}
                      {node.type === "action" && (node as any).icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-white group-hover:text-indigo-400 transition-colors">
                        {node.title}
                      </h4>
                      <p className="text-[10px] text-white/40 font-medium truncate mt-0.5">
                        {node.desc}
                      </p>
                    </div>

                    <ArrowRight className="w-4 h-4 text-white/0 group-hover:text-white/40 -translate-x-2 group-hover:translate-x-0 transition-all ml-auto shrink-0" />
                  </button>
                ))
              )}
            </div>

            {/* Footer metadata indications */}
            <div className="px-4 py-2 bg-white/3 border-t border-white/5 flex items-center justify-between text-[8px] font-mono text-white/40 uppercase tracking-wider">
              <span>↑↓ Navigation</span>
              <span>⏎ Open Spec</span>
              <span>Ctrl+K toggle console</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
