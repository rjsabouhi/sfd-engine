import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Target, Trash2, Flag, MapPin, TrendingUp, TrendingDown, Minus, ArrowRight, Compass } from "lucide-react";
import type { SavedProbe, ProbeData } from "@shared/schema";

interface ProbeDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  probe: SavedProbe | null;
  liveData: ProbeData | null;
  currentStep: number;
  onSetBaseline: (id: string | null) => void;
  onRemoveProbe: (id: string) => void;
  getNeighborhoodData?: (x: number, y: number) => NeighborhoodData | null;
}

export interface NeighborhoodData {
  localMin: number;
  localMax: number;
  localMean: number;
  localStd: number;
  gradientAngle: number; // in radians
  gradientMagnitude: number;
  anisotropy: number; // ratio of major/minor gradient components
}

export function ProbeDetailDialog({
  isOpen,
  onClose,
  probe,
  liveData,
  currentStep,
  onSetBaseline,
  onRemoveProbe,
  getNeighborhoodData,
}: ProbeDetailDialogProps) {
  if (!probe) return null;

  const baselineData = probe.baselineSnapshot;
  const neighborhoodData = getNeighborhoodData ? getNeighborhoodData(probe.x, probe.y) : null;

  const formatValue = (val: number, decimals: number = 4) => val.toFixed(decimals);
  
  const formatDelta = (current: number, baseline: number) => {
    const delta = current - baseline;
    const sign = delta >= 0 ? '+' : '';
    return `${sign}${delta.toFixed(4)}`;
  };

  const formatPercent = (current: number, baseline: number) => {
    if (Math.abs(baseline) < 0.0001) return 'N/A';
    const pct = ((current - baseline) / Math.abs(baseline)) * 100;
    const sign = pct >= 0 ? '+' : '';
    return `${sign}${pct.toFixed(1)}%`;
  };

  const getTrendIcon = (current: number, baseline: number) => {
    const delta = current - baseline;
    if (Math.abs(delta) < 0.0001) return <Minus className="h-3 w-3 text-neutral-500" />;
    return delta > 0 
      ? <TrendingUp className="h-3 w-3 text-emerald-400" />
      : <TrendingDown className="h-3 w-3 text-red-400" />;
  };

  const getGradientDirection = (angle: number) => {
    const deg = (angle * 180 / Math.PI + 360) % 360;
    if (deg < 22.5 || deg >= 337.5) return 'E';
    if (deg < 67.5) return 'NE';
    if (deg < 112.5) return 'N';
    if (deg < 157.5) return 'NW';
    if (deg < 202.5) return 'W';
    if (deg < 247.5) return 'SW';
    if (deg < 292.5) return 'S';
    return 'SE';
  };

  const stepsSinceCreation = currentStep - probe.createdAtStep;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-gray-900 border-white/10 text-white max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center border-2"
              style={{ 
                borderColor: probe.color,
                backgroundColor: `${probe.color}22`,
              }}
            >
              <span className="text-sm font-bold" style={{ color: probe.color }}>
                {probe.label.replace('P', '')}
              </span>
            </div>
            <div className="flex-1">
              <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                {probe.label}
                {probe.isBaseline && (
                  <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/50 text-[10px]">
                    BASELINE
                  </Badge>
                )}
              </DialogTitle>
              <p className="text-xs text-neutral-400 font-mono">
                Position: ({probe.x}, {probe.y})
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Metadata */}
          <div className="flex items-center gap-4 text-[11px] text-neutral-400">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              Created at step {probe.createdAtStep}
            </span>
            <span className="text-neutral-600">|</span>
            <span>{stepsSinceCreation} steps ago</span>
          </div>

          <Separator className="bg-white/10" />

          {/* Live Values Section */}
          <div>
            <h4 className="text-[10px] uppercase tracking-wide text-neutral-500 mb-2">Current Values</h4>
            {liveData ? (
              <div className="grid grid-cols-2 gap-2">
                <MetricCard 
                  label="Field Value" 
                  value={formatValue(liveData.value)} 
                  baseline={baselineData?.value}
                  formatDelta={formatDelta}
                  formatPercent={formatPercent}
                  getTrendIcon={getTrendIcon}
                />
                <MetricCard 
                  label="Curvature (κ)" 
                  value={formatValue(liveData.curvature)} 
                  baseline={baselineData?.curvature}
                  formatDelta={formatDelta}
                  formatPercent={formatPercent}
                  getTrendIcon={getTrendIcon}
                />
                <MetricCard 
                  label="Tension (τ)" 
                  value={formatValue(liveData.tension)} 
                  baseline={baselineData?.tension}
                  formatDelta={formatDelta}
                  formatPercent={formatPercent}
                  getTrendIcon={getTrendIcon}
                />
                <MetricCard 
                  label="Coupling (ψ)" 
                  value={formatValue(liveData.coupling)} 
                  baseline={baselineData?.coupling}
                  formatDelta={formatDelta}
                  formatPercent={formatPercent}
                  getTrendIcon={getTrendIcon}
                />
                <MetricCard 
                  label="Gradient |∇|" 
                  value={formatValue(liveData.gradientMagnitude)} 
                  baseline={baselineData?.gradientMagnitude}
                  formatDelta={formatDelta}
                  formatPercent={formatPercent}
                  getTrendIcon={getTrendIcon}
                />
                <MetricCard 
                  label="Variance (σ²)" 
                  value={formatValue(liveData.neighborhoodVariance)} 
                  baseline={baselineData?.neighborhoodVariance}
                  formatDelta={formatDelta}
                  formatPercent={formatPercent}
                  getTrendIcon={getTrendIcon}
                />
              </div>
            ) : (
              <p className="text-sm text-neutral-500 italic">No live data available</p>
            )}
          </div>

          <Separator className="bg-white/10" />

          {/* Neighborhood Analysis */}
          <div>
            <h4 className="text-[10px] uppercase tracking-wide text-neutral-500 mb-2">Neighborhood Analysis</h4>
            {neighborhoodData ? (
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white/5 rounded p-2">
                  <span className="text-[9px] text-neutral-500 block">Local Range</span>
                  <span className="font-mono text-sm text-neutral-200">
                    {formatValue(neighborhoodData.localMin, 2)} → {formatValue(neighborhoodData.localMax, 2)}
                  </span>
                </div>
                <div className="bg-white/5 rounded p-2">
                  <span className="text-[9px] text-neutral-500 block">Local Mean ± Std</span>
                  <span className="font-mono text-sm text-neutral-200">
                    {formatValue(neighborhoodData.localMean, 2)} ± {formatValue(neighborhoodData.localStd, 2)}
                  </span>
                </div>
                <div className="bg-white/5 rounded p-2 flex items-center gap-2">
                  <Compass className="h-4 w-4 text-cyan-400" />
                  <div>
                    <span className="text-[9px] text-neutral-500 block">Gradient Direction</span>
                    <span className="font-mono text-sm text-neutral-200">
                      {getGradientDirection(neighborhoodData.gradientAngle)} ({(neighborhoodData.gradientAngle * 180 / Math.PI).toFixed(0)}°)
                    </span>
                  </div>
                </div>
                <div className="bg-white/5 rounded p-2">
                  <span className="text-[9px] text-neutral-500 block">Anisotropy</span>
                  <span className="font-mono text-sm text-neutral-200">
                    {formatValue(neighborhoodData.anisotropy, 2)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-white/5 rounded p-3 text-center">
                <p className="text-[11px] text-neutral-500">
                  Extended neighborhood analysis available when simulation is running
                </p>
              </div>
            )}
          </div>

          {/* Basin Info */}
          {liveData && liveData.basinId !== null && (
            <>
              <Separator className="bg-white/10" />
              <div>
                <h4 className="text-[10px] uppercase tracking-wide text-neutral-500 mb-2">Basin Membership</h4>
                <div className="bg-white/5 rounded p-2 flex items-center gap-2">
                  <Target className="h-4 w-4 text-purple-400" />
                  <span className="font-mono text-sm text-neutral-200">
                    Basin #{liveData.basinId}
                  </span>
                  {baselineData && baselineData.basinId !== liveData.basinId && (
                    <Badge variant="outline" className="bg-orange-500/20 text-orange-400 border-orange-500/50 text-[9px] ml-auto">
                      Changed from #{baselineData.basinId}
                    </Badge>
                  )}
                </div>
              </div>
            </>
          )}

          <Separator className="bg-white/10" />

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onSetBaseline(probe.isBaseline ? null : probe.id);
              }}
              className={`flex-1 text-xs ${probe.isBaseline ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'border-white/20 text-neutral-300'}`}
              data-testid="probe-detail-set-baseline"
            >
              <Flag className="h-3 w-3 mr-1" />
              {probe.isBaseline ? 'Clear Baseline' : 'Set as Baseline'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onRemoveProbe(probe.id);
                onClose();
              }}
              className="border-red-500/30 text-red-400 hover:bg-red-500/20"
              data-testid="probe-detail-delete"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  baseline?: number;
  formatDelta: (current: number, baseline: number) => string;
  formatPercent: (current: number, baseline: number) => string;
  getTrendIcon: (current: number, baseline: number) => React.ReactNode;
}

function MetricCard({ label, value, baseline, formatDelta, formatPercent, getTrendIcon }: MetricCardProps) {
  const numValue = parseFloat(value);
  const hasBaseline = baseline !== undefined && baseline !== null;

  return (
    <div className="bg-white/5 rounded p-2">
      <span className="text-[9px] text-neutral-500 block">{label}</span>
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm text-neutral-200">{value}</span>
        {hasBaseline && getTrendIcon(numValue, baseline)}
      </div>
      {hasBaseline && (
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-[9px] font-mono ${numValue >= baseline ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatDelta(numValue, baseline)}
          </span>
          <span className="text-[9px] text-neutral-500">
            ({formatPercent(numValue, baseline)})
          </span>
        </div>
      )}
    </div>
  );
}
