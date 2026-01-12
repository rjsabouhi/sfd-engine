import { Button } from "@/components/ui/button";
import {
  Eye,
  X,
  GripVertical,
  Pin,
  Target,
  Lock,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useState, useRef, useCallback, useEffect } from "react";
import type { ProbeData } from "@shared/schema";
import type { ModeLabels } from "@/lib/interpretation-modes";

interface FloatingInspectorPanelProps {
  isVisible: boolean;
  probeData: ProbeData | null;
  modeLabels: ModeLabels;
  onClose: () => void;
  zIndex?: number;
  onFocus?: () => void;
  anchorRect?: DOMRect | null;
}

const PANEL_WIDTH = 220;
const GAP_FROM_MENUBAR = 8;

export function FloatingInspectorPanel({
  isVisible,
  probeData,
  modeLabels,
  onClose,
  zIndex = 50,
  onFocus,
  anchorRect,
}: FloatingInspectorPanelProps) {
  const [isPinned, setIsPinned] = useState(false);
  const [pinnedPosition, setPinnedPosition] = useState<{ x: number; y: number } | null>(null);
  const [hasDragged, setHasDragged] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockedData, setLockedData] = useState<ProbeData | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef({ x: 80, y: 50 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });

  useEffect(() => {
    if (isVisible && containerRef.current) {
      let newPos: { x: number; y: number } | null = null;
      
      if (isPinned && pinnedPosition) {
        newPos = pinnedPosition;
      } else if (anchorRect && !hasDragged) {
        const x = Math.max(8, Math.min(
          anchorRect.left + anchorRect.width / 2 - PANEL_WIDTH / 2,
          window.innerWidth - PANEL_WIDTH - 8
        ));
        const y = anchorRect.bottom + GAP_FROM_MENUBAR;
        newPos = { x, y };
      }
      
      if (newPos) {
        positionRef.current = newPos;
        containerRef.current.style.left = `${newPos.x}px`;
        containerRef.current.style.top = `${newPos.y}px`;
      }
    }
  }, [anchorRect, isVisible, hasDragged, isPinned, pinnedPosition]);

  useEffect(() => {
    if (!isVisible) {
      setHasDragged(false);
      setIsLocked(false);
      setLockedData(null);
    }
  }, [isVisible]);

  const handlePin = () => {
    if (isPinned) {
      setIsPinned(false);
      setPinnedPosition(null);
    } else {
      setIsPinned(true);
      setPinnedPosition(positionRef.current);
    }
  };

  const handleLock = () => {
    if (isLocked) {
      setIsLocked(false);
      setLockedData(null);
    } else {
      setIsLocked(true);
      setLockedData(probeData);
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
      isDraggingRef.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  if (!isVisible) return null;

  const displayData = isLocked ? lockedData : probeData;

  return (
    <div 
      ref={containerRef}
      className="fixed"
      style={{ left: positionRef.current.x, top: positionRef.current.y, zIndex }}
      onMouseDown={() => onFocus?.()}
      data-testid="floating-inspector-panel"
    >
      <div 
        className="rounded-lg"
        style={{
          backgroundColor: 'rgba(23, 23, 23, 0.90)',
          border: `1px solid ${isPinned ? 'rgba(251, 191, 36, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
          boxShadow: isPinned ? '0 8px 32px rgba(251, 191, 36, 0.15)' : '0 8px 32px rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(12px)',
          width: PANEL_WIDTH,
        }}
      >
        <div 
          className="flex items-center justify-between px-3 py-1.5 border-b border-white/10 cursor-move select-none"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-1.5">
            <GripVertical className="h-3 w-3 text-neutral-500" />
            <Eye className="h-3 w-3 text-emerald-400" />
            <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-wide">Inspector</span>
          </div>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLock}
                  className={`h-5 w-5 rounded-full ${isLocked ? 'text-cyan-400' : 'text-neutral-500 hover:text-neutral-300'}`}
                  data-testid="inspector-lock"
                >
                  <Lock className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {isLocked ? 'Unlock Values' : 'Lock Current Values'}
              </TooltipContent>
            </Tooltip>
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
        
        <div className="px-3 py-2">
          {displayData ? (
            <>
              <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-white/10">
                <Target className="h-3 w-3 text-emerald-400" />
                <span className="text-[10px] font-mono text-neutral-300">
                  ({displayData.x}, {displayData.y})
                </span>
                {isLocked && (
                  <span className="text-[9px] text-cyan-400 ml-auto uppercase tracking-wide">Locked</span>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10px]">
                <span className="text-neutral-500">Value</span>
                <span className="font-mono text-right text-neutral-300">{displayData.value.toFixed(4)}</span>
                
                <span className="text-neutral-500">{modeLabels.operators.curvature.split(' ')[0]}</span>
                <span className="font-mono text-right text-neutral-300">{displayData.curvature.toFixed(4)}</span>
                
                <span className="text-neutral-500">{modeLabels.operators.tension.split(' ')[0]}</span>
                <span className="font-mono text-right text-neutral-300">{displayData.tension.toFixed(4)}</span>
                
                <span className="text-neutral-500">{modeLabels.operators.coupling.split(' ')[0]}</span>
                <span className="font-mono text-right text-neutral-300">{displayData.coupling.toFixed(4)}</span>
                
                <span className="text-neutral-500">Gradient</span>
                <span className="font-mono text-right text-neutral-300">{displayData.gradientMagnitude.toFixed(4)}</span>
                
                <span className="text-neutral-500">Variance</span>
                <span className="font-mono text-right text-neutral-300">{displayData.neighborhoodVariance.toFixed(4)}</span>
                
                {displayData.basinId !== null && (
                  <>
                    <span className="text-neutral-500">Basin</span>
                    <span className="font-mono text-right text-neutral-300">{displayData.basinId}</span>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <Eye className="h-6 w-6 text-neutral-600 mx-auto mb-2" />
              <p className="text-[10px] text-neutral-500">
                Hover over the field to inspect values
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
