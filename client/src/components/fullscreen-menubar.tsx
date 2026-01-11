import { useState } from "react";
import {
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarItem,
  MenubarSeparator,
  MenubarCheckboxItem,
  MenubarSub,
  MenubarSubTrigger,
  MenubarSubContent,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarShortcut,
  MenubarLabel,
} from "@/components/ui/menubar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Play,
  Pause,
  RotateCcw,
  StepForward,
  StepBack,
  Maximize2,
  Minimize2,
  Eye,
  Crosshair,
  Zap,
  Gauge,
  Palette,
  Layers,
  Blend,
  Columns2,
  Download,
  Image,
  FileJson,
  FileVideo,
  FileSpreadsheet,
  FileCode,
  Package,
  HelpCircle,
  BookOpen,
  Info,
  Settings2,
  Sliders,
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
}: FullscreenMenuBarProps) {
  const [aboutOpen, setAboutOpen] = useState(false);

  return (
    <div className="flex items-center gap-2 px-2 py-1 bg-gray-900/95 border-b border-white/10">
      <img src={sfdLogo} alt="SFD" className="w-6 h-6 rounded" />
      
      <Menubar className="border-0 bg-transparent h-7 p-0 space-x-0">
        {/* Simulation Menu */}
        <MenubarMenu>
          <MenubarTrigger className="text-xs px-2 py-1 h-6 text-white/80 hover:text-white hover:bg-white/10 data-[state=open]:bg-white/15" data-testid="menu-simulation">
            Simulation
          </MenubarTrigger>
          <MenubarContent className="bg-gray-900 border-white/20">
            {state.isRunning ? (
              <MenubarItem onClick={onPause} className="text-xs gap-2" data-testid="menu-pause">
                <Pause className="h-3.5 w-3.5" />
                Pause
                <MenubarShortcut>Space</MenubarShortcut>
              </MenubarItem>
            ) : (
              <MenubarItem onClick={onPlay} className="text-xs gap-2" data-testid="menu-play">
                <Play className="h-3.5 w-3.5" />
                Run
                <MenubarShortcut>Space</MenubarShortcut>
              </MenubarItem>
            )}
            <MenubarItem onClick={onStep} className="text-xs gap-2" data-testid="menu-step">
              <StepForward className="h-3.5 w-3.5" />
              Step Forward
            </MenubarItem>
            <MenubarItem onClick={onStepBackward} className="text-xs gap-2" data-testid="menu-step-back">
              <StepBack className="h-3.5 w-3.5" />
              Step Backward
            </MenubarItem>
            <MenubarSeparator className="bg-white/10" />
            <MenubarItem onClick={onReset} className="text-xs gap-2" data-testid="menu-reset">
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Field
            </MenubarItem>
            <MenubarSeparator className="bg-white/10" />
            <MenubarItem onClick={onToggleFullscreen} className="text-xs gap-2" data-testid="menu-exit-fullscreen">
              <Minimize2 className="h-3.5 w-3.5" />
              Exit Focus Mode
              <MenubarShortcut>Esc</MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        {/* View Menu */}
        <MenubarMenu>
          <MenubarTrigger className="text-xs px-2 py-1 h-6 text-white/80 hover:text-white hover:bg-white/10 data-[state=open]:bg-white/15" data-testid="menu-view">
            View
          </MenubarTrigger>
          <MenubarContent className="bg-gray-900 border-white/20 min-w-[200px]">
            <MenubarCheckboxItem 
              checked={fieldInspectorEnabled} 
              onCheckedChange={onFieldInspectorChange}
              className="text-xs gap-2"
              data-testid="menu-inspector"
            >
              <Eye className="h-3.5 w-3.5 mr-1" />
              Field Inspector
            </MenubarCheckboxItem>
            <MenubarCheckboxItem 
              checked={trajectoryProbeActive} 
              onCheckedChange={onTrajectoryProbeChange}
              className="text-xs gap-2"
              data-testid="menu-probe"
            >
              <Crosshair className="h-3.5 w-3.5 mr-1" />
              Trajectory Probe
            </MenubarCheckboxItem>
            <MenubarCheckboxItem 
              checked={perturbMode} 
              onCheckedChange={onPerturbModeChange}
              className="text-xs gap-2"
              data-testid="menu-perturb"
            >
              <Zap className="h-3.5 w-3.5 mr-1" />
              Perturbation Mode
            </MenubarCheckboxItem>
            <MenubarCheckboxItem 
              checked={diagnosticsVisible} 
              onCheckedChange={onDiagnosticsChange}
              className="text-xs gap-2"
              data-testid="menu-diagnostics"
            >
              <Gauge className="h-3.5 w-3.5 mr-1" />
              Diagnostics Panel
            </MenubarCheckboxItem>
            <MenubarSeparator className="bg-white/10" />
            <MenubarCheckboxItem 
              checked={showDualView} 
              onCheckedChange={onShowDualViewChange}
              className="text-xs gap-2"
              data-testid="menu-dual-view"
            >
              <Columns2 className="h-3.5 w-3.5 mr-1" />
              Split View
            </MenubarCheckboxItem>
            <MenubarSeparator className="bg-white/10" />
            <MenubarSub>
              <MenubarSubTrigger className="text-xs gap-2">
                <Palette className="h-3.5 w-3.5" />
                Colormap
              </MenubarSubTrigger>
              <MenubarSubContent className="bg-gray-900 border-white/20">
                <MenubarRadioGroup value={colormap} onValueChange={(v) => onColormapChange(v as "viridis" | "inferno" | "cividis")}>
                  <MenubarRadioItem value="viridis" className="text-xs">Viridis</MenubarRadioItem>
                  <MenubarRadioItem value="inferno" className="text-xs">Inferno</MenubarRadioItem>
                  <MenubarRadioItem value="cividis" className="text-xs">Cividis</MenubarRadioItem>
                </MenubarRadioGroup>
              </MenubarSubContent>
            </MenubarSub>
            {showDualView && (
              <>
                <MenubarSub>
                  <MenubarSubTrigger className="text-xs gap-2">
                    <Layers className="h-3.5 w-3.5" />
                    Projection Layer
                  </MenubarSubTrigger>
                  <MenubarSubContent className="bg-gray-900 border-white/20 max-h-64 overflow-y-auto">
                    <MenubarRadioGroup value={derivedType} onValueChange={(v) => onDerivedTypeChange(v as OverlayType)}>
                      {OVERLAY_OPTIONS.map((option) => (
                        <MenubarRadioItem key={option.value} value={option.value} className="text-xs">
                          {option.label}
                        </MenubarRadioItem>
                      ))}
                    </MenubarRadioGroup>
                  </MenubarSubContent>
                </MenubarSub>
                <MenubarCheckboxItem 
                  checked={blendMode} 
                  onCheckedChange={onBlendModeChange}
                  className="text-xs gap-2"
                >
                  <Blend className="h-3.5 w-3.5 mr-1" />
                  Blend Overlay
                </MenubarCheckboxItem>
              </>
            )}
          </MenubarContent>
        </MenubarMenu>

        {/* Parameters Menu */}
        <MenubarMenu>
          <MenubarTrigger className="text-xs px-2 py-1 h-6 text-white/80 hover:text-white hover:bg-white/10 data-[state=open]:bg-white/15" data-testid="menu-parameters">
            Parameters
          </MenubarTrigger>
          <MenubarContent className="bg-gray-900 border-white/20 min-w-[220px]">
            <MenubarLabel className="text-[10px] text-white/50 uppercase tracking-wider">Structural Regimes</MenubarLabel>
            {Object.entries(structuralPresets).map(([key, preset]) => (
              <MenubarItem 
                key={key} 
                onClick={() => onParamsChange(preset)}
                className="text-xs"
                data-testid={`menu-preset-${key}`}
              >
                {key.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </MenubarItem>
            ))}
            <MenubarSeparator className="bg-white/10" />
            <MenubarLabel className="text-[10px] text-white/50 uppercase tracking-wider">Visual Styles</MenubarLabel>
            <MenubarSub>
              <MenubarSubTrigger className="text-xs">
                <Palette className="h-3.5 w-3.5 mr-2" />
                Visual Presets
              </MenubarSubTrigger>
              <MenubarSubContent className="bg-gray-900 border-white/20 max-h-72 overflow-y-auto">
                {visualPresets.map((preset, index) => (
                  <MenubarItem 
                    key={preset.id} 
                    onClick={() => onVisualPresetApply(index)}
                    className="text-xs gap-2"
                  >
                    <div 
                      className="w-3 h-3 rounded-sm" 
                      style={{ background: `linear-gradient(135deg, ${preset.previewColor1}, ${preset.previewColor2})` }}
                    />
                    {preset.label}
                  </MenubarItem>
                ))}
              </MenubarSubContent>
            </MenubarSub>
            <MenubarSeparator className="bg-white/10" />
            <MenubarItem 
              onClick={() => onParamsChange(defaultParameters)}
              className="text-xs gap-2"
              data-testid="menu-reset-params"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset to Defaults
            </MenubarItem>
            {onOpenParameterPanel && (
              <MenubarItem 
                onClick={onOpenParameterPanel}
                className="text-xs gap-2"
              >
                <Sliders className="h-3.5 w-3.5" />
                Open Parameter Panel...
              </MenubarItem>
            )}
          </MenubarContent>
        </MenubarMenu>

        {/* Export Menu */}
        <MenubarMenu>
          <MenubarTrigger className="text-xs px-2 py-1 h-6 text-white/80 hover:text-white hover:bg-white/10 data-[state=open]:bg-white/15" data-testid="menu-export">
            Export
          </MenubarTrigger>
          <MenubarContent className="bg-gray-900 border-white/20 min-w-[200px]">
            <MenubarLabel className="text-[10px] text-white/50 uppercase tracking-wider">Visual</MenubarLabel>
            <MenubarItem onClick={onExportPNG} className="text-xs gap-2" data-testid="menu-export-png">
              <Image className="h-3.5 w-3.5" />
              PNG Snapshot
            </MenubarItem>
            <MenubarItem onClick={onExportAnimation} className="text-xs gap-2" data-testid="menu-export-gif">
              <FileVideo className="h-3.5 w-3.5" />
              GIF Animation
            </MenubarItem>
            {onExportWebM && (
              <MenubarItem onClick={onExportWebM} className="text-xs gap-2" data-testid="menu-export-webm">
                <FileVideo className="h-3.5 w-3.5" />
                WebM Video
              </MenubarItem>
            )}
            <MenubarSeparator className="bg-white/10" />
            <MenubarLabel className="text-[10px] text-white/50 uppercase tracking-wider">Data</MenubarLabel>
            <MenubarItem onClick={onExportJSON} className="text-xs gap-2" data-testid="menu-export-json">
              <FileJson className="h-3.5 w-3.5" />
              Settings JSON
            </MenubarItem>
            <MenubarItem onClick={onExportSimulationData} className="text-xs gap-2" data-testid="menu-export-csv">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Simulation CSV
            </MenubarItem>
            <MenubarItem onClick={onExportMetrics} className="text-xs gap-2" data-testid="menu-export-metrics">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Metrics Log
            </MenubarItem>
            <MenubarItem onClick={onExportStateSnapshot} className="text-xs gap-2" data-testid="menu-export-state">
              <FileJson className="h-3.5 w-3.5" />
              State Snapshot
            </MenubarItem>
            {onExportNumPy && (
              <MenubarItem onClick={onExportNumPy} className="text-xs gap-2" data-testid="menu-export-numpy">
                <FileCode className="h-3.5 w-3.5" />
                NumPy Array (.npy)
              </MenubarItem>
            )}
            {onExportPython && (
              <MenubarItem onClick={onExportPython} className="text-xs gap-2" data-testid="menu-export-python">
                <FileCode className="h-3.5 w-3.5" />
                Python Script
              </MenubarItem>
            )}
            {onExportOperators && (
              <MenubarItem onClick={onExportOperators} className="text-xs gap-2" data-testid="menu-export-operators">
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Operator Contributions
              </MenubarItem>
            )}
            {onExportLayers && (
              <MenubarItem onClick={onExportLayers} className="text-xs gap-2" data-testid="menu-export-layers">
                <Layers className="h-3.5 w-3.5" />
                Layer Data
              </MenubarItem>
            )}
            {onExportBatchSpec && (
              <MenubarItem onClick={onExportBatchSpec} className="text-xs gap-2" data-testid="menu-export-batch">
                <FileJson className="h-3.5 w-3.5" />
                Batch Spec
              </MenubarItem>
            )}
            <MenubarSeparator className="bg-white/10" />
            {onExportArchive && (
              <MenubarItem onClick={onExportArchive} className="text-xs gap-2" data-testid="menu-export-archive">
                <Package className="h-3.5 w-3.5" />
                Full Archive
              </MenubarItem>
            )}
          </MenubarContent>
        </MenubarMenu>

        {/* Help Menu */}
        <MenubarMenu>
          <MenubarTrigger className="text-xs px-2 py-1 h-6 text-white/80 hover:text-white hover:bg-white/10 data-[state=open]:bg-white/15" data-testid="menu-help">
            Help
          </MenubarTrigger>
          <MenubarContent className="bg-gray-900 border-white/20">
            <MenubarItem onClick={onShowIntro} className="text-xs gap-2" data-testid="menu-show-intro">
              <BookOpen className="h-3.5 w-3.5" />
              Show Introduction
            </MenubarItem>
            <MenubarSeparator className="bg-white/10" />
            <MenubarItem onClick={() => setAboutOpen(true)} className="text-xs gap-2" data-testid="menu-about">
              <Info className="h-3.5 w-3.5" />
              About SFD Engine
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>

      <div className="flex-1" />
      
      <div className="flex items-center gap-2 text-[10px] text-white/50 font-mono">
        <span>Step: {state.step}</span>
        <span className="text-white/30">|</span>
        <span>Energy: {state.energy.toFixed(4)}</span>
        <span className="text-white/30">|</span>
        <span>Basins: {state.basinCount}</span>
        <span className="text-white/30">|</span>
        <span>{state.fps} FPS</span>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={onToggleFullscreen}
        className="h-6 px-2 text-xs text-white/70 hover:text-white hover:bg-white/10"
        data-testid="button-exit-focus"
      >
        <Minimize2 className="h-3.5 w-3.5 mr-1" />
        Exit Focus
      </Button>

      <Dialog open={aboutOpen} onOpenChange={setAboutOpen}>
        <DialogContent className="max-w-lg bg-gray-900 border-white/20">
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
