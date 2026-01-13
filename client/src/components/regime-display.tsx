import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Activity, TrendingUp, AlertTriangle, RefreshCw, Wind, Anchor, Repeat, Eye } from "lucide-react";
import { LANGUAGE, type RegimeKey, type InterpretationMode } from "@/lib/language";

interface RegimeDisplayProps {
  regime: RegimeKey;
  mode: InterpretationMode;
  compact?: boolean;
  showWatchFor?: boolean;
}

const regimeIcons: Record<RegimeKey, typeof Activity> = {
  uniform: Anchor,
  highCurvature: Activity,
  multiBasin: TrendingUp,
  nearCritical: AlertTriangle,
  transitionEdge: RefreshCw,
  dispersion: Wind,
  postCooling: Anchor,
};

const regimeVariants: Record<RegimeKey, "default" | "secondary" | "destructive" | "outline"> = {
  uniform: "secondary",
  highCurvature: "outline",
  multiBasin: "outline",
  nearCritical: "destructive",
  transitionEdge: "destructive",
  dispersion: "outline",
  postCooling: "secondary",
};

export function RegimeDisplay({ regime, mode, compact = false, showWatchFor = true }: RegimeDisplayProps) {
  const regimeData = LANGUAGE.REGIMES[regime];
  const Icon = regimeIcons[regime];
  const variant = regimeVariants[regime];
  
  const idleDescription = regimeData.idle[mode];
  const narrative = regimeData.narrative;
  const watchFor = regimeData.watchFor;
  
  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={variant} className="gap-1 cursor-help">
            <Icon className="h-3 w-3" />
            {regimeData.name}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[280px]">
          <p className="text-xs font-medium mb-1">{narrative}</p>
          <p className="text-xs text-muted-foreground">{idleDescription}</p>
        </TooltipContent>
      </Tooltip>
    );
  }
  
  return (
    <div className="space-y-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 cursor-help">
            <span className="text-xs text-muted-foreground">{LANGUAGE.UI.REGIME_SELECTOR}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-[250px]">
          <p className="text-xs">A regime is a behavioral archetype of the field. It defines how patterns arise, stabilize, or dissolve.</p>
        </TooltipContent>
      </Tooltip>
      
      <div className="flex items-start gap-2">
        <Badge variant={variant} className="gap-1.5 shrink-0">
          <Icon className="h-3.5 w-3.5" />
          {regimeData.name}
        </Badge>
      </div>
      
      <p className="text-xs italic text-muted-foreground">{narrative}</p>
      <p className="text-xs leading-relaxed">{idleDescription}</p>
      
      {showWatchFor && watchFor.length > 0 && (
        <div className="pt-1 border-t border-border/50">
          <div className="flex items-center gap-1 mb-1">
            <Eye className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Watch for</span>
          </div>
          <ul className="text-xs text-muted-foreground space-y-0.5">
            {watchFor.map((item, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="text-primary/60">-</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

type LegacyRegimeKey = "STABLE" | "DRIFTING" | "ACCUMULATING" | "EDGE_OF_TRANSITION" | "RECONFIGURING" | "DISPERSION" | "NEW_BASELINE" | "CYCLING";
type LegacyModeKey = "TECHNICAL" | "STRUCTURAL" | "INTUITIVE";

const legacyRegimeData: Record<LegacyRegimeKey, { label: string; TECHNICAL: string; STRUCTURAL: string; INTUITIVE: string }> = {
  STABLE: {
    label: "Stable Regime",
    INTUITIVE: "Everything is calm and mostly balanced.",
    STRUCTURAL: "Low gradients, low curvature. System at equilibrium.",
    TECHNICAL: "\u03A6_t \u2192 0, negative divergence, high SR.",
  },
  DRIFTING: {
    label: "Drift Regime",
    INTUITIVE: "The system is slowly shifting.",
    STRUCTURAL: "Coherent directional gradient.",
    TECHNICAL: "Persistent low-frequency gradient alignment.",
  },
  ACCUMULATING: {
    label: "Tension Accumulation",
    INTUITIVE: "Stress is quietly building.",
    STRUCTURAL: "Increasing TI and CC. Pre-critical buildup.",
    TECHNICAL: "\u2202TI/\u2202t > 0, PCG approaching threshold.",
  },
  EDGE_OF_TRANSITION: {
    label: "Transition Edge",
    INTUITIVE: "Right at the border of change.",
    STRUCTURAL: "TE zone widening. High sensitivity.",
    TECHNICAL: "\u03BB_min(J) \u2248 0, bifurcation imminent.",
  },
  RECONFIGURING: {
    label: "Reconfiguration Event",
    INTUITIVE: "A major shift is happening.",
    STRUCTURAL: "Topology reorganizes.",
    TECHNICAL: "SRE trigger: PCG > threshold.",
  },
  DISPERSION: {
    label: "Dispersion Phase",
    INTUITIVE: "The system is cooling off.",
    STRUCTURAL: "EDO smooths out leftover tension.",
    TECHNICAL: "High-frequency components dampen.",
  },
  NEW_BASELINE: {
    label: "New Baseline",
    INTUITIVE: "A new normal has formed.",
    STRUCTURAL: "Stable configuration in a new basin.",
    TECHNICAL: "SR stable; new equilibrium manifold.",
  },
  CYCLING: {
    label: "Dynamic Cycling",
    INTUITIVE: "The system keeps shifting.",
    STRUCTURAL: "Oscillatory constraint realignments.",
    TECHNICAL: "Limit-cycle attractor.",
  },
};

const legacyRegimeIcons: Record<LegacyRegimeKey, typeof Activity> = {
  STABLE: Anchor,
  DRIFTING: TrendingUp,
  ACCUMULATING: Activity,
  EDGE_OF_TRANSITION: AlertTriangle,
  RECONFIGURING: RefreshCw,
  DISPERSION: Wind,
  NEW_BASELINE: Anchor,
  CYCLING: Repeat,
};

const legacyRegimeVariants: Record<LegacyRegimeKey, "default" | "secondary" | "destructive" | "outline"> = {
  STABLE: "secondary",
  DRIFTING: "secondary",
  ACCUMULATING: "outline",
  EDGE_OF_TRANSITION: "destructive",
  RECONFIGURING: "destructive",
  DISPERSION: "outline",
  NEW_BASELINE: "secondary",
  CYCLING: "outline",
};

const legacyRegimeDotColors: Record<LegacyRegimeKey, string> = {
  STABLE: "bg-green-500",
  DRIFTING: "bg-orange-400",
  ACCUMULATING: "bg-yellow-400",
  EDGE_OF_TRANSITION: "bg-red-500",
  RECONFIGURING: "bg-purple-500",
  DISPERSION: "bg-blue-400",
  NEW_BASELINE: "bg-yellow-500",
  CYCLING: "bg-cyan-400",
};

export function LegacyRegimeDisplay({ regime, mode, compact = false }: { regime: LegacyRegimeKey; mode: LegacyModeKey; compact?: boolean }) {
  const regimeData = legacyRegimeData[regime];
  const Icon = legacyRegimeIcons[regime];
  const variant = legacyRegimeVariants[regime];
  const dotColor = legacyRegimeDotColors[regime];
  const description = regimeData[mode];
  
  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 cursor-help">
            <span className={`h-2 w-2 rounded-full ${dotColor}`} />
            <Badge variant={variant} className="gap-1">
              <Icon className="h-3 w-3" />
              {regimeData.label}
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[250px]">
          <p className="text-xs">{description}</p>
        </TooltipContent>
      </Tooltip>
    );
  }
  
  return (
    <div className="space-y-1.5">
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 cursor-help">
            <span className="text-xs text-muted-foreground">Dynamic Regime</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-[250px]">
          <p className="text-xs">The current dynamic state of the field based on metric analysis.</p>
        </TooltipContent>
      </Tooltip>
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${dotColor} shrink-0`} />
        <Badge variant={variant} className="gap-1.5 shrink-0">
          <Icon className="h-3.5 w-3.5" />
          {regimeData.label}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
