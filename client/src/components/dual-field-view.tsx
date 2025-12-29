import { useRef, useEffect, useCallback, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { DerivedField, BasinMap } from "@shared/schema";

export type OverlayType = "curvature" | "tension" | "coupling" | "variance" | "basins" | "gradientFlow" | "criticality" | "hysteresis" | "constraintSkeleton" | "stabilityField" | "gradientFlowLines";

interface DualFieldViewProps {
  derivedField: DerivedField | null;
  basinMap: BasinMap | null;
  derivedType: OverlayType;
  onTypeChange: (type: OverlayType) => void;
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

const OVERLAY_OPTIONS: { value: OverlayType; label: string; tooltip: string }[] = [
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

export function DualFieldView({ derivedField, basinMap, derivedType, onTypeChange }: DualFieldViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setContainerSize({ width: container.clientWidth, height: container.clientHeight });

    if (derivedType === "basins") {
      if (!basinMap) return;
      
      canvas.width = basinMap.width;
      canvas.height = basinMap.height;
      
      const imageData = ctx.createImageData(basinMap.width, basinMap.height);
      const data = imageData.data;
      
      for (let i = 0; i < basinMap.labels.length; i++) {
        const basinId = basinMap.labels[i];
        const pixelIdx = i * 4;
        
        if (basinId >= 0) {
          const color = BASIN_COLORS[basinId % BASIN_COLORS.length];
          data[pixelIdx] = color[0];
          data[pixelIdx + 1] = color[1];
          data[pixelIdx + 2] = color[2];
          data[pixelIdx + 3] = 255;
        } else {
          data[pixelIdx] = 30;
          data[pixelIdx + 1] = 30;
          data[pixelIdx + 2] = 30;
          data[pixelIdx + 3] = 255;
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
      return;
    }

    if (!derivedField) return;

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
      const [r, g, b] = interpolateColor(normalized);
      const pixelIdx = i * 4;
      data[pixelIdx] = r;
      data[pixelIdx + 1] = g;
      data[pixelIdx + 2] = b;
      data[pixelIdx + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);
  }, [derivedField, basinMap, derivedType]);

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
    }
  }, [isPanning, panStart, containerSize, zoom]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleDoubleClick = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const currentLabel = OVERLAY_OPTIONS.find(o => o.value === derivedType)?.label || derivedType;
  const zoomPercent = Math.round(zoom * 100);
  const size = Math.min(containerSize.width, containerSize.height);

  const currentOption = OVERLAY_OPTIONS.find(o => o.value === derivedType);

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border shrink-0">
        <div className="min-w-0">
          <h4 className="text-xs font-medium">Projection View</h4>
          <p className="text-[10px] text-muted-foreground truncate">{currentOption?.tooltip || "Select a projection mode"}</p>
        </div>
        <Select value={derivedType} onValueChange={(v) => onTypeChange(v as OverlayType)}>
          <SelectTrigger 
            className="h-7 w-32 text-xs focus:ring-0 focus:ring-offset-0"
            data-testid="select-overlay-type"
          >
            <span>Layers</span>
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
      
      <div 
        ref={containerRef}
        className="relative flex-1 flex items-center justify-center overflow-hidden bg-gray-950"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onDoubleClick={handleDoubleClick}
        style={{ cursor: zoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'crosshair' }}
      >
        {(derivedField || (derivedType === "basins" && basinMap)) ? (
          <canvas
            ref={canvasRef}
            className="rounded-sm"
            style={{ 
              imageRendering: zoom > 2 ? "pixelated" : "auto",
              width: `${size || '100%'}px`,
              height: `${size || '100%'}px`,
              maxWidth: '100%',
              maxHeight: '100%',
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
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
    </div>
  );
}
