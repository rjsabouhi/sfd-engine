import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { structuralPresets, type SimulationParameters } from "@shared/schema";

interface PresetMenuProps {
  onApply: (params: Partial<SimulationParameters>) => void;
}

const presetLabels: Record<string, string> = {
  "uniform-field": "Uniform Field",
  "high-curvature": "High-Curvature Regime",
  "multi-basin": "Multi-Basin System",
  "near-critical": "Near-Critical State",
  "transition-edge": "Transition Edge",
  "entropic-dispersion": "Entropic Dispersion Phase",
  "post-cooling": "Post-Cooling Phase",
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
        <h4 className="text-xs font-medium">Dynamic Regimes</h4>
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
        <SelectTrigger className="focus:ring-0 focus:ring-offset-0" data-testid="select-preset">
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
