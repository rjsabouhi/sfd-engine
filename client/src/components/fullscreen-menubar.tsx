import { useState, useRef, useCallback } from "react";
import {
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarItem,
  MenubarSeparator,
  MenubarSub,
  MenubarSubTrigger,
  MenubarSubContent,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarLabel,
} from "@/components/ui/menubar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Play,
  RotateCcw,
  Minimize2,
  Zap,
  Gauge,
  Palette,
  Layers,
  Columns2,
  Download,
  Image,
  FileJson,
  FileVideo,
  FileSpreadsheet,
  FileCode,
  Package,
  BookOpen,
  Info,
  Sliders,
  ChevronDown,
  Compass,
  Eye,
} from "lucide-react";
import type { SimulationParameters, SimulationState } from "@shared/schema";
import { structuralPresets, defaultParameters } from "@shared/schema";
import { visualPresets } from "@/config/visual-presets";
import type { OverlayType } from "@/components/dual-field-view";
import { OVERLAY_OPTIONS } from "@/components/dual-field-view";
import sfdLogo from "@assets/generated_images/3x3_grid_shimmer_logo.png";

interface FullscreenMenuBarProps {
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  state: SimulationState;
  params: SimulationParameters;
  colormap: "inferno" | "viridis" | "cividis";
  derivedType: OverlayType;
  showDualView: boolean;
  blendMode: boolean;
  blendOpacity: number;
  fieldInspectorEnabled: boolean;
  trajectoryProbeActive: boolean;
  perturbMode: boolean;
  diagnosticsVisible: boolean;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  onStep: () => void;
  onStepBackward: () => void;
  onStepForward: () => void;
  onColormapChange: (colormap: "inferno" | "viridis" | "cividis") => void;
  onDerivedTypeChange: (type: OverlayType) => void;
  onShowDualViewChange: (show: boolean) => void;
  onBlendModeChange: (enabled: boolean) => void;
  onBlendOpacityChange: (opacity: number) => void;
  onFieldInspectorChange: (enabled: boolean) => void;
  onTrajectoryProbeChange: (enabled: boolean) => void;
  onPerturbModeChange: (enabled: boolean) => void;
  onDiagnosticsChange: (visible: boolean) => void;
  onParamsChange: (params: Partial<SimulationParameters>) => void;
  onVisualPresetApply: (presetIndex: number) => void;
  onExportPNG: () => void;
  onExportJSON: () => void;
  onExportAnimation: () => void;
  onExportSimulationData: () => void;
  onExportMetrics: () => void;
  onExportStateSnapshot: () => void;
  onExportNumPy?: () => void;
  onExportBatchSpec?: () => void;
  onExportPython?: () => void;
  onExportOperators?: () => void;
  onExportLayers?: () => void;
  onExportArchive?: () => void;
  onExportWebM?: () => void;
  onShowIntro: () => void;
  onOpenParameterPanel?: () => void;
  playbackPanelOpen?: boolean;
  onTogglePlaybackPanel?: (rect?: DOMRect) => void;
  perturbPanelOpen?: boolean;
  onTogglePerturbPanel?: (rect?: DOMRect) => void;
  onDiagnosticsChangeWithRect?: (visible: boolean, rect?: DOMRect) => void;
  inspectorPanelOpen?: boolean;
  onToggleInspectorPanel?: (rect?: DOMRect) => void;
  exportDialogOpen?: boolean;
  onToggleExportDialog?: () => void;
}

export function FullscreenMenuBar({
  isFullscreen,
  onToggleFullscreen,
  state,
  params,
  colormap,
  derivedType,
  showDualView,
  blendMode,
  blendOpacity,
  fieldInspectorEnabled,
  trajectoryProbeActive,
  perturbMode,
  diagnosticsVisible,
  onPlay,
  onPause,
  onReset,
  onStep,
  onStepBackward,
  onStepForward,
  onColormapChange,
  onDerivedTypeChange,
  onShowDualViewChange,
  onBlendModeChange,
  onBlendOpacityChange,
  onFieldInspectorChange,
  onTrajectoryProbeChange,
  onPerturbModeChange,
  onDiagnosticsChange,
  onParamsChange,
  onVisualPresetApply,
  onExportPNG,
  onExportJSON,
  onExportAnimation,
  onExportSimulationData,
  onExportMetrics,
  onExportStateSnapshot,
  onExportNumPy,
  onExportBatchSpec,
  onExportPython,
  onExportOperators,
  onExportLayers,
  onExportArchive,
  onExportWebM,
  onShowIntro,
  onOpenParameterPanel,
  playbackPanelOpen,
  onTogglePlaybackPanel,
  perturbPanelOpen,
  onTogglePerturbPanel,
  onDiagnosticsChangeWithRect,
  inspectorPanelOpen,
  onToggleInspectorPanel,
  exportDialogOpen,
  onToggleExportDialog,
}: FullscreenMenuBarProps) {
  const [aboutOpen, setAboutOpen] = useState(false);
  const [selectedRegime, setSelectedRegime] = useState<string>("");
  
  const playbackButtonRef = useRef<HTMLButtonElement>(null);
  const diagnosticsButtonRef = useRef<HTMLButtonElement>(null);
  const perturbButtonRef = useRef<HTMLButtonElement>(null);
  const inspectorButtonRef = useRef<HTMLButtonElement>(null);
  
  const handleTogglePlayback = useCallback(() => {
    const rect = playbackButtonRef.current?.getBoundingClientRect();
    onTogglePlaybackPanel?.(rect);
  }, [onTogglePlaybackPanel]);
  
  const handleToggleDiagnostics = useCallback(() => {
    const rect = diagnosticsButtonRef.current?.getBoundingClientRect();
    if (onDiagnosticsChangeWithRect) {
      onDiagnosticsChangeWithRect(!diagnosticsVisible, rect);
    } else {
      onDiagnosticsChange(!diagnosticsVisible);
    }
  }, [diagnosticsVisible, onDiagnosticsChange, onDiagnosticsChangeWithRect]);
  
  const handleTogglePerturb = useCallback(() => {
    const rect = perturbButtonRef.current?.getBoundingClientRect();
    onTogglePerturbPanel?.(rect);
  }, [onTogglePerturbPanel]);
  
  const handleToggleInspector = useCallback(() => {
    const rect = inspectorButtonRef.current?.getBoundingClientRect();
    onToggleInspectorPanel?.(rect);
  }, [onToggleInspectorPanel]);

  const currentOverlayLabel = OVERLAY_OPTIONS.find(o => o.value === derivedType)?.label || "Constraint Layer";

  return (
    <div className="relative flex items-center justify-center gap-1 px-2 py-1 bg-card/95 backdrop-blur-sm border-b border-border">
      <div className="absolute left-2">
        <img src={sfdLogo} alt="SFD" className="w-6 h-6 rounded" />
      </div>
      
      {/* === TOOLS GROUP === */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            ref={playbackButtonRef}
            variant="ghost"
            size="sm"
            onClick={handleTogglePlayback}
            className={`h-6 text-xs px-2 ${playbackPanelOpen ? 'bg-accent text-accent-foreground' : ''}`}
            data-testid="button-simulation-panel"
          >
            <Play className="h-3 w-3 mr-1" />
            Simulation
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">Playback Controls</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            ref={inspectorButtonRef}
            variant="ghost"
            size="sm"
            onClick={handleToggleInspector}
            className={`h-6 text-xs px-2 ${inspectorPanelOpen ? 'bg-accent text-accent-foreground' : ''}`}
            data-testid="button-field-inspector-inspection"
          >
            <Eye className="h-3 w-3 mr-1" />
            Inspector
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">Toggle Inspector Panel</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            ref={diagnosticsButtonRef}
            variant="ghost"
            size="sm"
            onClick={handleToggleDiagnostics}
            className={`h-6 text-xs px-2 ${diagnosticsVisible ? 'bg-accent text-accent-foreground' : ''}`}
            data-testid="button-diagnostics"
          >
            <Gauge className="h-3 w-3 mr-1" />
            Diagnostics
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">Toggle Diagnostics Panel</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            ref={perturbButtonRef}
            variant="ghost"
            size="sm"
            onClick={handleTogglePerturb}
            className={`h-6 text-xs px-2 ${perturbPanelOpen ? 'bg-accent text-accent-foreground' : ''}`}
            data-testid="button-perturbation"
          >
            <Zap className="h-3 w-3 mr-1" />
            Perturb
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">Toggle Perturbation Mode</TooltipContent>
      </Tooltip>

      <div className="w-px h-4 bg-border mx-1" />

      {/* === VISUAL EFFECTS GROUP === */}
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs px-2 gap-1"
                data-testid="dropdown-regimes"
              >
                <Compass className="h-3 w-3" />
                Regimes
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">Regimes</TooltipContent>
        </Tooltip>
        <DropdownMenuContent className="bg-popover border-border min-w-[180px] z-[200]">
          <DropdownMenuRadioGroup 
            value={selectedRegime}
            onValueChange={(value) => {
              setSelectedRegime(value);
              const preset = structuralPresets[value];
              if (preset) {
                onParamsChange(preset);
              }
            }}
          >
            {Object.entries(structuralPresets).map(([key]) => (
              <DropdownMenuRadioItem 
                key={key} 
                value={key}
                className="text-xs cursor-pointer"
                data-testid={`regime-${key}`}
              >
                {key.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {showDualView && (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs px-2 gap-1"
                data-testid="dropdown-projection-layer"
              >
                <Layers className="h-3 w-3" />
                <span>Layers</span>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-popover border-border max-h-64 overflow-y-auto z-[200]">
              <DropdownMenuRadioGroup value={derivedType} onValueChange={(v) => onDerivedTypeChange(v as OverlayType)}>
                {OVERLAY_OPTIONS.map((option) => (
                  <DropdownMenuRadioItem key={option.value} value={option.value} className="text-xs">
                    {option.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center gap-2 px-2">
            <span className="text-[10px] text-muted-foreground">Blend</span>
            <Slider
              min={0}
              max={100}
              step={1}
              value={[blendOpacity * 100]}
              onValueChange={(v) => {
                onBlendOpacityChange(v[0] / 100);
                if (v[0] > 0 && !blendMode) onBlendModeChange(true);
              }}
              className="w-20"
              data-testid="slider-blend"
            />
            <span className="text-[10px] text-muted-foreground w-6 text-right font-mono">{Math.round(blendOpacity * 100)}%</span>
          </div>
        </>
      )}

      {/* === RIGHT SIDE: Export + Dashboard === */}
      <div className="absolute right-2 flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleExportDialog}
              className={`h-6 text-xs px-2 ${exportDialogOpen ? 'bg-accent text-accent-foreground' : ''}`}
              data-testid="button-export-dialog"
            >
              <Download className="h-3 w-3 mr-1" />
              Export
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">Export Options</TooltipContent>
        </Tooltip>

        <div className="w-px h-4 bg-border mx-1" />

        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleFullscreen}
          className="h-6 px-2 text-xs"
          data-testid="button-exit-focus"
        >
          <Minimize2 className="h-3.5 w-3.5 mr-1" />
          Dashboard
        </Button>
      </div>

      <Dialog open={aboutOpen} onOpenChange={setAboutOpen}>
        <DialogContent className="max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <img src={sfdLogo} alt="SFD" className="w-8 h-8 rounded" />
              About Structural Field Dynamics
            </DialogTitle>
            <DialogDescription className="pt-4 space-y-3 text-sm">
              <p>
                Structural Field Dynamics (SFD) is a geometric model of complex
                adaptive systems. This simulation demonstrates operator-driven
                field evolution on a 2D manifold.
              </p>
              <p><strong>The Five Operators:</strong></p>
              <ul className="list-disc pl-4 space-y-1">
                <li><strong>Curvature (K)</strong> — Responds to local curvature via discrete Laplacian</li>
                <li><strong>Gradient-Tension (T)</strong> — Drives tension waves based on gradient magnitude</li>
                <li><strong>Neighbor-Coupling (C)</strong> — Creates local clustering through Gaussian blur</li>
                <li><strong>Attractor-Formation (A)</strong> — Forms threshold-like basin structures</li>
                <li><strong>Global Redistribution (R)</strong> — Maintains coherence through mean-field shift</li>
              </ul>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}
