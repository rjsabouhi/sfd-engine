export type InterpretationMode = 
  | "technical"
  | "structural-dynamics"
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

export const interpretationModes: Record<InterpretationMode, ModeLabels> = {
  "technical": {
    name: "Technical",
    header: "Technical View",
    subtitle: "Mathematically accurate operator terminology.",
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
  "structural-dynamics": {
    name: "Structural Dynamics",
    header: "Structural Dynamics View",
    subtitle: "Domain-general scientific language.",
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
    name: "Intuitive",
    header: "Intuitive View",
    subtitle: "Safe, non-metaphorical descriptions.",
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
  { value: "technical", label: "Technical" },
  { value: "structural-dynamics", label: "Structural Dynamics" },
  { value: "intuitive", label: "Intuitive" },
];

export interface InterpretationSentence {
  technical: string;
  structuralDynamics: string;
  intuitive: string;
}

export function generateInterpretationSentence(
  basinCount: number,
  variance: number,
  energy: number,
  curvatureContrib: number,
  tensionContrib: number,
  isRunning: boolean
): InterpretationSentence {
  const highCurvature = curvatureContrib > 0.3;
  const highTension = tensionContrib > 0.3;
  const highVariance = variance > 0.1;
  const lowVariance = variance < 0.02;
  const manyBasins = basinCount > 5;
  const fewBasins = basinCount <= 2;
  
  if (!isRunning) {
    return {
      technical: "Simulation paused. Press Run to evolve the field.",
      structuralDynamics: "The field is at rest. Start the simulation to observe structural evolution.",
      intuitive: "The pattern is still. Press Run to see it change.",
    };
  }
  
  let technical = "Local operator dynamics are ";
  let structuralDynamics = "Local interactions are causing the field to ";
  let intuitive = "The pattern is ";
  
  if (highCurvature && highVariance) {
    technical += "increasing curvature and amplifying structural variance.";
    structuralDynamics += "bend more sharply while becoming more varied.";
    intuitive += "becoming more uneven with stronger bends forming.";
  } else if (highCurvature && lowVariance) {
    technical += "increasing curvature while reducing structural variance.";
    structuralDynamics += "bend more sharply while stabilizing its overall pattern.";
    intuitive += "settling into a stronger overall shape with distinct bends.";
  } else if (highTension && manyBasins) {
    technical += "driving tension gradients across multiple basin regions.";
    structuralDynamics += "spread and redistribute energy across many distinct regions.";
    intuitive += "spreading out into many separate areas.";
  } else if (fewBasins && lowVariance) {
    technical += "converging toward a stable low-energy configuration.";
    structuralDynamics += "settle into a uniform, stable structure.";
    intuitive += "becoming more even and settled.";
  } else if (manyBasins) {
    technical += "maintaining multi-basin structural complexity.";
    structuralDynamics += "sustain multiple distinct structural regions.";
    intuitive += "holding several separate regions.";
  } else {
    technical += "evolving through balanced operator contributions.";
    structuralDynamics += "evolve through balanced local interactions.";
    intuitive += "changing gradually across the field.";
  }
  
  return { technical, structuralDynamics, intuitive };
}

export function getInterpretationText(
  sentence: InterpretationSentence,
  mode: InterpretationMode
): string {
  switch (mode) {
    case "technical":
      return sentence.technical;
    case "structural-dynamics":
      return sentence.structuralDynamics;
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
