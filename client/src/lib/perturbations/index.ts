export * from './types';
export * from './modes';

import { PerturbationParams } from './types';
import { 
  applyImpulse, 
  applyShear, 
  applyWave, 
  applyVortex, 
  applyFracture, 
  applyDrift 
} from './modes';

export function applyDisturbance(
  grid: Float32Array,
  width: number,
  height: number,
  centerX: number,
  centerY: number,
  perturbation: PerturbationParams
): void {
  switch (perturbation.mode) {
    case 'impulse':
      applyImpulse(grid, width, height, centerX, centerY, perturbation.params);
      break;
    case 'shear':
      applyShear(grid, width, height, centerX, centerY, perturbation.params);
      break;
    case 'wave':
      applyWave(grid, width, height, centerX, centerY, perturbation.params);
      break;
    case 'vortex':
      applyVortex(grid, width, height, centerX, centerY, perturbation.params);
      break;
    case 'fracture':
      applyFracture(grid, width, height, centerX, centerY, perturbation.params);
      break;
    case 'drift':
      applyDrift(grid, width, height, centerX, centerY, perturbation.params);
      break;
  }
}
