import { useRef, useEffect, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import type { DerivedField, BasinMap } from "@shared/schema";

interface DualFieldViewProps {
  derivedField: DerivedField | null;
  basinMap: BasinMap | null;
  derivedType: "curvature" | "tension" | "coupling" | "variance" | "basins" | "gradientFlow" | "criticality" | "hysteresis";
  onTypeChange: (type: "curvature" | "tension" | "coupling" | "variance" | "basins" | "gradientFlow" | "criticality" | "hysteresis") => void;
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
  [59, 130, 246],   // Blue
  [34, 197, 94],    // Green
  [249, 115, 22],   // Orange
  [168, 85, 247],   // Purple
  [236, 72, 153],   // Pink
  [20, 184, 166],   // Teal
  [245, 158, 11],   // Amber
  [99, 102, 241],   // Indigo
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

    // Handle basins view separately
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

    // Handle derived field views
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

  const typeLabels: Record<string, string> = {
    curvature: "Curvature Heatmap",
    tension: "Tension Gradient Map",
    coupling: "Coupling Flow",
    variance: "Local Variance Map",
    basins: "Basin Map",
    gradientFlow: "Gradient Flow Map",
    criticality: "Criticality Map",
    hysteresis: "Hysteresis (Memory)",
  };

  const zoomPercent = Math.round(zoom * 100);
  const size = Math.min(containerSize.width, containerSize.height);

  return (
    <div 
      ref={containerRef}
      className="relative h-full bg-gray-950 flex items-center justify-center overflow-hidden"
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
          className="rounded-md"
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
        <div className="text-muted-foreground text-sm">
          {derivedType === "basins" ? "Computing basin map..." : "Computing derived field..."}
        </div>
      )}
      
      <div className="absolute top-2 left-2 right-2 z-10 flex flex-col gap-1">
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={derivedType === "curvature" ? "default" : "outline"}
            className="flex-1 h-6 text-xs bg-black/60 backdrop-blur-sm border-white/20"
            onClick={() => onTypeChange("curvature")}
            data-testid="button-derived-curvature"
          >
            Curv
          </Button>
          <Button
            size="sm"
            variant={derivedType === "tension" ? "default" : "outline"}
            className="flex-1 h-6 text-xs bg-black/60 backdrop-blur-sm border-white/20"
            onClick={() => onTypeChange("tension")}
            data-testid="button-derived-tension"
          >
            Tens
          </Button>
          <Button
            size="sm"
            variant={derivedType === "coupling" ? "default" : "outline"}
            className="flex-1 h-6 text-xs bg-black/60 backdrop-blur-sm border-white/20"
            onClick={() => onTypeChange("coupling")}
            data-testid="button-derived-coupling"
          >
            Coup
          </Button>
          <Button
            size="sm"
            variant={derivedType === "variance" ? "default" : "outline"}
            className="flex-1 h-6 text-xs bg-black/60 backdrop-blur-sm border-white/20"
            onClick={() => onTypeChange("variance")}
            data-testid="button-derived-variance"
          >
            Var
          </Button>
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={derivedType === "basins" ? "default" : "outline"}
            className="flex-1 h-6 text-xs bg-black/60 backdrop-blur-sm border-white/20"
            onClick={() => onTypeChange("basins")}
            data-testid="button-derived-basins"
          >
            Basin
          </Button>
          <Button
            size="sm"
            variant={derivedType === "gradientFlow" ? "default" : "outline"}
            className="flex-1 h-6 text-xs bg-black/60 backdrop-blur-sm border-white/20"
            onClick={() => onTypeChange("gradientFlow")}
            data-testid="button-derived-gradientflow"
          >
            Flow
          </Button>
          <Button
            size="sm"
            variant={derivedType === "criticality" ? "default" : "outline"}
            className="flex-1 h-6 text-xs bg-black/60 backdrop-blur-sm border-white/20"
            onClick={() => onTypeChange("criticality")}
            data-testid="button-derived-criticality"
          >
            Crit
          </Button>
          <Button
            size="sm"
            variant={derivedType === "hysteresis" ? "default" : "outline"}
            className="flex-1 h-6 text-xs bg-black/60 backdrop-blur-sm border-white/20"
            onClick={() => onTypeChange("hysteresis")}
            data-testid="button-derived-hysteresis"
          >
            Mem
          </Button>
        </div>
      </div>
      
      <div className="absolute bottom-2 left-0 right-0 text-center z-10">
        <span className="text-xs text-white/70 bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded">
          {typeLabels[derivedType]}
          {zoom > 1 && ` | ${zoomPercent}%`}
        </span>
      </div>
    </div>
  );
}
