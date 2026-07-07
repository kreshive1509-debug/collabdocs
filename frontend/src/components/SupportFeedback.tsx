import React, { useState, useEffect } from "react";
import { Send, Mail } from "lucide-react";
import { useStore } from "../store/useStore";

export default function SupportFeedback() {
  const [formData, setFormData] = useState({
    name: "",
    contact: "",
    email: "",
    type: "Feedback",
    issue: ""
  });
  const { user } = useStore();

  useEffect(() => {
    if (user?.email) {
      setFormData(prev => ({ ...prev, email: user.email! }));
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch("/api/support/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("collabdocs_token")}`
        },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        alert("Thank you! Your submission has been received.");
        setFormData({ name: "", contact: "", email: "", type: "Feedback", issue: "" });
      } else {
        alert("Failed to send. Please try again.");
      }
    } catch (error) {
      console.error("Submission error:", error);
      alert("An error occurred. Please try again.");
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-display font-bold text-white tracking-tight">Support & Feedback</h2>
        <p className="text-sm text-white/60">We'd love to hear from you. Please fill out the form below to share your concerns or feedback.</p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
        <input
          type="text"
          placeholder="Name"
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-indigo-500/50"
          required
        />
        <input
          type="text"
          placeholder="Contact Number"
          value={formData.contact}
          onChange={(e) => setFormData({...formData, contact: e.target.value})}
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-indigo-500/50"
          required
        />
        <input
          type="email"
          placeholder="Email ID"
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-indigo-500/50"
          required
          readOnly={!!user?.email}
        />
        <select
          value={formData.type}
          onChange={(e) => setFormData({...formData, type: e.target.value})}
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500/50"
        >
          <option value="Feedback">Feedback</option>
          <option value="Complaint">Complaint</option>
        </select>
        <textarea
          placeholder="Describe your issue or feedback..."
          value={formData.issue}
          onChange={(e) => setFormData({...formData, issue: e.target.value})}
          className="w-full h-32 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-indigo-500/50"
          required
        />
        <button
          type="submit"
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold uppercase tracking-wide text-white transition-all"
        >
          Send via Email
          <Send className="w-4 h-4" />
        </button>
        <p className="text-[10px] text-white/40 text-center italic">By submitting, your default email client will open to send this request.</p>
      </form>
    </div>
  );
}
