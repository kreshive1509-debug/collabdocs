import React from "react";
import { Link } from "react-router-dom";
import { Eye, Compass, Trophy, Sparkles, Code2, Users2, ArrowRight } from "lucide-react";
import { motion } from "motion/react";

export default function AboutPage() {
  const values = [
    {
      title: "Obsessive Precision",
      desc: "We focus on the micro-second latencies and individual keystroke alignments so that collaboration feels totally invisible.",
      icon: Code2,
      color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20"
    },
    {
      title: "Radical Transparency",
      desc: "Our platform features explicit revision structures, secure permission audits, and modular developer configurations.",
      icon: Trophy,
      color: "text-amber-400 bg-amber-500/10 border-amber-500/20"
    },
    {
      title: "Empowered Autonomy",
      desc: "We build offline-first structures so authors never lose a single draft to intermittent local dropouts or server outages.",
      icon: Users2,
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
    }
  ];

  const timeline = [
    {
      year: "2024",
      title: "The Genesis",
      desc: "Veltora IT Solution releases a prototype offline-first collaborative engine using secure local state syncs."
    },
    {
      year: "2025",
      title: "Version 1.0 Deployments",
      desc: "CollabDocs scales to 15,000 active workspace designers, introducing customizable Firebase Auth models."
    },
    {
      year: "2026",
      title: "CollabDocs v2.0 Platform",
      desc: "Release of advanced collaboration protocols, real-time analytics graphs, and 4ms CRDT engines."
    }
  ];

  return (
    <div className="min-h-screen bg-[#030303] text-white pt-32 pb-24 overflow-hidden relative">
      {/* Decorative Gradients */}
      <div className="absolute top-10 left-10 w-[600px] h-[600px] bg-indigo-600/5 rounded-full blur-[150px] -z-10" />
      <div className="absolute bottom-10 right-10 w-[600px] h-[600px] bg-purple-600/5 rounded-full blur-[150px] -z-10" />

      {/* Hero Section */}
      <div className="max-w-4xl mx-auto text-center px-6 mb-20 space-y-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-semibold tracking-wider uppercase mb-4"
        >
          <Sparkles className="w-3.5 h-3.5" />
          The Story of Veltora
        </motion.div>
        <h1 className="font-display font-extrabold text-4xl md:text-6xl text-white tracking-tight leading-none">
          Redefining Collaborative Engineering
        </h1>
        <p className="text-sm md:text-base text-white/60 max-w-xl mx-auto leading-relaxed">
          How a core team of system architects at Veltora IT Solution engineered an instant document platform with military-grade sync security.
        </p>
      </div>

      {/* Grid: Mission and Vision */}
      <section className="max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
        <div className="rounded-[24px] bg-white/5 border border-white/10 p-8 flex flex-col justify-between hover:bg-white/10 transition-all">
          <div>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20 mb-6">
              <Compass className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-2xl text-white mb-3">Our Core Mission</h3>
            <p className="text-xs text-white/60 leading-relaxed">
              To eliminate document sync latency for engineering, product, and enterprise teams globally. We believe the speed of collective thoughts shouldn't be gated by a centralized remote database roundtrip.
            </p>
          </div>
        </div>

        <div className="rounded-[24px] bg-white/5 border border-white/10 p-8 flex flex-col justify-between hover:bg-white/10 transition-all">
          <div>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20 mb-6">
              <Eye className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-2xl text-white mb-3">Our Vision</h3>
            <p className="text-xs text-white/60 leading-relaxed">
              We envision a borderless documentation space where human editors co-create on a localized, decentralized memory canvas with zero synchronization conflicts.
            </p>
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="max-w-4xl mx-auto px-6 py-16 mb-24 relative border-t border-white/10">
        <h2 className="font-display font-bold text-3xl text-center text-white mb-16">The Journey Timeline</h2>
        <div className="relative border-l border-white/10 ml-4 md:ml-32 space-y-12">
          {timeline.map((item, idx) => (
            <div key={idx} className="relative pl-8 group">
              {/* Timeline dot */}
              <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-indigo-500 border border-[#030303] group-hover:scale-125 transition-transform" />
              {/* Date offset label */}
              <div className="hidden md:block absolute -left-28 top-0.5 text-right font-display font-black text-lg text-indigo-400 w-20">
                {item.year}
              </div>
              <div className="space-y-1">
                <span className="md:hidden inline-block text-xs font-black text-indigo-400 mb-1">{item.year}</span>
                <h4 className="font-display font-bold text-lg text-white">{item.title}</h4>
                <p className="text-xs text-white/60 leading-relaxed max-w-xl">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Core Values */}
      <section className="max-w-5xl mx-auto px-6 mb-24">
        <h2 className="font-display font-bold text-3xl text-center text-white mb-16">Our Core Values</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {values.map((v, idx) => {
            const IconComponent = v.icon;
            return (
              <div key={idx} className="rounded-2xl bg-white/5 border border-white/10 p-6 hover:bg-white/10 transition-all">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center border mb-6 ${v.color}`}>
                  <IconComponent className="w-5 h-5" />
                </div>
                <h4 className="font-display font-bold text-lg text-white mb-2">{v.title}</h4>
                <p className="text-xs text-white/60 leading-relaxed">{v.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Interactive CTA */}
      <section className="max-w-3xl mx-auto px-6 text-center">
        <div className="rounded-[32px] bg-white/5 border border-white/10 p-8">
          <h3 className="font-display font-bold text-xl text-white mb-3">Ready to view what we have built?</h3>
          <p className="text-xs text-white/60 max-w-md mx-auto mb-6">
            Get started with our free tier option immediately or compare premium plans tailored to your engineering workflows.
          </p>
          <div className="flex gap-4 justify-center">
            <Link to="/pricing" className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl text-xs flex items-center gap-2 hover:shadow-lg hover:shadow-indigo-500/20 hover:from-indigo-500 hover:to-purple-500 transition-all active:scale-95">
              Compare Plans <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
