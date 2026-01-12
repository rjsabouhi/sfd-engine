import { useState, useCallback } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ProjectionViewFooter } from "@/components/field-footer";
import { Slider } from "@/components/ui/slider";
import { VisualizationCanvas } from "@/components/visualization-canvas";
import type { DerivedField, BasinMap, ProbeData, FieldData } from "@shared/schema";

export type OverlayType = "curvature" | "tension" | "coupling" | "variance" | "basins" | "gradientFlow" | "criticality" | "hysteresis" | "constraintSkeleton" | "stabilityField" | "gradientFlowLines";

interface DualFieldViewProps {
  derivedField: DerivedField | null;
  basinMap: BasinMap | null;
  derivedType: OverlayType;
  onTypeChange: (type: OverlayType) => void;
  probeData?: ProbeData | null;
  primaryField?: FieldData | null;
  primaryColormap?: "inferno" | "viridis" | "cividis";
  blendMode?: boolean;
  blendOpacity?: number;
  onBlendModeChange?: (enabled: boolean) => void;
  onBlendOpacityChange?: (opacity: number) => void;
  compact?: boolean;
}

export const OVERLAY_OPTIONS: { value: OverlayType; label: string; tooltip: string }[] = [
  { value: "curvature", label: "Curvature", tooltip: "Local bending intensity of field geometry" },
  { value: "tension", label: "Tension", tooltip: "Field gradient magnitude / stored potential energy" },
  { value: "coupling", label: "Coupling", tooltip: "Interaction strength between neighboring field cells" },
  { value: "variance", label: "Variance", tooltip: "Local instability; degree of disorder" },
  { value: "basins", label: "Basins", tooltip: "Attractor basin segmentation based on local minima" },
  { value: "gradientFlow", label: "Gradient Flow", tooltip: "Directional gradient magnitude across the field" },
  { value: "gradientFlowLines", label: "Flow Lines", tooltip: "Directional propagation paths through the field" },
  { value: "criticality", label: "Criticality", tooltip: "Regions near phase transition thresholds" },
  { value: "hysteresis", label: "Memory", tooltip: "Historical state influence on current dynamics" },
  { value: "constraintSkeleton", label: "Constraint Skeleton", tooltip: "Structural boundaries constraining field evolution" },
  { value: "stabilityField", label: "Stability Field", tooltip: "Local stability measure across the manifold" },
];

export function DualFieldView({ 
  derivedField, 
  basinMap, 
  derivedType, 
  onTypeChange, 
  probeData,
  primaryField,
  primaryColormap = "viridis",
  blendOpacity = 0.5,
  onBlendOpacityChange,
  compact = false,
}: DualFieldViewProps) {
  const [hasUserSelectedOverlay, setHasUserSelectedOverlay] = useState(false);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [derivedValue, setDerivedValue] = useState<number | null>(null);

  const handleOverlayChange = useCallback((value: string) => {
    setHasUserSelectedOverlay(true);
    onTypeChange(value as OverlayType);
  }, [onTypeChange]);

  const displayLabel = hasUserSelectedOverlay 
    ? OVERLAY_OPTIONS.find(o => o.value === derivedType)?.label || derivedType
    : "Constraint Layer";

  const handleHover = useCallback((x: number, y: number) => {
    setHoverPos({ x, y });
    if (derivedType === "basins" && basinMap) {
      const idx = y * basinMap.width + x;
      if (idx >= 0 && idx < basinMap.labels.length) {
        setDerivedValue(basinMap.labels[idx]);
      }
    } else if (derivedField) {
      const idx = y * derivedField.width + x;
      if (idx >= 0 && idx < derivedField.grid.length) {
        setDerivedValue(derivedField.grid[idx]);
      }
    }
  }, [derivedType, basinMap, derivedField]);

  const handleHoverEnd = useCallback(() => {
    setHoverPos(null);
    setDerivedValue(null);
  }, []);

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden" data-testid="dual-field-view">
      {!compact && (
        <div className="flex-shrink-0 flex items-center justify-between px-3 py-2 border-b border-border/50 bg-card/30">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Blend</span>
            <Slider
              value={[blendOpacity]}
              onValueChange={([v]) => onBlendOpacityChange?.(v)}
              min={0}
              max={1}
              step={0.05}
              className="w-20"
              data-testid="slider-blend-opacity"
            />
            <span className="text-[10px] text-muted-foreground w-8">{Math.round(blendOpacity * 100)}%</span>
          </div>
          
          <Select value={derivedType} onValueChange={handleOverlayChange}>
            <SelectTrigger 
              className="h-7 w-36 text-xs focus:ring-0 focus:ring-offset-0"
              data-testid="select-overlay-type"
            >
              <span>{displayLabel}</span>
            </SelectTrigger>
            <SelectContent>
              {OVERLAY_OPTIONS.map((option) => (
                <Tooltip key={option.value}>
                  <TooltipTrigger asChild>
                    <SelectItem 
                      value={option.value}
                      className="text-xs"
                      data-testid={`select-overlay-${option.value}`}
                    >
                      {option.label}
                    </SelectItem>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-[200px] text-xs">
                    {option.tooltip}
                  </TooltipContent>
                </Tooltip>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {compact && (
        <div className="flex-shrink-0 flex items-center justify-between px-2 py-1.5 border-b border-border/50 bg-card/30">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground">Blend</span>
            <Slider
              value={[blendOpacity]}
              onValueChange={([v]) => onBlendOpacityChange?.(v)}
              min={0}
              max={1}
              step={0.05}
              className="w-16"
              data-testid="slider-blend-opacity"
            />
            <span className="text-[9px] text-muted-foreground w-6">{Math.round(blendOpacity * 100)}%</span>
          </div>
          
          <Select value={derivedType} onValueChange={handleOverlayChange}>
            <SelectTrigger 
              className="h-6 w-28 text-[10px] focus:ring-0 focus:ring-offset-0"
              data-testid="select-overlay-type"
            >
              <span>{displayLabel}</span>
            </SelectTrigger>
            <SelectContent>
              {OVERLAY_OPTIONS.map((option) => (
                <Tooltip key={option.value}>
                  <TooltipTrigger asChild>
                    <SelectItem 
                      value={option.value}
                      className="text-xs"
                      data-testid={`select-overlay-${option.value}`}
                    >
                      {option.label}
                    </SelectItem>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-[200px] text-xs">
                    {option.tooltip}
                  </TooltipContent>
                </Tooltip>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      
      <div className="relative flex-1 min-h-0 flex items-center justify-center overflow-hidden">
        <VisualizationCanvas
          field={primaryField || null}
          colormap={primaryColormap}
          onHover={handleHover}
          onHoverEnd={handleHoverEnd}
          overlayDerivedField={derivedType !== "basins" ? derivedField : null}
          overlayBasinMap={derivedType === "basins" ? basinMap : null}
          overlayOpacity={blendOpacity}
        />
      </div>
      
      <ProjectionViewFooter
        layerType={derivedType}
        probeData={probeData || null}
        derivedValue={derivedValue}
        basinMap={basinMap}
        isHovering={hoverPos !== null}
        x={hoverPos?.x ?? 0}
        y={hoverPos?.y ?? 0}
      />
    </div>
  );
}
