import { useRef, useEffect, useCallback, useState, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ProjectionViewFooter } from "@/components/field-footer";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Blend } from "lucide-react";
import type { DerivedField, BasinMap, ProbeData } from "@shared/schema";

export type OverlayType = "curvature" | "tension" | "coupling" | "variance" | "basins" | "gradientFlow" | "criticality" | "hysteresis" | "constraintSkeleton" | "stabilityField" | "gradientFlowLines";

interface DualFieldViewProps {
  derivedField: DerivedField | null;
  basinMap: BasinMap | null;
  derivedType: OverlayType;
  onTypeChange: (type: OverlayType) => void;
  probeData?: ProbeData | null;
  primaryField?: { grid: Float32Array; width: number; height: number } | null;
  primaryColormap?: "inferno" | "viridis" | "cividis";
  blendMode?: boolean;
  blendOpacity?: number;
  onBlendModeChange?: (enabled: boolean) => void;
  onBlendOpacityChange?: (opacity: number) => void;
  compact?: boolean;
}

const PLASMA_COLORS = [
  [13, 8, 135],
  [75, 3, 161],
  [126, 3, 168],
  [168, 34, 150],
  [203, 70, 121],
  [229, 107, 93],
  [248, 148, 65],
  [253, 195, 40],
  [240, 249, 33],
];

function interpolateColor(t: number): [number, number, number] {
  t = Math.max(0, Math.min(1, t));
  const idx = t * (PLASMA_COLORS.length - 1);
  const i = Math.floor(idx);
  const f = idx - i;
  
  if (i >= PLASMA_COLORS.length - 1) {
    return PLASMA_COLORS[PLASMA_COLORS.length - 1] as [number, number, number];
  }
  
  const c1 = PLASMA_COLORS[i];
  const c2 = PLASMA_COLORS[i + 1];
  
  return [
    Math.round(c1[0] + f * (c2[0] - c1[0])),
    Math.round(c1[1] + f * (c2[1] - c1[1])),
    Math.round(c1[2] + f * (c2[2] - c1[2])),
  ];
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 10;

const BASIN_COLORS: [number, number, number][] = [
  [59, 130, 246],
  [34, 197, 94],
  [249, 115, 22],
  [168, 85, 247],
  [236, 72, 153],
  [20, 184, 166],
  [245, 158, 11],
  [99, 102, 241],
];

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

// Colormaps for primary field blending
const INFERNO_COLORS = [
  [0, 0, 4], [40, 11, 84], [101, 21, 110], [159, 42, 99],
  [212, 72, 66], [245, 125, 21], [250, 193, 39], [252, 255, 164]
];
const VIRIDIS_COLORS = [
  [68, 1, 84], [72, 40, 120], [62, 73, 137], [49, 104, 142],
  [38, 130, 142], [31, 158, 137], [53, 183, 121], [109, 205, 89],
  [180, 222, 44], [253, 231, 37]
];
const CIVIDIS_COLORS = [
  [0, 32, 77], [0, 65, 118], [52, 95, 127], [100, 122, 134],
  [145, 148, 139], [188, 175, 127], [228, 203, 99], [253, 232, 69]
];

function interpolatePrimaryColor(t: number, colormap: "inferno" | "viridis" | "cividis"): [number, number, number] {
  const colors = colormap === "inferno" ? INFERNO_COLORS : colormap === "viridis" ? VIRIDIS_COLORS : CIVIDIS_COLORS;
  const n = colors.length - 1;
  const idx = Math.min(Math.floor(t * n), n - 1);
  const frac = t * n - idx;
  const c0 = colors[idx];
  const c1 = colors[idx + 1];
  return [
    Math.round(c0[0] + frac * (c1[0] - c0[0])),
    Math.round(c0[1] + frac * (c1[1] - c0[1])),
    Math.round(c0[2] + frac * (c1[2] - c0[2])),
  ];
}

export function DualFieldView({ 
  derivedField, 
  basinMap, 
  derivedType, 
  onTypeChange, 
  probeData,
  primaryField,
  primaryColormap = "viridis",
  blendMode = false,
  blendOpacity = 0.5,
  onBlendModeChange,
  onBlendOpacityChange,
  compact = false,
}: DualFieldViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [derivedValue, setDerivedValue] = useState<number | null>(null);
  const [hasUserSelectedOverlay, setHasUserSelectedOverlay] = useState(false);

  // Helper to get primary field color - only created when blendMode is active
  // This prevents colormap changes from triggering re-renders when blend is off
  const blendColorHelper = useMemo(() => {
    if (!blendMode) return null;
    return (value: number, minVal: number, range: number): [number, number, number] => {
      const normalized = Math.max(0, Math.min(1, (value - minVal) / range));
      return interpolatePrimaryColor(normalized, primaryColormap);
    };
  }, [blendMode, primaryColormap]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setContainerSize({ width: container.clientWidth, height: container.clientHeight });

    // Clear canvas before any early returns to prevent stale content
    const clearCanvas = () => {
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    // Helper to blend two colors
    const blendColors = (
      primary: [number, number, number], 
      overlay: [number, number, number], 
      opacity: number
    ): [number, number, number] => {
      return [
        Math.round(primary[0] * (1 - opacity) + overlay[0] * opacity),
        Math.round(primary[1] * (1 - opacity) + overlay[1] * opacity),
        Math.round(primary[2] * (1 - opacity) + overlay[2] * opacity),
      ];
    };

    // Get primary field min/max for blending
    let primaryMinVal = 0, primaryMaxVal = 1, primaryRange = 1;
    if (blendColorHelper && primaryField) {
      primaryMinVal = Infinity;
      primaryMaxVal = -Infinity;
      for (let i = 0; i < primaryField.grid.length; i++) {
        const v = primaryField.grid[i];
        if (v < primaryMinVal) primaryMinVal = v;
        if (v > primaryMaxVal) primaryMaxVal = v;
      }
      primaryRange = primaryMaxVal - primaryMinVal || 1;
    }

    if (derivedType === "basins") {
      if (!basinMap) {
        clearCanvas();
        return;
      }
      
      canvas.width = basinMap.width;
      canvas.height = basinMap.height;
      
      const imageData = ctx.createImageData(basinMap.width, basinMap.height);
      const data = imageData.data;
      
      for (let i = 0; i < basinMap.labels.length; i++) {
        const basinId = basinMap.labels[i];
        const pixelIdx = i * 4;
        
        let overlayColor: [number, number, number];
        if (basinId >= 0) {
          const color = BASIN_COLORS[basinId % BASIN_COLORS.length];
          overlayColor = [color[0], color[1], color[2]];
        } else {
          overlayColor = [30, 30, 30];
        }

        // Apply blending with primary field if enabled
        if (blendColorHelper && primaryField && i < primaryField.grid.length) {
          const primaryColor = blendColorHelper(primaryField.grid[i], primaryMinVal, primaryRange);
          const blended = blendColors(primaryColor, overlayColor, blendOpacity);
          data[pixelIdx] = blended[0];
          data[pixelIdx + 1] = blended[1];
          data[pixelIdx + 2] = blended[2];
        } else {
          data[pixelIdx] = overlayColor[0];
          data[pixelIdx + 1] = overlayColor[1];
          data[pixelIdx + 2] = overlayColor[2];
        }
        data[pixelIdx + 3] = 255;
      }
      
      ctx.putImageData(imageData, 0, 0);
      return;
    }

    if (!derivedField) {
      clearCanvas();
      return;
    }

    canvas.width = derivedField.width;
    canvas.height = derivedField.height;

    const imageData = ctx.createImageData(derivedField.width, derivedField.height);
    const data = imageData.data;

    let minVal = Infinity, maxVal = -Infinity;
    for (let i = 0; i < derivedField.grid.length; i++) {
      const v = derivedField.grid[i];
      if (v < minVal) minVal = v;
      if (v > maxVal) maxVal = v;
    }
    const range = maxVal - minVal || 1;

    for (let i = 0; i < derivedField.grid.length; i++) {
      const value = derivedField.grid[i];
      const normalized = (value - minVal) / range;
      const overlayColor = interpolateColor(normalized);
      const pixelIdx = i * 4;

      // Apply blending with primary field if enabled
      if (blendColorHelper && primaryField && i < primaryField.grid.length) {
        const primaryColor = blendColorHelper(primaryField.grid[i], primaryMinVal, primaryRange);
        const blended = blendColors(primaryColor, overlayColor, blendOpacity);
        data[pixelIdx] = blended[0];
        data[pixelIdx + 1] = blended[1];
        data[pixelIdx + 2] = blended[2];
      } else {
        data[pixelIdx] = overlayColor[0];
        data[pixelIdx + 1] = overlayColor[1];
        data[pixelIdx + 2] = overlayColor[2];
      }
      data[pixelIdx + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);
  }, [derivedField, basinMap, derivedType, blendOpacity, primaryField, blendColorHelper]);

  useEffect(() => {
    render();
  }, [render]);

  useEffect(() => {
    const handleResize = () => render();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [render]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    const container = containerRef.current;
    if (!container || !derivedField) return;
    
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - rect.width / 2;
    const mouseY = e.clientY - rect.top - rect.height / 2;
    
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * zoomFactor));
    
    if (newZoom !== zoom) {
      const scale = newZoom / zoom;
      const newPanX = mouseX - scale * (mouseX - pan.x);
      const newPanY = mouseY - scale * (mouseY - pan.y);
      
      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
    }
  }, [zoom, pan, derivedField]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (zoom > 1 && e.button === 0) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [zoom, pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isPanning) {
      const newPanX = e.clientX - panStart.x;
      const newPanY = e.clientY - panStart.y;
      
      const size = Math.min(containerSize.width, containerSize.height);
      const maxPan = (size * (zoom - 1)) / 2;
      setPan({
        x: Math.max(-maxPan, Math.min(maxPan, newPanX)),
        y: Math.max(-maxPan, Math.min(maxPan, newPanY)),
      });
    } else {
      const canvas = canvasRef.current;
      const field = derivedType === "basins" ? basinMap : derivedField;
      if (!canvas || !field) return;
      
      const rect = canvas.getBoundingClientRect();
      const scaleX = field.width / rect.width;
      const scaleY = field.height / rect.height;
      
      const x = Math.floor((e.clientX - rect.left) * scaleX);
      const y = Math.floor((e.clientY - rect.top) * scaleY);
      
      if (x >= 0 && x < field.width && y >= 0 && y < field.height) {
        setHoverPos({ x, y });
        if (derivedField) {
          const idx = y * derivedField.width + x;
          setDerivedValue(derivedField.grid[idx] ?? null);
        }
      }
    }
  }, [isPanning, panStart, containerSize, zoom, derivedField, basinMap, derivedType]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsPanning(false);
    setHoverPos(null);
    setDerivedValue(null);
  }, []);

  const handleDoubleClick = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const currentLabel = OVERLAY_OPTIONS.find(o => o.value === derivedType)?.label || derivedType;
  const zoomPercent = Math.round(zoom * 100);
  const size = Math.min(containerSize.width, containerSize.height);
  const visualScale = 0.88;
  const visualSize = size * visualScale;

  const currentOption = OVERLAY_OPTIONS.find(o => o.value === derivedType);
  const displayLabel = hasUserSelectedOverlay ? (currentOption?.label || "Layers") : "Layers";

  const handleOverlayChange = (value: string) => {
    setHasUserSelectedOverlay(true);
    onTypeChange(value as OverlayType);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {!compact && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border shrink-0">
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-medium">Projection View</h4>
            <p className="text-[10px] text-muted-foreground truncate">{currentOption?.tooltip || "Select a projection mode"}</p>
          </div>
          
          {/* Blend Controls */}
          {onBlendModeChange && (
            <div className="flex items-center gap-2 mr-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onBlendModeChange(!blendMode)}
                data-testid="button-blend-mode"
                className={`h-6 text-[10px] gap-1 ${blendMode ? "bg-muted" : ""}`}
              >
                <Blend className="h-3 w-3" />
                Blend
              </Button>
              {blendMode && onBlendOpacityChange && (
                <div className="flex items-center gap-1.5 w-20">
                  <Slider
                    value={[blendOpacity]}
                    onValueChange={([v]) => onBlendOpacityChange(v)}
                    min={0}
                    max={1}
                    step={0.05}
                    className="w-full"
                    data-testid="slider-blend-opacity"
                  />
                  <span className="text-[9px] text-muted-foreground w-6">{Math.round(blendOpacity * 100)}%</span>
                </div>
              )}
            </div>
          )}
          
          <Select value={derivedType} onValueChange={handleOverlayChange}>
            <SelectTrigger 
              className="h-7 w-32 text-xs focus:ring-0 focus:ring-offset-0"
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
      
      <div 
        ref={containerRef}
        className="relative flex-1 min-h-0 flex items-center justify-center overflow-hidden"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onDoubleClick={handleDoubleClick}
        style={{ 
          cursor: zoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'crosshair',
          backgroundColor: 'rgb(8, 10, 14)',
        }}
      >
        {/* Spatial Reference Grid Background */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(rgba(70,90,130,0.25) 1px, transparent 1px),
              linear-gradient(90deg, rgba(70,90,130,0.25) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
            backgroundPosition: 'center center',
          }}
        />
        
        {/* Grid Origin Crosshair */}
        <div 
          className="absolute pointer-events-none"
          style={{
            width: '100%',
            height: '1px',
            background: 'linear-gradient(90deg, transparent 0%, rgba(80,100,140,0.4) 30%, rgba(80,100,140,0.6) 50%, rgba(80,100,140,0.4) 70%, transparent 100%)',
            top: '50%',
          }}
        />
        <div 
          className="absolute pointer-events-none"
          style={{
            width: '1px',
            height: '100%',
            background: 'linear-gradient(180deg, transparent 0%, rgba(80,100,140,0.4) 30%, rgba(80,100,140,0.6) 50%, rgba(80,100,140,0.4) 70%, transparent 100%)',
            left: '50%',
          }}
        />

        {(derivedField || (derivedType === "basins" && basinMap)) ? (
          <canvas
            ref={canvasRef}
            className="rounded-md relative"
            style={{ 
              imageRendering: zoom > 2 ? "pixelated" : "auto",
              width: `${visualSize || '100%'}px`,
              height: `${visualSize || '100%'}px`,
              maxWidth: '100%',
              maxHeight: '100%',
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
              boxShadow: '0 4px 24px rgba(0,0,0,0.6), 0 0 1px rgba(255,255,255,0.1)',
            }}
            data-testid="canvas-derived-field"
          />
        ) : (
          <div className="text-zinc-500 text-sm">
            {derivedType === "basins" ? "Computing basin map..." : "Computing derived field..."}
          </div>
        )}
        
        {zoom > 1 && (
          <div className="absolute bottom-2 right-2 text-[10px] text-zinc-500 bg-black/50 px-1.5 py-0.5 rounded">
            {zoomPercent}%
          </div>
        )}
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
