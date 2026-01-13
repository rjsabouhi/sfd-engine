import type { ComponentType } from "react";
import type { SimulationState, OperatorContributions, StructuralSignature, StructuralEvent, TrendMetrics, SimulationParameters } from "@shared/schema";
import type { InterpretationMode, ModeLabels } from "@/lib/interpretation-modes";

export type WidgetCategory = "metrics" | "analysis" | "playback" | "research";

export interface WidgetDataDependencies {
  state?: boolean;
  params?: boolean;
  operatorContributions?: boolean;
  structuralSignature?: boolean;
  coherenceHistory?: boolean;
  trendMetrics?: boolean;
  events?: boolean;
  modeLabels?: boolean;
  historyLength?: boolean;
  currentHistoryIndex?: boolean;
  isPlaybackMode?: boolean;
  varianceChange?: boolean;
  isRunning?: boolean;
}

export interface MetricWidgetDefinition {
  id: string;
  title: string;
  shortTitle: string;
  category: WidgetCategory;
  description: string;
  minHeight: number;
  defaultEnabled: boolean;
  defaultOrder: number;
  dataDependencies: WidgetDataDependencies;
}

export interface WidgetLayoutConfig {
  enabledWidgets: string[];
  widgetOrder: string[];
  version: number;
}

export const WIDGET_LAYOUT_VERSION = 1;

export const widgetRegistry: MetricWidgetDefinition[] = [
  {
    id: "structural-signature",
    title: "Structural Signature",
    shortTitle: "Signature",
    category: "metrics",
    description: "Quick metrics display showing basins, depth, curvature, and stability",
    minHeight: 100,
    defaultEnabled: true,
    defaultOrder: 0,
    dataDependencies: { structuralSignature: true, coherenceHistory: true, trendMetrics: true, state: true, modeLabels: true }
  },
  {
    id: "system-regime",
    title: "System Regime",
    shortTitle: "Regime",
    category: "analysis",
    description: "Current behavioral state of the system based on field dynamics",
    minHeight: 80,
    defaultEnabled: true,
    defaultOrder: 1,
    dataDependencies: { state: true, varianceChange: true }
  },
  {
    id: "operator-contributions",
    title: "Operator Contributions",
    shortTitle: "Operators",
    category: "analysis",
    description: "Real-time breakdown of contribution by each operator",
    minHeight: 120,
    defaultEnabled: true,
    defaultOrder: 2,
    dataDependencies: { operatorContributions: true, modeLabels: true }
  },
  {
    id: "temporal-controls",
    title: "Temporal Controls",
    shortTitle: "Playback",
    category: "playback",
    description: "Timeline scrubber for stepping through simulation history",
    minHeight: 60,
    defaultEnabled: true,
    defaultOrder: 3,
    dataDependencies: { historyLength: true, currentHistoryIndex: true, isPlaybackMode: true, isRunning: true }
  },
  {
    id: "event-log",
    title: "Event Log",
    shortTitle: "Events",
    category: "analysis",
    description: "Chronological record of detected structural events",
    minHeight: 150,
    defaultEnabled: true,
    defaultOrder: 4,
    dataDependencies: { events: true }
  },
  {
    id: "current-parameters",
    title: "Current Parameters",
    shortTitle: "Params",
    category: "research",
    description: "Active simulation parameters in compact notation",
    minHeight: 80,
    defaultEnabled: false,
    defaultOrder: 5,
    dataDependencies: { params: true }
  },
  {
    id: "field-equation",
    title: "Field Equation",
    shortTitle: "Equation",
    category: "research",
    description: "Mathematical equation governing field evolution",
    minHeight: 60,
    defaultEnabled: false,
    defaultOrder: 6,
    dataDependencies: {}
  },
  {
    id: "operator-weights",
    title: "Operator Weights",
    shortTitle: "Weights",
    category: "research",
    description: "Current operator weight values in compact format",
    minHeight: 60,
    defaultEnabled: false,
    defaultOrder: 7,
    dataDependencies: { params: true }
  }
];

export function getWidgetById(id: string): MetricWidgetDefinition | undefined {
  return widgetRegistry.find(w => w.id === id);
}

export function getWidgetsByCategory(category: WidgetCategory): MetricWidgetDefinition[] {
  return widgetRegistry.filter(w => w.category === category);
}

export function getDefaultLayout(): WidgetLayoutConfig {
  const enabledWidgets = widgetRegistry
    .filter(w => w.defaultEnabled)
    .sort((a, b) => a.defaultOrder - b.defaultOrder)
    .map(w => w.id);
  
  return {
    enabledWidgets,
    widgetOrder: enabledWidgets,
    version: WIDGET_LAYOUT_VERSION
  };
}

const STORAGE_KEY = "sfd-widget-layout";

export function loadWidgetLayout(): WidgetLayoutConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return getDefaultLayout();
    
    const parsed = JSON.parse(saved);
    
    if (!parsed || typeof parsed !== "object") return getDefaultLayout();
    if (parsed.version !== WIDGET_LAYOUT_VERSION) return getDefaultLayout();
    if (!Array.isArray(parsed.enabledWidgets) || !Array.isArray(parsed.widgetOrder)) {
      return getDefaultLayout();
    }
    
    const validWidgetIds = new Set(widgetRegistry.map(w => w.id));
    const enabledWidgets = parsed.enabledWidgets.filter((id: unknown) => 
      typeof id === "string" && validWidgetIds.has(id)
    );
    const widgetOrder = parsed.widgetOrder.filter((id: unknown) =>
      typeof id === "string" && validWidgetIds.has(id)
    );
    
    return { enabledWidgets, widgetOrder, version: WIDGET_LAYOUT_VERSION };
  } catch {
    return getDefaultLayout();
  }
}

export function saveWidgetLayout(config: WidgetLayoutConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {}
}
