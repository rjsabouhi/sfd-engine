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
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface FloatingPlaybackPanelProps {
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
}

export function FloatingPlaybackPanel({
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
}: FloatingPlaybackPanelProps) {
  const handleSliderChange = (value: number[]) => {
    onSeekFrame(value[0]);
  };

  const handleJumpBack = () => {
    onSeekFrame(Math.max(0, currentHistoryIndex - 10));
  };

  const handleJumpForward = () => {
    onSeekFrame(Math.min(historyLength - 1, currentHistoryIndex + 10));
  };

  return (
    <div 
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2"
      data-testid="floating-playback-panel"
    >
      <div className="bg-gray-900/95 backdrop-blur-xl border border-white/15 rounded-2xl px-4 py-3 shadow-2xl">
        <div className="flex items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onReset}
                className="h-9 w-9 rounded-full hover:bg-white/10 text-white/70 hover:text-white"
                data-testid="playback-reset"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">Reset</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleJumpBack}
                className="h-8 w-8 rounded-full hover:bg-white/10 text-white/60 hover:text-white"
                data-testid="playback-jump-back"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">Jump -10</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onStepBackward}
                className="h-9 w-9 rounded-full hover:bg-white/10 text-white/70 hover:text-white"
                data-testid="playback-step-back"
              >
                <SkipBack className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">Step Back</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={isRunning ? onPause : onPlay}
                className="h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white"
                data-testid="playback-play-pause"
              >
                {isRunning ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5 ml-0.5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {isRunning ? "Pause (Space)" : "Play (Space)"}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onStepForward}
                className="h-9 w-9 rounded-full hover:bg-white/10 text-white/70 hover:text-white"
                data-testid="playback-step-forward"
              >
                <SkipForward className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">Step Forward</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleJumpForward}
                className="h-8 w-8 rounded-full hover:bg-white/10 text-white/60 hover:text-white"
                data-testid="playback-jump-forward"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">Jump +10</TooltipContent>
          </Tooltip>

          <div className="w-px h-6 bg-white/20 mx-1" />

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-white/50 w-8 text-right">
              {currentHistoryIndex + 1}
            </span>
            <div className="w-32">
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
            <span className="text-[10px] font-mono text-white/50 w-8">
              {historyLength}
            </span>
          </div>

          <div className="w-px h-6 bg-white/20 mx-1" />

          <div className="flex flex-col items-center">
            <span className="text-xs font-mono text-white/80">{currentStep}</span>
            <span className="text-[8px] text-white/40 uppercase tracking-wide">Step</span>
          </div>
        </div>
      </div>
    </div>
  );
}
