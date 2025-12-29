import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { SkipBack, SkipForward, History } from "lucide-react";

interface TemporalControlsProps {
  historyLength: number;
  currentIndex: number;
  isPlaybackMode: boolean;
  isRunning: boolean;
  onStepBackward: () => void;
  onStepForward: () => void;
  onSeek: (index: number) => void;
  onExitPlayback: () => void;
}

export function TemporalControls({
  historyLength,
  currentIndex,
  isPlaybackMode,
  isRunning,
  onStepBackward,
  onStepForward,
  onSeek,
  onExitPlayback,
}: TemporalControlsProps) {
  if (historyLength === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={onStepBackward}
          disabled={isRunning || currentIndex <= 0}
          data-testid="button-step-backward"
        >
          <SkipBack className="h-4 w-4" />
        </Button>
        
        <div className="flex-1 px-2">
          <Slider
            value={[currentIndex]}
            min={0}
            max={Math.max(0, historyLength - 1)}
            step={1}
            onValueChange={([v]) => onSeek(v)}
            disabled={isRunning}
            data-testid="slider-timeline"
          />
        </div>
        
        <Button
          variant="outline"
          size="icon"
          onClick={onStepForward}
          disabled={isRunning || currentIndex >= historyLength - 1}
          data-testid="button-step-forward"
        >
          <SkipForward className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Frame {currentIndex + 1} / {historyLength}</span>
        {isPlaybackMode && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onExitPlayback}
            className="h-6 text-xs"
            data-testid="button-exit-playback"
          >
            <History className="h-3 w-3 mr-1" />
            Exit Playback
          </Button>
        )}
      </div>
    </div>
  );
}
