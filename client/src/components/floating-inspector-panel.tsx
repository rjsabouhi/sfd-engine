import { Button } from "@/components/ui/button";
import {
  Eye,
  X,
  GripVertical,
  Pin,
  Target,
  Trash2,
  Star,
  MapPin,
  ExternalLink,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useState, useRef, useCallback, useEffect } from "react";
import type { ProbeData, SavedProbe } from "@shared/schema";
import type { ModeLabels } from "@/lib/interpretation-modes";

const PROBE_COLORS = [
  "#10b981", // emerald
  "#f59e0b", // amber
  "#3b82f6", // blue
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#84cc16", // lime
];

interface FloatingInspectorPanelProps {
  isVisible: boolean;
  probeData: ProbeData | null;
  modeLabels: ModeLabels;
  onClose: () => void;
  zIndex?: number;
  onFocus?: () => void;
  anchorRect?: DOMRect | null;
  savedProbes: SavedProbe[];
  onRemoveProbe: (id: string) => void;
  onSetBaseline: (id: string | null) => void;
  onSelectProbe: (probe: SavedProbe) => void;
  onOpenProbeDetail: (probe: SavedProbe) => void;
  currentStep: number;
  getProbeDataAt: (x: number, y: number) => ProbeData | null;
  // Lifted pinned state for persistence across view switches
  isPinned?: boolean;
  pinnedPosition?: { x: number; y: number } | null;
  onPinnedChange?: (isPinned: boolean, position: { x: number; y: number } | null) => void;
}

const PANEL_WIDTH = 280;
const GAP_FROM_MENUBAR = 8;

export function FloatingInspectorPanel({
  isVisible,
  probeData,
  modeLabels,
  onClose,
  zIndex = 50,
  onFocus,
  anchorRect,
  savedProbes,
  onRemoveProbe,
  onSetBaseline,
  onSelectProbe,
  onOpenProbeDetail,
  currentStep,
  getProbeDataAt,
  isPinned: isPinnedProp,
  pinnedPosition: pinnedPositionProp,
  onPinnedChange,
}: FloatingInspectorPanelProps) {
  // Use lifted state if provided, otherwise use local state
  const [localIsPinned, setLocalIsPinned] = useState(false);
  const [localPinnedPosition, setLocalPinnedPosition] = useState<{ x: number; y: number } | null>(null);
  const isPinned = isPinnedProp !== undefined ? isPinnedProp : localIsPinned;
  const pinnedPosition = pinnedPositionProp !== undefined ? pinnedPositionProp : localPinnedPosition;
  const [hasDragged, setHasDragged] = useState(false);
  const [selectedProbeId, setSelectedProbeId] = useState<string | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  // Initialize positionRef with pinned position if available
  const positionRef = useRef(pinnedPosition || { x: 80, y: 50 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  // Track last anchorRect to avoid repositioning on same anchor
  const lastAnchorRectRef = useRef<DOMRect | null>(null);

  // Sync positionRef when pinnedPosition changes from parent
  useEffect(() => {
    if (isPinned && pinnedPosition) {
      positionRef.current = pinnedPosition;
    }
  }, [isPinned, pinnedPosition]);

  // Reposition when anchor rect is provided (on open) - but NEVER reposition pinned panels
  useEffect(() => {
    if (isVisible && containerRef.current) {
      // If pinned, always use pinned position and skip anchor logic entirely
      if (isPinned && pinnedPosition) {
        positionRef.current = pinnedPosition;
        containerRef.current.style.left = `${pinnedPosition.x}px`;
        containerRef.current.style.top = `${pinnedPosition.y}px`;
        return;
      }
      
      // Only reposition based on anchor if not dragged and anchor changed
      if (anchorRect && !hasDragged) {
        const anchorChanged = !lastAnchorRectRef.current || 
          lastAnchorRectRef.current.left !== anchorRect.left ||
          lastAnchorRectRef.current.top !== anchorRect.top;
        
        if (anchorChanged) {
          lastAnchorRectRef.current = anchorRect;
          const x = Math.max(8, Math.min(
            anchorRect.left + anchorRect.width / 2 - PANEL_WIDTH / 2,
            window.innerWidth - PANEL_WIDTH - 8
          ));
          const y = anchorRect.bottom + GAP_FROM_MENUBAR;
          positionRef.current = { x, y };
          containerRef.current.style.left = `${x}px`;
          containerRef.current.style.top = `${y}px`;
        }
      }
    }
  }, [anchorRect, isVisible, hasDragged, isPinned, pinnedPosition]);

  // Reset hasDragged when panel is closed (but keep pinned state)
  useEffect(() => {
    if (!isVisible) {
      setHasDragged(false);
      lastAnchorRectRef.current = null;
    }
  }, [isVisible]);

  const handlePin = () => {
    if (isPinned) {
      if (onPinnedChange) {
        onPinnedChange(false, null);
      } else {
        setLocalIsPinned(false);
        setLocalPinnedPosition(null);
      }
    } else {
      if (onPinnedChange) {
        onPinnedChange(true, positionRef.current);
      } else {
        setLocalIsPinned(true);
        setLocalPinnedPosition(positionRef.current);
      }
    }
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    setHasDragged(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: positionRef.current.x,
      posY: positionRef.current.y,
    };
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !containerRef.current) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      const newX = dragStartRef.current.posX + dx;
      const newY = dragStartRef.current.posY + dy;
      positionRef.current = { x: newX, y: newY };
      containerRef.current.style.left = `${newX}px`;
      containerRef.current.style.top = `${newY}px`;
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        // If pinned, update the pinned position to the new dragged location
        if (isPinned && onPinnedChange) {
          onPinnedChange(true, { x: positionRef.current.x, y: positionRef.current.y });
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPinned, onPinnedChange]);

  if (!isVisible) return null;

  const baselineProbe = savedProbes.find(p => p.isBaseline);
  const baselineSnapshot = baselineProbe?.baselineSnapshot || null;

  const formatDelta = (current: number, baseline: number | undefined | null) => {
    if (baseline === undefined || baseline === null) return null;
    const delta = current - baseline;
    const sign = delta >= 0 ? '+' : '';
    return `${sign}${delta.toFixed(3)}`;
  };

  return (
    <div 
      ref={containerRef}
      className="fixed"
      style={{ left: positionRef.current.x, top: positionRef.current.y, zIndex }}
      onMouseDown={() => onFocus?.()}
      data-testid="floating-inspector-panel"
    >
      <div 
        className={`rounded-lg bg-sidebar/95 backdrop-blur-md ${isPinned ? 'border border-amber-500/30 shadow-[0_8px_32px_rgba(251,191,36,0.15)]' : 'border border-sidebar-border shadow-lg'}`}
        style={{ width: PANEL_WIDTH, maxHeight: '70vh' }}
      >
        <div 
          className="flex items-center justify-between px-3 py-1.5 border-b border-sidebar-border cursor-move select-none"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-1.5">
            <GripVertical className="h-3 w-3 text-neutral-500" />
            <Eye className="h-3 w-3 text-purple-400" />
            <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-wide">Multi-Point Inspector</span>
          </div>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePin}
                  className={`h-5 w-5 rounded-full ${isPinned ? 'text-amber-400' : 'text-neutral-500 hover:text-neutral-300'}`}
                  data-testid="inspector-pin"
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
              data-testid="inspector-close"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(70vh - 40px)' }}>
          <div className="px-3 py-2 border-b border-sidebar-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-neutral-500 uppercase tracking-wide">Current Hover</span>
            </div>
            
            {probeData ? (
              <div className="bg-white/5 rounded p-2">
                <div className="flex items-center gap-2 mb-1.5">
                  <Target className="h-3 w-3 text-emerald-400" />
                  <span className="text-[10px] font-mono text-neutral-300">
                    ({probeData.x}, {probeData.y})
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[9px]">
                  <span className="text-neutral-500">Value</span>
                  <span className="font-mono text-right text-neutral-300">{probeData.value.toFixed(4)}</span>
                  <span className="text-neutral-500">{modeLabels.operators.curvature.split(' ')[0]}</span>
                  <span className="font-mono text-right text-neutral-300">{probeData.curvature.toFixed(4)}</span>
                  <span className="text-neutral-500">{modeLabels.operators.tension.split(' ')[0]}</span>
                  <span className="font-mono text-right text-neutral-300">{probeData.tension.toFixed(4)}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-3">
                <MapPin className="h-5 w-5 text-neutral-600 mx-auto mb-1" />
                <p className="text-[9px] text-neutral-500">Hover over field to probe</p>
              </div>
            )}
          </div>
          
          <div className="px-3 py-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-neutral-500 uppercase tracking-wide">
                Saved Probes ({savedProbes.length})
              </span>
            </div>
            
            {savedProbes.length === 0 ? (
              <div className="text-center py-4 bg-white/5 rounded">
                <Target className="h-5 w-5 text-neutral-600 mx-auto mb-1" />
                <p className="text-[9px] text-neutral-500">
                  Click on field to save probes
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {savedProbes.map((probe) => {
                  const liveData = getProbeDataAt(probe.x, probe.y);
                  const isSelected = selectedProbeId === probe.id;
                  
                  return (
                    <div
                      key={probe.id}
                      className={`rounded p-2 cursor-pointer transition-colors ${
                        isSelected ? 'bg-white/15 ring-1 ring-white/20' : 'bg-white/5 hover:bg-white/10'
                      }`}
                      onClick={() => {
                        setSelectedProbeId(isSelected ? null : probe.id);
                        onSelectProbe(probe);
                        onOpenProbeDetail(probe);
                      }}
                      data-testid={`saved-probe-${probe.id}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <div 
                            className="w-2.5 h-2.5 rounded-full" 
                            style={{ backgroundColor: probe.color }}
                          />
                          <span className="text-[10px] font-medium text-neutral-300">{probe.label}</span>
                          {probe.isBaseline && (
                            <Star className="h-2.5 w-2.5 text-amber-400 fill-amber-400" />
                          )}
                        </div>
                        <div className="flex items-center gap-0.5">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenProbeDetail(probe);
                                }}
                                className="h-4 w-4 rounded text-neutral-500 hover:text-cyan-400"
                                data-testid={`probe-detail-${probe.id}`}
                              >
                                <ExternalLink className="h-2.5 w-2.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">View Details</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSetBaseline(probe.isBaseline ? null : probe.id);
                                }}
                                className={`h-4 w-4 rounded ${probe.isBaseline ? 'text-amber-400' : 'text-neutral-500 hover:text-amber-400'}`}
                                data-testid={`probe-baseline-${probe.id}`}
                              >
                                <Star className="h-2.5 w-2.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              {probe.isBaseline ? 'Remove Baseline' : 'Set as Baseline'}
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRemoveProbe(probe.id);
                                }}
                                className="h-4 w-4 rounded text-neutral-500 hover:text-red-400"
                                data-testid={`probe-remove-${probe.id}`}
                              >
                                <Trash2 className="h-2.5 w-2.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">Remove Probe</TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                      
                      <div className="text-[9px] font-mono text-neutral-500 mb-1">
                        ({probe.x}, {probe.y}) • Step {probe.createdAtStep}
                      </div>
                      
                      {liveData && (
                        <div className="grid grid-cols-3 gap-1 text-[8px]">
                          <div className="bg-black/30 rounded px-1 py-0.5">
                            <span className="text-neutral-500 block">Val</span>
                            <span className="text-neutral-300 font-mono">{liveData.value.toFixed(2)}</span>
                            {baselineSnapshot && !probe.isBaseline && (
                              <span className={`block font-mono ${liveData.value >= baselineSnapshot.value ? 'text-emerald-400' : 'text-red-400'}`}>
                                {formatDelta(liveData.value, baselineSnapshot.value)}
                              </span>
                            )}
                          </div>
                          <div className="bg-black/30 rounded px-1 py-0.5">
                            <span className="text-neutral-500 block">Curv</span>
                            <span className="text-neutral-300 font-mono">{liveData.curvature.toFixed(2)}</span>
                          </div>
                          <div className="bg-black/30 rounded px-1 py-0.5">
                            <span className="text-neutral-500 block">Grad</span>
                            <span className="text-neutral-300 font-mono">{liveData.gradientMagnitude.toFixed(2)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
