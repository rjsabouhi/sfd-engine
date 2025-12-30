import type { OverlayType } from "@/components/dual-field-view";

export interface SmartViewConfig {
  defaultLayer: OverlayType;
  defaultBlend: number;
  enableBlend: boolean;
}

export const SMART_VIEW_MAP: Record<string, SmartViewConfig> = {
  "uniform-field": {
    defaultLayer: "curvature",
    defaultBlend: 0.4,
    enableBlend: false,
  },
  "high-curvature": {
    defaultLayer: "curvature",
    defaultBlend: 0.5,
    enableBlend: true,
  },
  "multi-basin": {
    defaultLayer: "basins",
    defaultBlend: 0.45,
    enableBlend: true,
  },
  "near-critical": {
    defaultLayer: "criticality",
    defaultBlend: 0.55,
    enableBlend: true,
  },
  "transition-edge": {
    defaultLayer: "tension",
    defaultBlend: 0.5,
    enableBlend: true,
  },
  "entropic-dispersion": {
    defaultLayer: "coupling",
    defaultBlend: 0.5,
    enableBlend: true,
  },
  "post-cooling": {
    defaultLayer: "stabilityField",
    defaultBlend: 0.4,
    enableBlend: false,
  },
  "quasicrystal": {
    defaultLayer: "constraintSkeleton",
    defaultBlend: 0.5,
    enableBlend: true,
  },
  "criticality-cascade": {
    defaultLayer: "criticality",
    defaultBlend: 0.6,
    enableBlend: true,
  },
  "fractal-corridor": {
    defaultLayer: "gradientFlow",
    defaultBlend: 0.55,
    enableBlend: true,
  },
  "cosmic-web": {
    defaultLayer: "constraintSkeleton",
    defaultBlend: 0.65,
    enableBlend: true,
  },
};

export function getSmartViewConfig(presetName: string): SmartViewConfig | undefined {
  return SMART_VIEW_MAP[presetName];
}
