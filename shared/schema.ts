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
  "high-curvature": {
    curvatureGain: 8.0,
    wK: 4.0,
    wT: 0.5,
    wC: 0.8,
    wA: 1.0,
    wR: 0.3,
  },
  "tension-dominant": {
    curvatureGain: 1.5,
    wK: 0.5,
    wT: 4.0,
    wC: 0.6,
    wA: 1.0,
    wR: 0.4,
  },
  "weak-coupling": {
    couplingWeight: 0.2,
    wK: 1.5,
    wT: 1.0,
    wC: 0.3,
    wA: 4.0,
    wR: 0.2,
  },
  "meta-stability": {
    dt: 0.02,
    curvatureGain: 1.0,
    wK: 0.8,
    wT: 0.6,
    wC: 1.5,
    wA: 0.8,
    wR: 0.8,
  },
  "constraint-collapse": {
    dt: 0.08,
    curvatureGain: 5.0,
    attractorStrength: 8.0,
    wK: 3.0,
    wT: 2.0,
    wC: 0.5,
    wA: 4.0,
    wR: 0.1,
  },
};

export const users = undefined;
export type InsertUser = { username: string; password: string };
export type User = { id: string; username: string; password: string };
