import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { structuralPresets, type SimulationParameters } from "@shared/schema";
import { clearTemporalBuffer } from "./visualization-canvas";

interface PresetMenuProps {
  onApply: (params: Partial<SimulationParameters>) => void;
}

interface PresetInfo {
  label: string;
  tooltip?: string;
  group: "standard" | "special" | "morphogenesis";
}

const presetInfo: Record<string, PresetInfo> = {
  // Standard Structural Presets
  "uniform-field": { label: "Uniform Field", group: "standard" },
  "high-curvature": { label: "High-Curvature Regime", group: "standard" },
  "multi-basin": { label: "Multi-Basin System", group: "standard" },
  "near-critical": { label: "Near-Critical State", group: "standard" },
  "transition-edge": { label: "Transition Edge", group: "standard" },
  "entropic-dispersion": { label: "Entropic Dispersion Phase", group: "standard" },
  "post-cooling": { label: "Post-Cooling Phase", group: "standard" },
  "quasicrystal": { label: "Quasi-Crystal Mode", group: "standard" },
  
  // Special Presets (SP₁-SP₄)
  "criticality-cascade": { label: "Criticality Cascade (SP₁)", group: "special" },
  "fractal-corridor": { label: "Fractal Corridor (SP₂)", group: "special" },
  "soliton-entity": { label: "Soliton Entity (SP₃)", group: "special" },
  "cosmic-web": { label: "Cosmic Web Analog (SP₄)", group: "special" },
  
  // Morphogenesis-Class Presets (MG-1 through MG-4)
  "mg-ghost-pattern": { 
    label: "Morphogenetic Ghost Pattern (MG-1)", 
    tooltip: "Spontaneous domain differentiation and wave boundary formation.",
    group: "morphogenesis" 
  },
  "mg-filament-network": { 
    label: "Filament Network Formation (MG-2)", 
    tooltip: "High-tension filaments forming branching networks.",
    group: "morphogenesis" 
  },
  "mg-spiral-emergence": { 
    label: "Rotational Emergence Spiral (MG-3)", 
    tooltip: "Rotational symmetry breaking and spiral emergence.",
    group: "morphogenesis" 
  },
  "mg-patch-formation": { 
    label: "Multi-Domain Patch Formation (MG-4)", 
    tooltip: "Tri-phase competitive differentiation of domains.",
    group: "morphogenesis" 
  },
};

export function PresetMenu({ onApply }: PresetMenuProps) {
  const handleChange = (value: string) => {
    if (value && structuralPresets[value]) {
      clearTemporalBuffer();
      onApply(structuralPresets[value]);
    }
  };

  const standardPresets = Object.keys(structuralPresets).filter(k => presetInfo[k]?.group === "standard");
  const specialPresets = Object.keys(structuralPresets).filter(k => presetInfo[k]?.group === "special");
  const mgPresets = Object.keys(structuralPresets).filter(k => presetInfo[k]?.group === "morphogenesis");

  const renderPresetItem = (key: string) => {
    const info = presetInfo[key];
    if (!info) return null;
    
    if (info.tooltip) {
      return (
        <Tooltip key={key}>
          <TooltipTrigger asChild>
            <SelectItem value={key} data-testid={`preset-${key}`}>
              {info.label}
            </SelectItem>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-xs">
            <p className="text-xs">{info.tooltip}</p>
          </TooltipContent>
        </Tooltip>
      );
    }
    
    return (
      <SelectItem key={key} value={key} data-testid={`preset-${key}`}>
        {info.label}
      </SelectItem>
    );
  };

  return (
    <div className="space-y-2">
      <Select onValueChange={handleChange}>
        <SelectTrigger className="h-8 focus:ring-0 focus:ring-offset-0" data-testid="select-preset">
          <SelectValue placeholder="Select a dynamic regime..." />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel className="text-xs text-muted-foreground">Standard Regimes</SelectLabel>
            {standardPresets.map(renderPresetItem)}
          </SelectGroup>
          
          <SelectGroup>
            <SelectLabel className="text-xs text-muted-foreground">Special Presets (SP)</SelectLabel>
            {specialPresets.map(renderPresetItem)}
          </SelectGroup>
          
          <SelectGroup>
            <SelectLabel className="text-xs text-muted-foreground">Morphogenesis-Class (MG)</SelectLabel>
            {mgPresets.map(renderPresetItem)}
          </SelectGroup>
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground leading-relaxed">Select a pre-configured SFD operator regime to explore characteristic system behaviors.</p>
    </div>
  );
}
