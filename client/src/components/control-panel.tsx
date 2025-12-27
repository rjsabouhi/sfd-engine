import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Play, Pause, RotateCcw, StepForward, ChevronDown, ChevronUp, Info } from "lucide-react";
import type { SimulationParameters, SimulationState } from "@shared/schema";
import { defaultParameters } from "@shared/schema";
import { StatisticsPanel } from "./statistics-panel";

interface ControlPanelProps {
  params: SimulationParameters;
  state: SimulationState;
  colormap: "inferno" | "viridis";
  onParamsChange: (params: Partial<SimulationParameters>) => void;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  onStep: () => void;
  onColormapChange: (colormap: "inferno" | "viridis") => void;
}

interface ParameterSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  tooltip?: string;
  onChange: (value: number) => void;
}

function ParameterSlider({ label, value, min, max, step, tooltip, onChange }: ParameterSliderProps) {
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
        data-testid={`slider-${label.toLowerCase().replace(/\s/g, '-')}`}
      />
    </div>
  );
}

export function ControlPanel({
  params,
  state,
  colormap,
  onParamsChange,
  onPlay,
  onPause,
  onReset,
  onStep,
  onColormapChange,
}: ControlPanelProps) {
  const [coreOpen, setCoreOpen] = useState(true);
  const [operatorsOpen, setOperatorsOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto space-y-4 p-4">
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
          </CardContent>
        </Card>

        <Collapsible open={coreOpen} onOpenChange={setCoreOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-3 cursor-pointer hover-elevate rounded-t-lg" data-testid="button-toggle-core">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Core Parameters</CardTitle>
                  {coreOpen ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4 pt-0">
                <ParameterSlider
                  label="Timestep (dt)"
                  value={params.dt}
                  min={0.01}
                  max={0.2}
                  step={0.01}
                  tooltip="Controls simulation speed and stability"
                  onChange={(v) => onParamsChange({ dt: v })}
                />
                <ParameterSlider
                  label="Curvature Gain"
                  value={params.curvatureGain}
                  min={0.1}
                  max={10}
                  step={0.1}
                  tooltip="Sensitivity to local curvature changes"
                  onChange={(v) => onParamsChange({ curvatureGain: v })}
                />
                <ParameterSlider
                  label="Coupling Weight"
                  value={params.couplingWeight}
                  min={0}
                  max={1}
                  step={0.05}
                  tooltip="Balance between local and neighborhood values"
                  onChange={(v) => onParamsChange({ couplingWeight: v })}
                />
                <ParameterSlider
                  label="Attractor Strength"
                  value={params.attractorStrength}
                  min={0.1}
                  max={10}
                  step={0.1}
                  tooltip="Intensity of basin formation"
                  onChange={(v) => onParamsChange({ attractorStrength: v })}
                />
                <ParameterSlider
                  label="Redistribution"
                  value={params.redistributionRate}
                  min={0}
                  max={1}
                  step={0.05}
                  tooltip="Global energy redistribution rate"
                  onChange={(v) => onParamsChange({ redistributionRate: v })}
                />
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
                  {operatorsOpen ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4 pt-0">
                <ParameterSlider
                  label="Curvature (wK)"
                  value={params.wK}
                  min={0}
                  max={5}
                  step={0.1}
                  tooltip="Weight of curvature operator"
                  onChange={(v) => onParamsChange({ wK: v })}
                />
                <ParameterSlider
                  label="Tension (wT)"
                  value={params.wT}
                  min={0}
                  max={5}
                  step={0.1}
                  tooltip="Weight of gradient-tension operator"
                  onChange={(v) => onParamsChange({ wT: v })}
                />
                <ParameterSlider
                  label="Coupling (wC)"
                  value={params.wC}
                  min={0}
                  max={5}
                  step={0.1}
                  tooltip="Weight of neighbor-coupling operator"
                  onChange={(v) => onParamsChange({ wC: v })}
                />
                <ParameterSlider
                  label="Attractor (wA)"
                  value={params.wA}
                  min={0}
                  max={5}
                  step={0.1}
                  tooltip="Weight of attractor-formation operator"
                  onChange={(v) => onParamsChange({ wA: v })}
                />
                <ParameterSlider
                  label="Redistribution (wR)"
                  value={params.wR}
                  min={0}
                  max={5}
                  step={0.1}
                  tooltip="Weight of global redistribution operator"
                  onChange={(v) => onParamsChange({ wR: v })}
                />
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
                  {advancedOpen ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4 pt-0">
                <ParameterSlider
                  label="Grid Size"
                  value={params.gridSize}
                  min={50}
                  max={400}
                  step={10}
                  tooltip="Resolution of simulation grid (requires reset)"
                  onChange={(v) => onParamsChange({ gridSize: v })}
                />
                <ParameterSlider
                  label="Coupling Radius"
                  value={params.couplingRadius}
                  min={0.5}
                  max={5}
                  step={0.25}
                  tooltip="Radius for Gaussian blur in coupling operator"
                  onChange={(v) => onParamsChange({ couplingRadius: v })}
                />
                <div className="pt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={() => onParamsChange(defaultParameters)}
                    data-testid="button-reset-params"
                  >
                    Reset to Defaults
                  </Button>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>

      <div className="border-t border-border p-4 bg-card/30">
        <StatisticsPanel state={state} />
      </div>
    </div>
  );
}
