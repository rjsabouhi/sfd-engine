import type { ProbeData, BasinMap } from "@shared/schema";

interface StructuralFieldFooterProps {
  probeData: ProbeData | null;
  basinMap: BasinMap | null;
  isHovering: boolean;
}

function formatValue(val: number | null | undefined, decimals = 4): string {
  if (val === null || val === undefined || !isFinite(val)) return "---";
  if (Math.abs(val) < 0.0001 && val !== 0) return val.toExponential(2);
  return val.toFixed(decimals);
}

function getStabilityLabel(variance: number, curvature: number): { label: string; color: string } {
  const instabilityScore = variance * 10 + Math.abs(curvature) * 0.5;
  if (instabilityScore < 0.3) return { label: "Stable", color: "text-emerald-400" };
  if (instabilityScore < 0.7) return { label: "Marginal", color: "text-amber-400" };
  return { label: "Unstable", color: "text-red-400" };
}

export function StructuralFieldFooter({ probeData, basinMap, isHovering }: StructuralFieldFooterProps) {
  const stability = probeData 
    ? getStabilityLabel(probeData.neighborhoodVariance, probeData.curvature)
    : { label: "---", color: "text-neutral-500" };
  const energyDensity = probeData 
    ? 0.5 * probeData.gradientMagnitude * probeData.gradientMagnitude + 0.5 * probeData.curvature * probeData.curvature
    : null;

  return (
    <div 
      className="flex items-center gap-4 px-6 text-[11px] font-mono border-t border-white/5 overflow-x-auto shrink-0"
      style={{ backgroundColor: 'rgba(8, 10, 14, 0.9)', height: '44px', minHeight: '44px' }}
      data-testid="structural-field-footer"
    >
      <span className="text-neutral-400">
        <span className="text-neutral-500">Val:</span> {formatValue(probeData?.value, 3)}
      </span>
      <span className="text-neutral-400">
        <span className="text-neutral-500">κ:</span> {formatValue(probeData?.curvature, 3)}
      </span>
      <span className="text-neutral-400">
        <span className="text-neutral-500">|∇Φ|:</span> {formatValue(probeData?.gradientMagnitude, 3)}
      </span>
      <span className="text-neutral-400">
        <span className="text-neutral-500">τ:</span> {formatValue(probeData?.tension, 3)}
      </span>
      <span className="text-neutral-400">
        <span className="text-neutral-500">Basin:</span> {probeData?.basinId ?? "---"}
      </span>
      <span className={stability.color}>
        {stability.label}
      </span>
      <span className="text-neutral-400">
        <span className="text-neutral-500">e:</span> {formatValue(energyDensity, 4)}
      </span>
      {isHovering && probeData && (
        <span className="text-blue-400/60 ml-auto">
          ({probeData.x}, {probeData.y})
        </span>
      )}
    </div>
  );
}

interface ProjectionFooterProps {
  layerType: string;
  probeData: ProbeData | null;
  derivedValue: number | null;
  basinMap: BasinMap | null;
  isHovering: boolean;
  x: number;
  y: number;
}

export function ProjectionViewFooter({ layerType, probeData, derivedValue, basinMap, isHovering, x, y }: ProjectionFooterProps) {
  const renderMetrics = () => {
    const v = derivedValue;
    
    switch (layerType) {
      case "coupling":
        return (
          <>
            <span className="text-neutral-400">
              <span className="text-neutral-500">c:</span> {formatValue(probeData?.coupling, 4)}
            </span>
            <span className="text-neutral-400">
              <span className="text-neutral-500">Layer:</span> {formatValue(v, 4)}
            </span>
            <span className="text-neutral-400">
              <span className="text-neutral-500">Basin:</span> {probeData?.basinId ?? "---"}
            </span>
          </>
        );
        
      case "tension":
        return (
          <>
            <span className="text-neutral-400">
              <span className="text-neutral-500">τ:</span> {formatValue(probeData?.tension, 4)}
            </span>
            <span className="text-neutral-400">
              <span className="text-neutral-500">Layer:</span> {formatValue(v, 4)}
            </span>
            <span className="text-neutral-400">
              <span className="text-neutral-500">|∇|:</span> {formatValue(probeData?.gradientMagnitude, 4)}
            </span>
          </>
        );
        
      case "variance":
        return (
          <>
            <span className="text-neutral-400">
              <span className="text-neutral-500">σ²:</span> {formatValue(probeData?.neighborhoodVariance, 4)}
            </span>
            <span className="text-neutral-400">
              <span className="text-neutral-500">Layer:</span> {formatValue(v, 4)}
            </span>
          </>
        );
        
      case "curvature":
        const kSign = probeData && probeData.curvature > 0.01 ? "+" : probeData && probeData.curvature < -0.01 ? "-" : "~";
        return (
          <>
            <span className="text-neutral-400">
              <span className="text-neutral-500">κ:</span> {formatValue(probeData?.curvature, 4)}
            </span>
            <span className="text-neutral-400">
              <span className="text-neutral-500">Sign:</span> {kSign}
            </span>
            <span className="text-neutral-400">
              <span className="text-neutral-500">Layer:</span> {formatValue(v, 4)}
            </span>
          </>
        );
        
      case "basins":
        const basinId = probeData?.basinId;
        const basinSize = basinMap && basinId !== null && basinId !== undefined ? basinMap.labels.filter(l => l === basinId).length : null;
        return (
          <>
            <span className="text-neutral-400">
              <span className="text-neutral-500">ID:</span> {basinId ?? "---"}
            </span>
            <span className="text-neutral-400">
              <span className="text-neutral-500">Size:</span> {basinSize !== null ? `${basinSize}px` : "---"}
            </span>
            <span className="text-neutral-400">
              <span className="text-neutral-500">Depth:</span> {formatValue(probeData?.value, 3)}
            </span>
          </>
        );
        
      case "gradientFlow":
        return (
          <>
            <span className="text-neutral-400">
              <span className="text-neutral-500">|∇Φ|:</span> {formatValue(probeData?.gradientMagnitude, 4)}
            </span>
            <span className="text-neutral-400">
              <span className="text-neutral-500">Layer:</span> {formatValue(v, 4)}
            </span>
          </>
        );
        
      case "gradientFlowLines":
        return (
          <>
            <span className="text-neutral-400">
              <span className="text-neutral-500">Flow:</span> {formatValue(probeData?.gradientMagnitude, 4)}
            </span>
            <span className="text-neutral-400">
              <span className="text-neutral-500">Layer:</span> {formatValue(v, 4)}
            </span>
          </>
        );
        
      case "criticality":
        return (
          <>
            <span className="text-neutral-400">
              <span className="text-neutral-500">Crit:</span> {formatValue(v, 4)}
            </span>
            <span className="text-neutral-400">
              <span className="text-neutral-500">σ²:</span> {formatValue(probeData?.neighborhoodVariance, 4)}
            </span>
          </>
        );
        
      case "hysteresis":
        return (
          <>
            <span className="text-neutral-400">
              <span className="text-neutral-500">Mem:</span> {formatValue(v, 4)}
            </span>
            <span className="text-neutral-400">
              <span className="text-neutral-500">Val:</span> {formatValue(probeData?.value, 4)}
            </span>
          </>
        );
        
      case "constraintSkeleton":
        return (
          <>
            <span className="text-neutral-400">
              <span className="text-neutral-500">Skel:</span> {formatValue(v, 4)}
            </span>
            <span className="text-neutral-400">
              <span className="text-neutral-500">κ:</span> {formatValue(probeData?.curvature, 4)}
            </span>
          </>
        );
        
      case "stabilityField":
        return (
          <>
            <span className="text-neutral-400">
              <span className="text-neutral-500">S:</span> {formatValue(v, 4)}
            </span>
            <span className="text-neutral-400">
              <span className="text-neutral-500">σ²:</span> {formatValue(probeData?.neighborhoodVariance, 4)}
            </span>
          </>
        );
        
      default:
        return (
          <span className="text-neutral-500">Select a layer</span>
        );
    }
  };

  return (
    <div 
      className="flex items-center gap-4 px-4 text-[11px] font-mono border-t border-white/5 overflow-x-auto shrink-0"
      style={{ backgroundColor: 'rgba(8, 10, 14, 0.9)', height: '36px', minHeight: '36px' }}
      data-testid="projection-view-footer"
    >
      {renderMetrics()}
      {isHovering && (
        <span className="text-blue-400/60 ml-auto">
          ({x}, {y})
        </span>
      )}
    </div>
  );
}
