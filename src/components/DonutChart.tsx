interface DonutData {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutData[];
  centerText: string;
  centerSubtext?: string;
}

export function DonutChart({ data, centerText, centerSubtext }: DonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let currentAngle = -90; // Start from top
  
  const paths = data.map((item) => {
    const percentage = (item.value / total) * 100;
    const angle = (item.value / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    
    const x1 = 50 + 35 * Math.cos((startAngle * Math.PI) / 180);
    const y1 = 50 + 35 * Math.sin((startAngle * Math.PI) / 180);
    const x2 = 50 + 35 * Math.cos((endAngle * Math.PI) / 180);
    const y2 = 50 + 35 * Math.sin((endAngle * Math.PI) / 180);
    
    const largeArcFlag = angle > 180 ? 1 : 0;
    
    const pathData = [
      "M", 50, 50,
      "L", x1, y1,
      "A", 35, 35, 0, largeArcFlag, 1, x2, y2,
      "Z"
    ].join(" ");
    
    currentAngle += angle;
    
    return {
      path: pathData,
      color: item.color,
      percentage: Math.round(percentage),
      label: item.label
    };
  });

  return (
    <div className="flex items-center gap-6">
      <div className="relative">
        <svg width="120" height="120" viewBox="0 0 100 100" className="transform rotate-0">
          <circle
            cx="50"
            cy="50"
            r="35"
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth="1"
          />
          {paths.map((item, index) => (
            <path
              key={index}
              d={item.path}
              fill={item.color}
              opacity="0.8"
            />
          ))}
          <circle
            cx="50"
            cy="50"
            r="25"
            fill="hsl(var(--card))"
          />
        </svg>
        
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-lg font-semibold text-foreground">{centerText}</div>
          {centerSubtext && (
            <div className="text-xs text-muted-foreground">{centerSubtext}</div>
          )}
        </div>
      </div>
      
      <div className="space-y-2">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-foreground">{item.label}</span>
            <span className="text-muted-foreground">{item.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}