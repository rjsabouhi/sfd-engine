import { useRef, useEffect, useCallback, useState } from "react";
import type { FieldData, BasinMap, ProbeData } from "@shared/schema";

interface VisualizationCanvasProps {
  field: FieldData | null;
  colormap?: "inferno" | "viridis";
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

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !field) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const size = Math.min(containerWidth, containerHeight);
    
    canvas.width = field.width;
    canvas.height = field.height;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    const imageData = ctx.createImageData(field.width, field.height);
    const data = imageData.data;
    const colors = colormap === "inferno" ? INFERNO_COLORS : VIRIDIS_COLORS;

    for (let i = 0; i < field.grid.length; i++) {
      const value = field.grid[i];
      const normalized = (value + 1) / 2;
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

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!field || !onHover) return;
    
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
  }, [field, onHover]);

  const handleMouseLeave = useCallback(() => {
    onHoverEnd?.();
  }, [onHoverEnd]);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center bg-gray-950"
      data-testid="visualization-container"
    >
      {field ? (
        <canvas
          ref={canvasRef}
          className="rounded-md"
          style={{ imageRendering: "auto" }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          data-testid="canvas-visualization"
        />
      ) : (
        <div className="text-muted-foreground text-sm">
          Initializing simulation...
        </div>
      )}
    </div>
  );
}
