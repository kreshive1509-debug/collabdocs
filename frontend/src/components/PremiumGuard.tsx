import React, { useState } from "react";
import { useStore } from "../store/useStore";
import { Sparkles, ShieldAlert, ArrowRight, Lock } from "lucide-react";
import UpgradeModal from "./UpgradeModal";

interface PremiumGuardProps {
  children: React.ReactNode;
  fallbackMessage?: string;
  className?: string;
}

export default function PremiumGuard({ children, fallbackMessage, className = "" }: PremiumGuardProps) {
  const { user } = useStore();
  const [modalOpen, setModalOpen] = useState(false);

  const isPremium = user && (
    user.plan === "pro_monthly" || 
    user.plan === "pro_yearly" || 
    user.plan === "premium" || 
    user.email === "system@veltora.com" || 
    user.email.endsWith("@veltora.com") || 
    user.email === "kreshivesrivastava@gmail.com" || 
    user.email === "veltoraitsolution2026@gmail.com" ||
    user.role === "admin" ||
    user.role === "super_admin"
  );

  if (isPremium) {
    return <>{children}</>;
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] p-6 text-center ${className}`}>
      {/* Decorative ambient gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5 opacity-50 pointer-events-none" />
      
      <div className="relative z-10 flex flex-col items-center justify-center py-6 space-y-4 max-w-sm mx-auto">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shadow-inner">
          <Lock className="w-5 h-5" />
        </div>
        
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[9px] font-bold uppercase tracking-wider">
            <Sparkles className="w-2.5 h-2.5" /> Pro Feature
          </div>
          <h4 className="text-sm font-bold text-white tracking-wide">Premium Workspace Action</h4>
          <p className="text-xs text-white/50 leading-relaxed">
            {fallbackMessage || "Detailed rollback logs, team roles, and premium spec templates are restricted to Pro members."}
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="w-full py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
        >
          Upgrade Account <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <UpgradeModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
