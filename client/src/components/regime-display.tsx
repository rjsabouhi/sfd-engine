import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, Activity, TrendingUp, AlertTriangle, RefreshCw, Wind, Anchor, Repeat } from "lucide-react";
import { LANGUAGE, type RegimeKey, type InterpretationModeKey } from "@/lib/language";

interface RegimeDisplayProps {
  regime: RegimeKey;
  mode: InterpretationModeKey;
  compact?: boolean;
}

const regimeIcons: Record<RegimeKey, typeof Activity> = {
  STABLE: Anchor,
  DRIFTING: TrendingUp,
  ACCUMULATING: Activity,
  EDGE_OF_TRANSITION: AlertTriangle,
  RECONFIGURING: RefreshCw,
  DISPERSION: Wind,
  NEW_BASELINE: Anchor,
  CYCLING: Repeat,
};

const regimeVariants: Record<RegimeKey, "default" | "secondary" | "destructive" | "outline"> = {
  STABLE: "secondary",
  DRIFTING: "secondary",
  ACCUMULATING: "outline",
  EDGE_OF_TRANSITION: "destructive",
  RECONFIGURING: "destructive",
  DISPERSION: "outline",
  NEW_BASELINE: "secondary",
  CYCLING: "outline",
};

export function RegimeDisplay({ regime, mode, compact = false }: RegimeDisplayProps) {
  const regimeData = LANGUAGE.REGIMES[regime];
  const Icon = regimeIcons[regime];
  const variant = regimeVariants[regime];
  
  const description = regimeData[mode];
  
  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={variant} className="gap-1 cursor-help">
            <Icon className="h-3 w-3" />
            {regimeData.LABEL}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[250px]">
          <p className="text-xs">{description}</p>
        </TooltipContent>
      </Tooltip>
    );
  }
  
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{LANGUAGE.UI.REGIME_PANEL}</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-3 w-3 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-[250px]">
            <p className="text-xs">The current dynamic state of the field based on metric analysis.</p>
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="flex items-start gap-2">
        <Badge variant={variant} className="gap-1.5 shrink-0">
          <Icon className="h-3.5 w-3.5" />
          {regimeData.LABEL}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
