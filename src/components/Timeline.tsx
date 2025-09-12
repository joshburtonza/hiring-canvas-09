interface TimelineEvent {
  id: string;
  time: string;
  title: string;
  people: number;
  avatars?: string[];
}

interface TimelineProps {
  events: TimelineEvent[];
  selectedMonth?: string;
  onMonthChange?: (month: string) => void;
}

const months = ["January", "February 2025", "March"];

export function Timeline({ events, selectedMonth = "February 2025", onMonthChange }: TimelineProps) {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {months.map((month) => (
          <button
            key={month}
            onClick={() => onMonthChange?.(month)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              month === selectedMonth
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80 text-muted-foreground"
            }`}
          >
            {month}
          </button>
        ))}
      </div>
      
      <div className="space-y-3">
        {events.map((event) => (
          <div key={event.id} className="flex items-center gap-4 p-3 hover:bg-muted/50 rounded-lg transition-colors">
            <div className="w-2 h-2 rounded-full bg-primary" />
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{event.time}</span>
                <span className="text-sm font-medium text-foreground">{event.title}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1">
                {event.avatars?.slice(0, 3).map((avatar, index) => (
                  <div
                    key={index}
                    className="w-6 h-6 rounded-full bg-secondary border border-background overflow-hidden"
                  >
                    <img src={avatar} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
              {event.people > 3 && (
                <span className="text-xs text-muted-foreground">
                  +{event.people - 3}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}