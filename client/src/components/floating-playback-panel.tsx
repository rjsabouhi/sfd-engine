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
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useState, useRef, useCallback } from "react";

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
}

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
}: FloatingPlaybackPanelProps) {
  const [position, setPosition] = useState({ x: 80, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number } | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: position.x,
      initialY: position.y,
    };
  }, [position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPosition({
      x: dragRef.current.initialX + dx,
      y: dragRef.current.initialY + dy,
    });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    dragRef.current = null;
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
      className="fixed z-50"
      style={{ left: position.x, top: position.y }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      data-testid="floating-playback-panel"
    >
      <div className="bg-card/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl">
        <div 
          className="flex items-center justify-between px-3 py-1.5 border-b border-border cursor-move select-none"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-1.5">
            <GripVertical className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Playback</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-5 w-5 rounded-full"
            data-testid="playback-close"
          >
            <X className="h-3 w-3" />
          </Button>
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
            <span className="text-[10px] font-mono text-muted-foreground w-7 text-right">
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
            <span className="text-[10px] font-mono text-muted-foreground w-7">
              {historyLength}
            </span>
            <div className="border-l border-border pl-2 ml-1">
              <div className="text-center">
                <span className="text-xs font-mono text-foreground">{currentStep}</span>
                <span className="text-[8px] text-muted-foreground ml-1">step</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
