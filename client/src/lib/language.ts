/*  
==========================================================
SFD ENGINE LANGUAGE SYSTEM v2.0 — COMPLETE TEXT FRAMEWORK
==========================================================
This file defines ALL textual content for the SFD Engine.

Structure:
- VOCABULARY: Progressive disclosure layers (foundational → structural → formal)
- MODES: Three interpretation frameworks with complete status line libraries
- REGIMES: Behavioral archetypes with narratives and visual cues
- UI: Panel headers, button labels, and system strings
- ONBOARDING: Welcome flow text

The language system supports:
- Mode-aware status lines (idle, firstMotion, running, reactive)
- Regime-specific idle states
- Reactive event narration (variance spikes, basin merges, transitions)
- Progressive vocabulary introduction
==========================================================
*/

export type InterpretationMode = "intuitive" | "structural" | "technical";
export type RegimeKey = "uniform" | "highCurvature" | "multiBasin" | "nearCritical" | "transitionEdge" | "dispersion" | "postCooling";
export type SimulationState = "idle" | "firstMotion" | "running" | "paused";
export type FieldState = "calm" | "unsettled" | "reorganizing" | "transforming";

export interface ReactiveEvents {
  varianceSpike: boolean;
  basinMerge: boolean;
  boundaryFracture: boolean;
  approachingStability: boolean;
  enterCriticality: boolean;
  enterChaos: boolean;
  exitChaos: boolean;
}

export const LANGUAGE = {

  /* ===========================
     VOCABULARY PROGRESSION
     =========================== */

  VOCABULARY: {
    layer1: [
      "field",
      "pattern", 
      "change",
      "evolving",
      "becoming"
    ],
    layer2: [
      "stability",
      "regions",
      "boundaries",
      "tension",
      "spread",
      "drift",
      "reorganization"
    ],
    layer3: {
      basins: "Stable configurations the system tends toward.",
      curvature: "How sharply the field bends at each point.",
      variance: "How different the field is from one point to another.",
      energy: "Total structural tension in the system.",
      criticality: "Sensitivity to small changes.",
      dispersion: "Loss of structure over time."
    }
  },

  /* ===========================
     MODE DEFINITIONS & STATUS LINES
     =========================== */

  MODES: {
    intuitive: {
      name: "Intuitive",
      description: "Provides clear, everyday-language explanations of what the system is doing. No math required.",
      
      idle: [
        "The pattern is still. Press Run to watch it begin becoming something new.",
        "The field is quiet. Start the simulation to see the first signs of change."
      ],
      
      firstMotion: [
        "Watch closely\u2014the first movements are beginning.",
        "Tiny shifts are waking the field."
      ],
      
      running: [
        "The field is shifting\u2014regions are forming and dissolving.",
        "The pattern is negotiating its shape."
      ],
      
      reactive: {
        varianceSpike: "The field is becoming restless.",
        basinMerge: "Two regions are collapsing into one.",
        boundaryFracture: "A boundary is breaking apart.",
        approachingStability: "The pattern is settling.",
        enterCriticality: "The field is balancing on the edge of order.",
        enterChaos: "The pattern is breaking open\u2014everything is shifting.",
        exitChaos: "The field is trying to find its shape again."
      },
      
      metricsLabel: "What's happening now",
      metricsStates: {
        calm: "Field calm",
        unsettled: "Field unsettled",
        reorganizing: "Field reorganizing",
        transforming: "Field transforming"
      }
    },

    structural: {
      name: "Structural",
      description: "Describes how the system reorganizes, stabilizes, or approaches transitions. Ideal for conceptual understanding.",
      
      idle: [
        "The field is at rest. Run the simulation to observe structural evolution.",
        "No dynamics yet. Press Run to see how organization emerges."
      ],
      
      firstMotion: [
        "Initial dynamics emerging. Boundaries will form shortly.",
        "Small gradients are beginning to organize."
      ],
      
      running: [
        "Structural tension rising; expect new boundaries.",
        "Competing basins emerging."
      ],
      
      reactive: {
        varianceSpike: "Instability rising\u2014transitions likely.",
        basinMerge: "Basin merger\u2014structure simplifying.",
        boundaryFracture: "Structural rupture occurring.",
        approachingStability: "Field approaching a stable configuration.",
        enterCriticality: "Near-critical behavior detected.",
        enterChaos: "Chaotic transition underway.",
        exitChaos: "System reorganizing after turbulence."
      },
      
      metricsLabel: "Structural Indicators",
      metricsStates: {
        calm: "Stable configuration",
        unsettled: "Increasing tension",
        reorganizing: "Basin formation",
        transforming: "Active transition"
      }
    },

    technical: {
      name: "Technical",
      description: "Displays raw system operators, gradients, and differential behavior. Best for research-grade analysis.",
      
      idle: [
        "System initialized. Field state static. Ready for simulation.",
        "Operators dormant. Awaiting Run command."
      ],
      
      firstMotion: [
        "Operators engaged. Transient phase initiating.",
        "Early frame transitions detected."
      ],
      
      running: [
        "Variance increasing; monitoring curvature redistribution.",
        "Operator interactions active: dF/dt above threshold."
      ],
      
      reactive: {
        varianceSpike: "Variance spike detected. Basin formation imminent.",
        basinMerge: "Merge event: \u0394depth < \u03B5. Topology reducing.",
        boundaryFracture: "Curvature discontinuity detected\u2014boundary fracture.",
        approachingStability: "Variance rate minimal\u2014system stabilizing.",
        enterCriticality: "Critical regime detected: sensitivity high.",
        enterChaos: "High entropy dynamics active.",
        exitChaos: "Entropy decreasing; stabilization probable."
      },
      
      metricsLabel: "Simulation Metrics",
      metricsStates: {
        calm: "Low variance state",
        unsettled: "Variance spike",
        reorganizing: "Basin bifurcation",
        transforming: "Phase transition"
      }
    }
  },

  /* ===========================
     REGIME DEFINITIONS
     =========================== */

  REGIMES: {
    uniform: {
      name: "Uniform Field",
      narrative: "Stability without competition\u2014structure fades toward sameness.",
      watchFor: [
        "Colors smoothing",
        "Boundaries dissolving",
        "Gradual flattening of fluctuations"
      ],
      idle: {
        intuitive: "Everything is calm\u2014this regime shows how sameness holds together.",
        structural: "Low tension. Expect small fluctuations to smooth out.",
        technical: "Homogeneous phase. Expect minimal basin differentiation."
      }
    },

    highCurvature: {
      name: "High-Curvature Regime",
      narrative: "Where tension concentrates\u2014sharp bends reveal hidden boundaries.",
      watchFor: [
        "Thin bright/dark lines",
        "Local spikes in curvature",
        "Edges that intensify before breaking"
      ],
      idle: {
        intuitive: "Edges and bends will soon stand out\u2014watch what sharpness reveals.",
        structural: "Curvature concentrations will form structural boundaries.",
        technical: "High-curvature operators primed. Expect boundary intensification."
      }
    },

    multiBasin: {
      name: "Multi-Basin System",
      narrative: "Competing stories pulling the field in different directions.",
      watchFor: [
        "Large regions of distinct coloration",
        "Borders drifting like political lines",
        "Slow, negotiated movement"
      ],
      idle: {
        intuitive: "Multiple stories want to form here\u2014see which ones win.",
        structural: "Several stable configurations will compete for space.",
        technical: "Basin landscape complex. Expect bifurcations and mergers."
      }
    },

    nearCritical: {
      name: "Near-Critical State",
      narrative: "The edge of transformation\u2014small disturbances can reshape everything.",
      watchFor: [
        "Tiny perturbations rippling outward",
        "Moments of sudden shift",
        "Long-range influence spreading"
      ],
      idle: {
        intuitive: "The field is poised\u2014one nudge can transform everything.",
        structural: "System balanced near a transition point.",
        technical: "Critical sensitivity high; small perturbations propagate."
      }
    },

    transitionEdge: {
      name: "Transition Edge",
      narrative: "Where order breaks open and reorganizes.",
      watchFor: [
        "Rapid flickering",
        "Boundaries dissolving and reforming",
        "Moments of symmetry breaking"
      ],
      idle: {
        intuitive: "You're about to watch order break and reform.",
        structural: "This is a boundary between states. Expect rapid shifts.",
        technical: "Entering chaotic transition zone. Dynamics unstable."
      }
    },

    dispersion: {
      name: "Entropic Dispersion",
      narrative: "Dissolution\u2014structure evaporates into noise.",
      watchFor: [
        "Fading shapes",
        "Boundaries melting",
        "Increasing uniformity"
      ],
      idle: {
        intuitive: "Here, structure melts away\u2014watch the pattern dissolve.",
        structural: "Organization will disperse over time.",
        technical: "Dispersion operators active. Expect curvature decay."
      }
    },

    postCooling: {
      name: "Post-Cooling Phase",
      narrative: "After chaos, the field knits itself back together.",
      watchFor: [
        "Regions slowly re-forming",
        "Stabilization returning",
        "Variance decreasing"
      ],
      idle: {
        intuitive: "After turmoil, the field will try to settle again.",
        structural: "Re-stabilization behavior will dominate.",
        technical: "Cooling regime: variance reduction likely."
      }
    }
  },

  /* ===========================
     ONBOARDING TEXT
     =========================== */

  ONBOARDING: {
    WELCOME_TITLE: "Welcome to the Structural Field Explorer",
    WELCOME_BODY: {
      intuitive: "This tool lets you watch how patterns form, shift, and settle. You're looking at a living model of how structure emerges and changes over time.",
      structural: "This simulator models how systems reorganize under tension. You'll observe how local pressures accumulate into global transitions.",
      technical: "This interface exposes operator-level field dynamics: curvature flows, basin formation, variance evolution, and phase transitions."
    },
    
    STEP2_TITLE: "Run the Simulation",
    STEP2_DESC: "Press Run to start. Watch the field evolve as different forces work together to create patterns.",
    
    STEP3_TITLE: "Adjust Parameters",
    STEP3_DESC: "Use the parameter sliders to change how strongly each operator affects the field. Try the preset regimes to see different behaviors.",
    
    STEP4_TITLE: "Keyboard Shortcuts",
    STEP4_DESC: "Space = Play/Pause, B = Basin overlay, D = Dual view, R = Reset. These help you explore faster.",
    
    GET_STARTED: "Begin Exploration",
    NEXT: "Next",
    BACK: "Back",
    STEP_OF: "Step {current} of {total}"
  },

  /* ===========================
     UI ELEMENT TEXT
     =========================== */

  UI: {
    RUN: "Run",
    PAUSE: "Pause",
    RESET: "Reset",
    RANDOMIZE: "Randomize",
    
    MODE_TOGGLE: "Interpretation Mode",
    REGIME_SELECTOR: "Regime",
    PARAMS_PANEL: "Parameters",
    METRICS_PANEL: "Metrics",
    
    DUAL_VIEW: "Dual View",
    DUAL_VIEW_DESC: "Two complementary perspectives of the same evolving structure.",
    
    BASIN_OVERLAY: "Basin Overlay",
    BASIN_OVERLAY_DESC: "Shows regions that share the same stable state.",
    
    EXPORT_PNG: "Export Image",
    EXPORT_JSON: "Export Settings",
    
    COLORMAP: "Color Scale"
  },

  /* ===========================
     LEGACY METRICS (for backward compatibility)
     =========================== */

  METRICS: {
    FG: {
      LABEL: "Field Gradient (FG)",
      INTUITIVE: "How fast things are changing in this area.",
      STRUCTURAL: "Gradient intensity showing how sharply local conditions differ.",
      TECHNICAL: "\u2202\u03A6/\u2202x magnitude. Local differential steepness."
    },
    CC: {
      LABEL: "Constraint Curvature (CC)",
      INTUITIVE: "How 'bent' or 'warped' the local structure is.",
      STRUCTURAL: "Measures deviation from equilibrium geometry.",
      TECHNICAL: "\u03BA = \u2207\u00B7(\u2207\u03A6). Second-order curvature operator."
    },
    TI: {
      LABEL: "Tension Index (TI)",
      INTUITIVE: "How much stress is stored here.",
      STRUCTURAL: "Stored structural energy not yet dispersed.",
      TECHNICAL: "TI = ||\u2207\u03A6|| weighted by constraint density."
    },
    TE: {
      LABEL: "Transition Edge (TE)",
      INTUITIVE: "The border between stability and change.",
      STRUCTURAL: "Boundary where instability surpasses smoothing.",
      TECHNICAL: "Region where \u03BB_min(J) approaches 0."
    },
    RI: {
      LABEL: "Reconfiguration Index (RI)",
      INTUITIVE: "How close the system is to a major change.",
      STRUCTURAL: "Tracks approach to transition threshold.",
      TECHNICAL: "Global integral of PCG-aligned gradients."
    },
    SR: {
      LABEL: "Stability Residue (SR)",
      INTUITIVE: "How much stability remains after the last shift.",
      STRUCTURAL: "Quantifies post-transition smoothing.",
      TECHNICAL: "SR = \u222B EDO \u03A6_t dt."
    }
  }
};

/* ===========================
   STATUS LINE ENGINE
   =========================== */

export function getStatusLine(
  mode: InterpretationMode,
  simState: SimulationState,
  regime: RegimeKey | null,
  events: Partial<ReactiveEvents>
): string {
  const modeData = LANGUAGE.MODES[mode];
  
  if (simState === "idle" || simState === "paused") {
    if (regime && LANGUAGE.REGIMES[regime]) {
      return LANGUAGE.REGIMES[regime].idle[mode];
    }
    return modeData.idle[0];
  }
  
  if (simState === "firstMotion") {
    return modeData.firstMotion[0];
  }
  
  if (simState === "running") {
    if (events.varianceSpike) return modeData.reactive.varianceSpike;
    if (events.basinMerge) return modeData.reactive.basinMerge;
    if (events.boundaryFracture) return modeData.reactive.boundaryFracture;
    if (events.enterCriticality) return modeData.reactive.enterCriticality;
    if (events.enterChaos) return modeData.reactive.enterChaos;
    if (events.exitChaos) return modeData.reactive.exitChaos;
    if (events.approachingStability) return modeData.reactive.approachingStability;
    
    return modeData.running[Math.floor(Math.random() * modeData.running.length)];
  }
  
  return modeData.idle[0];
}

export function getFieldStateLabel(mode: InterpretationMode, state: FieldState): string {
  return LANGUAGE.MODES[mode].metricsStates[state];
}

export function computeFieldState(
  variance: number,
  basinCountChanged: boolean,
  events: Partial<ReactiveEvents>
): FieldState {
  if (events.boundaryFracture || events.basinMerge || events.enterChaos) {
    return "transforming";
  }
  if (basinCountChanged || events.enterCriticality) {
    return "reorganizing";
  }
  if (variance > 0.10 || events.varianceSpike) {
    return "unsettled";
  }
  return "calm";
}

export function getMetricsLabel(mode: InterpretationMode): string {
  return LANGUAGE.MODES[mode].metricsLabel;
}

export function getModeDescription(mode: InterpretationMode): string {
  return LANGUAGE.MODES[mode].description;
}

export function getModeName(mode: InterpretationMode): string {
  return LANGUAGE.MODES[mode].name;
}

export function getRegimeName(regime: RegimeKey): string {
  return LANGUAGE.REGIMES[regime].name;
}

export function getRegimeNarrative(regime: RegimeKey): string {
  return LANGUAGE.REGIMES[regime].narrative;
}

export function getRegimeWatchFor(regime: RegimeKey): string[] {
  return LANGUAGE.REGIMES[regime].watchFor;
}

export function getOnboardingBody(mode: InterpretationMode): string {
  return LANGUAGE.ONBOARDING.WELCOME_BODY[mode];
}

export type MetricKey = keyof typeof LANGUAGE.METRICS;
export type InterpretationModeKey = "TECHNICAL" | "STRUCTURAL" | "INTUITIVE";

export function getMetricText(metric: MetricKey, mode: InterpretationModeKey): string {
  const metricData = LANGUAGE.METRICS[metric];
  return metricData[mode];
}

export function getMetricLabel(metric: MetricKey): string {
  return LANGUAGE.METRICS[metric].LABEL;
}

export function getRegimeText(regime: string, mode: InterpretationModeKey): string {
  const modeKey = mode.toLowerCase() as InterpretationMode;
  const regimeData = LANGUAGE.REGIMES[regime as RegimeKey];
  if (regimeData) {
    return regimeData.idle[modeKey];
  }
  return "";
}

export function getRegimeLabel(regime: string): string {
  const regimeData = LANGUAGE.REGIMES[regime as RegimeKey];
  if (regimeData) {
    return regimeData.name;
  }
  return regime;
}
