import React, { useState, useEffect } from "react";
import { useStore } from "../store/useStore";
import { 
  History, 
  ChevronRight, 
  Play, 
  Pause, 
  User, 
  RefreshCw, 
  Plus, 
  Clock, 
  FileText, 
  Tv, 
  ChevronsRight, 
  RotateCcw,
  SkipForward,
  SkipBack
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface VersionPaneProps {
  onClose: () => void;
}

export default function VersionPane({ onClose }: VersionPaneProps) {
  const { 
    activeDocumentId, 
    history, 
    fetchHistory, 
    saveVersionSnapshot, 
    updateDocument, 
    documents,
    fetchReplayFrames,
    clearHistory
  } = useStore();

  const [snapTitle, setSnapTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [restoredId, setRestoredId] = useState<string | null>(null);

  // Replay Player State
  const [showReplay, setShowReplay] = useState(false);
  const [replayFrames, setReplayFrames] = useState<any[]>([]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 1x, 2x, 5x, 10x
  const [isLoadingReplay, setIsLoadingReplay] = useState(false);

  useEffect(() => {
    if (activeDocumentId) {
      fetchHistory(activeDocumentId);
    }
    return () => clearHistory();
  }, [activeDocumentId, fetchHistory, clearHistory]);

  const activeDoc = documents.find(d => d.id === activeDocumentId);

  const handleTakeSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!snapTitle.trim() || !activeDocumentId) return;

    setIsSaving(true);
    await saveVersionSnapshot(snapTitle);
    setSnapTitle("");
    setIsSaving(false);
  };

  const handleRestoreVersion = async (content: string, versionId: string) => {
    if (!activeDocumentId) return;
    setRestoredId(versionId);
    await updateDocument(activeDocumentId, { content });
    setTimeout(() => setRestoredId(null), 1000);
  };

  // Launch Replay Player Mode
  const handleOpenReplay = async () => {
    if (!activeDocumentId) return;
    setIsLoadingReplay(true);
    const frames = await fetchReplayFrames(activeDocumentId);
    
    // Fallback if no frames were logged yet: use current and base document contents
    const computedFrames = frames.length > 0 ? frames : [
      { id: "f-base", updatedBy: "Initial Author", content: "Initializing specifications...", timestamp: new Date().toISOString() },
      { id: "f-curr", updatedBy: "Active Architect", content: activeDoc?.content || "", timestamp: new Date().toISOString() }
    ];

    setReplayFrames(computedFrames);
    setCurrentFrameIndex(0);
    setIsLoadingReplay(false);
    setShowReplay(true);
    setIsPlaying(false);
  };

  // Replay interval ticker
  useEffect(() => {
    if (!isPlaying || replayFrames.length === 0) return;

    const intervalMs = Math.max(100, 1000 / playbackSpeed);
    const timer = setInterval(() => {
      setCurrentFrameIndex((prevIndex) => {
        if (prevIndex >= replayFrames.length - 1) {
          setIsPlaying(false);
          return prevIndex;
        }
        return prevIndex + 1;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, replayFrames]);

  const currentReplayFrame = replayFrames[currentFrameIndex];

  return (
    <div className="h-full flex flex-col bg-[#0c0c0e] border-l border-white/5 w-80 text-white select-none relative">
      {/* Panel Header */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-white/80">Version Ledger</span>
        </div>
        <button
          onClick={onClose}
          className="text-white/40 hover:text-white text-[10px] uppercase font-bold tracking-widest hover:bg-white/5 px-2 py-1 rounded"
        >
          Close
        </button>
      </div>

      {/* Replay Console Launcher Button */}
      <div className="p-4 border-b border-white/5 bg-indigo-600/5">
        <button
          onClick={handleOpenReplay}
          disabled={isLoadingReplay}
          className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:opacity-40 rounded-xl text-[10px] font-bold uppercase tracking-wider text-white flex items-center justify-center gap-2 shadow-lg transition-all"
        >
          {isLoadingReplay ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Tv className="w-3.5 h-3.5 text-indigo-300" />
          )}
          Open Document Replay
        </button>
      </div>

      {/* Snapshot creation form */}
      <div className="p-4 border-b border-white/5 bg-white/2">
        <form onSubmit={handleTakeSnapshot} className="space-y-2">
          <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest block">Take Manual Snapshot</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={snapTitle}
              onChange={e => setSnapTitle(e.target.value)}
              placeholder="e.g. Pre-CRDT Refactor"
              className="flex-grow px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs placeholder-white/20 focus:outline-none focus:border-indigo-500/50 text-white font-medium"
            />
            <button
              type="submit"
              disabled={isSaving || !snapTitle.trim()}
              className="px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl flex items-center justify-center transition-colors disabled:opacity-40"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Revisions Feed */}
      <div className="flex-grow overflow-y-auto p-4 space-y-4">
        {history.length === 0 ? (
          <div className="py-20 text-center text-xs text-white/30 italic">
            No version snapshots taken on this specification yet.
          </div>
        ) : (
          history.map((rev) => (
            <div 
              key={rev.id} 
              className="p-3.5 rounded-2xl bg-white/3 border border-white/5 space-y-2.5 relative group hover:bg-white/5 transition-all"
            >
              <div className="flex justify-between items-start gap-1">
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-white/90 truncate">{rev.title}</h4>
                  <div className="flex items-center gap-1.5 mt-1 text-[9px] text-white/40 font-medium">
                    <Clock className="w-3 h-3 shrink-0" />
                    <span>{new Date(rev.updatedAt).toLocaleTimeString()}</span>
                    <span>•</span>
                    <span>{new Date(rev.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleRestoreVersion(rev.content, rev.id)}
                  disabled={restoredId !== null}
                  className="px-2 py-1 rounded bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/20 text-[9px] font-bold tracking-wider uppercase ml-auto transition-all shrink-0 flex items-center gap-1"
                >
                  {restoredId === rev.id ? (
                    <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                  ) : (
                    "Restore"
                  )}
                </button>
              </div>

              <div className="flex items-center gap-1.5 pt-2 border-t border-white/5">
                <div className="w-4 h-4 rounded bg-white/10 flex items-center justify-center text-[8px] font-mono font-bold uppercase text-white/60">
                  {rev.updatedBy.charAt(0)}
                </div>
                <span className="text-[9px] font-semibold text-white/50">Saved by {rev.updatedBy}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Safety Notice Footer */}
      <div className="p-4 bg-white/2 border-t border-white/5 text-[9px] text-white/40 leading-normal flex items-center gap-2">
        <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
        <span>Restoring a version updates document contents in real time. Active co-editors will sync automatically.</span>
      </div>

      {/* ========================================== */}
      {/* FULL SCREEN REPLAY OVERLAY PLAYER MODAL   */}
      {/* ========================================== */}
      <AnimatePresence>
        {showReplay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex flex-col p-8 select-none"
          >
            {/* Header Control */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <Tv className="w-6 h-6 text-indigo-400" />
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-white">Spec History Replay Engine</h2>
                  <p className="text-[11px] text-white/40">Watch architectural specifications compile character-by-character.</p>
                </div>
              </div>
              <button
                onClick={() => setShowReplay(false)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-bold uppercase rounded-xl transition-all"
              >
                Exit Replay
              </button>
            </div>

            {/* Simulated Live Viewport Container */}
            <div className="flex-grow bg-[#050507] border border-white/5 rounded-2xl p-8 overflow-y-auto font-mono text-xs text-white/90 leading-relaxed whitespace-pre-wrap select-text relative">
              <span className="absolute top-4 right-4 text-[9px] uppercase tracking-widest font-bold px-2 py-1 bg-indigo-600/20 text-indigo-400 rounded">
                Viewport
              </span>
              {currentReplayFrame ? currentReplayFrame.content : "No frames loaded."}
            </div>

            {/* Timeline Control Dock */}
            <div className="mt-6 bg-[#0a0a0d] border border-white/5 p-5 rounded-2xl space-y-4">
              <div className="flex justify-between items-center text-[10px] text-white/40 uppercase font-bold font-mono">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-400" />
                  Revised by: <span className="text-indigo-300">{currentReplayFrame?.updatedBy || "Unknown"}</span>
                </span>
                <span>
                  Timestamp: {currentReplayFrame ? new Date(currentReplayFrame.timestamp).toLocaleTimeString() : ""}
                </span>
                <span>
                  Frame: {currentFrameIndex + 1} / {replayFrames.length}
                </span>
              </div>

              {/* Range Drag/Slider */}
              <input
                type="range"
                min="0"
                max={replayFrames.length - 1}
                value={currentFrameIndex}
                onChange={(e) => {
                  setCurrentFrameIndex(parseInt(e.target.value));
                  setIsPlaying(false);
                }}
                className="w-full accent-indigo-500 bg-white/10 h-1.5 rounded-full cursor-pointer"
              />

              {/* Action Buttons Row */}
              <div className="flex justify-between items-center pt-2">
                {/* Playback speed controllers */}
                <div className="flex items-center gap-1.5">
                  {[0.5, 1, 2, 5].map((speed) => (
                    <button
                      key={speed}
                      onClick={() => setPlaybackSpeed(speed)}
                      className={`px-2.5 py-1 rounded text-[9px] font-bold font-mono ${playbackSpeed === speed ? "bg-indigo-600 text-white" : "bg-white/5 text-white/40 hover:bg-white/10"}`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>

                {/* Main player controls */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setCurrentFrameIndex(0);
                      setIsPlaying(false);
                    }}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                    title="Restart Playback"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      setCurrentFrameIndex(idx => Math.max(0, idx - 1));
                      setIsPlaying(false);
                    }}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                  >
                    <SkipBack className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-lg hover:scale-105 transition-all"
                  >
                    {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white translate-x-0.5" />}
                  </button>

                  <button
                    onClick={() => {
                      setCurrentFrameIndex(idx => Math.min(replayFrames.length - 1, idx + 1));
                      setIsPlaying(false);
                    }}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={() => handleRestoreVersion(currentReplayFrame?.content || "", "replay")}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-[10px] font-bold uppercase tracking-wider text-white transition-all shadow-lg shadow-emerald-600/10"
                >
                  Restore Frame
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
