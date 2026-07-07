import React, { useState } from "react";
import { useStore } from "../store/useStore";
import { 
  Sparkles, 
  Check, 
  ShieldCheck, 
  CloudLightning, 
  Tv, 
  Users, 
  ArrowRight, 
  X,
  CreditCard,
  Lock
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
  const { token, user, fetchMe, fetchNotifications } = useStore();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [checkoutData, setCheckoutData] = useState<any | null>(null);
  const [customCardNumber, setCustomCardNumber] = useState("4111 2222 3333 4444");
  const [customCardName, setCustomCardName] = useState("");
  const [simulationError, setSimulationError] = useState<string | null>(null);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleUpgradeSubmit = async () => {
    if (!token) return;
    setIsUpgrading(true);
    setSimulationError(null);

    try {
      const plan = billingCycle === "monthly" ? "pro_monthly" : "pro_yearly";
      // 1. Initialize SaaS billing checkout order
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ plan })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to initiate billing session.");

      // Check if real Razorpay gateway is active on the backend
      if (data && !data.isMock) {
        console.log("[UpgradeModal] Real Razorpay keys configured. Loading SDK...");
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
          throw new Error("Could not load Razorpay Payment Gateway SDK. Please check your network.");
        }

        const options = {
          key: data.key,
          amount: data.amount,
          currency: data.currency,
          name: "CollabDocs",
          description: `SaaS Upgrade - Pro ${plan === "pro_monthly" ? "Monthly" : "Yearly"}`,
          order_id: data.orderId,
          handler: async function (response: any) {
            try {
              setIsUpgrading(true);
              const verifyRes = await fetch("/api/billing/verify", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  plan: data.plan
                })
              });

              const verifyData = await verifyRes.json();
              if (!verifyRes.ok) throw new Error(verifyData.error || "Verification sequence declined.");

              // Refresh store states
              await fetchMe();
              await fetchNotifications();

              setIsUpgrading(false);
              setSuccess(true);
              setTimeout(() => {
                setSuccess(false);
                setCheckoutData(null);
                onClose();
              }, 2500);
            } catch (err: any) {
              console.error("Payment verification failed:", err);
              setSimulationError(err.message || "Payment verification failed.");
              setIsUpgrading(false);
            }
          },
          prefill: {
            name: user?.displayName || "",
            email: user?.email || ""
          },
          theme: {
            color: "#4f46e5"
          },
          modal: {
            ondismiss: function () {
              setIsUpgrading(false);
            }
          }
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } else {
        // Fall back to highly functional simulated card portal
        setCheckoutData(data);
        setIsUpgrading(false);
      }
    } catch (e: any) {
      console.error("Checkout initiation error:", e);
      setSimulationError(e.message || "Unable to initiate payment gateway.");
      setIsUpgrading(false);
    }
  };

  const handleCompletePaymentSimulation = async (simulateSuccess: boolean) => {
    if (!token || !checkoutData) return;
    setIsUpgrading(true);
    setSimulationError(null);

    if (!simulateSuccess) {
      setSimulationError("Transaction declined. Insufficient card limits or temporary gateway interruption.");
      setIsUpgrading(false);
      return;
    }

    try {
      // 2. Complete verification post-payment
      const verifyRes = await fetch("/api/billing/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          razorpay_order_id: checkoutData.orderId,
          razorpay_payment_id: `pay_sandbox_${Date.now()}`,
          razorpay_signature: `sig_sandbox_${Date.now()}`,
          plan: checkoutData.plan
        })
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.error || "Verification sequence declined.");

      // Refresh store states
      await fetchMe();
      await fetchNotifications();

      setIsUpgrading(false);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setCheckoutData(null);
        onClose();
      }, 2500);
    } catch (e: any) {
      console.error("Payment confirmation fail:", e);
      setSimulationError(e.message || "Payment verification failed.");
      setIsUpgrading(false);
    }
  };

  const features = [
    { title: "Unlimited Active Collaborators", desc: "No more 2-collaborator caps. Invite your entire engineering team." },
    { title: "Real-time Multi-device Sync", desc: "Co-edit documents simultaneously across web, mobile, and desktop." },
    { title: "Automated Version History Snapshots", desc: "Never lose a draft. View, compare, and roll back changes instantly." },
    { title: "Unlimited Simultaneous Editing Sessions", desc: "Co-author technical specs without connection throttle limits." },
    { title: "Advanced Document Templates", desc: "Audit syntax, draft spec nodes, and translate document formats." }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Blur overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              if (!isUpgrading) {
                setCheckoutData(null);
                onClose();
              }
            }}
            className="fixed inset-0 bg-[#000]/75 backdrop-blur-md"
          />

          {/* Modal box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-[#0c0c0e]/95 border border-white/10 w-full max-w-lg rounded-3xl p-6 shadow-2xl relative overflow-hidden z-10"
          >
            {/* Glowing decorative ambient meshes */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-pink-500/5 to-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

            <button
              onClick={() => {
                setCheckoutData(null);
                onClose();
              }}
              className="absolute right-4 top-4 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all z-20"
            >
              <X className="w-4 h-4" />
            </button>

            {success ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-10 space-y-4"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2 animate-bounce">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <h3 className="font-display font-extrabold text-xl text-white">Licenses Dispatched!</h3>
                <p className="text-xs text-white/60 max-w-xs mx-auto leading-relaxed">
                  Welcome to **CollabDocs Pro**. Unlimited real-time collaboration, automatic backups, and advanced templates are now fully active on your account.
                </p>
                <div className="w-8 h-1.5 bg-emerald-500 rounded-full mx-auto animate-pulse" />
              </motion.div>
            ) : checkoutData ? (
              /* --- HIGH FIDELITY SECURE CARD PAYMENT OVERLAY SIMULATION --- */
              <div className="space-y-5 py-2">
                <div className="text-center space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[9px] font-bold tracking-wider uppercase font-mono">
                    <Lock className="w-3 h-3 text-indigo-400" /> Secure Gateway Connection
                  </div>
                  <h4 className="text-lg font-display font-bold text-white">Simulated Payment Portal</h4>
                  <p className="text-[11px] text-white/50">Enter sandbox credentials to test end-to-end integration.</p>
                </div>

                <div className="p-4 bg-white/3 border border-white/5 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-white/40">Checkout Order Reference</span>
                    <span className="font-mono text-white/80">{checkoutData.orderId.substring(0, 16)}...</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-white/40">License Upgrade Tier</span>
                    <span className="font-bold uppercase text-indigo-300">{checkoutData.plan.replace("_", " ")}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs pt-2 border-t border-white/5">
                    <span className="text-white/40">Authorized Settlement Amount</span>
                    <span className="text-sm font-black text-white">${checkoutData.amount}.00 USD</span>
                  </div>
                </div>

                {simulationError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-[11px] text-red-400 flex items-start gap-2">
                    <span className="font-bold">Error:</span>
                    <span>{simulationError}</span>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-white/40 font-mono uppercase tracking-wider block">Mock Visa Number</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition-all"
                      value={customCardNumber}
                      onChange={(e) => setCustomCardNumber(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/40 font-mono uppercase tracking-wider block">Valid Thru</label>
                      <input
                        type="text"
                        placeholder="12/29"
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white/80 focus:outline-none focus:border-indigo-500 transition-all"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/40 font-mono uppercase tracking-wider block">Secure CVC</label>
                      <input
                        type="password"
                        placeholder="•••"
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white/80 focus:outline-none focus:border-indigo-500 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    onClick={() => handleCompletePaymentSimulation(false)}
                    disabled={isUpgrading}
                    className="flex-1 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-bold rounded-xl text-[10px] uppercase tracking-wider transition-all disabled:opacity-40"
                  >
                    Simulate Decline
                  </button>
                  <button
                    onClick={() => handleCompletePaymentSimulation(true)}
                    disabled={isUpgrading}
                    className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider transition-all disabled:opacity-40 flex items-center justify-center gap-1.5"
                  >
                    {isUpgrading ? "Authorizing..." : "Authorize Charge"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Header title */}
                <div className="text-center space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-300 text-[10px] font-bold tracking-wider uppercase mb-1">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Unlock Premium Enterprise Tier
                  </div>
                  <h3 className="text-2xl font-display font-extrabold text-white tracking-tight">CollabDocs Pro</h3>
                  <p className="text-xs text-white/60">Take document collaboration, backup speeds, and team sync to the next level.</p>
                </div>

                {/* Billing cycle switch */}
                <div className="flex justify-center">
                  <div className="bg-white/5 border border-white/10 p-1 rounded-xl flex items-center gap-1">
                    <button
                      onClick={() => setBillingCycle("monthly")}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${billingCycle === "monthly" ? "bg-white/10 text-white" : "text-white/40 hover:text-white"}`}
                    >
                      Monthly
                    </button>
                    <button
                      onClick={() => setBillingCycle("yearly")}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all relative ${billingCycle === "yearly" ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg" : "text-white/40 hover:text-white"}`}
                    >
                      Yearly (Save 30%)
                      <span className="absolute -top-3 -right-3 px-1.5 py-0.5 rounded-full bg-pink-600 text-[8px] font-extrabold text-white scale-90">HOT</span>
                    </button>
                  </div>
                </div>

                {simulationError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-[11px] text-red-400 font-mono">
                    {simulationError}
                  </div>
                )}

                {/* Mock Payment Options */}
                <div className="space-y-3">
                  <div className="text-xs text-white/40 font-bold uppercase tracking-wider">Payment Methods</div>
                  <div className="grid grid-cols-3 gap-2">
                    <button className="p-2 bg-white/5 border border-white/10 rounded-lg text-white/60 text-xs hover:bg-white/10">Card</button>
                    <button className="p-2 bg-white/5 border border-white/10 rounded-lg text-white/60 text-xs hover:bg-white/10">UPI</button>
                    <button className="p-2 bg-white/5 border border-white/10 rounded-lg text-white/60 text-xs hover:bg-white/10">Netbank</button>
                  </div>
                </div>

                {/* Features Checklist */}
                <div className="space-y-3.5 max-h-60 overflow-y-auto pr-1">
                  {features.map((feat, idx) => (
                    <div key={idx} className="flex gap-3">
                      <div className="w-5 h-5 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5 text-indigo-400">
                        <Check className="w-3 h-3" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white/90">{feat.title}</h4>
                        <p className="text-[10px] text-white/50 leading-relaxed mt-0.5">{feat.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pricing / Call to Action */}
                <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider">Plan Cost</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-display font-extrabold text-white">
                        {billingCycle === "yearly" ? "$159" : "$19"}
                      </span>
                      <span className="text-[10px] text-white/40">/{billingCycle === "yearly" ? "year" : "mo"}</span>
                    </div>
                  </div>

                  <button
                    onClick={handleUpgradeSubmit}
                    disabled={isUpgrading}
                    className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-indigo-500/20 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isUpgrading ? (
                      "Provisioning license..."
                    ) : (
                      <>
                        Upgrade Instantly <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
