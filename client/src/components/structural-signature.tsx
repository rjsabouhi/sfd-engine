import type { StructuralSignature } from "@shared/schema";
import type { ModeLabels } from "@/lib/interpretation-modes";

interface StructuralSignatureBarProps {
  signature: StructuralSignature;
  modeLabels: ModeLabels;
}

export function StructuralSignatureBar({ signature, modeLabels }: StructuralSignatureBarProps) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" data-testid="panel-structural-signature">
      <div className="flex items-center gap-1">
        <span className="text-muted-foreground">{modeLabels.stats.basins}:</span>
        <span className="font-mono">{signature.basinCount}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-muted-foreground">Depth:</span>
        <span className="font-mono">{signature.avgBasinDepth.toFixed(3)}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-muted-foreground">Curv:</span>
        <span className="font-mono">{signature.globalCurvature.toFixed(4)}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-muted-foreground">T-Var:</span>
        <span className="font-mono">{signature.tensionVariance.toFixed(4)}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-muted-foreground">Stability:</span>
        <span className="font-mono">{signature.stabilityMetric.toFixed(3)}</span>
      </div>
    </div>
  );
}
