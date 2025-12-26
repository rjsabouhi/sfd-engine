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

export const users = undefined;
export type InsertUser = { username: string; password: string };
export type User = { id: string; username: string; password: string };
