import { useEffect, useState } from "react";
import { DonutChart } from "@/components/DonutChart";
import { MetricTile } from "@/components/MetricTile";
import { TasksList } from "@/components/TasksList";
import { Timeline } from "@/components/Timeline";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface DashboardStats {
  newVacancies: number;
  activeSchools: number;
  verifiedContacts: number;
  totalVacancies: number;
}

interface StatusDistribution {
  label: string;
  value: number;
  color: string;
}

interface RecentActivity {
  id: string;
  time: string;
  title: string;
  type: "vacancy" | "contact" | "engagement";
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    newVacancies: 0,
    activeSchools: 0,
    verifiedContacts: 0,
    totalVacancies: 0,
  });
  const [statusData, setStatusData] = useState<StatusDistribution[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch vacancy stats
      const { data: vacancies } = await supabase
        .from('vacancies')
        .select('status, created_at');

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const newVacancies = vacancies?.filter(v => 
        new Date(v.created_at) >= today
      ).length || 0;

      // Fetch active schools (schools with vacancies in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: activeSchoolsData } = await supabase
        .from('vacancies')
        .select('school_id')
        .gte('created_at', thirtyDaysAgo.toISOString());

      const uniqueSchools = new Set(activeSchoolsData?.map(v => v.school_id) || []);
      const activeSchools = uniqueSchools.size;

      // Fetch verified contacts
      const { data: contacts } = await supabase
        .from('contacts')
        .select('email')
        .not('email', 'is', null);

      const verifiedContacts = contacts?.length || 0;

      // Status distribution for donut chart
      const statusCounts = vacancies?.reduce((acc, vacancy) => {
        const status = vacancy.status || 'new';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const statusDistribution: StatusDistribution[] = [
        { label: "New", value: statusCounts.new || 0, color: "hsl(var(--gradient-5))" },
        { label: "Contacted", value: statusCounts.contacted || 0, color: "hsl(var(--gradient-3))" },
        { label: "In Progress", value: statusCounts.in_progress || 0, color: "hsl(var(--gradient-2))" },
        { label: "Closed", value: statusCounts.closed || 0, color: "hsl(var(--gradient-4))" },
      ].filter(item => item.value > 0);

      // Recent activities
      const { data: recentVacancies } = await supabase
        .from('vacancies')
        .select('id, title, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      const activities: RecentActivity[] = recentVacancies?.map(v => ({
        id: v.id,
        time: new Date(v.created_at).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        }),
        title: `New vacancy: ${v.title}`,
        type: "vacancy" as const,
      })) || [];

      setStats({
        newVacancies,
        activeSchools,
        verifiedContacts,
        totalVacancies: vacancies?.length || 0,
      });
      setStatusData(statusDistribution);
      setRecentActivities(activities);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="glass-card p-6 animate-pulse">
              <div className="h-8 bg-muted rounded mb-2"></div>
              <div className="h-4 bg-muted rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricTile 
          value={stats.newVacancies} 
          label="New Vacancies Today" 
          variant={1}
        />
        <MetricTile 
          value={stats.activeSchools} 
          label="Active Schools" 
          variant={2}
        />
        <MetricTile 
          value={stats.verifiedContacts} 
          label="Verified Contacts" 
          variant={3}
        />
        <MetricTile 
          value={stats.totalVacancies} 
          label="Total Vacancies" 
          variant={4}
        />
      </div>

      {/* Status Overview & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="glass-card p-6">
          <h3 className="font-medium text-foreground mb-4">Vacancy Status Distribution</h3>
          {statusData.length > 0 ? (
            <DonutChart
              data={statusData}
              centerText={stats.totalVacancies.toString()}
              centerSubtext="TOTAL"
            />
          ) : (
            <div className="h-32 flex items-center justify-center text-muted-foreground">
              No vacancy data available
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="glass-card p-6">
          <h3 className="font-medium text-foreground mb-4">Recent Activity</h3>
          {recentActivities.length > 0 ? (
            <Timeline events={recentActivities.map(activity => ({
              id: activity.id,
              time: activity.time,
              title: activity.title,
              people: 1,
              avatars: [],
            }))} />
          ) : (
            <div className="text-center text-muted-foreground py-8">
              No recent activity
            </div>
          )}
        </div>
      </div>

      {/* Intake Status */}
      <div className="glass-card p-6">
        <h3 className="font-medium text-foreground mb-4">Intake Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-semibold text-foreground">
              {stats.totalVacancies}
            </div>
            <div className="text-sm text-muted-foreground">Total Processed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-semibold text-green-400">
              {stats.newVacancies}
            </div>
            <div className="text-sm text-muted-foreground">Today</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-semibold text-blue-400">
              {stats.activeSchools}
            </div>
            <div className="text-sm text-muted-foreground">Active Schools</div>
          </div>
        </div>
      </div>
    </div>
  );
}