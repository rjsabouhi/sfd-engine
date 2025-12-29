import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { StructuralSignature, AttractorStatus, FieldMode, SimulationState } from "@shared/schema";
import type { ModeLabels } from "@/lib/interpretation-modes";

interface StructuralSignatureBarProps {
  signature: StructuralSignature;
  coherenceHistory: number[];
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

export function StructuralSignatureBar({ signature, coherenceHistory, state, modeLabels }: StructuralSignatureBarProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  
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
  
  return (
    <div className="space-y-3" data-testid="panel-structural-signature">
      {/* Core Metrics - 4 key indicators */}
      <div className="space-y-2">
        {/* Structural Coherence */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Structural Coherence</span>
          <span className="font-mono text-sm font-semibold" data-testid="metric-coherence">
            {signature.coherence.toFixed(3)}
          </span>
        </div>
        
        {/* Stability Index */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Stability Index</span>
          <span className="font-mono text-sm font-semibold" data-testid="metric-stability">
            {signature.stabilityMetric.toFixed(3)}
          </span>
        </div>
        
        {/* Attractors */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Attractors</span>
          <span className={`font-mono text-sm font-semibold ${getAttractorColor(attractor.status)}`} data-testid="metric-attractors">
            {attractorDisplay}
          </span>
        </div>
        
        {/* Field Mode */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Field Mode</span>
          <span className="text-xs font-medium text-right max-w-[140px] truncate" data-testid="metric-field-mode" title={fieldMode}>
            {fieldMode}
          </span>
        </div>
      </div>
      
      {/* Sparkline */}
      <div className="pt-2 border-t border-border/50">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Coherence Trend</span>
        </div>
        <Sparkline data={coherenceHistory} width={200} height={24} />
      </div>
      
      {/* Advanced Metrics - Collapsible */}
      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen} className="pt-2 border-t border-border/50">
        <CollapsibleTrigger asChild>
          <button className="flex items-center justify-between w-full py-1 hover-elevate rounded px-1" data-testid="button-toggle-advanced-metrics">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Advanced Metrics</span>
            {advancedOpen ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 space-y-1.5">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Step</span>
              <span className="font-mono">{state.step.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">FPS</span>
              <span className="font-mono">{state.fps}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Basins</span>
              <span className="font-mono">{signature.basinCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Depth</span>
              <span className="font-mono">{signature.avgBasinDepth.toFixed(3)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Curvature</span>
              <span className="font-mono">{signature.globalCurvature.toFixed(4)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">T-Variance</span>
              <span className="font-mono">{signature.tensionVariance.toFixed(4)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{modeLabels.stats.energy}</span>
              <span className="font-mono">{state.energy.toFixed(4)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{modeLabels.stats.variance}</span>
              <span className="font-mono">{state.variance.toFixed(6)}</span>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
