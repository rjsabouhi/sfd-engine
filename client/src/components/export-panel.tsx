import { Button } from "@/components/ui/button";
import { Image, FileJson, Film, FileCode, Archive, Table, Video, Layers } from "lucide-react";

interface ExportPanelProps {
  onExportPNG: () => void;
  onExportJSON: () => void;
  onExportGIF: () => void;
  onExportNumPy?: () => void;
  onExportBatchSpec?: () => void;
  onExportPython?: () => void;
  onExportOperators?: () => void;
  onExportLayers?: () => void;
  onExportArchive?: () => void;
  onExportWebM?: () => void;
  isRecording?: boolean;
  isExporting?: boolean;
}

export function ExportPanel({ 
  onExportPNG, 
  onExportJSON, 
  onExportGIF, 
  onExportNumPy,
  onExportBatchSpec,
  onExportPython,
  onExportOperators,
  onExportLayers,
  onExportArchive,
  onExportWebM,
  isRecording,
  isExporting 
}: ExportPanelProps) {
  return (
    <div className="space-y-2" data-testid="panel-export">
      <div className="flex flex-wrap gap-2">
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
          {isRecording ? "Rec..." : "GIF"}
        </Button>
        {onExportWebM && (
          <Button
            variant="outline"
            size="sm"
            onClick={onExportWebM}
            disabled={isExporting}
            data-testid="button-export-webm"
          >
            <Video className="h-3.5 w-3.5 mr-1.5" />
            WebM
          </Button>
        )}
      </div>
      
      <div className="flex flex-wrap gap-2">
        {onExportNumPy && (
          <Button
            variant="outline"
            size="sm"
            onClick={onExportNumPy}
            data-testid="button-export-numpy"
          >
            <Table className="h-3.5 w-3.5 mr-1.5" />
            .npy
          </Button>
        )}
        {onExportPython && (
          <Button
            variant="outline"
            size="sm"
            onClick={onExportPython}
            data-testid="button-export-python"
          >
            <FileCode className="h-3.5 w-3.5 mr-1.5" />
            .py
          </Button>
        )}
        {onExportOperators && (
          <Button
            variant="outline"
            size="sm"
            onClick={onExportOperators}
            data-testid="button-export-operators"
          >
            <Table className="h-3.5 w-3.5 mr-1.5" />
            Ops
          </Button>
        )}
        {onExportLayers && (
          <Button
            variant="outline"
            size="sm"
            onClick={onExportLayers}
            data-testid="button-export-layers"
          >
            <Layers className="h-3.5 w-3.5 mr-1.5" />
            Layers
          </Button>
        )}
      </div>
      
      <div className="flex flex-wrap gap-2">
        {onExportBatchSpec && (
          <Button
            variant="outline"
            size="sm"
            onClick={onExportBatchSpec}
            data-testid="button-export-batch"
          >
            <FileJson className="h-3.5 w-3.5 mr-1.5" />
            Batch
          </Button>
        )}
        {onExportArchive && (
          <Button
            variant="outline"
            size="sm"
            onClick={onExportArchive}
            data-testid="button-export-archive"
          >
            <Archive className="h-3.5 w-3.5 mr-1.5" />
            Archive
          </Button>
        )}
      </div>
    </div>
  );
}
