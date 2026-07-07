import React, { useState, useEffect } from "react";
import { useStore } from "../store/useStore";
import { Link, useNavigate } from "react-router-dom";
import { 
  Building2, 
  Users, 
  TrendingUp, 
  CreditCard, 
  HardDrive, 
  Activity, 
  ShieldAlert, 
  ArrowLeft, 
  RotateCcw, 
  Check, 
  Settings, 
  Briefcase,
  AlertCircle,
  FileText
} from "lucide-react";
import { motion } from "motion/react";
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from "recharts";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { token, user } = useStore();
  const [stats, setStats] = useState<any | null>(null);
  const [health, setHealth] = useState<any | null>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [dbProviderStatus, setDbProviderStatus] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Administrative customer support overrides state
  const [supportUserId, setSupportUserId] = useState<string | null>(null);
  const [overridePlan, setOverridePlan] = useState("pro_monthly");
  const [overrideStatus, setOverrideStatus] = useState("active");
  const [overrideBilling, setOverrideBilling] = useState("paid");
  const [overrideRole, setOverrideRole] = useState("user");
  const [isSavingOverride, setIsSavingOverride] = useState(false);
  const [isProviderActionLoading, setIsProviderActionLoading] = useState(false);

  // Guard access early
  const isVeltoraAdmin = user && (
    user.email === "system@veltora.com" || 
    user.email.endsWith("@veltora.com") || 
    user.email === "kreshivesrivastava@gmail.com" || 
    user.email === "veltoraitsolution2026@gmail.com" ||
    user.role === "admin" ||
    user.role === "super_admin"
  );

  useEffect(() => {
    if (!token || !isVeltoraAdmin) {
      setErrorMessage("Unauthorized. Administrative permissions are restricted to @veltora.com or verified administrative nodes.");
      setLoading(false);
      return;
    }

    const fetchAdminData = async () => {
      try {
        setLoading(true);
        // Fetch stats, users list, health, and provider status
        const [statsRes, usersRes, healthRes, providerRes] = await Promise.all([
          fetch("/api/admin/stats", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/admin/users", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/health"),
          fetch("/api/admin/database-provider-status", { headers: { Authorization: `Bearer ${token}` } })
        ]);

        if (!statsRes.ok || !usersRes.ok) {
          throw new Error("Failed to load platform stats or user databases.");
        }

        const statsData = await statsRes.json();
        const usersData = await usersRes.json();
        const healthData = healthRes.ok ? await healthRes.json() : null;
        const providerData = providerRes.ok ? await providerRes.json() : null;

        setStats(statsData);
        setUsersList(usersData);
        setHealth(healthData);
        setDbProviderStatus(providerData);
        setErrorMessage(null);
      } catch (error: any) {
        console.error("Admin data query fail:", error);
        setErrorMessage(error?.message || "Failed to retrieve administrative data.");
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, [token, refreshTrigger]);

  const handleApplyOverride = async (userId: string) => {
    if (!token) return;
    setIsSavingOverride(true);
    try {
      const renewalDate = new Date();
      renewalDate.setDate(renewalDate.getDate() + (overridePlan === "pro_monthly" ? 30 : 365));

      const [resPlan, resRole] = await Promise.all([
        fetch(`/api/admin/users/${userId}/plan`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            plan: overridePlan,
            planStatus: overrideStatus,
            billingStatus: overrideBilling,
            renewalDate: renewalDate.toISOString()
          })
        }),
        fetch(`/api/admin/users/${userId}/role`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            role: overrideRole
          })
        })
      ]);

      if (!resPlan.ok) throw new Error("Failed to apply plan overrides.");
      if (!resRole.ok) throw new Error("Failed to apply role overrides.");
      
      setSupportUserId(null);
      setRefreshTrigger(prev => prev + 1);
      alert("License and Role override applied successfully!");
    } catch (e: any) {
      alert("Override execution failed: " + e.message);
    } finally {
      setIsSavingOverride(false);
    }
  };

  const handleSetDatabaseProvider = async (provider: string) => {
    if (!token) return;
    setIsProviderActionLoading(true);
    try {
      const res = await fetch("/api/admin/database-provider", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ provider })
      });

      if (!res.ok) {
        const errorBody = await res.json();
        throw new Error(errorBody.error || "Failed to change database provider.");
      }

      setRefreshTrigger(prev => prev + 1);
      alert(`Active database provider set to ${provider}.`);
    } catch (e: any) {
      alert(e.message || "Failed to change database provider.");
    } finally {
      setIsProviderActionLoading(false);
    }
  };

  const handleResetDatabaseProvider = async () => {
    if (!token) return;
    setIsProviderActionLoading(true);
    try {
      const res = await fetch("/api/admin/database-provider", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const errorBody = await res.json();
        throw new Error(errorBody.error || "Failed to reset database provider override.");
      }

      setRefreshTrigger(prev => prev + 1);
      alert("Database provider override reset. Auto-failover will resume.");
    } catch (e: any) {
      alert(e.message || "Failed to reset database provider override.");
    } finally {
      setIsProviderActionLoading(false);
    }
  };

  const handleToggleAutoFailover = async () => {
    if (!token) return;
    setIsProviderActionLoading(true);
    try {
      const enabled = !dbProviderStatus?.autoFailoverEnabled;
      const res = await fetch("/api/admin/database-provider/failover", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ enabled })
      });

      if (!res.ok) {
        const errorBody = await res.json();
        throw new Error(errorBody.error || "Failed to update failover setting.");
      }

      setRefreshTrigger(prev => prev + 1);
    } catch (e: any) {
      alert(e.message || "Failed to update failover setting.");
    } finally {
      setIsProviderActionLoading(false);
    }
  };

  if (!isVeltoraAdmin) {
    return (
      <div className="min-h-screen bg-[#030303] text-white flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-display font-black tracking-tight">Access Control Breach</h3>
        <p className="text-sm text-white/50 max-w-sm mt-2 leading-relaxed">
          The administrative diagnostic console is restricted to official developer nodes ending with **@veltora.com**.
        </p>
        <Link to="/dashboard" className="mt-6 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Return to Workspace Dashboard
        </Link>
      </div>
    );
  }

  const COLORS = ["#4f46e5", "#8b5cf6", "#ec4899", "#10b981"];

  return (
    <div className="min-h-screen bg-[#040406] text-white p-6 md:p-10 space-y-8 select-none">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-[10px] text-indigo-400 font-bold uppercase tracking-widest">
            <Building2 className="w-3.5 h-3.5" /> Veltora IT Solution Platform
          </div>
          <h1 className="text-3xl font-display font-black tracking-tight mt-1">SaaS Administrator Console</h1>
          <p className="text-xs text-white/50 mt-1">Monitor real-time subscription revenues, storage bounds, and customer lifecycles.</p>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={() => setRefreshTrigger(prev => prev + 1)}
            disabled={loading}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 transition-all border border-white/10 flex items-center gap-1.5 text-xs font-bold disabled:opacity-40"
          >
            <RotateCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Reload Metrics
          </button>
          <Link 
            to="/dashboard" 
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/10"
          >
            <ArrowLeft className="w-4 h-4" /> Workspace
          </Link>
        </div>
      </div>

      {loading && !stats ? (
        <div className="text-center py-20 text-white/40 text-xs font-mono animate-pulse">
          Quering master database collections...
        </div>
      ) : errorMessage ? (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-xs text-red-400 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>{errorMessage}</span>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* STATS BENTO TILES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Total Registered Users */}
            <div className="p-5 bg-white/3 border border-white/5 rounded-2xl space-y-2 relative overflow-hidden">
              <div className="absolute top-4 right-4 text-white/20"><Users className="w-5 h-5" /></div>
              <span className="text-[10px] text-white/40 uppercase tracking-wider font-mono">Platform Accounts</span>
              <div className="text-3xl font-black font-mono">{stats?.metrics?.totalUsers || 0}</div>
              <div className="text-[10px] text-emerald-400">● Live User Instances</div>
            </div>

            {/* Active Subscriptions */}
            <div className="p-5 bg-white/3 border border-white/5 rounded-2xl space-y-2 relative overflow-hidden">
              <div className="absolute top-4 right-4 text-indigo-400/20"><TrendingUp className="w-5 h-5" /></div>
              <span className="text-[10px] text-white/40 uppercase tracking-wider font-mono">Paid Pro Members</span>
              <div className="text-3xl font-black font-mono text-indigo-300">{stats?.metrics?.proUsersCount || 0}</div>
              <div className="text-[10px] text-white/45">Conversion: {(((stats?.metrics?.proUsersCount || 0) / (stats?.metrics?.totalUsers || 1)) * 100).toFixed(0)}%</div>
            </div>

            {/* Monthly Recurring Revenue */}
            <div className="p-5 bg-gradient-to-br from-indigo-950/20 to-transparent border border-indigo-500/10 rounded-2xl space-y-2 relative overflow-hidden">
              <div className="absolute top-4 right-4 text-indigo-400/30"><CreditCard className="w-5 h-5" /></div>
              <span className="text-[10px] text-indigo-300 uppercase tracking-wider font-mono">Total SaaS Revenue</span>
              <div className="text-3xl font-black font-mono text-indigo-400">${stats?.metrics?.totalRevenue || 0}</div>
              <div className="text-[10px] text-indigo-400/70">From Razorpay Settlement Node</div>
            </div>

            {/* System Health */}
            <div className="p-5 bg-white/3 border border-white/5 rounded-2xl space-y-2 relative overflow-hidden">
              <div className="absolute top-4 right-4 text-purple-400/20"><Activity className="w-5 h-5" /></div>
              <span className="text-[10px] text-white/40 uppercase tracking-wider font-mono">System Load</span>
              <div className="text-3xl font-black font-mono text-purple-400">{stats?.systemHealth?.memoryUsage || "0 MB"}</div>
              <div className="text-[10px] text-purple-400/80">
                MongoDB: <span className={health?.databases?.mongodb?.status === "connected" ? "text-emerald-400" : "text-rose-400"}>
                  {health?.databases?.mongodb?.status || "disconnected"}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="p-5 bg-white/3 border border-white/5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-[10px] text-white/40 uppercase tracking-wider font-mono">Database Provider</div>
                  <div className="text-lg font-semibold text-white mt-1">{dbProviderStatus?.currentProvider || "unknown"}</div>
                  <div className="text-xs text-white/50">{dbProviderStatus?.manualOverride ? "Manual override enabled" : "Auto failover mode"}</div>
                </div>
                <div className="text-right text-xs text-white/50">
                  <div>Auto-failover:</div>
                  <div className={dbProviderStatus?.autoFailoverEnabled ? "text-emerald-300" : "text-rose-300"}>
                    {dbProviderStatus?.autoFailoverEnabled ? "Enabled" : "Disabled"}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {['mongodb', 'firestore', 'local'].map(provider => (
                  <button
                    key={provider}
                    disabled={isProviderActionLoading}
                    onClick={() => handleSetDatabaseProvider(provider)}
                    className={`px-3 py-2 rounded-2xl text-xs font-semibold uppercase transition-all ${dbProviderStatus?.currentProvider === provider ? 'bg-indigo-600 text-white' : 'bg-white/5 text-white/80 hover:bg-white/10'}`}
                  >
                    {provider}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  disabled={isProviderActionLoading}
                  onClick={handleResetDatabaseProvider}
                  className="px-3 py-2 rounded-2xl bg-white/5 text-white/80 hover:bg-white/10 text-xs font-semibold"
                >
                  Reset Override
                </button>
                <button
                  disabled={isProviderActionLoading}
                  onClick={handleToggleAutoFailover}
                  className="px-3 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold"
                >
                  Toggle Auto-failover
                </button>
              </div>

              <div className="space-y-2">
                {dbProviderStatus?.providers?.map((provider: any) => (
                  <div key={provider.provider} className="p-3 rounded-2xl bg-slate-950/20 border border-white/10 text-sm text-white/80">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-white">{provider.provider}</span>
                      <span className={provider.healthy ? 'text-emerald-300' : 'text-rose-300'}>{provider.healthy ? 'Healthy' : 'Unavailable'}</span>
                    </div>
                    <div className="text-[11px] text-white/50">Priority {provider.priority}</div>
                    {provider.lastError ? <div className="text-[11px] text-rose-300 mt-1">Error: {provider.lastError}</div> : null}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ANALYTICS CHARTS GRAPH GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Active User Trends Area Chart */}
            <div className="lg:col-span-2 p-6 bg-white/3 border border-white/5 rounded-2xl space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">Daily & Monthly Active Users (DAU/MAU)</h3>
                <span className="px-2.5 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] font-mono text-white/50">HMR Disabled</span>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats?.charts?.activeUsersGrowth}>
                    <defs>
                      <linearGradient id="colorDau" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorMau" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" />
                    <XAxis dataKey="name" stroke="#ffffff30" fontSize={10} />
                    <YAxis stroke="#ffffff30" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: "#0c0c0e", borderColor: "#ffffff10" }} />
                    <Area type="monotone" dataKey="dau" name="Daily Active Users" stroke="#4f46e5" fillOpacity={1} fill="url(#colorDau)" />
                    <Area type="monotone" dataKey="mau" name="Monthly Active Users" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorMau)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Platform Resource Metrics */}
            <div className="p-6 bg-white/3 border border-white/5 rounded-2xl space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">Cloud Node Infrastructure</h3>
              
              <div className="space-y-4">
                {/* Cloud storage meter */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-white/40">MongoDB Database Size</span>
                    <span className="text-white">{stats?.storageMetrics?.used} / {stats?.storageMetrics?.limit}</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${parseFloat(stats?.storageMetrics?.percentage || "0") * 100}%` }} />
                  </div>
                  <span className="text-[10px] text-white/30 font-mono leading-none block">Capacity used: {stats?.storageMetrics?.percentage}%</span>
                </div>

                <div className="space-y-3 pt-4 border-t border-white/5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-white/40">Server Uptime</span>
                    <span className="font-mono text-white/80">{stats?.systemHealth?.serverUptime}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-white/40">Socket.io Connections</span>
                    <span className="font-mono text-indigo-300 font-bold">{stats?.systemHealth?.socketConnections} tunnels</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-white/40">Engine CPU Load</span>
                    <span className="font-mono text-emerald-400 font-bold">{stats?.systemHealth?.cpuLoad}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-white/40">Average Document Count</span>
                    <span className="font-mono text-white/80">{stats?.metrics?.avgDocsPerUser} / user</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CUSTOMER DATABASE & ADMINISTRATIVE SUPPORT OVERRIDES PANEL */}
          <div className="p-6 bg-[#08080a] border border-white/10 rounded-3xl space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-lg font-display font-black text-white">SaaS Client Accounts Directory</h3>
                <p className="text-xs text-white/50">Modify subscription tiers or override credentials instantly for customer support resolution.</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-white/40 font-mono">
                    <th className="pb-3 font-semibold uppercase tracking-wider">Teammate Identity</th>
                    <th className="pb-3 font-semibold uppercase tracking-wider">Role</th>
                    <th className="pb-3 font-semibold uppercase tracking-wider">Plan Layer</th>
                    <th className="pb-3 font-semibold uppercase tracking-wider">Status</th>
                    <th className="pb-3 font-semibold uppercase tracking-wider">Billing Status</th>
                    <th className="pb-3 font-semibold uppercase tracking-wider">Renewal Date</th>
                    <th className="pb-3 font-semibold uppercase tracking-wider text-right">Administrative Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {usersList.map((usr: any) => (
                    <tr key={usr.id} className="hover:bg-white/[0.02]">
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <img 
                            src={usr.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150"} 
                            alt={usr.displayName} 
                            className="w-8 h-8 rounded-full border border-white/10" 
                          />
                          <div>
                            <div className="font-bold text-white/90">{usr.displayName}</div>
                            <div className="text-[10px] text-white/40 font-mono">{usr.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase font-mono ${usr.role === "super_admin" ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" : usr.role === "admin" ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-white/5 text-white/50"}`}>
                          {usr.role || "user"}
                        </span>
                      </td>
                      <td className="py-4">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase font-mono ${usr.plan !== "free" ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" : "bg-white/5 text-white/50"}`}>
                          {usr.plan.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-4">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${usr.planStatus === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                          {usr.planStatus}
                        </span>
                      </td>
                      <td className="py-4">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${usr.billingStatus === "paid" ? "bg-emerald-500/10 text-emerald-400" : "bg-yellow-500/10 text-yellow-500"}`}>
                          {usr.billingStatus}
                        </span>
                      </td>
                      <td className="py-4 text-white/60 font-mono">
                        {usr.renewalDate ? new Date(usr.renewalDate).toLocaleDateString() : "Never"}
                      </td>
                      <td className="py-4 text-right">
                        <button
                          onClick={() => {
                            setSupportUserId(usr.id);
                            setOverridePlan(usr.plan === "free" ? "pro_monthly" : usr.plan);
                            setOverrideStatus(usr.planStatus || "active");
                            setOverrideBilling(usr.billingStatus || "paid");
                            setOverrideRole(usr.role || "user");
                          }}
                          className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-bold uppercase text-white tracking-wide border border-white/10 transition-all"
                        >
                          Manual Support Override
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUPPORT ADMINISTRATIVE OVERRIDE DIALOG */}
      {supportUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={() => setSupportUserId(null)} />
          <div className="bg-[#0c0c0e] border border-white/10 w-full max-w-md rounded-3xl p-6 relative z-10 space-y-6">
            <h3 className="text-lg font-display font-black text-white">Manual License Override</h3>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-white/40 uppercase tracking-wider block font-mono">User Role</label>
                <select
                  value={overrideRole}
                  onChange={(e) => setOverrideRole(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500/50"
                >
                  <option value="user">Standard User (user)</option>
                  <option value="admin">Administrator (admin)</option>
                  <option value="super_admin">Super Administrator (super_admin)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-white/40 uppercase tracking-wider block font-mono">Subscription Plan</label>
                <select
                  value={overridePlan}
                  onChange={(e) => setOverridePlan(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500/50"
                >
                  <option value="free">Free Plan</option>
                  <option value="pro_monthly">Pro Monthly</option>
                  <option value="pro_yearly">Pro Yearly</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-white/40 uppercase tracking-wider block font-mono">Plan Status</label>
                <select
                  value={overrideStatus}
                  onChange={(e) => setOverrideStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500/50"
                >
                  <option value="active">Active</option>
                  <option value="canceled">Canceled</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-white/40 uppercase tracking-wider block font-mono">Billing Settlement Status</label>
                <select
                  value={overrideBilling}
                  onChange={(e) => setOverrideBilling(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500/50"
                >
                  <option value="paid">Settled (Paid)</option>
                  <option value="unpaid">Unsettled (Unpaid)</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setSupportUserId(null)}
                className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl text-xs uppercase"
              >
                Cancel
              </button>
              <button
                onClick={() => handleApplyOverride(supportUserId)}
                disabled={isSavingOverride}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs uppercase flex items-center justify-center gap-1.5"
              >
                {isSavingOverride ? "Writing changes..." : "Apply Override"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
