import type { OperatorContributions } from "@shared/schema";
import type { ModeLabels } from "@/lib/interpretation-modes";

interface OperatorSensitivityProps {
  contributions: OperatorContributions;
  modeLabels: ModeLabels;
  compact?: boolean;
}

interface BarProps {
  label: string;
  value: number;
  color: string;
  compact?: boolean;
}

function Bar({ label, value, color, compact = false }: BarProps) {
  const percentage = Math.round(value * 100);
  
  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-muted-foreground w-6 shrink-0">{label.slice(0, 3)}</span>
        <div className="h-1 flex-1 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${percentage}%`, backgroundColor: color }}
          />
        </div>
        <span className="text-[10px] font-mono text-muted-foreground w-6 text-right">{percentage}%</span>
      </div>
    );
  }
  
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

export function OperatorSensitivity({ contributions, modeLabels, compact = false }: OperatorSensitivityProps) {
  const barColor = "hsl(0, 0%, 60%)";
  return (
    <div className={compact ? "space-y-0.5" : "space-y-2"} data-testid="panel-operator-sensitivity">
      <Bar
        label={modeLabels.operators.curvature.split('(')[0].trim()}
        value={contributions.curvature}
        color={barColor}
        compact={compact}
      />
      <Bar
        label={modeLabels.operators.tension.split('(')[0].trim()}
        value={contributions.tension}
        color={barColor}
        compact={compact}
      />
      <Bar
        label={modeLabels.operators.coupling.split('(')[0].trim()}
        value={contributions.coupling}
        color={barColor}
        compact={compact}
      />
      <Bar
        label={modeLabels.operators.attractor.split('(')[0].trim()}
        value={contributions.attractor}
        color={barColor}
        compact={compact}
      />
      <Bar
        label="Redistribution"
        value={contributions.redistribution}
        color={barColor}
        compact={compact}
      />
    </div>
  );
}
