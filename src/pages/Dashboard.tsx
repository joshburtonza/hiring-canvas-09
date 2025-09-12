import { DonutChart } from "@/components/DonutChart";
import { MetricTile } from "@/components/MetricTile";
import { TasksList } from "@/components/TasksList";
import { Timeline } from "@/components/Timeline";
import { Button } from "@/components/ui/button";

const workingFormatData = [
  { label: "Office", value: 50, color: "hsl(var(--brand))" },
  { label: "Hybrid", value: 30, color: "hsl(var(--brand-2))" },
  { label: "Remote", value: 20, color: "hsl(var(--accent))" },
];

const tasks = [
  {
    id: "1",
    title: "Complete profile setup",
    meta: "2 min remaining",
    completed: true,
  },
  {
    id: "2", 
    title: "Upload profile picture",
    meta: "1 min remaining",
    completed: true,
  },
  {
    id: "3",
    title: "Connect social accounts",
    meta: "3 min remaining", 
    completed: false,
  },
  {
    id: "4",
    title: "Set up preferences",
    meta: "5 min remaining",
    completed: false,
  },
];

const timelineEvents = [
  {
    id: "1",
    time: "09:00",
    title: "Team standup meeting",
    people: 5,
    avatars: ["/api/placeholder/24/24", "/api/placeholder/24/24", "/api/placeholder/24/24"],
  },
  {
    id: "2", 
    time: "11:30",
    title: "Client presentation",
    people: 3,
    avatars: ["/api/placeholder/24/24", "/api/placeholder/24/24"],
  },
  {
    id: "3",
    time: "14:00", 
    title: "Design review",
    people: 4,
    avatars: ["/api/placeholder/24/24", "/api/placeholder/24/24", "/api/placeholder/24/24", "/api/placeholder/24/24"],
  },
  {
    id: "4",
    time: "16:30",
    title: "One-on-one with manager", 
    people: 2,
    avatars: ["/api/placeholder/24/24"],
  },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Header Cards Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-secondary overflow-hidden">
              <img src="/api/placeholder/48/48" alt="Profile" className="w-full h-full object-cover" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">Olivia Johnson</h3>
              <p className="text-sm text-muted-foreground">Senior Designer</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full">
            View Profile
          </Button>
        </div>

        {/* Working Format Chart */}
        <div className="glass-card p-6">
          <DonutChart
            data={workingFormatData}
            centerText="500"
            centerSubtext="DAYS"
          />
        </div>

        {/* Onboarding Tasks */}
        <div className="glass-card p-6">
          <TasksList tasks={tasks} progress={98} />
        </div>
      </div>

      {/* Calendar Timeline */}
      <div className="glass-card p-6">
        <h3 className="font-medium text-foreground mb-4">Schedule</h3>
        <Timeline events={timelineEvents} />
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricTile value="500" label="Days in company" />
        <MetricTile value="38" label="Completed projects" />
        <MetricTile value="8" label="In progress" />
        <MetricTile value="$6,110" label="Salary" />
      </div>

      {/* Personal Data Card */}
      <div className="glass-card p-6">
        <h3 className="font-medium text-foreground mb-4">Personal data</h3>
        <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center">
          <img 
            src="/api/placeholder/400/192" 
            alt="Personal data visualization" 
            className="w-full h-full object-cover rounded-lg"
          />
        </div>
      </div>
    </div>
  );
}