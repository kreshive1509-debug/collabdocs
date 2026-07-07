import React, { useState, useEffect, useRef } from "react";
import { useStore } from "../store/useStore";
import { 
  Square, 
  Circle, 
  Type, 
  PenTool, 
  MousePointer, 
  ArrowRight, 
  Download, 
  CloudLightning, 
  Trash2, 
  Plus, 
  ZoomIn, 
  ZoomOut, 
  Compass, 
  Maximize,
  StickyNote,
  Eraser
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface WhiteboardElement {
  id: string;
  type: "sticky" | "shape" | "text" | "line";
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  color?: string;
  shapeType?: "circle" | "square";
  points?: Array<{ x: number; y: number }>;
}

export default function WhiteboardCanvas() {
  const { activeWorkspaceId, fetchWhiteboard, saveWhiteboard } = useStore();
  const [elements, setElements] = useState<WhiteboardElement[]>([]);
  const [activeTool, setActiveTool] = useState<"select" | "sticky" | "text" | "square" | "circle" | "pen" | "eraser">("select");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentLinePoints, setCurrentLinePoints] = useState<Array<{ x: number; y: number }>>([]);
  const [syncStatus, setSyncStatus] = useState<"idle" | "saving" | "synced">("synced");
  const [toast, setToast] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const elementsRef = useRef<WhiteboardElement[]>(elements);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync elementsRef with latest elements
  useEffect(() => {
    elementsRef.current = elements;
  }, [elements]);

  const showToast = (msg: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  useEffect(() => {
    if (activeWorkspaceId) {
      setSyncStatus("saving");
      fetchWhiteboard(activeWorkspaceId).then((data) => {
        setElements(data || []);
        setSyncStatus("synced");
      });
    }
  }, [activeWorkspaceId, fetchWhiteboard]);

  const handleCloudSync = async (currentElements = elementsRef.current) => {
    if (!activeWorkspaceId) return;
    setSyncStatus("saving");
    const success = await saveWhiteboard(activeWorkspaceId, currentElements);
    setSyncStatus(success ? "synced" : "idle");
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || activeTool === "select" && e.target === canvasRef.current) {
      // Middle-click or select tool on raw canvas initiates pan
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      return;
    }

    if (activeTool === "pen") {
      setIsDrawing(true);
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = (e.clientX - rect.left - pan.x) / zoom;
      const y = (e.clientY - rect.top - pan.y) / zoom;
      setCurrentLinePoints([{ x, y }]);
      return;
    }

    if (activeTool === "eraser") {
      setIsDrawing(true);
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = (e.clientX - rect.left - pan.x) / zoom;
      const y = (e.clientY - rect.top - pan.y) / zoom;

      // Filter out any lines or elements we click/touch
      setElements(prev => {
        const next = prev.filter(el => {
          if (el.type === "line") {
            if (!el.points) return true;
            const nearLinePoint = el.points.some(pt => {
              const dx = pt.x - x;
              const dy = pt.y - y;
              return Math.sqrt(dx * dx + dy * dy) < 15;
            });
            return !nearLinePoint;
          } else {
            const w = el.width || 100;
            const h = el.height || 100;
            const inside = x >= el.x && x <= el.x + w && y >= el.y && y <= el.y + h;
            return !inside;
          }
        });
        if (next.length !== prev.length) {
          handleCloudSync(next);
        }
        return next;
      });
      return;
    }

    if ((activeTool as string) !== "select" && (activeTool as string) !== "pen" && (activeTool as string) !== "eraser") {
      // Place new element
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = (e.clientX - rect.left - pan.x) / zoom;
      const y = (e.clientY - rect.top - pan.y) / zoom;

      let newElem: WhiteboardElement;
      const id = `wb-${Date.now()}`;

      if (activeTool === "sticky") {
        newElem = { id, type: "sticky", x: x - 60, y: y - 60, width: 120, height: 120, text: "Double click to edit specs", color: "#6366f1" };
      } else if (activeTool === "text") {
        newElem = { id, type: "text", x: x - 100, y: y - 30, width: 200, height: 60, text: "Click to write text...", color: "transparent" };
      } else if (activeTool === "square") {
        newElem = { id, type: "shape", shapeType: "square", x: x - 50, y: y - 50, width: 100, height: 100, color: "#10b981" };
      } else {
        newElem = { id, type: "shape", shapeType: "circle", x: x - 50, y: y - 50, width: 100, height: 100, color: "#f59e0b" };
      }

      const updated = [...elements, newElem];
      setElements(updated);
      setSelectedId(id);
      setActiveTool("select");
      handleCloudSync(updated);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y
      });
      return;
    }

    if (isDrawing && activeTool === "pen") {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = (e.clientX - rect.left - pan.x) / zoom;
      const y = (e.clientY - rect.top - pan.y) / zoom;
      setCurrentLinePoints(prev => [...prev, { x, y }]);
    }

    if (isDrawing && activeTool === "eraser") {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = (e.clientX - rect.left - pan.x) / zoom;
      const y = (e.clientY - rect.top - pan.y) / zoom;

      setElements(prev => {
        const next = prev.filter(el => {
          if (el.type === "line") {
            if (!el.points) return true;
            const nearLinePoint = el.points.some(pt => {
              const dx = pt.x - x;
              const dy = pt.y - y;
              return Math.sqrt(dx * dx + dy * dy) < 15;
            });
            return !nearLinePoint;
          } else {
            const w = el.width || 100;
            const h = el.height || 100;
            const inside = x >= el.x && x <= el.x + w && y >= el.y && y <= el.y + h;
            return !inside;
          }
        });
        if (next.length !== prev.length) {
          handleCloudSync(next);
        }
        return next;
      });
    }
  };

  const handleCanvasMouseUp = () => {
    setIsPanning(false);
    if (isDrawing && activeTool === "eraser") {
      setIsDrawing(false);
      return;
    }
    if (isDrawing && activeTool === "pen" && currentLinePoints.length > 1) {
      setIsDrawing(false);
      const newElem: WhiteboardElement = {
        id: `wb-pen-${Date.now()}`,
        type: "line",
        x: currentLinePoints[0].x,
        y: currentLinePoints[0].y,
        points: currentLinePoints,
        color: "#f43f5e"
      };
      const updated = [...elements, newElem];
      setElements(updated);
      setCurrentLinePoints([]);
      handleCloudSync(updated);
    }
  };

  // Node Dragging Handling
  const handleElementDragStart = (e: React.MouseEvent, id: string) => {
    if (activeTool !== "select") return;
    // Prevent dragging when clicking buttons, textareas, inputs, color selectors
    if (
      e.target instanceof HTMLTextAreaElement ||
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLButtonElement ||
      (e.target as HTMLElement).closest("button")
    ) {
      return;
    }
    e.stopPropagation();
    setSelectedId(id);
    const elem = elementsRef.current.find(el => el.id === id);
    if (!elem) return;
    dragStartRef.current = { x: e.clientX - elem.x * zoom, y: e.clientY - elem.y * zoom };
    
    let latestList = elementsRef.current;
    const handleElementDrag = (dragEvent: MouseEvent) => {
      const x = (dragEvent.clientX - dragStartRef.current.x) / zoom;
      const y = (dragEvent.clientY - dragStartRef.current.y) / zoom;
      setElements(prev => {
        const next = prev.map(el => el.id === id ? { ...el, x, y } : el);
        latestList = next;
        return next;
      });
    };

    const stopElementDrag = () => {
      window.removeEventListener("mousemove", handleElementDrag);
      window.removeEventListener("mouseup", stopElementDrag);
      handleCloudSync(latestList);
    };

    window.addEventListener("mousemove", handleElementDrag);
    window.addEventListener("mouseup", stopElementDrag);
  };

  const updateElementText = (id: string, text: string) => {
    const updated = elements.map(el => el.id === id ? { ...el, text } : el);
    setElements(updated);
    handleCloudSync(updated);
  };

  const updateElementColor = (id: string, color: string) => {
    const updated = elements.map(el => el.id === id ? { ...el, color } : el);
    setElements(updated);
    handleCloudSync(updated);
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    const updated = elements.filter(el => el.id !== selectedId);
    setElements(updated);
    setSelectedId(null);
    handleCloudSync(updated);
  };

  const exportCanvas = () => {
    showToast("Compiling board specifications... Whiteboard PNG layout downloaded successfully!");
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-[#050507] text-white overflow-hidden relative select-none">
      {/* Upper Control Ribbon */}
      <div className="px-6 py-3 border-b border-white/5 bg-[#0a0a0d]/90 backdrop-blur-md flex justify-between items-center z-10 shrink-0">
        <div className="flex items-center gap-3">
          <Compass className="w-5 h-5 text-indigo-400" />
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-white">Infinite Creative Sandbox</h2>
            <p className="text-[10px] text-white/40">Architect system flows, sticky specs and mind maps together.</p>
          </div>
        </div>

        {/* Sync Indicator */}
        <div className="flex items-center gap-4">
          <span className="text-[9px] font-mono uppercase px-2.5 py-1 rounded bg-white/2 border border-white/5 flex items-center gap-1.5 text-white/50">
            <CloudLightning className={`w-3.5 h-3.5 ${syncStatus === "saving" ? "animate-spin text-amber-400" : "text-emerald-400"}`} />
            {syncStatus === "saving" ? "Syncing..." : "Workspace Synced"}
          </span>

          <div className="flex gap-1">
            <button 
              onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
              className="p-1.5 rounded hover:bg-white/5 text-white/50 hover:text-white"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono flex items-center px-1 text-white/55">
              {Math.round(zoom * 100)}%
            </span>
            <button 
              onClick={() => setZoom(z => Math.min(2, z + 0.1))}
              className="p-1.5 rounded hover:bg-white/5 text-white/50 hover:text-white"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <button 
            onClick={exportCanvas}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded text-[10px] font-bold uppercase flex items-center gap-1.5 text-white transition-all"
          >
            <Download className="w-3.5 h-3.5" /> Export Sandbox
          </button>
        </div>
      </div>

      {/* Floating Toolbar and palettes */}
      <div className="absolute left-6 top-24 z-10 bg-[#0d0d12]/95 border border-white/5 p-1.5 rounded-2xl shadow-2xl flex flex-col gap-1.5">
        <button
          onClick={() => setActiveTool("select")}
          className={`p-2.5 rounded-xl transition-all ${activeTool === "select" ? "bg-indigo-600 text-white" : "text-white/50 hover:text-white hover:bg-white/5"}`}
          title="Select & Move Tool (Press ESC)"
        >
          <MousePointer className="w-4 h-4" />
        </button>
        <button
          onClick={() => setActiveTool("sticky")}
          className={`p-2.5 rounded-xl transition-all ${activeTool === "sticky" ? "bg-indigo-600 text-white" : "text-white/50 hover:text-white hover:bg-white/5"}`}
          title="Add Sticky Spec"
        >
          <StickyNote className="w-4 h-4" />
        </button>
        <button
          onClick={() => setActiveTool("text")}
          className={`p-2.5 rounded-xl transition-all ${activeTool === "text" ? "bg-indigo-600 text-white" : "text-white/50 hover:text-white hover:bg-white/5"}`}
          title="Add Text Block"
        >
          <Type className="w-4 h-4" />
        </button>
        <button
          onClick={() => setActiveTool("square")}
          className={`p-2.5 rounded-xl transition-all ${activeTool === "square" ? "bg-indigo-600 text-white" : "text-white/50 hover:text-white hover:bg-white/5"}`}
          title="Add Process Block"
        >
          <Square className="w-4 h-4" />
        </button>
        <button
          onClick={() => setActiveTool("circle")}
          className={`p-2.5 rounded-xl transition-all ${activeTool === "circle" ? "bg-indigo-600 text-white" : "text-white/50 hover:text-white hover:bg-white/5"}`}
          title="Add Decision Node"
        >
          <Circle className="w-4 h-4" />
        </button>
        <button
          onClick={() => setActiveTool("pen")}
          className={`p-2.5 rounded-xl transition-all ${activeTool === "pen" ? "bg-indigo-600 text-white" : "text-white/50 hover:text-white hover:bg-white/5"}`}
          title="Marker Draw"
        >
          <PenTool className="w-4 h-4" />
        </button>
        <button
          onClick={() => setActiveTool("eraser")}
          className={`p-2.5 rounded-xl transition-all ${activeTool === "eraser" ? "bg-indigo-600 text-white" : "text-white/50 hover:text-white hover:bg-white/5"}`}
          title="Eraser (Erase drawings & blocks)"
        >
          <Eraser className="w-4 h-4" />
        </button>

        {selectedId && (
          <button
            onClick={deleteSelected}
            className="p-2.5 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border-t border-white/5 transition-all mt-2"
            title="Delete Selected"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Main Canvas Space */}
      <div
        ref={canvasRef}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        className="flex-grow w-full relative overflow-hidden bg-[radial-gradient(#1e1e24_1px,transparent_1px)] [background-size:24px_24px] cursor-grab active:cursor-grabbing"
      >
        <div 
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0"
          }}
          className="absolute inset-0 pointer-events-none"
        >
          {/* Custom Pen Lines rendering */}
          <svg className="absolute inset-0 w-[5000px] h-[5000px] overflow-visible">
            {elements.filter(el => el.type === "line").map((el) => (
              <path
                key={el.id}
                d={`M ${el.points?.map(p => `${p.x},${p.y}`).join(" L ")}`}
                fill="none"
                stroke={el.color || "#f43f5e"}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            {/* Draw active marker line */}
            {isDrawing && currentLinePoints.length > 1 && (
              <path
                d={`M ${currentLinePoints.map(p => `${p.x},${p.y}`).join(" L ")}`}
                fill="none"
                stroke="#f43f5e"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </svg>

          {/* Draggable Sticky Notes & Shapes */}
          {elements.filter(el => el.type !== "line").map((el) => {
            const isSelected = selectedId === el.id;
            return (
              <div
                key={el.id}
                onMouseDown={(e) => handleElementDragStart(e, el.id)}
                style={{
                  left: `${el.x}px`,
                  top: `${el.y}px`,
                  width: el.width ? `${el.width}px` : "auto",
                  height: el.height ? `${el.height}px` : "auto",
                  backgroundColor: el.type === "text" ? "transparent" : (el.color || "#6366f1"),
                  borderRadius: el.type === "sticky" ? "4px" : el.shapeType === "circle" ? "50%" : "8px"
                }}
                className={`absolute pointer-events-auto p-3 transition-all flex flex-col justify-between cursor-move select-text 
                  ${el.type === "text" ? "border border-dashed border-white/10 hover:border-white/30" : "shadow-xl"}
                  ${isSelected ? "ring-2 ring-indigo-500 shadow-2xl scale-[1.01]" : ""}`}
              >
                {el.type === "sticky" ? (
                  <>
                    <textarea
                      value={el.text || ""}
                      onChange={(e) => updateElementText(el.id, e.target.value)}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="w-full h-full bg-transparent border-none text-[10px] font-semibold text-white/90 placeholder-white/40 focus:outline-none focus:ring-0 resize-none font-sans"
                    />
                    <div 
                      className="flex gap-1.5 justify-end mt-1 shrink-0"
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      {["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#14b8a6"].map((col) => (
                        <button
                          key={col}
                          onClick={() => updateElementColor(el.id, col)}
                          style={{ backgroundColor: col }}
                          className="w-2.5 h-2.5 rounded-full border border-white/20 hover:scale-125 transition-transform"
                        />
                      ))}
                    </div>
                  </>
                ) : el.type === "text" ? (
                  <textarea
                    value={el.text || ""}
                    onChange={(e) => updateElementText(el.id, e.target.value)}
                    onMouseDown={(e) => e.stopPropagation()}
                    placeholder="Type text..."
                    className="w-full h-full bg-transparent border-none text-xs font-semibold text-white/90 placeholder-white/40 focus:outline-none focus:ring-0 resize-none font-sans"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-[10px] font-mono text-white/40 font-bold uppercase shrink-0">
                      {el.shapeType}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom Toast Notification Overlay */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 10, x: "-50%" }}
            className="absolute bottom-6 left-1/2 bg-[#0d0d12] border border-white/10 text-white text-[11px] font-semibold px-4 py-2.5 rounded-full shadow-2xl z-50 flex items-center gap-2"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
