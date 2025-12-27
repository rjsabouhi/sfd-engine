import { Button } from "@/components/ui/button";
import { Image, FileJson, Film } from "lucide-react";

interface ExportPanelProps {
  onExportPNG: () => void;
  onExportJSON: () => void;
  onExportGIF: () => void;
  isRecording?: boolean;
}

export function ExportPanel({ onExportPNG, onExportJSON, onExportGIF, isRecording }: ExportPanelProps) {
  return (
    <div className="flex flex-wrap gap-2" data-testid="panel-export">
      <Button
        variant="outline"
        size="sm"
        onClick={onExportPNG}
        data-testid="button-export-png"
      >
        <Image className="h-3.5 w-3.5 mr-1.5" />
        PNG
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onExportJSON}
        data-testid="button-export-json"
      >
        <FileJson className="h-3.5 w-3.5 mr-1.5" />
        JSON
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onExportGIF}
        disabled={isRecording}
        data-testid="button-export-gif"
      >
        <Film className="h-3.5 w-3.5 mr-1.5" />
        {isRecording ? "Recording..." : "GIF"}
      </Button>
    </div>
  );
}
