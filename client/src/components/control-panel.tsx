import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Pause, RotateCcw, StepForward, ChevronDown, ChevronUp, Sliders, Activity, Settings2, BookOpen, Download, Columns2, LayoutGrid } from "lucide-react";
import type { SimulationParameters, SimulationState, OperatorContributions, StructuralSignature, StructuralEvent, TrendMetrics } from "@shared/schema";
import { defaultParameters } from "@shared/schema";
import { TemporalControls } from "./temporal-controls";
import { OperatorSensitivity } from "./operator-sensitivity";
import { StructuralSignatureBar } from "./structural-signature";
import { EventLog } from "./event-log";
import { MetricsWorkspace } from "./metrics-workspace";
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
  const [weightsOpen, setWeightsOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [metricsOpen, setMetricsOpen] = useState(false);
  const [interpretationOpen, setInterpretationOpen] = useState(false);
  const [playbackOpen, setPlaybackOpen] = useState(true);
  const [notebookParamsOpen, setNotebookParamsOpen] = useState(true);
  const [notebookEquationOpen, setNotebookEquationOpen] = useState(true);
  const [notebookWeightsOpen, setNotebookWeightsOpen] = useState(true);

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
    <div className="flex flex-col h-full overflow-hidden">
      <Tabs defaultValue="workspace" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent px-1 h-9 shrink-0 flex-wrap">
          <TabsTrigger value="workspace" className="text-xs gap-1 px-2">
            <LayoutGrid className="h-3 w-3" />
            Workspace
          </TabsTrigger>
          <TabsTrigger value="controls" className="text-xs gap-1 px-2">
            <Play className="h-3 w-3" />
            Controls
          </TabsTrigger>
          <TabsTrigger value="params" className="text-xs gap-1 px-2">
            <Sliders className="h-3 w-3" />
            Params
          </TabsTrigger>
          <TabsTrigger value="notebook" className="text-xs gap-1 px-2">
            <BookOpen className="h-3 w-3" />
            Notebook
          </TabsTrigger>
          <TabsTrigger value="export" className="text-xs gap-1 px-2">
            <Download className="h-3 w-3" />
            Export
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto">
          <TabsContent value="workspace" className="m-0 h-full">
            <MetricsWorkspace
              state={state}
              params={params}
              operatorContributions={operatorContributions}
              structuralSignature={structuralSignature}
              coherenceHistory={coherenceHistory}
              trendMetrics={trendMetrics}
              events={events}
              modeLabels={modeLabels}
              interpretationMode={interpretationMode}
              historyLength={historyLength}
              currentHistoryIndex={currentHistoryIndex}
              isPlaybackMode={isPlaybackMode}
              varianceChange={varianceChange}
              onStepBackward={onStepBackward}
              onStepForward={onStepForward}
              onSeekFrame={onSeekFrame}
              onExitPlayback={onExitPlayback}
              onClearEvents={onClearEvents}
              onExportEvents={onExportEvents}
            />
          </TabsContent>
          <TabsContent value="controls" className="m-0 p-3 space-y-4">
            <Collapsible open={playbackOpen} onOpenChange={setPlaybackOpen}>
              <CollapsibleTrigger asChild>
                <button className="flex items-center justify-between w-full py-1 hover-elevate rounded px-1" data-testid="button-toggle-playback">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Playback</span>
                  {playbackOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2 space-y-3">
                <div className="flex items-center gap-2">
                  {state.isRunning ? (
                    <Button onClick={onPause} variant="secondary" className="flex-1" size="sm" data-testid="button-pause">
                      <Pause className="h-3.5 w-3.5 mr-1.5" />
                      Pause
                    </Button>
                  ) : (
                    <Button 
                      onClick={onPlay} 
                      variant="secondary" 
                      className="flex-1 relative ring-1 ring-cyan-500/50 shadow-[0_0_12px_rgba(34,211,238,0.25)]" 
                      size="sm" 
                      data-testid="button-play"
                    >
                      <Play className="h-3.5 w-3.5 mr-1.5" />
                      Run Simulation
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onShowDualViewChange(!showDualView)}
                    data-testid="button-dual-view"
                  >
                    <Columns2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={onReset}
                    data-testid="button-reset"
                  >
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
                {!state.isRunning && historyLength === 0 && (
                  <p className="text-xs text-muted-foreground leading-relaxed">Run the simulation to reveal dynamic structure in the field visualization.</p>
                )}
                {!state.isRunning && historyLength > 0 && (
                  <p className="text-xs text-muted-foreground leading-relaxed">Scrub step-by-step to see shape as it changes.</p>
                )}
              </CollapsibleContent>
            </Collapsible>

            <Collapsible open={metricsOpen} onOpenChange={setMetricsOpen} className="border-t border-border/50 pt-3">
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

            <Collapsible open={interpretationOpen} onOpenChange={setInterpretationOpen} className="border-t border-border/50 pt-3">
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
          </TabsContent>

          <TabsContent value="params" className="m-0 p-3 space-y-4">
            <p className="text-xs text-muted-foreground italic border-b border-border/50 pb-2">
              Adjust the operator weights and simulation parameters.
            </p>
            <Collapsible open={coreParamsOpen} onOpenChange={setCoreParamsOpen}>
              <CollapsibleTrigger asChild>
                <button className="flex items-center justify-between w-full py-2 text-xs font-medium text-muted-foreground hover-elevate rounded px-2" data-testid="button-toggle-core-params">
                  Core Parameters
                  {coreParamsOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
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

            <Collapsible open={weightsOpen} onOpenChange={setWeightsOpen} className="border-t border-border/50 pt-3">
              <CollapsibleTrigger asChild>
                <button className="flex items-center justify-between w-full py-2 text-xs font-medium text-muted-foreground hover-elevate rounded px-2" data-testid="button-toggle-operators">
                  Operator Weights
                  {weightsOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
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

            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen} className="border-t border-border/50 pt-3">
              <CollapsibleTrigger asChild>
                <button className="flex items-center justify-between w-full py-2 text-xs font-medium text-muted-foreground hover-elevate rounded px-2" data-testid="button-toggle-advanced">
                  <span className="flex items-center gap-1.5">
                    <Settings2 className="h-3.5 w-3.5" />
                    Advanced
                  </span>
                  {advancedOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
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
          </TabsContent>

          <TabsContent value="notebook" className="m-0 p-3 space-y-4">
            <p className="text-xs text-muted-foreground italic border-b border-border/50 pb-2">
              These are the active equations and operator weights governing the field.
            </p>
            <Collapsible open={notebookParamsOpen} onOpenChange={setNotebookParamsOpen}>
              <CollapsibleTrigger asChild>
                <button className="flex items-center justify-between w-full py-1 hover-elevate rounded px-1" data-testid="button-toggle-notebook-params">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Current Parameters</span>
                  {notebookParamsOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-muted/30 p-2 rounded">
                  <div>dt = {params.dt.toFixed(3)}</div>
                  <div>K = {params.curvatureGain.toFixed(2)}</div>
                  <div>C = {params.couplingWeight.toFixed(2)}</div>
                  <div>A = {params.attractorStrength.toFixed(2)}</div>
                  <div>R = {params.redistributionRate.toFixed(2)}</div>
                  <div>Grid: {params.gridSize}x{params.gridSize}</div>
                </div>
              </CollapsibleContent>
            </Collapsible>
            
            <Collapsible open={notebookEquationOpen} onOpenChange={setNotebookEquationOpen} className="border-t border-border/50 pt-3">
              <CollapsibleTrigger asChild>
                <button className="flex items-center justify-between w-full py-1 hover-elevate rounded px-1" data-testid="button-toggle-notebook-equation">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Field Equation</span>
                  {notebookEquationOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <code className="text-xs block bg-muted p-2 rounded font-mono">
                  dF/dt = wK*K(F) + wT*T(F) + wC*C(F) + wA*A(F) + wR*R(F)
                </code>
              </CollapsibleContent>
            </Collapsible>

            <Collapsible open={notebookWeightsOpen} onOpenChange={setNotebookWeightsOpen} className="border-t border-border/50 pt-3">
              <CollapsibleTrigger asChild>
                <button className="flex items-center justify-between w-full py-1 hover-elevate rounded px-1" data-testid="button-toggle-notebook-weights">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Operator Weights</span>
                  {notebookWeightsOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="grid grid-cols-5 gap-1 text-xs font-mono bg-muted/30 p-2 rounded text-center">
                  <div>wK={params.wK.toFixed(1)}</div>
                  <div>wT={params.wT.toFixed(1)}</div>
                  <div>wC={params.wC.toFixed(1)}</div>
                  <div>wA={params.wA.toFixed(1)}</div>
                  <div>wR={params.wR.toFixed(1)}</div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </TabsContent>

          <TabsContent value="export" className="m-0 p-3 space-y-3 overflow-y-auto">
            <div className="text-xs font-medium text-muted-foreground">Visual Exports</div>
            <div className="space-y-2">
              <Button size="sm" variant="outline" className="w-full justify-start" onClick={onExportPNG} data-testid="button-export-png">
                <Download className="h-3.5 w-3.5 mr-2" />
                PNG Snapshot
              </Button>
              <Button size="sm" variant="outline" className="w-full justify-start" onClick={onExportAnimation} disabled={isExporting} data-testid="button-export-animation">
                <Download className="h-3.5 w-3.5 mr-2" />
                {isExporting ? "Exporting..." : "Animation (GIF)"}
              </Button>
              {onExportWebM && (
                <Button size="sm" variant="outline" className="w-full justify-start" onClick={onExportWebM} disabled={isExporting} data-testid="button-export-webm">
                  <Download className="h-3.5 w-3.5 mr-2" />
                  Video (WebM)
                </Button>
              )}
            </div>
            
            <div className="text-xs font-medium text-muted-foreground">Data Exports</div>
            <div className="space-y-2">
              <Button size="sm" variant="outline" className="w-full justify-start" onClick={onExportSimulationData} data-testid="button-export-simulation-data">
                <Download className="h-3.5 w-3.5 mr-2" />
                Simulation Data (.csv)
              </Button>
              <Button size="sm" variant="outline" className="w-full justify-start" onClick={onExportMetrics} data-testid="button-export-metrics">
                <Download className="h-3.5 w-3.5 mr-2" />
                Metrics Log (.csv)
              </Button>
              {onExportOperators && (
                <Button size="sm" variant="outline" className="w-full justify-start" onClick={onExportOperators} data-testid="button-export-operators">
                  <Download className="h-3.5 w-3.5 mr-2" />
                  Operators (.csv)
                </Button>
              )}
              <Button size="sm" variant="outline" className="w-full justify-start" onClick={onExportStateSnapshot} data-testid="button-export-state">
                <Download className="h-3.5 w-3.5 mr-2" />
                State Snapshot (.json)
              </Button>
              <Button size="sm" variant="outline" className="w-full justify-start" onClick={onExportJSON} data-testid="button-export-json">
                <Download className="h-3.5 w-3.5 mr-2" />
                Settings JSON
              </Button>
              <Button size="sm" variant="outline" className="w-full justify-start" onClick={onExportEvents} data-testid="button-export-events">
                <Download className="h-3.5 w-3.5 mr-2" />
                Event Log
              </Button>
            </div>
            
            <div className="text-xs font-medium text-muted-foreground">Research-Grade</div>
            <div className="space-y-2">
              {onExportNumPy && (
                <Button size="sm" variant="outline" className="w-full justify-start" onClick={onExportNumPy} data-testid="button-export-numpy">
                  <Download className="h-3.5 w-3.5 mr-2" />
                  NumPy Array (.npy)
                </Button>
              )}
              {onExportPython && (
                <Button size="sm" variant="outline" className="w-full justify-start" onClick={onExportPython} data-testid="button-export-python">
                  <Download className="h-3.5 w-3.5 mr-2" />
                  Python Script (.py)
                </Button>
              )}
              {onExportLayers && (
                <Button size="sm" variant="outline" className="w-full justify-start" onClick={onExportLayers} data-testid="button-export-layers">
                  <Download className="h-3.5 w-3.5 mr-2" />
                  Layer Data (.json)
                </Button>
              )}
              {onExportBatchSpec && (
                <Button size="sm" variant="outline" className="w-full justify-start" onClick={onExportBatchSpec} data-testid="button-export-batch">
                  <Download className="h-3.5 w-3.5 mr-2" />
                  Batch Spec (.json)
                </Button>
              )}
              {onExportArchive && (
                <Button size="sm" variant="outline" className="w-full justify-start" onClick={onExportArchive} data-testid="button-export-archive">
                  <Download className="h-3.5 w-3.5 mr-2" />
                  Full Archive (.json)
                </Button>
              )}
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
