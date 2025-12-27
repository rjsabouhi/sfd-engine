import type { OperatorContributions } from "@shared/schema";
import type { ModeLabels } from "@/lib/interpretation-modes";

interface OperatorSensitivityProps {
  contributions: OperatorContributions;
  modeLabels: ModeLabels;
}

interface BarProps {
  label: string;
  value: number;
  color: string;
}

function Bar({ label, value, color }: BarProps) {
  const percentage = Math.round(value * 100);
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground truncate">{label}</span>
        <span className="font-mono text-muted-foreground">{percentage}%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export function OperatorSensitivity({ contributions, modeLabels }: OperatorSensitivityProps) {
  return (
    <div className="space-y-2" data-testid="panel-operator-sensitivity">
      <Bar
        label={modeLabels.operators.curvature.split('(')[0].trim()}
        value={contributions.curvature}
        color="hsl(280, 70%, 60%)"
      />
      <Bar
        label={modeLabels.operators.tension.split('(')[0].trim()}
        value={contributions.tension}
        color="hsl(200, 70%, 60%)"
      />
      <Bar
        label={modeLabels.operators.coupling.split('(')[0].trim()}
        value={contributions.coupling}
        color="hsl(160, 70%, 50%)"
      />
      <Bar
        label={modeLabels.operators.attractor.split('(')[0].trim()}
        value={contributions.attractor}
        color="hsl(40, 80%, 55%)"
      />
      <Bar
        label="Redistribution"
        value={contributions.redistribution}
        color="hsl(0, 60%, 55%)"
      />
    </div>
  );
}
