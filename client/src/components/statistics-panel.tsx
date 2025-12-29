import { Card, CardContent } from "@/components/ui/card";
import { Activity, Gauge, Layers, Timer } from "lucide-react";
import type { SimulationState } from "@shared/schema";
import type { ModeLabels } from "@/lib/interpretation-modes";

interface StatisticsPanelProps {
  state: SimulationState;
  modeLabels: ModeLabels;
}

interface MetricCardProps {
  icon: typeof Activity;
  label: string;
  value: string | number;
  unit?: string;
  testId: string;
}

function MetricCard({ icon: Icon, label, value, unit, testId }: MetricCardProps) {
  return (
    <Card className="bg-card/50">
      <CardContent className="p-2">
        <div className="flex items-center gap-1 mb-0.5">
          <Icon className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground truncate">{label}</span>
        </div>
        <div className="flex items-baseline gap-0.5">
          <span className="text-sm font-mono font-semibold" data-testid={testId}>
            {value}
          </span>
          {unit && <span className="text-[10px] text-muted-foreground">{unit}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

export function StatisticsPanel({ state, modeLabels }: StatisticsPanelProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
        Statistics
      </h3>
      <div className="grid grid-cols-4 gap-1.5">
        <MetricCard
          icon={Timer}
          label="Step"
          value={state.step.toLocaleString()}
          testId="stat-step"
        />
        <MetricCard
          icon={Activity}
          label="FPS"
          value={state.fps}
          testId="stat-fps"
        />
        <MetricCard
          icon={Gauge}
          label={modeLabels.stats.energy}
          value={state.energy.toFixed(4)}
          testId="stat-energy"
        />
        <MetricCard
          icon={Layers}
          label={modeLabels.stats.basins}
          value={state.basinCount}
          testId="stat-basins"
        />
      </div>
      <div className="pt-2 border-t border-border">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{modeLabels.stats.variance}</span>
          <span className="font-mono" data-testid="stat-variance">
            {state.variance.toFixed(6)}
          </span>
        </div>
      </div>
    </div>
  );
}
