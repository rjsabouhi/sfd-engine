import { useState, useMemo } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, AlertTriangle, CheckCircle, Circle } from "lucide-react";
import type { DiagnosticSolverData, DiagnosticInternalsData, DeterminismReport } from "@/lib/sfd-engine";

const ENERGY_DRIFT_THRESHOLD = 0.02;
const VARIANCE_SPIKE_THRESHOLD = 0.0015;
const CURVATURE_SPIKE_THRESHOLD = 0.015;
const BORDERLINE_MARGIN = 0.60;

interface SummaryDiagnosticsProps {
  solverData: DiagnosticSolverData | null;
  internalsData: DiagnosticInternalsData | null;
  frameHash: string;
  determinismReport: DeterminismReport | null;
  energyHistory: number[];
}

type StabilityStatus = "stable" | "borderline" | "unstable";

function computeStabilityStatus(
  solverData: DiagnosticSolverData | null,
  internalsData: DiagnosticInternalsData | null
): StabilityStatus {
  if (!solverData || !internalsData) return "stable";

  const energyDrift = Math.abs(solverData.deltaEnergy);
  const varianceDerivative = Math.abs(solverData.varianceDerivative);
  const curvatureMean = Math.abs(internalsData.curvatureStats.mean);

  const energyExceeds = energyDrift > ENERGY_DRIFT_THRESHOLD;
  const varianceExceeds = varianceDerivative > VARIANCE_SPIKE_THRESHOLD;
  const curvatureExceeds = curvatureMean > CURVATURE_SPIKE_THRESHOLD;

  if (energyExceeds || varianceExceeds || curvatureExceeds) {
    return "unstable";
  }

  const energyBorderline = energyDrift > ENERGY_DRIFT_THRESHOLD * BORDERLINE_MARGIN;
  const varianceBorderline = varianceDerivative > VARIANCE_SPIKE_THRESHOLD * BORDERLINE_MARGIN;
  const curvatureBorderline = curvatureMean > CURVATURE_SPIKE_THRESHOLD * BORDERLINE_MARGIN;

  if (energyBorderline || varianceBorderline || curvatureBorderline) {
    return "borderline";
  }

  return "stable";
}

function getWarnings(
  solverData: DiagnosticSolverData | null,
  internalsData: DiagnosticInternalsData | null,
  determinismReport: DeterminismReport | null
): string[] {
  const warnings: string[] = [];
  if (!solverData || !internalsData) return warnings;

  if (Math.abs(solverData.deltaEnergy) > ENERGY_DRIFT_THRESHOLD) {
    warnings.push("High Energy Drift");
  }
  if (Math.abs(internalsData.curvatureStats.mean) > CURVATURE_SPIKE_THRESHOLD) {
    warnings.push("Curvature Spike");
  }
  if (determinismReport && !determinismReport.isDeterministic) {
    warnings.push("Determinism Divergence");
  }
  if (Math.abs(solverData.varianceDerivative) > VARIANCE_SPIKE_THRESHOLD) {
    warnings.push("Rapid Variance Change");
  }

  return warnings;
}

function formatValue(value: number, precision: number = 4): string {
  if (Math.abs(value) < 0.0001 || Math.abs(value) >= 10000) {
    return value.toExponential(precision - 1);
  }
  return value.toPrecision(precision);
}

function MiniSparkline({ data, width = 60, height = 16 }: { data: number[]; width?: number; height?: number }) {
  if (data.length < 2) {
    return <span className="text-xs text-muted-foreground font-mono">--</span>;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 2) - 1;
    return `${x},${y}`;
  }).join(' ');

  const trend = data[data.length - 1] - data[0];
  const color = trend > 0.001 ? "#f59e0b" : trend < -0.001 ? "#10b981" : "#6b7280";

  return (
    <svg width={width} height={height} className="inline-block">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SummaryRow({ label, value, warning }: { label: string; value: string; warning?: boolean }) {
  return (
    <div className="flex justify-between items-center py-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-xs font-mono ${warning ? "text-amber-400" : "text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}

export function SummaryDiagnostics({
  solverData,
  internalsData,
  frameHash,
  determinismReport,
  energyHistory,
}: SummaryDiagnosticsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const stabilityStatus = useMemo(
    () => computeStabilityStatus(solverData, internalsData),
    [solverData, internalsData]
  );

  const warnings = useMemo(
    () => getWarnings(solverData, internalsData, determinismReport),
    [solverData, internalsData, determinismReport]
  );

  const isUnstable = stabilityStatus === "unstable";

  const deltaEHistory = useMemo(() => {
    if (energyHistory.length < 2) return [];
    const deltas: number[] = [];
    for (let i = 1; i < energyHistory.length; i++) {
      deltas.push(energyHistory[i] - energyHistory[i - 1]);
    }
    return deltas.slice(-60);
  }, [energyHistory]);

  return (
    <div className="border-b border-white/10">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-white/5">
          <span>System Status Summary</span>
          {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </CollapsibleTrigger>
        <CollapsibleContent className="px-3 pb-3 space-y-3">
          <div className="flex items-center gap-2">
            {stabilityStatus === "stable" && (
              <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30 gap-1">
                <CheckCircle className="h-3 w-3" />
                Stable
              </Badge>
            )}
            {stabilityStatus === "borderline" && (
              <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 gap-1">
                <Circle className="h-3 w-3" />
                Borderline
              </Badge>
            )}
            {stabilityStatus === "unstable" && (
              <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30 gap-1">
                <AlertTriangle className="h-3 w-3" />
                Unstable
              </Badge>
            )}
          </div>

          <div className="space-y-0.5">
            <SummaryRow
              label="Energy (Et)"
              value={solverData ? formatValue(solverData.energy) : "--"}
              warning={!!(isUnstable && solverData && Math.abs(solverData.deltaEnergy) > ENERGY_DRIFT_THRESHOLD)}
            />
            <SummaryRow
              label="ΔE"
              value={solverData ? formatValue(solverData.deltaEnergy) : "--"}
              warning={!!(isUnstable && solverData && Math.abs(solverData.deltaEnergy) > ENERGY_DRIFT_THRESHOLD)}
            />
            <SummaryRow
              label="Variance (σ²)"
              value={solverData ? formatValue(solverData.variance) : "--"}
            />
            <SummaryRow
              label="Variance Trend (dσ²/dt)"
              value={solverData ? formatValue(solverData.varianceDerivative) : "--"}
              warning={!!(isUnstable && solverData && Math.abs(solverData.varianceDerivative) > VARIANCE_SPIKE_THRESHOLD)}
            />
            <SummaryRow
              label="Max Gradient"
              value={internalsData ? formatValue(internalsData.gradientMagnitudeStats.max) : "--"}
            />
            <SummaryRow
              label="Curvature Mean"
              value={internalsData ? formatValue(internalsData.curvatureStats.mean) : "--"}
              warning={!!(isUnstable && internalsData && Math.abs(internalsData.curvatureStats.mean) > CURVATURE_SPIKE_THRESHOLD)}
            />
            <SummaryRow
              label="Frame Hash"
              value={frameHash || "--"}
            />
            <SummaryRow
              label="Determinism Sync"
              value={determinismReport ? (determinismReport.isDeterministic ? "true" : "false") : "--"}
              warning={determinismReport ? !determinismReport.isDeterministic : false}
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Energy Trend</span>
            <MiniSparkline data={deltaEHistory} />
          </div>

          {warnings.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded p-2 space-y-1">
              <div className="flex items-center gap-1 text-xs text-amber-400 font-medium">
                <AlertTriangle className="h-3 w-3" />
                Warnings
              </div>
              {warnings.map((warning, i) => (
                <div key={i} className="text-xs text-amber-300/80 pl-4">
                  - {warning}
                </div>
              ))}
            </div>
          )}

          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-1 text-xs font-medium text-muted-foreground hover:text-foreground">
              <span>Advanced Metrics</span>
              {advancedOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-2">
              {internalsData && (
                <>
                  <div className="space-y-0.5">
                    <SummaryRow
                      label="Curvature Min"
                      value={formatValue(internalsData.curvatureStats.min)}
                    />
                    <SummaryRow
                      label="Curvature Max"
                      value={formatValue(internalsData.curvatureStats.max)}
                    />
                    <SummaryRow
                      label="Gradient Min"
                      value={formatValue(internalsData.gradientMagnitudeStats.min)}
                    />
                    <SummaryRow
                      label="Gradient Max"
                      value={formatValue(internalsData.gradientMagnitudeStats.max)}
                    />
                    <SummaryRow
                      label="Laplacian Mean"
                      value={formatValue(internalsData.laplacianMean)}
                    />
                    <SummaryRow
                      label="Grid Mean"
                      value={formatValue(internalsData.gridStats.mean)}
                    />
                    <SummaryRow
                      label="Grid Std"
                      value={formatValue(internalsData.gridStats.std)}
                    />
                    <SummaryRow
                      label="Basin Count"
                      value={String(internalsData.basinCount)}
                    />
                  </div>
                  
                  {internalsData.frameHashHistory.length > 0 && (
                    <div className="pt-1">
                      <div className="text-xs text-muted-foreground mb-1">Last 20 Frame Hashes</div>
                      <div className="max-h-24 overflow-y-auto bg-muted/10 rounded p-1.5 space-y-0.5">
                        {internalsData.frameHashHistory.slice().reverse().map((hash, i) => (
                          <div key={i} className="text-xs font-mono text-foreground/80">
                            {hash}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CollapsibleContent>
          </Collapsible>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
