export type PerturbationMode = 
  | 'impulse' 
  | 'shear' 
  | 'wave' 
  | 'vortex' 
  | 'fracture' 
  | 'drift';

export interface ImpulseParams {
  intensity: number;      // 0-10
  radius: number;         // 0-200
  decay: number;          // 0-1
}

export interface ShearParams {
  magnitude: number;      // 0-10
  angle: number;          // 0-360
  duration: number;       // 0-10
}

export interface WaveParams {
  amplitude: number;      // 0-10
  frequency: number;      // 0-10
  wavelength: number;     // 0-200
  damping: number;        // 0-1
}

export interface VortexParams {
  angularVelocity: number; // 0-20
  radius: number;          // 0-200
  direction: 'CW' | 'CCW';
}

export interface FractureParams {
  strength: number;        // 0-10
  noise: number;           // 0-5
  propagationRate: number; // 0-10
}

export interface DriftParams {
  magnitude: number;       // 0-5
  vectorX: number;         // -1 to 1
  vectorY: number;         // -1 to 1
  duration: number;        // 0-20
}

export type PerturbationParams = 
  | { mode: 'impulse'; params: ImpulseParams }
  | { mode: 'shear'; params: ShearParams }
  | { mode: 'wave'; params: WaveParams }
  | { mode: 'vortex'; params: VortexParams }
  | { mode: 'fracture'; params: FractureParams }
  | { mode: 'drift'; params: DriftParams };

export interface PerturbationModeConfig {
  id: PerturbationMode;
  label: string;
  description: string;
  icon: string;
}

export const PERTURBATION_MODES: PerturbationModeConfig[] = [
  { 
    id: 'impulse', 
    label: 'Impulse', 
    description: 'Local sharp energy injection',
    icon: 'Zap'
  },
  { 
    id: 'shear', 
    label: 'Shear', 
    description: 'Directional field slippage',
    icon: 'ArrowRightLeft'
  },
  { 
    id: 'wave', 
    label: 'Wave', 
    description: 'Propagating oscillation',
    icon: 'Waves'
  },
  { 
    id: 'vortex', 
    label: 'Vortex', 
    description: 'Rotational spiral tension',
    icon: 'RotateCcw'
  },
  { 
    id: 'fracture', 
    label: 'Fracture', 
    description: 'Nonlinear field bifurcation',
    icon: 'Sparkles'
  },
  { 
    id: 'drift', 
    label: 'Drift', 
    description: 'Slow structural shift',
    icon: 'Wind'
  },
];

export const DEFAULT_PARAMS: Record<PerturbationMode, any> = {
  impulse: { intensity: 3, radius: 30, decay: 0.5 } as ImpulseParams,
  shear: { magnitude: 2, angle: 45, duration: 3 } as ShearParams,
  wave: { amplitude: 2, frequency: 3, wavelength: 50, damping: 0.3 } as WaveParams,
  vortex: { angularVelocity: 5, radius: 40, direction: 'CCW' } as VortexParams,
  fracture: { strength: 3, noise: 1, propagationRate: 2 } as FractureParams,
  drift: { magnitude: 1, vectorX: 0.5, vectorY: 0.3, duration: 5 } as DriftParams,
};
