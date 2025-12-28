import { useRef, useEffect, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import type { DerivedField } from "@shared/schema";

interface DualFieldViewProps {
  derivedField: DerivedField | null;
  derivedType: "curvature" | "tension" | "coupling" | "variance";
  onTypeChange: (type: "curvature" | "tension" | "coupling" | "variance") => void;
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

export function DualFieldView({ derivedField, derivedType, onTypeChange }: DualFieldViewProps) {
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
    if (!canvas || !container || !derivedField) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setContainerSize({ width: container.clientWidth, height: container.clientHeight });

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
  }, [derivedField]);

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
      {derivedField ? (
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
          Computing derived field...
        </div>
      )}
      
      <div className="absolute top-2 left-2 right-2 z-10 flex gap-1">
        <Button
          size="sm"
          variant={derivedType === "curvature" ? "default" : "outline"}
          className="flex-1 h-7 text-xs bg-black/60 backdrop-blur-sm border-white/20"
          onClick={() => onTypeChange("curvature")}
          data-testid="button-derived-curvature"
        >
          Curvature
        </Button>
        <Button
          size="sm"
          variant={derivedType === "tension" ? "default" : "outline"}
          className="flex-1 h-7 text-xs bg-black/60 backdrop-blur-sm border-white/20"
          onClick={() => onTypeChange("tension")}
          data-testid="button-derived-tension"
        >
          Tension
        </Button>
        <Button
          size="sm"
          variant={derivedType === "coupling" ? "default" : "outline"}
          className="flex-1 h-7 text-xs bg-black/60 backdrop-blur-sm border-white/20"
          onClick={() => onTypeChange("coupling")}
          data-testid="button-derived-coupling"
        >
          Coupling
        </Button>
        <Button
          size="sm"
          variant={derivedType === "variance" ? "default" : "outline"}
          className="flex-1 h-7 text-xs bg-black/60 backdrop-blur-sm border-white/20"
          onClick={() => onTypeChange("variance")}
          data-testid="button-derived-variance"
        >
          Variance
        </Button>
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
