import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { SimulationParameters } from "@shared/schema";
import { defaultParameters, mobileParameters } from "@shared/schema";

interface MobileControlPanelProps {
  params: SimulationParameters;
  colormap: "inferno" | "viridis";
  onParamsChange: (params: Partial<SimulationParameters>) => void;
  onColormapChange: (colormap: "inferno" | "viridis") => void;
}

interface ParameterSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

function ParameterSlider({ label, value, min, max, step, onChange }: ParameterSliderProps) {
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
        data-testid={`slider-mobile-${label.toLowerCase().replace(/\s/g, '-')}`}
      />
    </div>
  );
}

export function MobileControlPanel({
  params,
  colormap,
  onParamsChange,
  onColormapChange,
}: MobileControlPanelProps) {
  const [coreOpen, setCoreOpen] = useState(true);
  const [operatorsOpen, setOperatorsOpen] = useState(false);

  return (
    <div className="space-y-4 pb-4">
      <div className="space-y-2">
        <Label className="text-sm">Colormap</Label>
        <Select value={colormap} onValueChange={(v) => onColormapChange(v as "inferno" | "viridis")}>
          <SelectTrigger className="h-12" data-testid="select-colormap-mobile">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="inferno">Inferno</SelectItem>
            <SelectItem value="viridis">Viridis</SelectItem>
          </SelectContent>
        </Select>
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
              />
              <ParameterSlider
                label="Curvature"
                value={params.curvatureGain}
                min={0.1}
                max={10}
                step={0.1}
                onChange={(v) => onParamsChange({ curvatureGain: v })}
              />
              <ParameterSlider
                label="Coupling"
                value={params.couplingWeight}
                min={0}
                max={1}
                step={0.05}
                onChange={(v) => onParamsChange({ couplingWeight: v })}
              />
              <ParameterSlider
                label="Attractor"
                value={params.attractorStrength}
                min={0.1}
                max={10}
                step={0.1}
                onChange={(v) => onParamsChange({ attractorStrength: v })}
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
                label="Curvature (wK)"
                value={params.wK}
                min={0}
                max={5}
                step={0.1}
                onChange={(v) => onParamsChange({ wK: v })}
              />
              <ParameterSlider
                label="Tension (wT)"
                value={params.wT}
                min={0}
                max={5}
                step={0.1}
                onChange={(v) => onParamsChange({ wT: v })}
              />
              <ParameterSlider
                label="Coupling (wC)"
                value={params.wC}
                min={0}
                max={5}
                step={0.1}
                onChange={(v) => onParamsChange({ wC: v })}
              />
              <ParameterSlider
                label="Attractor (wA)"
                value={params.wA}
                min={0}
                max={5}
                step={0.1}
                onChange={(v) => onParamsChange({ wA: v })}
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
