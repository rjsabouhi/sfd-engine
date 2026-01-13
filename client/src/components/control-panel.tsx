import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Pause, RotateCcw, ChevronDown, ChevronUp, Settings2, Download, Columns2 } from "lucide-react";
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
  const [playbackOpen, setPlaybackOpen] = useState(true);
  const [metricsOpen, setMetricsOpen] = useState(true);
  const [regimeOpen, setRegimeOpen] = useState(true);
  const [operatorsOpen, setOperatorsOpen] = useState(true);
  const [coreParamsOpen, setCoreParamsOpen] = useState(true);
  const [weightsOpen, setWeightsOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [notebookOpen, setNotebookOpen] = useState(false);
  const [eventsOpen, setEventsOpen] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);
  const [interpretationOpen, setInterpretationOpen] = useState(false);

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
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        
        {/* Playback Controls */}
        <Collapsible open={playbackOpen} onOpenChange={setPlaybackOpen}>
          <CollapsibleTrigger asChild>
            <button className="flex items-center justify-between w-full py-1.5 hover-elevate rounded px-2 bg-muted/30" data-testid="button-toggle-playback">
              <span className="text-xs font-medium">Playback</span>
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
                  Run
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
          </CollapsibleContent>
        </Collapsible>

        {/* Structural Signature / Metrics */}
        <Collapsible open={metricsOpen} onOpenChange={setMetricsOpen}>
          <CollapsibleTrigger asChild>
            <button className="flex items-center justify-between w-full py-1.5 hover-elevate rounded px-2 bg-muted/30" data-testid="button-toggle-metrics">
              <span className="text-xs font-medium">Structural Signature</span>
              {metricsOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <StructuralSignatureBar 
              signature={structuralSignature} 
              coherenceHistory={coherenceHistory}
              trendMetrics={trendMetrics}
              state={state}
              modeLabels={modeLabels} 
            />
          </CollapsibleContent>
        </Collapsible>

        {/* System Regime */}
        <Collapsible open={regimeOpen} onOpenChange={setRegimeOpen}>
          <CollapsibleTrigger asChild>
            <button className="flex items-center justify-between w-full py-1.5 hover-elevate rounded px-2 bg-muted/30" data-testid="button-toggle-regime">
              <span className="text-xs font-medium">System Regime</span>
              {regimeOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <LegacyRegimeDisplay
              regime={currentRegime}
              mode={languageMode}
            />
          </CollapsibleContent>
        </Collapsible>

        {/* Operator Contributions */}
        <Collapsible open={operatorsOpen} onOpenChange={setOperatorsOpen}>
          <CollapsibleTrigger asChild>
            <button className="flex items-center justify-between w-full py-1.5 hover-elevate rounded px-2 bg-muted/30" data-testid="button-toggle-operators-viz">
              <span className="text-xs font-medium">Operator Contributions</span>
              {operatorsOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <OperatorSensitivity contributions={operatorContributions} modeLabels={modeLabels} />
          </CollapsibleContent>
        </Collapsible>

        {/* Event Log */}
        <Collapsible open={eventsOpen} onOpenChange={setEventsOpen}>
          <CollapsibleTrigger asChild>
            <button className="flex items-center justify-between w-full py-1.5 hover-elevate rounded px-2 bg-muted/30" data-testid="button-toggle-events">
              <span className="text-xs font-medium">Event Log ({events.length})</span>
              {eventsOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <EventLog events={events} onClear={onClearEvents} onExport={onExportEvents} />
          </CollapsibleContent>
        </Collapsible>

        {/* Core Parameters */}
        <Collapsible open={coreParamsOpen} onOpenChange={setCoreParamsOpen}>
          <CollapsibleTrigger asChild>
            <button className="flex items-center justify-between w-full py-1.5 hover-elevate rounded px-2 bg-muted/30" data-testid="button-toggle-core-params">
              <span className="text-xs font-medium">Core Parameters</span>
              {coreParamsOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-2">
            <ParameterSlider label="Timestep" value={params.dt} min={0.01} max={0.2} step={0.01} onChange={(v) => onParamsChange({ dt: v })} testId="slider-timestep" />
            <ParameterSlider label="Curvature" value={params.curvatureGain} min={0.1} max={10} step={0.1} onChange={(v) => onParamsChange({ curvatureGain: v })} testId="slider-curvature-gain" />
            <ParameterSlider label="Coupling" value={params.couplingWeight} min={0} max={1} step={0.05} onChange={(v) => onParamsChange({ couplingWeight: v })} testId="slider-coupling-weight" />
            <ParameterSlider label="Attractor" value={params.attractorStrength} min={0.1} max={10} step={0.1} onChange={(v) => onParamsChange({ attractorStrength: v })} testId="slider-attractor-strength" />
            <ParameterSlider label="Redistribution" value={params.redistributionRate} min={0} max={1} step={0.05} onChange={(v) => onParamsChange({ redistributionRate: v })} testId="slider-redistribution" />
          </CollapsibleContent>
        </Collapsible>

        {/* Operator Weights */}
        <Collapsible open={weightsOpen} onOpenChange={setWeightsOpen}>
          <CollapsibleTrigger asChild>
            <button className="flex items-center justify-between w-full py-1.5 hover-elevate rounded px-2 bg-muted/30" data-testid="button-toggle-weights">
              <span className="text-xs font-medium">Operator Weights</span>
              {weightsOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-2">
            <ParameterSlider label="wK" value={params.wK} min={0} max={5} step={0.1} onChange={(v) => onParamsChange({ wK: v })} testId="slider-wk" />
            <ParameterSlider label="wT" value={params.wT} min={0} max={5} step={0.1} onChange={(v) => onParamsChange({ wT: v })} testId="slider-wt" />
            <ParameterSlider label="wC" value={params.wC} min={0} max={5} step={0.1} onChange={(v) => onParamsChange({ wC: v })} testId="slider-wc" />
            <ParameterSlider label="wA" value={params.wA} min={0} max={5} step={0.1} onChange={(v) => onParamsChange({ wA: v })} testId="slider-wa" />
            <ParameterSlider label="wR" value={params.wR} min={0} max={5} step={0.1} onChange={(v) => onParamsChange({ wR: v })} testId="slider-wr" />
          </CollapsibleContent>
        </Collapsible>

        {/* Notebook / Equations */}
        <Collapsible open={notebookOpen} onOpenChange={setNotebookOpen}>
          <CollapsibleTrigger asChild>
            <button className="flex items-center justify-between w-full py-1.5 hover-elevate rounded px-2 bg-muted/30" data-testid="button-toggle-notebook">
              <span className="text-xs font-medium">Field Equations</span>
              {notebookOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-muted/30 p-2 rounded">
              <div>dt = {params.dt.toFixed(3)}</div>
              <div>K = {params.curvatureGain.toFixed(2)}</div>
              <div>C = {params.couplingWeight.toFixed(2)}</div>
              <div>A = {params.attractorStrength.toFixed(2)}</div>
              <div>R = {params.redistributionRate.toFixed(2)}</div>
              <div>Grid: {params.gridSize}x{params.gridSize}</div>
            </div>
            <code className="text-xs block bg-muted p-2 rounded font-mono">
              dF/dt = wK*K(F) + wT*T(F) + wC*C(F) + wA*A(F) + wR*R(F)
            </code>
            <div className="grid grid-cols-5 gap-1 text-xs font-mono bg-muted/30 p-2 rounded text-center">
              <div>wK={params.wK.toFixed(1)}</div>
              <div>wT={params.wT.toFixed(1)}</div>
              <div>wC={params.wC.toFixed(1)}</div>
              <div>wA={params.wA.toFixed(1)}</div>
              <div>wR={params.wR.toFixed(1)}</div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Advanced Settings */}
        <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <CollapsibleTrigger asChild>
            <button className="flex items-center justify-between w-full py-1.5 hover-elevate rounded px-2 bg-muted/30" data-testid="button-toggle-advanced">
              <span className="text-xs font-medium flex items-center gap-1.5">
                <Settings2 className="h-3.5 w-3.5" />
                Advanced
              </span>
              {advancedOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-2">
            <ParameterSlider label="Grid Size" value={params.gridSize} min={50} max={400} step={10} onChange={(v) => onParamsChange({ gridSize: v })} testId="slider-grid-size" />
            <ParameterSlider label="Radius" value={params.couplingRadius} min={0.5} max={5} step={0.25} onChange={(v) => onParamsChange({ couplingRadius: v })} testId="slider-coupling-radius" />
            <Button variant="secondary" size="sm" className="w-full" onClick={() => onParamsChange(defaultParameters)} data-testid="button-reset-params">
              {LANGUAGE.UI.RESET}
            </Button>
          </CollapsibleContent>
        </Collapsible>

        {/* Interpretation Mode */}
        <Collapsible open={interpretationOpen} onOpenChange={setInterpretationOpen}>
          <CollapsibleTrigger asChild>
            <button className="flex items-center justify-between w-full py-1.5 hover-elevate rounded px-2 bg-muted/30" data-testid="button-toggle-interpretation">
              <span className="text-xs font-medium">Interpretation Mode</span>
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

        {/* Export */}
        <Collapsible open={exportOpen} onOpenChange={setExportOpen}>
          <CollapsibleTrigger asChild>
            <button className="flex items-center justify-between w-full py-1.5 hover-elevate rounded px-2 bg-muted/30" data-testid="button-toggle-export">
              <span className="text-xs font-medium flex items-center gap-1.5">
                <Download className="h-3.5 w-3.5" />
                Export
              </span>
              {exportOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="outline" onClick={onExportPNG} data-testid="button-export-png">
                PNG
              </Button>
              <Button size="sm" variant="outline" onClick={onExportAnimation} disabled={isExporting} data-testid="button-export-animation">
                {isExporting ? "..." : "GIF"}
              </Button>
              <Button size="sm" variant="outline" onClick={onExportSimulationData} data-testid="button-export-simulation-data">
                CSV
              </Button>
              <Button size="sm" variant="outline" onClick={onExportJSON} data-testid="button-export-json">
                JSON
              </Button>
              {onExportWebM && (
                <Button size="sm" variant="outline" onClick={onExportWebM} disabled={isExporting} data-testid="button-export-webm">
                  WebM
                </Button>
              )}
              {onExportNumPy && (
                <Button size="sm" variant="outline" onClick={onExportNumPy} data-testid="button-export-numpy">
                  NumPy
                </Button>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

      </div>
    </div>
  );
}
