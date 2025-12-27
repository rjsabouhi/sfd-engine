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
}

export interface BasinMap {
  labels: Int32Array;
  count: number;
  width: number;
  height: number;
}

export interface DerivedField {
  type: "curvature" | "tension" | "coupling" | "variance";
  grid: Float32Array;
  width: number;
  height: number;
}

export const structuralPresets: Record<string, Partial<SimulationParameters>> = {
  "uniform-field": {
    curvatureGain: 1.0,
    wK: 0.5,
    wT: 0.5,
    wC: 2.0,
    wA: 0.5,
    wR: 1.0,
  },
  "high-curvature": {
    curvatureGain: 8.0,
    wK: 4.0,
    wT: 0.5,
    wC: 0.8,
    wA: 1.0,
    wR: 0.3,
  },
  "multi-basin": {
    couplingWeight: 0.3,
    attractorStrength: 5.0,
    wK: 1.0,
    wT: 0.8,
    wC: 0.5,
    wA: 3.5,
    wR: 0.2,
  },
  "near-critical": {
    dt: 0.03,
    curvatureGain: 3.0,
    wK: 2.0,
    wT: 1.5,
    wC: 1.0,
    wA: 1.5,
    wR: 0.5,
  },
  "transition-edge": {
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
    couplingWeight: 0.8,
    redistributionRate: 0.6,
    wK: 0.5,
    wT: 0.3,
    wC: 2.5,
    wA: 0.3,
    wR: 2.0,
  },
  "post-cooling": {
    dt: 0.02,
    curvatureGain: 0.8,
    wK: 0.3,
    wT: 0.2,
    wC: 1.8,
    wA: 0.5,
    wR: 0.8,
  },
};

export const users = undefined;
export type InsertUser = { username: string; password: string };
export type User = { id: string; username: string; password: string };
