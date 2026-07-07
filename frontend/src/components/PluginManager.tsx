import React, { useState, useEffect } from "react";
import { useStore } from "../store/useStore";
import { 
  Puzzle, 
  Calendar as CalendarIcon, 
  Kanban as KanbanIcon, 
  Terminal, 
  Code, 
  Compass, 
  ToggleLeft, 
  ToggleRight, 
  Plus, 
  Trash2, 
  Check, 
  Table, 
  Calculator,
  PenTool,
  RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Legend
} from "recharts";

interface Plugin {
  id: string;
  name: string;
  description: string;
  category: string;
  isEnabled: boolean;
  author: string;
  version: string;
}

export default function PluginManager() {
  const { fetchPlugins, togglePlugin } = useStore();
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [activeTab, setActiveTab] = useState<string>("manager");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Kanban Board Plugin State
  const [kanbanTasks, setKanbanTasks] = useState([
    { id: "1", title: "Complete System Architecture Spec", status: "todo", priority: "high" },
    { id: "2", title: "Integrate Google Gemini LLM API", status: "in_progress", priority: "medium" },
    { id: "3", title: "Configure Razorpay Billing Keys", status: "done", priority: "low" }
  ]);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  // LaTeX Formula State
  const [latexExpression, setLatexExpression] = useState("E = mc^2");

  // D3/Recharts Chart State
  const [chartRange, setChartRange] = useState("30d");
  const [chartType, setChartType] = useState("area");
  const analyticData = [
    { label: "Mon", value: 120 },
    { label: "Tue", value: 210 },
    { label: "Wed", value: 180 },
    { label: "Thu", value: 260 },
    { label: "Fri", value: 310 },
    { label: "Sat", value: 240 },
    { label: "Sun", value: 280 }
  ];

  // Code snippets play
  const [codeSnippet, setCodeSnippet] = useState("console.log('Deploying Veltora IT Solution nodes...');");
  const [codeOutput, setCodeOutput] = useState("");
  const [mermaidDefinition, setMermaidDefinition] = useState("flowchart LR\n  A --> B\n  B --> C\n  C --> D");

  useEffect(() => {
    fetchPlugins().then(data => setPlugins(data || []));
  }, [fetchPlugins]);

  const handleToggle = async (id: string) => {
    setLoadingId(id);
    const res = await togglePlugin(id);
    if (res && res.plugin) {
      setPlugins(prev => prev.map(p => p.id === id ? { ...p, isEnabled: res.plugin.isEnabled } : p));
    }
    setLoadingId(null);
  };

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;
    setKanbanTasks([...kanbanTasks, {
      id: Date.now().toString(),
      title: newTaskTitle,
      status: "todo",
      priority: "medium"
    }]);
    setNewTaskTitle("");
  };

  const moveTask = (taskId: string, targetStatus: string) => {
    setKanbanTasks(kanbanTasks.map(t => t.id === taskId ? { ...t, status: targetStatus } : t));
  };

  const runCode = () => {
    setCodeOutput("Compiling node specifications... Code compiled successfully! Exit Code: 0\nOutput: [CollabDocs Active Client Sync Nodes Connected]");
  };

  const enabledPlugins = plugins.filter(p => p.isEnabled);

  return (
    <div className="flex-1 flex flex-col bg-[#050507] text-white overflow-hidden select-none">
      {/* Upper Control Strip */}
      <div className="px-8 py-4 border-b border-white/5 bg-[#0a0a0d]/90 backdrop-blur-md flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <Puzzle className="w-5 h-5 text-indigo-400" />
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-white">Advanced Plugin Integrations</h2>
            <p className="text-[10px] text-white/40">Augment specifications drafts with agile tools, maths rendering, and code playbooks.</p>
          </div>
        </div>

        {/* Plugin Tab Navigator */}
        <div className="flex gap-1 bg-white/2 p-1 rounded-xl border border-white/5 text-[10px] font-bold uppercase">
          <button
            onClick={() => setActiveTab("manager")}
            className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === "manager" ? "bg-indigo-600 text-white" : "text-white/40 hover:text-white"}`}
          >
            Plugin Marketplace
          </button>
          {enabledPlugins.map((p) => (
            <button
              key={p.id}
              onClick={() => setActiveTab(p.id)}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${activeTab === p.id ? "bg-indigo-600 text-white" : "text-white/40 hover:text-white"}`}
            >
              {p.id === "plugin-calendar" && <CalendarIcon className="w-3.5 h-3.5" />}
              {p.id === "plugin-kanban" && <KanbanIcon className="w-3.5 h-3.5" />}
              {p.id === "plugin-code" && <Terminal className="w-3.5 h-3.5" />}
              {p.id === "plugin-mermaid" && <PenTool className="w-3.5 h-3.5" />}
              {p.id === "plugin-latex" && <Calculator className="w-3.5 h-3.5" />}
              {p.id === "plugin-charts" && <Table className="w-3.5 h-3.5" />}
              <span>{p.name.split(" ")[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Pane */}
      <div className="flex-grow overflow-y-auto p-8 max-w-5xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {activeTab === "manager" && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="space-y-6"
            >
              <h3 className="text-sm font-bold uppercase tracking-wider text-white/60 mb-2">Workspace Marketplace Directory</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {plugins.map((plugin) => (
                  <div
                    key={plugin.id}
                    className="p-5 rounded-2xl border border-white/5 bg-[#0c0c0f] hover:border-indigo-500/10 hover:bg-white/1 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="text-[8px] font-mono font-bold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                          {plugin.category}
                        </span>
                        <span className="text-[9px] font-mono text-white/30">
                          v{plugin.version}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-white">{plugin.name}</h4>
                      <p className="text-[10px] text-white/40 leading-relaxed">{plugin.description}</p>
                    </div>

                    <div className="flex justify-between items-center border-t border-white/5 mt-4 pt-3 text-[9px] text-white/35">
                      <span>Developed by: {plugin.author}</span>
                      <button
                        onClick={() => handleToggle(plugin.id)}
                        disabled={loadingId === plugin.id}
                        className="flex items-center gap-1 text-white hover:text-indigo-400 font-bold transition-colors"
                      >
                        {loadingId === plugin.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                        ) : plugin.isEnabled ? (
                          <ToggleRight className="w-6 h-6 text-indigo-500" />
                        ) : (
                          <ToggleLeft className="w-6 h-6 text-white/20" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Plugin: Shared Agile Kanban board view */}
          {activeTab === "plugin-kanban" && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">Agile Kanban Board Panel</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Enter task item title..."
                    className="px-3.5 py-1.5 bg-white/2 border border-white/10 rounded-xl text-xs focus:outline-none"
                  />
                  <button
                    onClick={handleAddTask}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold uppercase rounded-xl flex items-center gap-1 text-white transition-all"
                  >
                    <Plus className="w-4 h-4" /> Add Card
                  </button>
                </div>
              </div>

              {/* Grid Columns */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {["todo", "in_progress", "done"].map((status) => {
                  const tasks = kanbanTasks.filter(t => t.status === status);
                  return (
                    <div key={status} className="p-4 rounded-2xl bg-[#0b0b0d] border border-white/5 space-y-3 flex flex-col min-h-[300px]">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 capitalize">
                        {status.replace("_", " ")} ({tasks.length})
                      </h4>
                      <div className="flex-grow space-y-2.5">
                        {tasks.map((task) => (
                          <div
                            key={task.id}
                            className="p-3.5 rounded-xl border border-white/5 bg-[#121216] space-y-2 hover:border-indigo-500/20 transition-all cursor-pointer"
                          >
                            <p className="text-xs font-bold text-white/90 leading-relaxed">{task.title}</p>
                            <div className="flex justify-between items-center">
                              <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${task.priority === "high" ? "bg-rose-500/10 text-rose-400" : task.priority === "medium" ? "bg-amber-500/10 text-amber-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                                {task.priority} Priority
                              </span>
                              <div className="flex gap-1.5">
                                {status !== "todo" && (
                                  <button onClick={() => moveTask(task.id, status === "done" ? "in_progress" : "todo")} className="text-[9px] hover:text-indigo-400 uppercase font-bold text-white/40">
                                    ←
                                  </button>
                                )}
                                {status !== "done" && (
                                  <button onClick={() => moveTask(task.id, status === "todo" ? "in_progress" : "done")} className="text-[9px] hover:text-indigo-400 uppercase font-bold text-white/40">
                                    →
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Plugin: Calendar Scheduler */}
          {activeTab === "plugin-calendar" && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="space-y-6"
            >
              <div className="border-b border-white/10 pb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">Interactive Team Calendar</h3>
                <p className="text-[10px] text-white/40">Coordinate document review meetings and release milestones.</p>
              </div>

              {/* Grid 7 Columns for Days */}
              <div className="grid grid-cols-7 gap-1 border border-white/5 p-4 rounded-2xl bg-[#09090b]">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="text-center text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-400 py-1.5 border-b border-white/5">
                    {day}
                  </div>
                ))}
                {Array.from({ length: 31 }).map((_, i) => {
                  const dayNum = i + 1;
                  const hasMeeting = dayNum === 15 || dayNum === 24;
                  return (
                    <div key={i} className="min-h-[70px] p-2 bg-[#121217]/40 border border-white/2 border-dashed flex flex-col justify-between relative hover:bg-white/2 transition-colors">
                      <span className="text-[10px] font-mono font-bold text-white/45">{dayNum}</span>
                      {hasMeeting && (
                        <span className="text-[8px] font-semibold bg-indigo-600 text-white p-1 rounded leading-tight block truncate uppercase select-none">
                          {dayNum === 15 ? "Spec Audit" : "Veltora Launch"}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Plugin: Mermaid Flowchart Generator */}
          {activeTab === "plugin-mermaid" && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="space-y-6"
            >
              <div className="border-b border-white/10 pb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">Mermaid Flowchart Studio</h3>
                <p className="text-[10px] text-white/40">Create technical diagrams directly inside the plugin workspace.</p>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <textarea
                  value={mermaidDefinition}
                  onChange={(e) => setMermaidDefinition(e.target.value)}
                  className="w-full h-60 p-4 rounded-3xl bg-[#0a0a0d] border border-white/10 text-xs text-white font-mono focus:outline-none"
                />
                <div className="p-5 rounded-3xl bg-[#0b0b0d] border border-white/5">
                  <div className="text-[10px] uppercase tracking-widest text-indigo-400 mb-3">Diagram Preview</div>
                  <pre className="whitespace-pre-wrap text-[11px] text-white/70 font-mono">{mermaidDefinition}</pre>
                </div>
              </div>
            </motion.div>
          )}

          {/* Plugin: Code Snippets compiler */}
          {activeTab === "plugin-code" && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="space-y-6"
            >
              <div className="border-b border-white/10 pb-4 flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">Code Snippets playground</h3>
                  <p className="text-[10px] text-white/40">Develop and compile server configurations in-document.</p>
                </div>
                <button
                  onClick={runCode}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-[10px] font-bold uppercase text-white transition-all flex items-center gap-1"
                >
                  <Code className="w-3.5 h-3.5" /> Run Code
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="text-[9px] font-bold uppercase text-white/40 font-mono tracking-widest block">TypeScript Console</span>
                  <textarea
                    value={codeSnippet}
                    onChange={(e) => setCodeSnippet(e.target.value)}
                    className="w-full h-48 bg-[#0a0a0d] border border-white/10 rounded-2xl p-4 font-mono text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-2">
                  <span className="text-[9px] font-bold uppercase text-white/40 font-mono tracking-widest block">System stdout</span>
                  <div className="w-full h-48 bg-black/90 border border-white/10 rounded-2xl p-4 font-mono text-xs text-indigo-400 whitespace-pre-wrap">
                    {codeOutput || "Click 'Run Code' to execute specs."}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Plugin: LaTeX Formulas */}
          {activeTab === "plugin-latex" && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="space-y-6"
            >
              <div className="border-b border-white/10 pb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">LaTeX Mathematical Editor</h3>
                <p className="text-[10px] text-white/40">Compose engineering formulations in LaTeX format.</p>
              </div>

              <div className="p-6 bg-[#0a0a0d] border border-white/5 rounded-2xl space-y-4">
                <input
                  type="text"
                  value={latexExpression}
                  onChange={(e) => setLatexExpression(e.target.value)}
                  className="w-full px-4 py-3 bg-[#111116] border border-white/10 rounded-xl font-mono text-sm text-white focus:outline-none"
                />
                <div className="p-8 border border-white/5 border-dashed rounded-xl bg-white/2 text-center text-lg font-mono text-indigo-300">
                  {latexExpression || "No expression compiled."}
                </div>
              </div>
            </motion.div>
          )}

          {/* Plugin: D3/Recharts Analytics Visualizer */}
          {activeTab === "plugin-charts" && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="space-y-6"
            >
              <div className="border-b border-white/10 pb-4 flex flex-col md:flex-row md:justify-between md:items-center gap-3">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">Analytics Visualizer</h3>
                  <p className="text-[10px] text-white/40">Generate responsive chart dashboards from live workspace stats.</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setChartRange("7d")}
                    className={`px-3 py-1.5 rounded-xl text-[10px] uppercase font-bold ${chartRange === "7d" ? "bg-indigo-600 text-white" : "bg-white/5 text-white/60 hover:text-white"}`}
                  >
                    7d
                  </button>
                  <button
                    onClick={() => setChartRange("30d")}
                    className={`px-3 py-1.5 rounded-xl text-[10px] uppercase font-bold ${chartRange === "30d" ? "bg-indigo-600 text-white" : "bg-white/5 text-white/60 hover:text-white"}`}
                  >
                    30d
                  </button>
                  <button
                    onClick={() => setChartType("area")}
                    className={`px-3 py-1.5 rounded-xl text-[10px] uppercase font-bold ${chartType === "area" ? "bg-indigo-600 text-white" : "bg-white/5 text-white/60 hover:text-white"}`}
                  >
                    Area
                  </button>
                  <button
                    onClick={() => setChartType("bar")}
                    className={`px-3 py-1.5 rounded-xl text-[10px] uppercase font-bold ${chartType === "bar" ? "bg-indigo-600 text-white" : "bg-white/5 text-white/60 hover:text-white"}`}
                  >
                    Bar
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div className="p-5 rounded-3xl bg-[#0b0b0d] border border-white/5">
                  <ResponsiveContainer width="100%" height={320}>
                    {chartType === "area" ? (
                      <AreaChart data={analyticData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="#1f2937" vertical={false} />
                        <XAxis dataKey="label" stroke="#9ca3af" tickLine={false} />
                        <YAxis stroke="#9ca3af" tickLine={false} />
                        <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155" }} />
                        <Area type="monotone" dataKey="value" stroke="#8b5cf6" fill="url(#colorValue)" strokeWidth={2} />
                      </AreaChart>
                    ) : (
                      <BarChart data={analyticData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                        <CartesianGrid stroke="#1f2937" vertical={false} />
                        <XAxis dataKey="label" stroke="#9ca3af" tickLine={false} />
                        <YAxis stroke="#9ca3af" tickLine={false} />
                        <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155" }} />
                        <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 12 }} />
                        <Bar dataKey="value" fill="#6366f1" radius={[10, 10, 0, 0]} />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-5 rounded-3xl bg-[#0b0b0d] border border-white/5">
                    <h4 className="text-[10px] uppercase tracking-widest text-indigo-400 mb-3">Performance Summary</h4>
                    <p className="text-[11px] text-white/70 leading-relaxed">Weekly collaboration activity and usage spikes are surfaced automatically for team review.</p>
                  </div>
                  <div className="p-5 rounded-3xl bg-[#0b0b0d] border border-white/5">
                    <h4 className="text-[10px] uppercase tracking-widest text-indigo-400 mb-3">Chart Notes</h4>
                    <ul className="space-y-2 text-[11px] text-white/70 list-disc list-inside">
                      <li>Switch to Bar mode for clearer snapshot comparisons.</li>
                      <li>Use 7d range to highlight short-term trends.</li>
                      <li>All chart data is mock-driven for demo purposes.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
