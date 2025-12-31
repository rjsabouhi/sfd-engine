import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { unstable_batchedUpdates } from "react-dom";
import { SFDEngine } from "@/lib/sfd-engine";
import { VisualizationCanvas, clearTemporalBuffer } from "@/components/visualization-canvas";
import { ControlPanel } from "@/components/control-panel";
import { MobileControlPanel } from "@/components/mobile-control-panel";
import { HoverProbe } from "@/components/hover-probe";
import { DualFieldView, OVERLAY_OPTIONS, type OverlayType } from "@/components/dual-field-view";
import { OnboardingModal, type OnboardingModalRef } from "@/components/onboarding-modal";
import { FloatingDiagnostics } from "@/components/floating-diagnostics";
import { StructuralFieldFooter } from "@/components/field-footer";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HelpCircle, Play, Pause, RotateCcw, Settings2, StepForward, StepBack, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Columns, BookOpen, Download, Map, Gauge, Zap, Crosshair, SkipForward, SkipBack, Save, Upload, Blend, Eye, Palette, Layers, PanelRightClose, PanelRightOpen, Clock, Activity, Share2, MoreVertical, SlidersHorizontal, Circle, Square } from "lucide-react";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SimulationParameters, SimulationState, FieldData, ProbeData, OperatorContributions, StructuralSignature, StructuralEvent, DerivedField, BasinMap, TrendMetrics } from "@shared/schema";
import { defaultParameters, mobileParameters, structuralPresets } from "@shared/schema";
import type { InterpretationMode } from "@/lib/interpretation-modes";
import { getModeLabels, generateInterpretationSentence, getInterpretationText } from "@/lib/interpretation-modes";
import { getStatusLine, computeFieldState, getFieldStateLabel, type ReactiveEvents, type SimulationState as LanguageSimState, type FieldState } from "@/lib/language";
import { exportPNGSnapshot, exportAnimationGIF, exportSimulationData, exportMetricsLog, exportStateSnapshot, exportSettingsJSON, exportEventLog, saveConfiguration, loadConfiguration, exportNumPyArray, exportBatchSpec, exportPythonScript, exportOperatorContributions, exportLayersSeparate, exportFullArchive, exportVideoWebM, exportMobileShareSnapshot, startLiveRecording, shareOrDownloadVideo, type RecordingController } from "@/lib/export-utils";
import { getSmartViewConfig, type SmartViewConfig } from "@/config/smart-view-map";
import { useTouchController, type DoubleTapData } from "@/lib/touch-controller";
import { visualPresets, type VisualPreset } from "@/config/visual-presets";
import { applyPreset, cancelPresetTransition } from "@/lib/apply-preset";

// Lightweight overlay canvas for mobile projection layers
const PLASMA_COLORS = [
  [13, 8, 135], [75, 3, 161], [126, 3, 168], [168, 34, 150],
  [203, 70, 121], [229, 107, 93], [248, 148, 65], [253, 195, 40], [240, 249, 33],
];
const BASIN_COLORS = [
  [59, 130, 246], [34, 197, 94], [249, 115, 22], [168, 85, 247],
  [236, 72, 153], [20, 184, 166], [245, 158, 11], [99, 102, 241],
];

function MobileOverlayCanvas({ 
  derivedField, 
  basinMap, 
  opacity,
  frameVersion,
  transform,
}: { 
  derivedField: DerivedField | null; 
  basinMap: BasinMap | null; 
  opacity: number;
  frameVersion: number;
  transform?: { zoom: number; panX: number; panY: number };
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visualSize, setVisualSize] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Match VisualizationCanvas sizing: min(w,h) * 0.88 scale factor
    const container = canvas.parentElement;
    if (container) {
      const containerSize = Math.min(container.clientWidth, container.clientHeight);
      const size = Math.floor(containerSize * 0.88);
      canvas.width = size;
      canvas.height = size;
      setVisualSize(size);
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (basinMap && basinMap.labels.length > 0) {
      // Render basin overlay with fully opaque colors (crossfade via canvas opacity)
      const { labels, width, height } = basinMap;
      const cellW = canvas.width / width;
      const cellH = canvas.height / height;
      
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const basinId = labels[y * width + x];
          if (basinId >= 0) {
            const color = BASIN_COLORS[basinId % BASIN_COLORS.length];
            ctx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
            ctx.fillRect(x * cellW, y * cellH, cellW + 0.5, cellH + 0.5);
          } else {
            // Fill unassigned pixels with dark background
            ctx.fillStyle = 'rgb(20, 20, 30)';
            ctx.fillRect(x * cellW, y * cellH, cellW + 0.5, cellH + 0.5);
          }
        }
      }
    } else if (derivedField) {
      // Render derived field overlay using plasma colormap
      const { grid, width, height } = derivedField;
      // Compute min/max for normalization
      let min = Infinity, max = -Infinity;
      for (let i = 0; i < grid.length; i++) {
        if (grid[i] < min) min = grid[i];
        if (grid[i] > max) max = grid[i];
      }
      const range = max - min || 1;
      const cellW = canvas.width / width;
      const cellH = canvas.height / height;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const val = grid[y * width + x];
          const t = Math.max(0, Math.min(1, (val - min) / range));
          const idx = Math.min(Math.floor(t * (PLASMA_COLORS.length - 1)), PLASMA_COLORS.length - 2);
          const f = t * (PLASMA_COLORS.length - 1) - idx;
          const c1 = PLASMA_COLORS[idx];
          const c2 = PLASMA_COLORS[idx + 1];
          const r = Math.round(c1[0] + f * (c2[0] - c1[0]));
          const g = Math.round(c1[1] + f * (c2[1] - c1[1]));
          const b = Math.round(c1[2] + f * (c2[2] - c1[2]));
          ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
          ctx.fillRect(x * cellW, y * cellH, cellW + 0.5, cellH + 0.5);
        }
      }
    }
  }, [derivedField, basinMap, frameVersion]);

  // Apply same transform as base canvas for synchronized zoom/pan
  const zoom = transform?.zoom ?? 1;
  const panX = transform?.panX ?? 0;
  const panY = transform?.panY ?? 0;

  return (
    <canvas
      ref={canvasRef}
      data-testid="canvas-overlay"
      className="absolute top-1/2 left-1/2 pointer-events-none rounded-md"
      style={{ 
        opacity, 
        transform: `translate(-50%, -50%) translate(${panX}px, ${panY}px) scale(${zoom})`,
        transformOrigin: 'center center',
        width: visualSize || 'auto',
        height: visualSize || 'auto',
      }}
    />
  );
}

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
  const [mobileActiveTab, setMobileActiveTab] = useState<string | null>(null);
  const [mobileSelectedOperator, setMobileSelectedOperator] = useState<"wK" | "wT" | "wC" | "wA" | "wR">("wK");
  const [interpretationMode, setInterpretationMode] = useState<InterpretationMode>("structural");
    
  const [operatorContributions, setOperatorContributions] = useState<OperatorContributions>({
    curvature: 0.2, tension: 0.2, coupling: 0.2, attractor: 0.2, redistribution: 0.2,
  });
  const [structuralSignature, setStructuralSignature] = useState<StructuralSignature>({
    basinCount: 0, avgBasinDepth: 0, globalCurvature: 0, tensionVariance: 0, stabilityMetric: 1, coherence: 0.5,
  });
  const [coherenceHistory, setCoherenceHistory] = useState<number[]>([]);
  const [trendMetrics, setTrendMetrics] = useState<TrendMetrics | null>(null);
  const [events, setEvents] = useState<StructuralEvent[]>([]);
  const [historyLength, setHistoryLength] = useState(0);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(0);
  const [isPlaybackMode, setIsPlaybackMode] = useState(false);
  const [showDualView, setShowDualView] = useState(false);
  const [derivedType, setDerivedType] = useState<OverlayType>("constraintSkeleton");
  const [hasUserSelectedOverlay, setHasUserSelectedOverlay] = useState(false);
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
  const [fieldInspectorEnabled, setFieldInspectorEnabled] = useState(false);
  const [perturbMode, setPerturbMode] = useState(false);
  const [trajectoryProbeActive, setTrajectoryProbeActive] = useState(false);
  const [trajectoryProbePoint, setTrajectoryProbePoint] = useState<{ x: number; y: number } | null>(null);
  const [blendMode, setBlendMode] = useState(false);
  const [blendOpacity, setBlendOpacity] = useState(0.5);
  const [canvasTransform, setCanvasTransform] = useState<{ zoom: number; panX: number; panY: number }>({ zoom: 1, panX: 0, panY: 0 });
  const [perceptualSmoothing, setPerceptualSmoothing] = useState(true); // Perceptual Safety Layer
  const [metricsPanelCollapsed, setMetricsPanelCollapsed] = useState(false);
  const configInputRef = useRef<HTMLInputElement>(null);
  
  // Mobile touch interaction states
  const [regimeOverlay, setRegimeOverlay] = useState<string | null>(null);
  const [instabilityFlash, setInstabilityFlash] = useState(false);
  const [tiltOffset, setTiltOffset] = useState({ x: 0, y: 0 });
  const [mobileLayerIndex, setMobileLayerIndex] = useState(0);
  const [layersSubtab, setLayersSubtab] = useState<'structure' | 'presets'>('structure');
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const touchContainerRef = useRef<HTMLDivElement>(null);
  const regimeOverlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Recording state for mobile video capture
  const [isRecording, setIsRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [recordedVideoBlob, setRecordedVideoBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showVideoDialog, setShowVideoDialog] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const recordingControllerRef = useRef<RecordingController | null>(null);
  
  // Manage preview URL lifecycle to prevent caching issues
  // Also trigger dialog display when new URL is ready
  useEffect(() => {
    if (recordedVideoBlob) {
      // Revoke any existing URL first
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      // Create new URL and show dialog
      const url = URL.createObjectURL(recordedVideoBlob);
      console.log("[Preview] Created new URL:", url, "for blob size:", recordedVideoBlob.size);
      setPreviewUrl(url);
      setShowVideoDialog(true);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(null);
    }
  }, [recordedVideoBlob]);
  
  // Mobile layers for layer selector
  const mobileLayers = [
    { key: "none", label: "Base", icon: "◉" },
    { key: "constraintSkeleton", label: "Structure", icon: "◈" },
    { key: "tension", label: "Tension", icon: "≋" },
    { key: "curvature", label: "Curvature", icon: "∿" },
    { key: "variance", label: "Variance", icon: "◐" },
    { key: "basins", label: "Basins", icon: "⬡" },
  ] as const;

  // Helper function to select a mobile layer
  const selectMobileLayer = (layerIdx: number) => {
    setMobileLayerIndex(layerIdx);
    const newLayer = mobileLayers[layerIdx];
    
    // Toggle dual view based on layer selection
    if (newLayer.key === "none") {
      setShowDualView(false);
      setBlendMode(false);
    } else {
      setShowDualView(true);
      setBlendMode(true);
      setBlendOpacity(0.5);
      const layerKey = newLayer.key;
      setDerivedType(layerKey as OverlayType);
      if (engineRef.current) {
        if (layerKey === "basins") {
          setBasinMap(engineRef.current.getBasinMap());
        } else {
          setDerivedField(engineRef.current.computeDerivedField(layerKey as "constraintSkeleton" | "tension" | "curvature" | "variance"));
        }
      }
    }
  };
  
  
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
    
    // Set slower simulation speed on mobile for better viewing
    if (isMobile) {
      engine.setSimulationSpeed(8); // 8 steps per second on mobile
    }

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
          setTrendMetrics(engine.getTrendMetrics());
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
      // Cleanup overlay timeout refs
      if (regimeOverlayTimeoutRef.current) {
        clearTimeout(regimeOverlayTimeoutRef.current);
      }
    };
  }, [isMobile]);

  useEffect(() => {
    if (showDualView && engineRef.current) {
      if (derivedType === "basins") {
        // Immediately fetch basin map when switching to basins view
        setBasinMap(engineRef.current.getBasinMap());
      } else {
        setDerivedField(engineRef.current.computeDerivedField(derivedType));
      }
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
      // Clear derived field when mode changes to prevent stale rendering
      if (newParams.mode !== undefined && newParams.mode !== prev.mode) {
        setDerivedField(null);
        setBasinMap(null);
      }
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
    clearTemporalBuffer();
    engineRef.current?.reset();
  }, []);

  // Mobile video recording handler
  const handleStartRecording = useCallback(async () => {
    const canvas = document.querySelector('[data-testid="canvas-visualization"]') as HTMLCanvasElement;
    if (!canvas) {
      console.error("[Recording] Canvas not found");
      return;
    }
    
    // Find overlay canvas if present (for compositing layers)
    const overlayCanvas = document.querySelector('[data-testid="canvas-overlay"]') as HTMLCanvasElement | null;
    
    // Clear any previous recording data first
    setRecordedVideoBlob(null);
    setRecordingError(null);
    setRecordingProgress(0);
    
    // Reset the controller reference for fresh recording
    recordingControllerRef.current = null;
    
    // Ensure simulation is running for recording
    if (!state.isRunning) {
      handlePlay();
    }
    
    setIsRecording(true);
    
    const controller = await startLiveRecording(
      canvas,
      10, // 10 seconds = 100 frames at 10fps (matches playback buffer)
      (progress) => setRecordingProgress(progress),
      (blob) => {
        setIsRecording(false);
        setRecordingProgress(0);
        recordingControllerRef.current = null;
        
        // Store the blob - dialog will be shown by useEffect when previewUrl is ready
        if (blob.size > 0) {
          setRecordedVideoBlob(blob);
          // Dialog shown in useEffect after previewUrl is created
        } else {
          setRecordingError("Recording produced no data. Your device may not support video capture.");
          setShowVideoDialog(true);
        }
      },
      (error) => {
        setIsRecording(false);
        setRecordingProgress(0);
        recordingControllerRef.current = null;
        console.error("Recording error:", error);
        setRecordingError(error);
        setShowVideoDialog(true);
      },
      overlayCanvas // Pass overlay canvas for compositing
    );
    
    recordingControllerRef.current = controller;
  }, [state.isRunning, handlePlay]);

  const handleStopRecording = useCallback(() => {
    if (recordingControllerRef.current) {
      recordingControllerRef.current.stop();
    }
  }, []);

  const handleSaveVideo = useCallback(async () => {
    if (!recordedVideoBlob) {
      console.log("[Save] No blob to save");
      return;
    }
    console.log("[Save] Saving blob:", recordedVideoBlob.type, recordedVideoBlob.size);
    const isGif = recordedVideoBlob.type.includes("gif");
    const extension = isGif ? "gif" : recordedVideoBlob.type.includes("mp4") ? "mp4" : "webm";
    const filename = `sfd-simulation-${Date.now()}.${extension}`;
    
    // On iOS, use the share API which opens the native share sheet
    // Users can then "Save Image" from there
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    if (isIOS && navigator.share && navigator.canShare) {
      try {
        const file = new File([recordedVideoBlob], filename, { type: recordedVideoBlob.type });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: "SFD Animation"
          });
          setShowVideoDialog(false);
          setRecordedVideoBlob(null);
          return;
        }
      } catch (err) {
        // User cancelled - that's fine, keep dialog open
        console.log("[Save] Share cancelled:", err);
        return;
      }
    }
    
    // Fallback for non-iOS: standard download
    const url = URL.createObjectURL(recordedVideoBlob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setShowVideoDialog(false);
    setRecordedVideoBlob(null);
  }, [recordedVideoBlob]);

  const handleShareVideo = useCallback(async () => {
    if (!recordedVideoBlob) return;
    const isGif = recordedVideoBlob.type.includes("gif");
    const extension = isGif ? "gif" : recordedVideoBlob.type.includes("mp4") ? "mp4" : "webm";
    const filename = `sfd-simulation-${Date.now()}.${extension}`;
    
    const file = new File([recordedVideoBlob], filename, { type: recordedVideoBlob.type });
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: "SFD Simulation",
          text: "Check out this field dynamics simulation!"
        });
        setShowVideoDialog(false);
        setRecordedVideoBlob(null);
      } catch (err) {
        // User cancelled or share failed - keep dialog open
        console.log("Share cancelled or failed:", err);
      }
    } else {
      // Fallback to save if share not available
      handleSaveVideo();
    }
  }, [recordedVideoBlob, handleSaveVideo]);

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

  // Animated seek - steps through frames one at a time with visual feedback
  const animatedSeekRef = useRef<NodeJS.Timeout | null>(null);
  
  const handleAnimatedSeek = useCallback((targetIndex: number) => {
    const engine = engineRef.current;
    if (!engine) return;
    
    // Cancel any existing animation
    if (animatedSeekRef.current) {
      clearInterval(animatedSeekRef.current);
      animatedSeekRef.current = null;
    }
    
    const currentIndex = engine.getCurrentHistoryIndex();
    if (currentIndex === targetIndex) return;
    
    const direction = targetIndex > currentIndex ? 1 : -1;
    let current = currentIndex;
    
    // Step through frames at ~7fps (150ms per frame) for watchable playback
    animatedSeekRef.current = setInterval(() => {
      current += direction;
      
      engine.seekToFrame(current);
      setFieldState(engine.getPlaybackFieldState());
      setCurrentHistoryIndex(current); // Update slider position
      if (showDualViewRef.current) {
        if (derivedTypeRef.current === "basins") {
          setBasinMap(engine.getBasinMap());
        } else {
          setDerivedField(engine.getCachedDerivedField(derivedTypeRef.current));
        }
      }
      
      // Stop when we reach target
      if (current === targetIndex || (direction > 0 && current >= targetIndex) || (direction < 0 && current <= targetIndex)) {
        if (animatedSeekRef.current) {
          clearInterval(animatedSeekRef.current);
          animatedSeekRef.current = null;
        }
      }
    }, 150);
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

  const handleExportNumPy = useCallback(async () => {
    if (engineRef.current) {
      await exportNumPyArray(engineRef.current);
    }
  }, []);

  const handleExportBatchSpec = useCallback(async () => {
    if (engineRef.current) {
      await exportBatchSpec(engineRef.current);
    }
  }, []);

  const handleExportPython = useCallback(async () => {
    if (engineRef.current) {
      await exportPythonScript(engineRef.current);
    }
  }, []);

  const handleExportOperators = useCallback(async () => {
    if (engineRef.current) {
      await exportOperatorContributions(engineRef.current);
    }
  }, []);

  const handleExportLayers = useCallback(async () => {
    if (engineRef.current) {
      await exportLayersSeparate(engineRef.current, "npz");
    }
  }, []);

  const handleExportArchive = useCallback(async () => {
    if (engineRef.current) {
      await exportFullArchive(engineRef.current, events, colormap);
    }
  }, [events, colormap]);

  const handleExportWebM = useCallback(async () => {
    if (!engineRef.current) return;
    setIsExporting(true);
    try {
      const canvas = document.querySelector('[data-testid="canvas-visualization"]') as HTMLCanvasElement;
      await exportVideoWebM(engineRef.current, canvas, colormap);
    } finally {
      setIsExporting(false);
    }
  }, [colormap]);

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

  // Toggle dual view with synchronous field initialization to prevent flash
  const handleToggleDualView = useCallback((show?: boolean) => {
    setShowDualView((prev) => {
      const newValue = show !== undefined ? show : !prev;
      if (newValue && engineRef.current) {
        // Synchronously set derived field before React re-renders
        if (derivedType === "basins") {
          setBasinMap(engineRef.current.getBasinMap());
        } else {
          setDerivedField(engineRef.current.computeDerivedField(derivedType));
        }
      }
      return newValue;
    });
  }, [derivedType]);

  // Smart View Router - automatically select optimal layer/blend for presets
  const handleSmartViewApply = useCallback((config: SmartViewConfig) => {
    setDerivedType(config.defaultLayer);
    setBlendOpacity(config.defaultBlend);
    setBlendMode(config.enableBlend);
    setHasUserSelectedOverlay(false);
    
    if (engineRef.current) {
      if (config.defaultLayer === "basins") {
        setBasinMap(engineRef.current.getBasinMap());
      } else {
        setDerivedField(engineRef.current.computeDerivedField(config.defaultLayer));
      }
    }
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

  // Visual preset application with smooth tweening
  const handleApplyPreset = useCallback((preset: VisualPreset) => {
    setActivePresetId(preset.id);
    
    applyPreset(preset, {
      currentBlend: blendOpacity,
      currentSmoothing: perceptualSmoothing ? 1 : 0,
      currentCurvature: params.wK,
      onBlendChange: setBlendOpacity,
      onSmoothingChange: (value) => setPerceptualSmoothing(value > 0.5),
      onCurvatureChange: (value) => {
        const newParams = { ...params, wK: value };
        setParams(newParams);
        engineRef.current?.setParams(newParams);
      },
      onColorMapChange: (cm) => {
        if (cm === 'viridis' || cm === 'inferno' || cm === 'cividis') {
          setColormap(cm);
          setHasUserSelectedColormap(true);
        }
      },
      onComplete: () => {
        // Preset transition complete
      },
      transitionDuration: 400,
    });
  }, [blendOpacity, perceptualSmoothing, params]);

  // Compute regime-sensitive amplitude for touch interactions
  const regimeAmplitude = useMemo(() => {
    const wK = params.wK;
    const wT = params.wT;
    if (wK > 1.5 || wT > 1.5) return 0.35;
    if (wK < 0.3 && wT < 0.3) return 0.15;
    return 0.25;
  }, [params.wK, params.wT]);

  // Touch controller for advanced mobile interactions (consolidated gesture handling)
  const { touchState, handlers: touchHandlers, clearDoubleTapData } = useTouchController(
    engineRef,
    field?.width || 200,
    field?.height || 200,
    touchContainerRef,
    { 
      regimeAmplitude,
      onSwipeLeft: () => handleSwipeRegime('left'),
      onSwipeRight: () => handleSwipeRegime('right'),
      visualScale: 0.88,
    }
  );

  // Cleanup touch controller on unmount
  useEffect(() => {
    return () => {
      clearDoubleTapData();
      cancelPresetTransition();
    };
  }, [clearDoubleTapData]);

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
            handleToggleDualView();
          }
          break;
        case "KeyR":
          handleReset();
          break;
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [state.isRunning, handlePause, handlePlay, handleReset, handleToggleDualView]);

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

  // Mobile: Instability detection flash effect
  const isHighVariance = state.variance > 0.2;
  const prevHighVarianceRef = useRef(false);
  
  useEffect(() => {
    if (isMobile && isHighVariance && !prevHighVarianceRef.current && state.isRunning) {
      setInstabilityFlash(true);
      const timeout = setTimeout(() => setInstabilityFlash(false), 500);
      prevHighVarianceRef.current = true;
      return () => clearTimeout(timeout);
    }
    if (!isHighVariance) {
      prevHighVarianceRef.current = false;
    }
  }, [isHighVariance, state.isRunning]);

  // Mobile: Device orientation for tilt parallax
  useEffect(() => {
    if (!isMobile) return;
    
    const handleOrientation = (e: DeviceOrientationEvent) => {
      const gamma = e.gamma || 0; // Left-right tilt (-90 to 90)
      const beta = e.beta || 0;   // Front-back tilt (-180 to 180)
      
      // Subtle parallax offset (max 3px)
      const x = Math.max(-3, Math.min(3, gamma * 0.1));
      const y = Math.max(-3, Math.min(3, (beta - 45) * 0.1));
      
      setTiltOffset({ x, y });
    };
    
    if (typeof DeviceOrientationEvent !== 'undefined') {
      window.addEventListener('deviceorientation', handleOrientation);
      return () => window.removeEventListener('deviceorientation', handleOrientation);
    }
  }, []);

  // Swipe handlers for regime change (consolidated in touch controller)
  const mobileRegimeKeys = useMemo(() => 
    ["uniform-field", "high-curvature", "criticality-cascade", "fractal-corridor", "cosmic-web"],
  []);
  const mobileRegimeLabels = useMemo(() => 
    ["Equilibrium", "Kappa-Shear", "Tension", "Fractal", "Collapse"],
  []);

  const handleSwipeRegime = useCallback((direction: 'left' | 'right') => {
    const currentIdx = mobileRegimeKeys.findIndex(key => {
      const preset = structuralPresets[key as keyof typeof structuralPresets];
      return preset && preset.wK === params.wK && preset.wT === params.wT;
    });
    
    let newIdx = currentIdx;
    if (direction === 'right') {
      newIdx = currentIdx > 0 ? currentIdx - 1 : mobileRegimeKeys.length - 1;
    } else {
      newIdx = (currentIdx + 1) % mobileRegimeKeys.length;
    }
    
    const newPreset = structuralPresets[mobileRegimeKeys[newIdx] as keyof typeof structuralPresets];
    if (newPreset) {
      handleParamsChange(newPreset);
      
      if (regimeOverlayTimeoutRef.current) {
        clearTimeout(regimeOverlayTimeoutRef.current);
      }
      setRegimeOverlay(mobileRegimeLabels[newIdx] + " Mode");
      regimeOverlayTimeoutRef.current = setTimeout(() => setRegimeOverlay(null), 600);
    }
  }, [params, mobileRegimeKeys, mobileRegimeLabels, handleParamsChange]);

  if (isMobile) {
    const mobileRegimes = [
      { key: "uniform-field", symbol: "E", label: "Equilibrium", description: "Balanced field" },
      { key: "high-curvature", symbol: "κ", label: "Kappa-Shear", description: "Curvature flow" },
      { key: "criticality-cascade", symbol: "T", label: "Tension", description: "Tension mode" },
      { key: "fractal-corridor", symbol: "F", label: "Fractal", description: "Rapid formation" },
      { key: "cosmic-web", symbol: "C", label: "Collapse", description: "High instability" },
    ];

    const colorMaps = [
      { key: "viridis" as const, symbol: "V", label: "Viridis" },
      { key: "inferno" as const, symbol: "I", label: "Inferno" },
      { key: "cividis" as const, symbol: "C", label: "Cividis" },
    ];

    const currentRegimeKey = Object.entries(structuralPresets).find(
      ([_, preset]) => preset.wK === params.wK && preset.wT === params.wT
    )?.[0] || "uniform-field";

    const stabilityState = state.variance < 0.05 ? "Stable" : state.variance < 0.15 ? "Active" : "Unstable";
    const stabilityColor = state.variance < 0.05 ? "text-green-400" : state.variance < 0.15 ? "text-yellow-400" : "text-red-400";

    return (
      <div className="relative h-screen w-screen overflow-hidden bg-gray-950">
        {/* Full-screen canvas with touch handlers and tilt parallax */}
        <div 
          ref={touchContainerRef}
          className="absolute inset-0"
          onTouchStart={touchHandlers.onTouchStart}
          onTouchMove={touchHandlers.onTouchMove}
          onTouchEnd={touchHandlers.onTouchEnd}
          style={{
            transform: `translate(${tiltOffset.x}px, ${tiltOffset.y}px)`,
            transition: 'transform 0.1s ease-out',
            touchAction: 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            WebkitTouchCallout: 'none',
          } as React.CSSProperties}
        >
          <VisualizationCanvas 
            field={field} 
            colormap={colormap} 
            basinMap={basinMap}
            perceptualSmoothing={perceptualSmoothing}
            onTransformChange={setCanvasTransform}
            disableTouch={true}
          />
          
          {/* Overlay layer when a projection is selected */}
          {mobileLayerIndex > 0 && (derivedField || (mobileLayers[mobileLayerIndex].key === "basins" && basinMap)) && (
            <MobileOverlayCanvas
              derivedField={mobileLayers[mobileLayerIndex].key === "basins" ? null : derivedField}
              basinMap={mobileLayers[mobileLayerIndex].key === "basins" ? basinMap : null}
              opacity={blendOpacity}
              frameVersion={state.step}
              transform={canvasTransform}
            />
          )}
        </div>

        {/* Instability flash overlay */}
        {instabilityFlash && (
          <div 
            className="absolute inset-0 pointer-events-none z-50"
            style={{
              boxShadow: 'inset 0 0 60px 20px rgba(239, 68, 68, 0.4)',
              animation: 'pulse 0.5s ease-out',
            }}
          />
        )}

        {/* Regime change overlay */}
        {regimeOverlay && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
            <div 
              className="bg-black/70 backdrop-blur-md px-6 py-3 rounded-xl border border-white/20"
              style={{
                animation: 'fadeInOut 0.6s ease-out forwards',
              }}
            >
              <span className="text-lg font-semibold text-white">{regimeOverlay}</span>
            </div>
          </div>
        )}

        {/* Double-tap field sampler tooltip */}
        {touchState.lastDoubleTapData && (
          <div 
            className="absolute pointer-events-none z-50"
            style={{
              left: touchState.lastDoubleTapData.x,
              top: touchState.lastDoubleTapData.y - 80,
              transform: 'translateX(-50%)',
            }}
          >
            <div 
              className="bg-gray-900/90 backdrop-blur-md px-3 py-2 rounded-lg border border-white/20 shadow-lg"
              style={{ animation: 'fadeIn 0.2s ease-out' }}
            >
              <div className="text-[10px] text-white/50 mb-1">Field Sample</div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-cyan-400 font-mono">
                  k {touchState.lastDoubleTapData.localKappa.toFixed(3)}
                </span>
                <span className="text-amber-400 font-mono">
                  e {touchState.lastDoubleTapData.localEpsilon.toFixed(3)}
                </span>
                <span className={`font-medium ${
                  touchState.lastDoubleTapData.stabilityClass === 'stable' ? 'text-green-400' :
                  touchState.lastDoubleTapData.stabilityClass === 'borderline' ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {touchState.lastDoubleTapData.stabilityClass}
                </span>
              </div>
            </div>
          </div>
        )}


        {/* Top Bar - dark, minimal */}
        <div className="absolute top-0 left-0 right-0 z-20 bg-gray-950/80 backdrop-blur-md border-b border-white/5">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <img src={sfdLogo} alt="SFD" className="w-7 h-7 rounded-md" />
              <div>
                <h1 className="text-sm font-semibold text-white">SFD Engine</h1>
                <p className="text-[10px] text-white/50">Structural Field Explorer</p>
              </div>
            </div>
            
            {/* Header actions */}
            <div className="flex items-center gap-1">
              {/* Colors button in header */}
              <button
                onClick={() => setMobileActiveTab(mobileActiveTab === "colors" ? null : "colors")}
                className={`p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-all ${
                  mobileActiveTab === "colors" ? 'bg-cyan-500/20' : ''
                }`}
                data-testid="button-colors-header-mobile"
                aria-label="Choose color map"
              >
                <Palette className={`h-5 w-5 ${mobileActiveTab === "colors" ? 'text-cyan-400' : 'text-white/60'}`} />
              </button>
              
              {/* Options menu */}
              <Dialog>
                <DialogTrigger asChild>
                  <button className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center" data-testid="button-menu-mobile" aria-label="Options menu">
                    <MoreVertical className="h-5 w-5 text-white/60" />
                  </button>
                </DialogTrigger>
              <DialogContent className="max-w-[90vw] bg-gray-900/95 backdrop-blur-xl border-white/10">
                <DialogHeader>
                  <DialogTitle className="text-white">About SFD Engine</DialogTitle>
                  <DialogDescription asChild>
                    <div className="pt-4 space-y-3 text-sm text-white/70">
                      <span className="block">
                        Structural Field Dynamics simulates complex adaptive systems
                        through operator-driven field evolution.
                      </span>
                      <span className="block">
                        <strong className="text-white/90">Operators:</strong> Curvature, Gradient-Tension,
                        Neighbor-Coupling, Attractor-Formation, Global Redistribution
                      </span>
                    </div>
                  </DialogDescription>
                </DialogHeader>
              </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>


        {/* Floating metrics - positioned on left side, outside visualization */}
        {!mobileActiveTab && (
          <div className="absolute left-1 top-1/2 -translate-y-1/2 z-20 pointer-events-none">
            <div className="bg-black/60 backdrop-blur-sm rounded-md px-2 py-3 flex flex-col items-start gap-2">
              <span className={`text-[10px] font-medium ${stabilityColor}`} data-testid="text-state-mobile">
                {stabilityState}
              </span>
              <span className="text-[10px] font-mono text-white/70" data-testid="text-kappa-mobile">
                κ {operatorContributions.curvature.toFixed(2)}
              </span>
              <span className="text-[10px] font-mono text-white/70" data-testid="text-energy-mobile">
                e {state.energy.toFixed(3)}
              </span>
            </div>
          </div>
        )}


        {/* Inline Regimes Panel - appears when Regimes is active */}
        {mobileActiveTab === "regimes" && (
          <div className="absolute bottom-20 left-0 right-0 z-40 pb-safe">
            <div className="mx-4 bg-gray-950/70 backdrop-blur-md rounded-2xl border border-white/10 p-4">
              <div className="flex items-center justify-center gap-3">
                {mobileRegimes.map((regime) => (
                  <button
                    key={regime.key}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (structuralPresets[regime.key]) {
                        handleParamsChange(structuralPresets[regime.key]);
                        const smartConfig = getSmartViewConfig(regime.key);
                        if (smartConfig) {
                          handleSmartViewApply(smartConfig);
                        }
                      }
                    }}
                    className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-full flex flex-col items-center justify-center transition-all active:scale-95 ${
                      currentRegimeKey === regime.key
                        ? 'bg-purple-500/30 border-2 border-purple-400'
                        : 'bg-white/10 border-2 border-white/20 active:bg-white/20'
                    }`}
                    data-testid={`button-regime-${regime.key}-mobile`}
                    aria-label={regime.label}
                  >
                    <span className={`text-base font-semibold ${currentRegimeKey === regime.key ? 'text-purple-400' : 'text-white/80'}`}>
                      {regime.symbol}
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-center text-[11px] text-white/50 mt-3">
                {mobileRegimes.find(r => r.key === currentRegimeKey)?.label || "Custom"} - {mobileRegimes.find(r => r.key === currentRegimeKey)?.description || "User defined"}
              </p>
            </div>
          </div>
        )}

        {/* Inline Colors Panel - appears when Colors is active */}
        {mobileActiveTab === "colors" && (
          <div className="absolute bottom-20 left-0 right-0 z-40 pb-safe">
            <div className="mx-4 bg-gray-950/70 backdrop-blur-md rounded-2xl border border-white/10 p-4">
              <div className="flex items-center justify-center gap-4">
                {colorMaps.map((cm) => (
                  <button
                    key={cm.key}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setColormap(cm.key);
                    }}
                    className={`w-12 h-12 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center transition-all active:scale-95 ${
                      colormap === cm.key
                        ? 'bg-cyan-500/30 border-2 border-cyan-400'
                        : 'bg-white/10 border-2 border-white/20 active:bg-white/20'
                    }`}
                    data-testid={`button-colormap-${cm.key}-mobile`}
                    aria-label={cm.label}
                  >
                    <span className={`text-base font-semibold ${colormap === cm.key ? 'text-cyan-400' : 'text-white/80'}`}>
                      {cm.symbol}
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-center text-[11px] text-white/50 mt-3">
                {colorMaps.find(c => c.key === colormap)?.label || "Viridis"}
              </p>
            </div>
          </div>
        )}

        {/* Inline Layers Panel - appears when Layers is active */}
        {mobileActiveTab === "layers" && (
          <div className="absolute bottom-20 left-0 right-0 z-40 pb-safe">
            <div className="mx-4 bg-gray-950/70 backdrop-blur-md rounded-2xl border border-white/10 p-4">
              {/* Subtab selector */}
              <div className="flex items-center justify-center gap-2 mb-4">
                <button
                  onClick={() => setLayersSubtab('structure')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    layersSubtab === 'structure'
                      ? 'bg-cyan-500/30 text-cyan-400'
                      : 'bg-white/10 text-white/60'
                  }`}
                  data-testid="button-layers-structure-tab"
                >
                  Structure
                </button>
                <button
                  onClick={() => setLayersSubtab('presets')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    layersSubtab === 'presets'
                      ? 'bg-purple-500/30 text-purple-400'
                      : 'bg-white/10 text-white/60'
                  }`}
                  data-testid="button-layers-presets-tab"
                >
                  Presets
                </button>
              </div>

              {/* Structure subtab content */}
              {layersSubtab === 'structure' && (
                <>
                  <div className="flex items-center justify-center gap-3 flex-wrap">
                    {mobileLayers.map((layer, idx) => (
                      <button
                        key={layer.key}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          selectMobileLayer(idx);
                        }}
                        className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-full flex flex-col items-center justify-center transition-all active:scale-95 ${
                          mobileLayerIndex === idx
                            ? 'bg-cyan-500/30 border-2 border-cyan-400'
                            : 'bg-white/10 border-2 border-white/20 active:bg-white/20'
                        }`}
                        data-testid={`button-layer-${layer.key}-mobile`}
                        aria-label={layer.label}
                      >
                        <span className={`text-base ${mobileLayerIndex === idx ? 'text-cyan-400' : 'text-white/80'}`}>
                          {layer.icon}
                        </span>
                      </button>
                    ))}
                  </div>
                  <p className="text-center text-[11px] text-white/50 mt-3">
                    {mobileLayers[mobileLayerIndex]?.label || "Base"}
                  </p>
                  
                  {/* Blend slider - shown when overlay layer is selected */}
                  {mobileLayerIndex > 0 && (
                    <div className="mt-4 pt-3 border-t border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] text-white/60">Blend</span>
                        <span className="text-[11px] text-cyan-300 font-medium">{Math.round(blendOpacity * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={blendOpacity * 100}
                        onChange={(e) => setBlendOpacity(parseInt(e.target.value) / 100)}
                        className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                        data-testid="slider-blend-opacity-mobile"
                        aria-label="Blend opacity"
                      />
                    </div>
                  )}
                </>
              )}

              {/* Presets subtab content */}
              {layersSubtab === 'presets' && (
                <div className="overflow-x-auto pb-2 -mx-2 px-2">
                  <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
                    {visualPresets.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => handleApplyPreset(preset)}
                        className={`flex-shrink-0 w-20 p-2 rounded-xl transition-all active:scale-95 ${
                          activePresetId === preset.id
                            ? 'bg-purple-500/30 border-2 border-purple-400'
                            : 'bg-white/10 border-2 border-white/10'
                        }`}
                        data-testid={`button-preset-${preset.id}`}
                      >
                        {/* Color preview */}
                        <div 
                          className="w-full h-8 rounded-md mb-2"
                          style={{
                            background: `linear-gradient(135deg, ${preset.previewColor1}, ${preset.previewColor2})`,
                          }}
                        />
                        <span className={`text-[10px] font-medium block text-center truncate ${
                          activePresetId === preset.id ? 'text-purple-300' : 'text-white/70'
                        }`}>
                          {preset.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Inline Operator Controls - appears when Params is active */}
        {mobileActiveTab === "params" && (
          <div className="absolute bottom-20 left-0 right-0 z-40 pb-safe">
            <div className="mx-4 bg-gray-950/70 backdrop-blur-md rounded-2xl border border-white/10 p-4">
              {/* 5 Operator Circles */}
              <div className="flex items-center justify-center gap-3 mb-4">
                {([
                  { key: "wK" as const, symbol: "κ", label: "Curvature" },
                  { key: "wT" as const, symbol: "τ", label: "Tension" },
                  { key: "wC" as const, symbol: "γ", label: "Coupling" },
                  { key: "wA" as const, symbol: "α", label: "Attractor" },
                  { key: "wR" as const, symbol: "ρ", label: "Redistrib" },
                ]).map((op) => (
                  <button
                    key={op.key}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setMobileSelectedOperator(op.key);
                    }}
                    className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center transition-all active:scale-95 ${
                      mobileSelectedOperator === op.key
                        ? 'bg-amber-500/30 border-2 border-amber-400'
                        : 'bg-white/10 border-2 border-white/20 active:bg-white/20'
                    }`}
                    data-testid={`button-operator-${op.key}-mobile`}
                    aria-label={`Select ${op.label} operator`}
                  >
                    <span className={`text-base font-semibold ${mobileSelectedOperator === op.key ? 'text-amber-400' : 'text-white/80'}`}>
                      {op.symbol}
                    </span>
                  </button>
                ))}
              </div>
              
              {/* Selected operator label and value */}
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs text-white/70">
                  {mobileSelectedOperator === "wK" ? "Curvature" :
                   mobileSelectedOperator === "wT" ? "Tension" :
                   mobileSelectedOperator === "wC" ? "Coupling" :
                   mobileSelectedOperator === "wA" ? "Attractor" : "Redistribution"}
                </span>
                <span className="text-xs font-mono text-amber-400">
                  {params[mobileSelectedOperator].toFixed(2)}
                </span>
              </div>
              
              {/* Horizontal slider with tick marks */}
              <div className="relative">
                <Slider
                  value={[params[mobileSelectedOperator]]}
                  onValueChange={([v]) => handleParamsChange({ [mobileSelectedOperator]: v })}
                  min={0}
                  max={mobileSelectedOperator === "wA" ? 5 : mobileSelectedOperator === "wR" ? 2 : 3}
                  step={0.1}
                  className="w-full"
                  data-testid={`slider-${mobileSelectedOperator}-mobile`}
                />
                {/* Tick marks below slider */}
                <div className="flex justify-between mt-1 px-0.5">
                  {Array.from({ length: 11 }).map((_, i) => (
                    <div 
                      key={i} 
                      className={`w-0.5 ${i % 5 === 0 ? 'h-2 bg-white/40' : 'h-1 bg-white/20'}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Playback Scrubber Overlay - slides up when Run button is pressed */}
        {mobileActiveTab === "scrub" && (
          <div className="absolute bottom-20 left-0 right-0 z-20 px-4 pb-2">
            <div className="bg-gray-900/60 backdrop-blur-md rounded-xl border border-white/10 px-3 py-2 shadow-lg">
              {/* Frame Counter with Close Button */}
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-white/70">Frame</span>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-green-400">
                    {currentHistoryIndex + 1} / {historyLength || 1}
                  </span>
                  <button
                    onClick={() => setMobileActiveTab(null)}
                    className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center active:bg-white/20"
                    data-testid="button-close-scrub-mobile"
                    aria-label="Close playback controls"
                  >
                    <ChevronDown className="h-4 w-4 text-white/60" />
                  </button>
                </div>
              </div>
              
              {/* Slider with frame nudge buttons */}
              <div className="flex items-center gap-2">
                {/* Back 10 frames */}
                <button
                  onClick={() => {
                    if (state.isRunning) handlePause();
                    handleAnimatedSeek(Math.max(0, currentHistoryIndex - 10));
                  }}
                  className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center active:bg-white/20 transition-colors"
                  data-testid="button-back-10-mobile"
                  aria-label="Back 10 frames"
                >
                  <ChevronLeft className="h-4 w-4 text-white/80" />
                </button>
                
                {/* Slider */}
                <div className="flex-1">
                  <Slider
                    value={[currentHistoryIndex]}
                    onValueChange={([v]) => {
                      if (state.isRunning) handlePause();
                      handleSeekFrame(v);
                    }}
                    min={0}
                    max={Math.max(0, historyLength - 1)}
                    step={1}
                    size="mobile"
                    className="w-full"
                    data-testid="slider-timeline-mobile"
                  />
                </div>
                
                {/* Forward 10 frames */}
                <button
                  onClick={() => {
                    if (state.isRunning) handlePause();
                    handleAnimatedSeek(Math.min(historyLength - 1, currentHistoryIndex + 10));
                  }}
                  className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center active:bg-white/20 transition-colors"
                  data-testid="button-forward-10-mobile"
                  aria-label="Forward 10 frames"
                >
                  <ChevronRight className="h-4 w-4 text-white/80" />
                </button>
              </div>
              
              {/* Tick marks */}
              <div className="flex justify-between mt-1 px-10">
                {Array.from({ length: 11 }).map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-0.5 ${i % 5 === 0 ? 'h-2 bg-green-500/40' : 'h-1 bg-white/20'}`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Video Recorded Dialog */}
        {showVideoDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="mx-4 w-full max-w-sm bg-gray-900 rounded-2xl border border-white/20 p-5 shadow-2xl">
              {recordingError ? (
                <>
                  <div className="text-center mb-4">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 border-2 border-red-500/50 flex items-center justify-center">
                      <Square className="h-8 w-8 text-red-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-1">Recording Failed</h3>
                    <p className="text-xs text-white/60">{recordingError}</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowVideoDialog(false);
                      setRecordingError(null);
                      setRecordedVideoBlob(null);
                    }}
                    className="w-full h-10 rounded-xl bg-white/10 flex items-center justify-center active:bg-white/20 transition-colors"
                    data-testid="button-close-error"
                    aria-label="Close"
                  >
                    <span className="text-sm text-white/80">Close</span>
                  </button>
                </>
              ) : recordedVideoBlob ? (
                <>
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-semibold text-white mb-1">
                      {recordedVideoBlob.type.includes("gif") ? "Animation Ready" : "Video Ready"}
                    </h3>
                    <p className="text-xs text-white/60">
                      {recordedVideoBlob.type.includes("gif") 
                        ? "Long-press to save to photos" 
                        : "Hold on video to save to photos"}
                    </p>
                  </div>
                  
                  {/* Preview - use img for GIF, video otherwise */}
                  <div className="relative mb-4 rounded-xl overflow-hidden bg-black">
                    {previewUrl && recordedVideoBlob?.type.includes("gif") ? (
                      <img
                        key={previewUrl}
                        src={previewUrl}
                        alt="Recorded animation"
                        className="w-full aspect-square object-cover"
                        data-testid="gif-preview"
                      />
                    ) : previewUrl ? (
                      <video
                        key={previewUrl}
                        src={previewUrl}
                        controls
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full aspect-square object-cover"
                        data-testid="video-preview"
                      />
                    ) : null}
                  </div>
                  
                  <div className="space-y-3">
                    {/* Save/Share Button - on iOS this opens share sheet */}
                    <button
                      onClick={handleSaveVideo}
                      className="w-full h-12 rounded-xl bg-green-500/20 border-2 border-green-400/50 flex items-center justify-center gap-3 active:bg-green-500/30 transition-colors"
                      data-testid="button-save-video"
                      aria-label="Save to photos"
                    >
                      <Download className="h-5 w-5 text-green-400" />
                      <span className="text-sm font-medium text-green-400">
                        Save to Photos
                      </span>
                    </button>
                    
                    {/* Share Button */}
                    <button
                      onClick={handleShareVideo}
                      className="w-full h-12 rounded-xl bg-blue-500/20 border-2 border-blue-400/50 flex items-center justify-center gap-3 active:bg-blue-500/30 transition-colors"
                      data-testid="button-share-video"
                      aria-label="Share"
                    >
                      <Share2 className="h-5 w-5 text-blue-400" />
                      <span className="text-sm font-medium text-blue-400">Share to Apps</span>
                    </button>
                    
                    {/* Done */}
                    <button
                      onClick={() => {
                        setShowVideoDialog(false);
                        setRecordedVideoBlob(null);
                      }}
                      className="w-full h-10 rounded-xl flex items-center justify-center active:bg-white/10 transition-colors"
                      data-testid="button-done-video"
                      aria-label="Done"
                    >
                      <span className="text-sm text-white/50">Done</span>
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        )}

        {/* Primary Control Strip - 5 circular buttons */}
        <div className="absolute bottom-0 left-0 right-0 z-30 bg-gray-950/70 backdrop-blur-md border-t border-white/10 pb-safe">
          <div className="flex items-center justify-around h-20 px-4">
            {mobileActiveTab === "scrub" ? (
              <>
                {/* Playback mode buttons: Reset, Back, Play/Pause, Forward, Record */}
                {/* Reset */}
                <button
                  onClick={handleReset}
                  className="w-14 h-14 rounded-full bg-white/10 border-2 border-white/20 flex flex-col items-center justify-center active:bg-white/20 transition-colors"
                  data-testid="button-reset-mobile"
                  aria-label="Reset simulation"
                >
                  <RotateCcw className="h-5 w-5 text-white/80" />
                  <span className="text-[9px] text-white/60 mt-0.5">Reset</span>
                </button>

                {/* Step Back */}
                <button
                  onClick={() => {
                    if (state.isRunning) handlePause();
                    handleStepBackward();
                  }}
                  className="w-14 h-14 rounded-full bg-white/10 border-2 border-white/20 flex flex-col items-center justify-center active:bg-white/20 transition-colors"
                  data-testid="button-step-back-mobile"
                  aria-label="Step backward"
                >
                  <SkipBack className="h-5 w-5 text-white/80" />
                  <span className="text-[9px] text-white/60 mt-0.5">Back</span>
                </button>

                {/* Play/Pause - CENTER */}
                <button
                  onClick={state.isRunning ? handlePause : handlePlay}
                  className={`w-14 h-14 rounded-full flex flex-col items-center justify-center transition-all active:scale-95 ${
                    state.isRunning 
                      ? 'bg-green-500/20 border-2 border-green-500/50' 
                      : 'bg-white/10 border-2 border-white/20'
                  }`}
                  data-testid={state.isRunning ? "button-pause-playback-mobile" : "button-play-playback-mobile"}
                  aria-label={state.isRunning ? "Pause simulation" : "Play simulation"}
                >
                  {state.isRunning ? (
                    <Pause className="h-5 w-5 text-green-400" />
                  ) : (
                    <Play className="h-5 w-5 text-white/80 ml-0.5" />
                  )}
                  <span className={`text-[9px] mt-0.5 ${state.isRunning ? 'text-green-400' : 'text-white/60'}`}>
                    {state.isRunning ? 'Pause' : 'Play'}
                  </span>
                </button>

                {/* Step Forward */}
                <button
                  onClick={() => {
                    if (state.isRunning) handlePause();
                    handleStep();
                  }}
                  className="w-14 h-14 rounded-full bg-white/10 border-2 border-white/20 flex flex-col items-center justify-center active:bg-white/20 transition-colors"
                  data-testid="button-step-forward-mobile"
                  aria-label="Step forward"
                >
                  <SkipForward className="h-5 w-5 text-white/80" />
                  <span className="text-[9px] text-white/60 mt-0.5">Forward</span>
                </button>

                {/* Record */}
                <button
                  onClick={isRecording ? handleStopRecording : handleStartRecording}
                  disabled={isRecording && recordingProgress >= 1}
                  className={`w-14 h-14 rounded-full flex flex-col items-center justify-center transition-all active:scale-95 ${
                    isRecording
                      ? 'bg-red-500/20 border-2 border-red-500/50'
                      : 'bg-white/10 border-2 border-white/20'
                  }`}
                  data-testid="button-record-mobile"
                  aria-label={isRecording ? "Stop recording" : "Record video"}
                >
                  {isRecording ? (
                    <>
                      <Square className="h-4 w-4 text-red-400 fill-red-400" />
                      <span className="text-[9px] text-red-400 mt-0.5">{Math.round(recordingProgress * 12)}s</span>
                    </>
                  ) : (
                    <>
                      <Circle className="h-5 w-5 text-red-400 fill-red-400" />
                      <span className="text-[9px] text-white/60 mt-0.5">Record</span>
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                {/* Default mode buttons: Params, Regimes, Run, Layers, Share */}
                {/* Params button - toggles inline operator controls */}
                <button
                  onClick={() => setMobileActiveTab(mobileActiveTab === "params" ? null : "params")}
                  className={`w-14 h-14 rounded-full flex flex-col items-center justify-center transition-all active:scale-95 ${
                    mobileActiveTab === "params" 
                      ? 'bg-amber-500/20 border-2 border-amber-500/50' 
                      : 'bg-white/10 border-2 border-white/20'
                  }`}
                  data-testid="button-params-mobile"
                  aria-label="Adjust operator parameters"
                >
                  <SlidersHorizontal className={`h-5 w-5 ${mobileActiveTab === "params" ? 'text-amber-400' : 'text-white/80'}`} />
                  <span className={`text-[9px] mt-0.5 ${mobileActiveTab === "params" ? 'text-amber-400' : 'text-white/60'}`}>Params</span>
                </button>

                {/* Regimes button - toggles inline regime controls */}
                <button
                  onClick={() => setMobileActiveTab(mobileActiveTab === "regimes" ? null : "regimes")}
                  className={`w-14 h-14 rounded-full flex flex-col items-center justify-center transition-all active:scale-95 ${
                    mobileActiveTab === "regimes" 
                      ? 'bg-purple-500/20 border-2 border-purple-500/50' 
                      : 'bg-white/10 border-2 border-white/20'
                  }`}
                  data-testid="button-regimes-mobile"
                  aria-label="Choose dynamic regime"
                >
                  <Zap className={`h-5 w-5 ${mobileActiveTab === "regimes" ? 'text-purple-400' : 'text-white/80'}`} />
                  <span className={`text-[9px] mt-0.5 ${mobileActiveTab === "regimes" ? 'text-purple-400' : 'text-white/60'}`}>Regimes</span>
                </button>

                {/* Run button - toggles scrub controls */}
                <button
                  onClick={() => setMobileActiveTab("scrub")}
                  className={`w-14 h-14 rounded-full flex flex-col items-center justify-center transition-all active:scale-95 ${
                    state.isRunning
                      ? 'bg-green-500/20 border-2 border-green-500/50' 
                      : 'bg-white/10 border-2 border-white/20'
                  }`}
                  data-testid="button-scrub-mobile"
                  aria-label="Open playback controls"
                >
                  {state.isRunning ? (
                    <Pause className="h-5 w-5 text-green-400" />
                  ) : (
                    <Play className="h-5 w-5 text-green-400 ml-0.5" />
                  )}
                  <span className={`text-[9px] mt-0.5 ${state.isRunning ? 'text-green-400' : 'text-white/60'}`}>
                    {state.isRunning ? 'Pause' : 'Run'}
                  </span>
                </button>

                {/* Layers button - toggles inline layer controls */}
                <button
                  onClick={() => setMobileActiveTab(mobileActiveTab === "layers" ? null : "layers")}
                  className={`w-14 h-14 rounded-full flex flex-col items-center justify-center transition-all active:scale-95 ${
                    mobileActiveTab === "layers" 
                      ? 'bg-cyan-500/20 border-2 border-cyan-500/50' 
                      : 'bg-white/10 border-2 border-white/20'
                  }`}
                  data-testid="button-layers-mobile"
                  aria-label="Select visualization layer"
                >
                  <Layers className={`h-5 w-5 ${mobileActiveTab === "layers" ? 'text-cyan-400' : 'text-white/80'}`} />
                  <span className={`text-[9px] mt-0.5 ${mobileActiveTab === "layers" ? 'text-cyan-400' : 'text-white/60'}`}>Layers</span>
                </button>

                {/* Share button */}
                <button
                  onClick={() => {
                    const canvas = document.querySelector('[data-testid="canvas-visualization"]') as HTMLCanvasElement;
                    if (canvas) {
                      const regimeLabel = mobileRegimes.find(r => r.key === currentRegimeKey)?.label || "Equilibrium";
                      exportMobileShareSnapshot(canvas, {
                        regime: regimeLabel,
                        stability: stabilityState,
                        curvature: operatorContributions.curvature,
                        energy: state.energy,
                      });
                    }
                  }}
                  className="w-14 h-14 rounded-full bg-white/10 border-2 border-white/20 flex flex-col items-center justify-center active:bg-white/20 transition-colors"
                  data-testid="button-share-mobile"
                  aria-label="Share snapshot"
                >
                  <Share2 className="h-5 w-5 text-white/80" />
                  <span className="text-[9px] text-white/60 mt-0.5">Share</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <OnboardingModal ref={onboardingRef} />
      
      {/* Header - spans full width */}
      <header className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-card/50 shrink-0">
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
        <main className="relative bg-gray-950 flex-1 min-w-0 flex flex-col">
          {/* Tools Row - at top (horizontally scrollable) */}
          <div className="relative shrink-0 border-b border-white/10 bg-gray-950">
            {/* Left fade indicator */}
            <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-gray-950 to-transparent pointer-events-none z-10" />
            {/* Right fade indicator */}
            <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-gray-950 to-transparent pointer-events-none z-10" />
            <div className={`flex items-center gap-1.5 px-6 py-1.5 overflow-x-auto scrollbar-thin flex-nowrap ${!showDualView ? 'justify-center' : ''}`}>
            {/* Inspector */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFieldInspectorEnabled(!fieldInspectorEnabled)}
                  data-testid="button-field-inspector"
                  className={`h-6 text-[10px] gap-1 text-white/70 hover:text-white hover:bg-white/10 ${fieldInspectorEnabled ? "bg-white/20 text-white" : ""}`}
                >
                  <Eye className="h-3 w-3" />
                  Inspector
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Hover over the field to see local values
              </TooltipContent>
            </Tooltip>
            {/* Probe */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setTrajectoryProbeActive(!trajectoryProbeActive); if (!trajectoryProbeActive) { setPerturbMode(false); } else { setTrajectoryProbePoint(null); } }}
                  data-testid="button-trajectory-probe"
                  className={`h-6 text-[10px] gap-1 text-white/70 hover:text-white hover:bg-white/10 ${trajectoryProbeActive ? "bg-white/20 text-white" : ""}`}
                >
                  <Crosshair className="h-3 w-3" />
                  Probe
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Pin a point to track its metrics over time
              </TooltipContent>
            </Tooltip>
            {/* Perturb */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setPerturbMode(!perturbMode); if (!perturbMode) setTrajectoryProbeActive(false); }}
                  data-testid="button-perturb-mode"
                  className={`h-6 text-[10px] gap-1 text-white/70 hover:text-white hover:bg-white/10 ${perturbMode ? "bg-white/20 text-white" : ""}`}
                >
                  <Zap className="h-3 w-3" />
                  Perturb
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Click on the field to inject energy at that point
              </TooltipContent>
            </Tooltip>
            {/* Diagnostics */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDiagnosticsVisible(!diagnosticsVisible)}
                  data-testid="button-diagnostics"
                  className={`h-6 text-[10px] gap-1 text-white/70 hover:text-white hover:bg-white/10 ${diagnosticsVisible ? "bg-white/20 text-white" : ""}`}
                >
                  <Gauge className="h-3 w-3" />
                  Diagnostics
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Show real-time stability and energy metrics
              </TooltipContent>
            </Tooltip>
            <div className="w-px h-5 bg-white/30 shrink-0" />
            {/* Color Map */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center">
                  <Select value={colormap} onValueChange={handleColormapChange}>
                    <SelectTrigger 
                      className="h-6 w-28 text-[10px] bg-transparent border-none text-white/70 hover:text-white hover:bg-white/10 focus:ring-0 focus:ring-offset-0 gap-1" 
                      data-testid="select-colormap-tools"
                    >
                      <Palette className="h-3 w-3 shrink-0" />
                      <span>{colormapLabel}</span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viridis">Viridis</SelectItem>
                      <SelectItem value="inferno">Inferno</SelectItem>
                      <SelectItem value="cividis">Cividis</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Change field colormap
              </TooltipContent>
            </Tooltip>
            {/* Layers and Blend - only visible in dual view mode */}
            {showDualView && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center">
                      <Select value={derivedType} onValueChange={(v) => { setHasUserSelectedOverlay(true); setDerivedType(v as OverlayType); }}>
                        <SelectTrigger 
                          className="h-6 w-32 text-[10px] bg-transparent border-none text-white/70 hover:text-white hover:bg-white/10 focus:ring-0 focus:ring-offset-0 gap-1" 
                          data-testid="select-overlay-type"
                        >
                          <Layers className="h-3 w-3 shrink-0" />
                          <span>{hasUserSelectedOverlay ? (OVERLAY_OPTIONS.find(o => o.value === derivedType)?.label || "Layers") : "Layers"}</span>
                        </SelectTrigger>
                        <SelectContent>
                          {OVERLAY_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value} className="text-xs">
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    Select projection layer for dual view
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setHasUserSelectedOverlay(true); setBlendMode(!blendMode); }}
                      data-testid="button-blend-mode"
                      className={`h-6 text-[10px] gap-1 text-white/70 hover:text-white hover:bg-white/10 ${blendMode ? "bg-white/20 text-white" : ""}`}
                    >
                      <Blend className="h-3 w-3" />
                      Blend
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    Overlay projection layer on primary field
                  </TooltipContent>
                </Tooltip>
                {blendMode && (
                  <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-white/5 border border-white/10">
                    <span className="text-[9px] text-white/40 font-mono">0</span>
                    <div className="relative w-28">
                      <Slider
                        value={[blendOpacity]}
                        onValueChange={([v]) => { setHasUserSelectedOverlay(true); setBlendOpacity(v); }}
                        min={0}
                        max={1}
                        step={0.01}
                        className="w-full [&_[role=slider]]:h-3 [&_[role=slider]]:w-3 [&_[role=slider]]:border-2 [&_[role=slider]]:border-cyan-400 [&_[role=slider]]:bg-gray-900 [&_[role=slider]]:shadow-[0_0_6px_rgba(34,211,238,0.4)] [&_.relative]:h-1.5 [&_[data-orientation=horizontal]>.bg-primary]:bg-gradient-to-r [&_[data-orientation=horizontal]>.bg-primary]:from-cyan-500 [&_[data-orientation=horizontal]>.bg-primary]:to-cyan-400"
                        data-testid="slider-blend-opacity"
                      />
                    </div>
                    <span className="text-[9px] text-white/40 font-mono">100</span>
                    <div className="text-[10px] text-cyan-400 font-mono font-medium w-8 text-right">{Math.round(blendOpacity * 100)}%</div>
                  </div>
                )}
              </>
            )}
            <div className="w-px h-5 bg-white/30 shrink-0" />
            {/* Save */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSaveConfiguration}
                  data-testid="button-save-config"
                  className="h-6 text-[10px] gap-1 text-white/70 hover:text-white hover:bg-white/10"
                >
                  <Save className="h-3 w-3" />
                  Save
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Save current settings to a file
              </TooltipContent>
            </Tooltip>
            {/* Load */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => configInputRef.current?.click()}
                  data-testid="button-load-config"
                  className="h-6 text-[10px] gap-1 text-white/70 hover:text-white hover:bg-white/10"
                >
                  <Upload className="h-3 w-3" />
                  Load
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Load settings from a saved file
              </TooltipContent>
            </Tooltip>
            <input
              ref={configInputRef}
              type="file"
              accept=".json"
              onChange={handleLoadConfiguration}
              className="hidden"
            />
            </div>
          </div>
          
          {/* Unified Dual-Pane Header Ribbon */}
          <div className="flex items-stretch border-b border-border shrink-0">
            {/* Left Pane Header: Structural Field */}
            <div className={`flex items-center justify-center gap-2 px-3 py-2 flex-1 ${showDualView ? 'border-r border-border' : ''}`}>
              <div className="text-center">
                <h4 className="text-xs font-medium">Structural Field</h4>
                <p className="text-[10px] text-muted-foreground whitespace-nowrap">Primary field representation</p>
              </div>
            </div>
            
            {/* Right Pane Header: Projection View (only shown in dual view) */}
            {showDualView && (
              <div className="flex items-center justify-center gap-2 px-3 py-2 flex-1">
                <div className="text-center">
                  <h4 className="text-xs font-medium">Projection View</h4>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {OVERLAY_OPTIONS.find(o => o.value === derivedType)?.tooltip || "Select a projection mode"}
                  </p>
                </div>
              </div>
            )}
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
                <ResizablePanelGroup direction="horizontal" className="h-full">
                  <ResizablePanel defaultSize={50} minSize={25} className="overflow-hidden">
                    <div className="h-full min-h-0 flex flex-col bg-background overflow-hidden">
                      <div className="relative flex-1 min-h-0 flex items-center justify-center bg-gray-950 overflow-hidden">
                        <VisualizationCanvas 
                          field={field} 
                          colormap={colormap}
                          basinMap={basinMap}
                          onHover={handleHover}
                          onHoverEnd={handleHoverEnd}
                          onClick={handleFieldClick}
                          perturbMode={perturbMode}
                          trajectoryProbePoint={trajectoryProbePoint}
                          perceptualSmoothing={perceptualSmoothing}
                        />
                      </div>
                      <StructuralFieldFooter 
                        probeData={probeData} 
                        basinMap={basinMap} 
                        isHovering={probeVisible} 
                      />
                    </div>
                  </ResizablePanel>
                  <ResizableHandle withHandle />
                  <ResizablePanel defaultSize={50} minSize={25} className="overflow-hidden">
                    <div className="h-full min-h-0 flex flex-col bg-background overflow-hidden">
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
                        compact={true}
                      />
                    </div>
                  </ResizablePanel>
                </ResizablePanelGroup>
              ) : (
                <div className="h-full flex flex-col bg-background">
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
                      perceptualSmoothing={perceptualSmoothing}
                    />
                  </div>
                  <StructuralFieldFooter 
                    probeData={probeData} 
                    basinMap={basinMap} 
                    isHovering={probeVisible} 
                  />
                </div>
              )}
              
              {fieldInspectorEnabled && (
                <HoverProbe
                  data={probeData}
                  modeLabels={modeLabels}
                  visible={probeVisible}
                  position={probePosition}
                />
              )}
              
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
        
        {/* Metrics Panel Toggle Button - subtle edge handle */}
        <button
          onClick={() => setMetricsPanelCollapsed(!metricsPanelCollapsed)}
          className="group flex-none w-3 flex items-center justify-center border-l border-border hover:bg-white/5 transition-colors cursor-pointer"
          data-testid="button-toggle-metrics-panel"
          title={metricsPanelCollapsed ? "Expand metrics panel" : "Collapse metrics panel"}
        >
          <div className="w-0.5 h-8 rounded-full bg-white/10 group-hover:bg-white/30 transition-colors" />
        </button>
        
        <aside className={`${metricsPanelCollapsed ? 'w-0 overflow-hidden' : 'w-[420px]'} flex-none border-l border-border bg-card flex flex-col overflow-hidden transition-all duration-300`}>
          <ControlPanel
                params={params}
                state={state}
                colormap={colormap}
                interpretationMode={interpretationMode}
                operatorContributions={operatorContributions}
                structuralSignature={structuralSignature}
                coherenceHistory={coherenceHistory}
                trendMetrics={trendMetrics}
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
                onExportNumPy={handleExportNumPy}
                onExportBatchSpec={handleExportBatchSpec}
                onExportPython={handleExportPython}
                onExportOperators={handleExportOperators}
                onExportLayers={handleExportLayers}
                onExportArchive={handleExportArchive}
                onExportWebM={handleExportWebM}
                onShowDualViewChange={handleToggleDualView}
                varianceChange={varianceChange}
                isExporting={isExporting}
                onSmartViewApply={handleSmartViewApply}
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
