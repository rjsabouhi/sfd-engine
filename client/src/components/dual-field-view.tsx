import { useRef, useEffect, useCallback } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

export function DualFieldView({ derivedField, derivedType, onTypeChange }: DualFieldViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !derivedField) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

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

  const typeLabels: Record<string, string> = {
    curvature: "Curvature Heatmap",
    tension: "Tension Gradient Map",
    coupling: "Coupling Flow",
    variance: "Local Variance Map",
  };

  return (
    <div className="relative h-full bg-gray-950 flex items-center justify-center">
      {derivedField ? (
        <canvas
          ref={canvasRef}
          className="rounded-md max-w-full max-h-full"
          style={{ 
            imageRendering: "auto",
            width: "100%",
            height: "100%",
            objectFit: "contain",
          }}
          data-testid="canvas-derived-field"
        />
      ) : (
        <div className="text-muted-foreground text-sm">
          Computing derived field...
        </div>
      )}
      
      <div className="absolute top-2 left-2 right-2">
        <Select value={derivedType} onValueChange={(v) => onTypeChange(v as typeof derivedType)}>
          <SelectTrigger className="h-7 text-xs bg-black/60 backdrop-blur-sm border-white/20" data-testid="select-derived-field">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="curvature">Curvature Heatmap</SelectItem>
            <SelectItem value="tension">Tension Gradient</SelectItem>
            <SelectItem value="coupling">Coupling Flow</SelectItem>
            <SelectItem value="variance">Variance Map</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="absolute bottom-2 left-0 right-0 text-center">
        <span className="text-xs text-white/70 bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded">{typeLabels[derivedType]}</span>
      </div>
    </div>
  );
}
