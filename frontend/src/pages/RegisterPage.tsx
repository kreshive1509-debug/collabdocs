import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../store/useStore";
import { trackPageView } from "../lib/analytics";
import { getFirebaseAuthErrorMessage } from "../lib/authErrors";
import { 
  FileText, 
  Mail, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  Sparkles, 
  Chrome, 
  Github, 
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Award
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function RegisterPage() {
  React.useEffect(() => {
    trackPageView("/register");
  }, []);

  const navigate = useNavigate();
  const { register, login, loginWithGoogle, loginWithGithub } = useStore();

  // Multi-step state: 1 = Profile & Email, 2 = Password & Terms, 3 = Success!
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successToast, setSuccessToast] = useState(false);

  // Calculate Password Strength: 0 to 4
  const getPasswordStrength = () => {
    if (!password) return 0;
    let strength = 0;
    if (password.length >= 6) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    return strength;
  };

  const strengthColor = () => {
    const strength = getPasswordStrength();
    if (strength <= 1) return "bg-rose-500";
    if (strength === 2) return "bg-amber-500";
    if (strength === 3) return "bg-yellow-400";
    return "bg-emerald-500";
  };

  const strengthLabel = () => {
    const strength = getPasswordStrength();
    if (strength === 0) return "Not Entered";
    if (strength === 1) return "Weak (Try adding uppercase)";
    if (strength === 2) return "Fair (Add a number)";
    if (strength === 3) return "Good (Add a special symbol)";
    return "Strong Secure Key";
  };

  const handleNextStep = () => {
    setErrorMessage("");
    if (step === 1) {
      if (!name || !email) {
        setErrorMessage("Please enter both your full name and email.");
        return;
      }
      if (!email.includes("@")) {
        setErrorMessage("Please enter a valid email address.");
        return;
      }
      setStep(2);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    if (getPasswordStrength() < 2) {
      setErrorMessage("Please configure a stronger password.");
      return;
    }

    if (!termsAccepted) {
      setErrorMessage("Please accept the Terms of Service.");
      return;
    }

    setIsLoading(true);

    try {
      const success = await register(email, password, name);
      setIsLoading(false);

      if (success) {
        setSuccessToast(true);
        setStep(3);
        setTimeout(() => {
          setSuccessToast(false);
          navigate("/dashboard");
        }, 2000);
      } else {
        setErrorMessage("An account with this email address already exists.");
      }
    } catch (err: any) {
      setIsLoading(false);
      console.error("Registration failure:", err);
      setErrorMessage(getFirebaseAuthErrorMessage(err, "Registration failed."));
    }
  };

  const handleSocialLogin = async (platform: "Google" | "GitHub") => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const success = platform === "Google" ? await loginWithGoogle() : await loginWithGithub();
      setIsLoading(false);

      if (success) {
        setStep(3);
        setTimeout(() => {
          navigate("/dashboard");
        }, 2000);
      }
    } catch (err: any) {
      setIsLoading(false);
      console.error(`${platform} Authentication failure:`, err);
      setErrorMessage(getFirebaseAuthErrorMessage(err, `Failed to authenticate via ${platform}.`));
    }
  };

  return (
    <div className="min-h-screen bg-[#030303] text-white flex flex-col items-center justify-center relative p-6 overflow-hidden">
      {/* Decorative moving backdrops */}
      <div className="absolute w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[150px] -top-32 -right-32 animate-pulse-slow" />
      <div className="absolute w-[500px] h-[500px] bg-purple-600/5 rounded-full blur-[150px] -bottom-32 -left-32 animate-pulse-slow" style={{ animationDelay: "3s" }} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md rounded-3xl bg-white/5 backdrop-blur-2xl border border-white/10 p-8 shadow-2xl relative"
      >
        <div className="absolute inset-0 rounded-3xl border border-white/10 pointer-events-none" />

        {/* Form brand header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-1.5 mb-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-extrabold text-lg text-white">CollabDocs</span>
          </Link>
          <h2 className="font-display font-bold text-2xl text-white">Initialize Account</h2>
          <p className="text-xs text-white/60">Securely coordinate with Veltora workspace nodes</p>
        </div>

        {/* Step Indicator */}
        {step < 3 && (
          <div className="flex justify-center items-center gap-2 mb-8">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-colors ${step === 1 ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/20" : "bg-white/5 border-white/10 text-white/40"}`}>1</div>
            <div className="w-8 h-[1px] bg-white/10" />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-colors ${step === 2 ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/20" : "bg-white/5 border-white/10 text-white/40"}`}>2</div>
          </div>
        )}

        {/* Error message logs */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-white/60 uppercase tracking-wider">Full Profile Name</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Kreshive Srivastava"
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-xs placeholder-white/20 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all text-white font-medium"
                  />
                </div>
              </div>

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
                    placeholder="animesh@veltora.com"
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-xs placeholder-white/20 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all text-white font-medium"
                  />
                </div>
              </div>

              <button
                onClick={handleNextStep}
                className="w-full py-3.5 mt-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-indigo-500/20 hover:from-indigo-500 hover:to-purple-500 transition-all active:scale-95"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3 py-2">
                <div className="h-[1px] bg-white/10 flex-grow" />
                <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest">Or Register with</span>
                <div className="h-[1px] bg-white/10 flex-grow" />
              </div>

              <div>
                <button
                  onClick={() => handleSocialLogin("Google")}
                  className="w-full flex items-center justify-center gap-2 py-3 border border-white/10 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-semibold text-white transition-all active:scale-95"
                >
                  <Chrome className="w-4 h-4 text-rose-400" /> Register with Google
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.form
              key="step2"
              onSubmit={handleSubmit}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-white/60 uppercase tracking-wider">Configure Password</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-3 bg-white/5 border border-white/10 rounded-xl text-xs focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all text-white font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Password strength visualizer */}
              {password && (
                <div className="space-y-1.5 py-1">
                  <div className="flex justify-between items-center text-[9px] font-bold">
                    <span className="text-white/40">Strength:</span>
                    <span className="text-indigo-400">{strengthLabel()}</span>
                  </div>
                  <div className="h-[3px] bg-white/5 rounded-full overflow-hidden flex gap-1">
                    {[1, 2, 3, 4].map((idx) => (
                      <div
                        key={idx}
                        className={`h-full flex-grow rounded-full transition-all duration-300 ${idx <= getPasswordStrength() ? strengthColor() : "bg-white/5"}`}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-white/60 uppercase tracking-wider">Confirm Password</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-xs focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all text-white font-medium"
                  />
                </div>
              </div>

              {/* Terms checkbox */}
              <label className="flex items-start gap-2.5 cursor-pointer select-none py-1">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="rounded bg-white/5 border border-white/10 text-indigo-500 focus:ring-0 mt-0.5"
                />
                <span className="text-[10px] text-white/60 leading-relaxed">
                  I accept the <a href="#terms" className="text-indigo-400 font-semibold">Terms of Service</a> and authorize Veltora to synchronize draft nodes.
                </span>
              </label>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-3 border border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl text-xs flex items-center justify-center"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-grow py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl text-xs hover:shadow-lg hover:shadow-indigo-500/20 hover:from-indigo-500 hover:to-purple-500 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isLoading ? "Saving safe keys..." : "Finalize Profile"}
                </button>
              </div>
            </motion.form>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-6 space-y-4"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto mb-2">
                <Award className="w-8 h-8" />
              </div>
              <h3 className="font-display font-extrabold text-xl text-white">Workspace Prepared!</h3>
              <p className="text-xs text-white/60 max-w-xs mx-auto">
                Your credentials have been securely stored in Veltora document caches. Redirecting to your premium dashboard...
              </p>
              <div className="w-12 h-1.5 bg-emerald-500 mx-auto rounded-full animate-pulse" />
            </motion.div>
          )}
          <AnimatePresence>
            {successToast && (
              <motion.div
                initial={{ opacity: 0, y: 36 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 36 }}
                className="fixed bottom-6 right-6 z-50 rounded-2xl bg-emerald-500 px-4 py-3 text-xs font-semibold text-white shadow-2xl shadow-emerald-500/20"
              >
                Account created successfully. Redirecting...
              </motion.div>
            )}
          </AnimatePresence>
        </AnimatePresence>

        {/* Login redirect link */}
        {step < 3 && (
          <div className="text-center mt-6 pt-6 border-t border-white/10">
            <p className="text-xs text-white/60">
              Already have a secure profile?{" "}
              <Link to="/login" className="text-indigo-400 hover:underline font-semibold">Sign in</Link>
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
