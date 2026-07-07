import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Check, X, Shield, Sparkles, HelpCircle, Star, ArrowRight, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null);

  const plans = [
    {
      name: "Free Tier",
      price: "₹0",
      period: "forever",
      tagline: "Best for individual architects starting out.",
      cta: "Start Free",
      popular: false,
      color: "border-white/10 bg-white/5 text-white",
      features: [
        { text: "2 Collaborators", included: true },
        { text: "2 Collaboration Sessions / month", included: true },
        { text: "Local Device Storage Only", included: true },
        { text: "Basic Version History", included: true },
        { text: "Markdown Editor & Preview", included: true },
        { text: "PDF Draft Export", included: true },
        { text: "Community Support Forum", included: true },
        { text: "Premium Spec Templates", included: false }
      ]
    },
    {
      name: "Pro Monthly",
      price: billingPeriod === "monthly" ? "₹349" : "₹279",
      period: "month",
      tagline: "Engineered for high-velocity teams & power users.",
      cta: "Go Pro",
      popular: true,
      color: "border-indigo-500/50 bg-white/10 text-white shadow-xl shadow-indigo-500/10",
      features: [
        { text: "Unlimited Collaborators", included: true },
        { text: "Unlimited Collaboration Sessions", included: true },
        { text: "Unlimited Document Node Creation", included: true },
        { text: "Cross Device Syncing", included: true },
        { text: "Unlimited Draft Revision History", included: true },
        { text: "Premium Spec Templates", included: true },
        { text: "Priority Ticket Support (4h)", included: true },
        { text: "Interactive Live Comments Layer", included: true },
        { text: "Secure Team Roles Manager", included: true }
      ]
    },
    {
      name: "Pro Yearly",
      price: "₹2,999",
      period: "year",
      tagline: "Save over 20% with comprehensive billing.",
      cta: "Unlock Yearly",
      popular: false,
      color: "border-white/10 bg-white/5 text-white",
      features: [
        { text: "Everything in Pro Monthly", included: true },
        { text: "Save Over 20% on Annual billing", included: true },
        { text: "Early Access to Beta CRDT engines", included: true },
        { text: "Priority Support Ticket response (1h)", included: true },
        { text: "Dedicated Team Success Coordinator", included: true }
      ]
    }
  ];

  const compareMatrix = [
    { feature: "Collaborators", free: "Up to 2", pro: "Unlimited", yearly: "Unlimited" },
    { feature: "Version History", free: "7 Days", pro: "Unlimited", yearly: "Unlimited + Audit Logs" },
    { feature: "Support SLA", free: "Community Forum", pro: "Priority Support (4h)", yearly: "VIP Dedicated (1h)" }
  ];

  return (
    <div className="min-h-screen bg-[#030303] text-white pt-32 pb-24 overflow-hidden relative">
      {/* Background radial glows */}
      <div className="absolute top-[10%] left-[20%] w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[150px] -z-10" />
      <div className="absolute bottom-[10%] right-[20%] w-[500px] h-[500px] bg-purple-600/5 rounded-full blur-[150px] -z-10" />

      {/* Page Header */}
      <section className="max-w-4xl mx-auto text-center px-6 mb-16 space-y-4">
        <h1 className="font-display font-extrabold text-4xl md:text-6xl text-white tracking-tight">
          Simple, Transparent Pricing
        </h1>
        <p className="text-sm md:text-base text-white/60 max-w-xl mx-auto leading-relaxed">
          Unlock state-of-the-art document synchronization and team workspace collaboration. No hidden fees.
        </p>
      </section>

      {/* Toggle Billing State */}
      <div className="flex justify-center mb-16">
        <div className="p-1 rounded-full bg-white/5 border border-white/10 flex items-center gap-1">
          <button
            onClick={() => setBillingPeriod("monthly")}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${billingPeriod === "monthly" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-white/60 hover:text-white"}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingPeriod("yearly")}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${billingPeriod === "yearly" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-white/60 hover:text-white"}`}
          >
            Yearly (Save 20%)
          </button>
        </div>
      </div>

      {/* Grid containing cards */}
      <section className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 items-start mb-24">
        {plans.map((p, idx) => (
          <div
            key={idx}
            className={`rounded-3xl border p-8 flex flex-col justify-between hover:-translate-y-1 transition-all duration-300 relative ${p.color} ${p.popular ? "scale-105 border-indigo-500 shadow-xl shadow-indigo-500/10" : "border-white/10"}`}
          >
            {p.popular && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-[10px] font-bold uppercase tracking-widest px-4 py-1 rounded-full shadow-md shadow-indigo-500/20">
                  Most Popular
                </span>
              </div>
            )}

            <div>
              <div className="mb-4">
                <h3 className="font-display font-bold text-xl text-white">{p.name}</h3>
                <p className="text-[11px] text-white/60 mt-1 min-h-[32px]">{p.tagline}</p>
              </div>

              <div className="flex items-baseline gap-1 mb-6">
                <span className="font-display font-extrabold text-4xl text-white">{p.price}</span>
                <span className="text-xs text-white/40">/{p.period}</span>
              </div>

              <hr className="border-white/10 mb-6" />

              <ul className="space-y-3.5 mb-8">
                {p.features.map((f, fIdx) => (
                  <li key={fIdx} className={`flex gap-2.5 text-xs ${f.included ? "text-white/80" : "text-white/30 line-through"}`}>
                    {f.included ? (
                      <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-rose-500 shrink-0" />
                    )}
                    <span>{f.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => setCheckoutPlan(p.name)}
              className={`w-full py-3 rounded-xl text-xs font-bold transition-all active:scale-95 ${p.popular ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-500 hover:to-purple-500" : "bg-white/5 border border-white/10 text-white hover:bg-white/10"}`}
            >
              {p.cta}
            </button>
          </div>
        ))}
      </section>

      {/* Feature matrix */}
      <section className="max-w-4xl mx-auto px-6 py-16 border-t border-white/10 mb-16">
        <h2 className="font-display font-bold text-2xl text-center text-white mb-12">Detailed Feature Comparison</h2>
        <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md overflow-hidden">
          <table className="w-full text-left border-collapse text-xs md:text-sm">
            <thead>
              <tr className="bg-white/5 border-b border-white/10 text-white/80">
                <th className="p-4 font-semibold">Features</th>
                <th className="p-4 font-semibold text-center">Free</th>
                <th className="p-4 font-semibold text-center text-indigo-400">Pro</th>
                <th className="p-4 font-semibold text-center">Yearly</th>
              </tr>
            </thead>
            <tbody>
              {compareMatrix.map((row, idx) => (
                <tr key={idx} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                  <td className="p-4 font-medium text-white">{row.feature}</td>
                  <td className="p-4 text-white/60 text-center">{row.free}</td>
                  <td className="p-4 text-white text-center font-semibold">{row.pro}</td>
                  <td className="p-4 text-white/60 text-center">{row.yearly}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Checkout Success/Simulated Dialog */}
      <AnimatePresence>
        {checkoutPlan && (
          <>
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" onClick={() => setCheckoutPlan(null)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="fixed inset-0 m-auto z-50 max-w-md h-fit rounded-[24px] bg-[#030303] border border-white/10 p-8 shadow-2xl text-center"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-display font-extrabold text-2xl text-white mb-3">Simulated Plan Activation</h3>
              <p className="text-xs text-white/60 leading-relaxed mb-6">
                You have initiated checkout for <strong className="text-indigo-400">{checkoutPlan}</strong>. In Phase 1 of this SaaS prototype, payments are mocked as requested. Your local guest profile has been successfully upgraded to pro capabilities!
              </p>
              <button
                onClick={() => setCheckoutPlan(null)}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl text-xs hover:from-indigo-500 hover:to-purple-500 transition-all"
              >
                Enter Premium Workspace
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
