import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Download, Trash2 } from "lucide-react";
import type { StructuralEvent } from "@shared/schema";

interface EventLogProps {
  events: StructuralEvent[];
  onClear: () => void;
  onExport: () => void;
}

function getEventColor(type: StructuralEvent["type"]): string {
  switch (type) {
    case "basin_merge": return "text-blue-400";
    case "basin_split": return "text-green-400";
    case "curvature_spike": return "text-purple-400";
    case "variance_instability": return "text-yellow-400";
    case "phase_transition": return "text-red-400";
    default: return "text-muted-foreground";
  }
}

export function EventLog({ events, onClear, onExport }: EventLogProps) {
  return (
    <div className="space-y-2" data-testid="panel-event-log">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {events.length} event{events.length !== 1 ? 's' : ''}
        </span>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onExport}
                disabled={events.length === 0}
                data-testid="button-export-events"
              >
                <Download className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">Export events log</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onClear}
                disabled={events.length === 0}
                data-testid="button-clear-events"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">Clear all events</TooltipContent>
          </Tooltip>
        </div>
      </div>
      
      <ScrollArea className="h-32 rounded border border-border">
        {events.length === 0 ? (
          <div className="p-3 text-xs text-muted-foreground text-center">
            No events recorded yet
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {events.map((event) => (
              <div
                key={event.id}
                className="text-xs font-mono flex items-start gap-2"
              >
                <span className="text-muted-foreground shrink-0">t={event.step}</span>
                <span className={getEventColor(event.type)}>{event.description}</span>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
