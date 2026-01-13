import { Button } from "@/components/ui/button";
import {
  X,
  Download,
  Image,
  Video,
  FileJson,
  FileText,
  Database,
  Target,
  Activity,
  Settings,
  Package,
  Loader2,
  Check,
  Camera,
  Film,
  BarChart3,
  Layers,
  Code,
  Archive,
  Share2,
  Pin,
  GripVertical,
  Lock,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useState, useRef, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import type { SFDEngine } from "@/lib/sfd-engine";
import type { StructuralEvent, SavedProbe } from "@shared/schema";
import {
  exportPNGSnapshot,
  exportPNGSnapshotDual,
  exportMobileShareSnapshot,
  saveConfiguration,
  exportSimulationData,
  exportMetricsLog,
  exportSettingsJSON,
  exportEventLog,
  exportNumPyArray,
  exportBatchSpec,
  exportOperatorContributions,
  exportPythonScript,
  exportLayersSeparate,
  exportLayersAsZip,
  exportFullArchive,
  exportVideoWebM,
  exportVideoWebMDual,
  exportVideoWebMProjection,
  type DerivedFieldType,
} from "@/lib/export-utils";

export type ExportViewType = 'main' | 'projection' | 'sideBySide';

type ExportCategory = 'visual' | 'data' | 'probes' | 'technical';

interface ExportOption {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  format: string;
  category: ExportCategory;
  action: () => Promise<boolean>;
  requires?: string;
  requiresAdvanced?: boolean;
  advancedNote?: string;
  hasViewSelector?: boolean;
  viewType?: ExportViewType;
  onViewChange?: (v: ExportViewType) => void;
}

interface FloatingExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  zIndex?: number;
  onFocus?: () => void;
  engine: SFDEngine | null;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
  basinCanvasRef?: React.RefObject<HTMLCanvasElement | null>;
  colormap: "inferno" | "viridis" | "cividis";
  regime: string;
  interpretationMode: string;
  events: StructuralEvent[];
  savedProbes: SavedProbe[];
  getProbeDataAt: (x: number, y: number) => import("@shared/schema").ProbeData | null;
  isPinned?: boolean;
  pinnedPosition?: { x: number; y: number } | null;
  onPinnedChange?: (isPinned: boolean, position: { x: number; y: number } | null) => void;
  derivedType?: DerivedFieldType;
}

const CATEGORY_INFO: Record<ExportCategory, { label: string; icon: React.ReactNode; color: string }> = {
  visual: { label: 'Visual', icon: <Image className="h-4 w-4" />, color: 'text-blue-400' },
  data: { label: 'Data', icon: <Database className="h-4 w-4" />, color: 'text-green-400' },
  probes: { label: 'Probes', icon: <Target className="h-4 w-4" />, color: 'text-purple-400' },
  technical: { label: 'Technical', icon: <Code className="h-4 w-4" />, color: 'text-orange-400' },
};

export function FloatingExportDialog({
  isOpen,
  onClose,
  zIndex = 100,
  onFocus,
  engine,
  canvasRef,
  basinCanvasRef,
  colormap,
  regime,
  interpretationMode,
  events,
  savedProbes,
  getProbeDataAt,
  isPinned: isPinnedProp,
  pinnedPosition: pinnedPositionProp,
  onPinnedChange,
  derivedType = "curvature",
}: FloatingExportDialogProps) {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<ExportCategory>('visual');
  const [loadingExport, setLoadingExport] = useState<string | null>(null);
  const [completedExports, setCompletedExports] = useState<Set<string>>(new Set());
  const [advancedMode, setAdvancedMode] = useState(false);
  const [snapshotView, setSnapshotView] = useState<ExportViewType>('main');
  const [videoView, setVideoView] = useState<ExportViewType>('main');
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Use lifted state if provided, otherwise use local state
  const [localIsPinned, setLocalIsPinned] = useState(false);
  const [localPinnedPosition, setLocalPinnedPosition] = useState<{ x: number; y: number } | null>(null);
  const isPinned = isPinnedProp !== undefined ? isPinnedProp : localIsPinned;
  const pinnedPosition = pinnedPositionProp !== undefined ? pinnedPositionProp : localPinnedPosition;
  
  const positionRef = useRef(pinnedPosition || { x: 100, y: 100 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });

  // Sync positionRef when pinnedPosition changes from parent
  useEffect(() => {
    if (isPinned && pinnedPosition) {
      positionRef.current = pinnedPosition;
    }
  }, [isPinned, pinnedPosition]);

  const handlePin = useCallback(() => {
    const newPinned = !isPinned;
    const newPosition = newPinned ? positionRef.current : null;
    if (onPinnedChange) {
      onPinnedChange(newPinned, newPosition);
    } else {
      setLocalIsPinned(newPinned);
      setLocalPinnedPosition(newPosition);
    }
  }, [isPinned, onPinnedChange]);

  const exportProbesCSV = useCallback(async (): Promise<boolean> => {
    if (savedProbes.length === 0) return false;
    
    const headers = ['id', 'x', 'y', 'color', 'value', 'curvature', 'tension', 'hasBaseline', 'baselineValue', 'delta'];
    const rows = savedProbes.map(probe => {
      const liveData = getProbeDataAt(probe.x, probe.y);
      const baselineVal = probe.baselineSnapshot?.value ?? '';
      const delta = probe.baselineSnapshot && liveData ? (liveData.value - probe.baselineSnapshot.value).toFixed(6) : '';
      return [
        probe.id,
        probe.x,
        probe.y,
        probe.color,
        liveData?.value.toFixed(6) ?? '',
        liveData?.curvature.toFixed(6) ?? '',
        liveData?.tension.toFixed(6) ?? '',
        probe.isBaseline ? 'yes' : 'no',
        baselineVal,
        delta,
      ].join(',');
    });
    
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sfd-probes-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    return true;
  }, [savedProbes, getProbeDataAt]);

  const exportProbesJSON = useCallback(async (): Promise<boolean> => {
    if (savedProbes.length === 0) return false;
    
    const probesWithLiveData = savedProbes.map(probe => {
      const liveData = getProbeDataAt(probe.x, probe.y);
      return {
        ...probe,
        liveData,
        delta: probe.baselineSnapshot && liveData ? {
          value: liveData.value - probe.baselineSnapshot.value,
          curvature: liveData.curvature - probe.baselineSnapshot.curvature,
          tension: liveData.tension - probe.baselineSnapshot.tension,
        } : null,
      };
    });
    
    const json = JSON.stringify({ probes: probesWithLiveData, exportedAt: new Date().toISOString() }, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sfd-probes-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    return true;
  }, [savedProbes, getProbeDataAt]);

  const getState = useCallback(() => engine?.getState(), [engine]);

  // Helper to get canvas from DOM - more reliable than ref passing
  const getCanvas = useCallback(() => {
    return document.querySelector('[data-testid="canvas-visualization"]') as HTMLCanvasElement | null;
  }, []);
  
  const getOverlayCanvas = useCallback(() => {
    return document.querySelector('[data-testid="canvas-overlay"]') as HTMLCanvasElement | null;
  }, []);

  const getDerivedCanvas = useCallback(() => {
    return document.querySelector('[data-testid="canvas-derived-field"]') as HTMLCanvasElement | null;
  }, []);

  const viewLabels: Record<ExportViewType, string> = {
    main: 'Main Field',
    projection: 'Projection',
    sideBySide: 'Side by Side',
  };

  // Direct export handlers that bypass state
  const exportSnapshotWithView = useCallback(async (view: ExportViewType): Promise<boolean> => {
    if (view === 'main') {
      return exportPNGSnapshot(getCanvas());
    } else if (view === 'projection') {
      const derivedCanvas = getDerivedCanvas();
      if (!derivedCanvas) {
        toast({ title: "Projection view not available", description: "Please open the projection view first", variant: "destructive" });
        return false;
      }
      return exportPNGSnapshot(derivedCanvas);
    } else {
      const derivedCanvas = getDerivedCanvas();
      if (!derivedCanvas) {
        toast({ title: "Projection view not available", description: "Please open the projection view first", variant: "destructive" });
        return false;
      }
      return exportPNGSnapshotDual(getCanvas(), derivedCanvas);
    }
  }, [getCanvas, getDerivedCanvas, toast]);

  const exportVideoWithView = useCallback(async (view: ExportViewType): Promise<boolean> => {
    const canvas = getCanvas();
    if (!engine || !canvas) return false;
    if (view === 'main') {
      return exportVideoWebM(engine, canvas, colormap);
    } else if (view === 'projection') {
      // Use the new projection video export that computes derived fields for each historical frame
      return exportVideoWebMProjection(engine, derivedType);
    } else {
      const derivedCanvas = getDerivedCanvas();
      if (!derivedCanvas) {
        toast({ title: "Projection view not available", description: "Please open the projection view first", variant: "destructive" });
        return false;
      }
      return exportVideoWebMDual(engine, canvas, derivedCanvas, colormap, 10, undefined, derivedType);
    }
  }, [engine, colormap, derivedType, getCanvas, getDerivedCanvas, toast]);

  const exportOptions: ExportOption[] = [
    // === VISUAL (Safe for sharing) ===
    {
      id: 'snapshot',
      name: 'Field Snapshot',
      description: `Export ${viewLabels[snapshotView]} as image`,
      icon: <Camera className="h-5 w-5" />,
      format: 'PNG',
      category: 'visual',
      action: async () => {
        if (snapshotView === 'main') {
          return exportPNGSnapshot(getCanvas());
        } else if (snapshotView === 'projection') {
          const derivedCanvas = getDerivedCanvas();
          if (!derivedCanvas) {
            toast({ title: "Projection view not available", description: "Please open the projection view first", variant: "destructive" });
            return false;
          }
          return exportPNGSnapshot(derivedCanvas);
        } else {
          const derivedCanvas = getDerivedCanvas();
          if (!derivedCanvas) {
            toast({ title: "Projection view not available", description: "Please open the projection view first", variant: "destructive" });
            return false;
          }
          return exportPNGSnapshotDual(getCanvas(), derivedCanvas);
        }
      },
      hasViewSelector: true,
      viewType: snapshotView,
      onViewChange: setSnapshotView,
    },
    {
      id: 'share-card',
      name: 'Share Card',
      description: 'Branded image with regime info',
      icon: <Share2 className="h-5 w-5" />,
      format: 'PNG',
      category: 'visual',
      action: async () => {
        const state = getState();
        if (!state) return false;
        const metrics = engine?.getMetricsHistory();
        const latestMetrics = metrics && metrics.length > 0 ? metrics[metrics.length - 1] : null;
        return exportMobileShareSnapshot(getCanvas(), {
          regime,
          stability: state.variance < 0.05 ? 'Stable' : state.variance < 0.15 ? 'Active' : 'Chaotic',
          curvature: latestMetrics?.curvature ?? 0,
          energy: state.energy,
          overlayCanvas: getOverlayCanvas(),
          overlayOpacity: 0.3,
          forceDownload: true,
        });
      },
    },
    {
      id: 'video',
      name: 'Playback Video',
      description: `Export ${viewLabels[videoView]} animation`,
      icon: <Film className="h-5 w-5" />,
      format: 'WebM',
      category: 'visual',
      requires: 'playback history',
      advancedNote: 'Full-length history export requires Advanced Mode',
      action: async () => {
        const canvas = getCanvas();
        if (!engine || !canvas) return false;
        if (videoView === 'main') {
          return exportVideoWebM(engine, canvas, colormap);
        } else if (videoView === 'projection') {
          const derivedCanvas = getDerivedCanvas();
          if (!derivedCanvas) {
            toast({ title: "Projection view not available", description: "Please open the projection view first", variant: "destructive" });
            return false;
          }
          return exportVideoWebM(engine, derivedCanvas, colormap);
        } else {
          const derivedCanvas = getDerivedCanvas();
          if (!derivedCanvas) {
            toast({ title: "Projection view not available", description: "Please open the projection view first", variant: "destructive" });
            return false;
          }
          return exportVideoWebMDual(engine, canvas, derivedCanvas, colormap);
        }
      },
      hasViewSelector: true,
      viewType: videoView,
      onViewChange: setVideoView,
    },
    {
      id: 'layers',
      name: 'Field Layers',
      description: 'All layers in a single contact sheet',
      icon: <Layers className="h-5 w-5" />,
      format: 'PNG',
      category: 'visual',
      action: async () => {
        if (!engine) return false;
        return exportLayersAsZip(engine);
      },
    },
    // === DATA (Mixed: summary safe, full matrices require advanced) ===
    {
      id: 'metrics',
      name: 'Metrics Summary',
      description: 'Time series of energy, variance, and curvature',
      icon: <BarChart3 className="h-5 w-5" />,
      format: 'CSV',
      category: 'data',
      action: async () => {
        if (!engine) return false;
        return exportMetricsLog(engine);
      },
    },
    {
      id: 'events',
      name: 'Event Log',
      description: 'Record of detected structural events',
      icon: <Activity className="h-5 w-5" />,
      format: 'JSON',
      category: 'data',
      action: async () => exportEventLog(events),
    },
    {
      id: 'sim-data',
      name: 'Full Field Data',
      description: 'Complete field matrices with frame history',
      icon: <Database className="h-5 w-5" />,
      format: 'CSV',
      category: 'data',
      requiresAdvanced: true,
      action: async () => {
        if (!engine) return false;
        return exportSimulationData(engine);
      },
    },
    {
      id: 'operators',
      name: 'Operator Contributions',
      description: 'How each operator influenced the field',
      icon: <BarChart3 className="h-5 w-5" />,
      format: 'JSON',
      category: 'data',
      requiresAdvanced: true,
      action: async () => {
        if (!engine) return false;
        return exportOperatorContributions(engine);
      },
    },
    // === PROBES (Current values safe, histories require advanced) ===
    {
      id: 'probes-csv',
      name: 'Probe Values',
      description: 'Current probe positions and values',
      icon: <Target className="h-5 w-5" />,
      format: 'CSV',
      category: 'probes',
      requires: 'saved probes',
      action: exportProbesCSV,
    },
    {
      id: 'probes-json',
      name: 'Full Probe Data',
      description: 'Complete probe histories with baselines',
      icon: <Target className="h-5 w-5" />,
      format: 'JSON',
      category: 'probes',
      requires: 'saved probes',
      requiresAdvanced: true,
      action: exportProbesJSON,
    },
    // === TECHNICAL (All require Advanced Mode) ===
    {
      id: 'settings',
      name: 'Settings',
      description: 'Current parameters and configuration',
      icon: <Settings className="h-5 w-5" />,
      format: 'JSON',
      category: 'technical',
      requiresAdvanced: true,
      action: async () => {
        if (!engine) return false;
        return exportSettingsJSON(engine);
      },
    },
    {
      id: 'numpy',
      name: 'NumPy Array',
      description: 'Field data for Python/scientific analysis',
      icon: <Code className="h-5 w-5" />,
      format: '.npy',
      category: 'technical',
      requiresAdvanced: true,
      action: async () => {
        if (!engine) return false;
        return exportNumPyArray(engine);
      },
    },
    {
      id: 'python',
      name: 'Python Script',
      description: 'Reconstruction script with visualization code',
      icon: <FileText className="h-5 w-5" />,
      format: '.py',
      category: 'technical',
      requiresAdvanced: true,
      action: async () => {
        if (!engine) return false;
        return exportPythonScript(engine);
      },
    },
    {
      id: 'batch',
      name: 'Batch Spec',
      description: 'Minimal config for automated testing',
      icon: <FileJson className="h-5 w-5" />,
      format: 'JSON',
      category: 'technical',
      requiresAdvanced: true,
      action: async () => {
        if (!engine) return false;
        return exportBatchSpec(engine);
      },
    },
    {
      id: 'archive',
      name: 'Full Archive',
      description: 'Everything: field, operators, events, config',
      icon: <Archive className="h-5 w-5" />,
      format: 'JSON',
      category: 'technical',
      requiresAdvanced: true,
      action: async () => {
        if (!engine) return false;
        return exportFullArchive(engine, events, colormap);
      },
    },
  ];

  const handleExport = async (option: ExportOption) => {
    setLoadingExport(option.id);
    try {
      const success = await option.action();
      if (success) {
        setCompletedExports(prev => new Set(Array.from(prev).concat(option.id)));
        toast({
          title: "Export Complete",
          description: `${option.name} saved successfully`,
        });
        setTimeout(() => {
          setCompletedExports(prev => {
            const next = new Set(prev);
            next.delete(option.id);
            return next;
          });
        }, 2000);
      } else {
        toast({
          title: "Export Failed",
          description: option.requires ? `Requires ${option.requires}` : "Could not generate export",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Export Error",
        description: String(err),
        variant: "destructive",
      });
    } finally {
      setLoadingExport(null);
    }
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Bring panel to front when dragging starts
    onFocus?.();
    if ((e.target as HTMLElement).closest('button')) return;
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: positionRef.current.x,
      posY: positionRef.current.y,
    };
    e.preventDefault();
  }, [onFocus]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !containerRef.current) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      const newX = Math.max(0, Math.min(window.innerWidth - 400, dragStartRef.current.posX + dx));
      const newY = Math.max(0, Math.min(window.innerHeight - 300, dragStartRef.current.posY + dy));
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

    if (isOpen) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isOpen, isPinned, onPinnedChange]);

  useEffect(() => {
    if (isOpen && containerRef.current) {
      // If pinned, use the pinned position
      if (isPinned && pinnedPosition) {
        positionRef.current = pinnedPosition;
        containerRef.current.style.left = `${pinnedPosition.x}px`;
        containerRef.current.style.top = `${pinnedPosition.y}px`;
        return;
      }
      // Otherwise center the dialog
      const x = Math.max(50, (window.innerWidth - 560) / 2);
      const y = Math.max(50, (window.innerHeight - 400) / 2);
      positionRef.current = { x, y };
      containerRef.current.style.left = `${x}px`;
      containerRef.current.style.top = `${y}px`;
    }
  }, [isOpen, isPinned, pinnedPosition]);

  if (!isOpen) return null;

  const filteredOptions = exportOptions.filter(opt => opt.category === selectedCategory);

  return (
    <div
      ref={containerRef}
      className="fixed"
      style={{ left: positionRef.current.x, top: positionRef.current.y, zIndex }}
      onMouseDown={() => onFocus?.()}
      data-testid="floating-export-dialog"
    >
      <div
        className={`rounded-lg overflow-hidden bg-sidebar/95 backdrop-blur-md ${isPinned ? 'border border-amber-500/30 shadow-[0_8px_32px_rgba(251,191,36,0.15)]' : 'border border-sidebar-border shadow-lg'}`}
        style={{ width: 540 }}
      >
        <div
          className="flex items-center justify-between px-3 py-1.5 border-b border-sidebar-border cursor-move select-none"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-1.5">
            <GripVertical className="h-3 w-3 text-neutral-500" />
            <Download className="h-3 w-3 text-cyan-400" />
            <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-wide">Export</span>
          </div>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePin}
                  className={`h-5 w-5 rounded-full ${isPinned ? 'text-amber-400' : 'text-neutral-500 hover:text-neutral-300'}`}
                  data-testid="export-pin"
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
              data-testid="export-dialog-close"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
          <div className="w-28 border-r border-sidebar-border p-2 space-y-1 flex flex-col">
            {(Object.keys(CATEGORY_INFO) as ExportCategory[]).map(cat => {
              const info = CATEGORY_INFO[cat];
              const isSelected = selectedCategory === cat;
              const isTechLocked = cat === 'technical' && !advancedMode;
              
              return (
                <Tooltip key={cat}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => !isTechLocked && setSelectedCategory(cat)}
                      disabled={isTechLocked}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-xs transition-colors ${
                        isTechLocked
                          ? 'opacity-40 cursor-not-allowed text-neutral-500'
                          : isSelected
                            ? 'bg-white/10 text-white'
                            : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
                      }`}
                      data-testid={`export-category-${cat}`}
                    >
                      <span className={isSelected && !isTechLocked ? info.color : ''}>
                        {isTechLocked ? <Lock className="h-4 w-4" /> : info.icon}
                      </span>
                      <span>{info.label}</span>
                    </button>
                  </TooltipTrigger>
                  {isTechLocked && (
                    <TooltipContent side="right" className="text-xs max-w-[180px]">
                      Technical exports require Advanced Mode
                    </TooltipContent>
                  )}
                </Tooltip>
              );
            })}
          </div>

          <div className="flex-1 p-3 max-h-[420px] overflow-y-auto">
            <div className="grid gap-2">
              {filteredOptions.map(option => {
                const isLoading = loadingExport === option.id;
                const isCompleted = completedExports.has(option.id);
                const needsProbes = option.requires === 'saved probes' && savedProbes.length === 0;
                const needsAdvanced = option.requiresAdvanced && !advancedMode;
                const isDisabled = isLoading || needsProbes || needsAdvanced;
                
                const exportButton = (
                  <div
                    key={option.id}
                    role="button"
                    tabIndex={isDisabled ? -1 : 0}
                    onClick={() => !isDisabled && handleExport(option)}
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' || e.key === ' ') && !isDisabled) {
                        e.preventDefault();
                        handleExport(option);
                      }
                    }}
                    className={`flex items-start gap-3 p-3 rounded-lg text-left transition-all ${
                      isDisabled
                        ? 'opacity-50 cursor-not-allowed bg-white/5'
                        : 'bg-white/5 hover:bg-white/10 cursor-pointer'
                    }`}
                    data-testid={`export-option-${option.id}`}
                  >
                    <div className={`shrink-0 p-2 rounded-lg ${needsAdvanced ? 'text-neutral-500' : CATEGORY_INFO[option.category].color} bg-white/5`}>
                      {isLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : isCompleted ? (
                        <Check className="h-5 w-5 text-green-400" />
                      ) : needsAdvanced ? (
                        <Lock className="h-5 w-5" />
                      ) : (
                        option.icon
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-neutral-200">{option.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-neutral-400">
                          {option.format}
                        </span>
                        {needsAdvanced && (
                          <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-400">
                            Advanced
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-500 mt-0.5 leading-snug">
                        {option.description}
                      </p>
                      {option.hasViewSelector && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              setLoadingExport(option.id);
                              const success = option.id === 'snapshot' 
                                ? await exportSnapshotWithView('main')
                                : await exportVideoWithView('main');
                              setLoadingExport(null);
                              if (success) {
                                setCompletedExports(prev => new Set(Array.from(prev).concat(option.id)));
                                toast({ title: "Export complete", description: `${option.name} (Main Field) exported successfully` });
                              }
                            }}
                            className="text-[10px] px-2 py-1 rounded bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 transition-colors"
                          >
                            Main Field
                          </button>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              setLoadingExport(option.id);
                              const success = option.id === 'snapshot' 
                                ? await exportSnapshotWithView('projection')
                                : await exportVideoWithView('projection');
                              setLoadingExport(null);
                              if (success) {
                                setCompletedExports(prev => new Set(Array.from(prev).concat(option.id)));
                                toast({ title: "Export complete", description: `${option.name} (Projection) exported successfully` });
                              }
                            }}
                            className="text-[10px] px-2 py-1 rounded bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition-colors"
                          >
                            Projection
                          </button>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              setLoadingExport(option.id);
                              const success = option.id === 'snapshot' 
                                ? await exportSnapshotWithView('sideBySide')
                                : await exportVideoWithView('sideBySide');
                              setLoadingExport(null);
                              if (success) {
                                setCompletedExports(prev => new Set(Array.from(prev).concat(option.id)));
                                toast({ title: "Export complete", description: `${option.name} (Side by Side) exported successfully` });
                              }
                            }}
                            className="text-[10px] px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors"
                          >
                            Side by Side
                          </button>
                        </div>
                      )}
                      {option.requires && !needsAdvanced && (
                        <p className="text-[10px] text-amber-500/70 mt-1">
                          Requires: {option.requires}
                        </p>
                      )}
                      {option.advancedNote && !advancedMode && (
                        <p className="text-[10px] text-neutral-500 mt-1 italic">
                          {option.advancedNote}
                        </p>
                      )}
                    </div>
                  </div>
                );

                // Wrap with tooltip if disabled due to advanced mode
                if (needsAdvanced) {
                  return (
                    <Tooltip key={option.id}>
                      <TooltipTrigger asChild>
                        {exportButton}
                      </TooltipTrigger>
                      <TooltipContent side="left" className="text-xs max-w-[200px]">
                        Enable Advanced Mode to export numerical data
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return exportButton;
              })}
            </div>
          </div>
        </div>

        {/* Advanced Mode Toggle */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-sidebar-border bg-sidebar-accent/30">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAdvancedMode(!advancedMode)}
              className="flex items-center gap-1.5"
              data-testid="export-advanced-toggle"
            >
              {advancedMode ? (
                <ToggleRight className="h-5 w-5 text-cyan-400" />
              ) : (
                <ToggleLeft className="h-5 w-5 text-neutral-500" />
              )}
              <span className={`text-xs font-medium ${advancedMode ? 'text-cyan-400' : 'text-neutral-400'}`}>
                Advanced Mode
              </span>
            </button>
          </div>
          <p className="text-[10px] text-neutral-500 max-w-[200px] text-right">
            {advancedMode 
              ? 'Full export access enabled' 
              : 'Unlocks matrices, histories, solver internals'}
          </p>
        </div>
      </div>
    </div>
  );
}
