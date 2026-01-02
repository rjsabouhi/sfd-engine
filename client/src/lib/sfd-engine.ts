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
  TrendMetrics,
  defaultParameters 
} from "@shared/schema";

interface FrameSnapshot {
  grid: Float32Array;
  step: number;
  stats: { energy: number; variance: number; basinCount: number };
  fieldState: "calm" | "unsettled" | "reorganizing" | "transforming";
}

// Diagnostic data types
export interface DiagnosticSolverData {
  step: number;
  energy: number;
  deltaEnergy: number;
  variance: number;
  deltaVariance: number;
  varianceDerivative: number;
  isUnstable: boolean;
  energyHistory: number[];
  varianceHistory: number[];
}

export interface DiagnosticRenderData {
  frameTime: number;
  droppedFrames: number;
  renderMode: 'canvas2d';
  resolution: { width: number; height: number };
  fps: number;
}

export interface DiagnosticInternalsData {
  gridStats: { min: number; max: number; mean: number; std: number };
  gradientMagnitudeStats: { min: number; max: number; mean: number };
  curvatureStats: { min: number; max: number; mean: number };
  laplacianDistribution: number[];
  laplacianMean: number;
  basinCount: number;
  frameHashHistory: string[];
}

export interface DeterminismReport {
  seed: number;
  stepsRun: number;
  finalHash: string;
  run1FinalEnergy: number;
  run2FinalEnergy: number;
  pixelDifference: number;
  meanAbsoluteDeviation: number;
  isDeterministic: boolean;
  diffGrid: Float32Array | null;
}

// Mulberry32 seedable PRNG
function mulberry32(seed: number): () => number {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export class SFDEngine {
  private grid: Float32Array;
  private tempGrid: Float32Array;
  private playbackDisplayGrid: Float32Array | null = null; // Separate grid for playback display only
  private width: number;
  private height: number;
  private params: SimulationParameters;
  private step: number = 0;
  private playbackDisplayStep: number = 0; // Separate step counter for playback display
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
  private basinMapUpdateInterval: number = 3; // Update more frequently for smoother overlays
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
  private signatureCacheInterval: number = 5; // Update every N steps (smoother metrics)
  private lastSignatureCacheStep: number = 0;
  
  // Coherence history for sparkline
  private coherenceHistory: number[] = [];
  private coherenceHistorySize: number = 60;
  
  // Cached derived fields - reuse typed arrays
  private cachedDerivedFields: Map<string, DerivedField> = new Map();
  private derivedFieldCacheInterval: number = 1;
  private lastDerivedFieldCacheStep: number = 0;
  
  // Ring buffer sampling - only save every N frames to reduce allocations
  private ringBufferSampleInterval: number = 3;
  
  // Diagnostic tracking
  private currentSeed: number = Date.now();
  private rng: () => number = Math.random;
  private energyHistory: number[] = [];
  private frameHashHistory: string[] = [];
  private maxFrameHashHistory: number = 20;
  private energyHistorySize: number = 100;
  private lastEnergy: number = 0;
  private lastFrameTimeMs: number = 0;
  private droppedFrames: number = 0;
  private targetFrameTime: number = 16.67; // 60fps target
  
  // Simulation speed control - steps per second (0 = max speed)
  private targetStepsPerSecond: number = 0; // 0 = max speed
  private lastStepTimestamp: number = 0;
  
  // Field state hysteresis - stored on engine to survive callback rebindings
  private displayedFieldState: "calm" | "unsettled" | "reorganizing" | "transforming" = "calm";
  private fieldStateHoldUntil: number = 0; // timestamp when state can next change
  private fieldStateMinHoldMs: number = 5000; // 5 seconds minimum between changes
  private lastFieldStateUpdateTime: number = 0;
  
  // Memory buffer for hysteresis/memory visualization
  private memoryBuffer: Float32Array | null = null;
  private prevGrid: Float32Array | null = null;

  // Trend tracking for aggregated metrics
  private trendWindowSize: number = 30;
  private energyTrendBuffer: number[] = [];
  private varianceTrendBuffer: number[] = [];
  private curvatureTrendBuffer: number[] = [];
  private gradientPeakBuffer: number[] = [];
  private basinCountBuffer: number[] = [];
  private stabilityBuffer: ("stable" | "borderline" | "unstable")[] = [];
  private basinMergeEvents: number = 0;
  private lastTrendBasinCount: number = 0;
  private skeletonComplexityCache: number = 0;

  constructor(params: SimulationParameters = defaultParameters) {
    this.params = { ...params };
    this.width = params.gridSize;
    this.height = params.gridSize;
    this.grid = new Float32Array(this.width * this.height);
    this.tempGrid = new Float32Array(this.width * this.height);
    this.initialize();
  }

  private initialize(seed?: number): void {
    // Use provided seed or generate new one
    this.currentSeed = seed ?? Date.now();
    this.rng = mulberry32(this.currentSeed);
    
    const cx = this.width / 2;
    const cy = this.height / 2;
    
    // Mode-specific initialization
    if (this.params.mode === 'cosmicweb') {
      // Cosmic Web: higher noise with coherence bias for filament formation
      const noiseAmp = 0.05;
      const coherenceBias = 0.31;
      
      for (let i = 0; i < this.grid.length; i++) {
        this.grid[i] = (this.rng() - 0.5) * noiseAmp;
      }
      
      // Add patchy clustering seeds
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          const idx = y * this.width + x;
          // Create random density fluctuations
          if (this.rng() < 0.1) {
            const intensity = (this.rng() - 0.5) * coherenceBias;
            // Spread to neighbors
            for (let dy = -2; dy <= 2; dy++) {
              for (let dx = -2; dx <= 2; dx++) {
                const nIdx = this.getIndex(x + dx, y + dy);
                this.grid[nIdx] += intensity * Math.exp(-(dx*dx + dy*dy) / 4);
              }
            }
          }
        }
      }
    } else {
      // Standard initialization for other modes
      for (let i = 0; i < this.grid.length; i++) {
        this.grid[i] = (this.rng() - 0.5) * 0.1;
      }
      // Add cosine ripple from center for circular evolution
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          const dx = (x - cx) / this.width;
          const dy = (y - cy) / this.height;
          const dist = Math.sqrt(dx * dx + dy * dy);
          this.grid[y * this.width + x] += 0.02 * Math.cos(dist * Math.PI * 2);
        }
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
    this.energyHistory = [];
    this.lastEnergy = 0;
    this.basinMap = null;
    this.cachedSignature = null;
    this.lastSignatureCacheStep = 0;
    this.cachedDerivedFields.clear();
    this.lastDerivedFieldCacheStep = 0;
    this.stepsInFirstMotion = 0;
    this.lastCurvatureMax = 0;
    this.wasInChaos = false;
    this.droppedFrames = 0;
    // Reset memory/hysteresis buffers
    this.memoryBuffer = new Float32Array(this.width * this.height);
    this.prevGrid = new Float32Array(this.grid);
    // Reset trend buffers
    this.energyTrendBuffer = [];
    this.varianceTrendBuffer = [];
    this.curvatureTrendBuffer = [];
    this.gradientPeakBuffer = [];
    this.basinCountBuffer = [];
    this.stabilityBuffer = [];
    this.basinMergeEvents = 0;
    this.lastTrendBasinCount = 0;
    this.skeletonComplexityCache = 0;
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
    // Reinitialize the field with current parameters (keeps current preset/mode)
    this.currentPlaybackIndex = -1;
    this.playbackDisplayGrid = null;
    this.initialize();
    this.notifyUpdate();
  }
  
  resetToDefaults(): void {
    // Reset parameters to absolute defaults (including mode)
    this.params = { ...defaultParameters };
    this.width = this.params.gridSize;
    this.height = this.params.gridSize;
    this.grid = new Float32Array(this.width * this.height);
    this.tempGrid = new Float32Array(this.width * this.height);
    this.currentPlaybackIndex = -1;
    this.playbackDisplayGrid = null;
    this.initialize();
    this.notifyUpdate();
  }

  setParams(params: Partial<SimulationParameters>): void {
    const needsResize = params.gridSize !== undefined && params.gridSize !== this.width;
    const modeChanged = params.mode !== undefined && params.mode !== this.params.mode;
    
    // Detect significant parameter changes that should clear history
    const significantChange = modeChanged || 
      (params.wK !== undefined && Math.abs(params.wK - this.params.wK) > 0.5) ||
      (params.wT !== undefined && Math.abs(params.wT - this.params.wT) > 0.5) ||
      (params.wC !== undefined && Math.abs(params.wC - this.params.wC) > 0.5);
    
    this.params = { ...this.params, ...params };
    
    // Clear ring buffer on significant changes to prevent mixing old/new frames
    if (significantChange) {
      this.ringBuffer = [];
      this.ringBufferIndex = 0;
      this.currentPlaybackIndex = -1;
      this.playbackDisplayGrid = null;
    }
    
    if (needsResize) {
      this.width = this.params.gridSize;
      this.height = this.params.gridSize;
      this.grid = new Float32Array(this.width * this.height);
      this.tempGrid = new Float32Array(this.width * this.height);
      this.initialize();
      this.notifyUpdate();
    } else if (modeChanged) {
      // Mode change requires reinitialization for proper field setup
      // (e.g., cosmic web needs special clustering seeds)
      this.initialize();
      this.notifyUpdate();
    } else if (params.couplingRadius !== undefined) {
      // Radius change affects rendering, notify immediately
      this.notifyUpdate();
    } else if (params.wK !== undefined || params.wT !== undefined || 
               params.wC !== undefined || params.wA !== undefined || params.wR !== undefined) {
      // Weight parameter changes - run one step immediately for responsive feedback
      // This works whether paused or running, ensuring slider changes are instantly visible
      this.updateStep();
      this.notifyUpdate();
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
    // Use playback display grid when in playback mode, otherwise use live grid
    const sourceGrid = this.playbackDisplayGrid !== null ? this.playbackDisplayGrid : this.grid;
    return sourceGrid[this.getIndex(x, y)];
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
      fieldState: this.displayedFieldState, // Capture current field state for playback
    };
    
    if (this.ringBuffer.length < this.ringBufferSize) {
      this.ringBuffer.push(snapshot);
    } else {
      this.ringBuffer[this.ringBufferIndex] = snapshot;
    }
    this.ringBufferIndex = (this.ringBufferIndex + 1) % this.ringBufferSize;
  }

  // Criticality Cascade (SP₁): Field tuned near instability threshold
  private updateCriticalityStep(): void {
    const alpha = 0.62;  // diffusion
    const beta = 1.35;   // nonlinear tension
    const gamma = 0.87;  // curvature response
    const lambda = 0.05; // stabilizer
    
    // Inject instability at frame 150
    if (this.step === 150) {
      const cx = Math.floor(this.width / 2);
      const cy = Math.floor(this.height / 2);
      const radius = 4;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (dx*dx + dy*dy <= radius*radius) {
            const x = cx + dx;
            const y = cy + dy;
            if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
              this.grid[y * this.width + x] += 0.04;
            }
          }
        }
      }
    }

    for (let y = 1; y < this.height - 1; y++) {
      for (let x = 1; x < this.width - 1; x++) {
        const idx = y * this.width + x;
        const value = this.grid[idx];
        
        // Laplacian (diffusion)
        const laplacian = this.grid[idx - 1] + this.grid[idx + 1] + 
                          this.grid[idx - this.width] + this.grid[idx + this.width] - 4 * value;
        
        // Gradient magnitude (tension)
        const gx = (this.grid[idx + 1] - this.grid[idx - 1]) / 2;
        const gy = (this.grid[idx + this.width] - this.grid[idx - this.width]) / 2;
        const gradMag = Math.sqrt(gx*gx + gy*gy);
        
        // Nonlinear tension term
        const tension = -beta * gradMag * Math.tanh(gradMag);
        
        // Curvature response
        const curvature = gamma * laplacian;
        
        // Stabilizer
        const stabilizer = -lambda * value * value * value;
        
        // Update
        const delta = alpha * laplacian + tension + curvature + stabilizer;
        this.tempGrid[idx] = value + this.params.dt * delta;
      }
    }
    
    // Border damping
    for (let x = 0; x < this.width; x++) {
      this.tempGrid[x] *= 0.95;
      this.tempGrid[(this.height - 1) * this.width + x] *= 0.95;
    }
    for (let y = 0; y < this.height; y++) {
      this.tempGrid[y * this.width] *= 0.95;
      this.tempGrid[y * this.width + this.width - 1] *= 0.95;
    }

    const temp = this.grid;
    this.grid = this.tempGrid;
    this.tempGrid = temp;
  }

  // Fractal Corridor (SP₂): Multi-scale coherence emergence
  private updateFractalStep(): void {
    const scales = [1, 2, 4, 8];
    
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const idx = y * this.width + x;
        let acc = 0;
        let weight = 0;
        
        // Multi-scale sampling
        for (const scale of scales) {
          const samples = [
            this.getValue(x + scale, y),
            this.getValue(x - scale, y),
            this.getValue(x, y + scale),
            this.getValue(x, y - scale),
            this.getValue(x + scale, y + scale),
            this.getValue(x - scale, y - scale),
          ];
          
          const scaleWeight = 1 / scale;
          for (const s of samples) {
            acc += s * scaleWeight;
            weight += scaleWeight;
          }
        }
        
        const multiScaleMean = acc / weight;
        const current = this.grid[idx];
        
        // Fractal coupling
        const alpha = 0.12;
        const fractalTerm = Math.sin(multiScaleMean * Math.PI * 2) * 0.1;
        
        this.tempGrid[idx] = current + alpha * (multiScaleMean - current) + fractalTerm;
      }
    }

    const temp = this.grid;
    this.grid = this.tempGrid;
    this.tempGrid = temp;
  }

  // Cosmic Web Analog (SP₃): Filament-void structure formation
  private updateCosmicWebStep(): void {
    // Cosmic web parameters - closer to spec but with stability scaling
    const stabilityScale = 0.15; // Scale factor for numerical stability
    const alpha = 0.08 * stabilityScale;        // diffusion
    const beta = 1.93 * stabilityScale;         // tension
    const gamma = 1.15 * stabilityScale;        // curvature response
    const chi = 1.47 * stabilityScale;          // filament reinforcement
    const nu = 0.62 * stabilityScale;           // void pressure
    const lambda = 0.03;                        // damping
    const densityThreshold = 0.27;
    const scaleBias = 0.84;
    
    for (let y = 1; y < this.height - 1; y++) {
      for (let x = 1; x < this.width - 1; x++) {
        const idx = y * this.width + x;
        const value = this.grid[idx];
        
        // Laplacian for diffusion
        const laplacian = this.grid[idx - 1] + this.grid[idx + 1] + 
                          this.grid[idx - this.width] + this.grid[idx + this.width] - 4 * value;
        
        // Gradient for tension
        const gx = (this.grid[idx + 1] - this.grid[idx - 1]) / 2;
        const gy = (this.grid[idx + this.width] - this.grid[idx - this.width]) / 2;
        const gradMag = Math.sqrt(gx*gx + gy*gy);
        
        // Multi-scale coherence (recursive subdivision simulation)
        let multiScaleMean = 0;
        const scales = [1, 2, 4];
        for (const s of scales) {
          let acc = 0;
          let count = 0;
          for (let dy = -s; dy <= s; dy += s) {
            for (let dx = -s; dx <= s; dx += s) {
              acc += this.getValue(x + dx, y + dy);
              count++;
            }
          }
          multiScaleMean += (acc / count) * Math.pow(scaleBias, scales.indexOf(s));
        }
        multiScaleMean /= scales.length;
        
        // Void pressure: negative density regions expand (gentler)
        const voidPressure = value < -densityThreshold ? nu * Math.abs(value) : 0;
        
        // Filament reinforcement: high gradient regions consolidate (gentler)
        const filamentTerm = gradMag > densityThreshold ? chi * Math.tanh(gradMag) * Math.sign(value) : 0;
        
        // Tension creates structure (gentler)
        const tension = -beta * Math.tanh(gradMag * 2);
        
        // Curvature response
        const curvature = gamma * laplacian;
        
        // Coherence coupling (pulls toward multi-scale mean)
        const coherence = 0.15 * (multiScaleMean - value);
        
        // Damping
        const damping = -lambda * value * value * value;
        
        // Combined dynamics
        const delta = alpha * laplacian + tension + curvature + filamentTerm - voidPressure + coherence + damping;
        this.tempGrid[idx] = Math.tanh(value + this.params.dt * delta);
      }
    }

    const temp = this.grid;
    this.grid = this.tempGrid;
    this.tempGrid = temp;
  }

  // Quasi-Crystal Mode: Symbolic aperiodic tiling with emergent radial symmetry
  private updateQuasiCrystalStep(): void {
    // Rotational basis vectors (5-fold symmetry)
    const angles = [0, Math.PI/5, 2*Math.PI/5, 3*Math.PI/5, 4*Math.PI/5];
    
    // Slow global rotation drift (symbolic)
    const drift = 0.0008 * Math.sin(this.step * 0.0003);

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const i = y * this.width + x;

        let acc = 0;
        let totalWeight = 0;

        // Radial distance from center
        const dx = x - this.width / 2;
        const dy = y - this.height / 2;
        const r = Math.sqrt(dx*dx + dy*dy) + 1e-6;

        // Angle relative to center
        let theta = Math.atan2(dy, dx);

        // Apply global drift
        theta += drift;

        // Aperiodic rotational sampling
        for (let k = 0; k < angles.length; k++) {
          const a = theta + angles[k];

          const sx = Math.floor(x + Math.cos(a) * 2);
          const sy = Math.floor(y + Math.sin(a) * 2);

          if (sx >= 0 && sy >= 0 && sx < this.width && sy < this.height) {
            const j = sy * this.width + sx;
            const w = 1 / (1 + Math.abs(a)); // Symbolic angular weight
            acc += this.grid[j] * w;
            totalWeight += w;
          }
        }

        // Local relaxation toward aperiodic order
        const local = acc / totalWeight;
        const current = this.grid[i];

        const alpha = 0.14; // Structural relaxation rate
        let newValue = current + alpha * (local - current);

        // Edge stabilization to prevent collapse
        if (r > this.width * 0.47) {
          newValue *= 0.95;
        }

        this.tempGrid[i] = newValue;
      }
    }

    // Swap buffers
    const temp = this.grid;
    this.grid = this.tempGrid;
    this.tempGrid = temp;
  }

  private updateStep(): void {
    this.saveToRingBuffer();
    
    // Check for special modes
    const specialModes = ["quasicrystal", "criticality", "fractal", "cosmicweb"];
    if (specialModes.includes(this.params.mode)) {
      switch (this.params.mode) {
        case "quasicrystal":
          this.updateQuasiCrystalStep();
          break;
        case "criticality":
          this.updateCriticalityStep();
          break;
        case "fractal":
          this.updateFractalStep();
          break;
        case "cosmicweb":
          this.updateCosmicWebStep();
          break;
      }
      this.step++;
      this.detectEvents();
      if (this.step - this.lastBasinMapStep >= this.basinMapUpdateInterval) {
        this.updateBasinMap();
        this.lastBasinMapStep = this.step;
      }
      if (this.step - this.lastSignatureCacheStep >= this.signatureCacheInterval) {
        this.cachedSignature = this.computeStructuralSignature();
        this.lastSignatureCacheStep = this.step;
      }
      return;
    }
    
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
    
    // Update memory buffer for hysteresis visualization
    if (this.memoryBuffer && this.prevGrid) {
      for (let i = 0; i < this.grid.length; i++) {
        this.memoryBuffer[i] += Math.abs(this.grid[i] - this.prevGrid[i]);
      }
      // Copy current grid to prevGrid for next step
      this.prevGrid.set(this.grid);
    }
    
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
    
    // Update trend buffers for aggregated metrics
    this.updateTrendBuffers(stats);
    
    // Track energy history for diagnostics sparkline
    this.trackDiagnostics(stats.energy);
    
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
  
  // Get the debounced field state - manages hysteresis internally
  getDebouncedFieldState(
    candidateState: "calm" | "unsettled" | "reorganizing" | "transforming"
  ): "calm" | "unsettled" | "reorganizing" | "transforming" {
    const now = Date.now();
    
    // If candidate is different and hold period has passed, allow change
    if (candidateState !== this.displayedFieldState && now >= this.fieldStateHoldUntil) {
      this.displayedFieldState = candidateState;
      this.fieldStateHoldUntil = now + this.fieldStateMinHoldMs;
      this.lastFieldStateUpdateTime = now;
    }
    
    return this.displayedFieldState;
  }
  
  getSimulationPhase(): "idle" | "firstMotion" | "running" {
    if (!this.isRunning) return "idle";
    if (this.step < 15) return "firstMotion";
    return "running";
  }

  private updateBasinMap(): void {
    // Use playback display grid when in playback mode, otherwise use live grid
    const sourceGrid = this.playbackDisplayGrid !== null ? this.playbackDisplayGrid : this.grid;
    
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
          
          const cv = sourceGrid[cidx];
          let minVal = cv;
          let nx = cx, ny = cy;
          
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              const px = ((cx + dx) % this.width + this.width) % this.width;
              const py = ((cy + dy) % this.height + this.height) % this.height;
              const pv = sourceGrid[py * this.width + px];
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

  computeDerivedField(type: "curvature" | "tension" | "coupling" | "variance" | "gradientFlow" | "criticality" | "hysteresis" | "constraintSkeleton" | "stabilityField" | "gradientFlowLines"): DerivedField {
    const grid = new Float32Array(this.width * this.height);
    // Use playback display grid when in playback mode
    const sourceGrid = this.playbackDisplayGrid !== null ? this.playbackDisplayGrid : this.grid;
    
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const idx = y * this.width + x;
        const value = sourceGrid[idx];
        
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
          case "gradientFlow": {
            const gx = (this.getValue(x + 1, y) - this.getValue(x - 1, y)) / 2;
            const gy = (this.getValue(x, y + 1) - this.getValue(x, y - 1)) / 2;
            const mag = Math.sqrt(gx * gx + gy * gy);
            const angle = Math.atan2(gy, gx);
            grid[idx] = (angle + Math.PI) / (2 * Math.PI) * mag;
            break;
          }
          case "criticality": {
            const dxx = this.getValue(x + 1, y) - 2 * value + this.getValue(x - 1, y);
            const dyy = this.getValue(x, y + 1) - 2 * value + this.getValue(x, y - 1);
            const dxy = (this.getValue(x + 1, y + 1) - this.getValue(x - 1, y + 1) 
                       - this.getValue(x + 1, y - 1) + this.getValue(x - 1, y - 1)) / 4;
            const detH = dxx * dyy - dxy * dxy;
            grid[idx] = 1.0 / (Math.abs(detH) + 1e-6);
            break;
          }
          case "hysteresis": {
            grid[idx] = this.memoryBuffer ? this.memoryBuffer[idx] : 0;
            break;
          }
          case "constraintSkeleton": {
            const gx = (this.getValue(x + 1, y) - this.getValue(x - 1, y)) / 2;
            const gy = (this.getValue(x, y + 1) - this.getValue(x, y - 1)) / 2;
            const gradMag = Math.sqrt(gx * gx + gy * gy);
            const laplacian = Math.abs(this.computeLaplacian(x, y));
            grid[idx] = gradMag < 0.05 ? laplacian : 0;
            break;
          }
          case "stabilityField": {
            const laplacian = this.computeLaplacian(x, y);
            const dxx = this.getValue(x + 1, y) - 2 * value + this.getValue(x - 1, y);
            const dyy = this.getValue(x, y + 1) - 2 * value + this.getValue(x, y - 1);
            const traceH = dxx + dyy;
            grid[idx] = traceH < 0 ? Math.abs(traceH) : -Math.abs(traceH) * 0.5;
            break;
          }
          case "gradientFlowLines": {
            const gx = (this.getValue(x + 1, y) - this.getValue(x - 1, y)) / 2;
            const gy = (this.getValue(x, y + 1) - this.getValue(x, y - 1)) / 2;
            const angle = Math.atan2(gy, gx);
            grid[idx] = (Math.sin(angle * 8) + 1) * 0.5;
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
    
    // Compute structural coherence (0-1 composite)
    // Uses dynamic scaling based on observed empirical ranges
    // Higher values = more organized/structured field
    
    // Depth contribution: typical depths range 0.001 to 0.1, use sigmoid scaling
    const depthScore = avgBasinDepth > 0 
      ? Math.min(1, avgBasinDepth / 0.05) * 0.8 + 0.2 * (1 - Math.exp(-avgBasinDepth * 20))
      : 0;
    
    // Curvature stability: absolute curvature near 0 is stable
    // Typical range: -0.001 to 0.001, scale accordingly
    const avgCurvature = Math.abs(totalCurvature / n);
    const curvatureScore = Math.exp(-avgCurvature * 500); // Exponential decay from 1
    
    // Tension stability: low tension variance indicates coherent field
    // Typical range: 0 to 0.01, scale accordingly  
    const tensionScore = Math.exp(-totalTensionVar * 50);
    
    // Basin presence bonus: having basins indicates structure
    const basinBonus = stats.basinCount > 0 ? 0.15 : 0;
    
    // Geometric mean provides balanced contribution from all factors
    const baseCoherence = Math.pow(
      Math.max(0.01, depthScore) * Math.max(0.01, curvatureScore) * Math.max(0.01, tensionScore),
      1/3
    );
    const coherence = Math.min(1, baseCoherence + basinBonus);
    
    // Track coherence history for sparkline
    this.coherenceHistory.push(coherence);
    if (this.coherenceHistory.length > this.coherenceHistorySize) {
      this.coherenceHistory.shift();
    }
    
    return {
      basinCount: stats.basinCount,
      avgBasinDepth,
      globalCurvature: totalCurvature / n,
      tensionVariance: totalTensionVar,
      stabilityMetric: 1 / (1 + stats.variance),
      coherence,
    };
  }

  getOperatorContributions(): OperatorContributions {
    return { ...this.operatorContributions };
  }
  
  getCoherenceHistory(): number[] {
    return [...this.coherenceHistory];
  }

  // Update trend tracking buffers - called during simulation step
  private updateTrendBuffers(stats: { energy: number; variance: number; basinCount: number }): void {
    const ws = this.trendWindowSize;
    
    // Energy
    this.energyTrendBuffer.push(stats.energy);
    if (this.energyTrendBuffer.length > ws) this.energyTrendBuffer.shift();
    
    // Variance
    this.varianceTrendBuffer.push(stats.variance);
    if (this.varianceTrendBuffer.length > ws) this.varianceTrendBuffer.shift();
    
    // Global curvature (from cached signature or compute)
    const signature = this.cachedSignature;
    if (signature) {
      this.curvatureTrendBuffer.push(Math.abs(signature.globalCurvature));
      if (this.curvatureTrendBuffer.length > ws) this.curvatureTrendBuffer.shift();
    }
    
    // Peak gradient - compute max gradient magnitude
    let maxGrad = 0;
    for (let y = 1; y < this.height - 1; y += 5) {
      for (let x = 1; x < this.width - 1; x += 5) {
        const gx = (this.getValue(x + 1, y) - this.getValue(x - 1, y)) / 2;
        const gy = (this.getValue(x, y + 1) - this.getValue(x, y - 1)) / 2;
        const grad = Math.sqrt(gx * gx + gy * gy);
        if (grad > maxGrad) maxGrad = grad;
      }
    }
    this.gradientPeakBuffer.push(maxGrad);
    if (this.gradientPeakBuffer.length > ws) this.gradientPeakBuffer.shift();
    
    // Basin count
    this.basinCountBuffer.push(stats.basinCount);
    if (this.basinCountBuffer.length > ws) this.basinCountBuffer.shift();
    
    // Basin merges
    if (this.lastTrendBasinCount > 0 && stats.basinCount < this.lastTrendBasinCount) {
      this.basinMergeEvents += (this.lastTrendBasinCount - stats.basinCount);
    }
    this.lastTrendBasinCount = stats.basinCount;
    
    // Stability classification (using borderline instead of marginal to match UI)
    const instability = stats.variance * 10 + (signature ? Math.abs(signature.globalCurvature) * 0.5 : 0);
    const stability: "stable" | "borderline" | "unstable" = 
      instability < 0.3 ? "stable" : instability < 0.7 ? "borderline" : "unstable";
    this.stabilityBuffer.push(stability);
    if (this.stabilityBuffer.length > ws) this.stabilityBuffer.shift();
    
    // Skeleton complexity (sample every 10 steps to reduce computation)
    if (this.step % 10 === 0) {
      let skeletonSum = 0;
      for (let y = 1; y < this.height - 1; y += 3) {
        for (let x = 1; x < this.width - 1; x += 3) {
          const gx = (this.getValue(x + 1, y) - this.getValue(x - 1, y)) / 2;
          const gy = (this.getValue(x, y + 1) - this.getValue(x, y - 1)) / 2;
          const gradMag = Math.sqrt(gx * gx + gy * gy);
          const laplacian = Math.abs(this.computeLaplacian(x, y));
          if (gradMag < 0.05) skeletonSum += laplacian;
        }
      }
      this.skeletonComplexityCache = skeletonSum / ((this.width / 3) * (this.height / 3));
    }
  }

  // Get aggregated trend metrics for Simulation Metrics panel
  getTrendMetrics(): TrendMetrics {
    const ws = this.trendWindowSize;
    
    // Compute windowed averages
    const avgEnergy = this.energyTrendBuffer.length > 0 
      ? this.energyTrendBuffer.reduce((a, b) => a + b, 0) / this.energyTrendBuffer.length 
      : 0;
    const avgVariance = this.varianceTrendBuffer.length > 0 
      ? this.varianceTrendBuffer.reduce((a, b) => a + b, 0) / this.varianceTrendBuffer.length 
      : 0;
    const avgCurvature = this.curvatureTrendBuffer.length > 0 
      ? this.curvatureTrendBuffer.reduce((a, b) => a + b, 0) / this.curvatureTrendBuffer.length 
      : 0;
    
    // Compute trends (linear regression slope approximation)
    const computeTrend = (buffer: number[]): number => {
      if (buffer.length < 3) return 0;
      const n = buffer.length;
      const first = buffer.slice(0, Math.floor(n / 3)).reduce((a, b) => a + b, 0) / Math.floor(n / 3);
      const last = buffer.slice(-Math.floor(n / 3)).reduce((a, b) => a + b, 0) / Math.floor(n / 3);
      return last - first;
    };
    
    const energyTrend = computeTrend(this.energyTrendBuffer);
    const varianceTrend = computeTrend(this.varianceTrendBuffer);
    const curvatureTrend = computeTrend(this.curvatureTrendBuffer);
    
    // Count stability classifications in window
    const stableFrames = this.stabilityBuffer.filter(s => s === "stable").length;
    const borderlineFrames = this.stabilityBuffer.filter(s => s === "borderline").length;
    const unstableFrames = this.stabilityBuffer.filter(s => s === "unstable").length;
    
    // Current stability based on recent history (last 5 frames)
    const recentStability = this.stabilityBuffer.slice(-5);
    const recentCounts = { stable: 0, borderline: 0, unstable: 0 };
    recentStability.forEach(s => recentCounts[s]++);
    const currentStability: "stable" | "borderline" | "unstable" = 
      recentCounts.unstable > 2 ? "unstable" : 
      recentCounts.borderline > 2 ? "borderline" : "stable";
    
    // Basin merge rate (merges per window, normalized)
    const basinMergeRate = this.trendWindowSize > 0 ? this.basinMergeEvents / this.trendWindowSize : 0;
    
    // Average basin count
    const avgBasinCount = this.basinCountBuffer.length > 0
      ? this.basinCountBuffer.reduce((a, b) => a + b, 0) / this.basinCountBuffer.length
      : 0;
    
    // Peak values
    const peakGradient = this.gradientPeakBuffer.length > 0 
      ? Math.max(...this.gradientPeakBuffer) 
      : 0;
    const peakVariance = this.varianceTrendBuffer.length > 0 
      ? Math.max(...this.varianceTrendBuffer) 
      : 0;
    const peakEnergy = this.energyTrendBuffer.length > 0
      ? Math.max(...this.energyTrendBuffer)
      : 0;
    
    // Complexity metric (0-1 based on variance, basin count, curvature variation)
    const varianceNorm = Math.min(avgVariance * 20, 1);
    const basinNorm = Math.min(avgBasinCount / 10, 1);
    const curvatureNorm = Math.min(Math.abs(avgCurvature) * 50, 1);
    const complexity = (varianceNorm * 0.4 + basinNorm * 0.35 + curvatureNorm * 0.25);
    
    // Drift indicator (energy trend normalized)
    const driftIndicator = energyTrend * 100;
    
    // Relaxation rate (negative variance trend = relaxing)
    const relaxationRate = -varianceTrend * 100;
    
    return {
      avgEnergy,
      avgVariance,
      avgCurvature,
      avgBasinCount,
      energyTrend,
      varianceTrend,
      curvatureTrend,
      stableFrames,
      borderlineFrames,
      unstableFrames,
      currentStability,
      basinMergeRate,
      basinCountHistory: [...this.basinCountBuffer],
      peakGradient,
      peakVariance,
      peakEnergy,
      complexity,
      driftIndicator,
      relaxationRate,
      windowSize: ws,
    };
  }

  getCachedSignature(): StructuralSignature {
    // Return cached signature or compute if not yet available
    if (!this.cachedSignature) {
      this.cachedSignature = this.computeStructuralSignature();
    }
    return this.cachedSignature;
  }

  getCachedDerivedField(type: "curvature" | "tension" | "coupling" | "variance" | "gradientFlow" | "criticality" | "hysteresis" | "constraintSkeleton" | "stabilityField" | "gradientFlowLines"): DerivedField {
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

  private computeDerivedFieldInto(type: "curvature" | "tension" | "coupling" | "variance" | "gradientFlow" | "criticality" | "hysteresis" | "constraintSkeleton" | "stabilityField" | "gradientFlowLines", grid: Float32Array): void {
    // Use playback display grid when in playback mode
    const sourceGrid = this.playbackDisplayGrid !== null ? this.playbackDisplayGrid : this.grid;
    
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const idx = y * this.width + x;
        const value = sourceGrid[idx];
        
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
          case "gradientFlow": {
            const gx = (this.getValue(x + 1, y) - this.getValue(x - 1, y)) / 2;
            const gy = (this.getValue(x, y + 1) - this.getValue(x, y - 1)) / 2;
            const mag = Math.sqrt(gx * gx + gy * gy);
            const angle = Math.atan2(gy, gx);
            grid[idx] = (angle + Math.PI) / (2 * Math.PI) * mag;
            break;
          }
          case "criticality": {
            const dxx = this.getValue(x + 1, y) - 2 * value + this.getValue(x - 1, y);
            const dyy = this.getValue(x, y + 1) - 2 * value + this.getValue(x, y - 1);
            const dxy = (this.getValue(x + 1, y + 1) - this.getValue(x - 1, y + 1) 
                       - this.getValue(x + 1, y - 1) + this.getValue(x - 1, y - 1)) / 4;
            const detH = dxx * dyy - dxy * dxy;
            grid[idx] = 1.0 / (Math.abs(detH) + 1e-6);
            break;
          }
          case "hysteresis": {
            grid[idx] = this.memoryBuffer ? this.memoryBuffer[idx] : 0;
            break;
          }
          case "constraintSkeleton": {
            const gx = (this.getValue(x + 1, y) - this.getValue(x - 1, y)) / 2;
            const gy = (this.getValue(x, y + 1) - this.getValue(x, y - 1)) / 2;
            const gradMag = Math.sqrt(gx * gx + gy * gy);
            const laplacian = Math.abs(this.computeLaplacian(x, y));
            grid[idx] = gradMag < 0.05 ? laplacian : 0;
            break;
          }
          case "stabilityField": {
            const dxx = this.getValue(x + 1, y) - 2 * value + this.getValue(x - 1, y);
            const dyy = this.getValue(x, y + 1) - 2 * value + this.getValue(x, y - 1);
            const traceH = dxx + dyy;
            grid[idx] = traceH < 0 ? Math.abs(traceH) : -Math.abs(traceH) * 0.5;
            break;
          }
          case "gradientFlowLines": {
            const gx = (this.getValue(x + 1, y) - this.getValue(x - 1, y)) / 2;
            const gy = (this.getValue(x, y + 1) - this.getValue(x, y - 1)) / 2;
            const angle = Math.atan2(gy, gx);
            grid[idx] = (Math.sin(angle * 8) + 1) * 0.5;
            break;
          }
        }
      }
    }
  }

  getLastDerivedFieldCacheStep(): number {
    return this.lastDerivedFieldCacheStep;
  }

  getHistoryLength(): number {
    return this.ringBuffer.length;
  }

  getCurrentHistoryIndex(): number {
    return this.currentPlaybackIndex >= 0 ? this.currentPlaybackIndex : this.ringBuffer.length - 1;
  }

  // Map user-facing index (0 = oldest) to actual buffer position
  // When buffer isn't full, index maps directly. When full, oldest is at ringBufferIndex.
  private getBufferSnapshot(userIndex: number): FrameSnapshot | null {
    if (userIndex < 0 || userIndex >= this.ringBuffer.length) return null;
    
    // When buffer is not full, frames are in order 0..length-1
    if (this.ringBuffer.length < this.ringBufferSize) {
      return this.ringBuffer[userIndex];
    }
    
    // When buffer is full, ringBufferIndex points to oldest (next write position)
    // So oldest frame is at ringBufferIndex, newest at ringBufferIndex - 1
    const actualIndex = (this.ringBufferIndex + userIndex) % this.ringBufferSize;
    return this.ringBuffer[actualIndex];
  }

  stepBackward(): boolean {
    if (this.ringBuffer.length === 0) return false;
    
    if (this.currentPlaybackIndex < 0) {
      this.currentPlaybackIndex = this.ringBuffer.length - 1;
    }
    
    if (this.currentPlaybackIndex > 0) {
      this.currentPlaybackIndex--;
      const snapshot = this.getBufferSnapshot(this.currentPlaybackIndex);
      if (!snapshot) return false;
      // Display-only: don't modify live simulation grid during scrubbing
      this.playbackDisplayGrid = new Float32Array(snapshot.grid);
      this.playbackDisplayStep = snapshot.step;
      this.invalidateDerivedFieldCache();
      this.notifyUpdate();
      return true;
    }
    return false;
  }

  stepForwardInHistory(): boolean {
    if (this.currentPlaybackIndex < 0) return false;
    
    if (this.currentPlaybackIndex < this.ringBuffer.length - 1) {
      this.currentPlaybackIndex++;
      const snapshot = this.getBufferSnapshot(this.currentPlaybackIndex);
      if (!snapshot) return false;
      // Display-only: don't modify live simulation grid during scrubbing
      this.playbackDisplayGrid = new Float32Array(snapshot.grid);
      this.playbackDisplayStep = snapshot.step;
      this.invalidateDerivedFieldCache();
      this.notifyUpdate();
      return true;
    } else {
      // Exiting playback mode - clear the display grid
      this.currentPlaybackIndex = -1;
      this.playbackDisplayGrid = null;
      return false;
    }
  }

  seekToFrame(index: number): void {
    if (index < 0 || index >= this.ringBuffer.length) return;
    
    this.currentPlaybackIndex = index;
    const snapshot = this.getBufferSnapshot(index);
    if (!snapshot) return;
    // Display-only: don't modify live simulation grid during scrubbing
    this.playbackDisplayGrid = new Float32Array(snapshot.grid);
    this.playbackDisplayStep = snapshot.step;
    this.invalidateDerivedFieldCache();
    // Recompute basin map for the scrubbed frame
    this.updateBasinMap();
    this.notifyUpdate();
  }
  
  // Commit the current playback frame to live state
  // Called when resuming simulation from a scrubbed position
  // This syncs the live grid to the displayed frame and prunes future history
  commitPlaybackFrame(): void {
    if (this.currentPlaybackIndex < 0 || !this.playbackDisplayGrid) return;
    
    // Restore live state from the current playback frame
    this.grid.set(this.playbackDisplayGrid);
    this.step = this.playbackDisplayStep;
    
    // Truncate history after this point (future frames are now invalid)
    this.truncateHistoryAfter(this.currentPlaybackIndex);
    
    // Exit playback mode
    this.currentPlaybackIndex = -1;
    this.playbackDisplayGrid = null;
    
    this.invalidateDerivedFieldCache();
    this.updateBasinMap();
    this.notifyUpdate();
  }
  
  // Truncate ring buffer history after the given index
  // Called when resuming from a past frame to invalidate future history
  private truncateHistoryAfter(index: number): void {
    if (index < 0 || index >= this.ringBuffer.length - 1) return;
    
    // Keep only frames 0..index (inclusive)
    const framesToKeep = index + 1;
    
    if (this.ringBuffer.length < this.ringBufferSize) {
      // Buffer not full - simple splice
      this.ringBuffer.splice(framesToKeep);
      this.ringBufferIndex = this.ringBuffer.length % this.ringBufferSize;
    } else {
      // Buffer is full - rebuild with only the frames we want to keep
      const keptFrames: FrameSnapshot[] = [];
      for (let i = 0; i <= index; i++) {
        const snapshot = this.getBufferSnapshot(i);
        if (snapshot) {
          keptFrames.push(snapshot);
        }
      }
      this.ringBuffer = keptFrames;
      this.ringBufferIndex = keptFrames.length % this.ringBufferSize;
    }
  }
  
  private invalidateDerivedFieldCache(): void {
    // Force derived fields to recompute on next getCachedDerivedField call
    this.lastDerivedFieldCacheStep = -Infinity;
  }

  exitPlaybackMode(): void {
    this.currentPlaybackIndex = -1;
    this.playbackDisplayGrid = null;
  }

  isInPlaybackMode(): boolean {
    return this.currentPlaybackIndex >= 0;
  }

  // Perturbation Tool - Apply local perturbation at a point
  perturbField(x: number, y: number, magnitude: number = 0.15, radius: number = 5): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    
    // If in playback mode, commit the current frame to live state first
    // This ensures perturbations are applied to the correct state and history is pruned
    if (this.isInPlaybackMode()) {
      this.commitPlaybackFrame();
    }
    
    // Apply Gaussian-weighted perturbation
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const px = x + dx;
        const py = y + dy;
        if (px < 0 || px >= this.width || py < 0 || py >= this.height) continue;
        
        const distSq = dx * dx + dy * dy;
        const weight = Math.exp(-distSq / (2 * (radius / 2) * (radius / 2)));
        const idx = py * this.width + px;
        this.grid[idx] += magnitude * weight;
      }
    }
    
    this.invalidateDerivedFieldCache();
    this.updateBasinMap();
    this.notifyUpdate();
  }

  // Jump to next event in event log
  jumpToNextEvent(currentStep: number): number | null {
    const events = this.structuralEvents;
    for (const event of events) {
      if (event.step > currentStep) {
        // Find the closest frame in history
        for (let i = 0; i < this.ringBuffer.length; i++) {
          const snapshot = this.getBufferSnapshot(i);
          if (snapshot && snapshot.step >= event.step) {
            this.seekToFrame(i);
            return event.step;
          }
        }
      }
    }
    return null;
  }

  // Jump to previous event in event log
  jumpToPreviousEvent(currentStep: number): number | null {
    const events = [...this.structuralEvents].reverse();
    for (const event of events) {
      if (event.step < currentStep) {
        // Find the closest frame in history
        for (let i = this.ringBuffer.length - 1; i >= 0; i--) {
          const snapshot = this.getBufferSnapshot(i);
          if (snapshot && snapshot.step <= event.step) {
            this.seekToFrame(i);
            return event.step;
          }
        }
      }
    }
    return null;
  }

  // Get the field state for the current playback frame (or current live state)
  getPlaybackFieldState(): "calm" | "unsettled" | "reorganizing" | "transforming" {
    if (this.currentPlaybackIndex >= 0 && this.currentPlaybackIndex < this.ringBuffer.length) {
      const snapshot = this.getBufferSnapshot(this.currentPlaybackIndex);
      if (snapshot) return snapshot.fieldState;
    }
    return this.displayedFieldState;
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
      // Use playback display step when in playback mode
      const displayStep = this.playbackDisplayStep !== null ? this.playbackDisplayStep : this.step;
      const state: SimulationState = {
        step: displayStep,
        energy: stats.energy,
        variance: stats.variance,
        basinCount: stats.basinCount,
        isRunning: this.isRunning,
        fps: this.fps,
      };
      // Use playback display grid when in playback mode, otherwise use live grid
      const displayGrid = this.playbackDisplayGrid !== null ? this.playbackDisplayGrid : this.grid;
      const field: FieldData = {
        grid: displayGrid,
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

    // Speed control: only update if enough time has passed
    const stepElapsed = timestamp - this.lastStepTimestamp;
    const minInterval = this.targetStepsPerSecond > 0 ? (1000 / this.targetStepsPerSecond) : 0;
    
    if (stepElapsed >= minInterval) {
      this.updateStep();
      this.notifyUpdate();
      this.lastStepTimestamp = timestamp;
    }
    
    this.animationId = requestAnimationFrame(this.loop);
  };

  start(): void {
    if (this.isRunning) return;
    this.currentPlaybackIndex = -1;
    this.playbackDisplayGrid = null; // Clear playback display to use live grid
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.lastStepTimestamp = performance.now();
    this.frameCount = 0;
    this.animationId = requestAnimationFrame(this.loop);
  }
  
  // Set simulation speed (steps per second). 0 = max speed, 10 = slow, 30 = medium
  setSimulationSpeed(stepsPerSecond: number): void {
    this.targetStepsPerSecond = stepsPerSecond;
  }
  
  getSimulationSpeed(): number {
    return this.targetStepsPerSecond;
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
    // Return playback display grid if in playback mode, otherwise live grid
    const displayGrid = this.playbackDisplayGrid !== null ? this.playbackDisplayGrid : this.grid;
    return {
      grid: displayGrid,
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

  // ============== DIAGNOSTIC METHODS ==============
  
  getCurrentSeed(): number {
    return this.currentSeed;
  }
  
  resetWithSeed(seed: number): void {
    this.initialize(seed);
    this.notifyUpdate();
  }
  
  getDiagnosticSolverData(): DiagnosticSolverData {
    const stats = this.computeStatistics();
    const deltaEnergy = stats.energy - this.lastEnergy;
    const deltaVariance = this.varianceHistory.length > 1 
      ? stats.variance - this.varianceHistory[this.varianceHistory.length - 2] 
      : 0;
    
    // Compute variance derivative (change over last 12 frames)
    let varianceDerivative = 0;
    if (this.varianceHistory.length >= 12) {
      const recent = this.varianceHistory.slice(-12);
      varianceDerivative = (recent[recent.length - 1] - recent[0]) / 12;
    }
    
    // Check for instability (energy exploding or variance >40% spike)
    const isUnstable = Math.abs(deltaEnergy) > 1.0 || 
      (this.varianceHistory.length > 0 && Math.abs(deltaVariance / (this.varianceHistory[this.varianceHistory.length - 1] || 1)) > 0.4);
    
    return {
      step: this.step,
      energy: stats.energy,
      deltaEnergy,
      variance: stats.variance,
      deltaVariance,
      varianceDerivative,
      isUnstable,
      energyHistory: [...this.energyHistory],
      varianceHistory: [...this.varianceHistory],
    };
  }
  
  getDiagnosticRenderData(): DiagnosticRenderData {
    return {
      frameTime: this.lastFrameTimeMs,
      droppedFrames: this.droppedFrames,
      renderMode: 'canvas2d',
      resolution: { width: this.width, height: this.height },
      fps: this.fps,
    };
  }
  
  getDiagnosticInternalsData(): DiagnosticInternalsData {
    // Grid stats
    let min = Infinity, max = -Infinity, sum = 0, sumSq = 0;
    for (let i = 0; i < this.grid.length; i++) {
      const v = this.grid[i];
      if (v < min) min = v;
      if (v > max) max = v;
      sum += v;
      sumSq += v * v;
    }
    const mean = sum / this.grid.length;
    const std = Math.sqrt(sumSq / this.grid.length - mean * mean);
    
    // Gradient magnitude stats
    let gradMin = Infinity, gradMax = -Infinity, gradSum = 0;
    for (let y = 1; y < this.height - 1; y++) {
      for (let x = 1; x < this.width - 1; x++) {
        const gx = (this.getValue(x + 1, y) - this.getValue(x - 1, y)) / 2;
        const gy = (this.getValue(x, y + 1) - this.getValue(x, y - 1)) / 2;
        const mag = Math.sqrt(gx * gx + gy * gy);
        if (mag < gradMin) gradMin = mag;
        if (mag > gradMax) gradMax = mag;
        gradSum += mag;
      }
    }
    const gradCount = (this.width - 2) * (this.height - 2);
    
    // Curvature stats
    let curvMin = Infinity, curvMax = -Infinity, curvSum = 0;
    for (let y = 1; y < this.height - 1; y++) {
      for (let x = 1; x < this.width - 1; x++) {
        const lap = this.computeLaplacian(x, y);
        const curv = Math.tanh(lap * this.params.curvatureGain);
        if (curv < curvMin) curvMin = curv;
        if (curv > curvMax) curvMax = curv;
        curvSum += curv;
      }
    }
    
    // Laplacian distribution (10 bins) and mean
    const laplacianDist = new Array(10).fill(0);
    let laplacianSum = 0;
    for (let y = 1; y < this.height - 1; y++) {
      for (let x = 1; x < this.width - 1; x++) {
        const lap = this.computeLaplacian(x, y);
        laplacianSum += lap;
        const normalized = (lap + 1) / 2; // Assume roughly -1 to 1 range
        const bin = Math.min(9, Math.max(0, Math.floor(normalized * 10)));
        laplacianDist[bin]++;
      }
    }
    const laplacianMean = laplacianSum / gradCount;
    
    const stats = this.computeStatistics();
    
    return {
      gridStats: { min, max, mean, std },
      gradientMagnitudeStats: { 
        min: gradMin === Infinity ? 0 : gradMin, 
        max: gradMax === -Infinity ? 0 : gradMax, 
        mean: gradSum / gradCount 
      },
      curvatureStats: { 
        min: curvMin === Infinity ? 0 : curvMin, 
        max: curvMax === -Infinity ? 0 : curvMax, 
        mean: curvSum / gradCount 
      },
      laplacianDistribution: laplacianDist,
      laplacianMean,
      basinCount: stats.basinCount,
      frameHashHistory: [...this.frameHashHistory],
    };
  }
  
  computeFrameHash(): string {
    // Simple hash using grid values
    let hash = 0;
    for (let i = 0; i < this.grid.length; i += 100) {
      hash = ((hash << 5) - hash + Math.floor(this.grid[i] * 1000000)) | 0;
    }
    const hashStr = hash.toString(16).padStart(8, '0');
    
    // Add to history
    this.frameHashHistory.push(hashStr);
    if (this.frameHashHistory.length > this.maxFrameHashHistory) {
      this.frameHashHistory.shift();
    }
    
    return hashStr;
  }
  
  runDeterminismCheck(stepsToRun: number = 100): DeterminismReport {
    const seed = Date.now();
    
    // Run 1
    this.initialize(seed);
    for (let i = 0; i < stepsToRun; i++) {
      this.updateStep();
    }
    const run1Grid = new Float32Array(this.grid);
    const run1Stats = this.computeStatistics();
    const run1Hash = this.computeFrameHash();
    
    // Run 2
    this.initialize(seed);
    for (let i = 0; i < stepsToRun; i++) {
      this.updateStep();
    }
    const run2Grid = new Float32Array(this.grid);
    const run2Stats = this.computeStatistics();
    
    // Compare
    let pixelDiff = 0;
    let totalAbsDev = 0;
    const diffGrid = new Float32Array(this.grid.length);
    
    for (let i = 0; i < run1Grid.length; i++) {
      const diff = Math.abs(run1Grid[i] - run2Grid[i]);
      diffGrid[i] = diff;
      if (diff > 1e-10) pixelDiff++;
      totalAbsDev += diff;
    }
    
    const meanAbsoluteDeviation = totalAbsDev / this.grid.length;
    const isDeterministic = pixelDiff === 0 && meanAbsoluteDeviation < 1e-10;
    
    // Restore to run2 state (deterministic result)
    this.notifyUpdate();
    
    return {
      seed,
      stepsRun: stepsToRun,
      finalHash: run1Hash,
      run1FinalEnergy: run1Stats.energy,
      run2FinalEnergy: run2Stats.energy,
      pixelDifference: pixelDiff,
      meanAbsoluteDeviation,
      isDeterministic,
      diffGrid: isDeterministic ? null : diffGrid,
    };
  }
  
  exportDiagnosticData(): string {
    const solverData = this.getDiagnosticSolverData();
    const renderData = this.getDiagnosticRenderData();
    const internalsData = this.getDiagnosticInternalsData();
    const events = this.getEvents();
    
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      seed: this.currentSeed,
      solver: solverData,
      render: renderData,
      internals: {
        ...internalsData,
        laplacianDistribution: internalsData.laplacianDistribution,
      },
      events: events.slice(-50),
      params: this.params,
    }, null, 2);
  }
  
  exportFrameWindow(frameCount: number = 10): string {
    const frames: Array<{
      index: number;
      step: number;
      energy: number;
      variance: number;
      basinCount: number;
      hash: string;
    }> = [];
    
    const startIdx = Math.max(0, this.ringBuffer.length - frameCount);
    for (let i = startIdx; i < this.ringBuffer.length; i++) {
      const snapshot = this.getBufferSnapshot(i);
      if (!snapshot) continue;
      // Compute hash for this frame
      let hash = 0;
      for (let j = 0; j < snapshot.grid.length; j += 100) {
        hash = ((hash << 5) - hash + Math.floor(snapshot.grid[j] * 1000000)) | 0;
      }
      frames.push({
        index: i,
        step: snapshot.step,
        energy: snapshot.stats.energy,
        variance: snapshot.stats.variance,
        basinCount: snapshot.stats.basinCount,
        hash: hash.toString(16).padStart(8, '0'),
      });
    }
    
    return JSON.stringify({ frames, exportedAt: new Date().toISOString() }, null, 2);
  }
  
  // Track frame timing for render diagnostics
  recordFrameTime(ms: number): void {
    this.lastFrameTimeMs = ms;
    if (ms > this.targetFrameTime * 1.5) {
      this.droppedFrames++;
    }
  }
  
  // Track energy history during updates
  private trackDiagnostics(energy: number): void {
    this.energyHistory.push(energy);
    if (this.energyHistory.length > this.energyHistorySize) {
      this.energyHistory.shift();
    }
    this.lastEnergy = energy;
  }

  // Export methods for new export system
  getAllFrames(): { grid: Float32Array; step: number; stats: { energy: number; variance: number; basinCount: number } }[] {
    const frames: { grid: Float32Array; step: number; stats: { energy: number; variance: number; basinCount: number } }[] = [];
    for (let i = 0; i < this.ringBuffer.length; i++) {
      const snapshot = this.getBufferSnapshot(i);
      if (snapshot) {
        frames.push({
          grid: new Float32Array(snapshot.grid),
          step: snapshot.step,
          stats: { ...snapshot.stats }
        });
      }
    }
    return frames;
  }

  getMetricsHistory(): { step: number; fps: number; basinCount: number; depth: number; curvature: number; tensionVariance: number; stability: number; energy: number; variance: number; timestamp: number }[] {
    const history: { step: number; fps: number; basinCount: number; depth: number; curvature: number; tensionVariance: number; stability: number; energy: number; variance: number; timestamp: number }[] = [];
    for (let i = 0; i < this.ringBuffer.length; i++) {
      const snapshot = this.getBufferSnapshot(i);
      if (snapshot) {
        history.push({
          step: snapshot.step,
          fps: this.fps,
          basinCount: snapshot.stats.basinCount,
          depth: this.cachedSignature?.avgBasinDepth ?? 0,
          curvature: this.computeCurvatureMeanForExport(),
          tensionVariance: snapshot.stats.variance,
          stability: this.cachedSignature?.stabilityMetric ?? 1,
          energy: snapshot.stats.energy,
          variance: snapshot.stats.variance,
          timestamp: Date.now() - (this.ringBuffer.length - i) * 16
        });
      }
    }
    return history;
  }

  getCurrentFieldSnapshot(): { width: number; height: number; field: number[]; timestamp: number } {
    return {
      width: this.width,
      height: this.height,
      field: Array.from(this.grid),
      timestamp: Date.now()
    };
  }

  private computeCurvatureMeanForExport(): number {
    let sum = 0;
    let count = 0;
    for (let i = 1; i < this.height - 1; i++) {
      for (let j = 1; j < this.width - 1; j++) {
        const idx = i * this.width + j;
        const laplacian = this.grid[idx - 1] + this.grid[idx + 1] + 
                         this.grid[idx - this.width] + this.grid[idx + this.width] - 
                         4 * this.grid[idx];
        sum += laplacian;
        count++;
      }
    }
    return count > 0 ? sum / count : 0;
  }
}
