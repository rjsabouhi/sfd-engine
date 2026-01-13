import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { StructuralSignature, AttractorStatus, FieldMode, SimulationState, TrendMetrics } from "@shared/schema";
import type { ModeLabels } from "@/lib/interpretation-modes";

interface StructuralSignatureBarProps {
  signature: StructuralSignature;
  coherenceHistory: number[];
  trendMetrics: TrendMetrics | null;
  state: SimulationState;
  modeLabels: ModeLabels;
}

// Compute human-readable attractor status from basin count, stability, and depth
function getAttractorStatus(
  basinCount: number, 
  stability: number, 
  avgBasinDepth: number
): { status: AttractorStatus; count: number } {
  // Guard against invalid values
  if (isNaN(basinCount) || basinCount < 0) {
    return { status: "None", count: 0 };
  }
  
  // No basins = no attractors
  if (basinCount === 0) {
    return { status: "None", count: 0 };
  }
  
  // Determine attractor quality based on depth and stability
  // Deeper basins (>0.01) with high stability indicate true attractors
  const hasDepth = avgBasinDepth > 0.01;
  const isStable = stability > 0.8;
  const isModeratelyStable = stability > 0.6;
  
  if (basinCount >= 2 && hasDepth && isStable) {
    return { status: "Multiple", count: basinCount };
  } else if (basinCount === 1 && hasDepth && isStable) {
    return { status: "Stable", count: 1 };
  } else if (basinCount >= 1 && (hasDepth || isModeratelyStable)) {
    return { status: "Emerging", count: basinCount };
  } else {
    return { status: "None", count: 0 };
  }
}

// Compute field mode based on signature metrics
// Priority order: Chaotic states > Symmetry breaks > Basin states > Tension > Equilibrium
function getFieldMode(signature: StructuralSignature, variance: number): FieldMode {
  const { basinCount, globalCurvature, tensionVariance, stabilityMetric, coherence } = signature;
  
  // 1. CHAOTIC STATES (highest priority - dangerous conditions)
  // Very high variance with low coherence = chaotic dispersion
  if (variance > 0.2 && coherence < 0.3) {
    return "Oscillatory collapse";
  }
  
  // High variance = oscillatory behavior
  if (variance > 0.12) {
    return "Oscillatory collapse";
  }
  
  // 2. SYMMETRY BREAKING (structural changes)
  // High curvature indicates symmetry breach regardless of basin state
  if (Math.abs(globalCurvature) > 0.005) {
    return "Radial symmetry breach";
  }
  
  // 3. STABLE MULTI-BASIN STATES
  // Multiple stable attractors
  if (basinCount > 2 && stabilityMetric > 0.85 && coherence > 0.5) {
    return "Multi-stable regime";
  }
  
  // Single coherent attractor
  if (basinCount === 1 && stabilityMetric > 0.85 && coherence > 0.6) {
    return "Coherent attractor";
  }
  
  // 4. BASIN FORMATION
  // Basins crystallizing but not yet stable
  if (basinCount >= 1 && stabilityMetric > 0.6 && coherence > 0.4) {
    return "Basin crystallization";
  }
  
  // 5. TENSION STATES
  // High tension variance = shear forces active
  if (tensionVariance > 0.003) {
    return "Shear tension forming";
  }
  
  // 6. BOUNDARY STATES
  // High stability with moderate coherence but no clear basins
  if (stabilityMetric > 0.75 && coherence > 0.5 && basinCount <= 1) {
    return "Boundary locking";
  }
  
  // 7. DEFAULT - diffuse/equilibrium state
  return "Diffuse equilibrium";
}

// Mini sparkline component
function Sparkline({ data, width = 80, height = 20 }: { data: number[]; width?: number; height?: number }) {
  if (!data || data.length < 2) {
    return <div className="text-[10px] text-muted-foreground italic">Collecting data...</div>;
  }
  
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');
  
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-primary/70"
      />
    </svg>
  );
}

// Trend indicator component
function TrendIndicator({ trend, label }: { trend: number; label?: string }) {
  const threshold = 0.001;
  if (Math.abs(trend) < threshold) {
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  }
  if (trend > 0) {
    return <TrendingUp className="h-3 w-3 text-yellow-500" />;
  }
  return <TrendingDown className="h-3 w-3 text-green-500" />;
}

// Get stability classification color (considers all three states)
function getStabilityColor(stable: number, borderline: number, unstable: number): string {
  const total = stable + borderline + unstable;
  if (total === 0) return "text-muted-foreground";
  const unstableRatio = unstable / total;
  const stableRatio = stable / total;
  // Unstable dominates
  if (unstableRatio > 0.3) return "text-red-400";
  // Mostly stable
  if (stableRatio > 0.7) return "text-green-500";
  // Mixed
  if (stableRatio > 0.4) return "text-yellow-500";
  return "text-red-400";
}

export function StructuralSignatureBar({ signature, coherenceHistory, trendMetrics, state, modeLabels }: StructuralSignatureBarProps) {
  const [advancedOpen, setAdvancedOpen] = useState(true);
  const [basinDynamicsOpen, setBasinDynamicsOpen] = useState(true);
  
  const attractor = getAttractorStatus(signature.basinCount, signature.stabilityMetric, signature.avgBasinDepth);
  const fieldMode = getFieldMode(signature, state.variance);
  
  // Format attractor display
  const attractorDisplay = attractor.status === "None" 
    ? "None" 
    : attractor.count > 1 
      ? `${attractor.status} (${attractor.count})`
      : attractor.status;
  
  // Get status color for attractor
  const getAttractorColor = (status: AttractorStatus) => {
    switch (status) {
      case "None": return "text-muted-foreground";
      case "Emerging": return "text-yellow-500";
      case "Stable": return "text-green-500";
      case "Multiple": return "text-blue-400";
    }
  };

  // Compute trend-based complexity from metrics
  const getComplexityLabel = (complexity: number): string => {
    if (complexity < 0.2) return "Simple";
    if (complexity < 0.4) return "Moderate";
    if (complexity < 0.6) return "Complex";
    return "Highly Complex";
  };
  
  // Determine drift/relaxation state
  const getDriftState = (): { label: string; color: string } => {
    if (!trendMetrics) return { label: "Collecting...", color: "text-muted-foreground" };
    const { energyTrend, varianceTrend } = trendMetrics;
    if (Math.abs(energyTrend) < 0.0001 && Math.abs(varianceTrend) < 0.0001) {
      return { label: "Relaxed", color: "text-green-500" };
    }
    if (energyTrend > 0.001 || varianceTrend > 0.001) {
      return { label: "Drifting", color: "text-yellow-500" };
    }
    if (energyTrend < -0.001) {
      return { label: "Relaxing", color: "text-blue-400" };
    }
    return { label: "Stable", color: "text-muted-foreground" };
  };
  
  const driftState = getDriftState();
  
  return (
    <div className="space-y-3 select-none cursor-default" data-testid="panel-structural-signature">
      {/* Trend-Based Core Metrics */}
      <div className="space-y-2">
        {/* Energy Trend */}
        <div className="flex items-center justify-between gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-xs text-muted-foreground">Energy (avg)</span>
            </TooltipTrigger>
            <TooltipContent side="left" className="text-xs max-w-[200px]">
              Average energy over recent frames - indicates structural tension
            </TooltipContent>
          </Tooltip>
          <div className="flex items-center gap-1.5">
            {trendMetrics && <TrendIndicator trend={trendMetrics.energyTrend} />}
            <span className="font-mono text-sm font-semibold" data-testid="metric-energy-avg">
              {trendMetrics ? trendMetrics.avgEnergy.toFixed(4) : "..."}
            </span>
          </div>
        </div>
        
        {/* Variance Trend */}
        <div className="flex items-center justify-between gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-xs text-muted-foreground">Variance (avg)</span>
            </TooltipTrigger>
            <TooltipContent side="left" className="text-xs max-w-[200px]">
              How much field values vary across space - high = active dynamics
            </TooltipContent>
          </Tooltip>
          <div className="flex items-center gap-1.5">
            {trendMetrics && <TrendIndicator trend={trendMetrics.varianceTrend} />}
            <span className="font-mono text-sm font-semibold" data-testid="metric-variance-avg">
              {trendMetrics ? trendMetrics.avgVariance.toFixed(6) : "..."}
            </span>
          </div>
        </div>
        
        {/* Curvature Trend */}
        <div className="flex items-center justify-between gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-xs text-muted-foreground">Curvature (avg)</span>
            </TooltipTrigger>
            <TooltipContent side="left" className="text-xs max-w-[200px]">
              Global field bending - positive = convex, negative = concave
            </TooltipContent>
          </Tooltip>
          <div className="flex items-center gap-1.5">
            {trendMetrics && <TrendIndicator trend={trendMetrics.curvatureTrend} />}
            <span className="font-mono text-sm font-semibold" data-testid="metric-curvature-avg">
              {trendMetrics ? trendMetrics.avgCurvature.toFixed(4) : "..."}
            </span>
          </div>
        </div>
        
        {/* Drift/Relaxation State */}
        <div className="flex items-center justify-between">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-xs text-muted-foreground">Field State</span>
            </TooltipTrigger>
            <TooltipContent side="left" className="text-xs max-w-[200px]">
              Whether system is relaxing, drifting, or stable
            </TooltipContent>
          </Tooltip>
          <span className={`text-xs font-medium ${driftState.color}`} data-testid="metric-drift-state">
            {driftState.label}
          </span>
        </div>
      </div>
      
      {/* Stability History Sparkline */}
      <div className="pt-2 border-t border-border/50">
        <div className="flex items-center justify-between mb-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Coherence Trend</span>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs max-w-[200px]">
              Measure of spatial organization and correlation over time
            </TooltipContent>
          </Tooltip>
        </div>
        <Sparkline data={coherenceHistory} width={200} height={24} />
      </div>
      
      {/* Stability Classification Summary */}
      {trendMetrics && (
        <div className="pt-2 border-t border-border/50">
          <div className="flex items-center justify-between mb-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Stability History</span>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs max-w-[200px]">
                Frame counts: stable (s), borderline (b), unstable (u)
              </TooltipContent>
            </Tooltip>
            <span className={`text-xs font-mono ${getStabilityColor(trendMetrics.stableFrames, trendMetrics.borderlineFrames, trendMetrics.unstableFrames)}`}>
              {trendMetrics.stableFrames}s / {trendMetrics.borderlineFrames}b / {trendMetrics.unstableFrames}u
            </span>
          </div>
          <div className="flex gap-1 h-1.5">
            {trendMetrics.stableFrames > 0 && (
              <div 
                className="bg-green-500 rounded-full" 
                style={{ flex: trendMetrics.stableFrames }}
                title={`Stable: ${trendMetrics.stableFrames} frames`}
              />
            )}
            {trendMetrics.borderlineFrames > 0 && (
              <div 
                className="bg-yellow-500 rounded-full" 
                style={{ flex: trendMetrics.borderlineFrames }}
                title={`Borderline: ${trendMetrics.borderlineFrames} frames`}
              />
            )}
            {trendMetrics.unstableFrames > 0 && (
              <div 
                className="bg-red-400 rounded-full" 
                style={{ flex: trendMetrics.unstableFrames }}
                title={`Unstable: ${trendMetrics.unstableFrames} frames`}
              />
            )}
          </div>
        </div>
      )}
      
      {/* Basin Dynamics - Collapsible */}
      <Collapsible open={basinDynamicsOpen} onOpenChange={setBasinDynamicsOpen} className="pt-2 border-t border-border/50">
        <CollapsibleTrigger asChild>
          <button className="flex items-center justify-between w-full py-1 hover-elevate rounded px-1" data-testid="button-toggle-basin-dynamics">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Basin Dynamics</span>
            {basinDynamicsOpen ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 space-y-1.5">
          {trendMetrics ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <div className="flex justify-between">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-muted-foreground">Avg Basins</span>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="text-xs max-w-[200px]">
                    Average number of stable attractor regions in the field
                  </TooltipContent>
                </Tooltip>
                <span className="font-mono">{trendMetrics.avgBasinCount.toFixed(1)}</span>
              </div>
              <div className="flex justify-between">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-muted-foreground">Merge Rate</span>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="text-xs max-w-[200px]">
                    Rate at which basins are combining or splitting
                  </TooltipContent>
                </Tooltip>
                <span className="font-mono">{(trendMetrics.basinMergeRate * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-muted-foreground">Peak Gradient</span>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="text-xs max-w-[200px]">
                    Maximum rate of change in the field
                  </TooltipContent>
                </Tooltip>
                <span className="font-mono">{trendMetrics.peakGradient.toFixed(4)}</span>
              </div>
              <div className="flex justify-between">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-muted-foreground">Peak Energy</span>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="text-xs max-w-[200px]">
                    Highest energy level observed in recent frames
                  </TooltipContent>
                </Tooltip>
                <span className="font-mono">{trendMetrics.peakEnergy.toFixed(4)}</span>
              </div>
              <div className="flex justify-between col-span-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-muted-foreground">Complexity</span>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="text-xs max-w-[200px]">
                    Overall system complexity based on multiple metrics
                  </TooltipContent>
                </Tooltip>
                <span className="font-mono">{getComplexityLabel(trendMetrics.complexity)}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">Collecting trend data...</p>
          )}
        </CollapsibleContent>
      </Collapsible>
      
      {/* Advanced Metrics - Collapsible (instantaneous reference) */}
      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen} className="pt-2 border-t border-border/50">
        <CollapsibleTrigger asChild>
          <button className="flex items-center justify-between w-full py-1 hover-elevate rounded px-1" data-testid="button-toggle-advanced-metrics">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Instantaneous Reference</span>
            {advancedOpen ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 space-y-1.5">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <div className="flex justify-between">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-muted-foreground">Step</span>
                </TooltipTrigger>
                <TooltipContent side="left" className="text-xs max-w-[200px]">
                  Current simulation step number
                </TooltipContent>
              </Tooltip>
              <span className="font-mono">{state.step.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-muted-foreground">FPS</span>
                </TooltipTrigger>
                <TooltipContent side="left" className="text-xs max-w-[200px]">
                  Frames per second - simulation update rate
                </TooltipContent>
              </Tooltip>
              <span className="font-mono">{state.fps}</span>
            </div>
            <div className="flex justify-between">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-muted-foreground">Coherence</span>
                </TooltipTrigger>
                <TooltipContent side="left" className="text-xs max-w-[200px]">
                  Measure of spatial organization and correlation
                </TooltipContent>
              </Tooltip>
              <span className="font-mono">{signature.coherence.toFixed(3)}</span>
            </div>
            <div className="flex justify-between">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-muted-foreground">Stability</span>
                </TooltipTrigger>
                <TooltipContent side="left" className="text-xs max-w-[200px]">
                  Fraction of field cells in stable configurations
                </TooltipContent>
              </Tooltip>
              <span className="font-mono">{signature.stabilityMetric.toFixed(3)}</span>
            </div>
            <div className="flex justify-between">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-muted-foreground">Attractors</span>
                </TooltipTrigger>
                <TooltipContent side="left" className="text-xs max-w-[200px]">
                  Status of stable basin formations in the field
                </TooltipContent>
              </Tooltip>
              <span className={`font-mono ${getAttractorColor(attractor.status)}`}>{attractorDisplay}</span>
            </div>
            <div className="flex justify-between">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-muted-foreground">Field Mode</span>
                </TooltipTrigger>
                <TooltipContent side="left" className="text-xs max-w-[200px]">
                  Current dynamical state classification of the system
                </TooltipContent>
              </Tooltip>
              <span className="font-mono text-[10px] truncate max-w-[80px]" title={fieldMode}>{fieldMode}</span>
            </div>
            <div className="flex justify-between">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-muted-foreground">{modeLabels.stats.energy}</span>
                </TooltipTrigger>
                <TooltipContent side="left" className="text-xs max-w-[200px]">
                  Instantaneous energy level of the field
                </TooltipContent>
              </Tooltip>
              <span className="font-mono">{state.energy.toFixed(4)}</span>
            </div>
            <div className="flex justify-between">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-muted-foreground">{modeLabels.stats.variance}</span>
                </TooltipTrigger>
                <TooltipContent side="left" className="text-xs max-w-[200px]">
                  Instantaneous variance across the field
                </TooltipContent>
              </Tooltip>
              <span className="font-mono">{state.variance.toFixed(6)}</span>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
