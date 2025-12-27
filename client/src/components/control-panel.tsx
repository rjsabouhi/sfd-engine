import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Play, Pause, RotateCcw, StepForward, ChevronDown, ChevronUp, Info, Columns } from "lucide-react";
import type { SimulationParameters, SimulationState, OperatorContributions, StructuralSignature, StructuralEvent } from "@shared/schema";
import { defaultParameters } from "@shared/schema";
import { StatisticsPanel } from "./statistics-panel";
import { TemporalControls } from "./temporal-controls";
import { OperatorSensitivity } from "./operator-sensitivity";
import { StructuralSignatureBar } from "./structural-signature";
import { EventLog } from "./event-log";
import { PresetMenu } from "./preset-menu";
import { ExportPanel } from "./export-panel";
import { NotebookMode } from "./notebook-mode";
import type { InterpretationMode, ModeLabels } from "@/lib/interpretation-modes";
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
  onExportPNG: () => void;
  onExportJSON: () => void;
  onExportGIF: () => void;
  onShowBasinsChange: (show: boolean) => void;
  onShowDualViewChange: (show: boolean) => void;
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
  onExportPNG,
  onExportJSON,
  onExportGIF,
  onShowBasinsChange,
  onShowDualViewChange,
}: ControlPanelProps) {
  const [coreOpen, setCoreOpen] = useState(true);
  const [operatorsOpen, setOperatorsOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [eventsOpen, setEventsOpen] = useState(false);

  const modeLabels = interpretationModes[interpretationMode];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto space-y-4 p-4">
        <div className="space-y-2 pb-2 border-b border-border">
          <div className="text-base font-semibold">{modeLabels.header}</div>
          <p className="text-xs text-muted-foreground">{modeLabels.subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          <NotebookMode
            params={params}
            state={state}
            contributions={operatorContributions}
            signature={structuralSignature}
          />
          <Button
            variant={showDualView ? "default" : "outline"}
            size="sm"
            onClick={() => onShowDualViewChange(!showDualView)}
            data-testid="button-dual-view"
          >
            <Columns className="h-4 w-4 mr-2" />
            Dual View
          </Button>
        </div>

        <div className="space-y-2">
          <Label className="text-sm">Interpretation Mode</Label>
          <Select value={interpretationMode} onValueChange={(v) => onInterpretationModeChange(v as InterpretationMode)}>
            <SelectTrigger data-testid="select-interpretation-mode">
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

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Simulation Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              {state.isRunning ? (
                <Button onClick={onPause} className="flex-1" data-testid="button-pause">
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </Button>
              ) : (
                <Button onClick={onPlay} className="flex-1" data-testid="button-play">
                  <Play className="h-4 w-4 mr-2" />
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
                <StepForward className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={onReset}
                data-testid="button-reset"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">Colormap</Label>
                <Select value={colormap} onValueChange={(v) => onColormapChange(v as "inferno" | "viridis")}>
                  <SelectTrigger data-testid="select-colormap">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inferno">Inferno</SelectItem>
                    <SelectItem value="viridis">Viridis</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Show Basins</Label>
                <div className="flex items-center h-9">
                  <Switch
                    checked={showBasins}
                    onCheckedChange={onShowBasinsChange}
                    data-testid="switch-show-basins"
                  />
                </div>
              </div>
            </div>

            <ExportPanel
              onExportPNG={onExportPNG}
              onExportJSON={onExportJSON}
              onExportGIF={onExportGIF}
            />
          </CardContent>
        </Card>

        <Collapsible open={timelineOpen} onOpenChange={setTimelineOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-3 cursor-pointer hover-elevate rounded-t-lg" data-testid="button-toggle-timeline">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Timeline Playback</CardTitle>
                  {timelineOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
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
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        <Collapsible open={analysisOpen} onOpenChange={setAnalysisOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-3 cursor-pointer hover-elevate rounded-t-lg" data-testid="button-toggle-analysis">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Operator Analysis</CardTitle>
                  {analysisOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <OperatorSensitivity contributions={operatorContributions} modeLabels={modeLabels} />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        <Collapsible open={eventsOpen} onOpenChange={setEventsOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-3 cursor-pointer hover-elevate rounded-t-lg" data-testid="button-toggle-events">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Event Log</CardTitle>
                  {eventsOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <EventLog events={events} onClear={onClearEvents} onExport={onExportEvents} />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        <Collapsible open={coreOpen} onOpenChange={setCoreOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-3 cursor-pointer hover-elevate rounded-t-lg" data-testid="button-toggle-core">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Core Parameters</CardTitle>
                  {coreOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4 pt-0">
                <ParameterSlider label="Timestep (dt)" value={params.dt} min={0.01} max={0.2} step={0.01} tooltip="Controls simulation speed and stability" onChange={(v) => onParamsChange({ dt: v })} testId="slider-timestep" />
                <ParameterSlider label={modeLabels.operators.curvature} value={params.curvatureGain} min={0.1} max={10} step={0.1} tooltip="Sensitivity to local curvature changes" onChange={(v) => onParamsChange({ curvatureGain: v })} testId="slider-curvature-gain" />
                <ParameterSlider label={modeLabels.operators.coupling} value={params.couplingWeight} min={0} max={1} step={0.05} tooltip="Balance between local and neighborhood values" onChange={(v) => onParamsChange({ couplingWeight: v })} testId="slider-coupling-weight" />
                <ParameterSlider label={modeLabels.operators.attractor} value={params.attractorStrength} min={0.1} max={10} step={0.1} tooltip="Intensity of basin formation" onChange={(v) => onParamsChange({ attractorStrength: v })} testId="slider-attractor-strength" />
                <ParameterSlider label="Redistribution" value={params.redistributionRate} min={0} max={1} step={0.05} tooltip="Global energy redistribution rate" onChange={(v) => onParamsChange({ redistributionRate: v })} testId="slider-redistribution" />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        <Collapsible open={operatorsOpen} onOpenChange={setOperatorsOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-3 cursor-pointer hover-elevate rounded-t-lg" data-testid="button-toggle-operators">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Operator Weights</CardTitle>
                  {operatorsOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4 pt-0">
                <ParameterSlider label={`${modeLabels.operators.curvature} Weight`} value={params.wK} min={0} max={5} step={0.1} onChange={(v) => onParamsChange({ wK: v })} testId="slider-wk" />
                <ParameterSlider label={`${modeLabels.operators.tension} Weight`} value={params.wT} min={0} max={5} step={0.1} onChange={(v) => onParamsChange({ wT: v })} testId="slider-wt" />
                <ParameterSlider label={`${modeLabels.operators.coupling} Weight`} value={params.wC} min={0} max={5} step={0.1} onChange={(v) => onParamsChange({ wC: v })} testId="slider-wc" />
                <ParameterSlider label={`${modeLabels.operators.attractor} Weight`} value={params.wA} min={0} max={5} step={0.1} onChange={(v) => onParamsChange({ wA: v })} testId="slider-wa" />
                <ParameterSlider label="Redistribution (wR)" value={params.wR} min={0} max={5} step={0.1} onChange={(v) => onParamsChange({ wR: v })} testId="slider-wr" />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-3 cursor-pointer hover-elevate rounded-t-lg" data-testid="button-toggle-advanced">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Advanced Settings</CardTitle>
                  {advancedOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4 pt-0">
                <ParameterSlider label="Grid Size" value={params.gridSize} min={50} max={400} step={10} tooltip="Resolution of simulation grid (requires reset)" onChange={(v) => onParamsChange({ gridSize: v })} testId="slider-grid-size" />
                <ParameterSlider label="Coupling Radius" value={params.couplingRadius} min={0.5} max={5} step={0.25} tooltip="Radius for Gaussian blur in coupling operator" onChange={(v) => onParamsChange({ couplingRadius: v })} testId="slider-coupling-radius" />
                <Button variant="secondary" size="sm" className="w-full" onClick={() => onParamsChange(defaultParameters)} data-testid="button-reset-params">
                  Reset to Defaults
                </Button>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>

      <div className="border-t border-border p-4 bg-card/30 space-y-3">
        <StructuralSignatureBar signature={structuralSignature} modeLabels={modeLabels} />
        <StatisticsPanel state={state} modeLabels={modeLabels} />
      </div>
    </div>
  );
}
