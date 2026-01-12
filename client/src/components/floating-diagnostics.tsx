import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  X, 
  Gauge, 
  GitCompare, 
  List, 
  Monitor, 
  Database,
  Download,
  AlertTriangle,
  CheckCircle,
  Search,
  Trash2,
  Pin,
  Minimize2,
  Maximize2,
  GripHorizontal,
  Settings2
} from "lucide-react";
import type { SFDEngine, DiagnosticSolverData, DiagnosticRenderData, DiagnosticInternalsData, DeterminismReport } from "@/lib/sfd-engine";
import type { StructuralEvent } from "@shared/schema";

interface FloatingDiagnosticsProps {
  engine: SFDEngine | null;
  isVisible: boolean;
  onClose: () => void;
  events: StructuralEvent[];
  isRunning: boolean;
  currentHistoryIndex: number;
  historyLength: number;
  colormap: string;
}

function Sparkline({ data, width = 140, height = 28, color = "#10b981" }: { data: number[]; width?: number; height?: number; color?: string }) {
  if (data.length < 2) return <div className="h-7 bg-white/5 rounded" style={{ width }} />;
  
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');
  
  return (
    <svg width={width} height={height} className="bg-white/5 rounded">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StatRow({ label, value, warning, success, mono = true }: { label: string; value: string | number; warning?: boolean; success?: boolean; mono?: boolean }) {
  return (
    <div className="flex justify-between items-center py-0.5">
      <span className="text-xs text-neutral-400">{label}</span>
      <span className={`text-xs ${mono ? 'font-mono' : ''} ${warning ? 'text-amber-400' : success ? 'text-emerald-400' : 'text-neutral-100'}`}>
        {value}
      </span>
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 border-b border-white/5 pb-1 mb-2">
      {children}
    </div>
  );
}

export function FloatingDiagnostics({
  engine,
  isVisible,
  onClose,
  events,
  isRunning,
  currentHistoryIndex,
  historyLength,
  colormap,
}: FloatingDiagnosticsProps) {
  const [activeTab, setActiveTab] = useState<"solver" | "check" | "render" | "internals" | "events" | "advanced">("solver");
  const [solverData, setSolverData] = useState<DiagnosticSolverData | null>(null);
  const [renderData, setRenderData] = useState<DiagnosticRenderData | null>(null);
  const [internalsData, setInternalsData] = useState<DiagnosticInternalsData | null>(null);
  const [determinismReport, setDeterminismReport] = useState<DeterminismReport | null>(null);
  const [isRunningDeterminism, setIsRunningDeterminism] = useState(false);
  const [frameHash, setFrameHash] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const [compactView, setCompactView] = useState(false);
  
  const [isPinned, setIsPinned] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 100, y: 80 });
  const [size, setSize] = useState({ width: 420, height: 520 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const eventLogRef = useRef<HTMLDivElement>(null);
  const updateIntervalRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const isResizingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

  const updateDiagnostics = useCallback(() => {
    if (!engine || !isVisible || isMinimized) return;
    
    setSolverData(engine.getDiagnosticSolverData());
    setFrameHash(engine.computeFrameHash());
    setInternalsData(engine.getDiagnosticInternalsData());
    setRenderData(engine.getDiagnosticRenderData());
  }, [engine, isVisible, isMinimized]);

  useEffect(() => {
    if (isVisible && engine && !isMinimized) {
      updateDiagnostics();
      updateIntervalRef.current = window.setInterval(updateDiagnostics, 100);
    }
    
    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
    };
  }, [isVisible, engine, updateDiagnostics, isMinimized]);

  useEffect(() => {
    if (autoScroll && eventLogRef.current) {
      eventLogRef.current.scrollTop = eventLogRef.current.scrollHeight;
    }
  }, [events, autoScroll]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-no-drag]')) return;
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY, posX: position.x, posY: position.y };
    e.preventDefault();
  }, [position]);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    isResizingRef.current = true;
    resizeStartRef.current = { x: e.clientX, y: e.clientY, width: size.width, height: size.height };
    e.stopPropagation();
    e.preventDefault();
  }, [size]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingRef.current) {
        const dx = e.clientX - dragStartRef.current.x;
        const dy = e.clientY - dragStartRef.current.y;
        setPosition({
          x: Math.max(0, Math.min(window.innerWidth - size.width, dragStartRef.current.posX + dx)),
          y: Math.max(0, Math.min(window.innerHeight - 40, dragStartRef.current.posY + dy)),
        });
      }
      if (isResizingRef.current) {
        const dx = e.clientX - resizeStartRef.current.x;
        const dy = e.clientY - resizeStartRef.current.y;
        setSize({
          width: Math.max(350, Math.min(700, resizeStartRef.current.width + dx)),
          height: Math.max(300, Math.min(800, resizeStartRef.current.height + dy)),
        });
      }
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      isResizingRef.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [size.width]);

  const handleRunDeterminism = useCallback(() => {
    if (!engine) return;
    setIsRunningDeterminism(true);
    
    setTimeout(() => {
      const report = engine.runDeterminismCheck(100);
      setDeterminismReport(report);
      setIsRunningDeterminism(false);
    }, 50);
  }, [engine]);

  const handleExportDiagnostics = useCallback(() => {
    if (!engine) return;
    const data = engine.exportDiagnosticData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sfd-diagnostics-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [engine]);

  const handleExportFrameWindow = useCallback(() => {
    if (!engine) return;
    const data = engine.exportFrameWindow(10);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sfd-frames-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [engine]);

  const handleExportEvents = useCallback(() => {
    const text = events.map(e => `[${e.step}] ${e.type}: ${e.description}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sfd-events-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [events]);

  const filteredEvents = useMemo(() => {
    if (!searchQuery) return events;
    const query = searchQuery.toLowerCase();
    return events.filter(e => 
      e.type.toLowerCase().includes(query) || 
      e.description.toLowerCase().includes(query)
    );
  }, [events, searchQuery]);

  const tabs = [
    { id: "solver" as const, label: "Solver", icon: CheckCircle },
    { id: "check" as const, label: "Check", icon: GitCompare },
    { id: "render" as const, label: "Render", icon: Monitor },
    { id: "internals" as const, label: "Internals", icon: Database },
    { id: "events" as const, label: "Events", icon: List },
    { id: "advanced" as const, label: "Advanced", icon: Settings2 },
  ];

  if (!isVisible) return null;

  return (
    <div
      ref={containerRef}
      className={`fixed flex flex-col transition-all duration-200 ${isMinimized ? 'h-auto' : ''}`}
      style={{
        left: position.x,
        top: position.y,
        width: isMinimized ? 280 : size.width,
        height: isMinimized ? 'auto' : size.height,
        zIndex: isPinned ? 9999 : 100,
        backgroundColor: 'rgba(8, 8, 12, 0.94)',
        border: `1px solid ${isPinned ? 'rgba(251, 191, 36, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`,
        borderRadius: '8px',
        boxShadow: isPinned ? '0 8px 32px rgba(251, 191, 36, 0.15)' : '0 8px 32px rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(8px)',
      }}
      data-testid="floating-diagnostics"
    >
      {/* Header / Drag Handle */}
      <div 
        className="flex items-center justify-between px-3 py-2 border-b border-white/8 cursor-move select-none shrink-0"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <GripHorizontal className="h-3.5 w-3.5 text-neutral-500" />
          <Gauge className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-xs font-medium text-neutral-200">Diagnostics Console</span>
        </div>
        <div className="flex items-center gap-1" data-no-drag>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsPinned(!isPinned)} 
            className={`h-6 w-6 ${isPinned ? 'text-amber-400' : 'text-neutral-500 hover:text-neutral-300'}`}
            data-testid="button-pin-diagnostics"
          >
            <Pin className="h-3 w-3" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsMinimized(!isMinimized)} 
            className="h-6 w-6 text-neutral-500 hover:text-neutral-300"
            data-testid="button-minimize-diagnostics"
          >
            {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose} 
            className="h-6 w-6 text-neutral-500 hover:text-red-400"
            data-testid="button-close-diagnostics"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Tab Bar */}
          <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-white/5 shrink-0 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded transition-colors whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'bg-white/10 text-neutral-100' 
                    : 'text-neutral-500 hover:text-neutral-300 hover:bg-white/5'
                }`}
                data-testid={`tab-${tab.id}`}
              >
                <tab.icon className="h-3 w-3" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-3 min-h-0">
            {activeTab === "solver" && solverData && (
              <div className="space-y-4">
                <div>
                  <SectionHeader>Step & Stability</SectionHeader>
                  <StatRow label="Step" value={solverData.step.toLocaleString()} />
                  <StatRow label="Frame Hash" value={frameHash || "---"} />
                  <StatRow 
                    label="Δt Stability" 
                    value={solverData.isUnstable ? "UNSTABLE" : "OK"} 
                    warning={solverData.isUnstable}
                    success={!solverData.isUnstable}
                  />
                  {solverData.isUnstable && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-400 bg-amber-500/10 rounded px-2 py-1.5">
                      <AlertTriangle className="h-3 w-3" />
                      Solver may be unstable
                    </div>
                  )}
                </div>

                <div>
                  <SectionHeader>Energy Functional</SectionHeader>
                  <StatRow label="E(t)" value={solverData.energy.toExponential(4)} />
                  <StatRow label="ΔE" value={solverData.deltaEnergy.toExponential(4)} />
                  <div className="mt-2">
                    <div className="text-[10px] text-neutral-500 mb-1">Energy History</div>
                    <Sparkline data={solverData.energyHistory} color="#3b82f6" />
                  </div>
                </div>

                <div>
                  <SectionHeader>Variance Monitor</SectionHeader>
                  <StatRow label="σ²" value={solverData.variance.toExponential(4)} />
                  <StatRow label="Δσ²" value={solverData.deltaVariance.toExponential(4)} />
                  <div className="flex items-center gap-2 mt-2">
                    <Badge 
                      variant="outline" 
                      className={`text-[10px] ${solverData.isUnstable ? 'border-red-500/50 text-red-400' : 'border-emerald-500/50 text-emerald-400'}`}
                    >
                      {solverData.isUnstable ? "UNSTABLE" : "STABLE"}
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "check" && (
              <div className="space-y-4">
                <div>
                  <SectionHeader>Determinism Check</SectionHeader>
                  <Button 
                    variant="secondary"
                    size="sm" 
                    onClick={handleRunDeterminism}
                    disabled={isRunningDeterminism}
                    className="w-full relative ring-1 ring-cyan-500/50 shadow-[0_0_12px_rgba(34,211,238,0.25)]"
                    data-testid="button-run-determinism"
                  >
                    {isRunningDeterminism ? "Running..." : "Run Determinism Check (100 steps)"}
                  </Button>
                  
                  {determinismReport && (
                    <div className="mt-3 space-y-1 bg-black/30 rounded p-2.5 border border-white/10">
                      <StatRow 
                        label="Status" 
                        value={determinismReport.isDeterministic ? "DETERMINISTIC" : "NON-DETERMINISTIC"}
                        success={determinismReport.isDeterministic}
                        warning={!determinismReport.isDeterministic}
                      />
                      <StatRow label="Seed" value={determinismReport.seed} />
                      <StatRow label="Steps" value={determinismReport.stepsRun} />
                      <StatRow label="Final Hash" value={determinismReport.finalHash} />
                      <StatRow label="Pixel Diff" value={determinismReport.pixelDifference} warning={determinismReport.pixelDifference > 0} />
                    </div>
                  )}
                </div>

                <div>
                  <SectionHeader>Dual-View Sync</SectionHeader>
                  <StatRow label="History Index" value={currentHistoryIndex} />
                  <StatRow label="History Length" value={historyLength} />
                  <StatRow label="Determinism Sync State" value={isRunning ? "Live" : "Paused"} />
                </div>

                {determinismReport && !determinismReport.isDeterministic && (
                  <div>
                    <SectionHeader>Determinism Warnings</SectionHeader>
                    <div className="text-xs text-amber-400 bg-amber-500/10 rounded p-2">
                      Non-deterministic behavior detected. Mean absolute deviation: {determinismReport.meanAbsoluteDeviation.toExponential(4)}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "render" && renderData && (
              <div className="space-y-4">
                <div>
                  <SectionHeader>Performance</SectionHeader>
                  <StatRow label="Frame Time" value={`${renderData.frameTime.toFixed(2)}ms`} />
                  <StatRow label="FPS" value={renderData.fps} />
                  <StatRow label="Dropped Frames" value={renderData.droppedFrames} warning={renderData.droppedFrames > 0} />
                </div>

                <div>
                  <SectionHeader>Renderer</SectionHeader>
                  <StatRow label="Mode" value={renderData.renderMode} mono={false} />
                  <StatRow label="Resolution" value={`${renderData.resolution.width}×${renderData.resolution.height}`} />
                </div>

                <div>
                  <SectionHeader>Color Settings</SectionHeader>
                  <StatRow label="Colormap" value={colormap.charAt(0).toUpperCase() + colormap.slice(1)} mono={false} />
                  <StatRow label="Normalization" value="Min-Max" mono={false} />
                </div>
              </div>
            )}

            {activeTab === "internals" && internalsData && (
              <div className="space-y-4">
                <div>
                  <SectionHeader>Grid Stats</SectionHeader>
                  <StatRow label="Min" value={internalsData.gridStats.min.toExponential(4)} />
                  <StatRow label="Max" value={internalsData.gridStats.max.toExponential(4)} />
                  <StatRow label="Mean" value={internalsData.gridStats.mean.toExponential(4)} />
                  <StatRow label="Std Dev" value={internalsData.gridStats.std.toExponential(4)} />
                </div>

                <div>
                  <SectionHeader>Gradient Magnitude</SectionHeader>
                  <StatRow label="Min" value={internalsData.gradientMagnitudeStats.min.toExponential(4)} />
                  <StatRow label="Max" value={internalsData.gradientMagnitudeStats.max.toExponential(4)} />
                  <StatRow label="Mean" value={internalsData.gradientMagnitudeStats.mean.toExponential(4)} />
                </div>

                <div>
                  <SectionHeader>Curvature Stats</SectionHeader>
                  <StatRow label="Min" value={internalsData.curvatureStats.min.toExponential(4)} />
                  <StatRow label="Max" value={internalsData.curvatureStats.max.toExponential(4)} />
                  <StatRow label="Mean" value={internalsData.curvatureStats.mean.toExponential(4)} />
                </div>
              </div>
            )}

            {activeTab === "events" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-neutral-500" />
                    <Input
                      placeholder="Search events..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-7 text-xs pl-7 bg-white/5 border-white/10 text-neutral-200 placeholder:text-neutral-500"
                      data-testid="input-search-events"
                    />
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setSearchQuery("")} className="h-7 w-7 text-neutral-500">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="auto-scroll-float"
                      checked={autoScroll}
                      onCheckedChange={setAutoScroll}
                      className="scale-75"
                    />
                    <Label htmlFor="auto-scroll-float" className="text-xs text-neutral-500">Auto-scroll</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="compact-float"
                      checked={compactView}
                      onCheckedChange={setCompactView}
                      className="scale-75"
                    />
                    <Label htmlFor="compact-float" className="text-xs text-neutral-500">Compact</Label>
                  </div>
                </div>

                <div 
                  ref={eventLogRef}
                  className="h-48 overflow-y-auto bg-black/40 rounded p-2 space-y-1"
                >
                  {filteredEvents.length === 0 ? (
                    <div className="text-xs text-neutral-500 text-center py-4">No events</div>
                  ) : (
                    filteredEvents.map((event, i) => (
                      <div 
                        key={i} 
                        className={`text-xs ${compactView ? 'py-0.5' : 'py-1 border-b border-white/5'}`}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-neutral-500 font-mono shrink-0">{event.step}</span>
                          <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0 border-neutral-700">
                            {event.type}
                          </Badge>
                        </div>
                        {!compactView && (
                          <div className="text-neutral-400 pl-8 mt-0.5">{event.description}</div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <Button size="sm" variant="outline" onClick={handleExportEvents} className="w-full h-7 text-xs border-white/10 text-neutral-300">
                  <Download className="h-3 w-3 mr-1.5" />
                  Export Events
                </Button>
              </div>
            )}

            {activeTab === "advanced" && (
              <div className="space-y-4">
                <div>
                  <SectionHeader>Trend Analysis</SectionHeader>
                  {solverData && (
                    <>
                      <StatRow label="Energy Trend" value={solverData.deltaEnergy >= 0 ? "Rising" : "Falling"} mono={false} />
                      <StatRow label="Variance Trend (dσ²/dt)" value={solverData.varianceDerivative.toExponential(4)} />
                      <StatRow label="Max Gradient" value={internalsData?.gradientMagnitudeStats.max.toExponential(4) || "---"} />
                      <StatRow label="Curvature Mean" value={internalsData?.curvatureStats.mean.toExponential(4) || "---"} />
                    </>
                  )}
                </div>

                <div>
                  <SectionHeader>Warnings</SectionHeader>
                  <div className="space-y-1">
                    {solverData?.isUnstable ? (
                      <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 rounded px-2 py-1.5">
                        <AlertTriangle className="h-3 w-3" />
                        High Energy Drift
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 rounded px-2 py-1.5">
                        <CheckCircle className="h-3 w-3" />
                        No active warnings
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <SectionHeader>Export Tools</SectionHeader>
                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" variant="outline" onClick={handleExportDiagnostics} className="h-8 text-xs border-white/10 text-neutral-300">
                      <Download className="h-3 w-3 mr-1" />
                      Full Diagnostic
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleExportFrameWindow} className="h-8 text-xs border-white/10 text-neutral-300">
                      <Download className="h-3 w-3 mr-1" />
                      10-Frame Export
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Resize Handle */}
          <div 
            className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize group"
            onMouseDown={handleResizeMouseDown}
            data-testid="resize-handle"
          >
            <svg 
              width="10" 
              height="10" 
              viewBox="0 0 10 10" 
              className="absolute bottom-1 right-1 text-neutral-500 group-hover:text-neutral-300 transition-colors"
            >
              <path d="M9 1L1 9M9 5L5 9M9 9L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
        </>
      )}
    </div>
  );
}
