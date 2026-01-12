import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  Zap, 
  ArrowRightLeft, 
  Waves, 
  RotateCcw, 
  Sparkles, 
  Wind,
  Target,
  X,
  GripVertical
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
}

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
}: FloatingPerturbationPanelProps) {
  const [position, setPosition] = useState({ x: 80, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number } | null>(null);

  const [impulseParams, setImpulseParams] = useState<ImpulseParams>(DEFAULT_PARAMS.impulse);
  const [shearParams, setShearParams] = useState<ShearParams>(DEFAULT_PARAMS.shear);
  const [waveParams, setWaveParams] = useState<WaveParams>(DEFAULT_PARAMS.wave);
  const [vortexParams, setVortexParams] = useState<VortexParams>(DEFAULT_PARAMS.vortex);
  const [fractureParams, setFractureParams] = useState<FractureParams>(DEFAULT_PARAMS.fracture);
  const [driftParams, setDriftParams] = useState<DriftParams>(DEFAULT_PARAMS.drift);

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
          <Label className="text-muted-foreground">Intensity</Label>
          <span className="font-mono text-foreground/70">{impulseParams.intensity.toFixed(1)}</span>
        </div>
        <Slider value={[impulseParams.intensity]} min={0} max={10} step={0.5} onValueChange={([v]) => updateImpulseParams({ intensity: v })} />
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-[11px]">
          <Label className="text-muted-foreground">Radius</Label>
          <span className="font-mono text-foreground/70">{impulseParams.radius}</span>
        </div>
        <Slider value={[impulseParams.radius]} min={5} max={200} step={5} onValueChange={([v]) => updateImpulseParams({ radius: v })} />
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-[11px]">
          <Label className="text-muted-foreground">Decay</Label>
          <span className="font-mono text-foreground/70">{impulseParams.decay.toFixed(2)}</span>
        </div>
        <Slider value={[impulseParams.decay]} min={0} max={1} step={0.05} onValueChange={([v]) => updateImpulseParams({ decay: v })} />
      </div>
    </div>
  );

  const renderShearSliders = () => (
    <div className="space-y-2">
      <div className="space-y-1">
        <div className="flex justify-between text-[11px]">
          <Label className="text-muted-foreground">Magnitude</Label>
          <span className="font-mono text-foreground/70">{shearParams.magnitude.toFixed(1)}</span>
        </div>
        <Slider value={[shearParams.magnitude]} min={0} max={10} step={0.5} onValueChange={([v]) => updateShearParams({ magnitude: v })} />
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-[11px]">
          <Label className="text-muted-foreground">Angle</Label>
          <span className="font-mono text-foreground/70">{shearParams.angle}°</span>
        </div>
        <Slider value={[shearParams.angle]} min={0} max={360} step={15} onValueChange={([v]) => updateShearParams({ angle: v })} />
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-[11px]">
          <Label className="text-muted-foreground">Duration</Label>
          <span className="font-mono text-foreground/70">{shearParams.duration.toFixed(1)}</span>
        </div>
        <Slider value={[shearParams.duration]} min={0} max={10} step={0.5} onValueChange={([v]) => updateShearParams({ duration: v })} />
      </div>
    </div>
  );

  const renderWaveSliders = () => (
    <div className="space-y-2">
      <div className="space-y-1">
        <div className="flex justify-between text-[11px]">
          <Label className="text-muted-foreground">Amplitude</Label>
          <span className="font-mono text-foreground/70">{waveParams.amplitude.toFixed(1)}</span>
        </div>
        <Slider value={[waveParams.amplitude]} min={0} max={10} step={0.5} onValueChange={([v]) => updateWaveParams({ amplitude: v })} />
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-[11px]">
          <Label className="text-muted-foreground">Frequency</Label>
          <span className="font-mono text-foreground/70">{waveParams.frequency.toFixed(1)}</span>
        </div>
        <Slider value={[waveParams.frequency]} min={0} max={10} step={0.5} onValueChange={([v]) => updateWaveParams({ frequency: v })} />
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-[11px]">
          <Label className="text-muted-foreground">Wavelength</Label>
          <span className="font-mono text-foreground/70">{waveParams.wavelength}</span>
        </div>
        <Slider value={[waveParams.wavelength]} min={10} max={200} step={10} onValueChange={([v]) => updateWaveParams({ wavelength: v })} />
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-[11px]">
          <Label className="text-muted-foreground">Damping</Label>
          <span className="font-mono text-foreground/70">{waveParams.damping.toFixed(2)}</span>
        </div>
        <Slider value={[waveParams.damping]} min={0} max={1} step={0.05} onValueChange={([v]) => updateWaveParams({ damping: v })} />
      </div>
    </div>
  );

  const renderVortexSliders = () => (
    <div className="space-y-2">
      <div className="space-y-1">
        <div className="flex justify-between text-[11px]">
          <Label className="text-muted-foreground">Angular Velocity</Label>
          <span className="font-mono text-foreground/70">{vortexParams.angularVelocity.toFixed(1)}</span>
        </div>
        <Slider value={[vortexParams.angularVelocity]} min={0} max={20} step={1} onValueChange={([v]) => updateVortexParams({ angularVelocity: v })} />
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-[11px]">
          <Label className="text-muted-foreground">Radius</Label>
          <span className="font-mono text-foreground/70">{vortexParams.radius}</span>
        </div>
        <Slider value={[vortexParams.radius]} min={10} max={200} step={10} onValueChange={([v]) => updateVortexParams({ radius: v })} />
      </div>
      <div className="space-y-1">
        <Label className="text-muted-foreground text-[11px]">Direction</Label>
        <RadioGroup value={vortexParams.direction} onValueChange={(v) => updateVortexParams({ direction: v as 'CW' | 'CCW' })} className="flex gap-3">
          <div className="flex items-center gap-1">
            <RadioGroupItem value="CCW" id="float-ccw" className="h-3 w-3" />
            <Label htmlFor="float-ccw" className="text-[11px] text-foreground/70">CCW</Label>
          </div>
          <div className="flex items-center gap-1">
            <RadioGroupItem value="CW" id="float-cw" className="h-3 w-3" />
            <Label htmlFor="float-cw" className="text-[11px] text-foreground/70">CW</Label>
          </div>
        </RadioGroup>
      </div>
    </div>
  );

  const renderFractureSliders = () => (
    <div className="space-y-2">
      <div className="space-y-1">
        <div className="flex justify-between text-[11px]">
          <Label className="text-muted-foreground">Strength</Label>
          <span className="font-mono text-foreground/70">{fractureParams.strength.toFixed(1)}</span>
        </div>
        <Slider value={[fractureParams.strength]} min={0} max={10} step={0.5} onValueChange={([v]) => updateFractureParams({ strength: v })} />
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-[11px]">
          <Label className="text-muted-foreground">Noise</Label>
          <span className="font-mono text-foreground/70">{fractureParams.noise.toFixed(1)}</span>
        </div>
        <Slider value={[fractureParams.noise]} min={0} max={5} step={0.25} onValueChange={([v]) => updateFractureParams({ noise: v })} />
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-[11px]">
          <Label className="text-muted-foreground">Propagation</Label>
          <span className="font-mono text-foreground/70">{fractureParams.propagationRate.toFixed(1)}</span>
        </div>
        <Slider value={[fractureParams.propagationRate]} min={0} max={10} step={0.5} onValueChange={([v]) => updateFractureParams({ propagationRate: v })} />
      </div>
    </div>
  );

  const renderDriftSliders = () => (
    <div className="space-y-2">
      <div className="space-y-1">
        <div className="flex justify-between text-[11px]">
          <Label className="text-muted-foreground">Magnitude</Label>
          <span className="font-mono text-foreground/70">{driftParams.magnitude.toFixed(1)}</span>
        </div>
        <Slider value={[driftParams.magnitude]} min={0} max={5} step={0.25} onValueChange={([v]) => updateDriftParams({ magnitude: v })} />
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-[11px]">
          <Label className="text-muted-foreground">Vector X</Label>
          <span className="font-mono text-foreground/70">{driftParams.vectorX.toFixed(2)}</span>
        </div>
        <Slider value={[driftParams.vectorX]} min={-1} max={1} step={0.1} onValueChange={([v]) => updateDriftParams({ vectorX: v })} />
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-[11px]">
          <Label className="text-muted-foreground">Vector Y</Label>
          <span className="font-mono text-foreground/70">{driftParams.vectorY.toFixed(2)}</span>
        </div>
        <Slider value={[driftParams.vectorY]} min={-1} max={1} step={0.1} onValueChange={([v]) => updateDriftParams({ vectorY: v })} />
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-[11px]">
          <Label className="text-muted-foreground">Duration</Label>
          <span className="font-mono text-foreground/70">{driftParams.duration.toFixed(1)}</span>
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
      className="fixed z-50"
      style={{ left: position.x, top: position.y }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      data-testid="floating-perturbation-panel"
    >
      <div className="bg-card/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl w-[260px]">
        <div 
          className="flex items-center justify-between px-3 py-1.5 border-b border-border cursor-move select-none"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-1.5">
            <GripVertical className="h-3 w-3 text-muted-foreground" />
            <Zap className="h-3 w-3 text-yellow-400" />
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Perturbation</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-5 w-5 rounded-full"
            data-testid="perturbation-close"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
        
        <div className="p-3 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">Type</Label>
            <Select value={selectedMode} onValueChange={(v) => handleModeChange(v as PerturbationMode)}>
              <SelectTrigger className="h-7 text-xs" data-testid="floating-select-mode">
                <SelectValue>
                  <div className="flex items-center gap-2">
                    {ICONS[selectedMode]}
                    <span>{selectedModeConfig?.label}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
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

          <div className="pt-2 border-t border-border">
            <div className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wide">
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
            <p className="text-[10px] text-center text-muted-foreground">
              Click on the field to apply
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
