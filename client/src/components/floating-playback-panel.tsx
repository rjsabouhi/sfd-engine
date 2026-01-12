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
  pinnedPosition?: { x: number; y: number } | null;
  onPinnedPositionChange?: (pos: { x: number; y: number } | null) => void;
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
  pinnedPosition: externalPinnedPosition,
  onPinnedPositionChange,
}: FloatingPlaybackPanelProps) {
  // Use external pinned position if provided (lifted state), otherwise manage locally
  const [localPinnedPosition, setLocalPinnedPosition] = useState<{ x: number; y: number } | null>(null);
  const pinnedPosition = externalPinnedPosition !== undefined ? externalPinnedPosition : localPinnedPosition;
  const setPinnedPosition = onPinnedPositionChange || setLocalPinnedPosition;
  const isPinned = pinnedPosition !== null;
  const [hasDragged, setHasDragged] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef({ x: 80, y: 50 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });

  // Reposition when anchor rect is provided (on open)
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

  // Reset hasDragged when panel is closed (but keep pinned state)
  useEffect(() => {
    if (!isVisible) {
      setHasDragged(false);
    }
  }, [isVisible]);

  const handlePin = () => {
    if (isPinned) {
      setPinnedPosition(null);
    } else {
      setPinnedPosition(positionRef.current);
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
      isDraggingRef.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

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
        className="rounded-lg"
        style={{
          backgroundColor: 'rgba(23, 23, 23, 0.90)',
          border: `1px solid ${isPinned ? 'rgba(251, 191, 36, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
          boxShadow: isPinned ? '0 8px 32px rgba(251, 191, 36, 0.15)' : '0 8px 32px rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div 
          className="flex items-center justify-between px-3 py-1.5 border-b border-white/10 cursor-move select-none"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-1.5">
            <GripVertical className="h-3 w-3 text-neutral-500" />
            <Play className="h-3 w-3 text-cyan-400" />
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
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-5 w-5 rounded-full text-neutral-500 hover:text-neutral-300"
              data-testid="playback-close"
            >
              <X className="h-3 w-3" />
            </Button>
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

            <Button
              variant="ghost"
              size="icon"
              onClick={handleJumpBack}
              className="h-7 w-7 rounded-full"
              data-testid="playback-jump-back"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>

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

            <Button
              variant="ghost"
              size="icon"
              onClick={handleJumpForward}
              className="h-7 w-7 rounded-full"
              data-testid="playback-jump-forward"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
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
            <div className="border-l border-white/10 pl-2 ml-1">
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
