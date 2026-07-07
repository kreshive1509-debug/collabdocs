import React from "react";
import { Link } from "react-router-dom";
import { Github, Linkedin, Twitter, FileText, Heart } from "lucide-react";

export default function Footer() {
  return (
    <footer className="w-full bg-[#030303] border-t border-white/10 py-16 text-white/60">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-5 gap-12 mb-12">
        {/* Company Column */}
        <div className="md:col-span-2 space-y-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-lg text-white">CollabDocs</span>
          </div>
          <p className="text-xs text-white/40 leading-relaxed max-w-sm">
            CollabDocs by Veltora IT Solution is a secure, military-grade collaborative workspace designed for high-performance engineering, product, and creative teams to align document workflows effortlessly.
          </p>
          <div className="flex gap-4">
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="p-2 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white rounded-xl transition-all">
              <Github className="w-4 h-4" />
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="p-2 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white rounded-xl transition-all">
              <Linkedin className="w-4 h-4" />
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="p-2 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white rounded-xl transition-all">
              <Twitter className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Product Links */}
        <div className="space-y-4">
          <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Product</h4>
          <ul className="space-y-2.5 text-xs">
            <li>
              <Link to="/" className="hover:text-white transition-colors">Premium Features</Link>
            </li>
            <li>
              <Link to="/pricing" className="hover:text-white transition-colors">Pricing Plans</Link>
            </li>
            <li>
              <Link to="/dashboard" className="hover:text-white transition-colors">Workspace Demo</Link>
            </li>
            <li>
              <a href="#templates" className="hover:text-white transition-colors">Document Templates</a>
            </li>
          </ul>
        </div>

        {/* Resources */}
        <div className="space-y-4">
          <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Resources</h4>
          <ul className="space-y-2.5 text-xs">
            <li>
              <a href="#docs" className="hover:text-white transition-colors">Platform API Docs</a>
            </li>
            <li>
              <a href="#help" className="hover:text-white transition-colors">Help & Tutorials</a>
            </li>
            <li>
              <a href="#status" className="hover:text-white transition-colors">Server Status</a>
            </li>
            <li>
              <Link to="/about" className="hover:text-white transition-colors">About Us</Link>
            </li>
          </ul>
        </div>

        {/* Legal */}
        <div className="space-y-4">
          <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Legal</h4>
          <ul className="space-y-2.5 text-xs">
            <li>
              <a href="#privacy" className="hover:text-white transition-colors">Privacy Policy</a>
            </li>
            <li>
              <a href="#terms" className="hover:text-white transition-colors">Terms of Service</a>
            </li>
            <li>
              <a href="#security" className="hover:text-white transition-colors">Security Standards</a>
            </li>
            <li>
              <a href="#support" className="hover:text-white transition-colors">Customer Support</a>
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-8 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-white/40">
        <p>© 2026 CollabDocs. All rights reserved by Veltora IT Solution.</p>
        <p className="flex items-center gap-1">
          Made with <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> by{" "}
          <span className="font-semibold text-white/80 hover:text-indigo-400 transition-colors">Veltora IT Solution</span>
        </p>
      </div>
    </footer>
  );
}
