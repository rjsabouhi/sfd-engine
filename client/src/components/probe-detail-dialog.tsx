import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Target, Trash2, Flag, MapPin, TrendingUp, TrendingDown, Minus, Compass, X, GripVertical, Pin } from "lucide-react";
import { useState, useRef, useCallback, useEffect } from "react";
import type { SavedProbe, ProbeData } from "@shared/schema";

interface PanelRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface ProbeDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  probe: SavedProbe | null;
  liveData: ProbeData | null;
  currentStep: number;
  onSetBaseline: (id: string | null) => void;
  onRemoveProbe: (id: string) => void;
  getNeighborhoodData?: (x: number, y: number) => NeighborhoodData | null;
  zIndex?: number;
  onFocus?: () => void;
  // Inspector panel rect for 25% max overlap constraint
  inspectorRect?: PanelRect | null;
}

export interface NeighborhoodData {
  localMin: number;
  localMax: number;
  localMean: number;
  localStd: number;
  gradientAngle: number;
  gradientMagnitude: number;
  anisotropy: number;
}

const DEFAULT_WIDTH = 300;
const DEFAULT_HEIGHT = 420;
const MIN_WIDTH = 260;
const MAX_WIDTH = 500;
const MIN_HEIGHT = 300;
const MAX_HEIGHT = 600;

export function ProbeDetailDialog({
  isOpen,
  onClose,
  probe,
  liveData,
  currentStep,
  onSetBaseline,
  onRemoveProbe,
  getNeighborhoodData,
  zIndex = 60,
  onFocus,
  inspectorRect = null,
}: ProbeDetailDialogProps) {
  const [isPinned, setIsPinned] = useState(false);
  const [pinnedPosition, setPinnedPosition] = useState<{ x: number; y: number } | null>(null);
  const [size, setSize] = useState({ width: MIN_WIDTH, height: MIN_HEIGHT });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef({ x: 100, y: 100 });
  const isDraggingRef = useRef(false);
  const isResizingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const hasPositionedRef = useRef(false);

  // Calculate overlap area between two rects
  const getOverlapArea = useCallback((x: number, y: number, w: number, h: number, panel: PanelRect): number => {
    const overlapLeft = Math.max(x, panel.left);
    const overlapRight = Math.min(x + w, panel.left + panel.width);
    const overlapTop = Math.max(y, panel.top);
    const overlapBottom = Math.min(y + h, panel.top + panel.height);
    
    if (overlapRight <= overlapLeft || overlapBottom <= overlapTop) {
      return 0; // No overlap
    }
    
    return (overlapRight - overlapLeft) * (overlapBottom - overlapTop);
  }, []);

  // Check if overlap with inspector is within 25% limit
  const isOverlapAcceptable = useCallback((x: number, y: number, w: number, h: number): boolean => {
    if (!inspectorRect) return true; // No inspector, any position is fine
    
    const inspectorArea = inspectorRect.width * inspectorRect.height;
    const overlapArea = getOverlapArea(x, y, w, h, inspectorRect);
    const overlapRatio = overlapArea / inspectorArea;
    
    return overlapRatio <= 0.25; // Max 25% overlap
  }, [inspectorRect, getOverlapArea]);

  // Find position with max 25% inspector overlap - tries nearby positions first
  const findClearPosition = useCallback((preferredX: number, preferredY: number, w: number, h: number): { x: number; y: number } => {
    const padding = 20;
    const headerHeight = 60;
    
    const clamp = (x: number, y: number) => ({
      x: Math.max(padding, Math.min(window.innerWidth - w - padding, x)),
      y: Math.max(headerHeight, Math.min(window.innerHeight - h - padding, y))
    });
    
    // Try preferred position first
    const preferred = clamp(preferredX, preferredY);
    if (isOverlapAcceptable(preferred.x, preferred.y, w, h)) {
      return preferred;
    }
    
    // Generate candidate positions in expanding rings from preferred
    const candidates: { x: number; y: number; dist: number }[] = [];
    const steps = [30, 60, 90, 120, 150]; // Distance increments
    const angles = [0, 45, 90, 135, 180, 225, 270, 315]; // 8 directions
    
    for (const step of steps) {
      for (const angle of angles) {
        const rad = (angle * Math.PI) / 180;
        const testX = preferredX + Math.cos(rad) * step;
        const testY = preferredY + Math.sin(rad) * step;
        const clamped = clamp(testX, testY);
        
        if (isOverlapAcceptable(clamped.x, clamped.y, w, h)) {
          const dist = Math.sqrt(Math.pow(clamped.x - preferredX, 2) + Math.pow(clamped.y - preferredY, 2));
          candidates.push({ ...clamped, dist });
        }
      }
    }
    
    // Return closest acceptable position
    if (candidates.length > 0) {
      candidates.sort((a, b) => a.dist - b.dist);
      return { x: candidates[0].x, y: candidates[0].y };
    }
    
    // Fallback: find position with minimal overlap ratio
    let bestPos = preferred;
    let bestOverlapRatio = 1;
    
    for (const step of [50, 100, 150, 200]) {
      for (const angle of angles) {
        const rad = (angle * Math.PI) / 180;
        const testX = preferredX + Math.cos(rad) * step;
        const testY = preferredY + Math.sin(rad) * step;
        const clamped = clamp(testX, testY);
        
        if (inspectorRect) {
          const overlapArea = getOverlapArea(clamped.x, clamped.y, w, h, inspectorRect);
          const overlapRatio = overlapArea / (inspectorRect.width * inspectorRect.height);
          if (overlapRatio < bestOverlapRatio) {
            bestOverlapRatio = overlapRatio;
            bestPos = clamped;
          }
        }
      }
    }
    
    return bestPos;
  }, [isOverlapAcceptable, getOverlapArea, inspectorRect]);

  useEffect(() => {
    if (isOpen && containerRef.current && !hasPositionedRef.current) {
      // Calculate preferred position (center-ish)
      const preferredX = Math.max(20, (window.innerWidth - size.width) / 2);
      const preferredY = Math.max(60, window.innerHeight * 0.15);
      
      // Find a position that doesn't overlap with other panels
      const { x, y } = findClearPosition(preferredX, preferredY, size.width, size.height);
      
      positionRef.current = { x, y };
      containerRef.current.style.left = `${x}px`;
      containerRef.current.style.top = `${y}px`;
      hasPositionedRef.current = true;
    }
  }, [isOpen, size.width, size.height, findClearPosition]);

  useEffect(() => {
    if (!isOpen) {
      hasPositionedRef.current = false;
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && containerRef.current && isPinned && pinnedPosition) {
      positionRef.current = pinnedPosition;
      containerRef.current.style.left = `${pinnedPosition.x}px`;
      containerRef.current.style.top = `${pinnedPosition.y}px`;
    }
  }, [isOpen, isPinned, pinnedPosition]);

  const handlePin = () => {
    if (isPinned) {
      setIsPinned(false);
      setPinnedPosition(null);
    } else {
      setIsPinned(true);
      setPinnedPosition(positionRef.current);
    }
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: positionRef.current.x,
      posY: positionRef.current.y,
    };
    onFocus?.();
  }, [onFocus]);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    isResizingRef.current = true;
    resizeStartRef.current = { x: e.clientX, y: e.clientY, width: size.width, height: size.height };
    e.stopPropagation();
    e.preventDefault();
    onFocus?.();
  }, [size, onFocus]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingRef.current && containerRef.current) {
        const deltaX = e.clientX - dragStartRef.current.x;
        const deltaY = e.clientY - dragStartRef.current.y;
        
        const newX = Math.max(0, Math.min(
          dragStartRef.current.posX + deltaX,
          window.innerWidth - size.width
        ));
        const newY = Math.max(0, Math.min(
          dragStartRef.current.posY + deltaY,
          window.innerHeight - 100
        ));
        
        positionRef.current = { x: newX, y: newY };
        containerRef.current.style.left = `${newX}px`;
        containerRef.current.style.top = `${newY}px`;
        
        if (isPinned) {
          setPinnedPosition({ x: newX, y: newY });
        }
      }
      
      if (isResizingRef.current) {
        const dx = e.clientX - resizeStartRef.current.x;
        const dy = e.clientY - resizeStartRef.current.y;
        setSize({
          width: Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, resizeStartRef.current.width + dx)),
          height: Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, resizeStartRef.current.height + dy)),
        });
      }
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      isResizingRef.current = false;
    };

    if (isOpen) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isOpen, isPinned, size.width]);

  if (!isOpen || !probe) return null;

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
    if (Math.abs(delta) < 0.0001) return <Minus className="h-2.5 w-2.5 text-neutral-500" />;
    return delta > 0 
      ? <TrendingUp className="h-2.5 w-2.5 text-emerald-400" />
      : <TrendingDown className="h-2.5 w-2.5 text-red-400" />;
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
    <div
      ref={containerRef}
      className="fixed select-none"
      style={{
        left: positionRef.current.x,
        top: positionRef.current.y,
        zIndex,
      }}
      onMouseDown={() => onFocus?.()}
      data-testid="probe-detail-panel"
    >
      <div
        className="rounded-lg relative"
        style={{
          backgroundColor: 'rgba(23, 23, 23, 0.95)',
          border: `1px solid ${isPinned ? 'rgba(251, 191, 36, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
          boxShadow: isPinned ? '0 8px 32px rgba(251, 191, 36, 0.15)' : '0 8px 32px rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(12px)',
          width: size.width,
          height: size.height,
        }}
      >
        {/* Header - Draggable */}
        <div
          className="flex items-center justify-between px-3 py-1.5 border-b border-white/10 cursor-move select-none"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-1.5">
            <GripVertical className="h-3 w-3 text-neutral-500" />
            <div 
              className="w-5 h-5 rounded-full flex items-center justify-center border"
              style={{ 
                borderColor: probe.color,
                backgroundColor: `${probe.color}22`,
              }}
            >
              <span className="text-[9px] font-bold" style={{ color: probe.color }}>
                {probe.label.replace('P', '')}
              </span>
            </div>
            <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-wide">{probe.label} Detail</span>
            {probe.isBaseline && (
              <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/50 text-[8px] px-1 py-0 h-4">
                BASE
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePin}
                  className={`h-5 w-5 rounded-full ${isPinned ? 'text-amber-400' : 'text-neutral-500 hover:text-neutral-300'}`}
                  data-testid="probe-detail-pin"
                >
                  <Pin className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {isPinned ? 'Unpin Position' : 'Pin Position'}
              </TooltipContent>
            </Tooltip>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-5 w-5 rounded-full text-neutral-500 hover:text-neutral-300"
              data-testid="probe-detail-close"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div 
          className="overflow-y-auto px-3 py-2 space-y-2"
          style={{ height: `calc(${size.height}px - 36px)` }}
        >
          {/* Position & Metadata */}
          <div className="flex items-center justify-between text-[9px] text-neutral-500">
            <span className="font-mono text-neutral-300">({probe.x}, {probe.y})</span>
            <span className="flex items-center gap-1">
              <MapPin className="h-2.5 w-2.5" />
              Step {probe.createdAtStep} • {stepsSinceCreation} ago
            </span>
          </div>

          <Separator className="bg-white/10" />

          {/* Live Values Section */}
          <div>
            <span className="text-[10px] text-neutral-500 uppercase tracking-wide block mb-1.5">Current Values</span>
            {liveData ? (
              <div className="grid grid-cols-2 gap-1.5">
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
              <div className="bg-white/5 rounded p-2 text-center">
                <p className="text-[9px] text-neutral-500 italic">No live data available</p>
              </div>
            )}
          </div>

          <Separator className="bg-white/10" />

          {/* Neighborhood Analysis */}
          <div>
            <span className="text-[10px] text-neutral-500 uppercase tracking-wide block mb-1.5">Neighborhood Analysis</span>
            {neighborhoodData ? (
              <div className="grid grid-cols-2 gap-1.5">
                <div className="bg-white/5 rounded p-1.5">
                  <span className="text-[8px] text-neutral-500 block">Local Range</span>
                  <span className="font-mono text-[10px] text-neutral-300">
                    {formatValue(neighborhoodData.localMin, 2)} → {formatValue(neighborhoodData.localMax, 2)}
                  </span>
                </div>
                <div className="bg-white/5 rounded p-1.5">
                  <span className="text-[8px] text-neutral-500 block">Mean ± Std</span>
                  <span className="font-mono text-[10px] text-neutral-300">
                    {formatValue(neighborhoodData.localMean, 2)} ± {formatValue(neighborhoodData.localStd, 2)}
                  </span>
                </div>
                <div className="bg-white/5 rounded p-1.5 flex items-center gap-1.5">
                  <Compass className="h-3 w-3 text-cyan-400" />
                  <div>
                    <span className="text-[8px] text-neutral-500 block">Gradient Dir</span>
                    <span className="font-mono text-[10px] text-neutral-300">
                      {getGradientDirection(neighborhoodData.gradientAngle)} ({(neighborhoodData.gradientAngle * 180 / Math.PI).toFixed(0)}°)
                    </span>
                  </div>
                </div>
                <div className="bg-white/5 rounded p-1.5">
                  <span className="text-[8px] text-neutral-500 block">Anisotropy</span>
                  <span className="font-mono text-[10px] text-neutral-300">
                    {formatValue(neighborhoodData.anisotropy, 2)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-white/5 rounded p-2 text-center">
                <p className="text-[9px] text-neutral-500">Extended analysis available when running</p>
              </div>
            )}
          </div>

          {/* Basin Info */}
          {liveData && liveData.basinId !== null && (
            <>
              <Separator className="bg-white/10" />
              <div>
                <span className="text-[10px] text-neutral-500 uppercase tracking-wide block mb-1.5">Basin Membership</span>
                <div className="bg-white/5 rounded p-1.5 flex items-center gap-2">
                  <Target className="h-3 w-3 text-purple-400" />
                  <span className="font-mono text-[10px] text-neutral-300">
                    Basin #{liveData.basinId}
                  </span>
                  {baselineData && baselineData.basinId !== liveData.basinId && (
                    <Badge variant="outline" className="bg-orange-500/20 text-orange-400 border-orange-500/50 text-[8px] ml-auto">
                      from #{baselineData.basinId}
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
              onClick={() => onSetBaseline(probe.isBaseline ? null : probe.id)}
              className={`flex-1 text-[10px] h-7 ${probe.isBaseline ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'border-white/20 text-neutral-300'}`}
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
              className="border-red-500/30 text-red-400 hover:bg-red-500/20 h-7"
              data-testid="probe-detail-delete"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Resize Handle */}
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-center justify-center"
          onMouseDown={handleResizeMouseDown}
          data-testid="probe-detail-resize"
        >
          <svg 
            width="10" 
            height="10" 
            viewBox="0 0 10 10" 
            className="text-neutral-500 hover:text-neutral-300"
          >
            <path 
              d="M9 1L1 9M9 5L5 9M9 9L9 9" 
              stroke="currentColor" 
              strokeWidth="1.5" 
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
    </div>
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
    <div className="bg-white/5 rounded p-1.5">
      <span className="text-[8px] text-neutral-500 block">{label}</span>
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] text-neutral-300">{value}</span>
        {hasBaseline && getTrendIcon(numValue, baseline)}
      </div>
      {hasBaseline && (
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={`text-[8px] font-mono ${numValue >= baseline ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatDelta(numValue, baseline)}
          </span>
          <span className="text-[8px] text-neutral-500">
            ({formatPercent(numValue, baseline)})
          </span>
        </div>
      )}
    </div>
  );
}
