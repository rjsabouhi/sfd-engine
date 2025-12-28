import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { SimulationParameters } from "@shared/schema";
import { mobileParameters } from "@shared/schema";
import type { InterpretationMode } from "@/lib/interpretation-modes";
import { getModeLabels, modeOptions } from "@/lib/interpretation-modes";

interface MobileControlPanelProps {
  params: SimulationParameters;
  colormap: "inferno" | "viridis";
  interpretationMode: InterpretationMode;
  onParamsChange: (params: Partial<SimulationParameters>) => void;
  onColormapChange: (colormap: "inferno" | "viridis") => void;
  onInterpretationModeChange: (mode: InterpretationMode) => void;
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
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm">{label}</Label>
        <span className="text-sm font-mono tabular-nums text-muted-foreground">
          {value.toFixed(2)}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
        className="touch-none"
        data-testid={testId}
      />
    </div>
  );
}

export function MobileControlPanel({
  params,
  colormap,
  interpretationMode,
  onParamsChange,
  onColormapChange,
  onInterpretationModeChange,
}: MobileControlPanelProps) {
  const [coreOpen, setCoreOpen] = useState(true);
  const [operatorsOpen, setOperatorsOpen] = useState(false);

  const modeLabels = getModeLabels(interpretationMode);

  return (
    <div className="space-y-4 pb-4">
      <div className="space-y-2 pb-3 border-b border-border">
        <h3 className="text-base font-semibold">Interpretation Mode</h3>
        <Select value={interpretationMode} onValueChange={(v) => onInterpretationModeChange(v as InterpretationMode)}>
          <SelectTrigger className="h-10" data-testid="select-interpretation-mode-mobile">
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
        <p className="text-sm text-muted-foreground leading-relaxed">{modeLabels.subtitle}</p>
      </div>


      <Collapsible open={coreOpen} onOpenChange={setCoreOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-3 cursor-pointer" data-testid="button-toggle-core-mobile">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Core Parameters</CardTitle>
                {coreOpen ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-5 pt-0">
              <ParameterSlider
                label="Timestep"
                value={params.dt}
                min={0.01}
                max={0.2}
                step={0.01}
                onChange={(v) => onParamsChange({ dt: v })}
                testId="slider-mobile-timestep"
              />
              <ParameterSlider
                label={modeLabels.operators.curvature}
                value={params.curvatureGain}
                min={0.1}
                max={10}
                step={0.1}
                onChange={(v) => onParamsChange({ curvatureGain: v })}
                testId="slider-mobile-curvature"
              />
              <ParameterSlider
                label={modeLabels.operators.coupling}
                value={params.couplingWeight}
                min={0}
                max={1}
                step={0.05}
                onChange={(v) => onParamsChange({ couplingWeight: v })}
                testId="slider-mobile-coupling"
              />
              <ParameterSlider
                label={modeLabels.operators.attractor}
                value={params.attractorStrength}
                min={0.1}
                max={10}
                step={0.1}
                onChange={(v) => onParamsChange({ attractorStrength: v })}
                testId="slider-mobile-attractor"
              />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Collapsible open={operatorsOpen} onOpenChange={setOperatorsOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-3 cursor-pointer" data-testid="button-toggle-operators-mobile">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Operator Weights</CardTitle>
                {operatorsOpen ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-5 pt-0">
              <ParameterSlider
                label={`${modeLabels.operators.curvature} Weight`}
                value={params.wK}
                min={0}
                max={5}
                step={0.1}
                onChange={(v) => onParamsChange({ wK: v })}
                testId="slider-mobile-wk"
              />
              <ParameterSlider
                label={`${modeLabels.operators.tension} Weight`}
                value={params.wT}
                min={0}
                max={5}
                step={0.1}
                onChange={(v) => onParamsChange({ wT: v })}
                testId="slider-mobile-wt"
              />
              <ParameterSlider
                label={`${modeLabels.operators.coupling} Weight`}
                value={params.wC}
                min={0}
                max={5}
                step={0.1}
                onChange={(v) => onParamsChange({ wC: v })}
                testId="slider-mobile-wc"
              />
              <ParameterSlider
                label={`${modeLabels.operators.attractor} Weight`}
                value={params.wA}
                min={0}
                max={5}
                step={0.1}
                onChange={(v) => onParamsChange({ wA: v })}
                testId="slider-mobile-wa"
              />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Button
        variant="secondary"
        className="w-full h-12"
        onClick={() => onParamsChange(mobileParameters)}
        data-testid="button-reset-params-mobile"
      >
        Reset to Defaults
      </Button>
    </div>
  );
}
