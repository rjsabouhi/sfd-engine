import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronUp, Settings2, GripVertical, RotateCcw } from "lucide-react";
import type { SimulationState, SimulationParameters, OperatorContributions, StructuralSignature, StructuralEvent, TrendMetrics } from "@shared/schema";
import type { ModeLabels, InterpretationMode } from "@/lib/interpretation-modes";
import { detectRegime, toLanguageMode } from "@/lib/interpretation-modes";
import { 
  widgetRegistry, 
  loadWidgetLayout, 
  saveWidgetLayout, 
  getDefaultLayout,
  type WidgetLayoutConfig,
  type WidgetCategory
} from "@/config/widget-registry";

import { StructuralSignatureBar } from "./structural-signature";
import { OperatorSensitivity } from "./operator-sensitivity";
import { EventLog } from "./event-log";
import { TemporalControls } from "./temporal-controls";
import { LegacyRegimeDisplay } from "./regime-display";

interface MetricsWorkspaceProps {
  state: SimulationState;
  params: SimulationParameters;
  operatorContributions: OperatorContributions;
  structuralSignature: StructuralSignature;
  coherenceHistory: number[];
  trendMetrics: TrendMetrics | null;
  events: StructuralEvent[];
  modeLabels: ModeLabels;
  interpretationMode: InterpretationMode;
  historyLength: number;
  currentHistoryIndex: number;
  isPlaybackMode: boolean;
  varianceChange: number;
  onStepBackward: () => void;
  onStepForward: () => void;
  onSeekFrame: (index: number) => void;
  onExitPlayback: () => void;
  onClearEvents: () => void;
  onExportEvents: () => void;
}

interface WidgetCollapseState {
  [widgetId: string]: boolean;
}

const categoryLabels: Record<WidgetCategory, string> = {
  metrics: "Metrics",
  analysis: "Analysis", 
  playback: "Playback",
  research: "Research"
};

export function MetricsWorkspace({
  state,
  params,
  operatorContributions,
  structuralSignature,
  coherenceHistory,
  trendMetrics,
  events,
  modeLabels,
  interpretationMode,
  historyLength,
  currentHistoryIndex,
  isPlaybackMode,
  varianceChange,
  onStepBackward,
  onStepForward,
  onSeekFrame,
  onExitPlayback,
  onClearEvents,
  onExportEvents,
}: MetricsWorkspaceProps) {
  const [layout, setLayout] = useState<WidgetLayoutConfig>(() => loadWidgetLayout());
  const [collapseState, setCollapseState] = useState<WidgetCollapseState>(() => {
    const initial: WidgetCollapseState = {};
    widgetRegistry.forEach(w => { initial[w.id] = true; });
    return initial;
  });
  const [sheetOpen, setSheetOpen] = useState(false);

  const languageMode = toLanguageMode(interpretationMode);
  const currentRegime = detectRegime(
    state.basinCount,
    state.variance,
    state.energy,
    varianceChange,
    state.isRunning
  );

  const toggleWidget = useCallback((widgetId: string, enabled: boolean) => {
    setLayout(prev => {
      const newEnabled = enabled 
        ? [...prev.enabledWidgets, widgetId]
        : prev.enabledWidgets.filter(id => id !== widgetId);
      
      const widget = widgetRegistry.find(w => w.id === widgetId);
      let newOrder = [...prev.widgetOrder];
      
      if (enabled && widget) {
        if (!newOrder.includes(widgetId)) {
          newOrder.push(widgetId);
        }
      } else {
        newOrder = newOrder.filter(id => id !== widgetId);
      }
      
      const newLayout = { ...prev, enabledWidgets: newEnabled, widgetOrder: newOrder };
      saveWidgetLayout(newLayout);
      return newLayout;
    });
  }, []);

  const moveWidget = useCallback((widgetId: string, direction: "up" | "down") => {
    setLayout(prev => {
      const currentIndex = prev.widgetOrder.indexOf(widgetId);
      if (currentIndex === -1) return prev;
      
      const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
      if (newIndex < 0 || newIndex >= prev.widgetOrder.length) return prev;
      
      const newOrder = [...prev.widgetOrder];
      [newOrder[currentIndex], newOrder[newIndex]] = [newOrder[newIndex], newOrder[currentIndex]];
      
      const newLayout = { ...prev, widgetOrder: newOrder };
      saveWidgetLayout(newLayout);
      return newLayout;
    });
  }, []);

  const resetLayout = useCallback(() => {
    const defaultLayout = getDefaultLayout();
    setLayout(defaultLayout);
    saveWidgetLayout(defaultLayout);
  }, []);

  const toggleCollapse = useCallback((widgetId: string) => {
    setCollapseState(prev => ({ ...prev, [widgetId]: !prev[widgetId] }));
  }, []);

  const renderWidgetContent = (widgetId: string) => {
    switch (widgetId) {
      case "structural-signature":
        return (
          <StructuralSignatureBar 
            signature={structuralSignature} 
            coherenceHistory={coherenceHistory}
            trendMetrics={trendMetrics}
            state={state}
            modeLabels={modeLabels} 
          />
        );
      case "system-regime":
        return <LegacyRegimeDisplay regime={currentRegime} mode={languageMode} />;
      case "operator-contributions":
        return <OperatorSensitivity contributions={operatorContributions} modeLabels={modeLabels} />;
      case "temporal-controls":
        return (
          <TemporalControls
            historyLength={historyLength}
            currentIndex={currentHistoryIndex}
            isPlaybackMode={isPlaybackMode}
            isRunning={state.isRunning}
            onStepBackward={onStepBackward}
            onStepForward={onStepForward}
            onSeek={onSeekFrame}
            onExitPlayback={onExitPlayback}
          />
        );
      case "event-log":
        return <EventLog events={events} onClear={onClearEvents} onExport={onExportEvents} />;
      case "current-parameters":
        return (
          <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-muted/30 p-2 rounded">
            <div>dt = {params.dt.toFixed(3)}</div>
            <div>K = {params.curvatureGain.toFixed(2)}</div>
            <div>C = {params.couplingWeight.toFixed(2)}</div>
            <div>A = {params.attractorStrength.toFixed(2)}</div>
            <div>R = {params.redistributionRate.toFixed(2)}</div>
            <div>Grid: {params.gridSize}x{params.gridSize}</div>
          </div>
        );
      case "field-equation":
        return (
          <code className="text-xs block bg-muted p-2 rounded font-mono">
            dF/dt = wK*K(F) + wT*T(F) + wC*C(F) + wA*A(F) + wR*R(F)
          </code>
        );
      case "operator-weights":
        return (
          <div className="grid grid-cols-5 gap-1 text-xs font-mono bg-muted/30 p-2 rounded text-center">
            <div>wK={params.wK.toFixed(1)}</div>
            <div>wT={params.wT.toFixed(1)}</div>
            <div>wC={params.wC.toFixed(1)}</div>
            <div>wA={params.wA.toFixed(1)}</div>
            <div>wR={params.wR.toFixed(1)}</div>
          </div>
        );
      default:
        return null;
    }
  };

  const orderedWidgets = layout.widgetOrder
    .filter(id => layout.enabledWidgets.includes(id))
    .map(id => widgetRegistry.find(w => w.id === id))
    .filter((w): w is NonNullable<typeof w> => w !== undefined);

  const groupedWidgets = Object.entries(
    widgetRegistry.reduce((acc, widget) => {
      if (!acc[widget.category]) acc[widget.category] = [];
      acc[widget.category].push(widget);
      return acc;
    }, {} as Record<WidgetCategory, typeof widgetRegistry>)
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <span className="text-xs font-medium text-muted-foreground">Metrics Workspace</span>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6" data-testid="button-customize-widgets">
              <Settings2 className="h-3.5 w-3.5" />
            </Button>
          </SheetTrigger>
          <SheetContent className="w-80 overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Customize Widgets</SheetTitle>
              <SheetDescription>
                Toggle widgets on/off and reorder them to create your preferred metrics layout.
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-6">
              {groupedWidgets.map(([category, widgets]) => (
                <div key={category} className="space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {categoryLabels[category as WidgetCategory]}
                  </h3>
                  <div className="space-y-2">
                    {widgets.map(widget => {
                      const isEnabled = layout.enabledWidgets.includes(widget.id);
                      const orderIndex = layout.widgetOrder.indexOf(widget.id);
                      const canMoveUp = isEnabled && orderIndex > 0;
                      const canMoveDown = isEnabled && orderIndex < layout.widgetOrder.length - 1 && orderIndex !== -1;
                      
                      return (
                        <div 
                          key={widget.id} 
                          className="flex items-center gap-2 p-2 rounded-md border border-border/50 bg-muted/20"
                        >
                          <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                          <div className="flex-1 min-w-0">
                            <Label htmlFor={`widget-${widget.id}`} className="text-sm font-medium cursor-pointer">
                              {widget.title}
                            </Label>
                            <p className="text-xs text-muted-foreground truncate">{widget.description}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              disabled={!canMoveUp}
                              onClick={() => moveWidget(widget.id, "up")}
                              data-testid={`button-move-up-${widget.id}`}
                            >
                              <ChevronUp className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              disabled={!canMoveDown}
                              onClick={() => moveWidget(widget.id, "down")}
                              data-testid={`button-move-down-${widget.id}`}
                            >
                              <ChevronDown className="h-3 w-3" />
                            </Button>
                            <Switch
                              id={`widget-${widget.id}`}
                              checked={isEnabled}
                              onCheckedChange={(checked) => toggleWidget(widget.id, checked)}
                              data-testid={`switch-widget-${widget.id}`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full" 
                onClick={resetLayout}
                data-testid="button-reset-widget-layout"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-2" />
                Reset to Default
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {orderedWidgets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center text-muted-foreground">
            <Settings2 className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-xs">No widgets enabled</p>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setSheetOpen(true)}
              className="text-xs"
            >
              Customize widgets
            </Button>
          </div>
        ) : (
          orderedWidgets.map((widget, index) => (
            <Collapsible 
              key={widget.id} 
              open={collapseState[widget.id]} 
              onOpenChange={() => toggleCollapse(widget.id)}
              className={index > 0 ? "border-t border-border/50 pt-3" : ""}
            >
              <CollapsibleTrigger asChild>
                <button 
                  className="flex items-center justify-between w-full py-1 hover-elevate rounded px-1" 
                  data-testid={`button-toggle-${widget.id}`}
                >
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    {widget.title}
                  </span>
                  {collapseState[widget.id] ? (
                    <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                {renderWidgetContent(widget.id)}
              </CollapsibleContent>
            </Collapsible>
          ))
        )}
      </div>
    </div>
  );
}
