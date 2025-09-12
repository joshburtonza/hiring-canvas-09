interface MetricTileProps {
  value: string | number;
  label: string;
  variant?: 1 | 2 | 3 | 4 | 5 | 6;
  className?: string;
}

export function MetricTile({ value, label, variant = 1, className = "" }: MetricTileProps) {
  const gradientClass = `gradient-card-${variant}`;
  
  return (
    <div className={`glass-card ${gradientClass} p-6 text-center cursor-pointer group ${className}`}>
      <div className="text-2xl font-semibold text-white mb-1 group-hover:scale-110 transition-transform duration-200">
        {value}
      </div>
      <div className="text-sm text-white/80">
        {label}
      </div>
    </div>
  );
}