import { 
  ImpulseParams, 
  ShearParams, 
  WaveParams, 
  VortexParams, 
  FractureParams, 
  DriftParams 
} from './types';

function wrapCoord(val: number, max: number): number {
  return ((val % max) + max) % max;
}

export function applyImpulse(
  grid: Float32Array,
  width: number,
  height: number,
  centerX: number,
  centerY: number,
  params: ImpulseParams
): void {
  const { intensity, radius, decay } = params;
  const radiusSq = radius * radius;
  const normalizedIntensity = intensity * 0.1;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let dx = x - centerX;
      let dy = y - centerY;
      
      if (dx > width / 2) dx -= width;
      if (dx < -width / 2) dx += width;
      if (dy > height / 2) dy -= height;
      if (dy < -height / 2) dy += height;
      
      const distSq = dx * dx + dy * dy;
      
      if (distSq < radiusSq) {
        const dist = Math.sqrt(distSq);
        const falloff = Math.exp(-decay * dist / radius * 3);
        const idx = y * width + x;
        grid[idx] += normalizedIntensity * falloff;
      }
    }
  }
}

export function applyShear(
  grid: Float32Array,
  width: number,
  height: number,
  centerX: number,
  centerY: number,
  params: ShearParams
): void {
  const { magnitude, angle, duration } = params;
  const angleRad = (angle * Math.PI) / 180;
  const shearX = Math.cos(angleRad);
  const shearY = Math.sin(angleRad);
  const normalizedMag = magnitude * 0.05 * (duration / 5);
  const effectRadius = Math.min(width, height) * 0.4;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let dx = x - centerX;
      let dy = y - centerY;
      
      if (dx > width / 2) dx -= width;
      if (dx < -width / 2) dx += width;
      if (dy > height / 2) dy -= height;
      if (dy < -height / 2) dy += height;
      
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < effectRadius) {
        const falloff = 1 - (dist / effectRadius);
        const projection = dx * shearX + dy * shearY;
        const idx = y * width + x;
        grid[idx] += normalizedMag * projection * falloff * 0.01;
      }
    }
  }
}

export function applyWave(
  grid: Float32Array,
  width: number,
  height: number,
  centerX: number,
  centerY: number,
  params: WaveParams
): void {
  const { amplitude, frequency, wavelength, damping } = params;
  const normalizedAmp = amplitude * 0.05;
  const waveK = (2 * Math.PI) / Math.max(wavelength, 1);
  const omega = frequency * 0.5;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let dx = x - centerX;
      let dy = y - centerY;
      
      if (dx > width / 2) dx -= width;
      if (dx < -width / 2) dx += width;
      if (dy > height / 2) dy -= height;
      if (dy < -height / 2) dy += height;
      
      const dist = Math.sqrt(dx * dx + dy * dy);
      const envelope = Math.exp(-damping * dist * 0.02);
      const waveValue = Math.sin(waveK * dist - omega);
      
      const idx = y * width + x;
      grid[idx] += normalizedAmp * waveValue * envelope;
    }
  }
}

export function applyVortex(
  grid: Float32Array,
  width: number,
  height: number,
  centerX: number,
  centerY: number,
  params: VortexParams
): void {
  const { angularVelocity, radius, direction } = params;
  const radiusSq = radius * radius;
  const dirSign = direction === 'CW' ? 1 : -1;
  const normalizedVel = angularVelocity * 0.01 * dirSign;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let dx = x - centerX;
      let dy = y - centerY;
      
      if (dx > width / 2) dx -= width;
      if (dx < -width / 2) dx += width;
      if (dy > height / 2) dy -= height;
      if (dy < -height / 2) dy += height;
      
      const distSq = dx * dx + dy * dy;
      
      if (distSq < radiusSq && distSq > 1) {
        const dist = Math.sqrt(distSq);
        const falloff = 1 - (dist / radius);
        const tangentialStrength = normalizedVel * falloff;
        
        const angle = Math.atan2(dy, dx);
        const spiralComponent = Math.sin(angle * 2 + dist * 0.1);
        
        const idx = y * width + x;
        grid[idx] += tangentialStrength * spiralComponent;
      }
    }
  }
}

export function applyFracture(
  grid: Float32Array,
  width: number,
  height: number,
  centerX: number,
  centerY: number,
  params: FractureParams
): void {
  const { strength, noise, propagationRate } = params;
  const normalizedStrength = strength * 0.1;
  const effectRadius = propagationRate * 20;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let dx = x - centerX;
      let dy = y - centerY;
      
      if (dx > width / 2) dx -= width;
      if (dx < -width / 2) dx += width;
      if (dy > height / 2) dy -= height;
      if (dy < -height / 2) dy += height;
      
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < effectRadius) {
        const falloff = 1 - (dist / effectRadius);
        const noiseVal = (Math.random() - 0.5) * noise * 0.2;
        const angle = Math.atan2(dy, dx);
        const fracturePattern = Math.sin(angle * 4) * Math.cos(dist * 0.2);
        
        const idx = y * width + x;
        const currentVal = grid[idx];
        const bifurcation = currentVal > 0 ? 1 : -1;
        
        grid[idx] += normalizedStrength * falloff * (fracturePattern + noiseVal) * bifurcation;
      }
    }
  }
}

export function applyDrift(
  grid: Float32Array,
  width: number,
  height: number,
  centerX: number,
  centerY: number,
  params: DriftParams
): void {
  const { magnitude, vectorX, vectorY, duration } = params;
  const normalizedMag = magnitude * 0.02 * (duration / 10);
  
  const tempGrid = new Float32Array(grid.length);
  tempGrid.set(grid);
  
  const shiftX = vectorX * magnitude * 2;
  const shiftY = vectorY * magnitude * 2;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const sourceX = wrapCoord(Math.round(x - shiftX), width);
      const sourceY = wrapCoord(Math.round(y - shiftY), height);
      
      const srcIdx = sourceY * width + sourceX;
      const dstIdx = y * width + x;
      
      const blend = normalizedMag;
      grid[dstIdx] = grid[dstIdx] * (1 - blend) + tempGrid[srcIdx] * blend;
    }
  }
}
