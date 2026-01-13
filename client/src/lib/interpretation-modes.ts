import { LANGUAGE, type InterpretationMode, type RegimeKey, type ReactiveEvents, getStatusLine } from "./language";

export type { InterpretationMode };

export type InterpretationModeKey = "TECHNICAL" | "STRUCTURAL" | "INTUITIVE";

export interface ModeLabels {
  name: string;
  header: string;
  subtitle: string;
  operators: {
    curvature: string;
    tension: string;
    coupling: string;
    attractor: string;
  };
  stats: {
    energy: string;
    basins: string;
    variance: string;
  };
}

function toLanguageMode(mode: InterpretationMode): InterpretationModeKey {
  switch (mode) {
    case "technical":
      return "TECHNICAL";
    case "structural":
      return "STRUCTURAL";
    case "intuitive":
    default:
      return "INTUITIVE";
  }
}

function fromLanguageMode(mode: InterpretationModeKey): InterpretationMode {
  switch (mode) {
    case "TECHNICAL":
      return "technical";
    case "STRUCTURAL":
      return "structural";
    case "INTUITIVE":
    default:
      return "intuitive";
  }
}

export const interpretationModes: Record<InterpretationMode, ModeLabels> = {
  "technical": {
    name: LANGUAGE.MODES.technical.name,
    header: LANGUAGE.MODES.technical.name,
    subtitle: LANGUAGE.MODES.technical.description,
    operators: {
      curvature: "Curvature (K)",
      tension: "Tension (T)",
      coupling: "Coupling (C)",
      attractor: "Attractor (A)",
    },
    stats: {
      energy: "Field Energy",
      basins: "Basins",
      variance: "Variance",
    },
  },
  "structural": {
    name: LANGUAGE.MODES.structural.name,
    header: LANGUAGE.MODES.structural.name,
    subtitle: LANGUAGE.MODES.structural.description,
    operators: {
      curvature: "Curvature Operator",
      tension: "Tension Operator",
      coupling: "Coupling Operator",
      attractor: "Attractor Influence",
    },
    stats: {
      energy: "Field Energy",
      basins: "Structural Basins",
      variance: "Local Variance",
    },
  },
  "intuitive": {
    name: LANGUAGE.MODES.intuitive.name,
    header: LANGUAGE.MODES.intuitive.name,
    subtitle: LANGUAGE.MODES.intuitive.description,
    operators: {
      curvature: "Bending",
      tension: "Spreading",
      coupling: "Blending",
      attractor: "Settling",
    },
    stats: {
      energy: "Overall Activity",
      basins: "Distinct Regions",
      variance: "Unevenness",
    },
  },
};

export const modeOptions: { value: InterpretationMode; label: string; tooltip: string }[] = [
  { value: "technical", label: LANGUAGE.MODES.technical.name, tooltip: "Scientific terminology with precise mathematical notation" },
  { value: "structural", label: LANGUAGE.MODES.structural.name, tooltip: "Field-theoretic language focusing on structural dynamics" },
  { value: "intuitive", label: LANGUAGE.MODES.intuitive.name, tooltip: "Everyday language describing behavior in simple terms" },
];

export interface InterpretationSentence {
  technical: string;
  structural: string;
  intuitive: string;
}

type DetectedRegime = "STABLE" | "DRIFTING" | "ACCUMULATING" | "EDGE_OF_TRANSITION" | "RECONFIGURING" | "DISPERSION" | "NEW_BASELINE" | "CYCLING";

export function detectRegime(
  basinCount: number,
  variance: number,
  energy: number,
  varianceChange: number,
  isRunning: boolean
): DetectedRegime {
  if (!isRunning) {
    return "STABLE";
  }

  const highVariance = variance > 0.15;
  const moderateVariance = variance > 0.05 && variance <= 0.15;
  const lowVariance = variance < 0.02;
  const varianceRising = varianceChange > 0.01;
  const varianceRisingFast = varianceChange > 0.03;
  const varianceFalling = varianceChange < -0.01;
  const manyBasins = basinCount > 5;
  const fewBasins = basinCount <= 2;
  const highEnergy = energy > 1.5;
  const lowEnergy = energy < 0.3;

  if (varianceRisingFast && highVariance) {
    return "RECONFIGURING";
  }
  if (varianceRising && !varianceRisingFast) {
    return "ACCUMULATING";
  }
  if (highVariance && !varianceRising && !varianceFalling) {
    return "EDGE_OF_TRANSITION";
  }
  if (varianceFalling && !lowVariance) {
    return "DISPERSION";
  }
  if (lowVariance && fewBasins && lowEnergy) {
    return "STABLE";
  }
  if (lowVariance && fewBasins) {
    return "NEW_BASELINE";
  }
  if (manyBasins && !lowVariance && !highVariance) {
    return "CYCLING";
  }
  if (!highVariance && !lowVariance) {
    return "DRIFTING";
  }

  return "STABLE";
}

const detectedRegimeLabels: Record<DetectedRegime, { label: string; technical: string; structural: string; intuitive: string }> = {
  STABLE: {
    label: "Stable Regime",
    intuitive: "Everything is calm and mostly balanced. Small changes fade out quickly.",
    structural: "Low gradients, low curvature. System returns to equilibrium after small disturbances.",
    technical: "\u03A6_t \u2192 0, negative divergence, high SR.",
  },
  DRIFTING: {
    label: "Drift Regime",
    intuitive: "The system is slowly shifting in a direction.",
    structural: "Coherent directional gradient. The system moves toward a new basin.",
    technical: "Persistent low-frequency gradient alignment.",
  },
  ACCUMULATING: {
    label: "Tension Accumulation",
    intuitive: "Stress is quietly building. Nothing dramatic yet.",
    structural: "Increasing TI and CC. Pre-critical buildup.",
    technical: "\u2202TI/\u2202t > 0, PCG approaching threshold.",
  },
  EDGE_OF_TRANSITION: {
    label: "Transition Edge",
    intuitive: "Right at the border of change. A nudge could tip it.",
    structural: "TE zone widening. High sensitivity to fluctuations.",
    technical: "\u03BB_min(J) \u2248 0, bifurcation imminent.",
  },
  RECONFIGURING: {
    label: "Reconfiguration Event",
    intuitive: "A major shift is happening right now.",
    structural: "Topology reorganizes. Constraints are redistributed.",
    technical: "SRE trigger: PCG > threshold; immediate \u0394\u03A6 across manifold.",
  },
  DISPERSION: {
    label: "Dispersion Phase",
    intuitive: "The system is cooling off after the shift.",
    structural: "EDO smooths out leftover tension.",
    technical: "High-frequency components dampen; SR rises.",
  },
  NEW_BASELINE: {
    label: "New Baseline",
    intuitive: "A new normal has formed.",
    structural: "Stable configuration established in a new basin.",
    technical: "SR stable; new equilibrium manifold.",
  },
  CYCLING: {
    label: "Dynamic Cycling",
    intuitive: "The system is repeatedly shifting, never quite settling.",
    structural: "Oscillatory constraint realignments.",
    technical: "Limit-cycle attractor or structural resonance pattern.",
  },
};

export function generateInterpretationSentence(
  basinCount: number,
  variance: number,
  energy: number,
  curvatureContrib: number,
  tensionContrib: number,
  isRunning: boolean,
  varianceChange: number = 0
): InterpretationSentence {
  const regime = detectRegime(basinCount, variance, energy, varianceChange, isRunning);
  const regimeData = detectedRegimeLabels[regime];

  if (!isRunning) {
    return {
      technical: "Simulation paused. Press Run to evolve the field.",
      structural: "The field is at rest. Start the simulation to observe structural evolution.",
      intuitive: "The pattern is still. Press Run to see it change.",
    };
  }

  return {
    technical: `${regimeData.label}: ${regimeData.technical}`,
    structural: `${regimeData.label}: ${regimeData.structural}`,
    intuitive: `${regimeData.label}: ${regimeData.intuitive}`,
  };
}

export function getInterpretationText(
  sentence: InterpretationSentence,
  mode: InterpretationMode
): string {
  switch (mode) {
    case "technical":
      return sentence.technical;
    case "structural":
      return sentence.structural;
    case "intuitive":
    default:
      return sentence.intuitive;
  }
}

export function getModeLabels(mode: InterpretationMode): ModeLabels {
  return interpretationModes[mode] || interpretationModes["intuitive"];
}

export { LANGUAGE, toLanguageMode, fromLanguageMode };
export type { RegimeKey };
