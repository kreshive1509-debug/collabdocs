import React, { useEffect, useState } from "react";
import { FileText, Sparkles } from "lucide-react";
import { motion } from "motion/react";

export default function SplashScreen() {
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState("Preparing your workspace...");

  useEffect(() => {
    // Stage text changes
    const textIntervals = [
      { progress: 20, text: "Connecting to secure live collaboration nodes..." },
      { progress: 50, text: "Synchronizing offline document draft caches..." },
      { progress: 80, text: "Initializing document processing engine..." },
      { progress: 95, text: "Decentralizing CRDT conflict resolution systems..." }
    ];

    // Smoothly animate progress bar
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        
        const nextProgress = prev + Math.floor(Math.random() * 8) + 2;
        const currentStage = textIntervals.find(stage => nextProgress >= stage.progress);
        if (currentStage) {
          setLoadingText(currentStage.text);
        }
        
        return Math.min(nextProgress, 100);
      });
    }, 150);

    return () => clearInterval(progressInterval);
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#030303] overflow-hidden select-none">
      {/* Radiant Glowing Orb backgrounds */}
      <div className="absolute w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[120px] -top-24 -left-24 animate-pulse-slow" />
      <div className="absolute w-[500px] h-[500px] bg-purple-600/5 rounded-full blur-[120px] -bottom-24 -right-24 animate-pulse-slow" style={{ animationDelay: "2s" }} />

      <div className="relative z-10 flex flex-col items-center max-w-md px-6 text-center">
        {/* Floating animated logo block */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="relative mb-8"
        >
          {/* Logo container with pulse ring */}
          <div className="absolute -inset-6 bg-indigo-600/10 blur-xl rounded-full animate-ping" style={{ animationDuration: "3s" }} />
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center border border-white/20 shadow-2xl relative">
            <FileText className="w-10 h-10 text-white" />
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
              className="absolute inset-0 border-2 border-dashed border-indigo-500/30 rounded-3xl"
            />
          </div>
        </motion.div>

        {/* Identity Title */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="space-y-2 mb-12"
        >
          <h1 className="font-display font-black text-3xl tracking-tight text-white flex items-center gap-2 justify-center">
            CollabDocs <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 font-medium">v2.0</span>
          </h1>
          <p className="text-[10px] font-semibold text-indigo-400/60 uppercase tracking-[0.3em]">
            by Veltora IT Solution
          </p>
        </motion.div>

        {/* Dynamic Loading Meter */}
        <div className="w-64 space-y-3">
          <div className="h-[3px] bg-white/5 rounded-full overflow-hidden relative border border-white/5">
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
              style={{ width: `${progress}%` }}
              transition={{ ease: "easeOut" }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] text-white/40 font-mono">
            <span className="truncate max-w-[180px]">{loadingText}</span>
            <span className="font-bold text-indigo-400">{progress}%</span>
          </div>
        </div>
      </div>

      {/* Decorative footer label */}
      <div className="absolute bottom-12 text-white/20 font-mono text-[9px] tracking-[0.4em] uppercase">
        STARK ENTERPRISE SYSTEMS • SECURE NODE SEC-42
      </div>
    </div>
  );
}
