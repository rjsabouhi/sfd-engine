import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  X,
  GripVertical,
  Pin,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useState, useRef, useCallback, useEffect } from "react";

interface FloatingPlaybackPanelProps {
  isVisible: boolean;
  isRunning: boolean;
  currentStep: number;
  historyLength: number;
  currentHistoryIndex: number;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  onStepBackward: () => void;
  onStepForward: () => void;
  onSeekFrame: (index: number) => void;
  onClose: () => void;
  zIndex?: number;
  onFocus?: () => void;
  anchorRect?: DOMRect | null;
  // Lifted pinned state for persistence across view switches
  isPinned?: boolean;
  pinnedPosition?: { x: number; y: number } | null;
  onPinnedChange?: (isPinned: boolean, position: { x: number; y: number } | null) => void;
}

const PANEL_WIDTH = 260;
const GAP_FROM_MENUBAR = 8;

export function FloatingPlaybackPanel({
  isVisible,
  isRunning,
  currentStep,
  historyLength,
  currentHistoryIndex,
  onPlay,
  onPause,
  onReset,
  onStepBackward,
  onStepForward,
  onSeekFrame,
  onClose,
  zIndex = 50,
  onFocus,
  anchorRect,
  isPinned: isPinnedProp,
  pinnedPosition: pinnedPositionProp,
  onPinnedChange,
}: FloatingPlaybackPanelProps) {
  // Use lifted state if provided, otherwise use local state
  const [localIsPinned, setLocalIsPinned] = useState(false);
  const [localPinnedPosition, setLocalPinnedPosition] = useState<{ x: number; y: number } | null>(null);
  const isPinned = isPinnedProp !== undefined ? isPinnedProp : localIsPinned;
  const pinnedPosition = pinnedPositionProp !== undefined ? pinnedPositionProp : localPinnedPosition;
  const [hasDragged, setHasDragged] = useState(false);
  
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

  // Use window-level event listeners for smooth dragging with refs
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

  const handleSliderChange = (value: number[]) => {
    onSeekFrame(value[0]);
  };

  const handleJumpBack = () => {
    onSeekFrame(Math.max(0, currentHistoryIndex - 10));
  };

  const handleJumpForward = () => {
    onSeekFrame(Math.min(historyLength - 1, currentHistoryIndex + 10));
  };

  if (!isVisible) return null;

  return (
    <div 
      ref={containerRef}
      className="fixed"
      style={{ left: positionRef.current.x, top: positionRef.current.y, zIndex }}
      onMouseDown={() => onFocus?.()}
      data-testid="floating-playback-panel"
    >
      <div 
        className={`rounded-lg bg-sidebar/95 backdrop-blur-md ${isPinned ? 'border border-amber-500/30 shadow-[0_8px_32px_rgba(251,191,36,0.15)]' : 'border border-sidebar-border shadow-lg'}`}
      >
        <div 
          className="flex items-center justify-between px-3 py-1.5 border-b border-sidebar-border cursor-move select-none"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-1.5">
            <GripVertical className="h-3 w-3 text-neutral-500" />
            <Play className="h-3 w-3 text-green-400" />
            <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-wide">Playback</span>
          </div>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePin}
                  className={`h-5 w-5 rounded-full ${isPinned ? 'text-amber-400' : 'text-neutral-500 hover:text-neutral-300'}`}
                  data-testid="playback-pin"
                >
                  <Pin className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {isPinned ? 'Unpin Position' : 'Pin Position'}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-5 w-5 rounded-full text-neutral-500 hover:text-neutral-300"
                  data-testid="playback-close"
                >
                  <X className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Close panel</TooltipContent>
            </Tooltip>
          </div>
        </div>
        
        <div className="px-3 py-2">
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onReset}
                  className="h-8 w-8 rounded-full"
                  data-testid="playback-reset"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Reset</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleJumpBack}
                  className="h-7 w-7 rounded-full"
                  data-testid="playback-jump-back"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Jump back 10 frames</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onStepBackward}
                  className="h-8 w-8 rounded-full"
                  data-testid="playback-step-back"
                >
                  <SkipBack className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Step Back</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={isRunning ? onPause : onPlay}
                  className="h-10 w-10 rounded-full bg-accent"
                  data-testid="playback-play-pause"
                >
                  {isRunning ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4 ml-0.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {isRunning ? "Pause (Space)" : "Play (Space)"}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onStepForward}
                  className="h-8 w-8 rounded-full"
                  data-testid="playback-step-forward"
                >
                  <SkipForward className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Step Forward</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleJumpForward}
                  className="h-7 w-7 rounded-full"
                  data-testid="playback-jump-forward"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Jump forward 10 frames</TooltipContent>
            </Tooltip>
          </div>

          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] font-mono text-neutral-500 w-7 text-right">
              {currentHistoryIndex + 1}
            </span>
            <div className="flex-1 min-w-[100px]">
              <Slider
                min={0}
                max={Math.max(0, historyLength - 1)}
                step={1}
                value={[currentHistoryIndex]}
                onValueChange={handleSliderChange}
                className="cursor-pointer"
                data-testid="playback-scrubber"
              />
            </div>
            <span className="text-[10px] font-mono text-neutral-500 w-7">
              {historyLength}
            </span>
            <div className="border-l border-sidebar-border pl-2 ml-1">
              <div className="text-center">
                <span className="text-xs font-mono text-neutral-200">{currentStep}</span>
                <span className="text-[8px] text-neutral-500 ml-1">step</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
