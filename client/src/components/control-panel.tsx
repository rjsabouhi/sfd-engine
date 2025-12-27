import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Play, Pause, RotateCcw, StepForward, ChevronDown, ChevronUp, Info, Sliders, Activity, Settings2 } from "lucide-react";
import type { SimulationParameters, SimulationState, OperatorContributions, StructuralSignature, StructuralEvent } from "@shared/schema";
import { defaultParameters } from "@shared/schema";
import { StatisticsPanel } from "./statistics-panel";
import { TemporalControls } from "./temporal-controls";
import { OperatorSensitivity } from "./operator-sensitivity";
import { StructuralSignatureBar } from "./structural-signature";
import { EventLog } from "./event-log";
import { PresetMenu } from "./preset-menu";
import type { InterpretationMode } from "@/lib/interpretation-modes";
import { interpretationModes, modeOptions } from "@/lib/interpretation-modes";

interface ControlPanelProps {
  params: SimulationParameters;
  state: SimulationState;
  colormap: "inferno" | "viridis";
  interpretationMode: InterpretationMode;
  operatorContributions: OperatorContributions;
  structuralSignature: StructuralSignature;
  events: StructuralEvent[];
  historyLength: number;
  currentHistoryIndex: number;
  isPlaybackMode: boolean;
  showBasins: boolean;
  showDualView: boolean;
  bottomPanelOpen: boolean;
  onParamsChange: (params: Partial<SimulationParameters>) => void;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  onStep: () => void;
  onStepBackward: () => void;
  onSeekFrame: (index: number) => void;
  onExitPlayback: () => void;
  onColormapChange: (colormap: "inferno" | "viridis") => void;
  onInterpretationModeChange: (mode: InterpretationMode) => void;
  onClearEvents: () => void;
  onExportEvents: () => void;
  onShowBasinsChange: (show: boolean) => void;
  onShowDualViewChange: (show: boolean) => void;
  onBottomPanelChange: (open: boolean) => void;
}

interface ParameterSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  tooltip?: string;
  onChange: (value: number) => void;
  testId: string;
}

function ParameterSlider({ label, value, min, max, step, tooltip, onChange, testId }: ParameterSliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Label className="text-sm">{label}</Label>
          {tooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[200px]">
                <p className="text-xs">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <span className="text-sm font-mono tabular-nums text-muted-foreground w-14 text-right">
          {value.toFixed(2)}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
        data-testid={testId}
      />
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
  events,
  historyLength,
  currentHistoryIndex,
  isPlaybackMode,
  showBasins,
  showDualView,
  bottomPanelOpen,
  onParamsChange,
  onPlay,
  onPause,
  onReset,
  onStep,
  onStepBackward,
  onSeekFrame,
  onExitPlayback,
  onColormapChange,
  onInterpretationModeChange,
  onClearEvents,
  onExportEvents,
  onShowBasinsChange,
  onShowDualViewChange,
  onBottomPanelChange,
}: ControlPanelProps) {
  const [weightsOpen, setWeightsOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [metricsOpen, setMetricsOpen] = useState(true);

  const modeLabels = interpretationModes[interpretationMode];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-3 py-2 border-b border-border shrink-0">
        <div className="text-sm font-semibold">{modeLabels.header}</div>
        <p className="text-xs text-muted-foreground truncate">{modeLabels.subtitle}</p>
      </div>

      <Tabs defaultValue="controls" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent px-2 h-9 shrink-0">
          <TabsTrigger value="controls" className="text-xs gap-1">
            <Play className="h-3 w-3" />
            Controls
          </TabsTrigger>
          <TabsTrigger value="params" className="text-xs gap-1">
            <Sliders className="h-3 w-3" />
            Params
          </TabsTrigger>
          <TabsTrigger value="analysis" className="text-xs gap-1">
            <Activity className="h-3 w-3" />
            Analysis
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto">
          <TabsContent value="controls" className="m-0 p-3 space-y-4">
            <div className="flex items-center gap-2">
              {state.isRunning ? (
                <Button onClick={onPause} className="flex-1" size="sm" data-testid="button-pause">
                  <Pause className="h-3.5 w-3.5 mr-1.5" />
                  Pause
                </Button>
              ) : (
                <Button onClick={onPlay} className="flex-1" size="sm" data-testid="button-play">
                  <Play className="h-3.5 w-3.5 mr-1.5" />
                  Run
                </Button>
              )}
              <Button
                variant="outline"
                size="icon"
                onClick={onStep}
                disabled={state.isRunning}
                data-testid="button-step"
              >
                <StepForward className="h-3.5 w-3.5" />
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

            <div className="space-y-1.5">
              <Label className="text-xs">Colormap</Label>
              <Select value={colormap} onValueChange={(v) => onColormapChange(v as "inferno" | "viridis")}>
                <SelectTrigger className="h-8 text-xs" data-testid="select-colormap">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inferno">Inferno</SelectItem>
                  <SelectItem value="viridis">Viridis</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col items-center gap-1">
                <Label className="text-xs">Basins</Label>
                <Switch
                  checked={showBasins}
                  onCheckedChange={onShowBasinsChange}
                  data-testid="switch-show-basins"
                />
              </div>
              <div className="flex flex-col items-center gap-1">
                <Label className="text-xs">Dual View</Label>
                <Switch
                  checked={showDualView}
                  onCheckedChange={onShowDualViewChange}
                  data-testid="switch-dual-view"
                />
              </div>
              <div className="flex flex-col items-center gap-1">
                <Label className="text-xs">Bottom</Label>
                <Switch
                  checked={bottomPanelOpen}
                  onCheckedChange={onBottomPanelChange}
                  data-testid="switch-bottom-panel"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Interpretation Mode</Label>
              <Select value={interpretationMode} onValueChange={(v) => onInterpretationModeChange(v as InterpretationMode)}>
                <SelectTrigger className="h-8 text-xs" data-testid="select-interpretation-mode">
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
            </div>

            <PresetMenu onApply={onParamsChange} />

            <div className="pt-2 border-t border-border">
              <div className="text-xs font-medium text-muted-foreground mb-2">Timeline</div>
              <TemporalControls
                historyLength={historyLength}
                currentIndex={currentHistoryIndex}
                isPlaybackMode={isPlaybackMode}
                isRunning={state.isRunning}
                onStepBackward={onStepBackward}
                onStepForward={onStep}
                onSeek={onSeekFrame}
                onExitPlayback={onExitPlayback}
              />
            </div>
          </TabsContent>

          <TabsContent value="params" className="m-0 p-3 space-y-4">
            <div className="space-y-3">
              <div className="text-xs font-medium text-muted-foreground">Core Parameters</div>
              <ParameterSlider label="Timestep (dt)" value={params.dt} min={0.01} max={0.2} step={0.01} tooltip="Controls simulation speed and stability" onChange={(v) => onParamsChange({ dt: v })} testId="slider-timestep" />
              <ParameterSlider label={modeLabels.operators.curvature} value={params.curvatureGain} min={0.1} max={10} step={0.1} tooltip="Sensitivity to local curvature changes" onChange={(v) => onParamsChange({ curvatureGain: v })} testId="slider-curvature-gain" />
              <ParameterSlider label={modeLabels.operators.coupling} value={params.couplingWeight} min={0} max={1} step={0.05} tooltip="Balance between local and neighborhood values" onChange={(v) => onParamsChange({ couplingWeight: v })} testId="slider-coupling-weight" />
              <ParameterSlider label={modeLabels.operators.attractor} value={params.attractorStrength} min={0.1} max={10} step={0.1} tooltip="Intensity of basin formation" onChange={(v) => onParamsChange({ attractorStrength: v })} testId="slider-attractor-strength" />
              <ParameterSlider label="Redistribution" value={params.redistributionRate} min={0} max={1} step={0.05} tooltip="Global energy redistribution rate" onChange={(v) => onParamsChange({ redistributionRate: v })} testId="slider-redistribution" />
            </div>

            <Collapsible open={weightsOpen} onOpenChange={setWeightsOpen}>
              <CollapsibleTrigger asChild>
                <button className="flex items-center justify-between w-full py-2 text-xs font-medium text-muted-foreground hover-elevate rounded px-2" data-testid="button-toggle-operators">
                  Operator Weights
                  {weightsOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-2">
                <ParameterSlider label={`${modeLabels.operators.curvature} (wK)`} value={params.wK} min={0} max={5} step={0.1} onChange={(v) => onParamsChange({ wK: v })} testId="slider-wk" />
                <ParameterSlider label={`${modeLabels.operators.tension} (wT)`} value={params.wT} min={0} max={5} step={0.1} onChange={(v) => onParamsChange({ wT: v })} testId="slider-wt" />
                <ParameterSlider label={`${modeLabels.operators.coupling} (wC)`} value={params.wC} min={0} max={5} step={0.1} onChange={(v) => onParamsChange({ wC: v })} testId="slider-wc" />
                <ParameterSlider label={`${modeLabels.operators.attractor} (wA)`} value={params.wA} min={0} max={5} step={0.1} onChange={(v) => onParamsChange({ wA: v })} testId="slider-wa" />
                <ParameterSlider label="Redistribution (wR)" value={params.wR} min={0} max={5} step={0.1} onChange={(v) => onParamsChange({ wR: v })} testId="slider-wr" />
              </CollapsibleContent>
            </Collapsible>

            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <button className="flex items-center justify-between w-full py-2 text-xs font-medium text-muted-foreground hover-elevate rounded px-2" data-testid="button-toggle-advanced">
                  <span className="flex items-center gap-1.5">
                    <Settings2 className="h-3.5 w-3.5" />
                    Advanced
                  </span>
                  {advancedOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-2">
                <ParameterSlider label="Grid Size" value={params.gridSize} min={50} max={400} step={10} tooltip="Resolution of simulation grid (requires reset)" onChange={(v) => onParamsChange({ gridSize: v })} testId="slider-grid-size" />
                <ParameterSlider label="Coupling Radius" value={params.couplingRadius} min={0.5} max={5} step={0.25} tooltip="Radius for Gaussian blur in coupling operator" onChange={(v) => onParamsChange({ couplingRadius: v })} testId="slider-coupling-radius" />
                <Button variant="secondary" size="sm" className="w-full" onClick={() => onParamsChange(defaultParameters)} data-testid="button-reset-params">
                  Reset to Defaults
                </Button>
              </CollapsibleContent>
            </Collapsible>
          </TabsContent>

          <TabsContent value="analysis" className="m-0 p-3 space-y-4">
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Operator Contributions</div>
              <OperatorSensitivity contributions={operatorContributions} modeLabels={modeLabels} />
            </div>

            <div className="space-y-2 pt-2 border-t border-border">
              <div className="text-xs font-medium text-muted-foreground">Event Log ({events.length})</div>
              <EventLog events={events} onClear={onClearEvents} onExport={onExportEvents} />
            </div>
          </TabsContent>
        </div>
      </Tabs>

      <Collapsible open={metricsOpen} onOpenChange={setMetricsOpen} className="border-t border-border shrink-0">
        <CollapsibleTrigger asChild>
          <button className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium text-muted-foreground hover-elevate" data-testid="button-toggle-metrics">
            <span className="flex items-center gap-1.5">
              <Activity className="h-3 w-3" />
              Real-time Metrics
            </span>
            {metricsOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="px-3 pb-3 space-y-2 bg-card/30">
          <StructuralSignatureBar signature={structuralSignature} modeLabels={modeLabels} />
          <StatisticsPanel state={state} modeLabels={modeLabels} />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
