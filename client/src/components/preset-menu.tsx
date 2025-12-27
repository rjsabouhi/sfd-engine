import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { structuralPresets, type SimulationParameters } from "@shared/schema";

interface PresetMenuProps {
  onApply: (params: Partial<SimulationParameters>) => void;
}

const presetLabels: Record<string, string> = {
  "high-curvature": "High Curvature Regime",
  "tension-dominant": "Tension Dominant",
  "weak-coupling": "Weak Coupling / Basin Explosion",
  "meta-stability": "Meta-Stability Plateau",
  "constraint-collapse": "Constraint Collapse Demo",
};

export function PresetMenu({ onApply }: PresetMenuProps) {
  const handleChange = (value: string) => {
    if (value && structuralPresets[value]) {
      onApply(structuralPresets[value]);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Label className="text-sm">Dynamic Regimes</Label>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-3 w-3 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-[200px]">
            <p className="text-xs">Select a pre-configured SFD operator regime to explore characteristic system behaviors.</p>
          </TooltipContent>
        </Tooltip>
      </div>
      <Select onValueChange={handleChange}>
        <SelectTrigger data-testid="select-preset">
          <SelectValue placeholder="Select a regime..." />
        </SelectTrigger>
        <SelectContent>
          {Object.keys(structuralPresets).map((key) => (
            <SelectItem key={key} value={key}>
              {presetLabels[key] || key}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
