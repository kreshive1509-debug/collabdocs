import React from "react";
import { Link } from "react-router-dom";
import { HelpCircle, ArrowLeft, AlertTriangle, FileQuestion } from "lucide-react";
import { motion } from "motion/react";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-[#030303] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden text-center">
      <div className="absolute w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[150px] -top-32 -left-32 animate-pulse-slow" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md space-y-6"
      >
        <div className="w-20 h-20 rounded-3xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto animate-bounce">
          <FileQuestion className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <h1 className="font-display font-extrabold text-7xl text-white">404</h1>
          <h3 className="font-display font-bold text-xl text-indigo-400">Workspace Node Missing</h3>
          <p className="text-xs text-white/60 leading-relaxed max-w-sm mx-auto">
            The page node you are attempting to synchronize does not exist or has been archived under Veltora security protocols.
          </p>
        </div>

        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-semibold hover:shadow-lg hover:shadow-indigo-500/20 transition-all active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Safe Home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
