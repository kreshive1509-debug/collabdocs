import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../store/useStore";
import { getFirebaseAuthErrorMessage } from "../lib/authErrors";
import { 
  FileText, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Sparkles, 
  Chrome, 
  Github, 
  ArrowRight,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function LoginPage() {
  const navigate = useNavigate();
  const { user, login, loginWithGoogle, loginWithGithub } = useStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successToast, setSuccessToast] = useState(false);
  const [dbStatus, setDbStatus] = useState<"connected" | "disconnected" | "checking">("checking");

  // Check backend health
  React.useEffect(() => {
    fetch("/api/health")
      .then(res => res.json())
      .then(data => {
        setDbStatus(data.databases?.mongodb?.status === "connected" ? "connected" : "disconnected");
      })
      .catch(() => setDbStatus("disconnected"));
  }, []);

  // Auto-redirect if already logged in
  React.useEffect(() => {
    if (user && !isLoading) {
      const isVeltoraAdmin = (
        user.email === "veltoraitsolution2026@gmail.com" ||
        user.email === "system@veltora.com" ||
        user.email === "kreshivesrivastava@gmail.com" ||
        user.email?.endsWith("@veltora.com") ||
        user.role === "admin" ||
        user.role === "super_admin"
      );
      navigate(isVeltoraAdmin ? "/admin" : "/dashboard");
    }
  }, [user, navigate, isLoading]);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!email || !password) {
      setErrorMessage("Please fill in all credentials.");
      return;
    }

    setIsLoading(true);

    try {
      const success = await login(email, password);
      setIsLoading(false);

      if (success) {
        setSuccessToast(true);
        setTimeout(() => {
          setSuccessToast(false);
          const loggedInUser = useStore.getState().user;
          const isVeltoraAdmin = loggedInUser && (
            loggedInUser.email === "veltoraitsolution2026@gmail.com" ||
            loggedInUser.email === "system@veltora.com" ||
            loggedInUser.email === "kreshivesrivastava@gmail.com" ||
            loggedInUser.email?.endsWith("@veltora.com") ||
            loggedInUser.role === "admin" ||
            loggedInUser.role === "super_admin"
          );
          if (isVeltoraAdmin) {
            navigate("/admin");
          } else {
            navigate("/dashboard");
          }
        }, 1500);
      } else {
        setErrorMessage("Your email or password is invalid.");
      }
    } catch (err: any) {
      setIsLoading(false);
      console.error("Login failure:", err);
      setErrorMessage(getFirebaseAuthErrorMessage(err, "Authentication failed."));
    }
  };

  const handleSocialLogin = async (platform: "Google" | "GitHub") => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const success = platform === "Google" ? await loginWithGoogle() : await loginWithGithub();
      setIsLoading(false);

      if (success) {
        setSuccessToast(true);
        setTimeout(() => {
          setSuccessToast(false);
          const loggedInUser = useStore.getState().user;
          const isVeltoraAdmin = loggedInUser && (
            loggedInUser.email === "veltoraitsolution2026@gmail.com" ||
            loggedInUser.email === "system@veltora.com" ||
            loggedInUser.email === "kreshivesrivastava@gmail.com" ||
            loggedInUser.email?.endsWith("@veltora.com") ||
            loggedInUser.role === "admin" ||
            loggedInUser.role === "super_admin"
          );
          if (isVeltoraAdmin) {
            navigate("/admin");
          } else {
            navigate("/dashboard");
          }
        }, 1500);
      }
    } catch (err: any) {
      setIsLoading(false);
      console.error(`${platform} Login failure:`, err);
      setErrorMessage(getFirebaseAuthErrorMessage(err, `Failed to authenticate with ${platform}.`));
    }
  };

  return (
    <div className="min-h-screen bg-[#030303] text-white flex flex-col items-center justify-center relative p-6 select-none overflow-hidden">
      {/* Decorative moving backdrop orbs */}
      <div className="absolute w-125 h-125 bg-indigo-600/5 rounded-full blur-[150px] -top-32 -left-32 animate-pulse-slow" />
      <div className="absolute w-125 h-125 bg-purple-600/5 rounded-full blur-[150px] -bottom-32 -right-32 animate-pulse-slow" style={{ animationDelay: "3s" }} />

      {/* Main Container */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md rounded-3xl bg-white/5 backdrop-blur-2xl border border-white/10 p-8 shadow-2xl relative"
      >
        {/* Top-down subtle inner highlight */}
        <div className="absolute inset-0 rounded-3xl border border-white/10 pointer-events-none" />

        {/* Brand identity */}
        <div className="text-center mb-8 space-y-2">
          <Link to="/" className="inline-flex items-center gap-1.5 mb-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-extrabold text-lg text-white">CollabDocs</span>
          </Link>
          <h2 className="font-display font-bold text-2xl text-white">Welcome Back</h2>
          <div className="flex flex-col items-center gap-1">
            <p className="text-xs text-white/60">Secure workspace login</p>
            <div className="flex items-center gap-1.5 mt-1">
              <div className={`w-1.5 h-1.5 rounded-full ${dbStatus === "connected" ? "bg-emerald-500 animate-pulse" : dbStatus === "disconnected" ? "bg-rose-500" : "bg-amber-500 animate-pulse"}`} />
              <span className="text-[10px] font-mono text-white/40 uppercase tracking-tighter">
                Database: {dbStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Errors Container */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleCredentialsSubmit} className="space-y-4 mb-6">
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

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-semibold text-white/60 uppercase tracking-wider">Password</label>
              <Link to="/forgot" className="text-[10px] text-indigo-400 hover:underline font-semibold">Forgot Password?</Link>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-3 bg-white/5 border border-white/10 rounded-xl text-xs placeholder-white/20 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all text-white font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember Me toggle */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded bg-white/5 border border-white/10 text-indigo-500 focus:ring-0 w-3.5 h-3.5"
              />
              <span className="text-[10px] text-white/60 font-semibold uppercase tracking-wider">Remember Me</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-linear-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl text-xs hover:shadow-lg hover:shadow-indigo-500/20 hover:from-indigo-500 hover:to-purple-500 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
          >
            {isLoading ? "Authenticating session..." : <>Secure Login <ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-6">
          <div className="h-px bg-white/10 grow" />
          <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Or connect with</span>
          <div className="h-px bg-white/10 grow" />
        </div>

        {/* Social logins */}
        <div className="mb-6">
          <button
            onClick={() => handleSocialLogin("Google")}
            className="w-full flex items-center justify-center gap-2 py-3 border border-white/10 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-semibold text-white transition-all active:scale-95"
          >
            <Chrome className="w-4 h-4 text-rose-400" /> Sign in with Google
          </button>
        </div>

        {/* Register CTA */}
        <div className="text-center">
          <p className="text-xs text-white/60">
            Don't have a secure profile?{" "}
            <Link to="/register" className="text-indigo-400 hover:underline font-semibold">Create account</Link>
          </p>
        </div>
      </motion.div>

      {/* Success Toast Dialogue */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 bg-emerald-500 text-white px-5 py-3.5 rounded-2xl flex items-center gap-3 shadow-2xl z-50 text-xs font-semibold"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>Authenticated successfully. Initializing workspace...</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
