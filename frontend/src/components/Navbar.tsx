import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../store/useStore";
import { 
  FileText, 
  Sun, 
  Moon, 
  Menu, 
  X, 
  Plus, 
  User, 
  Settings, 
  LogOut, 
  ChevronDown,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function Navbar() {
  const { theme, toggleTheme, user, logout, createDocument } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const navigate = useNavigate();

  const handleCreateDoc = async () => {
    const doc = await createDocument("New Document Draft", null);
    if (doc) {
      navigate(`/dashboard?tab=files&doc=${doc.id}`);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
        {/* Logo and Brand */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-300">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-display font-bold text-xl tracking-tight bg-gradient-to-r from-white via-indigo-200 to-white bg-clip-text text-transparent">
              CollabDocs
            </span>
            <span className="hidden sm:block text-[9px] font-semibold text-white/40 uppercase tracking-widest leading-none">
              Veltora IT Solution
            </span>
          </div>
        </Link>

        {/* Desktop Nav Items */}
        <div className="hidden md:flex items-center gap-8">
          <Link to="/" className="text-sm font-medium text-white/60 hover:text-white transition-colors">
            Home
          </Link>
          <Link to="/about" className="text-sm font-medium text-white/60 hover:text-white transition-colors">
            About
          </Link>
          <Link to="/pricing" className="text-sm font-medium text-white/60 hover:text-white transition-colors">
            Pricing
          </Link>
          {user && (
            <Link to="/dashboard" className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" /> Workspace
            </Link>
          )}
        </div>

        {/* Desktop CTAs and User Profile */}
        <div className="hidden md:flex items-center gap-4">
          {/* Theme Toggle */}
          <button 
            onClick={toggleTheme}
            className="p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-indigo-400 transition-all active:scale-95"
            aria-label="Toggle Theme"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {user ? (
            <div className="flex items-center gap-3">
              <button
                onClick={handleCreateDoc}
                className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-lg shadow-indigo-500/20 hover:from-indigo-500 hover:to-purple-500 active:scale-95 transition-all duration-200"
              >
                <Plus className="w-4 h-4" /> New Doc
              </button>

              {/* Profile Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-1.5 hover:opacity-90 transition-opacity focus:outline-none"
                >
                  <img
                    src={user.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop"}
                    alt={user.displayName || "User Avatar"}
                    className="w-10 h-10 rounded-xl object-cover border border-white/10"
                  />
                  <ChevronDown className="w-4 h-4 text-white/40" />
                </button>

                <AnimatePresence>
                  {profileOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#0a0a0c] border border-white/10 p-2 z-50 shadow-2xl"
                      >
                        <div className="px-3 py-2.5 border-b border-white/10 mb-1.5">
                          <p className="text-xs font-semibold text-white truncate">{user.displayName || "User"}</p>
                          <p className="text-[10px] text-white/40 truncate">{user.email}</p>
                        </div>
                        <Link 
                          to="/dashboard"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-white/60 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                        >
                          <User className="w-4 h-4 text-indigo-400" /> My Dashboard
                        </Link>
                        <button
                          onClick={() => {
                            setProfileOpen(false);
                            navigate("/dashboard?tab=settings");
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-white/60 hover:text-white hover:bg-white/5 rounded-xl transition-all text-left"
                        >
                          <Settings className="w-4 h-4 text-indigo-400" /> Settings
                        </button>
                        <hr className="border-white/10 my-1.5" />
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-all text-left"
                        >
                          <LogOut className="w-4 h-4" /> Log Out
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link to="/login" className="text-xs font-medium text-white/60 hover:text-white px-4 py-2.5 rounded-xl hover:bg-white/5 transition-all">
                Sign In
              </Link>
              <Link to="/register" className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-lg shadow-indigo-500/20 hover:from-indigo-500 hover:to-purple-500 transition-all active:scale-95">
                Get Started
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="flex md:hidden items-center gap-3">
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-white/5 border border-white/10 text-indigo-400"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/80"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-[#030303] border-b border-white/10 px-6 pb-6 overflow-hidden flex flex-col gap-4"
          >
            <Link to="/" onClick={() => setIsOpen(false)} className="text-sm font-medium text-white/60 py-2">
              Home
            </Link>
            <Link to="/about" onClick={() => setIsOpen(false)} className="text-sm font-medium text-white/60 py-2">
              About
            </Link>
            <Link to="/pricing" onClick={() => setIsOpen(false)} className="text-sm font-medium text-white/60 py-2">
              Pricing
            </Link>
            {user && (
              <Link to="/dashboard" onClick={() => setIsOpen(false)} className="text-sm font-medium text-indigo-400 py-2 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> Workspace
              </Link>
            )}
            <hr className="border-white/10" />

            {user ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={user.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop"}
                    alt="User"
                    className="w-10 h-10 rounded-xl object-cover"
                  />
                  <div>
                    <p className="text-xs font-semibold text-white">{user.displayName || "User"}</p>
                    <p className="text-[10px] text-white/40">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    handleCreateDoc();
                  }}
                  className="w-full text-center bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl text-xs font-semibold shadow-lg shadow-indigo-500/20"
                >
                  Create Document
                </button>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    logout();
                  }}
                  className="w-full text-center bg-rose-500/10 text-rose-400 py-3 rounded-xl text-xs font-semibold"
                >
                  Log Out
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Link to="/login" onClick={() => setIsOpen(false)} className="w-full text-center bg-white/5 text-white py-3 rounded-xl text-xs font-medium border border-white/10">
                  Sign In
                </Link>
                <Link to="/register" onClick={() => setIsOpen(false)} className="w-full text-center bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl text-xs font-semibold shadow-lg shadow-indigo-500/20">
                  Get Started
                </Link>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
