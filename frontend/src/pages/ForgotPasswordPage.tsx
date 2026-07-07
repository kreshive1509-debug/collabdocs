import React, { useState } from "react";
import { Link } from "react-router-dom";
import { getFirebaseAuthErrorMessage } from "../lib/authErrors";
import { FileText, Mail, ArrowRight, ArrowLeft, CheckCircle2, AlertTriangle } from "lucide-react";
import { motion } from "motion/react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!email) {
      setErrorMessage("Please enter your email address.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to dispatch password reset email.");
      }
      setIsLoading(false);
      setIsSuccess(true);
    } catch (err: any) {
      setIsLoading(false);
      console.error("Password reset error:", err);
      setErrorMessage(getFirebaseAuthErrorMessage(err, "Failed to dispatch password reset email."));
    }
  };

  return (
    <div className="min-h-screen bg-[#030303] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[150px] -top-32 -left-32" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-3xl bg-white/5 backdrop-blur-2xl border border-white/10 p-8 shadow-2xl relative"
      >
        <div className="absolute inset-0 rounded-3xl border border-white/10 pointer-events-none" />

        {/* Brand */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-1.5 mb-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-extrabold text-lg text-white">CollabDocs</span>
          </Link>
          <h2 className="font-display font-bold text-2xl text-white">Reset Password</h2>
          <p className="text-xs text-white/60">Unlock Veltora session access credentials</p>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>{errorMessage}</span>
          </div>
        )}

        {!isSuccess ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs text-white/60 leading-relaxed mb-2">
              Enter your registered workspace email. We will dispatch a recovery link to restore your synchronized draft updates.
            </p>

            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-white/60 uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="developer@veltora.com"
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-xs placeholder-white/20 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all text-white font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl text-xs hover:shadow-lg hover:shadow-indigo-500/20 hover:from-indigo-500 hover:to-purple-500 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? "Dispatching dispatch nodes..." : <>Dispatch recovery <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
        ) : (
          <div className="text-center py-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-lg text-white font-display">Dispatch Successful</h3>
            <p className="text-xs text-white/60 leading-relaxed max-w-xs mx-auto">
              We have successfully dispatched a secure recovery link to <strong className="text-white">{email}</strong>. Please check your inbox or spam filters.
            </p>
          </div>
        )}

        <div className="text-center mt-6 pt-6 border-t border-white/10">
          <Link to="/login" className="inline-flex items-center gap-2 text-xs text-indigo-400 hover:underline font-semibold">
            <ArrowLeft className="w-4 h-4" /> Back to Sign In
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
