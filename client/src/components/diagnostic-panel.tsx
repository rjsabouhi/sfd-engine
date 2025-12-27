import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  X, 
  Activity, 
  GitCompare, 
  List, 
  Monitor, 
  Database,
  Download,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle,
  Search,
  Trash2,
  Play,
  Pause,
  SkipBack,
  SkipForward
} from "lucide-react";
import { Input } from "@/components/ui/input";
import type { SFDEngine, DiagnosticSolverData, DiagnosticRenderData, DiagnosticInternalsData, DeterminismReport } from "@/lib/sfd-engine";
import type { StructuralEvent } from "@shared/schema";

interface DiagnosticPanelProps {
  engine: SFDEngine | null;
  isVisible: boolean;
  onClose: () => void;
  events: StructuralEvent[];
  isRunning: boolean;
  currentHistoryIndex: number;
  historyLength: number;
  onStepBackward: () => void;
  onStepForward: () => void;
  onSeekFrame: (index: number) => void;
  onPlay: () => void;
  onPause: () => void;
}

function Sparkline({ data, width = 120, height = 24, color = "#10b981" }: { data: number[]; width?: number; height?: number; color?: string }) {
  if (data.length < 2) return <div className="h-6 bg-muted/30 rounded" style={{ width }} />;
  
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');
  
  return (
    <svg width={width} height={height} className="bg-muted/20 rounded">
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

function StatRow({ label, value, warning, mono = true }: { label: string; value: string | number; warning?: boolean; mono?: boolean }) {
  return (
    <div className="flex justify-between items-center py-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-xs ${mono ? 'font-mono' : ''} ${warning ? 'text-yellow-500' : 'text-foreground'}`}>
        {value}
      </span>
    </div>
  );
}

function HistogramBar({ bins, height = 40 }: { bins: number[]; height?: number }) {
  const max = Math.max(...bins) || 1;
  
  return (
    <div className="flex items-end gap-0.5 h-10 bg-muted/20 rounded p-1">
      {bins.map((v, i) => (
        <div
          key={i}
          className="flex-1 bg-primary/60 rounded-t"
          style={{ height: `${(v / max) * 100}%` }}
          title={`Bin ${i}: ${v}`}
        />
      ))}
    </div>
  );
}

export function DiagnosticPanel({
  engine,
  isVisible,
  onClose,
  events,
  isRunning,
  currentHistoryIndex,
  historyLength,
  onStepBackward,
  onStepForward,
  onSeekFrame,
  onPlay,
  onPause,
}: DiagnosticPanelProps) {
  const [activeTab, setActiveTab] = useState("solver");
  const [solverData, setSolverData] = useState<DiagnosticSolverData | null>(null);
  const [renderData, setRenderData] = useState<DiagnosticRenderData | null>(null);
  const [internalsData, setInternalsData] = useState<DiagnosticInternalsData | null>(null);
  const [determinismReport, setDeterminismReport] = useState<DeterminismReport | null>(null);
  const [isRunningDeterminism, setIsRunningDeterminism] = useState(false);
  const [frameHash, setFrameHash] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const [compactView, setCompactView] = useState(false);
  const [timestampPrecision, setTimestampPrecision] = useState<"ms" | "s">("s");
  const [isStepMode, setIsStepMode] = useState(false);
  
  const [solverOpen, setSolverOpen] = useState(true);
  const [energyOpen, setEnergyOpen] = useState(true);
  const [varianceOpen, setVarianceOpen] = useState(true);
  
  const eventLogRef = useRef<HTMLDivElement>(null);
  const updateIntervalRef = useRef<number | null>(null);

  const updateDiagnostics = useCallback(() => {
    if (!engine || !isVisible) return;
    
    const startTime = performance.now();
    
    if (activeTab === "solver") {
      setSolverData(engine.getDiagnosticSolverData());
      setFrameHash(engine.computeFrameHash());
    } else if (activeTab === "render") {
      setRenderData(engine.getDiagnosticRenderData());
    } else if (activeTab === "internals") {
      setInternalsData(engine.getDiagnosticInternalsData());
    }
    
    const elapsed = performance.now() - startTime;
    engine.recordFrameTime(elapsed);
  }, [engine, isVisible, activeTab]);

  useEffect(() => {
    if (isVisible && engine) {
      updateDiagnostics();
      updateIntervalRef.current = window.setInterval(updateDiagnostics, 100);
    }
    
    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
    };
  }, [isVisible, engine, updateDiagnostics]);

  useEffect(() => {
    if (autoScroll && eventLogRef.current) {
      eventLogRef.current.scrollTop = eventLogRef.current.scrollHeight;
    }
  }, [events, autoScroll]);

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
    const text = events.map(e => {
      const time = timestampPrecision === "ms" ? e.step : Math.floor(e.step / 60);
      return `[${time}] ${e.type}: ${e.description}`;
    }).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sfd-events-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [events, timestampPrecision]);

  const handleExportDeterminism = useCallback(() => {
    if (!determinismReport) return;
    const data = JSON.stringify(determinismReport, (key, value) => {
      if (key === 'diffGrid' && value) {
        return Array.from(value as Float32Array);
      }
      return value;
    }, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sfd-determinism-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [determinismReport]);

  const filteredEvents = useMemo(() => {
    if (!searchQuery) return events;
    const query = searchQuery.toLowerCase();
    return events.filter(e => 
      e.type.toLowerCase().includes(query) || 
      e.description.toLowerCase().includes(query)
    );
  }, [events, searchQuery]);

  const handleEnterStepMode = useCallback(() => {
    setIsStepMode(true);
    if (isRunning) {
      onPause();
    }
  }, [isRunning, onPause]);

  const handleExitStepMode = useCallback(() => {
    setIsStepMode(false);
  }, []);

  if (!isVisible) return null;

  return (
    <div 
      className="fixed right-0 top-0 h-full w-80 bg-black/90 backdrop-blur-sm border-l border-white/10 z-50 flex flex-col text-white"
      data-testid="diagnostic-panel"
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-green-400" />
          <span className="text-sm font-medium">Diagnostics</span>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6" data-testid="button-close-diagnostics">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-white/10 px-2 py-1.5 shrink-0">
          <div className="grid grid-cols-3 gap-1 mb-1">
            <button 
              onClick={() => setActiveTab("solver")}
              className={`flex items-center justify-center gap-1 text-xs px-1 py-1.5 rounded ${activeTab === "solver" ? "bg-white/15 text-white" : "text-white/60 hover:text-white hover:bg-white/5"}`}
              data-testid="tab-solver"
            >
              <CheckCircle className="h-3 w-3 shrink-0" />
              <span>Solver</span>
            </button>
            <button 
              onClick={() => setActiveTab("consistency")}
              className={`flex items-center justify-center gap-1 text-xs px-1 py-1.5 rounded ${activeTab === "consistency" ? "bg-white/15 text-white" : "text-white/60 hover:text-white hover:bg-white/5"}`}
              data-testid="tab-consistency"
            >
              <GitCompare className="h-3 w-3 shrink-0" />
              <span>Check</span>
            </button>
            <button 
              onClick={() => setActiveTab("events")}
              className={`flex items-center justify-center gap-1 text-xs px-1 py-1.5 rounded ${activeTab === "events" ? "bg-white/15 text-white" : "text-white/60 hover:text-white hover:bg-white/5"}`}
              data-testid="tab-events"
            >
              <List className="h-3 w-3 shrink-0" />
              <span>Events</span>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1">
            <button 
              onClick={() => setActiveTab("render")}
              className={`flex items-center justify-center gap-1 text-xs px-1 py-1.5 rounded ${activeTab === "render" ? "bg-white/15 text-white" : "text-white/60 hover:text-white hover:bg-white/5"}`}
              data-testid="tab-render"
            >
              <Monitor className="h-3 w-3 shrink-0" />
              <span>Render</span>
            </button>
            <button 
              onClick={() => setActiveTab("internals")}
              className={`flex items-center justify-center gap-1 text-xs px-1 py-1.5 rounded ${activeTab === "internals" ? "bg-white/15 text-white" : "text-white/60 hover:text-white hover:bg-white/5"}`}
              data-testid="tab-internals"
            >
              <Database className="h-3 w-3 shrink-0" />
              <span>Internals</span>
            </button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <TabsContent value="solver" className="m-0 p-3 space-y-3">
            {solverData && (
              <>
                <Collapsible open={solverOpen} onOpenChange={setSolverOpen}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full text-xs font-medium text-muted-foreground py-1">
                    Step & Stability
                    {solverOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1 pt-1">
                    <StatRow label="Step" value={solverData.step} />
                    <StatRow label="Frame Hash" value={frameHash} />
                    <StatRow 
                      label="Δt Stability" 
                      value={solverData.isUnstable ? "UNSTABLE" : "OK"} 
                      warning={solverData.isUnstable}
                    />
                    {solverData.isUnstable && (
                      <div className="flex items-center gap-1 text-xs text-yellow-500 bg-yellow-500/10 rounded px-2 py-1">
                        <AlertTriangle className="h-3 w-3" />
                        Solver may be unstable
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>

                <Collapsible open={energyOpen} onOpenChange={setEnergyOpen}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full text-xs font-medium text-muted-foreground py-1">
                    Energy Functional
                    {energyOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2 pt-1">
                    <StatRow label="E(t)" value={solverData.energy.toExponential(4)} />
                    <StatRow label="ΔE" value={solverData.deltaEnergy.toExponential(4)} />
                    <div className="pt-1">
                      <div className="text-xs text-muted-foreground mb-1">Energy History</div>
                      <Sparkline data={solverData.energyHistory} color="#3b82f6" />
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                <Collapsible open={varianceOpen} onOpenChange={setVarianceOpen}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full text-xs font-medium text-muted-foreground py-1">
                    Variance Monitor
                    {varianceOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2 pt-1">
                    <StatRow label="σ²" value={solverData.variance.toExponential(4)} />
                    <StatRow label="Δσ²" value={solverData.deltaVariance.toExponential(4)} />
                    <StatRow label="dσ²/dt" value={solverData.varianceDerivative.toExponential(4)} />
                    <div className="pt-1">
                      <div className="text-xs text-muted-foreground mb-1">Variance History</div>
                      <Sparkline data={solverData.varianceHistory} color="#10b981" />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </>
            )}
          </TabsContent>

          <TabsContent value="consistency" className="m-0 p-3 space-y-3">
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Determinism Check</div>
              <Button 
                size="sm" 
                onClick={handleRunDeterminism}
                disabled={isRunningDeterminism}
                className="w-full h-7 text-xs"
                data-testid="button-run-determinism"
              >
                {isRunningDeterminism ? "Running..." : "Run Determinism Check (100 steps)"}
              </Button>
              
              {determinismReport && (
                <div className="space-y-1 bg-white/5 rounded p-2">
                  <StatRow 
                    label="Status" 
                    value={determinismReport.isDeterministic ? "DETERMINISTIC" : "NON-DETERMINISTIC"}
                    warning={!determinismReport.isDeterministic}
                  />
                  <StatRow label="Seed" value={determinismReport.seed} />
                  <StatRow label="Steps" value={determinismReport.stepsRun} />
                  <StatRow label="Final Hash" value={determinismReport.finalHash} />
                  <StatRow label="Run 1 Energy" value={determinismReport.run1FinalEnergy.toExponential(4)} />
                  <StatRow label="Run 2 Energy" value={determinismReport.run2FinalEnergy.toExponential(4)} />
                  <StatRow label="Pixel Diff" value={determinismReport.pixelDifference} warning={determinismReport.pixelDifference > 0} />
                  <StatRow label="Mean Abs Dev" value={determinismReport.meanAbsoluteDeviation.toExponential(6)} />
                  
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={handleExportDeterminism}
                    className="w-full h-6 text-xs mt-2"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Export Report
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2 pt-2 border-t border-white/10">
              <div className="text-xs font-medium text-muted-foreground">Dual-View Sync</div>
              <StatRow label="History Index" value={currentHistoryIndex} />
              <StatRow label="History Length" value={historyLength} />
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="text-xs">
                  {isRunning ? "Live" : "Paused"}
                </Badge>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="events" className="m-0 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input
                  placeholder="Search events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-7 text-xs pl-7 bg-white/5 border-white/10"
                  data-testid="input-search-events"
                />
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSearchQuery("")} className="h-7 w-7">
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Switch
                  id="auto-scroll"
                  checked={autoScroll}
                  onCheckedChange={setAutoScroll}
                  className="scale-75"
                />
                <Label htmlFor="auto-scroll" className="text-xs text-muted-foreground">Auto-scroll</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="compact"
                  checked={compactView}
                  onCheckedChange={setCompactView}
                  className="scale-75"
                />
                <Label htmlFor="compact" className="text-xs text-muted-foreground">Compact</Label>
              </div>
            </div>

            <div 
              ref={eventLogRef}
              className="h-48 overflow-y-auto bg-black/30 rounded p-2 space-y-1"
            >
              {filteredEvents.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-4">No events</div>
              ) : (
                filteredEvents.map((event, i) => (
                  <div 
                    key={i} 
                    className={`text-xs ${compactView ? 'py-0.5' : 'py-1 border-b border-white/5'}`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-muted-foreground font-mono shrink-0">
                        {timestampPrecision === "ms" ? event.step : `${Math.floor(event.step / 60)}s`}
                      </span>
                      <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0">
                        {event.type}
                      </Badge>
                    </div>
                    {!compactView && (
                      <div className="text-muted-foreground pl-12 mt-0.5">{event.description}</div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleExportEvents} className="flex-1 h-6 text-xs">
                <Download className="h-3 w-3 mr-1" />
                Export Events
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setTimestampPrecision(p => p === "ms" ? "s" : "ms")}
                className="h-6 text-xs"
              >
                {timestampPrecision === "ms" ? "Steps" : "Seconds"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="render" className="m-0 p-3 space-y-3">
            {renderData && (
              <>
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">Performance</div>
                  <StatRow label="Frame Time" value={`${renderData.frameTime.toFixed(2)}ms`} />
                  <StatRow label="FPS" value={renderData.fps} />
                  <StatRow label="Dropped Frames" value={renderData.droppedFrames} warning={renderData.droppedFrames > 0} />
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">Renderer</div>
                  <StatRow label="Mode" value={renderData.renderMode} mono={false} />
                  <StatRow label="Resolution" value={`${renderData.resolution.width}×${renderData.resolution.height}`} />
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">Color Normalization</div>
                  <StatRow label="Method" value="Min-Max" mono={false} />
                  <StatRow label="Colormap" value="Inferno/Plasma" mono={false} />
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="internals" className="m-0 p-3 space-y-3">
            {internalsData && (
              <>
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">Grid Stats</div>
                  <StatRow label="Min" value={internalsData.gridStats.min.toExponential(4)} />
                  <StatRow label="Max" value={internalsData.gridStats.max.toExponential(4)} />
                  <StatRow label="Mean" value={internalsData.gridStats.mean.toExponential(4)} />
                  <StatRow label="Std Dev" value={internalsData.gridStats.std.toExponential(4)} />
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">Gradient Magnitude</div>
                  <StatRow label="Min" value={internalsData.gradientMagnitudeStats.min.toExponential(4)} />
                  <StatRow label="Max" value={internalsData.gradientMagnitudeStats.max.toExponential(4)} />
                  <StatRow label="Mean" value={internalsData.gradientMagnitudeStats.mean.toExponential(4)} />
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">Curvature Stats</div>
                  <StatRow label="Min" value={internalsData.curvatureStats.min.toExponential(4)} />
                  <StatRow label="Max" value={internalsData.curvatureStats.max.toExponential(4)} />
                  <StatRow label="Mean" value={internalsData.curvatureStats.mean.toExponential(4)} />
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">Laplacian Distribution</div>
                  <HistogramBar bins={internalsData.laplacianDistribution} />
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">Basins</div>
                  <StatRow label="Basin Count" value={internalsData.basinCount} />
                </div>
              </>
            )}
          </TabsContent>
        </ScrollArea>

        <div className="border-t border-white/10 p-2 space-y-2">
          <div className="text-xs font-medium text-muted-foreground">Frame-by-Frame Mode</div>
          {isStepMode ? (
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={onStepBackward}
                  disabled={currentHistoryIndex <= 0}
                  className="h-7 w-7"
                  data-testid="button-diag-step-back"
                >
                  <SkipBack className="h-3 w-3" />
                </Button>
                <div className="flex-1 text-center text-xs font-mono">
                  Frame {currentHistoryIndex + 1} / {historyLength}
                </div>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={onStepForward}
                  disabled={currentHistoryIndex >= historyLength - 1}
                  className="h-7 w-7"
                  data-testid="button-diag-step-forward"
                >
                  <SkipForward className="h-3 w-3" />
                </Button>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleExitStepMode}
                className="w-full h-6 text-xs"
              >
                Exit Step Mode
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={handleEnterStepMode}
              className="w-full h-7 text-xs"
              data-testid="button-enter-step-mode"
            >
              <Pause className="h-3 w-3 mr-1" />
              Enter Step Mode
            </Button>
          )}

          <div className="pt-2 border-t border-white/10 space-y-1">
            <div className="text-xs font-medium text-muted-foreground">Export Tools</div>
            <div className="grid grid-cols-2 gap-1">
              <Button size="sm" variant="ghost" onClick={handleExportDiagnostics} className="h-6 text-xs">
                <Download className="h-3 w-3 mr-1" />
                Full Diag
              </Button>
              <Button size="sm" variant="ghost" onClick={handleExportFrameWindow} className="h-6 text-xs">
                <Download className="h-3 w-3 mr-1" />
                10 Frames
              </Button>
            </div>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
