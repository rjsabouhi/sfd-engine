import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { unstable_batchedUpdates } from "react-dom";
import { SFDEngine } from "@/lib/sfd-engine";
import { VisualizationCanvas } from "@/components/visualization-canvas";
import { ControlPanel } from "@/components/control-panel";
import { MobileControlPanel } from "@/components/mobile-control-panel";
import { HoverProbe } from "@/components/hover-probe";
import { DualFieldView } from "@/components/dual-field-view";
import { OnboardingModal, type OnboardingModalRef } from "@/components/onboarding-modal";
import { FloatingDiagnostics } from "@/components/floating-diagnostics";
import { StructuralFieldFooter } from "@/components/field-footer";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HelpCircle, Play, Pause, RotateCcw, Settings2, StepForward, StepBack, ChevronDown, ChevronUp, Columns, BookOpen, Download, Map, Gauge, Zap, Crosshair, SkipForward, Save, Upload } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import sfdLogo from "@assets/generated_images/3x3_grid_shimmer_logo.png";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SimulationParameters, SimulationState, FieldData, ProbeData, OperatorContributions, StructuralSignature, StructuralEvent, DerivedField, BasinMap } from "@shared/schema";
import { defaultParameters, mobileParameters } from "@shared/schema";
import type { InterpretationMode } from "@/lib/interpretation-modes";
import { getModeLabels, generateInterpretationSentence, getInterpretationText } from "@/lib/interpretation-modes";
import { getStatusLine, computeFieldState, getFieldStateLabel, type ReactiveEvents, type SimulationState as LanguageSimState, type FieldState } from "@/lib/language";
import { exportPNGSnapshot, exportAnimationGIF, exportSimulationData, exportMetricsLog, exportStateSnapshot, exportSettingsJSON, exportEventLog, saveConfiguration, loadConfiguration } from "@/lib/export-utils";

export default function SimulationPage() {
  const isMobile = useIsMobile();
  const engineRef = useRef<SFDEngine | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onboardingRef = useRef<OnboardingModalRef>(null);
  
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
  const [colormap, setColormap] = useState<"inferno" | "viridis" | "cividis">("viridis");
  const [hasUserSelectedColormap, setHasUserSelectedColormap] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [interpretationMode, setInterpretationMode] = useState<InterpretationMode>("structural");
    
  const [operatorContributions, setOperatorContributions] = useState<OperatorContributions>({
    curvature: 0.2, tension: 0.2, coupling: 0.2, attractor: 0.2, redistribution: 0.2,
  });
  const [structuralSignature, setStructuralSignature] = useState<StructuralSignature>({
    basinCount: 0, avgBasinDepth: 0, globalCurvature: 0, tensionVariance: 0, stabilityMetric: 1, coherence: 0.5,
  });
  const [coherenceHistory, setCoherenceHistory] = useState<number[]>([]);
  const [events, setEvents] = useState<StructuralEvent[]>([]);
  const [historyLength, setHistoryLength] = useState(0);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(0);
  const [isPlaybackMode, setIsPlaybackMode] = useState(false);
  const [showDualView, setShowDualView] = useState(false);
  const [derivedType, setDerivedType] = useState<"curvature" | "tension" | "coupling" | "variance" | "basins" | "gradientFlow" | "criticality" | "hysteresis" | "constraintSkeleton" | "stabilityField" | "gradientFlowLines">("constraintSkeleton");
  const [derivedField, setDerivedField] = useState<DerivedField | null>(null);
  const [basinMap, setBasinMap] = useState<BasinMap | null>(null);
  const [varianceChange, setVarianceChange] = useState(0);
  const prevVarianceRef = useRef(0);
  const [reactiveEvents, setReactiveEvents] = useState<Partial<ReactiveEvents>>({});
  const [simulationPhase, setSimulationPhase] = useState<"idle" | "firstMotion" | "running">("idle");
  const [fieldState, setFieldState] = useState<FieldState>("calm");
  const [diagnosticsVisible, setDiagnosticsVisible] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const prevBasinCountRef = useRef<number | null>(null);
  const frameCountRef = useRef(0);
  const lastDerivedCacheStepRef = useRef(0);
  
  // New MVP feature states
  const [perturbMode, setPerturbMode] = useState(false);
  const [trajectoryProbeActive, setTrajectoryProbeActive] = useState(false);
  const [trajectoryProbePoint, setTrajectoryProbePoint] = useState<{ x: number; y: number } | null>(null);
  const [blendMode, setBlendMode] = useState(false);
  const [blendOpacity, setBlendOpacity] = useState(0.5);
  const configInputRef = useRef<HTMLInputElement>(null);
  
  
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
  
  const modeLabels = getModeLabels(interpretationMode);

  useEffect(() => {
    const initialParams = isMobile ? mobileParameters : defaultParameters;
    setParams(initialParams);
    const engine = new SFDEngine(initialParams);
    engineRef.current = engine;

    engine.onStateUpdate((newState, newField) => {
      frameCountRef.current += 1;
      const frameCount = frameCountRef.current;
      const inPlayback = engine.isInPlaybackMode();
      
      unstable_batchedUpdates(() => {
        setState(newState);
        setField(newField);
        
        // Always update these during playback, otherwise throttle
        if (inPlayback || frameCount % 3 === 0) {
          setOperatorContributions(engine.getOperatorContributions());
          setStructuralSignature(engine.getCachedSignature());
          setCoherenceHistory(engine.getCoherenceHistory());
          setHistoryLength(engine.getHistoryLength());
          setCurrentHistoryIndex(engine.getCurrentHistoryIndex());
          setIsPlaybackMode(inPlayback);
        }
        
        // Always update dual view fields during playback
        if (showDualViewRef.current) {
          if (derivedTypeRef.current === "basins") {
            if (inPlayback || frameCount % 5 === 0) {
              setBasinMap(engine.getBasinMap());
            }
          } else {
            setDerivedField(engine.getCachedDerivedField(derivedTypeRef.current));
          }
        }
        
        if (inPlayback || frameCount % 5 === 0) {
          setEvents(engine.getEvents());
          if (!showDualViewRef.current || derivedTypeRef.current !== "basins") {
            setBasinMap(engine.getBasinMap());
          }
          
          setVarianceChange(newState.variance - prevVarianceRef.current);
          prevVarianceRef.current = newState.variance;
          const currentEvents = engine.getReactiveEvents();
          setReactiveEvents(currentEvents);
          setSimulationPhase(engine.getSimulationPhase());
          
          const basinCountChanged = prevBasinCountRef.current !== null && newState.basinCount !== prevBasinCountRef.current;
          prevBasinCountRef.current = newState.basinCount;
          
          // Use engine's debounced field state - hysteresis is managed by the engine
          // Only update React state when the debounced state actually changes
          const candidateState = computeFieldState(newState.variance, basinCountChanged, currentEvents);
          const debouncedState = engine.getDebouncedFieldState(candidateState);
          setFieldState(prev => prev !== debouncedState ? debouncedState : prev);
        }
      });
    });

    return () => {
      engine.stop();
    };
  }, [isMobile]);

  useEffect(() => {
    if (showDualView && engineRef.current && derivedType !== "basins") {
      setDerivedField(engineRef.current.computeDerivedField(derivedType));
    }
  }, [showDualView, derivedType]);

  // Hidden diagnostic hotkey: CTRL+SHIFT+D
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setDiagnosticsVisible(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
    const engine = engineRef.current;
    if (engine) {
      engine.stepBackward();
      setFieldState(engine.getPlaybackFieldState());
      if (showDualViewRef.current) {
        if (derivedTypeRef.current === "basins") {
          setBasinMap(engine.getBasinMap());
        } else {
          setDerivedField(engine.getCachedDerivedField(derivedTypeRef.current));
        }
      }
    }
  }, []);

  const handleSeekFrame = useCallback((index: number) => {
    const engine = engineRef.current;
    if (engine) {
      engine.seekToFrame(index);
      setFieldState(engine.getPlaybackFieldState());
      if (showDualViewRef.current) {
        if (derivedTypeRef.current === "basins") {
          setBasinMap(engine.getBasinMap());
        } else {
          setDerivedField(engine.getCachedDerivedField(derivedTypeRef.current));
        }
      }
    }
  }, []);

  const handleStepForward = useCallback(() => {
    const engine = engineRef.current;
    if (engine) {
      engine.stepForwardInHistory();
      setFieldState(engine.getPlaybackFieldState());
      if (showDualViewRef.current) {
        if (derivedTypeRef.current === "basins") {
          setBasinMap(engine.getBasinMap());
        } else {
          setDerivedField(engine.getCachedDerivedField(derivedTypeRef.current));
        }
      }
    }
  }, []);

  const handleExitPlayback = useCallback(() => {
    engineRef.current?.exitPlaybackMode();
  }, []);

  const handleClearEvents = useCallback(() => {
    engineRef.current?.clearEvents();
    setEvents([]);
  }, []);

  const handleExportEvents = useCallback(async () => {
    await exportEventLog(events);
  }, [events]);

  const handleExportPNG = useCallback(async () => {
    const canvas = document.querySelector('[data-testid="canvas-visualization"]') as HTMLCanvasElement;
    await exportPNGSnapshot(canvas);
  }, []);

  const handleExportJSON = useCallback(async () => {
    if (engineRef.current) {
      await exportSettingsJSON(engineRef.current);
    }
  }, []);

  const handleExportAnimation = useCallback(async () => {
    if (!engineRef.current) return;
    setIsExporting(true);
    try {
      const canvas = document.querySelector('[data-testid="canvas-visualization"]') as HTMLCanvasElement;
      await exportAnimationGIF(engineRef.current, canvas, colormap);
    } finally {
      setIsExporting(false);
    }
  }, [colormap]);

  const handleExportSimulationData = useCallback(async () => {
    if (engineRef.current) {
      await exportSimulationData(engineRef.current);
    }
  }, []);

  const handleExportMetrics = useCallback(async () => {
    if (engineRef.current) {
      await exportMetricsLog(engineRef.current);
    }
  }, []);

  const handleExportStateSnapshot = useCallback(async () => {
    if (engineRef.current) {
      await exportStateSnapshot(engineRef.current);
    }
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

  // New MVP feature handlers
  const handleFieldClick = useCallback((x: number, y: number, shiftKey: boolean) => {
    const engine = engineRef.current;
    if (!engine) return;
    
    if (perturbMode) {
      const magnitude = shiftKey ? -0.15 : 0.15;
      engine.perturbField(x, y, magnitude, 5);
    } else if (trajectoryProbeActive) {
      setTrajectoryProbePoint({ x, y });
    }
  }, [perturbMode, trajectoryProbeActive]);

  const colormapLabel = hasUserSelectedColormap 
    ? (colormap === "viridis" ? "Viridis" : colormap === "inferno" ? "Inferno" : "Cividis") 
    : "Color Map";
  
  const handleColormapChange = useCallback((value: string) => {
    setHasUserSelectedColormap(true);
    setColormap(value as "inferno" | "viridis" | "cividis");
  }, []);

  const handleJumpToNextEvent = useCallback(() => {
    const engine = engineRef.current;
    if (engine) {
      engine.jumpToNextEvent(state.step);
      setFieldState(engine.getPlaybackFieldState());
    }
  }, [state.step]);

  const handleJumpToPreviousEvent = useCallback(() => {
    const engine = engineRef.current;
    if (engine) {
      engine.jumpToPreviousEvent(state.step);
      setFieldState(engine.getPlaybackFieldState());
    }
  }, [state.step]);

  const handleSaveConfiguration = useCallback(() => {
    const currentRegime = getFieldStateLabel(interpretationMode, fieldState);
    saveConfiguration(params, currentRegime, colormap, interpretationMode);
  }, [params, fieldState, colormap, interpretationMode]);

  const handleLoadConfiguration = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const config = await loadConfiguration(file);
    if (config) {
      setParams(config.parameters);
      setColormap(config.colormap);
      if (config.mode === "technical" || config.mode === "structural" || config.mode === "intuitive") {
        setInterpretationMode(config.mode);
      }
      engineRef.current?.setParams(config.parameters);
    }
    if (configInputRef.current) {
      configInputRef.current.value = "";
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      switch (e.code) {
        case "Space":
          e.preventDefault();
          if (state.isRunning) {
            handlePause();
          } else {
            handlePlay();
          }
          break;
        case "KeyD":
          if (!e.ctrlKey && !e.shiftKey && !e.metaKey) {
            setShowDualView((prev) => !prev);
          }
          break;
        case "KeyR":
          handleReset();
          break;
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [state.isRunning, handlePause, handlePlay, handleReset]);

  const interpretationSentence = generateInterpretationSentence(
    state.basinCount,
    state.variance,
    state.energy,
    operatorContributions.curvature,
    operatorContributions.tension,
    state.isRunning,
    varianceChange
  );
  
  const dynamicStatusLine = getStatusLine(
    interpretationMode,
    state.isRunning ? simulationPhase : "idle",
    null,
    reactiveEvents
  );

  if (isMobile) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <header className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-card/50">
          <div className="flex items-center gap-2">
            <img src={sfdLogo} alt="SFD Engine" className="w-8 h-8 rounded-md" />
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
                Run Simulation
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
      <OnboardingModal ref={onboardingRef} />
      <header className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-card/50">
        <div className="flex items-center gap-3">
          <img src={sfdLogo} alt="SFD Engine" className="w-7 h-7 rounded-md" />
          <div>
            <h1 className="text-sm font-semibold leading-tight" data-testid="text-title">SFD Engine</h1>
            <p className="text-xs text-muted-foreground">Structural Field Explorer</p>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onboardingRef.current?.replay()} 
            data-testid="button-show-intro"
            className="h-7 text-xs"
          >
            Show Intro
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

      <div className="flex flex-1 overflow-hidden">
        <main className="relative bg-gray-950 flex-1 flex flex-col">
          {/* Tools Toolbar */}
          <div className="flex items-center justify-center gap-2 px-3 py-1.5 border-b border-border bg-card/30 shrink-0">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Tools:</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setPerturbMode(!perturbMode); if (!perturbMode) setTrajectoryProbeActive(false); }}
              data-testid="button-perturb-mode"
              className={`h-6 text-[10px] gap-1 ${perturbMode ? "bg-muted" : ""}`}
            >
              <Zap className="h-3 w-3" />
              Perturb
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setTrajectoryProbeActive(!trajectoryProbeActive); if (!trajectoryProbeActive) { setPerturbMode(false); } else { setTrajectoryProbePoint(null); } }}
              data-testid="button-trajectory-probe"
              className={`h-6 text-[10px] gap-1 ${trajectoryProbeActive ? "bg-muted" : ""}`}
            >
              <Crosshair className="h-3 w-3" />
              Probe
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDiagnosticsVisible(!diagnosticsVisible)}
              data-testid="button-diagnostics"
              className={`h-6 text-[10px] gap-1 ${diagnosticsVisible ? "bg-muted" : ""}`}
            >
              <Gauge className="h-3 w-3" />
              Diagnostics
            </Button>
            <div className="w-px h-4 bg-border" />
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveConfiguration}
              data-testid="button-save-config"
              className="h-6 text-[10px] gap-1"
            >
              <Save className="h-3 w-3" />
              Save Config
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => configInputRef.current?.click()}
              data-testid="button-load-config"
              className="h-6 text-[10px] gap-1"
            >
              <Upload className="h-3 w-3" />
              Load Config
            </Button>
            <input
              ref={configInputRef}
              type="file"
              accept=".json"
              onChange={handleLoadConfiguration}
              className="hidden"
            />
          </div>

          {/* Trajectory Probe Metrics (shown when probe is active and point is set) */}
          {trajectoryProbeActive && trajectoryProbePoint && probeData && (
            <div className="flex items-center justify-center gap-4 px-3 py-1.5 border-b border-cyan-500/30 bg-cyan-950/20 text-[10px] font-mono shrink-0">
              <span className="text-cyan-400 font-medium">Probe ({trajectoryProbePoint.x}, {trajectoryProbePoint.y})</span>
              <span className="text-neutral-400"><span className="text-neutral-500">κ:</span> {probeData.curvature.toFixed(4)}</span>
              <span className="text-neutral-400"><span className="text-neutral-500">σ²:</span> {probeData.neighborhoodVariance.toFixed(4)}</span>
              <span className="text-neutral-400"><span className="text-neutral-500">|∇|:</span> {probeData.gradientMagnitude.toFixed(4)}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTrajectoryProbePoint(null)}
                className="h-5 text-[10px] ml-auto text-cyan-400"
              >
                Clear Probe
              </Button>
            </div>
          )}
          <div className="flex-1 relative">
              {showDualView ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-px h-full bg-border">
                  <div className="h-full min-h-0 flex flex-col bg-background">
                    <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border shrink-0">
                        <div className="min-w-0">
                          <h4 className="text-xs font-medium">Structural Field</h4>
                          <p className="text-[10px] text-muted-foreground whitespace-nowrap">Primary field representation showing local state values.</p>
                        </div>
                        <Select value={colormap} onValueChange={handleColormapChange}>
                          <SelectTrigger className="h-7 w-28 text-xs focus:ring-0 focus:ring-offset-0" data-testid="select-colormap-header">
                            <span>{colormapLabel}</span>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="viridis">Viridis</SelectItem>
                            <SelectItem value="inferno">Inferno</SelectItem>
                            <SelectItem value="cividis">Cividis</SelectItem>
                          </SelectContent>
                        </Select>
                    </div>
                    <div className="relative flex-1 min-h-0 flex items-center justify-center bg-gray-950">
                      <VisualizationCanvas 
                        field={field} 
                        colormap={colormap}
                        basinMap={basinMap}
                        onHover={handleHover}
                        onHoverEnd={handleHoverEnd}
                        onClick={handleFieldClick}
                        perturbMode={perturbMode}
                        trajectoryProbePoint={trajectoryProbePoint}
                      />
                    </div>
                    <StructuralFieldFooter 
                      probeData={probeData} 
                      basinMap={basinMap} 
                      isHovering={probeVisible} 
                    />
                  </div>
                  <div className="h-full min-h-0 flex flex-col bg-background">
                    <DualFieldView
                      derivedField={derivedField}
                      basinMap={basinMap}
                      derivedType={derivedType}
                      onTypeChange={setDerivedType}
                      probeData={probeData}
                      primaryField={field}
                      primaryColormap={colormap}
                      blendMode={blendMode}
                      blendOpacity={blendOpacity}
                      onBlendModeChange={setBlendMode}
                      onBlendOpacityChange={setBlendOpacity}
                    />
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col bg-background">
                  <div className="relative flex items-center justify-center px-3 py-2 border-b border-border shrink-0">
                    <div className="text-center">
                      <h4 className="text-xs font-medium">Structural Field</h4>
                      <p className="text-[10px] text-muted-foreground whitespace-nowrap">Primary field representation showing local state values.</p>
                    </div>
                    <div className="absolute right-3">
                      <Select value={colormap} onValueChange={handleColormapChange}>
                        <SelectTrigger className="h-7 w-28 text-xs focus:ring-0 focus:ring-offset-0" data-testid="select-colormap-single">
                          <span>{colormapLabel}</span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viridis">Viridis</SelectItem>
                          <SelectItem value="inferno">Inferno</SelectItem>
                          <SelectItem value="cividis">Cividis</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="relative flex-1 flex items-center justify-center bg-gray-950">
                    <VisualizationCanvas 
                      field={field} 
                      colormap={colormap}
                      basinMap={basinMap}
                      onHover={handleHover}
                      onHoverEnd={handleHoverEnd}
                      onClick={handleFieldClick}
                      perturbMode={perturbMode}
                      trajectoryProbePoint={trajectoryProbePoint}
                    />
                  </div>
                  <StructuralFieldFooter 
                    probeData={probeData} 
                    basinMap={basinMap} 
                    isHovering={probeVisible} 
                  />
                </div>
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
              </div>
            </main>
        
        <aside className="w-[420px] border-l border-border bg-card flex flex-col overflow-hidden">
          <ControlPanel
                params={params}
                state={state}
                colormap={colormap}
                interpretationMode={interpretationMode}
                operatorContributions={operatorContributions}
                structuralSignature={structuralSignature}
                coherenceHistory={coherenceHistory}
                events={events}
                historyLength={historyLength}
                currentHistoryIndex={currentHistoryIndex}
                isPlaybackMode={isPlaybackMode}
                showDualView={showDualView}
                onParamsChange={handleParamsChange}
                onPlay={handlePlay}
                onPause={handlePause}
                onReset={handleReset}
                onStep={handleStep}
                onStepBackward={handleStepBackward}
                onStepForward={handleStepForward}
                onSeekFrame={handleSeekFrame}
                onExitPlayback={handleExitPlayback}
                onColormapChange={setColormap}
                onInterpretationModeChange={setInterpretationMode}
                onClearEvents={handleClearEvents}
                onExportEvents={handleExportEvents}
                onExportPNG={handleExportPNG}
                onExportJSON={handleExportJSON}
                onExportAnimation={handleExportAnimation}
                onExportSimulationData={handleExportSimulationData}
                onExportMetrics={handleExportMetrics}
                onExportStateSnapshot={handleExportStateSnapshot}
                onShowDualViewChange={setShowDualView}
                varianceChange={varianceChange}
                isExporting={isExporting}
              />
        </aside>
      </div>
      
      {/* Floating Diagnostics Console - CTRL+SHIFT+D to toggle */}
      <FloatingDiagnostics
        engine={engineRef.current}
        isVisible={diagnosticsVisible}
        onClose={() => setDiagnosticsVisible(false)}
        events={events}
        isRunning={state.isRunning}
        currentHistoryIndex={currentHistoryIndex}
        historyLength={historyLength}
        colormap={colormap}
      />
    </div>
  );
}
