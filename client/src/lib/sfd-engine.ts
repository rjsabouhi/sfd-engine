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
  
  // Reactive event tracking for status line
  private reactiveEvents = {
    varianceSpike: false,
    basinMerge: false,
    boundaryFracture: false,
    approachingStability: false,
    enterCriticality: false,
    enterChaos: false,
    exitChaos: false,
  };
  private stepsInFirstMotion: number = 0;
  private lastCurvatureMax: number = 0;
  private wasInChaos: boolean = false;
  
  // Cached analytics - updated periodically to avoid per-frame computation
  private cachedSignature: StructuralSignature | null = null;
  private signatureCacheInterval: number = 15; // Update every N steps
  private lastSignatureCacheStep: number = 0;
  
  // Cached derived fields - reuse typed arrays
  private cachedDerivedFields: Map<string, DerivedField> = new Map();
  private derivedFieldCacheInterval: number = 10;
  private lastDerivedFieldCacheStep: number = 0;
  
  // Ring buffer sampling - only save every N frames to reduce allocations
  private ringBufferSampleInterval: number = 3;

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
    this.cachedSignature = null;
    this.lastSignatureCacheStep = 0;
    this.cachedDerivedFields.clear();
    this.lastDerivedFieldCacheStep = 0;
    this.stepsInFirstMotion = 0;
    this.lastCurvatureMax = 0;
    this.wasInChaos = false;
    this.resetReactiveEvents();
    this.updateBasinMap();
  }
  
  private resetReactiveEvents(): void {
    this.reactiveEvents = {
      varianceSpike: false,
      basinMerge: false,
      boundaryFracture: false,
      approachingStability: false,
      enterCriticality: false,
      enterChaos: false,
      exitChaos: false,
    };
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
    // Only save every N frames to reduce memory allocations
    if (this.step % this.ringBufferSampleInterval !== 0) return;
    
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

        let delta = wK * K + wT * T + wC * C + wA * A + wR * R;
        if (!isFinite(delta)) delta = 0;
        delta = Math.max(-10, Math.min(10, delta));
        
        let newValue = Math.tanh(value + dt * delta);
        if (!isFinite(newValue)) newValue = 0;
        
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
    
    // Update cached signature periodically
    if (this.step - this.lastSignatureCacheStep >= this.signatureCacheInterval) {
      this.cachedSignature = this.computeStructuralSignature();
      this.lastSignatureCacheStep = this.step;
    }
  }

  private detectEvents(): void {
    const stats = this.computeStatistics();
    
    // Reset reactive events each frame
    this.resetReactiveEvents();
    
    this.varianceHistory.push(stats.variance);
    if (this.varianceHistory.length > this.varianceHistorySize) {
      this.varianceHistory.shift();
    }
    
    // Calculate variance change over 12 steps (as per GPT's spec)
    let varianceChange12 = 0;
    if (this.varianceHistory.length >= 12) {
      const old = this.varianceHistory[this.varianceHistory.length - 12];
      if (old > 0.001) {
        varianceChange12 = (stats.variance - old) / old;
      }
    }
    
    // Variance spike detection (>40% change over 12 steps)
    if (varianceChange12 > 0.40) {
      this.reactiveEvents.varianceSpike = true;
      this.addEvent({
        id: `var-${this.step}`,
        step: this.step,
        type: "variance_instability",
        description: `Variance spike detected (${(varianceChange12 * 100).toFixed(1)}% change)`,
      });
    }
    
    // Basin merge detection (depth difference < 0.05)
    if (this.lastBasinCount > 0 && stats.basinCount !== this.lastBasinCount) {
      const diff = stats.basinCount - this.lastBasinCount;
      if (diff < 0 && Math.abs(diff) >= 1) {
        this.reactiveEvents.basinMerge = true;
        this.addEvent({
          id: `basin-${this.step}`,
          step: this.step,
          type: "basin_merge",
          description: `Basin merge: ${this.lastBasinCount} → ${stats.basinCount}`,
        });
      } else if (diff >= 2) {
        this.addEvent({
          id: `basin-${this.step}`,
          step: this.step,
          type: "basin_split",
          description: `Basin split: ${this.lastBasinCount} → ${stats.basinCount}`,
        });
      }
    }
    
    // Approaching stability detection (variance derivative < 0.001)
    if (this.varianceHistory.length >= 3) {
      const recentVariance = this.varianceHistory.slice(-3);
      const varianceDerivative = Math.abs(recentVariance[2] - recentVariance[0]) / 2;
      if (varianceDerivative < 0.001 && stats.variance < 0.05) {
        this.reactiveEvents.approachingStability = true;
      }
    }
    
    // Criticality detection - high variance sensitivity
    const isHighSensitivity = stats.variance > 0.1 && stats.variance < 0.2;
    if (isHighSensitivity && stats.basinCount > 2) {
      this.reactiveEvents.enterCriticality = true;
    }
    
    // Chaos detection - very high variance and rapid change
    const isInChaos = stats.variance > 0.25 && varianceChange12 > 0.2;
    if (isInChaos && !this.wasInChaos) {
      this.reactiveEvents.enterChaos = true;
    }
    if (!isInChaos && this.wasInChaos) {
      this.reactiveEvents.exitChaos = true;
    }
    this.wasInChaos = isInChaos;
    
    // Boundary fracture detection - curvature max spike
    const curvatureMax = this.computeCurvatureMax();
    if (this.lastCurvatureMax > 0 && curvatureMax > this.lastCurvatureMax * 1.5) {
      this.reactiveEvents.boundaryFracture = true;
    }
    this.lastCurvatureMax = curvatureMax;
    
    this.lastVariance = stats.variance;
    this.lastBasinCount = stats.basinCount;
  }
  
  private computeCurvatureMax(): number {
    let maxCurv = 0;
    for (let y = 1; y < this.height - 1; y++) {
      for (let x = 1; x < this.width - 1; x++) {
        const laplacian = Math.abs(this.computeLaplacian(x, y));
        if (laplacian > maxCurv) maxCurv = laplacian;
      }
    }
    return maxCurv;
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
  
  getReactiveEvents(): typeof this.reactiveEvents {
    return { ...this.reactiveEvents };
  }
  
  getSimulationPhase(): "idle" | "firstMotion" | "running" {
    if (!this.isRunning) return "idle";
    if (this.step < 15) return "firstMotion";
    return "running";
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
    let tensionSum = 0;
    let tensionSumSq = 0;
    const n = this.grid.length;
    
    // Single pass - compute sums for both curvature and tension variance
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const laplacian = this.computeLaplacian(x, y);
        totalCurvature += laplacian;
        
        const gx = (this.getValue(x + 1, y) - this.getValue(x - 1, y)) / 2;
        const gy = (this.getValue(x, y + 1) - this.getValue(x, y - 1)) / 2;
        const t = gx * gx + gy * gy;
        tensionSum += t;
        tensionSumSq += t * t;
      }
    }
    
    // Variance = E[X^2] - E[X]^2 (avoids storing array)
    const tensionMean = tensionSum / n;
    const totalTensionVar = (tensionSumSq / n) - (tensionMean * tensionMean);
    
    let avgBasinDepth = 0;
    if (this.basinMap && this.basinMap.count > 0) {
      const basinMins: number[] = new Array(this.basinMap.count).fill(Infinity);
      for (let i = 0; i < n; i++) {
        const bid = this.basinMap.labels[i];
        if (bid >= 0 && this.grid[i] < basinMins[bid]) {
          basinMins[bid] = this.grid[i];
        }
      }
      let depthSum = 0;
      let count = 0;
      for (let i = 0; i < basinMins.length; i++) {
        if (basinMins[i] !== Infinity) {
          depthSum += Math.abs(basinMins[i]);
          count++;
        }
      }
      avgBasinDepth = count > 0 ? depthSum / count : 0;
    }
    
    return {
      basinCount: stats.basinCount,
      avgBasinDepth,
      globalCurvature: totalCurvature / n,
      tensionVariance: totalTensionVar,
      stabilityMetric: 1 / (1 + stats.variance),
    };
  }

  getOperatorContributions(): OperatorContributions {
    return { ...this.operatorContributions };
  }

  getCachedSignature(): StructuralSignature {
    // Return cached signature or compute if not yet available
    if (!this.cachedSignature) {
      this.cachedSignature = this.computeStructuralSignature();
    }
    return this.cachedSignature;
  }

  getCachedDerivedField(type: "curvature" | "tension" | "coupling" | "variance"): DerivedField {
    // Check if we need to refresh (every N steps)
    const needsRefresh = this.step - this.lastDerivedFieldCacheStep >= this.derivedFieldCacheInterval;
    
    if (needsRefresh || !this.cachedDerivedFields.has(type)) {
      // Reuse existing typed array if possible
      const existing = this.cachedDerivedFields.get(type);
      const grid = existing && existing.grid.length === this.width * this.height 
        ? existing.grid 
        : new Float32Array(this.width * this.height);
      
      this.computeDerivedFieldInto(type, grid);
      
      const field: DerivedField = { type, grid, width: this.width, height: this.height };
      this.cachedDerivedFields.set(type, field);
      
      if (needsRefresh) {
        this.lastDerivedFieldCacheStep = this.step;
      }
    }
    
    return this.cachedDerivedFields.get(type)!;
  }

  private computeDerivedFieldInto(type: "curvature" | "tension" | "coupling" | "variance", grid: Float32Array): void {
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
