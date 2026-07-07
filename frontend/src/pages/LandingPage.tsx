import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  ArrowRight, 
  Bolt, 
  Sparkles, 
  ShieldCheck, 
  BarChart3, 
  Users, 
  ChevronDown, 
  Zap, 
  CheckCircle2, 
  Heart,
  Quote,
  Clock,
  ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useStore } from "../store/useStore";

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useStore();

  // FAQ state
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // Live cursor simulation coordinates
  const [cursors, setCursors] = useState([
    { id: 1, name: "Sarah Chen", color: "from-indigo-500 to-purple-600", x: 120, y: 150 },
    { id: 2, name: "Marco Rossi", color: "from-purple-500 to-pink-500", x: 450, y: 280 },
    { id: 3, name: "David Chen", color: "from-indigo-400 to-blue-400", x: 720, y: 110 }
  ]);

  // Periodically move cursors to simulate live collaboration
  useEffect(() => {
    const interval = setInterval(() => {
      setCursors(prev => prev.map(c => ({
        ...c,
        x: c.x + (Math.random() * 40 - 20),
        y: c.y + (Math.random() * 30 - 15)
      })));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleStartFree = () => {
    if (user) {
      navigate("/dashboard");
    } else {
      navigate("/register");
    }
  };

  const faqs = [
    {
      q: "How does real-time conflict resolution work in CollabDocs?",
      a: "We utilize our proprietary, state-of-the-art Conflict-Free Replicated Data Type (CRDT) engine. This means updates are processed locally on the client with 4ms latency and decentralized at the peer level, resulting in zero conflicts and seamless offline drafts."
    },
    {
      q: "Can I connect my own Firebase database and OAuth accounts?",
      a: "Absolutely. CollabDocs is built with modular Veltora Enterprise architecture. By inputting your Firebase SDK keys in your settings or .env file, the client will immediately hot-swap from local mode to secure production-ready Auth and cloud persistence."
    },
    {
      q: "Is my corporate data protected under strict compliance?",
      a: "Yes. All client connections are protected with AES-256 end-to-end encryption. Enterprise plan tier includes custom SSO, OAuth scopes, SAML integration, and isolated container databases upon request."
    }
  ];

  return (
    <div className="min-h-screen bg-[#030303] text-white pt-20 overflow-x-hidden relative">
      {/* Dynamic Background Shader & Ambient Grids */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-black via-[#030303] to-[#030303] -z-10" />
      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-to-tr from-indigo-600/10 to-purple-600/5 blur-[150px] rounded-full -z-10" />

      {/* Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:40px_40px] -z-10" />

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-16 pb-24 text-center">
        {/* Release Pill Tag */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8 hover:border-indigo-500/50 transition-colors cursor-pointer"
          onClick={() => navigate("/pricing")}
        >
          <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
          <span className="font-mono text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
            CollabDocs v2.0 Release Available
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-indigo-400" />
        </motion.div>

        {/* Headings */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.8 }}
          className="font-display font-bold text-5xl md:text-7xl lg:text-8xl tracking-tight leading-none text-white mb-6"
        >
          Collaborate <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-300">Faster.</span>
          <br />
          Create <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-indigo-300 to-purple-500">Smarter.</span>
        </motion.h1>

        {/* Paragraph */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="text-base md:text-lg text-white/60 max-w-2xl mx-auto leading-relaxed mb-12"
        >
          The next-generation, high-performance workspace engineered for high-velocity teams. Real-time document precision and localized offline persistence.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-20"
        >
          <button
            onClick={handleStartFree}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-xl text-sm font-semibold shadow-lg shadow-indigo-500/20 hover:from-indigo-500 hover:to-purple-500 active:scale-95 transition-all duration-300"
          >
            Start Building Free <ArrowRight className="w-4 h-4" />
          </button>
          <Link
            to="/pricing"
            className="w-full sm:w-auto flex items-center justify-center bg-white/5 border border-white/10 text-white hover:bg-white/10 px-8 py-4 rounded-xl text-sm font-semibold transition-all"
          >
            Compare Plans
          </Link>
        </motion.div>

        {/* 3D Mockup Container with simulated collaborator cursors */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 1 }}
          className="relative max-w-5xl mx-auto rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-2xl p-4 shadow-2xl overflow-hidden shadow-black group"
        >
          {/* Ambient inner shadow highlight */}
          <div className="absolute inset-0 rounded-[32px] border border-white/10 pointer-events-none" />

          {/* Dummy Document Canvas UI with simulated cursors */}
          <div className="relative aspect-video w-full rounded-2xl bg-black/60 border border-white/10 overflow-hidden p-8 text-left select-none">
            {/* Live Cursor overlays */}
            {cursors.map(c => (
              <motion.div
                key={c.id}
                style={{ left: c.x, top: c.y }}
                className="absolute flex flex-col items-start pointer-events-none z-30"
                transition={{ type: "spring", stiffness: 80, damping: 20 }}
              >
                {/* Simulated Mouse Pointer SVG */}
                <svg className="w-5 h-5 text-indigo-400 drop-shadow-md fill-current" viewBox="0 0 24 24">
                  <path d="M4.5 3v15.2l3.8-3.8 4.7 9.8 2.8-1.3-4.7-9.8 6-.6z" />
                </svg>
                {/* Username chip */}
                <div className={`px-2 py-0.5 rounded-md text-[9px] font-bold text-white shadow-lg bg-gradient-to-r ${c.color} whitespace-nowrap ml-3 mt-1`}>
                  {c.name}
                </div>
              </motion.div>
            ))}

            {/* Simulated UI Content */}
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-indigo-400 mb-6 font-mono text-xs">
                <Zap className="w-4 h-4 text-indigo-400" />
                <span>active_collaboration_session: SOLAR_FLOW_DECK</span>
              </div>
              <h2 className="font-display font-black text-3xl md:text-4xl text-white mb-4">
                Platform Scalability Brief: Q4 Specifications
              </h2>
              <div className="h-1.5 w-32 bg-indigo-500 rounded-full mb-8" />
              <p className="text-sm md:text-base text-white/60 mb-6 leading-relaxed">
                Our collaborative protocol must scale to thousands of simultaneous users. By implementing isolated CRDT nodes, we bypass centralized thread locks, reducing rendering latency to a blazing-fast <strong className="text-white">4ms</strong> on both web and native targets.
              </p>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 border-l-2 border-l-indigo-500 mb-6">
                <p className="text-xs italic text-white/80 font-mono">
                  "The real-time platform shouldn't lock draft memory when packet roundtrips delay server updates."
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-[10px] text-indigo-400 font-semibold uppercase tracking-wider">
                  #architecture
                </span>
                <span className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-[10px] text-indigo-400 font-semibold uppercase tracking-wider">
                  #crdt
                </span>
                <span className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-[10px] text-indigo-400 font-semibold uppercase tracking-wider">
                  #veltora
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Trusted By Logos */}
      <section className="w-full py-16 border-y border-white/10 bg-black/40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-[10px] font-semibold text-indigo-400 uppercase tracking-[0.3em] mb-8">
            Powering document ecosystems at world-class companies
          </p>
          <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-50 grayscale hover:opacity-80 transition-opacity duration-300">
            <span className="font-display font-bold text-2xl tracking-tighter text-white">Apple Inc.</span>
            <span className="font-display font-bold text-2xl tracking-tighter text-white">Stripe</span>
            <span className="font-display font-bold text-2xl tracking-tighter text-white">Salesforce</span>
            <span className="font-display font-bold text-2xl tracking-tighter text-white">SpaceX</span>
            <span className="font-display font-bold text-2xl tracking-tighter text-white">Figma</span>
          </div>
        </div>
      </section>

      {/* Features Bento Grid */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <h2 className="font-display font-bold text-4xl md:text-5xl text-white">
            Built for Extreme Precision
          </h2>
          <p className="text-sm text-white/60">
            Every layer of CollabDocs is built to remove friction and support high-throughput content management.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Feature 1: Wide */}
          <div className="md:col-span-8 rounded-[24px] bg-white/5 border border-white/10 p-8 flex flex-col justify-between hover:bg-white/10 transition-all group overflow-hidden relative">
            <div className="max-w-md relative z-10">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20 mb-6 group-hover:scale-105 transition-transform">
                <Bolt className="w-5 h-5" />
              </div>
              <h3 className="font-display font-bold text-2xl text-white mb-3">Zero Latency Synchronization</h3>
              <p className="text-xs text-white/60 leading-relaxed">
                Engineered with high-throughput conflict resolution. Every keystroke is saved instantly and synchronized across concurrent editors in under 4 milliseconds. No lock screens, no round-trips.
              </p>
            </div>
            {/* Visual background item */}
            <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -z-10 group-hover:bg-indigo-600/20 transition-all" />
          </div>

          {/* Feature 2: High */}
          <div className="md:col-span-4 rounded-[24px] bg-white/5 border border-white/10 p-8 flex flex-col justify-between hover:border-indigo-500/50 transition-all relative">
            <div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center mb-6">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <h3 className="font-display font-bold text-2xl text-white mb-3">Document Templates</h3>
              <p className="text-xs text-white/60 leading-relaxed">
                Generate outlines, summarize engineering specs, fix style errors, and refine draft documentation directly in your workspace using our template library.
              </p>
            </div>
            <Link to="/pricing" className="mt-8 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1.5">
              Explore Pricing <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Feature 3: Small */}
          <div className="md:col-span-4 rounded-[24px] bg-white/5 border border-white/10 p-8 flex flex-col justify-between hover:bg-white/10 transition-all group">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 mb-6 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-xl text-white mb-2">Military-Grade Security</h3>
              <p className="text-xs text-white/60 leading-relaxed">
                Protect sensitive intellectual property with state-of-the-art end-to-end encryption. Toggle user permissions, invite guests, and integrate customized SSO flows.
              </p>
            </div>
          </div>

          {/* Feature 4: Wide */}
          <div className="md:col-span-8 rounded-[24px] bg-white/5 border border-white/10 p-8 flex flex-col md:flex-row items-center gap-8 hover:bg-white/10 transition-all group overflow-hidden">
            <div className="flex-1">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20 mb-6 group-hover:scale-105 transition-transform">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="font-display font-bold text-2xl text-white mb-3">Advanced Collaboration Analytics</h3>
              <p className="text-xs text-white/60 leading-relaxed">
                Examine document workflow streams with elegant bento-styled engagement statistics. Map team velocities, draft updates, and revision volume seamlessly.
              </p>
            </div>
            {/* Visual graph markup */}
            <div className="w-full md:w-64 h-32 bg-black/60 rounded-xl border border-white/10 flex items-end justify-around p-4">
              <div className="h-[70%] w-3 bg-indigo-600 rounded-t-md animate-pulse" />
              <div className="h-[40%] w-3 bg-purple-600 rounded-t-md" />
              <div className="h-[90%] w-3 bg-indigo-300 rounded-t-md animate-pulse" />
              <div className="h-[60%] w-3 bg-amber-400 rounded-t-md" />
              <div className="h-[80%] w-3 bg-amber-500 rounded-t-md animate-pulse" />
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="max-w-7xl mx-auto px-6 py-16 text-center border-t border-white/10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <h4 className="font-display font-black text-4xl md:text-5xl text-white mb-2">₹0</h4>
            <p className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider">Free Tier Entry</p>
          </div>
          <div>
            <h4 className="font-display font-black text-4xl md:text-5xl text-white mb-2">4ms</h4>
            <p className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider">Keystroke Roundtrip</p>
          </div>
          <div>
            <h4 className="font-display font-black text-4xl md:text-5xl text-white mb-2">50k+</h4>
            <p className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider">Active Workspace Teams</p>
          </div>
          <div>
            <h4 className="font-display font-black text-4xl md:text-5xl text-white mb-2">99.99%</h4>
            <p className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider">Uptime Reliability</p>
          </div>
        </div>
      </section>

      {/* Testimonial Quote */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <div className="relative">
          <Quote className="w-12 h-12 text-indigo-500/20 absolute -top-8 -left-6" />
          <p className="font-display font-medium text-xl md:text-2xl text-white italic leading-relaxed relative z-10 mb-8">
            "CollabDocs has transformed how Veltora IT Solution coordinates technical spec updates. The instant, offline-first save functionality paired with automated suggestions allows our architects to draft blueprints in half the time."
          </p>
          <div className="flex items-center justify-center gap-3">
            <img 
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=128&auto=format&fit=crop" 
              alt="Executive face" 
              className="w-10 h-10 rounded-full object-cover border border-white/10"
            />
            <div className="text-left">
              <h5 className="text-xs font-bold text-white">Kreshive Srivastava</h5>
              <p className="text-[10px] text-white/60">Head of Platform, Veltora IT Solution</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section className="max-w-4xl mx-auto px-6 py-24 border-t border-white/10">
        <div className="text-center mb-16">
          <h2 className="font-display font-bold text-3xl md:text-4xl text-white mb-4">Frequently Asked Questions</h2>
          <p className="text-xs text-white/60">Everything you need to know about the CollabDocs ecosystem.</p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div 
              key={idx} 
              className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden transition-all duration-300"
            >
              <button
                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                className="w-full text-left p-6 flex justify-between items-center gap-4 text-sm md:text-base font-semibold text-white hover:bg-white/10"
              >
                <span>{faq.q}</span>
                <ChevronDown className={`w-4 h-4 text-indigo-400 transition-transform duration-300 ${activeFaq === idx ? "rotate-180" : ""}`} />
              </button>
              
              <AnimatePresence>
                {activeFaq === idx && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="px-6 pb-6 text-xs md:text-sm text-white/60 leading-relaxed border-t border-white/10 pt-4">
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Upgrade Banner */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="rounded-[32px] bg-white/5 border border-white/10 p-12 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl -z-10" />
          <h2 className="font-display font-bold text-3xl md:text-5xl text-white mb-4">
            Ready to streamline your workflow?
          </h2>
          <p className="text-sm text-white/60 max-w-xl mx-auto mb-8">
            Join thousands of developers, architects, and designers using CollabDocs. Set up your team dashboard in under two minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleStartFree}
              className="px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl text-xs hover:shadow-lg hover:shadow-indigo-500/20 hover:from-indigo-500 hover:to-purple-500 transition-all active:scale-95"
            >
              Get Started for Free
            </button>
            <Link
              to="/about"
              className="px-8 py-3.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold rounded-xl text-xs transition-all"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
