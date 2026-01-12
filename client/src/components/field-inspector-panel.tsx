import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, MapPin, Trash2 } from "lucide-react";
import type { InspectorMark } from "@shared/schema";
import type { ModeLabels } from "@/lib/interpretation-modes";

interface FieldInspectorPanelProps {
  marks: InspectorMark[];
  onRemoveMark: (id: string) => void;
  onClearAll: () => void;
  modeLabels: ModeLabels;
}

export function FieldInspectorPanel({ marks, onRemoveMark, onClearAll, modeLabels }: FieldInspectorPanelProps) {
  if (marks.length === 0) {
    return (
      <Card className="bg-card/95 backdrop-blur-sm border-border" data-testid="panel-field-inspector">
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-xs font-medium flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            Marked Points
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <p className="text-xs text-muted-foreground">
            Click on the field to mark inspection points. Each click adds a new entry.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/95 backdrop-blur-sm border-border" data-testid="panel-field-inspector">
      <CardHeader className="p-3 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-medium flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            Marked Points ({marks.length})
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 px-1.5 text-[10px]"
            onClick={onClearAll}
            data-testid="button-clear-all-marks"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Clear All
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="max-h-[300px]">
          <div className="space-y-1 p-2">
            {marks.map((mark, index) => (
              <div
                key={mark.id}
                className="group relative bg-muted/50 rounded-md p-2 text-xs"
                data-testid={`inspector-mark-${index}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-muted-foreground">
                    #{index + 1} ({mark.gridX}, {mark.gridY})
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground">
                      Step {mark.step}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => onRemoveMark(mark.id)}
                      data-testid={`button-remove-mark-${index}`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]">
                  <span className="text-muted-foreground">Value:</span>
                  <span className="font-mono text-right">{mark.probe.value.toFixed(4)}</span>
                  
                  <span className="text-muted-foreground">{modeLabels.operators.curvature.split(' ')[0]}:</span>
                  <span className="font-mono text-right">{mark.probe.curvature.toFixed(4)}</span>
                  
                  <span className="text-muted-foreground">{modeLabels.operators.tension.split(' ')[0]}:</span>
                  <span className="font-mono text-right">{mark.probe.tension.toFixed(4)}</span>
                  
                  <span className="text-muted-foreground">{modeLabels.operators.coupling.split(' ')[0]}:</span>
                  <span className="font-mono text-right">{mark.probe.coupling.toFixed(4)}</span>
                  
                  <span className="text-muted-foreground">Gradient:</span>
                  <span className="font-mono text-right">{mark.probe.gradientMagnitude.toFixed(4)}</span>
                  
                  <span className="text-muted-foreground">Variance:</span>
                  <span className="font-mono text-right">{mark.probe.neighborhoodVariance.toFixed(4)}</span>
                  
                  {mark.probe.basinId !== null && (
                    <>
                      <span className="text-muted-foreground">Basin:</span>
                      <span className="font-mono text-right">{mark.probe.basinId}</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
