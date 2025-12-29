import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Pause, RotateCcw, StepForward, ChevronDown, ChevronUp, Sliders, Activity, Settings2, BookOpen, Download, Columns2, Palette } from "lucide-react";
import type { SimulationParameters, SimulationState, OperatorContributions, StructuralSignature, StructuralEvent } from "@shared/schema";
import { defaultParameters } from "@shared/schema";
import { StatisticsPanel } from "./statistics-panel";
import { TemporalControls } from "./temporal-controls";
import { OperatorSensitivity } from "./operator-sensitivity";
import { StructuralSignatureBar } from "./structural-signature";
import { EventLog } from "./event-log";
import { PresetMenu } from "./preset-menu";
import { LegacyRegimeDisplay } from "./regime-display";
import type { InterpretationMode } from "@/lib/interpretation-modes";
import { getModeLabels, modeOptions, detectRegime, toLanguageMode } from "@/lib/interpretation-modes";
import { LANGUAGE } from "@/lib/language";
import type { RegimeKey } from "@/lib/language";

interface ControlPanelProps {
  params: SimulationParameters;
  state: SimulationState;
  colormap: "inferno" | "viridis" | "grayscale";
  interpretationMode: InterpretationMode;
  operatorContributions: OperatorContributions;
  structuralSignature: StructuralSignature;
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
  onColormapChange: (colormap: "inferno" | "viridis" | "grayscale") => void;
  onInterpretationModeChange: (mode: InterpretationMode) => void;
  onClearEvents: () => void;
  onExportEvents: () => void;
  onExportPNG: () => void;
  onExportJSON: () => void;
  onShowDualViewChange: (show: boolean) => void;
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
  onShowDualViewChange,
  varianceChange = 0,
}: ControlPanelProps) {
  const [coreParamsOpen, setCoreParamsOpen] = useState(true);
  const [weightsOpen, setWeightsOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [metricsOpen, setMetricsOpen] = useState(false);

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
      <div className="px-3 py-3 border-b border-border shrink-0 space-y-3">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Interpretation Mode</h3>
          <Select value={interpretationMode} onValueChange={(v) => onInterpretationModeChange(v as InterpretationMode)}>
            <SelectTrigger className="h-8" data-testid="select-interpretation-mode">
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
        </div>
        
        <div className="space-y-2 pt-2 border-t border-border/50">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">System Behavior Presets</span>
          <PresetMenu onApply={onParamsChange} />
        </div>
      </div>

      <Tabs defaultValue="controls" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent px-1 h-9 shrink-0 flex-wrap">
          <TabsTrigger value="controls" className="text-xs gap-1 px-2">
            <Play className="h-3 w-3" />
            Controls
          </TabsTrigger>
          <TabsTrigger value="params" className="text-xs gap-1 px-2">
            <Sliders className="h-3 w-3" />
            Params
          </TabsTrigger>
          <TabsTrigger value="analysis" className="text-xs gap-1 px-2">
            <Activity className="h-3 w-3" />
            Analysis
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
          <TabsContent value="controls" className="m-0 p-3 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {state.isRunning ? (
                  <Button onClick={onPause} variant="secondary" className="flex-1" size="sm" data-testid="button-pause">
                    <Pause className="h-3.5 w-3.5 mr-1.5" />
                    Pause
                  </Button>
                ) : (
                  <Button 
                    onClick={onPlay} 
                    variant="ghost"
                    className="flex-1 bg-teal-400/80 hover:bg-teal-300/80 text-teal-950 border border-teal-300/50" 
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
              {!state.isRunning && (
                <p className="text-[10px] text-muted-foreground text-center">Run the simulation to reveal dynamic structure.</p>
              )}
            </div>

            <div className="border-t border-border/50 pt-3">
              <div className="flex gap-2">
                <button
                  onClick={() => onColormapChange(colormap === "inferno" ? "viridis" : "inferno")}
                  className="relative h-10 w-10 rounded-sm transition-all duration-150 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
                  style={{
                    backgroundColor: colormap === "viridis" ? "rgba(12, 74, 110, 0.6)" : "rgba(127, 29, 29, 0.4)",
                    border: colormap === "viridis" 
                      ? "1px solid rgba(125, 211, 252, 0.5)" 
                      : "1px solid rgba(248, 113, 113, 0.4)"
                  }}
                  data-testid="pad-colormap-toggle"
                >
                  <Palette className={`h-4 w-4 mx-auto ${colormap === "viridis" ? "text-sky-300/80" : "text-red-400/80"}`} />
                </button>
                <button
                  onClick={() => onShowDualViewChange(!showDualView)}
                  className="relative h-10 w-10 rounded-sm transition-all duration-150 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
                  style={{
                    backgroundColor: showDualView ? "#744B93" : "rgba(39, 39, 42, 1)",
                    border: showDualView ? "1px solid #C4A7E7" : "1px solid transparent"
                  }}
                  data-testid="pad-dual-view"
                >
                  <Columns2 className={`h-4 w-4 mx-auto ${showDualView ? "text-purple-200" : "text-zinc-500"}`} />
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-border space-y-2">
              <h4 className="text-xs font-medium">Timeline</h4>
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
            </div>

            <Collapsible open={metricsOpen} onOpenChange={setMetricsOpen} className="border-t border-border pt-3">
              <CollapsibleTrigger asChild>
                <button className="flex items-center justify-between w-full py-1 hover-elevate rounded px-1" data-testid="button-toggle-metrics-inline">
                  <h4 className="text-xs font-medium flex items-center gap-1.5">
                    <Activity className="h-3 w-3" />
                    Simulation Metrics
                  </h4>
                  {metricsOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2 space-y-2">
                <StructuralSignatureBar signature={structuralSignature} modeLabels={modeLabels} />
                <StatisticsPanel state={state} modeLabels={modeLabels} />
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

            <Collapsible open={weightsOpen} onOpenChange={setWeightsOpen}>
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
              <CollapsibleContent className="space-y-2 pt-2">
                <ParameterSlider label="Grid Size" value={params.gridSize} min={50} max={400} step={10} onChange={(v) => onParamsChange({ gridSize: v })} testId="slider-grid-size" />
                <ParameterSlider label="Radius" value={params.couplingRadius} min={0.5} max={5} step={0.25} onChange={(v) => onParamsChange({ couplingRadius: v })} testId="slider-coupling-radius" />
                <Button variant="secondary" size="sm" className="w-full" onClick={() => onParamsChange(defaultParameters)} data-testid="button-reset-params">
                  {LANGUAGE.UI.RESET}
                </Button>
              </CollapsibleContent>
            </Collapsible>
          </TabsContent>

          <TabsContent value="analysis" className="m-0 p-3 space-y-4">
            <LegacyRegimeDisplay regime={currentRegime} mode={languageMode} />

            <div className="space-y-2 border-t border-border pt-2">
              <div className="text-xs font-medium text-muted-foreground">Operator Contributions</div>
              <OperatorSensitivity contributions={operatorContributions} modeLabels={modeLabels} />
            </div>

            <div className="space-y-2 pt-2 border-t border-border">
              <div className="text-xs font-medium text-muted-foreground">Event Log ({events.length})</div>
              <EventLog events={events} onClear={onClearEvents} onExport={onExportEvents} />
            </div>
          </TabsContent>

          <TabsContent value="notebook" className="m-0 p-3 space-y-4">
            <p className="text-xs text-muted-foreground italic border-b border-border/50 pb-2">
              These are the active equations and operator weights governing the field.
            </p>
            <div className="space-y-3">
              <div className="text-xs font-medium text-muted-foreground">Current Parameters</div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-muted/30 p-2 rounded">
                <div>dt = {params.dt.toFixed(3)}</div>
                <div>K = {params.curvatureGain.toFixed(2)}</div>
                <div>C = {params.couplingWeight.toFixed(2)}</div>
                <div>A = {params.attractorStrength.toFixed(2)}</div>
                <div>R = {params.redistributionRate.toFixed(2)}</div>
                <div>Grid: {params.gridSize}x{params.gridSize}</div>
              </div>
            </div>
            
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="text-xs font-medium text-muted-foreground">Field Equation</div>
              <code className="text-xs block bg-muted p-2 rounded font-mono">
                dF/dt = wK*K(F) + wT*T(F) + wC*C(F) + wA*A(F) + wR*R(F)
              </code>
            </div>

            <div className="space-y-2 pt-2 border-t border-border">
              <div className="text-xs font-medium text-muted-foreground">Operator Weights</div>
              <div className="grid grid-cols-5 gap-1 text-xs font-mono bg-muted/30 p-2 rounded text-center">
                <div>wK={params.wK.toFixed(1)}</div>
                <div>wT={params.wT.toFixed(1)}</div>
                <div>wC={params.wC.toFixed(1)}</div>
                <div>wA={params.wA.toFixed(1)}</div>
                <div>wR={params.wR.toFixed(1)}</div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="export" className="m-0 p-3 space-y-3">
            <div className="text-xs font-medium text-muted-foreground">Export Options</div>
            <div className="space-y-2">
              <Button size="sm" variant="outline" className="w-full justify-start" onClick={onExportPNG} data-testid="button-export-png">
                <Download className="h-3.5 w-3.5 mr-2" />
                PNG Snapshot
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
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
