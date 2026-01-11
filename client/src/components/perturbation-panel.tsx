import { useState, useCallback } from 'react';
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
  Target
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

interface PerturbationPanelProps {
  onApplyPerturbation: (mode: PerturbationMode, params: Record<string, any>, x: number, y: number) => void;
  fieldWidth: number;
  fieldHeight: number;
  perturbMode: boolean;
  onPerturbModeChange: (enabled: boolean) => void;
  selectedMode: PerturbationMode;
  onModeChange: (mode: PerturbationMode) => void;
  onParamsChange: (params: Record<string, any>) => void;
}

const ICONS: Record<PerturbationMode, React.ReactNode> = {
  impulse: <Zap className="h-4 w-4" />,
  shear: <ArrowRightLeft className="h-4 w-4" />,
  wave: <Waves className="h-4 w-4" />,
  vortex: <RotateCcw className="h-4 w-4" />,
  fracture: <Sparkles className="h-4 w-4" />,
  drift: <Wind className="h-4 w-4" />,
};

export function PerturbationPanel({
  onApplyPerturbation,
  fieldWidth,
  fieldHeight,
  perturbMode,
  onPerturbModeChange,
  selectedMode,
  onModeChange,
  onParamsChange,
}: PerturbationPanelProps) {
  const [impulseParams, setImpulseParams] = useState<ImpulseParams>(DEFAULT_PARAMS.impulse);
  const [shearParams, setShearParams] = useState<ShearParams>(DEFAULT_PARAMS.shear);
  const [waveParams, setWaveParams] = useState<WaveParams>(DEFAULT_PARAMS.wave);
  const [vortexParams, setVortexParams] = useState<VortexParams>(DEFAULT_PARAMS.vortex);
  const [fractureParams, setFractureParams] = useState<FractureParams>(DEFAULT_PARAMS.fracture);
  const [driftParams, setDriftParams] = useState<DriftParams>(DEFAULT_PARAMS.drift);

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
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <Label className="text-muted-foreground">Intensity</Label>
          <span className="font-mono text-white/70">{impulseParams.intensity.toFixed(1)}</span>
        </div>
        <Slider
          value={[impulseParams.intensity]}
          min={0}
          max={10}
          step={0.5}
          onValueChange={([v]) => updateImpulseParams({ intensity: v })}
          data-testid="slider-impulse-intensity"
        />
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <Label className="text-muted-foreground">Radius</Label>
          <span className="font-mono text-white/70">{impulseParams.radius}</span>
        </div>
        <Slider
          value={[impulseParams.radius]}
          min={5}
          max={200}
          step={5}
          onValueChange={([v]) => updateImpulseParams({ radius: v })}
          data-testid="slider-impulse-radius"
        />
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <Label className="text-muted-foreground">Decay</Label>
          <span className="font-mono text-white/70">{impulseParams.decay.toFixed(2)}</span>
        </div>
        <Slider
          value={[impulseParams.decay]}
          min={0}
          max={1}
          step={0.05}
          onValueChange={([v]) => updateImpulseParams({ decay: v })}
          data-testid="slider-impulse-decay"
        />
      </div>
    </div>
  );

  const renderShearSliders = () => (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <Label className="text-muted-foreground">Magnitude</Label>
          <span className="font-mono text-white/70">{shearParams.magnitude.toFixed(1)}</span>
        </div>
        <Slider
          value={[shearParams.magnitude]}
          min={0}
          max={10}
          step={0.5}
          onValueChange={([v]) => updateShearParams({ magnitude: v })}
          data-testid="slider-shear-magnitude"
        />
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <Label className="text-muted-foreground">Angle</Label>
          <span className="font-mono text-white/70">{shearParams.angle}°</span>
        </div>
        <Slider
          value={[shearParams.angle]}
          min={0}
          max={360}
          step={15}
          onValueChange={([v]) => updateShearParams({ angle: v })}
          data-testid="slider-shear-angle"
        />
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <Label className="text-muted-foreground">Duration</Label>
          <span className="font-mono text-white/70">{shearParams.duration.toFixed(1)}</span>
        </div>
        <Slider
          value={[shearParams.duration]}
          min={0}
          max={10}
          step={0.5}
          onValueChange={([v]) => updateShearParams({ duration: v })}
          data-testid="slider-shear-duration"
        />
      </div>
    </div>
  );

  const renderWaveSliders = () => (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <Label className="text-muted-foreground">Amplitude</Label>
          <span className="font-mono text-white/70">{waveParams.amplitude.toFixed(1)}</span>
        </div>
        <Slider
          value={[waveParams.amplitude]}
          min={0}
          max={10}
          step={0.5}
          onValueChange={([v]) => updateWaveParams({ amplitude: v })}
          data-testid="slider-wave-amplitude"
        />
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <Label className="text-muted-foreground">Frequency</Label>
          <span className="font-mono text-white/70">{waveParams.frequency.toFixed(1)}</span>
        </div>
        <Slider
          value={[waveParams.frequency]}
          min={0}
          max={10}
          step={0.5}
          onValueChange={([v]) => updateWaveParams({ frequency: v })}
          data-testid="slider-wave-frequency"
        />
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <Label className="text-muted-foreground">Wavelength</Label>
          <span className="font-mono text-white/70">{waveParams.wavelength}</span>
        </div>
        <Slider
          value={[waveParams.wavelength]}
          min={10}
          max={200}
          step={10}
          onValueChange={([v]) => updateWaveParams({ wavelength: v })}
          data-testid="slider-wave-wavelength"
        />
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <Label className="text-muted-foreground">Damping</Label>
          <span className="font-mono text-white/70">{waveParams.damping.toFixed(2)}</span>
        </div>
        <Slider
          value={[waveParams.damping]}
          min={0}
          max={1}
          step={0.05}
          onValueChange={([v]) => updateWaveParams({ damping: v })}
          data-testid="slider-wave-damping"
        />
      </div>
    </div>
  );

  const renderVortexSliders = () => (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <Label className="text-muted-foreground">Angular Velocity</Label>
          <span className="font-mono text-white/70">{vortexParams.angularVelocity.toFixed(1)}</span>
        </div>
        <Slider
          value={[vortexParams.angularVelocity]}
          min={0}
          max={20}
          step={1}
          onValueChange={([v]) => updateVortexParams({ angularVelocity: v })}
          data-testid="slider-vortex-velocity"
        />
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <Label className="text-muted-foreground">Radius</Label>
          <span className="font-mono text-white/70">{vortexParams.radius}</span>
        </div>
        <Slider
          value={[vortexParams.radius]}
          min={10}
          max={200}
          step={10}
          onValueChange={([v]) => updateVortexParams({ radius: v })}
          data-testid="slider-vortex-radius"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-muted-foreground text-xs">Direction</Label>
        <RadioGroup
          value={vortexParams.direction}
          onValueChange={(v) => updateVortexParams({ direction: v as 'CW' | 'CCW' })}
          className="flex gap-4"
        >
          <div className="flex items-center gap-1.5">
            <RadioGroupItem value="CCW" id="ccw" data-testid="radio-vortex-ccw" />
            <Label htmlFor="ccw" className="text-xs">Counter-CW</Label>
          </div>
          <div className="flex items-center gap-1.5">
            <RadioGroupItem value="CW" id="cw" data-testid="radio-vortex-cw" />
            <Label htmlFor="cw" className="text-xs">Clockwise</Label>
          </div>
        </RadioGroup>
      </div>
    </div>
  );

  const renderFractureSliders = () => (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <Label className="text-muted-foreground">Strength</Label>
          <span className="font-mono text-white/70">{fractureParams.strength.toFixed(1)}</span>
        </div>
        <Slider
          value={[fractureParams.strength]}
          min={0}
          max={10}
          step={0.5}
          onValueChange={([v]) => updateFractureParams({ strength: v })}
          data-testid="slider-fracture-strength"
        />
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <Label className="text-muted-foreground">Noise</Label>
          <span className="font-mono text-white/70">{fractureParams.noise.toFixed(1)}</span>
        </div>
        <Slider
          value={[fractureParams.noise]}
          min={0}
          max={5}
          step={0.25}
          onValueChange={([v]) => updateFractureParams({ noise: v })}
          data-testid="slider-fracture-noise"
        />
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <Label className="text-muted-foreground">Propagation Rate</Label>
          <span className="font-mono text-white/70">{fractureParams.propagationRate.toFixed(1)}</span>
        </div>
        <Slider
          value={[fractureParams.propagationRate]}
          min={0}
          max={10}
          step={0.5}
          onValueChange={([v]) => updateFractureParams({ propagationRate: v })}
          data-testid="slider-fracture-propagation"
        />
      </div>
    </div>
  );

  const renderDriftSliders = () => (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <Label className="text-muted-foreground">Magnitude</Label>
          <span className="font-mono text-white/70">{driftParams.magnitude.toFixed(1)}</span>
        </div>
        <Slider
          value={[driftParams.magnitude]}
          min={0}
          max={5}
          step={0.25}
          onValueChange={([v]) => updateDriftParams({ magnitude: v })}
          data-testid="slider-drift-magnitude"
        />
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <Label className="text-muted-foreground">Vector X</Label>
          <span className="font-mono text-white/70">{driftParams.vectorX.toFixed(2)}</span>
        </div>
        <Slider
          value={[driftParams.vectorX]}
          min={-1}
          max={1}
          step={0.1}
          onValueChange={([v]) => updateDriftParams({ vectorX: v })}
          data-testid="slider-drift-vectorx"
        />
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <Label className="text-muted-foreground">Vector Y</Label>
          <span className="font-mono text-white/70">{driftParams.vectorY.toFixed(2)}</span>
        </div>
        <Slider
          value={[driftParams.vectorY]}
          min={-1}
          max={1}
          step={0.1}
          onValueChange={([v]) => updateDriftParams({ vectorY: v })}
          data-testid="slider-drift-vectory"
        />
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <Label className="text-muted-foreground">Duration</Label>
          <span className="font-mono text-white/70">{driftParams.duration.toFixed(1)}</span>
        </div>
        <Slider
          value={[driftParams.duration]}
          min={0}
          max={20}
          step={1}
          onValueChange={([v]) => updateDriftParams({ duration: v })}
          data-testid="slider-drift-duration"
        />
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

  return (
    <div className="space-y-4 p-3 bg-gray-900/50 rounded-lg border border-white/10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-white/60" />
          <span className="text-sm font-medium text-white/90">Perturbation</span>
        </div>
        <Button
          variant={perturbMode ? "default" : "outline"}
          size="sm"
          onClick={() => onPerturbModeChange(!perturbMode)}
          className="h-7 text-xs"
          data-testid="button-toggle-perturb-mode"
        >
          {perturbMode ? "Active" : "Inactive"}
        </Button>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Perturbation Mode</Label>
        <Select 
          value={selectedMode} 
          onValueChange={(v) => handleModeChange(v as PerturbationMode)}
        >
          <SelectTrigger className="h-8 text-xs" data-testid="select-perturbation-mode">
            <SelectValue>
              <div className="flex items-center gap-2">
                {ICONS[selectedMode]}
                <span>{selectedModeConfig?.label}</span>
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {PERTURBATION_MODES.map(mode => (
              <SelectItem key={mode.id} value={mode.id} data-testid={`option-mode-${mode.id}`}>
                <div className="flex items-center gap-2">
                  {ICONS[mode.id]}
                  <div>
                    <div className="font-medium">{mode.label}</div>
                    <div className="text-xs text-muted-foreground">{mode.description}</div>
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="pt-2 border-t border-white/10">
        <div className="text-xs text-muted-foreground mb-3">
          {selectedModeConfig?.label} Parameters
        </div>
        {renderParameterSliders()}
      </div>

      <Button
        onClick={handleApplyAtCenter}
        className="w-full"
        size="sm"
        data-testid="button-apply-perturbation"
      >
        <Target className="h-4 w-4 mr-2" />
        Apply at Center
      </Button>
      
      {perturbMode && (
        <p className="text-xs text-center text-muted-foreground">
          Click anywhere on the field to apply perturbation
        </p>
      )}
    </div>
  );
}
