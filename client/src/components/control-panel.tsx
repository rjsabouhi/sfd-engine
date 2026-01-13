import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Pause, RotateCcw, StepForward, ChevronDown, ChevronUp, Sliders, Activity, Settings2, BookOpen, Download, Columns2, Home, Image, FileJson, Video } from "lucide-react";
import type { SimulationParameters, SimulationState, OperatorContributions, StructuralSignature, StructuralEvent, TrendMetrics } from "@shared/schema";
import { defaultParameters } from "@shared/schema";
import { TemporalControls } from "./temporal-controls";
import { OperatorSensitivity } from "./operator-sensitivity";
import { StructuralSignatureBar } from "./structural-signature";
import { EventLog } from "./event-log";
import type { SmartViewConfig } from "@/config/smart-view-map";
import { LegacyRegimeDisplay } from "./regime-display";
import type { InterpretationMode } from "@/lib/interpretation-modes";
import { getModeLabels, modeOptions, detectRegime, toLanguageMode } from "@/lib/interpretation-modes";
import { LANGUAGE } from "@/lib/language";
import type { RegimeKey } from "@/lib/language";

interface ControlPanelProps {
  params: SimulationParameters;
  state: SimulationState;
  colormap: "inferno" | "viridis" | "cividis";
  interpretationMode: InterpretationMode;
  operatorContributions: OperatorContributions;
  structuralSignature: StructuralSignature;
  coherenceHistory: number[];
  trendMetrics: TrendMetrics | null;
  events: StructuralEvent[];
  historyLength: number;
  currentHistoryIndex: number;
  isPlaybackMode: boolean;
  showDualView: boolean;
  varianceChange?: number;
  onParamsChange: (params: Partial<SimulationParameters>) => void;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  onStep: () => void;
  onStepBackward: () => void;
  onStepForward: () => void;
  onSeekFrame: (index: number) => void;
  onExitPlayback: () => void;
  onColormapChange: (colormap: "inferno" | "viridis" | "cividis") => void;
  onInterpretationModeChange: (mode: InterpretationMode) => void;
  onClearEvents: () => void;
  onExportEvents: () => void;
  onExportPNG: () => void;
  onExportJSON: () => void;
  onExportAnimation: () => void;
  onExportSimulationData: () => void;
  onExportMetrics: () => void;
  onExportStateSnapshot: () => void;
  onExportNumPy?: () => void;
  onExportBatchSpec?: () => void;
  onExportPython?: () => void;
  onExportOperators?: () => void;
  onExportLayers?: () => void;
  onExportArchive?: () => void;
  onExportWebM?: () => void;
  onShowDualViewChange: (show: boolean) => void;
  isExporting?: boolean;
  perceptualSmoothing?: boolean;
  onPerceptualSmoothingChange?: (enabled: boolean) => void;
  onSmartViewApply?: (config: SmartViewConfig) => void;
}

interface ParameterSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  testId: string;
}

function ParameterSlider({ label, value, min, max, step, onChange, testId }: ParameterSliderProps) {
  return (
    <div className="flex items-center gap-3">
      <Label className="text-xs text-zinc-400 w-24 shrink-0 truncate">{label}</Label>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
        className="flex-1"
        data-testid={testId}
      />
      <span className="text-xs font-mono tabular-nums text-zinc-500 w-10 text-right">
        {value.toFixed(2)}
      </span>
    </div>
  );
}

export function ControlPanel({
  params,
  state,
  colormap,
  interpretationMode,
  operatorContributions,
  structuralSignature,
  coherenceHistory,
  trendMetrics,
  events,
  historyLength,
  currentHistoryIndex,
  isPlaybackMode,
  showDualView,
  onParamsChange,
  onPlay,
  onPause,
  onReset,
  onStep,
  onStepBackward,
  onStepForward,
  onSeekFrame,
  onExitPlayback,
  onColormapChange,
  onInterpretationModeChange,
  onClearEvents,
  onExportEvents,
  onExportPNG,
  onExportJSON,
  onExportAnimation,
  onExportSimulationData,
  onExportMetrics,
  onExportStateSnapshot,
  onExportNumPy,
  onExportBatchSpec,
  onExportPython,
  onExportOperators,
  onExportLayers,
  onExportArchive,
  onExportWebM,
  onShowDualViewChange,
  varianceChange = 0,
  isExporting = false,
  perceptualSmoothing = true,
  onPerceptualSmoothingChange,
  onSmartViewApply,
}: ControlPanelProps) {
  const [coreParamsOpen, setCoreParamsOpen] = useState(true);
  const [weightsOpen, setWeightsOpen] = useState(true);
  const [advancedOpen, setAdvancedOpen] = useState(true);
  const [metricsOpen, setMetricsOpen] = useState(true);
  const [interpretationOpen, setInterpretationOpen] = useState(true);
  const [playbackOpen, setPlaybackOpen] = useState(true);
  const [regimeOpen, setRegimeOpen] = useState(true);
  const [operatorOpen, setOperatorOpen] = useState(true);
  const [eventLogOpen, setEventLogOpen] = useState(true);
  const [notebookParamsOpen, setNotebookParamsOpen] = useState(true);
  const [notebookEquationOpen, setNotebookEquationOpen] = useState(true);
  const [notebookWeightsOpen, setNotebookWeightsOpen] = useState(true);
  const [panelWidth, setPanelWidth] = useState(400);
  
  const panelRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setPanelWidth(entry.contentRect.width);
      }
    });
    
    observer.observe(panel);
    return () => observer.disconnect();
  }, []);
  
  const STACK_START = 380;
  const STACK_FULL = 280;
  const isLayeredMode = panelWidth < STACK_START;
  const layerFactor = isLayeredMode 
    ? Math.min(1, (STACK_START - panelWidth) / (STACK_START - STACK_FULL))
    : 0;
  // Max offset per tab limited to ensure minimum 20px visible per tab
  const maxOffsetPerTab = 12;
  
  const tabs = [
    { value: "home", label: "Home", icon: Home },
    { value: "controls", label: "Controls", icon: Play },
    { value: "params", label: "Params", icon: Sliders },
    { value: "analysis", label: "Analysis", icon: Activity },
    { value: "notebook", label: "Notebook", icon: BookOpen },
  ];

  const modeLabels = getModeLabels(interpretationMode);
  const languageMode = toLanguageMode(interpretationMode);
  const currentRegime = detectRegime(
    state.basinCount,
    state.variance,
    state.energy,
    varianceChange,
    state.isRunning
  );

  return (
    <div ref={panelRef} className="flex flex-col h-full overflow-hidden">
      <Tabs defaultValue="home" className="flex-1 flex flex-col overflow-hidden">
        <TabsList 
          className={`w-full justify-start rounded-none border-b border-border bg-transparent px-1 shrink-0 ${
            isLayeredMode ? 'relative h-10 overflow-visible' : 'h-9 flex-nowrap overflow-x-auto gap-0.5'
          }`}
        >
          {tabs.map((tab, index) => {
            const Icon = tab.icon;
            // Limit offset so each tab remains at least partially visible
            const offset = isLayeredMode ? -Math.min(maxOffsetPerTab, 16 * layerFactor) : 0;
            const zIndex = isLayeredMode ? tabs.length - index : undefined;
            
            return (
              <TabsTrigger 
                key={tab.value}
                value={tab.value} 
                className="text-xs gap-1 px-2 data-[state=active]:z-50"
                style={isLayeredMode ? {
                  marginLeft: index === 0 ? 0 : offset,
                  zIndex,
                  position: 'relative',
                  boxShadow: index > 0 ? '-2px 0 4px rgba(0,0,0,0.3)' : undefined,
                } : undefined}
              >
                <Icon className="h-3 w-3" />
                {!isLayeredMode || layerFactor < 0.7 ? tab.label : null}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <div className="flex-1 overflow-y-auto">
          <TabsContent value="home" className="m-0 p-2 space-y-2">
            {/* Unified Dashboard - All sections at a glance */}
            
            {/* Controls Section */}
            <div className="border border-border/50 rounded-md p-2 bg-muted/20" data-testid="home-section-controls">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Play className="h-3 w-3" />
                  Controls
                </span>
              </div>
              <div className="flex items-center gap-1 mb-2">
                {state.isRunning ? (
                  <Button onClick={onPause} variant="secondary" className="flex-1" size="sm" data-testid="home-button-pause">
                    <Pause className="h-3.5 w-3.5 mr-1" />
                    Pause
                  </Button>
                ) : (
                  <Button 
                    onClick={onPlay} 
                    variant="secondary" 
                    className="flex-1 relative ring-1 ring-cyan-500/50 shadow-[0_0_8px_rgba(34,211,238,0.2)]" 
                    size="sm" 
                    data-testid="home-button-play"
                  >
                    <Play className="h-3.5 w-3.5 mr-1" />
                    Run Simulation
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onShowDualViewChange(!showDualView)}
                  data-testid="home-button-dual-view"
                >
                  <Columns2 className="h-3.5 w-3.5" />
                </Button>
                <Button onClick={onReset} variant="outline" size="icon" data-testid="home-button-reset">
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </div>
              <TemporalControls
                historyLength={historyLength}
                currentIndex={currentHistoryIndex}
                isPlaybackMode={isPlaybackMode}
                isRunning={state.isRunning}
                onStepBackward={onStepBackward}
                onStepForward={onStepForward}
                onSeek={onSeekFrame}
                onExitPlayback={onExitPlayback}
              />
              <div className="grid grid-cols-3 gap-1 text-xs mt-2">
                <div className="bg-background/50 rounded px-1.5 py-1 text-center" data-testid="home-metric-step">
                  <div className="text-[10px] text-muted-foreground">Step</div>
                  <div className="font-mono tabular-nums">{state.step}</div>
                </div>
                <div className="bg-background/50 rounded px-1.5 py-1 text-center" data-testid="home-metric-status">
                  <div className="text-[10px] text-muted-foreground">Status</div>
                  <div className={state.isRunning ? "text-green-500" : "text-yellow-500"}>
                    {state.isRunning ? "Running" : "Paused"}
                  </div>
                </div>
                <div className="bg-background/50 rounded px-1.5 py-1 text-center" data-testid="home-metric-history">
                  <div className="text-[10px] text-muted-foreground">History</div>
                  <div className="font-mono tabular-nums">{historyLength}</div>
                </div>
              </div>
            </div>

            {/* Params Section */}
            <div className="border border-border/50 rounded-md p-2 bg-muted/20" data-testid="home-section-params">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Sliders className="h-3 w-3" />
                  Parameters
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1 text-xs font-mono">
                <div className="bg-background/50 rounded px-1.5 py-1" data-testid="home-param-dt">
                  <span className="text-muted-foreground">dt:</span> {params.dt.toFixed(2)}
                </div>
                <div className="bg-background/50 rounded px-1.5 py-1" data-testid="home-param-k">
                  <span className="text-muted-foreground">K:</span> {params.curvatureGain.toFixed(1)}
                </div>
                <div className="bg-background/50 rounded px-1.5 py-1" data-testid="home-param-c">
                  <span className="text-muted-foreground">C:</span> {params.couplingWeight.toFixed(2)}
                </div>
                <div className="bg-background/50 rounded px-1.5 py-1" data-testid="home-param-a">
                  <span className="text-muted-foreground">A:</span> {params.attractorStrength.toFixed(1)}
                </div>
                <div className="bg-background/50 rounded px-1.5 py-1" data-testid="home-param-r">
                  <span className="text-muted-foreground">R:</span> {params.redistributionRate.toFixed(2)}
                </div>
                <div className="bg-background/50 rounded px-1.5 py-1" data-testid="home-param-grid">
                  <span className="text-muted-foreground">Grid:</span> {params.gridSize}
                </div>
              </div>
              <div className="grid grid-cols-5 gap-1 text-xs font-mono mt-1">
                <div className="bg-background/50 rounded px-1 py-0.5 text-center text-[10px]" data-testid="home-weight-wk">wK={params.wK.toFixed(1)}</div>
                <div className="bg-background/50 rounded px-1 py-0.5 text-center text-[10px]" data-testid="home-weight-wt">wT={params.wT.toFixed(1)}</div>
                <div className="bg-background/50 rounded px-1 py-0.5 text-center text-[10px]" data-testid="home-weight-wc">wC={params.wC.toFixed(1)}</div>
                <div className="bg-background/50 rounded px-1 py-0.5 text-center text-[10px]" data-testid="home-weight-wa">wA={params.wA.toFixed(1)}</div>
                <div className="bg-background/50 rounded px-1 py-0.5 text-center text-[10px]" data-testid="home-weight-wr">wR={params.wR.toFixed(1)}</div>
              </div>
            </div>

            {/* Analysis Section */}
            <div className="border border-border/50 rounded-md p-2 bg-muted/20" data-testid="home-section-analysis">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Activity className="h-3 w-3" />
                  Analysis
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary" data-testid="home-regime-badge">
                  {currentRegime.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <div className="bg-background/50 rounded px-1.5 py-1" data-testid="home-metric-energy">
                  <span className="text-muted-foreground">Energy:</span>{" "}
                  <span className="font-mono tabular-nums">{state.energy.toFixed(3)}</span>
                </div>
                <div className="bg-background/50 rounded px-1.5 py-1" data-testid="home-metric-variance">
                  <span className="text-muted-foreground">Variance:</span>{" "}
                  <span className="font-mono tabular-nums">{state.variance.toFixed(4)}</span>
                </div>
                <div className="bg-background/50 rounded px-1.5 py-1" data-testid="home-metric-basins">
                  <span className="text-muted-foreground">Basins:</span>{" "}
                  <span className="font-mono tabular-nums">{state.basinCount}</span>
                </div>
                <div className="bg-background/50 rounded px-1.5 py-1" data-testid="home-metric-events">
                  <span className="text-muted-foreground">Events:</span>{" "}
                  <span className="font-mono tabular-nums">{events.length}</span>
                </div>
              </div>
              <div className="mt-1.5">
                <OperatorSensitivity contributions={operatorContributions} modeLabels={modeLabels} compact />
              </div>
            </div>

            </TabsContent>

          <TabsContent value="controls" className="m-0 p-2 space-y-2">
            <div className="border border-border/50 rounded-md p-2 bg-muted/20">
              <Collapsible open={metricsOpen} onOpenChange={setMetricsOpen}>
                <CollapsibleTrigger asChild>
                  <button className="flex items-center justify-between w-full py-1 hover-elevate rounded px-1" data-testid="button-toggle-metrics-inline">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Simulation Metrics</span>
                    {metricsOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2 space-y-2">
                  <StructuralSignatureBar 
                    signature={structuralSignature} 
                    coherenceHistory={coherenceHistory}
                    trendMetrics={trendMetrics}
                    state={state}
                    modeLabels={modeLabels} 
                  />
                </CollapsibleContent>
              </Collapsible>
            </div>

            <div className="border border-border/50 rounded-md p-2 bg-muted/20">
              <Collapsible open={interpretationOpen} onOpenChange={setInterpretationOpen}>
                <CollapsibleTrigger asChild>
                  <button className="flex items-center justify-between w-full py-1 hover-elevate rounded px-1" data-testid="button-toggle-interpretation">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Interpretation Mode</span>
                    {interpretationOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2 space-y-2">
                  <Select value={interpretationMode} onValueChange={(v) => onInterpretationModeChange(v as InterpretationMode)}>
                    <SelectTrigger className="h-8 focus:ring-0 focus:ring-offset-0" data-testid="select-interpretation-mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {modeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground leading-relaxed">{modeLabels.subtitle}</p>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </TabsContent>

          <TabsContent value="params" className="m-0 p-2 space-y-2">
            <div className="border border-border/50 rounded-md p-2 bg-muted/20">
              <Collapsible open={coreParamsOpen} onOpenChange={setCoreParamsOpen}>
                <CollapsibleTrigger asChild>
                  <button className="flex items-center justify-between w-full py-1 hover-elevate rounded px-1" data-testid="button-toggle-core-params">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Core Parameters</span>
                    {coreParamsOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 pt-2">
                  <ParameterSlider label="Timestep" value={params.dt} min={0.01} max={0.2} step={0.01} onChange={(v) => onParamsChange({ dt: v })} testId="slider-timestep" />
                  <ParameterSlider label="Curvature" value={params.curvatureGain} min={0.1} max={10} step={0.1} onChange={(v) => onParamsChange({ curvatureGain: v })} testId="slider-curvature-gain" />
                  <ParameterSlider label="Coupling" value={params.couplingWeight} min={0} max={1} step={0.05} onChange={(v) => onParamsChange({ couplingWeight: v })} testId="slider-coupling-weight" />
                  <ParameterSlider label="Attractor" value={params.attractorStrength} min={0.1} max={10} step={0.1} onChange={(v) => onParamsChange({ attractorStrength: v })} testId="slider-attractor-strength" />
                  <ParameterSlider label="Redistribution" value={params.redistributionRate} min={0} max={1} step={0.05} onChange={(v) => onParamsChange({ redistributionRate: v })} testId="slider-redistribution" />
                </CollapsibleContent>
              </Collapsible>
            </div>

            <div className="border border-border/50 rounded-md p-2 bg-muted/20">
              <Collapsible open={weightsOpen} onOpenChange={setWeightsOpen}>
                <CollapsibleTrigger asChild>
                  <button className="flex items-center justify-between w-full py-1 hover-elevate rounded px-1" data-testid="button-toggle-operators">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Operator Weights</span>
                    {weightsOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 pt-2">
                  <ParameterSlider label="wK" value={params.wK} min={0} max={5} step={0.1} onChange={(v) => onParamsChange({ wK: v })} testId="slider-wk" />
                  <ParameterSlider label="wT" value={params.wT} min={0} max={5} step={0.1} onChange={(v) => onParamsChange({ wT: v })} testId="slider-wt" />
                  <ParameterSlider label="wC" value={params.wC} min={0} max={5} step={0.1} onChange={(v) => onParamsChange({ wC: v })} testId="slider-wc" />
                  <ParameterSlider label="wA" value={params.wA} min={0} max={5} step={0.1} onChange={(v) => onParamsChange({ wA: v })} testId="slider-wa" />
                  <ParameterSlider label="wR" value={params.wR} min={0} max={5} step={0.1} onChange={(v) => onParamsChange({ wR: v })} testId="slider-wr" />
                </CollapsibleContent>
              </Collapsible>
            </div>

            <div className="border border-border/50 rounded-md p-2 bg-muted/20">
              <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                <CollapsibleTrigger asChild>
                  <button className="flex items-center justify-between w-full py-1 hover-elevate rounded px-1" data-testid="button-toggle-advanced">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <Settings2 className="h-3 w-3" />
                      Advanced
                    </span>
                    {advancedOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 pt-2">
                  <ParameterSlider label="Grid Size" value={params.gridSize} min={50} max={400} step={10} onChange={(v) => onParamsChange({ gridSize: v })} testId="slider-grid-size" />
                  <ParameterSlider label="Radius" value={params.couplingRadius} min={0.5} max={5} step={0.25} onChange={(v) => onParamsChange({ couplingRadius: v })} testId="slider-coupling-radius" />
                  <Button variant="secondary" size="sm" className="w-full" onClick={() => onParamsChange(defaultParameters)} data-testid="button-reset-params">
                    {LANGUAGE.UI.RESET}
                  </Button>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </TabsContent>

          <TabsContent value="analysis" className="m-0 p-2 space-y-2">
            <div className="border border-border/50 rounded-md p-2 bg-muted/20">
              <Collapsible open={regimeOpen} onOpenChange={setRegimeOpen}>
                <CollapsibleTrigger asChild>
                  <button className="flex items-center justify-between w-full py-1 hover-elevate rounded px-1" data-testid="button-toggle-regime">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">System Regime</span>
                    {regimeOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <LegacyRegimeDisplay regime={currentRegime} mode={languageMode} />
                </CollapsibleContent>
              </Collapsible>
            </div>

            <div className="border border-border/50 rounded-md p-2 bg-muted/20">
              <Collapsible open={operatorOpen} onOpenChange={setOperatorOpen}>
                <CollapsibleTrigger asChild>
                  <button className="flex items-center justify-between w-full py-1 hover-elevate rounded px-1" data-testid="button-toggle-operator">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Operator Contributions</span>
                    {operatorOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <OperatorSensitivity contributions={operatorContributions} modeLabels={modeLabels} />
                </CollapsibleContent>
              </Collapsible>
            </div>

            <div className="border border-border/50 rounded-md p-2 bg-muted/20">
              <Collapsible open={eventLogOpen} onOpenChange={setEventLogOpen}>
                <CollapsibleTrigger asChild>
                  <button className="flex items-center justify-between w-full py-1 hover-elevate rounded px-1" data-testid="button-toggle-event-log">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Event Log ({events.length})</span>
                    {eventLogOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <EventLog events={events} onClear={onClearEvents} onExport={onExportEvents} />
                </CollapsibleContent>
              </Collapsible>
            </div>
          </TabsContent>

          <TabsContent value="notebook" className="m-0 p-2 space-y-2">
            <div className="border border-border/50 rounded-md p-2 bg-muted/20">
              <Collapsible open={notebookParamsOpen} onOpenChange={setNotebookParamsOpen}>
                <CollapsibleTrigger asChild>
                  <button className="flex items-center justify-between w-full py-1 hover-elevate rounded px-1" data-testid="button-toggle-notebook-params">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Current Parameters</span>
                    {notebookParamsOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-background/50 p-2 rounded">
                    <div>dt = {params.dt.toFixed(3)}</div>
                    <div>K = {params.curvatureGain.toFixed(2)}</div>
                    <div>C = {params.couplingWeight.toFixed(2)}</div>
                    <div>A = {params.attractorStrength.toFixed(2)}</div>
                    <div>R = {params.redistributionRate.toFixed(2)}</div>
                    <div>Grid: {params.gridSize}x{params.gridSize}</div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
            
            <div className="border border-border/50 rounded-md p-2 bg-muted/20">
              <Collapsible open={notebookEquationOpen} onOpenChange={setNotebookEquationOpen}>
                <CollapsibleTrigger asChild>
                  <button className="flex items-center justify-between w-full py-1 hover-elevate rounded px-1" data-testid="button-toggle-notebook-equation">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Field Equation</span>
                    {notebookEquationOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <code className="text-xs block bg-background/50 p-2 rounded font-mono">
                    dF/dt = wK*K(F) + wT*T(F) + wC*C(F) + wA*A(F) + wR*R(F)
                  </code>
                </CollapsibleContent>
              </Collapsible>
            </div>

            <div className="border border-border/50 rounded-md p-2 bg-muted/20">
              <Collapsible open={notebookWeightsOpen} onOpenChange={setNotebookWeightsOpen}>
                <CollapsibleTrigger asChild>
                  <button className="flex items-center justify-between w-full py-1 hover-elevate rounded px-1" data-testid="button-toggle-notebook-weights">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Operator Weights</span>
                    {notebookWeightsOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <div className="grid grid-cols-5 gap-1 text-xs font-mono bg-background/50 p-2 rounded text-center">
                    <div>wK={params.wK.toFixed(1)}</div>
                    <div>wT={params.wT.toFixed(1)}</div>
                    <div>wC={params.wC.toFixed(1)}</div>
                    <div>wA={params.wA.toFixed(1)}</div>
                    <div>wR={params.wR.toFixed(1)}</div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
