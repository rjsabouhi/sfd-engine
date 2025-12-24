import { SimulationParameters, SimulationState, FieldData, defaultParameters } from "@shared/schema";

export class SFDEngine {
  private grid: Float32Array;
  private tempGrid: Float32Array;
  private width: number;
  private height: number;
  private params: SimulationParameters;
  private step: number = 0;
  private isRunning: boolean = false;
  private animationId: number | null = null;
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private fps: number = 0;
  private onUpdate: ((state: SimulationState, field: FieldData) => void) | null = null;

  constructor(params: SimulationParameters = defaultParameters) {
    this.params = { ...params };
    this.width = params.gridSize;
    this.height = params.gridSize;
    this.grid = new Float32Array(this.width * this.height);
    this.tempGrid = new Float32Array(this.width * this.height);
    this.initialize();
  }

  private initialize(): void {
    for (let i = 0; i < this.grid.length; i++) {
      this.grid[i] = (Math.random() - 0.5) * 0.1;
    }
    const cx = this.width / 2;
    const cy = this.height / 2;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const dx = (x - cx) / this.width;
        const dy = (y - cy) / this.height;
        const dist = Math.sqrt(dx * dx + dy * dy);
        this.grid[y * this.width + x] += 0.02 * Math.cos(dist * Math.PI * 2);
      }
    }
    this.step = 0;
  }

  reset(): void {
    this.initialize();
    this.notifyUpdate();
  }

  setParams(params: Partial<SimulationParameters>): void {
    const needsResize = params.gridSize !== undefined && params.gridSize !== this.width;
    this.params = { ...this.params, ...params };
    
    if (needsResize) {
      this.width = this.params.gridSize;
      this.height = this.params.gridSize;
      this.grid = new Float32Array(this.width * this.height);
      this.tempGrid = new Float32Array(this.width * this.height);
      this.initialize();
    }
  }

  getParams(): SimulationParameters {
    return { ...this.params };
  }

  private getIndex(x: number, y: number): number {
    const wx = ((x % this.width) + this.width) % this.width;
    const wy = ((y % this.height) + this.height) % this.height;
    return wy * this.width + wx;
  }

  private getValue(x: number, y: number): number {
    return this.grid[this.getIndex(x, y)];
  }

  private computeLaplacian(x: number, y: number): number {
    const center = this.getValue(x, y);
    const sum = 
      this.getValue(x - 1, y) + 
      this.getValue(x + 1, y) + 
      this.getValue(x, y - 1) + 
      this.getValue(x, y + 1);
    return sum - 4 * center;
  }

  private computeLocalMean(x: number, y: number): number {
    let sum = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        sum += this.getValue(x + dx, y + dy);
      }
    }
    return sum / 9;
  }

  private computeGaussianBlur(x: number, y: number): number {
    const sigma = this.params.couplingRadius;
    const radius = Math.ceil(sigma * 2);
    let sum = 0;
    let weight = 0;
    
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const d2 = dx * dx + dy * dy;
        const w = Math.exp(-d2 / (2 * sigma * sigma));
        sum += this.getValue(x + dx, y + dy) * w;
        weight += w;
      }
    }
    return sum / weight;
  }

  private updateStep(): void {
    const { dt, curvatureGain, couplingWeight, attractorStrength, redistributionRate, wK, wT, wC, wA, wR } = this.params;

    let totalEnergy = 0;
    for (let i = 0; i < this.grid.length; i++) {
      totalEnergy += this.grid[i];
    }
    const meanEnergy = totalEnergy / this.grid.length;
    const R = -(meanEnergy * redistributionRate);

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const idx = y * this.width + x;
        const value = this.grid[idx];
        const laplacian = this.computeLaplacian(x, y);
        const K = Math.tanh(laplacian * curvatureGain);

        const gx = (this.getValue(x + 1, y) - this.getValue(x - 1, y)) / 2;
        const gy = (this.getValue(x, y + 1) - this.getValue(x, y - 1)) / 2;
        const gradMag = gx * gx + gy * gy;
        const T = -gradMag / (1 + Math.abs(gradMag));

        const blurred = this.computeGaussianBlur(x, y);
        const C = couplingWeight * blurred - (1 - couplingWeight) * value;

        const localMean = this.computeLocalMean(x, y);
        const A = -Math.tanh(attractorStrength * (value - localMean));

        const delta = wK * K + wT * T + wC * C + wA * A + wR * R;
        const newValue = Math.tanh(value + dt * delta);
        
        this.tempGrid[idx] = newValue;
      }
    }

    const temp = this.grid;
    this.grid = this.tempGrid;
    this.tempGrid = temp;
    
    this.step++;
  }

  private computeStatistics(): { energy: number; variance: number; basinCount: number } {
    let sum = 0;
    let sumSq = 0;
    let minVal = Infinity;
    let maxVal = -Infinity;
    
    for (let i = 0; i < this.grid.length; i++) {
      const v = this.grid[i];
      sum += v;
      sumSq += v * v;
      if (v < minVal) minVal = v;
      if (v > maxVal) maxVal = v;
    }
    
    const n = this.grid.length;
    const mean = sum / n;
    const variance = sumSq / n - mean * mean;
    const energy = sum / n;

    let basinCount = 0;
    const threshold = 0.3;
    const visited = new Set<number>();
    
    for (let y = 1; y < this.height - 1; y++) {
      for (let x = 1; x < this.width - 1; x++) {
        const idx = y * this.width + x;
        const v = this.grid[idx];
        
        if (Math.abs(v) > threshold && !visited.has(idx)) {
          const isLocalExtreme = 
            (v > this.getValue(x-1, y) && v > this.getValue(x+1, y) &&
             v > this.getValue(x, y-1) && v > this.getValue(x, y+1)) ||
            (v < this.getValue(x-1, y) && v < this.getValue(x+1, y) &&
             v < this.getValue(x, y-1) && v < this.getValue(x, y+1));
          
          if (isLocalExtreme) {
            basinCount++;
            for (let dy = -5; dy <= 5; dy++) {
              for (let dx = -5; dx <= 5; dx++) {
                visited.add(this.getIndex(x + dx, y + dy));
              }
            }
          }
        }
      }
    }
    
    return { energy, variance, basinCount };
  }

  private notifyUpdate(): void {
    if (this.onUpdate) {
      const stats = this.computeStatistics();
      const state: SimulationState = {
        step: this.step,
        energy: stats.energy,
        variance: stats.variance,
        basinCount: stats.basinCount,
        isRunning: this.isRunning,
        fps: this.fps,
      };
      const field: FieldData = {
        grid: this.grid,
        width: this.width,
        height: this.height,
      };
      this.onUpdate(state, field);
    }
  }

  private loop = (timestamp: number): void => {
    if (!this.isRunning) return;

    this.frameCount++;
    const elapsed = timestamp - this.lastFrameTime;
    
    if (elapsed >= 1000) {
      this.fps = Math.round((this.frameCount / elapsed) * 1000);
      this.frameCount = 0;
      this.lastFrameTime = timestamp;
    }

    this.updateStep();
    this.notifyUpdate();
    
    this.animationId = requestAnimationFrame(this.loop);
  };

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.frameCount = 0;
    this.animationId = requestAnimationFrame(this.loop);
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.notifyUpdate();
  }

  stepOnce(): void {
    this.updateStep();
    this.notifyUpdate();
  }

  onStateUpdate(callback: (state: SimulationState, field: FieldData) => void): void {
    this.onUpdate = callback;
    this.notifyUpdate();
  }

  getField(): FieldData {
    return {
      grid: this.grid,
      width: this.width,
      height: this.height,
    };
  }

  getState(): SimulationState {
    const stats = this.computeStatistics();
    return {
      step: this.step,
      energy: stats.energy,
      variance: stats.variance,
      basinCount: stats.basinCount,
      isRunning: this.isRunning,
      fps: this.fps,
    };
  }
}
