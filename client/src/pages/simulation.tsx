import { useState, useEffect, useRef, useCallback } from "react";
import { SFDEngine } from "@/lib/sfd-engine";
import { VisualizationCanvas } from "@/components/visualization-canvas";
import { ControlPanel } from "@/components/control-panel";
import { MobileControlPanel } from "@/components/mobile-control-panel";
import { HoverProbe } from "@/components/hover-probe";
import { DualFieldView } from "@/components/dual-field-view";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HelpCircle, Waves, Play, Pause, RotateCcw, Settings2, StepForward, StepBack, ChevronDown, ChevronUp, Columns, BookOpen, Download, Map } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { SimulationParameters, SimulationState, FieldData, ProbeData, OperatorContributions, StructuralSignature, StructuralEvent, DerivedField, BasinMap } from "@shared/schema";
import { defaultParameters, mobileParameters } from "@shared/schema";
import type { InterpretationMode } from "@/lib/interpretation-modes";
import { interpretationModes } from "@/lib/interpretation-modes";

export default function SimulationPage() {
  const isMobile = useIsMobile();
  const engineRef = useRef<SFDEngine | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const [params, setParams] = useState<SimulationParameters>(defaultParameters);
  const [state, setState] = useState<SimulationState>({
    step: 0,
    energy: 0,
    variance: 0,
    basinCount: 0,
    isRunning: false,
    fps: 0,
  });
  const [field, setField] = useState<FieldData | null>(null);
  const [colormap, setColormap] = useState<"inferno" | "viridis">("inferno");
  const [controlsOpen, setControlsOpen] = useState(false);
  const [interpretationMode, setInterpretationMode] = useState<InterpretationMode>("structural-dynamics");
  
  const [operatorContributions, setOperatorContributions] = useState<OperatorContributions>({
    curvature: 0.2, tension: 0.2, coupling: 0.2, attractor: 0.2, redistribution: 0.2,
  });
  const [structuralSignature, setStructuralSignature] = useState<StructuralSignature>({
    basinCount: 0, avgBasinDepth: 0, globalCurvature: 0, tensionVariance: 0, stabilityMetric: 1,
  });
  const [events, setEvents] = useState<StructuralEvent[]>([]);
  const [historyLength, setHistoryLength] = useState(0);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(0);
  const [isPlaybackMode, setIsPlaybackMode] = useState(false);
  const [showBasins, setShowBasins] = useState(false);
  const [showDualView, setShowDualView] = useState(false);
  const [derivedType, setDerivedType] = useState<"curvature" | "tension" | "coupling" | "variance">("curvature");
  const [derivedField, setDerivedField] = useState<DerivedField | null>(null);
  const [basinMap, setBasinMap] = useState<BasinMap | null>(null);
  
  const showDualViewRef = useRef(showDualView);
  const derivedTypeRef = useRef(derivedType);
  
  useEffect(() => {
    showDualViewRef.current = showDualView;
  }, [showDualView]);
  
  useEffect(() => {
    derivedTypeRef.current = derivedType;
  }, [derivedType]);
  
  const [probeData, setProbeData] = useState<ProbeData | null>(null);
  const [probeVisible, setProbeVisible] = useState(false);
  const [probePosition, setProbePosition] = useState({ x: 0, y: 0 });
  const [bottomPanelOpen, setBottomPanelOpen] = useState(false);
  const [bottomPanelTab, setBottomPanelTab] = useState<"dual" | "notebook" | "export">("dual");

  const modeLabels = interpretationModes[interpretationMode];

  useEffect(() => {
    const initialParams = isMobile ? mobileParameters : defaultParameters;
    setParams(initialParams);
    const engine = new SFDEngine(initialParams);
    engineRef.current = engine;

    engine.onStateUpdate((newState, newField) => {
      setState(newState);
      setField(newField);
      setOperatorContributions(engine.getOperatorContributions());
      setStructuralSignature(engine.computeStructuralSignature());
      setEvents(engine.getEvents());
      setHistoryLength(engine.getHistoryLength());
      setCurrentHistoryIndex(engine.getCurrentHistoryIndex());
      setIsPlaybackMode(engine.isInPlaybackMode());
      setBasinMap(engine.getBasinMap());
      
      if (showDualViewRef.current) {
        setDerivedField(engine.computeDerivedField(derivedTypeRef.current));
      }
    });

    return () => {
      engine.stop();
    };
  }, [isMobile]);

  useEffect(() => {
    if (showDualView && engineRef.current) {
      setDerivedField(engineRef.current.computeDerivedField(derivedType));
    }
  }, [showDualView, derivedType]);

  const handleParamsChange = useCallback((newParams: Partial<SimulationParameters>) => {
    setParams((prev) => {
      const updated = { ...prev, ...newParams };
      engineRef.current?.setParams(newParams);
      return updated;
    });
  }, []);

  const handlePlay = useCallback(() => {
    engineRef.current?.start();
  }, []);

  const handlePause = useCallback(() => {
    engineRef.current?.stop();
  }, []);

  const handleReset = useCallback(() => {
    engineRef.current?.reset();
  }, []);

  const handleStep = useCallback(() => {
    engineRef.current?.stepOnce();
  }, []);

  const handleStepBackward = useCallback(() => {
    engineRef.current?.stepBackward();
  }, []);

  const handleSeekFrame = useCallback((index: number) => {
    engineRef.current?.seekToFrame(index);
  }, []);

  const handleExitPlayback = useCallback(() => {
    engineRef.current?.exitPlaybackMode();
  }, []);

  const handleClearEvents = useCallback(() => {
    engineRef.current?.clearEvents();
    setEvents([]);
  }, []);

  const handleExportEvents = useCallback(() => {
    const text = events.map(e => `t=${e.step} | ${e.description}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sfd-events-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [events]);

  const handleExportPNG = useCallback(() => {
    const canvas = document.querySelector('[data-testid="canvas-visualization"]') as HTMLCanvasElement;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `sfd-frame-${state.step}.png`;
    a.click();
  }, [state.step]);

  const handleExportJSON = useCallback(() => {
    const json = engineRef.current?.exportSettings() || '{}';
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sfd-settings-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleExportGIF = useCallback(() => {
    alert('GIF export requires ffmpeg.wasm which is not yet installed. Use PNG export for individual frames.');
  }, []);

  const handleHover = useCallback((x: number, y: number, screenX: number, screenY: number) => {
    if (engineRef.current) {
      const data = engineRef.current.computeProbeData(x, y);
      setProbeData(data);
      setProbeVisible(true);
      setProbePosition({ x: screenX, y: screenY });
    }
  }, []);

  const handleHoverEnd = useCallback(() => {
    setProbeVisible(false);
  }, []);

  if (isMobile) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <header className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-card/50">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10">
              <Waves className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-semibold leading-tight" data-testid="text-title">
                SFD Engine
              </h1>
            </div>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" data-testid="button-help-mobile">
                <HelpCircle className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[90vw]">
              <DialogHeader>
                <DialogTitle>About SFD</DialogTitle>
                <DialogDescription className="pt-4 space-y-2 text-sm">
                  <p>
                    Structural Field Dynamics simulates complex adaptive systems
                    through operator-driven field evolution.
                  </p>
                  <p>
                    <strong>Operators:</strong> Curvature, Gradient-Tension,
                    Neighbor-Coupling, Attractor-Formation, Global Redistribution
                  </p>
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
        </header>

        <main className="flex-1 relative bg-gray-950 min-h-0">
          <VisualizationCanvas 
            field={field} 
            colormap={colormap} 
            basinMap={basinMap}
            showBasins={showBasins}
          />
          <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm rounded px-2 py-1">
            <span className="text-xs font-mono text-white/70" data-testid="text-step-overlay-mobile">
              Step: {state.step.toLocaleString()}
            </span>
          </div>
          {state.isRunning && (
            <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded px-2 py-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-xs font-mono text-white/70">Running</span>
            </div>
          )}
        </main>

        <footer className="border-t border-border bg-card p-3 space-y-3">
          <div className="flex items-center gap-2">
            {state.isRunning ? (
              <Button onClick={handlePause} className="flex-1 h-12" data-testid="button-pause-mobile">
                <Pause className="h-5 w-5 mr-2" />
                Pause
              </Button>
            ) : (
              <Button onClick={handlePlay} className="flex-1 h-12" data-testid="button-play-mobile">
                <Play className="h-5 w-5 mr-2" />
                Run
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12"
              onClick={handleReset}
              data-testid="button-reset-mobile"
            >
              <RotateCcw className="h-5 w-5" />
            </Button>
            <Sheet open={controlsOpen} onOpenChange={setControlsOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-12 w-12"
                  data-testid="button-settings-mobile"
                >
                  <Settings2 className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[70vh] overflow-y-auto">
                <SheetHeader className="pb-4">
                  <SheetTitle>Settings</SheetTitle>
                </SheetHeader>
                <MobileControlPanel
                  params={params}
                  colormap={colormap}
                  interpretationMode={interpretationMode}
                  onParamsChange={handleParamsChange}
                  onColormapChange={setColormap}
                  onInterpretationModeChange={setInterpretationMode}
                />
              </SheetContent>
            </Sheet>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <div className="text-xs text-muted-foreground">Step</div>
              <div className="text-sm font-mono" data-testid="text-step-mobile">{state.step.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">FPS</div>
              <div className="text-sm font-mono" data-testid="text-fps-mobile">{state.fps}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{modeLabels.stats.energy}</div>
              <div className="text-sm font-mono" data-testid="text-energy-mobile">{state.energy.toFixed(3)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{modeLabels.stats.basins}</div>
              <div className="text-sm font-mono" data-testid="text-basins-mobile">{state.basinCount}</div>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="flex items-center justify-between gap-4 px-3 py-2 border-b border-border bg-card/50">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10">
            <Waves className="h-3.5 w-3.5 text-primary" />
          </div>
          <h1 className="text-base font-semibold" data-testid="text-title">SFD Engine</h1>
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant={showBasins ? "default" : "ghost"}
            size="icon"
            onClick={() => setShowBasins(!showBasins)}
            data-testid="button-basins-toolbar"
            className="h-7 w-7"
          >
            <Map className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={showDualView ? "default" : "ghost"}
            size="icon"
            onClick={() => setShowDualView(!showDualView)}
            data-testid="button-dual-toolbar"
            className="h-7 w-7"
          >
            <Columns className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={bottomPanelOpen ? "default" : "ghost"}
            size="icon"
            onClick={() => setBottomPanelOpen(!bottomPanelOpen)}
            data-testid="button-bottom-panel"
            className="h-7 w-7"
          >
            {bottomPanelOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          </Button>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" data-testid="button-help" className="h-7 w-7">
                <HelpCircle className="h-3.5 w-3.5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>About Structural Field Dynamics</DialogTitle>
                <DialogDescription className="pt-4 space-y-3 text-sm">
                  <p>
                    Structural Field Dynamics (SFD) is a geometric model of complex
                    adaptive systems. This simulation demonstrates operator-driven
                    field evolution on a 2D manifold.
                  </p>
                  <p><strong>The Five Operators:</strong></p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li><strong>Curvature (K)</strong> — Responds to local curvature via discrete Laplacian</li>
                    <li><strong>Gradient-Tension (T)</strong> — Drives tension waves based on gradient magnitude</li>
                    <li><strong>Neighbor-Coupling (C)</strong> — Creates local clustering through Gaussian blur</li>
                    <li><strong>Attractor-Formation (A)</strong> — Forms threshold-like basin structures</li>
                    <li><strong>Global Redistribution (R)</strong> — Maintains coherence through mean-field shift</li>
                  </ul>
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="flex-1 overflow-hidden flex">
        <div className="flex-1 flex flex-col min-w-0">
          <main className={`relative bg-gray-950 ${bottomPanelOpen ? 'flex-[7]' : 'flex-1'}`}>
            {showDualView ? (
              <div className="flex h-full">
                <div className="flex-1 relative">
                  <VisualizationCanvas 
                    field={field} 
                    colormap={colormap}
                    basinMap={basinMap}
                    showBasins={showBasins}
                    onHover={handleHover}
                    onHoverEnd={handleHoverEnd}
                  />
                </div>
                <div className="w-px bg-border" />
                <div className="flex-1">
                  <DualFieldView
                    derivedField={derivedField}
                    derivedType={derivedType}
                    onTypeChange={setDerivedType}
                  />
                </div>
              </div>
            ) : (
              <VisualizationCanvas 
                field={field} 
                colormap={colormap}
                basinMap={basinMap}
                showBasins={showBasins}
                onHover={handleHover}
                onHoverEnd={handleHoverEnd}
              />
            )}
            
            <HoverProbe
              data={probeData}
              modeLabels={modeLabels}
              visible={probeVisible}
              position={probePosition}
            />
            
            {state.isRunning && (
              <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded px-2 py-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span className="text-xs font-mono text-white/70">Running</span>
              </div>
            )}
            {isPlaybackMode && (
              <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-yellow-500/80 backdrop-blur-sm rounded px-2 py-1">
                <span className="text-xs font-mono text-black">Playback Mode</span>
              </div>
            )}
          </main>
          
          {bottomPanelOpen && (
            <div className="flex-[3] bg-card border-t border-border overflow-hidden min-h-[150px]">
              <Tabs value={bottomPanelTab} onValueChange={(v) => setBottomPanelTab(v as typeof bottomPanelTab)} className="h-full flex flex-col">
                <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent px-2 h-9 shrink-0">
                  <TabsTrigger value="dual" className="text-xs">Derived Field</TabsTrigger>
                  <TabsTrigger value="notebook" className="text-xs">Notebook</TabsTrigger>
                  <TabsTrigger value="export" className="text-xs">Export</TabsTrigger>
                </TabsList>
                <div className="flex-1 overflow-auto p-3">
                  <TabsContent value="dual" className="m-0 h-full">
                    {!showDualView ? (
                      <DualFieldView
                        derivedField={derivedField}
                        derivedType={derivedType}
                        onTypeChange={setDerivedType}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">Dual view is shown in the main canvas area above.</p>
                    )}
                  </TabsContent>
                  <TabsContent value="notebook" className="m-0">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <h4 className="text-sm font-semibold mb-2">Current Parameters</h4>
                      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        <div>dt = {params.dt.toFixed(3)}</div>
                        <div>K = {params.curvatureGain.toFixed(2)}</div>
                        <div>C = {params.couplingWeight.toFixed(2)}</div>
                        <div>A = {params.attractorStrength.toFixed(2)}</div>
                        <div>R = {params.redistributionRate.toFixed(2)}</div>
                        <div>Grid: {params.gridSize}x{params.gridSize}</div>
                      </div>
                      <h4 className="text-sm font-semibold mt-4 mb-2">Field Equation</h4>
                      <code className="text-xs block bg-muted p-2 rounded">
                        dF/dt = wK*K(F) + wT*T(F) + wC*C(F) + wA*A(F) + wR*R(F)
                      </code>
                    </div>
                  </TabsContent>
                  <TabsContent value="export" className="m-0">
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={handleExportPNG} data-testid="button-export-png-bottom">
                        <Download className="h-3.5 w-3.5 mr-1" />
                        PNG Snapshot
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleExportJSON} data-testid="button-export-json-bottom">
                        <Download className="h-3.5 w-3.5 mr-1" />
                        Settings JSON
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleExportEvents} data-testid="button-export-events-bottom">
                        <Download className="h-3.5 w-3.5 mr-1" />
                        Event Log
                      </Button>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          )}
        </div>
        
        <aside className="w-80 border-l border-border bg-card flex flex-col overflow-hidden shrink-0">
          <ControlPanel
                params={params}
                state={state}
                colormap={colormap}
                interpretationMode={interpretationMode}
                operatorContributions={operatorContributions}
                structuralSignature={structuralSignature}
                events={events}
                historyLength={historyLength}
                currentHistoryIndex={currentHistoryIndex}
                isPlaybackMode={isPlaybackMode}
                showBasins={showBasins}
                onParamsChange={handleParamsChange}
                onPlay={handlePlay}
                onPause={handlePause}
                onReset={handleReset}
                onStep={handleStep}
                onStepBackward={handleStepBackward}
                onSeekFrame={handleSeekFrame}
                onExitPlayback={handleExitPlayback}
                onColormapChange={setColormap}
                onInterpretationModeChange={setInterpretationMode}
                onClearEvents={handleClearEvents}
                onExportEvents={handleExportEvents}
                onShowBasinsChange={setShowBasins}
              />
        </aside>
      </div>
    </div>
  );
}
