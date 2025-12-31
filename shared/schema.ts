import { z } from "zod";

export const simulationParametersSchema = z.object({
  gridSize: z.number().min(50).max(500).default(300),
  dt: z.number().min(0.01).max(0.2).default(0.05),
  curvatureGain: z.number().min(0.1).max(10).default(2.0),
  couplingRadius: z.number().min(0.5).max(5).default(1.0),
  couplingWeight: z.number().min(0).max(1).default(0.7),
  attractorStrength: z.number().min(0.1).max(10).default(3.0),
  redistributionRate: z.number().min(0).max(1).default(0.2),
  wK: z.number().min(0).max(5).default(1.0),
  wT: z.number().min(0).max(5).default(0.8),
  wC: z.number().min(0).max(5).default(1.2),
  wA: z.number().min(0).max(5).default(2.0),
  wR: z.number().min(0).max(5).default(0.5),
  mode: z.enum(["standard", "quasicrystal", "criticality", "fractal", "soliton", "cosmicweb"]).default("standard"),
});

export type SimulationParameters = z.infer<typeof simulationParametersSchema>;

export const defaultParameters: SimulationParameters = {
  gridSize: 300,
  dt: 0.05,
  curvatureGain: 2.0,
  couplingRadius: 1.0,
  couplingWeight: 0.7,
  attractorStrength: 3.0,
  redistributionRate: 0.2,
  wK: 1.0,
  wT: 0.8,
  wC: 1.2,
  wA: 2.0,
  wR: 0.5,
  mode: "standard",
};

export const mobileParameters: SimulationParameters = {
  gridSize: 150,
  dt: 0.05,
  curvatureGain: 2.0,
  couplingRadius: 1.0,
  couplingWeight: 0.7,
  attractorStrength: 3.0,
  redistributionRate: 0.2,
  wK: 1.0,
  wT: 0.8,
  wC: 1.2,
  wA: 2.0,
  wR: 0.5,
  mode: "standard",
};

export interface SimulationState {
  step: number;
  energy: number;
  variance: number;
  basinCount: number;
  isRunning: boolean;
  fps: number;
}

export interface FieldData {
  grid: Float32Array;
  width: number;
  height: number;
}

export interface OperatorContributions {
  curvature: number;
  tension: number;
  coupling: number;
  attractor: number;
  redistribution: number;
}

export interface ProbeData {
  x: number;
  y: number;
  value: number;
  curvature: number;
  tension: number;
  coupling: number;
  gradientMagnitude: number;
  neighborhoodVariance: number;
  basinId: number | null;
}

export interface StructuralEvent {
  id: string;
  step: number;
  type: "basin_merge" | "basin_split" | "curvature_spike" | "variance_instability" | "phase_transition";
  description: string;
  location?: { x: number; y: number };
}

export interface StructuralSignature {
  basinCount: number;
  avgBasinDepth: number;
  globalCurvature: number;
  tensionVariance: number;
  stabilityMetric: number;
  coherence: number; // Composite 0-1 metric combining depth, curvature, tension variance
}

// Trend-based aggregated metrics for Simulation Metrics panel
export interface TrendMetrics {
  // Windowed averages (last N frames)
  avgEnergy: number;
  avgVariance: number;
  avgCurvature: number;
  avgBasinCount: number;
  // Trends (positive = increasing, negative = decreasing)
  energyTrend: number;
  varianceTrend: number;
  curvatureTrend: number;
  // Stability classification counts (over window)
  stableFrames: number;
  borderlineFrames: number;
  unstableFrames: number;
  currentStability: "stable" | "borderline" | "unstable";
  // Basin dynamics
  basinMergeRate: number; // merges per N frames
  basinCountHistory: number[];
  // Peak/extreme values
  peakGradient: number; // max gradient over last N frames
  peakVariance: number;
  peakEnergy: number;
  // Complexity metric (0-1 scale)
  complexity: number;
  // Drift/relaxation
  driftIndicator: number; // positive = drifting, negative = relaxing
  relaxationRate: number;
  // Window size used for calculations
  windowSize: number;
}

// Human-readable attractor status
export type AttractorStatus = "None" | "Emerging" | "Stable" | "Multiple";

// Field mode regime labels
export type FieldMode = 
  | "Diffuse equilibrium"
  | "Shear tension forming"
  | "Radial symmetry breach"
  | "Boundary locking"
  | "Oscillatory collapse"
  | "Basin crystallization"
  | "Coherent attractor"
  | "Multi-stable regime";

export interface BasinMap {
  labels: Int32Array;
  count: number;
  width: number;
  height: number;
}

export interface DerivedField {
  type: "curvature" | "tension" | "coupling" | "variance" | "gradientFlow" | "criticality" | "hysteresis" | "basins" | "constraintSkeleton" | "stabilityField" | "gradientFlowLines";
  grid: Float32Array;
  width: number;
  height: number;
}

export const structuralPresets: Record<string, Partial<SimulationParameters>> = {
  "uniform-field": {
    mode: "standard",
    curvatureGain: 1.0,
    wK: 0.5,
    wT: 0.5,
    wC: 2.0,
    wA: 0.5,
    wR: 1.0,
  },
  "high-curvature": {
    mode: "standard",
    curvatureGain: 8.0,
    wK: 4.0,
    wT: 0.5,
    wC: 0.8,
    wA: 1.0,
    wR: 0.3,
  },
  "multi-basin": {
    mode: "standard",
    couplingWeight: 0.3,
    attractorStrength: 5.0,
    wK: 1.0,
    wT: 0.8,
    wC: 0.5,
    wA: 3.5,
    wR: 0.2,
  },
  "near-critical": {
    mode: "standard",
    dt: 0.03,
    curvatureGain: 3.0,
    wK: 2.0,
    wT: 1.5,
    wC: 1.0,
    wA: 1.5,
    wR: 0.5,
  },
  "transition-edge": {
    mode: "standard",
    dt: 0.04,
    curvatureGain: 4.0,
    attractorStrength: 4.0,
    wK: 2.5,
    wT: 1.8,
    wC: 0.8,
    wA: 2.5,
    wR: 0.3,
  },
  "entropic-dispersion": {
    mode: "standard",
    couplingWeight: 0.8,
    redistributionRate: 0.6,
    wK: 0.5,
    wT: 0.3,
    wC: 2.5,
    wA: 0.3,
    wR: 2.0,
  },
  "post-cooling": {
    mode: "standard",
    dt: 0.02,
    curvatureGain: 0.8,
    wK: 0.3,
    wT: 0.2,
    wC: 1.8,
    wA: 0.5,
    wR: 0.8,
  },
  "quasicrystal": {
    mode: "quasicrystal",
    dt: 0.05,
    curvatureGain: 2.0,
    wK: 1.0,
    wT: 0.8,
    wC: 1.2,
    wA: 2.0,
    wR: 0.5,
  },
  // Special Presets (SP₁-SP₄)
  "criticality-cascade": {
    mode: "criticality",
    dt: 0.05,
    curvatureGain: 0.87,
    couplingWeight: 0.62,
    attractorStrength: 1.35,
    redistributionRate: 0.05,
    wK: 0.87,
    wT: 1.35,
    wC: 0.62,
    wA: 1.0,
    wR: 0.05,
  },
  "fractal-corridor": {
    mode: "fractal",
    dt: 0.04,
    curvatureGain: 3.5,
    couplingWeight: 0.45,
    attractorStrength: 2.8,
    redistributionRate: 0.15,
    wK: 2.5,
    wT: 1.2,
    wC: 1.8,
    wA: 2.0,
    wR: 0.4,
  },
  "cosmic-web": {
    mode: "cosmicweb",
    dt: 0.035,
    curvatureGain: 3.8,
    couplingWeight: 0.62,
    attractorStrength: 4.5,
    redistributionRate: 0.18,
    wK: 2.2,
    wT: 1.93,
    wC: 1.47,
    wA: 3.0,
    wR: 0.62,
  },
  // Mobile-Safe Presets (smooth, stable, no flicker)
  "mobile-equilibrium": {
    mode: "standard",
    dt: 0.02,
    wK: 0.2,
    wT: 0.01,
    wC: 0.05,
    wA: 0.1,
    wR: 0.4,
  },
  "mobile-curvature": {
    mode: "standard",
    dt: 0.02,
    wK: 1.2,
    wT: 0.05,
    wC: 0.2,
    wA: 0.08,
    wR: 0.7,
  },
  "mobile-tension": {
    mode: "standard",
    dt: 0.02,
    wK: 0.6,
    wT: 0.12,
    wC: 0.05,
    wA: 0.2,
    wR: 0.5,
  },
  "mobile-fractal": {
    mode: "standard",
    dt: 0.015,
    wK: 2.8,
    wT: 0.15,
    wC: 0.1,
    wA: 0.3,
    wR: 0.9,
  },
  "mobile-collapse": {
    mode: "standard",
    dt: 0.015,
    wK: 3.3,
    wT: 0.2,
    wC: 0.15,
    wA: 0.4,
    wR: 1.0,
  },
};

export const users = undefined;
export type InsertUser = { username: string; password: string };
export type User = { id: string; username: string; password: string };
