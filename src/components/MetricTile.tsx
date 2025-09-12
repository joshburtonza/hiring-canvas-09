interface MetricTileProps {
  value: string | number;
  label: string;
  className?: string;
}

export function MetricTile({ value, label, className = "" }: MetricTileProps) {
  return (
    <div className={`glass-card p-6 text-center ${className}`}>
      <div className="text-2xl font-semibold text-foreground mb-1">
        {value}
      </div>
      <div className="text-sm text-muted-foreground">
        {label}
      </div>
    </div>
  );
}