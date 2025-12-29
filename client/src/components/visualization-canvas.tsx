import { useRef, useEffect, useCallback, useState } from "react";
import type { FieldData, BasinMap } from "@shared/schema";

interface VisualizationCanvasProps {
  field: FieldData | null;
  colormap?: "inferno" | "viridis" | "cividis";
  basinMap?: BasinMap | null;
  showBasins?: boolean;
  onHover?: (x: number, y: number, screenX: number, screenY: number) => void;
  onHoverEnd?: () => void;
}

const INFERNO_COLORS = [
  [0, 0, 4],
  [40, 11, 84],
  [101, 21, 110],
  [159, 42, 99],
  [212, 72, 66],
  [245, 125, 21],
  [250, 193, 39],
  [252, 255, 164],
];

const VIRIDIS_COLORS = [
  [68, 1, 84],
  [72, 40, 120],
  [62, 73, 137],
  [49, 104, 142],
  [38, 130, 142],
  [31, 158, 137],
  [53, 183, 121],
  [109, 205, 89],
  [180, 222, 44],
  [253, 231, 37],
];

// Cividis - colorblind-friendly palette (optimized for deuteranopia/protanopia)
const CIVIDIS_COLORS = [
  [0, 32, 77],
  [0, 67, 106],
  [54, 92, 108],
  [94, 114, 110],
  [131, 135, 114],
  [168, 157, 117],
  [207, 181, 118],
  [244, 210, 118],
  [253, 234, 118],
];

const BASIN_COLORS = [
  [255, 99, 132],
  [54, 162, 235],
  [255, 206, 86],
  [75, 192, 192],
  [153, 102, 255],
  [255, 159, 64],
  [199, 199, 199],
  [83, 102, 255],
  [255, 99, 255],
  [99, 255, 132],
];

function interpolateColor(t: number, colormap: typeof INFERNO_COLORS): [number, number, number] {
  t = Math.max(0, Math.min(1, t));
  const idx = t * (colormap.length - 1);
  const i = Math.floor(idx);
  const f = idx - i;
  
  if (i >= colormap.length - 1) {
    return colormap[colormap.length - 1] as [number, number, number];
  }
  
  const c1 = colormap[i];
  const c2 = colormap[i + 1];
  
  return [
    Math.round(c1[0] + f * (c2[0] - c1[0])),
    Math.round(c1[1] + f * (c2[1] - c1[1])),
    Math.round(c1[2] + f * (c2[2] - c1[2])),
  ];
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 10;

export function VisualizationCanvas({ 
  field, 
  colormap = "inferno", 
  basinMap,
  showBasins = false,
  onHover,
  onHoverEnd,
}: VisualizationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [canvasSize, setCanvasSize] = useState(0);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !field) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const size = Math.min(containerWidth, containerHeight);
    setCanvasSize(size);
    
    canvas.width = field.width;
    canvas.height = field.height;

    const imageData = ctx.createImageData(field.width, field.height);
    const data = imageData.data;
    const colors = colormap === "cividis" ? CIVIDIS_COLORS : colormap === "inferno" ? INFERNO_COLORS : VIRIDIS_COLORS;

    let minVal = Infinity, maxVal = -Infinity;
    for (let i = 0; i < field.grid.length; i++) {
      const v = field.grid[i];
      if (isFinite(v)) {
        if (v < minVal) minVal = v;
        if (v > maxVal) maxVal = v;
      }
    }
    if (!isFinite(minVal) || !isFinite(maxVal)) {
      minVal = -1;
      maxVal = 1;
    }
    const range = maxVal - minVal || 1;

    for (let i = 0; i < field.grid.length; i++) {
      const value = field.grid[i];
      const normalized = isFinite(value) ? (value - minVal) / range : 0.5;
      let [r, g, b] = interpolateColor(normalized, colors);
      
      if (showBasins && basinMap && basinMap.labels[i] >= 0) {
        const basinId = basinMap.labels[i];
        const basinColor = BASIN_COLORS[basinId % BASIN_COLORS.length];
        const alpha = 0.25;
        r = Math.round(r * (1 - alpha) + basinColor[0] * alpha);
        g = Math.round(g * (1 - alpha) + basinColor[1] * alpha);
        b = Math.round(b * (1 - alpha) + basinColor[2] * alpha);
      }
      
      const pixelIdx = i * 4;
      data[pixelIdx] = r;
      data[pixelIdx + 1] = g;
      data[pixelIdx + 2] = b;
      data[pixelIdx + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);
  }, [field, colormap, basinMap, showBasins]);

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
    if (!container || !field) return;
    
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
  }, [zoom, pan, field]);

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
      
      const maxPan = (canvasSize * (zoom - 1)) / 2;
      setPan({
        x: Math.max(-maxPan, Math.min(maxPan, newPanX)),
        y: Math.max(-maxPan, Math.min(maxPan, newPanY)),
      });
    } else if (field && onHover) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const scaleX = field.width / rect.width;
      const scaleY = field.height / rect.height;
      
      const x = Math.floor((e.clientX - rect.left) * scaleX);
      const y = Math.floor((e.clientY - rect.top) * scaleY);
      
      if (x >= 0 && x < field.width && y >= 0 && y < field.height) {
        onHover(x, y, e.clientX, e.clientY);
      }
    }
  }, [isPanning, panStart, canvasSize, zoom, field, onHover]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsPanning(false);
    onHoverEnd?.();
  }, [onHoverEnd]);

  const handleDoubleClick = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const zoomPercent = Math.round(zoom * 100);

  const visualScale = 0.88;
  const visualSize = canvasSize * visualScale;

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center overflow-hidden"
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
      data-testid="visualization-container"
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

      {field ? (
        <>
          <canvas
            ref={canvasRef}
            className="rounded-md relative"
            style={{ 
              imageRendering: zoom > 2 ? "pixelated" : "auto",
              width: `${visualSize}px`,
              height: `${visualSize}px`,
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
              boxShadow: '0 4px 24px rgba(0,0,0,0.6), 0 0 1px rgba(255,255,255,0.1)',
            }}
            data-testid="canvas-visualization"
          />
          {zoom > 1 && (
            <div className="absolute bottom-2 left-2 bg-background/80 text-xs px-2 py-1 rounded text-muted-foreground" data-testid="zoom-indicator">
              {zoomPercent}% (double-click to reset)
            </div>
          )}
        </>
      ) : (
        <div className="text-muted-foreground text-sm">
          Initializing simulation...
        </div>
      )}
    </div>
  );
}
