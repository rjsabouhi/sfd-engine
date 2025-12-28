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
  const barColor = "hsl(0, 0%, 60%)";
  return (
    <div className="space-y-2" data-testid="panel-operator-sensitivity">
      <Bar
        label={modeLabels.operators.curvature.split('(')[0].trim()}
        value={contributions.curvature}
        color={barColor}
      />
      <Bar
        label={modeLabels.operators.tension.split('(')[0].trim()}
        value={contributions.tension}
        color={barColor}
      />
      <Bar
        label={modeLabels.operators.coupling.split('(')[0].trim()}
        value={contributions.coupling}
        color={barColor}
      />
      <Bar
        label={modeLabels.operators.attractor.split('(')[0].trim()}
        value={contributions.attractor}
        color={barColor}
      />
      <Bar
        label="Redistribution"
        value={contributions.redistribution}
        color={barColor}
      />
    </div>
  );
}
