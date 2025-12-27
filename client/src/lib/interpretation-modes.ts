import { LANGUAGE, type InterpretationModeKey, type RegimeKey } from "./language";

export type InterpretationMode = 
  | "technical"
  | "structural"
  | "intuitive";

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

export const interpretationModes: Record<InterpretationMode, ModeLabels> = {
  "technical": {
    name: LANGUAGE.META.TECHNICAL,
    header: LANGUAGE.META.TECHNICAL,
    subtitle: LANGUAGE.META.TECHNICAL_DESC,
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
    name: LANGUAGE.META.STRUCTURAL,
    header: LANGUAGE.META.STRUCTURAL,
    subtitle: LANGUAGE.META.STRUCTURAL_DESC,
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
    name: LANGUAGE.META.INTUITIVE,
    header: LANGUAGE.META.INTUITIVE,
    subtitle: LANGUAGE.META.INTUITIVE_DESC,
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

export const modeOptions: { value: InterpretationMode; label: string }[] = [
  { value: "technical", label: LANGUAGE.META.TECHNICAL },
  { value: "structural", label: LANGUAGE.META.STRUCTURAL },
  { value: "intuitive", label: LANGUAGE.META.INTUITIVE },
];

export interface InterpretationSentence {
  technical: string;
  structural: string;
  intuitive: string;
}

export function detectRegime(
  basinCount: number,
  variance: number,
  energy: number,
  varianceChange: number,
  isRunning: boolean
): RegimeKey {
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

  // Prioritize variance change to distinguish accumulating from reconfiguring
  // Only RECONFIGURING when variance is rising FAST AND already high
  if (varianceRisingFast && highVariance) {
    return "RECONFIGURING";
  }
  // ACCUMULATING: variance is rising but not yet at crisis level, or rising slowly with high variance
  if (varianceRising && !varianceRisingFast) {
    return "ACCUMULATING";
  }
  // EDGE_OF_TRANSITION: high variance but stable (not rising or falling)
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
  const regimeData = LANGUAGE.REGIMES[regime];

  if (!isRunning) {
    return {
      technical: "Simulation paused. Press Run to evolve the field.",
      structural: "The field is at rest. Start the simulation to observe structural evolution.",
      intuitive: "The pattern is still. Press Run to see it change.",
    };
  }

  return {
    technical: `${regimeData.LABEL}: ${regimeData.TECHNICAL}`,
    structural: `${regimeData.LABEL}: ${regimeData.STRUCTURAL}`,
    intuitive: `${regimeData.LABEL}: ${regimeData.INTUITIVE}`,
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

export function getDefaultModeLabels(): ModeLabels {
  return interpretationModes["intuitive"];
}

export function getModeLabels(mode: InterpretationMode): ModeLabels {
  return interpretationModes[mode] || interpretationModes["intuitive"];
}

export { LANGUAGE, toLanguageMode };
export type { InterpretationModeKey, RegimeKey };
