import { useRef, useState, useLayoutEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { ProbeData } from "@shared/schema";
import type { ModeLabels } from "@/lib/interpretation-modes";

interface HoverProbeProps {
  data: ProbeData | null;
  modeLabels: ModeLabels;
  visible: boolean;
  position: { x: number; y: number };
}

const OFFSET = 12;

export function HoverProbe({ data, modeLabels, visible, position }: HoverProbeProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 220, height: 200 });

  useLayoutEffect(() => {
    if (cardRef.current && visible) {
      const rect = cardRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setDimensions({ width: rect.width, height: rect.height });
      }
    }
  }, [visible, data]);

  if (!visible || !data) return null;

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let left = position.x + OFFSET;
  let top = position.y + OFFSET;

  if (left + dimensions.width > viewportWidth - 10) {
    left = position.x - dimensions.width - OFFSET;
  }

  if (top + dimensions.height > viewportHeight - 10) {
    top = position.y - dimensions.height - OFFSET;
  }

  if (left < 10) left = 10;
  if (top < 10) top = 10;

  return (
    <Card
      ref={cardRef}
      className="fixed z-50 bg-card/95 backdrop-blur-sm border-border shadow-lg pointer-events-none"
      style={{
        left,
        top,
        maxWidth: 220,
      }}
      data-testid="panel-hover-probe"
    >
      <CardContent className="p-3 space-y-2">
        <div className="text-xs font-medium text-muted-foreground border-b border-border pb-1">
          Field Inspector ({data.x}, {data.y})
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <span className="text-muted-foreground">Value:</span>
          <span className="font-mono text-right">{data.value.toFixed(4)}</span>
          
          <span className="text-muted-foreground">{modeLabels.operators.curvature.split(' ')[0]}:</span>
          <span className="font-mono text-right">{data.curvature.toFixed(4)}</span>
          
          <span className="text-muted-foreground">{modeLabels.operators.tension.split(' ')[0]}:</span>
          <span className="font-mono text-right">{data.tension.toFixed(4)}</span>
          
          <span className="text-muted-foreground">{modeLabels.operators.coupling.split(' ')[0]}:</span>
          <span className="font-mono text-right">{data.coupling.toFixed(4)}</span>
          
          <span className="text-muted-foreground">Gradient:</span>
          <span className="font-mono text-right">{data.gradientMagnitude.toFixed(4)}</span>
          
          <span className="text-muted-foreground">Variance:</span>
          <span className="font-mono text-right">{data.neighborhoodVariance.toFixed(4)}</span>
          
          {data.basinId !== null && (
            <>
              <span className="text-muted-foreground">Basin ID:</span>
              <span className="font-mono text-right">{data.basinId}</span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
