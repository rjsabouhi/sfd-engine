import { useState, useEffect, useRef, useCallback } from "react";
import { SFDEngine } from "@/lib/sfd-engine";
import { VisualizationCanvas } from "@/components/visualization-canvas";
import { ControlPanel } from "@/components/control-panel";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { HelpCircle, Waves } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { SimulationParameters, SimulationState, FieldData } from "@shared/schema";
import { defaultParameters } from "@shared/schema";

export default function SimulationPage() {
  const engineRef = useRef<SFDEngine | null>(null);
  const [params, setParams] = useState<SimulationParameters>(defaultParameters);
  const [state, setState] = useState<SimulationState>({
    step: 0,
    energy: 0,
    variance: 0,
    basinCount: 0,
    isRunning: false,
    fps: 0,
  });
  const [field, setField] = useState<FieldData | null>(null);
  const [colormap, setColormap] = useState<"inferno" | "viridis">("inferno");

  useEffect(() => {
    const engine = new SFDEngine(defaultParameters);
    engineRef.current = engine;

    engine.onStateUpdate((newState, newField) => {
      setState(newState);
      setField(newField);
    });

    return () => {
      engine.stop();
    };
  }, []);

  const handleParamsChange = useCallback((newParams: Partial<SimulationParameters>) => {
    setParams((prev) => {
      const updated = { ...prev, ...newParams };
      engineRef.current?.setParams(newParams);
      return updated;
    });
  }, []);

  const handlePlay = useCallback(() => {
    engineRef.current?.start();
  }, []);

  const handlePause = useCallback(() => {
    engineRef.current?.stop();
  }, []);

  const handleReset = useCallback(() => {
    engineRef.current?.reset();
  }, []);

  const handleStep = useCallback(() => {
    engineRef.current?.stepOnce();
  }, []);

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="flex items-center justify-between gap-4 px-4 py-3 border-b border-border bg-card/50">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10">
            <Waves className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight" data-testid="text-title">
              SFD Engine
            </h1>
            <p className="text-xs text-muted-foreground">
              Structural Field Dynamics
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" data-testid="button-help">
                <HelpCircle className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>About Structural Field Dynamics</DialogTitle>
                <DialogDescription className="pt-4 space-y-3 text-sm">
                  <p>
                    Structural Field Dynamics (SFD) is a geometric model of complex
                    adaptive systems. This simulation demonstrates operator-driven
                    field evolution on a 2D manifold.
                  </p>
                  <p>
                    <strong>The Five Operators:</strong>
                  </p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li><strong>Curvature (K)</strong> — Responds to local curvature via discrete Laplacian</li>
                    <li><strong>Gradient-Tension (T)</strong> — Drives tension waves based on gradient magnitude</li>
                    <li><strong>Neighbor-Coupling (C)</strong> — Creates local clustering through Gaussian blur</li>
                    <li><strong>Attractor-Formation (A)</strong> — Forms threshold-like basin structures</li>
                    <li><strong>Global Redistribution (R)</strong> — Maintains coherence through mean-field shift</li>
                  </ul>
                  <p>
                    <strong>Emergent Behaviors:</strong> Basin formation, attractor merging/splitting,
                    curvature-driven symmetry breaking, metastable equilibria, and tension waves.
                  </p>
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
          <ThemeToggle />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 relative bg-gray-950">
          <VisualizationCanvas field={field} colormap={colormap} />
          <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-sm rounded px-2 py-1">
            <span className="text-xs font-mono text-white/70" data-testid="text-step-overlay">
              Step: {state.step.toLocaleString()}
            </span>
          </div>
          {state.isRunning && (
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded px-2 py-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-xs font-mono text-white/70">Running</span>
            </div>
          )}
        </main>

        <aside className="w-80 border-l border-border bg-card flex flex-col overflow-hidden">
          <ControlPanel
            params={params}
            state={state}
            colormap={colormap}
            onParamsChange={handleParamsChange}
            onPlay={handlePlay}
            onPause={handlePause}
            onReset={handleReset}
            onStep={handleStep}
            onColormapChange={setColormap}
          />
        </aside>
      </div>
    </div>
  );
}
