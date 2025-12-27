import { 
  SimulationParameters, 
  SimulationState, 
  FieldData, 
  OperatorContributions,
  ProbeData,
  StructuralSignature,
  BasinMap,
  DerivedField,
  StructuralEvent,
  defaultParameters 
} from "@shared/schema";

interface FrameSnapshot {
  grid: Float32Array;
  step: number;
  stats: { energy: number; variance: number; basinCount: number };
}

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
  
  private ringBuffer: FrameSnapshot[] = [];
  private ringBufferSize: number = 100;
  private ringBufferIndex: number = 0;
  private currentPlaybackIndex: number = -1;
  
  private operatorContributions: OperatorContributions = {
    curvature: 0,
    tension: 0,
    coupling: 0,
    attractor: 0,
    redistribution: 0,
  };
  
  private basinMap: BasinMap | null = null;
  private basinMapUpdateInterval: number = 10;
  private lastBasinMapStep: number = 0;
  
  private structuralEvents: StructuralEvent[] = [];
  private maxEvents: number = 100;
  private lastVariance: number = 0;
  private lastBasinCount: number = 0;
  private varianceHistory: number[] = [];
  private varianceHistorySize: number = 20;

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
    this.ringBuffer = [];
    this.ringBufferIndex = 0;
    this.currentPlaybackIndex = -1;
    this.structuralEvents = [];
    this.lastVariance = 0;
    this.lastBasinCount = 0;
    this.varianceHistory = [];
    this.basinMap = null;
    this.updateBasinMap();
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

  private saveToRingBuffer(): void {
    const snapshot: FrameSnapshot = {
      grid: new Float32Array(this.grid),
      step: this.step,
      stats: this.computeStatistics(),
    };
    
    if (this.ringBuffer.length < this.ringBufferSize) {
      this.ringBuffer.push(snapshot);
    } else {
      this.ringBuffer[this.ringBufferIndex] = snapshot;
    }
    this.ringBufferIndex = (this.ringBufferIndex + 1) % this.ringBufferSize;
  }

  private updateStep(): void {
    this.saveToRingBuffer();
    
    const { dt, curvatureGain, couplingWeight, attractorStrength, redistributionRate, wK, wT, wC, wA, wR } = this.params;

    let totalEnergy = 0;
    for (let i = 0; i < this.grid.length; i++) {
      totalEnergy += this.grid[i];
    }
    const meanEnergy = totalEnergy / this.grid.length;
    const R = -(meanEnergy * redistributionRate);

    let sumK = 0, sumT = 0, sumC = 0, sumA = 0, sumR = 0;

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

        sumK += Math.abs(wK * K);
        sumT += Math.abs(wT * T);
        sumC += Math.abs(wC * C);
        sumA += Math.abs(wA * A);
        sumR += Math.abs(wR * R);

        const delta = wK * K + wT * T + wC * C + wA * A + wR * R;
        const newValue = Math.tanh(value + dt * delta);
        
        this.tempGrid[idx] = newValue;
      }
    }

    const totalContrib = sumK + sumT + sumC + sumA + sumR;
    if (totalContrib > 0) {
      this.operatorContributions = {
        curvature: sumK / totalContrib,
        tension: sumT / totalContrib,
        coupling: sumC / totalContrib,
        attractor: sumA / totalContrib,
        redistribution: sumR / totalContrib,
      };
    }

    const temp = this.grid;
    this.grid = this.tempGrid;
    this.tempGrid = temp;
    
    this.step++;
    
    this.detectEvents();
    
    if (this.step - this.lastBasinMapStep >= this.basinMapUpdateInterval) {
      this.updateBasinMap();
      this.lastBasinMapStep = this.step;
    }
  }

  private detectEvents(): void {
    const stats = this.computeStatistics();
    
    this.varianceHistory.push(stats.variance);
    if (this.varianceHistory.length > this.varianceHistorySize) {
      this.varianceHistory.shift();
    }
    
    if (this.lastVariance > 0) {
      const varianceChange = Math.abs(stats.variance - this.lastVariance) / this.lastVariance;
      if (varianceChange > 0.5) {
        this.addEvent({
          id: `var-${this.step}`,
          step: this.step,
          type: "variance_instability",
          description: `Variance ${varianceChange > 0 ? 'spike' : 'drop'} detected (${(varianceChange * 100).toFixed(1)}% change)`,
        });
      }
    }
    
    if (this.lastBasinCount > 0 && stats.basinCount !== this.lastBasinCount) {
      const diff = stats.basinCount - this.lastBasinCount;
      if (Math.abs(diff) >= 2) {
        this.addEvent({
          id: `basin-${this.step}`,
          step: this.step,
          type: diff > 0 ? "basin_split" : "basin_merge",
          description: `Basin ${diff > 0 ? 'split' : 'merge'}: ${this.lastBasinCount} → ${stats.basinCount}`,
        });
      }
    }
    
    this.lastVariance = stats.variance;
    this.lastBasinCount = stats.basinCount;
  }

  private addEvent(event: StructuralEvent): void {
    this.structuralEvents.unshift(event);
    if (this.structuralEvents.length > this.maxEvents) {
      this.structuralEvents.pop();
    }
  }

  getEvents(): StructuralEvent[] {
    return [...this.structuralEvents];
  }

  clearEvents(): void {
    this.structuralEvents = [];
  }

  private updateBasinMap(): void {
    const labels = new Int32Array(this.width * this.height);
    labels.fill(-1);
    
    let basinId = 0;
    
    for (let y = 1; y < this.height - 1; y++) {
      for (let x = 1; x < this.width - 1; x++) {
        const idx = y * this.width + x;
        if (labels[idx] !== -1) continue;
        
        let cx = x, cy = y;
        const path: number[] = [];
        
        for (let iter = 0; iter < 50; iter++) {
          const cidx = cy * this.width + cx;
          path.push(cidx);
          
          const cv = this.grid[cidx];
          let minVal = cv;
          let nx = cx, ny = cy;
          
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              const px = ((cx + dx) % this.width + this.width) % this.width;
              const py = ((cy + dy) % this.height + this.height) % this.height;
              const pv = this.grid[py * this.width + px];
              if (pv < minVal) {
                minVal = pv;
                nx = px;
                ny = py;
              }
            }
          }
          
          if (nx === cx && ny === cy) break;
          
          const nidx = ny * this.width + nx;
          if (labels[nidx] !== -1) {
            for (const pidx of path) {
              labels[pidx] = labels[nidx];
            }
            break;
          }
          
          cx = nx;
          cy = ny;
        }
        
        if (labels[path[0]] === -1) {
          for (const pidx of path) {
            labels[pidx] = basinId;
          }
          basinId++;
        }
      }
    }
    
    this.basinMap = {
      labels,
      count: basinId,
      width: this.width,
      height: this.height,
    };
  }

  getBasinMap(): BasinMap | null {
    return this.basinMap;
  }

  computeProbeData(x: number, y: number): ProbeData | null {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return null;
    
    const idx = y * this.width + x;
    const value = this.grid[idx];
    const laplacian = this.computeLaplacian(x, y);
    const curvature = Math.tanh(laplacian * this.params.curvatureGain);
    
    const gx = (this.getValue(x + 1, y) - this.getValue(x - 1, y)) / 2;
    const gy = (this.getValue(x, y + 1) - this.getValue(x, y - 1)) / 2;
    const gradientMagnitude = Math.sqrt(gx * gx + gy * gy);
    const tension = -(gx * gx + gy * gy) / (1 + Math.abs(gx * gx + gy * gy));
    
    const blurred = this.computeGaussianBlur(x, y);
    const coupling = this.params.couplingWeight * blurred - (1 - this.params.couplingWeight) * value;
    
    let variance = 0;
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const v = this.getValue(x + dx, y + dy);
        variance += (v - value) * (v - value);
      }
    }
    variance /= 25;
    
    const basinId = this.basinMap ? this.basinMap.labels[idx] : null;
    
    return {
      x,
      y,
      value,
      curvature,
      tension,
      coupling,
      gradientMagnitude,
      neighborhoodVariance: variance,
      basinId,
    };
  }

  computeDerivedField(type: "curvature" | "tension" | "coupling" | "variance"): DerivedField {
    const grid = new Float32Array(this.width * this.height);
    
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const idx = y * this.width + x;
        const value = this.grid[idx];
        
        switch (type) {
          case "curvature": {
            const laplacian = this.computeLaplacian(x, y);
            grid[idx] = Math.tanh(laplacian * this.params.curvatureGain);
            break;
          }
          case "tension": {
            const gx = (this.getValue(x + 1, y) - this.getValue(x - 1, y)) / 2;
            const gy = (this.getValue(x, y + 1) - this.getValue(x, y - 1)) / 2;
            const gradMag = gx * gx + gy * gy;
            grid[idx] = -gradMag / (1 + Math.abs(gradMag));
            break;
          }
          case "coupling": {
            const blurred = this.computeGaussianBlur(x, y);
            grid[idx] = this.params.couplingWeight * blurred - (1 - this.params.couplingWeight) * value;
            break;
          }
          case "variance": {
            let variance = 0;
            const localMean = this.computeLocalMean(x, y);
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                const v = this.getValue(x + dx, y + dy);
                variance += (v - localMean) * (v - localMean);
              }
            }
            grid[idx] = variance / 9;
            break;
          }
        }
      }
    }
    
    return { type, grid, width: this.width, height: this.height };
  }

  computeStructuralSignature(): StructuralSignature {
    const stats = this.computeStatistics();
    
    let totalCurvature = 0;
    let totalTensionVar = 0;
    let tensionMean = 0;
    const tensions: number[] = [];
    
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const laplacian = this.computeLaplacian(x, y);
        totalCurvature += laplacian;
        
        const gx = (this.getValue(x + 1, y) - this.getValue(x - 1, y)) / 2;
        const gy = (this.getValue(x, y + 1) - this.getValue(x, y - 1)) / 2;
        const t = gx * gx + gy * gy;
        tensions.push(t);
        tensionMean += t;
      }
    }
    
    tensionMean /= this.grid.length;
    for (const t of tensions) {
      totalTensionVar += (t - tensionMean) * (t - tensionMean);
    }
    totalTensionVar /= this.grid.length;
    
    let avgBasinDepth = 0;
    if (this.basinMap && this.basinMap.count > 0) {
      const basinMins: number[] = new Array(this.basinMap.count).fill(Infinity);
      for (let i = 0; i < this.grid.length; i++) {
        const bid = this.basinMap.labels[i];
        if (bid >= 0 && this.grid[i] < basinMins[bid]) {
          basinMins[bid] = this.grid[i];
        }
      }
      avgBasinDepth = basinMins.filter(v => v !== Infinity).reduce((a, b) => a + Math.abs(b), 0) / this.basinMap.count;
    }
    
    return {
      basinCount: stats.basinCount,
      avgBasinDepth,
      globalCurvature: totalCurvature / this.grid.length,
      tensionVariance: totalTensionVar,
      stabilityMetric: 1 / (1 + stats.variance),
    };
  }

  getOperatorContributions(): OperatorContributions {
    return { ...this.operatorContributions };
  }

  getHistoryLength(): number {
    return this.ringBuffer.length;
  }

  getCurrentHistoryIndex(): number {
    return this.currentPlaybackIndex >= 0 ? this.currentPlaybackIndex : this.ringBuffer.length - 1;
  }

  stepBackward(): boolean {
    if (this.ringBuffer.length === 0) return false;
    
    if (this.currentPlaybackIndex < 0) {
      this.currentPlaybackIndex = this.ringBuffer.length - 1;
    }
    
    if (this.currentPlaybackIndex > 0) {
      this.currentPlaybackIndex--;
      const snapshot = this.ringBuffer[this.currentPlaybackIndex];
      this.grid = new Float32Array(snapshot.grid);
      this.step = snapshot.step;
      this.notifyUpdate();
      return true;
    }
    return false;
  }

  stepForwardInHistory(): boolean {
    if (this.currentPlaybackIndex < 0) return false;
    
    if (this.currentPlaybackIndex < this.ringBuffer.length - 1) {
      this.currentPlaybackIndex++;
      const snapshot = this.ringBuffer[this.currentPlaybackIndex];
      this.grid = new Float32Array(snapshot.grid);
      this.step = snapshot.step;
      this.notifyUpdate();
      return true;
    } else {
      this.currentPlaybackIndex = -1;
      return false;
    }
  }

  seekToFrame(index: number): void {
    if (index < 0 || index >= this.ringBuffer.length) return;
    
    this.currentPlaybackIndex = index;
    const snapshot = this.ringBuffer[index];
    this.grid = new Float32Array(snapshot.grid);
    this.step = snapshot.step;
    this.notifyUpdate();
  }

  exitPlaybackMode(): void {
    this.currentPlaybackIndex = -1;
  }

  isInPlaybackMode(): boolean {
    return this.currentPlaybackIndex >= 0;
  }

  private computeStatistics(): { energy: number; variance: number; basinCount: number } {
    let sum = 0;
    let sumSq = 0;
    
    for (let i = 0; i < this.grid.length; i++) {
      const v = this.grid[i];
      sum += v;
      sumSq += v * v;
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
    this.currentPlaybackIndex = -1;
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
    if (this.currentPlaybackIndex >= 0) {
      this.stepForwardInHistory();
    } else {
      this.updateStep();
      this.notifyUpdate();
    }
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

  exportSettings(): string {
    return JSON.stringify(this.params, null, 2);
  }

  getGridSize(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }
}
