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
  const hasHistory = historyLength > 0;
  
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={onStepBackward}
          disabled={!hasHistory || isRunning || currentIndex <= 0}
          data-testid="button-step-backward"
        >
          <SkipBack className="h-4 w-4" />
        </Button>
        
        <div className="flex-1 px-2">
          <Slider
            value={[hasHistory ? currentIndex : 0]}
            min={0}
            max={Math.max(0, historyLength - 1)}
            step={1}
            onValueChange={([v]) => onSeek(v)}
            disabled={!hasHistory || isRunning}
            data-testid="slider-timeline"
          />
        </div>
        
        <Button
          variant="outline"
          size="icon"
          onClick={onStepForward}
          disabled={!hasHistory || isRunning || currentIndex >= historyLength - 1}
          data-testid="button-step-forward"
        >
          <SkipForward className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Frame {hasHistory ? currentIndex + 1 : 0} / {hasHistory ? historyLength : 0}</span>
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
