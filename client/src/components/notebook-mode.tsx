import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen } from "lucide-react";
import type { SimulationParameters, OperatorContributions, StructuralSignature, SimulationState } from "@shared/schema";

interface NotebookModeProps {
  params: SimulationParameters;
  state: SimulationState;
  contributions: OperatorContributions;
  signature: StructuralSignature;
}

export function NotebookMode({ params, state, contributions, signature }: NotebookModeProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" data-testid="button-notebook-mode">
          <BookOpen className="h-4 w-4 mr-2" />
          Notebook
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Researcher Notebook</SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-80px)] pr-4 mt-4">
          <div className="space-y-6 font-mono text-sm">
            <section>
              <h3 className="text-base font-semibold mb-3 font-sans">Update Equation</h3>
              <div className="bg-muted/50 rounded-md p-4 text-xs leading-relaxed">
                <pre className="whitespace-pre-wrap">
{`F(t+dt) = tanh(F(t) + dt * Δ)

where Δ = wK·K + wT·T + wC·C + wA·A + wR·R

Operators:
  K = tanh(∇²F · curvatureGain)    [Curvature]
  T = -|∇F|² / (1 + |∇F|²)         [Tension]
  C = cw·blur(F) - (1-cw)·F        [Coupling]
  A = -tanh(aS · (F - μlocal))     [Attractor]
  R = -μglobal · redistRate        [Redistribution]`}
                </pre>
              </div>
            </section>

            <section>
              <h3 className="text-base font-semibold mb-3 font-sans">Current Parameters</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs bg-muted/50 rounded-md p-4">
                <span className="text-muted-foreground">Grid Size:</span>
                <span>{params.gridSize}×{params.gridSize}</span>
                <span className="text-muted-foreground">Timestep (dt):</span>
                <span>{params.dt.toFixed(3)}</span>
                <span className="text-muted-foreground">Curvature Gain:</span>
                <span>{params.curvatureGain.toFixed(2)}</span>
                <span className="text-muted-foreground">Coupling Weight:</span>
                <span>{params.couplingWeight.toFixed(2)}</span>
                <span className="text-muted-foreground">Coupling Radius:</span>
                <span>{params.couplingRadius.toFixed(2)}</span>
                <span className="text-muted-foreground">Attractor Strength:</span>
                <span>{params.attractorStrength.toFixed(2)}</span>
                <span className="text-muted-foreground">Redistribution Rate:</span>
                <span>{params.redistributionRate.toFixed(2)}</span>
                <span className="text-muted-foreground mt-2 pt-2 border-t border-border">wK (Curvature):</span>
                <span className="mt-2 pt-2 border-t border-border">{params.wK.toFixed(2)}</span>
                <span className="text-muted-foreground">wT (Tension):</span>
                <span>{params.wT.toFixed(2)}</span>
                <span className="text-muted-foreground">wC (Coupling):</span>
                <span>{params.wC.toFixed(2)}</span>
                <span className="text-muted-foreground">wA (Attractor):</span>
                <span>{params.wA.toFixed(2)}</span>
                <span className="text-muted-foreground">wR (Redistribution):</span>
                <span>{params.wR.toFixed(2)}</span>
              </div>
            </section>

            <section>
              <h3 className="text-base font-semibold mb-3 font-sans">Current State</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs bg-muted/50 rounded-md p-4">
                <span className="text-muted-foreground">Step:</span>
                <span>{state.step.toLocaleString()}</span>
                <span className="text-muted-foreground">Energy:</span>
                <span>{state.energy.toFixed(6)}</span>
                <span className="text-muted-foreground">Variance:</span>
                <span>{state.variance.toFixed(6)}</span>
                <span className="text-muted-foreground">Basin Count:</span>
                <span>{state.basinCount}</span>
                <span className="text-muted-foreground">FPS:</span>
                <span>{state.fps}</span>
              </div>
            </section>

            <section>
              <h3 className="text-base font-semibold mb-3 font-sans">Operator Contributions</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs bg-muted/50 rounded-md p-4">
                <span className="text-muted-foreground">Curvature:</span>
                <span>{(contributions.curvature * 100).toFixed(1)}%</span>
                <span className="text-muted-foreground">Tension:</span>
                <span>{(contributions.tension * 100).toFixed(1)}%</span>
                <span className="text-muted-foreground">Coupling:</span>
                <span>{(contributions.coupling * 100).toFixed(1)}%</span>
                <span className="text-muted-foreground">Attractor:</span>
                <span>{(contributions.attractor * 100).toFixed(1)}%</span>
                <span className="text-muted-foreground">Redistribution:</span>
                <span>{(contributions.redistribution * 100).toFixed(1)}%</span>
              </div>
            </section>

            <section>
              <h3 className="text-base font-semibold mb-3 font-sans">Structural Signature</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs bg-muted/50 rounded-md p-4">
                <span className="text-muted-foreground">Basin Count:</span>
                <span>{signature.basinCount}</span>
                <span className="text-muted-foreground">Avg Basin Depth:</span>
                <span>{signature.avgBasinDepth.toFixed(4)}</span>
                <span className="text-muted-foreground">Global Curvature:</span>
                <span>{signature.globalCurvature.toFixed(6)}</span>
                <span className="text-muted-foreground">Tension Variance:</span>
                <span>{signature.tensionVariance.toFixed(6)}</span>
                <span className="text-muted-foreground">Stability Metric:</span>
                <span>{signature.stabilityMetric.toFixed(4)}</span>
              </div>
            </section>

            <section>
              <h3 className="text-base font-semibold mb-3 font-sans">Regime Analysis</h3>
              <div className="text-xs bg-muted/50 rounded-md p-4 space-y-2">
                <p>
                  <span className="text-muted-foreground">Dominant Operator: </span>
                  {getDominantOperator(contributions)}
                </p>
                <p>
                  <span className="text-muted-foreground">Regime Type: </span>
                  {getRegimeType(contributions, signature)}
                </p>
                <p className="text-muted-foreground italic pt-2 border-t border-border mt-2">
                  {getRegimeDescription(contributions, signature)}
                </p>
              </div>
            </section>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function getDominantOperator(c: OperatorContributions): string {
  const ops = [
    { name: "Curvature", val: c.curvature },
    { name: "Tension", val: c.tension },
    { name: "Coupling", val: c.coupling },
    { name: "Attractor", val: c.attractor },
    { name: "Redistribution", val: c.redistribution },
  ];
  const max = ops.reduce((a, b) => a.val > b.val ? a : b);
  return `${max.name} (${(max.val * 100).toFixed(1)}%)`;
}

function getRegimeType(c: OperatorContributions, s: StructuralSignature): string {
  if (s.stabilityMetric > 0.8) return "Stable Equilibrium";
  if (s.stabilityMetric < 0.3) return "High Variance / Unstable";
  if (c.attractor > 0.4) return "Attractor Dominated";
  if (c.curvature > 0.4) return "Curvature Driven";
  if (c.tension > 0.4) return "Tension Driven";
  return "Mixed Dynamics";
}

function getRegimeDescription(c: OperatorContributions, s: StructuralSignature): string {
  if (s.stabilityMetric > 0.8) {
    return "The field has converged to a stable configuration with minimal variance.";
  }
  if (s.basinCount > 10) {
    return "Multiple distinct basins have formed, indicating rich structural diversity.";
  }
  if (c.attractor > 0.4) {
    return "Attractor forces are dominant, driving the field toward local equilibria.";
  }
  if (c.curvature > 0.4) {
    return "Curvature sensitivity is high, enhancing response to local topology.";
  }
  return "The system exhibits mixed operator dynamics with no single dominant force.";
}
