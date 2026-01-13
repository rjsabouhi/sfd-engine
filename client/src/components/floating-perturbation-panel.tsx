import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Zap, 
  ArrowRightLeft, 
  Waves, 
  RotateCcw, 
  Sparkles, 
  Wind,
  Target,
  X,
  GripVertical,
  Pin
} from 'lucide-react';
import { 
  PerturbationMode, 
  PERTURBATION_MODES, 
  DEFAULT_PARAMS,
  ImpulseParams,
  ShearParams,
  WaveParams,
  VortexParams,
  FractureParams,
  DriftParams
} from '@/lib/perturbations/types';

interface FloatingPerturbationPanelProps {
  isVisible: boolean;
  onClose: () => void;
  onApplyPerturbation: (mode: PerturbationMode, params: Record<string, any>, x: number, y: number) => void;
  fieldWidth: number;
  fieldHeight: number;
  perturbMode: boolean;
  onPerturbModeChange: (enabled: boolean) => void;
  selectedMode: PerturbationMode;
  onModeChange: (mode: PerturbationMode) => void;
  onParamsChange: (params: Record<string, any>) => void;
  onResetField: () => void;
  zIndex?: number;
  onFocus?: () => void;
  anchorRect?: DOMRect | null;
  // Lifted pinned state for persistence across view switches
  isPinned?: boolean;
  pinnedPosition?: { x: number; y: number } | null;
  onPinnedChange?: (isPinned: boolean, position: { x: number; y: number } | null) => void;
}

const PANEL_WIDTH = 280;
const GAP_FROM_MENUBAR = 8;

const ICONS: Record<PerturbationMode, React.ReactNode> = {
  impulse: <Zap className="h-4 w-4" />,
  shear: <ArrowRightLeft className="h-4 w-4" />,
  wave: <Waves className="h-4 w-4" />,
  vortex: <RotateCcw className="h-4 w-4" />,
  fracture: <Sparkles className="h-4 w-4" />,
  drift: <Wind className="h-4 w-4" />,
};

export function FloatingPerturbationPanel({
  isVisible,
  onClose,
  onApplyPerturbation,
  fieldWidth,
  fieldHeight,
  perturbMode,
  onPerturbModeChange,
  selectedMode,
  onModeChange,
  onParamsChange,
  onResetField,
  zIndex = 50,
  onFocus,
  anchorRect,
  isPinned: isPinnedProp,
  pinnedPosition: pinnedPositionProp,
  onPinnedChange,
}: FloatingPerturbationPanelProps) {
  // Use lifted state if provided, otherwise use local state
  const [localIsPinned, setLocalIsPinned] = useState(false);
  const [localPinnedPosition, setLocalPinnedPosition] = useState<{ x: number; y: number } | null>(null);
  const isPinned = isPinnedProp !== undefined ? isPinnedProp : localIsPinned;
  const pinnedPosition = pinnedPositionProp !== undefined ? pinnedPositionProp : localPinnedPosition;
  const [hasDragged, setHasDragged] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  // Initialize positionRef with pinned position if available
  const positionRef = useRef(pinnedPosition || { x: 80, y: 100 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  // Track last anchorRect to avoid repositioning on same anchor
  const lastAnchorRectRef = useRef<DOMRect | null>(null);

  // Sync positionRef when pinnedPosition changes from parent
  useEffect(() => {
    if (isPinned && pinnedPosition) {
      positionRef.current = pinnedPosition;
    }
  }, [isPinned, pinnedPosition]);

  // Reposition when anchor rect is provided (on open) - but NEVER reposition pinned panels
  useEffect(() => {
    if (isVisible && containerRef.current) {
      // If pinned, always use pinned position and skip anchor logic entirely
      if (isPinned && pinnedPosition) {
        positionRef.current = pinnedPosition;
        containerRef.current.style.left = `${pinnedPosition.x}px`;
        containerRef.current.style.top = `${pinnedPosition.y}px`;
        return;
      }
      
      // Only reposition based on anchor if not dragged and anchor changed
      if (anchorRect && !hasDragged) {
        const anchorChanged = !lastAnchorRectRef.current || 
          lastAnchorRectRef.current.left !== anchorRect.left ||
          lastAnchorRectRef.current.top !== anchorRect.top;
        
        if (anchorChanged) {
          lastAnchorRectRef.current = anchorRect;
          const x = Math.max(8, Math.min(
            anchorRect.left + anchorRect.width / 2 - PANEL_WIDTH / 2,
            window.innerWidth - PANEL_WIDTH - 8
          ));
          const y = anchorRect.bottom + GAP_FROM_MENUBAR;
          positionRef.current = { x, y };
          containerRef.current.style.left = `${x}px`;
          containerRef.current.style.top = `${y}px`;
        }
      }
    }
  }, [anchorRect, isVisible, hasDragged, isPinned, pinnedPosition]);

  // Reset hasDragged when panel is closed (but keep pinned state)
  useEffect(() => {
    if (!isVisible) {
      setHasDragged(false);
      lastAnchorRectRef.current = null;
    }
  }, [isVisible]);

  const handlePin = () => {
    if (isPinned) {
      if (onPinnedChange) {
        onPinnedChange(false, null);
      } else {
        setLocalIsPinned(false);
        setLocalPinnedPosition(null);
      }
    } else {
      if (onPinnedChange) {
        onPinnedChange(true, positionRef.current);
      } else {
        setLocalIsPinned(true);
        setLocalPinnedPosition(positionRef.current);
      }
    }
  };

  const [impulseParams, setImpulseParams] = useState<ImpulseParams>(DEFAULT_PARAMS.impulse);
  const [shearParams, setShearParams] = useState<ShearParams>(DEFAULT_PARAMS.shear);
  const [waveParams, setWaveParams] = useState<WaveParams>(DEFAULT_PARAMS.wave);
  const [vortexParams, setVortexParams] = useState<VortexParams>(DEFAULT_PARAMS.vortex);
  const [fractureParams, setFractureParams] = useState<FractureParams>(DEFAULT_PARAMS.fracture);
  const [driftParams, setDriftParams] = useState<DriftParams>(DEFAULT_PARAMS.drift);

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
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        // If pinned, update the pinned position to the new dragged location
        if (isPinned && onPinnedChange) {
          onPinnedChange(true, { x: positionRef.current.x, y: positionRef.current.y });
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPinned, onPinnedChange]);

  const updateImpulseParams = (update: Partial<ImpulseParams>) => {
    const newParams = { ...impulseParams, ...update };
    setImpulseParams(newParams);
    if (selectedMode === 'impulse') onParamsChange(newParams);
  };
  const updateShearParams = (update: Partial<ShearParams>) => {
    const newParams = { ...shearParams, ...update };
    setShearParams(newParams);
    if (selectedMode === 'shear') onParamsChange(newParams);
  };
  const updateWaveParams = (update: Partial<WaveParams>) => {
    const newParams = { ...waveParams, ...update };
    setWaveParams(newParams);
    if (selectedMode === 'wave') onParamsChange(newParams);
  };
  const updateVortexParams = (update: Partial<VortexParams>) => {
    const newParams = { ...vortexParams, ...update };
    setVortexParams(newParams);
    if (selectedMode === 'vortex') onParamsChange(newParams);
  };
  const updateFractureParams = (update: Partial<FractureParams>) => {
    const newParams = { ...fractureParams, ...update };
    setFractureParams(newParams);
    if (selectedMode === 'fracture') onParamsChange(newParams);
  };
  const updateDriftParams = (update: Partial<DriftParams>) => {
    const newParams = { ...driftParams, ...update };
    setDriftParams(newParams);
    if (selectedMode === 'drift') onParamsChange(newParams);
  };

  const handleModeChange = (mode: PerturbationMode) => {
    onModeChange(mode);
    switch (mode) {
      case 'impulse': onParamsChange(impulseParams); break;
      case 'shear': onParamsChange(shearParams); break;
      case 'wave': onParamsChange(waveParams); break;
      case 'vortex': onParamsChange(vortexParams); break;
      case 'fracture': onParamsChange(fractureParams); break;
      case 'drift': onParamsChange(driftParams); break;
    }
  };

  const getCurrentParams = useCallback((): Record<string, any> => {
    switch (selectedMode) {
      case 'impulse': return impulseParams;
      case 'shear': return shearParams;
      case 'wave': return waveParams;
      case 'vortex': return vortexParams;
      case 'fracture': return fractureParams;
      case 'drift': return driftParams;
    }
  }, [selectedMode, impulseParams, shearParams, waveParams, vortexParams, fractureParams, driftParams]);

  const handleApplyAtCenter = () => {
    const centerX = Math.floor(fieldWidth / 2);
    const centerY = Math.floor(fieldHeight / 2);
    onApplyPerturbation(selectedMode, getCurrentParams(), centerX, centerY);
  };

  const renderImpulseSliders = () => (
    <div className="space-y-2">
      <div className="space-y-1">
        <div className="flex justify-between text-[11px]">
          <Label className="text-neutral-400">Intensity</Label>
          <span className="font-mono text-neutral-300">{impulseParams.intensity.toFixed(1)}</span>
        </div>
        <Slider value={[impulseParams.intensity]} min={0} max={10} step={0.5} onValueChange={([v]) => updateImpulseParams({ intensity: v })} />
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-[11px]">
          <Label className="text-neutral-400">Radius</Label>
          <span className="font-mono text-neutral-300">{impulseParams.radius}</span>
        </div>
        <Slider value={[impulseParams.radius]} min={5} max={200} step={5} onValueChange={([v]) => updateImpulseParams({ radius: v })} />
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-[11px]">
          <Label className="text-neutral-400">Decay</Label>
          <span className="font-mono text-neutral-300">{impulseParams.decay.toFixed(2)}</span>
        </div>
        <Slider value={[impulseParams.decay]} min={0} max={1} step={0.05} onValueChange={([v]) => updateImpulseParams({ decay: v })} />
      </div>
    </div>
  );

  const renderShearSliders = () => (
    <div className="space-y-2">
      <div className="space-y-1">
        <div className="flex justify-between text-[11px]">
          <Label className="text-neutral-400">Magnitude</Label>
          <span className="font-mono text-neutral-300">{shearParams.magnitude.toFixed(1)}</span>
        </div>
        <Slider value={[shearParams.magnitude]} min={0} max={10} step={0.5} onValueChange={([v]) => updateShearParams({ magnitude: v })} />
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-[11px]">
          <Label className="text-neutral-400">Angle</Label>
          <span className="font-mono text-neutral-300">{shearParams.angle}°</span>
        </div>
        <Slider value={[shearParams.angle]} min={0} max={360} step={15} onValueChange={([v]) => updateShearParams({ angle: v })} />
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-[11px]">
          <Label className="text-neutral-400">Duration</Label>
          <span className="font-mono text-neutral-300">{shearParams.duration.toFixed(1)}</span>
        </div>
        <Slider value={[shearParams.duration]} min={0} max={10} step={0.5} onValueChange={([v]) => updateShearParams({ duration: v })} />
      </div>
    </div>
  );

  const renderWaveSliders = () => (
    <div className="space-y-2">
      <div className="space-y-1">
        <div className="flex justify-between text-[11px]">
          <Label className="text-neutral-400">Amplitude</Label>
          <span className="font-mono text-neutral-300">{waveParams.amplitude.toFixed(1)}</span>
        </div>
        <Slider value={[waveParams.amplitude]} min={0} max={10} step={0.5} onValueChange={([v]) => updateWaveParams({ amplitude: v })} />
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-[11px]">
          <Label className="text-neutral-400">Frequency</Label>
          <span className="font-mono text-neutral-300">{waveParams.frequency.toFixed(1)}</span>
        </div>
        <Slider value={[waveParams.frequency]} min={0} max={10} step={0.5} onValueChange={([v]) => updateWaveParams({ frequency: v })} />
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-[11px]">
          <Label className="text-neutral-400">Wavelength</Label>
          <span className="font-mono text-neutral-300">{waveParams.wavelength}</span>
        </div>
        <Slider value={[waveParams.wavelength]} min={10} max={200} step={10} onValueChange={([v]) => updateWaveParams({ wavelength: v })} />
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-[11px]">
          <Label className="text-neutral-400">Damping</Label>
          <span className="font-mono text-neutral-300">{waveParams.damping.toFixed(2)}</span>
        </div>
        <Slider value={[waveParams.damping]} min={0} max={1} step={0.05} onValueChange={([v]) => updateWaveParams({ damping: v })} />
      </div>
    </div>
  );

  const renderVortexSliders = () => (
    <div className="space-y-2">
      <div className="space-y-1">
        <div className="flex justify-between text-[11px]">
          <Label className="text-neutral-400">Angular Velocity</Label>
          <span className="font-mono text-neutral-300">{vortexParams.angularVelocity.toFixed(1)}</span>
        </div>
        <Slider value={[vortexParams.angularVelocity]} min={0} max={20} step={1} onValueChange={([v]) => updateVortexParams({ angularVelocity: v })} />
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-[11px]">
          <Label className="text-neutral-400">Radius</Label>
          <span className="font-mono text-neutral-300">{vortexParams.radius}</span>
        </div>
        <Slider value={[vortexParams.radius]} min={10} max={200} step={10} onValueChange={([v]) => updateVortexParams({ radius: v })} />
      </div>
      <div className="space-y-1">
        <Label className="text-neutral-400 text-[11px]">Direction</Label>
        <RadioGroup value={vortexParams.direction} onValueChange={(v) => updateVortexParams({ direction: v as 'CW' | 'CCW' })} className="flex gap-3">
          <div className="flex items-center gap-1">
            <RadioGroupItem value="CCW" id="float-ccw" className="h-3 w-3" />
            <Label htmlFor="float-ccw" className="text-[11px] text-neutral-300">CCW</Label>
          </div>
          <div className="flex items-center gap-1">
            <RadioGroupItem value="CW" id="float-cw" className="h-3 w-3" />
            <Label htmlFor="float-cw" className="text-[11px] text-neutral-300">CW</Label>
          </div>
        </RadioGroup>
      </div>
    </div>
  );

  const renderFractureSliders = () => (
    <div className="space-y-2">
      <div className="space-y-1">
        <div className="flex justify-between text-[11px]">
          <Label className="text-neutral-400">Strength</Label>
          <span className="font-mono text-neutral-300">{fractureParams.strength.toFixed(1)}</span>
        </div>
        <Slider value={[fractureParams.strength]} min={0} max={10} step={0.5} onValueChange={([v]) => updateFractureParams({ strength: v })} />
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-[11px]">
          <Label className="text-neutral-400">Noise</Label>
          <span className="font-mono text-neutral-300">{fractureParams.noise.toFixed(1)}</span>
        </div>
        <Slider value={[fractureParams.noise]} min={0} max={5} step={0.25} onValueChange={([v]) => updateFractureParams({ noise: v })} />
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-[11px]">
          <Label className="text-neutral-400">Propagation</Label>
          <span className="font-mono text-neutral-300">{fractureParams.propagationRate.toFixed(1)}</span>
        </div>
        <Slider value={[fractureParams.propagationRate]} min={0} max={10} step={0.5} onValueChange={([v]) => updateFractureParams({ propagationRate: v })} />
      </div>
    </div>
  );

  const renderDriftSliders = () => (
    <div className="space-y-2">
      <div className="space-y-1">
        <div className="flex justify-between text-[11px]">
          <Label className="text-neutral-400">Magnitude</Label>
          <span className="font-mono text-neutral-300">{driftParams.magnitude.toFixed(1)}</span>
        </div>
        <Slider value={[driftParams.magnitude]} min={0} max={5} step={0.25} onValueChange={([v]) => updateDriftParams({ magnitude: v })} />
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-[11px]">
          <Label className="text-neutral-400">Vector X</Label>
          <span className="font-mono text-neutral-300">{driftParams.vectorX.toFixed(2)}</span>
        </div>
        <Slider value={[driftParams.vectorX]} min={-1} max={1} step={0.1} onValueChange={([v]) => updateDriftParams({ vectorX: v })} />
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-[11px]">
          <Label className="text-neutral-400">Vector Y</Label>
          <span className="font-mono text-neutral-300">{driftParams.vectorY.toFixed(2)}</span>
        </div>
        <Slider value={[driftParams.vectorY]} min={-1} max={1} step={0.1} onValueChange={([v]) => updateDriftParams({ vectorY: v })} />
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-[11px]">
          <Label className="text-neutral-400">Duration</Label>
          <span className="font-mono text-neutral-300">{driftParams.duration.toFixed(1)}</span>
        </div>
        <Slider value={[driftParams.duration]} min={0} max={20} step={1} onValueChange={([v]) => updateDriftParams({ duration: v })} />
      </div>
    </div>
  );

  const renderParameterSliders = () => {
    switch (selectedMode) {
      case 'impulse': return renderImpulseSliders();
      case 'shear': return renderShearSliders();
      case 'wave': return renderWaveSliders();
      case 'vortex': return renderVortexSliders();
      case 'fracture': return renderFractureSliders();
      case 'drift': return renderDriftSliders();
    }
  };

  const selectedModeConfig = PERTURBATION_MODES.find(m => m.id === selectedMode);

  if (!isVisible) return null;

  return (
    <div 
      ref={containerRef}
      className="fixed"
      style={{ left: positionRef.current.x, top: positionRef.current.y, zIndex }}
      onMouseDown={() => onFocus?.()}
      data-testid="floating-perturbation-panel"
    >
      <div 
        className={`rounded-lg w-[260px] bg-sidebar/95 backdrop-blur-md ${isPinned ? 'border border-amber-500/30 shadow-[0_8px_32px_rgba(251,191,36,0.15)]' : 'border border-sidebar-border shadow-lg'}`}
      >
        <div 
          className="flex items-center justify-between px-3 py-1.5 border-b border-sidebar-border cursor-move select-none"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-1.5">
            <GripVertical className="h-3 w-3 text-neutral-500" />
            <Zap className="h-3 w-3 text-red-400" />
            <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-wide">Perturbation</span>
          </div>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePin}
                  className={`h-5 w-5 rounded-full ${isPinned ? 'text-amber-400' : 'text-neutral-500 hover:text-neutral-300'}`}
                  data-testid="perturbation-pin"
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
              data-testid="perturbation-close"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        <div className="p-3 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-[10px] text-neutral-400">Type</Label>
            <Select value={selectedMode} onValueChange={(v) => handleModeChange(v as PerturbationMode)}>
              <SelectTrigger className="h-7 text-xs" data-testid="floating-select-mode">
                <SelectValue>
                  <div className="flex items-center gap-2">
                    {ICONS[selectedMode]}
                    <span>{selectedModeConfig?.label}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-neutral-900 border-white/10 z-[9999]">
                {PERTURBATION_MODES.map(mode => (
                  <SelectItem key={mode.id} value={mode.id}>
                    <div className="flex items-center gap-2">
                      {ICONS[mode.id]}
                      <span>{mode.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="pt-2 border-t border-sidebar-border">
            <div className="text-[10px] text-neutral-400 mb-2 uppercase tracking-wide">
              {selectedModeConfig?.label} Parameters
            </div>
            {renderParameterSliders()}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleApplyAtCenter}
              className="flex-1 h-7 text-xs"
              size="sm"
              data-testid="floating-apply-perturbation"
            >
              <Target className="h-3 w-3 mr-1.5" />
              Apply at Center
            </Button>
            <Button
              variant="outline"
              onClick={onResetField}
              className="h-7 text-xs px-2"
              size="sm"
              data-testid="floating-reset-field"
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          </div>
          
          {perturbMode && (
            <p className="text-[10px] text-center text-neutral-500">
              Click on the field to apply
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
