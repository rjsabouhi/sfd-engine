export type InterpretationMode = 
  | "structural-dynamics"
  | "energy-stability"
  | "attractors-phase"
  | "constraint-flow";

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
  "structural-dynamics": {
    name: "Structural Dynamics",
    header: "Structural Dynamics View",
    subtitle: "Local operators shaping global structure.",
    operators: {
      curvature: "Curvature Operator (K)",
      tension: "Tension Operator (T)",
      coupling: "Coupling Operator (C)",
      attractor: "Attractor Influence (A)",
    },
    stats: {
      energy: "Field Energy",
      basins: "Structural Basins",
      variance: "Local Variance",
    },
  },
  "energy-stability": {
    name: "Energy & Stability",
    header: "Energy & Stability View",
    subtitle: "A landscape evolving toward stable configurations.",
    operators: {
      curvature: "Stability Curvature",
      tension: "Gradient Tension",
      coupling: "Stability Coupling",
      attractor: "Attractor Bias",
    },
    stats: {
      energy: "System Energy (E)",
      basins: "Stability Wells",
      variance: "Energy Variance",
    },
  },
  "attractors-phase": {
    name: "Attractors & Phase Space",
    header: "Attractors & Phase Space View",
    subtitle: "Tracking basin formation and phase transitions.",
    operators: {
      curvature: "Phase Curvature",
      tension: "Phase Tension",
      coupling: "Phase Coupling Weight",
      attractor: "Attractor Pull",
    },
    stats: {
      energy: "Phase Energy",
      basins: "Attractor Basins",
      variance: "Phase Variance",
    },
  },
  "constraint-flow": {
    name: "Constraint Flow",
    header: "Constraint Flow View",
    subtitle: "Perturbations redistributing through constraint networks.",
    operators: {
      curvature: "Constraint Curvature",
      tension: "Constraint Pressure",
      coupling: "Flow Coupling",
      attractor: "Constraint Bias",
    },
    stats: {
      energy: "Constraint Energy",
      basins: "Constraint Regions",
      variance: "Flow Variance",
    },
  },
};

export const modeOptions: { value: InterpretationMode; label: string }[] = [
  { value: "structural-dynamics", label: "Structural Dynamics" },
  { value: "energy-stability", label: "Energy & Stability" },
  { value: "attractors-phase", label: "Attractors & Phase Space" },
  { value: "constraint-flow", label: "Constraint Flow" },
];
