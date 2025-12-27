import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Info } from "lucide-react";
import { LANGUAGE, type MetricKey, type InterpretationModeKey } from "@/lib/language";

interface MetricValue {
  key: MetricKey;
  value: number;
  max?: number;
}

interface MetricsPanelProps {
  metrics: MetricValue[];
  mode: InterpretationModeKey;
  compact?: boolean;
}

function getValueLevel(value: number, max: number = 1): "low" | "medium" | "high" {
  const ratio = value / max;
  if (ratio < 0.33) return "low";
  if (ratio < 0.66) return "medium";
  return "high";
}

function MetricRow({ metric, mode }: { metric: MetricValue; mode: InterpretationModeKey }) {
  const metricData = LANGUAGE.METRICS[metric.key];
  const description = metricData[mode];
  const level = getValueLevel(metric.value, metric.max);
  
  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <div className="flex items-center gap-1.5 min-w-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-xs truncate cursor-help">
              {metricData.LABEL}
            </span>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-[280px]">
            <p className="text-xs">{description}</p>
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs font-mono tabular-nums text-muted-foreground">
          {metric.value.toFixed(3)}
        </span>
        <Badge 
          variant={level === "high" ? "destructive" : level === "medium" ? "outline" : "secondary"} 
          className="text-[10px] px-1.5 py-0"
        >
          {level.toUpperCase()}
        </Badge>
      </div>
    </div>
  );
}

export function MetricsPanel({ metrics, mode, compact = false }: MetricsPanelProps) {
  const [isOpen, setIsOpen] = useState(!compact);
  
  if (compact) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="flex items-center justify-between gap-2 w-full text-left py-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium">{LANGUAGE.UI.METRICS_PANEL}</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[200px]">
                <p className="text-xs">Computed field metrics describing the current state.</p>
              </TooltipContent>
            </Tooltip>
          </div>
          {isOpen ? (
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-1">
          <div className="divide-y divide-border/50">
            {metrics.map((metric) => (
              <MetricRow key={metric.key} metric={metric} mode={mode} />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  }
  
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium">{LANGUAGE.UI.METRICS_PANEL}</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-3 w-3 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-[200px]">
            <p className="text-xs">Computed field metrics describing the current state.</p>
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="divide-y divide-border/50">
        {metrics.map((metric) => (
          <MetricRow key={metric.key} metric={metric} mode={mode} />
        ))}
      </div>
    </div>
  );
}
