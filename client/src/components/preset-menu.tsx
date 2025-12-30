import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  "quasicrystal": "Quasi-Crystal Mode",
  "criticality-cascade": "Criticality Cascade (SP\u2081)",
  "fractal-corridor": "Fractal Corridor (SP\u2082)",
  "cosmic-web": "Cosmic Web Analog (SP\u2083)",
};

export function PresetMenu({ onApply }: PresetMenuProps) {
  const handleChange = (value: string) => {
    if (value && structuralPresets[value]) {
      onApply(structuralPresets[value]);
    }
  };

  return (
    <div className="space-y-2">
      <Select onValueChange={handleChange}>
        <SelectTrigger className="h-8 focus:ring-0 focus:ring-offset-0" data-testid="select-preset">
          <SelectValue placeholder="Select a dynamic regime..." />
        </SelectTrigger>
        <SelectContent>
          {Object.keys(structuralPresets).map((key) => (
            <SelectItem key={key} value={key}>
              {presetLabels[key] || key}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground leading-relaxed">Select a pre-configured SFD operator regime to explore characteristic system behaviors.</p>
    </div>
  );
}
