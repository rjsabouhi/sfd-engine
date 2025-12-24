import { Card, CardContent } from "@/components/ui/card";
import { Activity, Gauge, Layers, Timer } from "lucide-react";
import type { SimulationState } from "@shared/schema";

interface StatisticsPanelProps {
  state: SimulationState;
}

interface MetricCardProps {
  icon: typeof Activity;
  label: string;
  value: string | number;
  unit?: string;
}

function MetricCard({ icon: Icon, label, value, unit }: MetricCardProps) {
  return (
    <Card className="bg-card/50">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-1">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-mono font-semibold" data-testid={`stat-${label.toLowerCase().replace(/\s/g, '-')}`}>
            {value}
          </span>
          {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

export function StatisticsPanel({ state }: StatisticsPanelProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
        Statistics
      </h3>
      <div className="grid grid-cols-2 gap-2">
        <MetricCard
          icon={Timer}
          label="Step"
          value={state.step.toLocaleString()}
        />
        <MetricCard
          icon={Activity}
          label="FPS"
          value={state.fps}
        />
        <MetricCard
          icon={Gauge}
          label="Energy"
          value={state.energy.toFixed(4)}
        />
        <MetricCard
          icon={Layers}
          label="Basins"
          value={state.basinCount}
        />
      </div>
      <div className="pt-2 border-t border-border">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Variance</span>
          <span className="font-mono" data-testid="stat-variance">
            {state.variance.toFixed(6)}
          </span>
        </div>
      </div>
    </div>
  );
}
