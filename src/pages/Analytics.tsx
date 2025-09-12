import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, TrendingUp, Users, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AnalyticsData {
  totalVacancies: number;
  totalSchools: number;
  totalContacts: number;
  vacanciesThisWeek: number;
  dailyVacancies: Array<{ date: string; count: number }>;
  statusBreakdown: Array<{ status: string; count: number }>;
}

export default function Analytics() {
  const [data, setData] = useState<AnalyticsData>({
    totalVacancies: 0,
    totalSchools: 0,
    totalContacts: 0,
    vacanciesThisWeek: 0,
    dailyVacancies: [],
    statusBreakdown: [],
  });
  const [timeRange, setTimeRange] = useState("7d");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      // Get basic counts
      const [vacanciesResult, schoolsResult, contactsResult] = await Promise.all([
        supabase.from("vacancies").select("*", { count: "exact", head: true }),
        supabase.from("schools").select("*", { count: "exact", head: true }),
        supabase.from("contacts").select("*", { count: "exact", head: true }),
      ]);

      // Get vacancies from this week
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const { count: weeklyCount } = await supabase
        .from("vacancies")
        .select("*", { count: "exact", head: true })
        .gte("date_posted", weekAgo.toISOString());

      // Get status breakdown
      const { data: statusData } = await supabase
        .from("vacancies")
        .select("status")
        .order("status");

      const statusBreakdown = statusData?.reduce((acc: any[], item) => {
        const existing = acc.find(s => s.status === item.status);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ status: item.status, count: 1 });
        }
        return acc;
      }, []) || [];

      // Generate mock daily data for chart
      const dailyVacancies = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return {
          date: date.toISOString().split('T')[0],
          count: Math.floor(Math.random() * 10) + 1
        };
      });

      setData({
        totalVacancies: vacanciesResult.count || 0,
        totalSchools: schoolsResult.count || 0,
        totalContacts: contactsResult.count || 0,
        vacanciesThisWeek: weeklyCount || 0,
        dailyVacancies,
        statusBreakdown,
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Analytics</h1>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 3 months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Calendar className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-semibold text-foreground">{data.totalVacancies}</div>
              <div className="text-sm text-muted-foreground">Total Vacancies</div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-accent/10 rounded-lg">
              <Building2 className="w-6 h-6 text-accent" />
            </div>
            <div>
              <div className="text-2xl font-semibold text-foreground">{data.totalSchools}</div>
              <div className="text-sm text-muted-foreground">Schools</div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-secondary/50 rounded-lg">
              <Users className="w-6 h-6 text-secondary-foreground" />
            </div>
            <div>
              <div className="text-2xl font-semibold text-foreground">{data.totalContacts}</div>
              <div className="text-sm text-muted-foreground">Contacts</div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-semibold text-foreground">{data.vacanciesThisWeek}</div>
              <div className="text-sm text-muted-foreground">This Week</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vacancies Timeline */}
        <Card className="p-6">
          <h3 className="font-medium text-foreground mb-4">Vacancies Per Day</h3>
          <div className="h-64 flex items-end justify-between gap-2">
            {data.dailyVacancies.map((day, index) => (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div 
                  className="w-full bg-primary rounded-t"
                  style={{ height: `${(day.count / Math.max(...data.dailyVacancies.map(d => d.count))) * 100}%` }}
                />
                <div className="text-xs text-muted-foreground mt-2">
                  {new Date(day.date).toLocaleDateString(undefined, { weekday: 'short' })}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Status Breakdown */}
        <Card className="p-6">
          <h3 className="font-medium text-foreground mb-4">Vacancy Status Breakdown</h3>
          <div className="space-y-3">
            {data.statusBreakdown.map((status, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: `hsl(${index * 60}, 60%, 60%)` }}
                  />
                  <span className="text-foreground capitalize">{status.status}</span>
                </div>
                <span className="font-medium text-foreground">{status.count}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Additional Charts Placeholder */}
      <Card className="p-6">
        <h3 className="font-medium text-foreground mb-4">Engagement Metrics</h3>
        <div className="h-48 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <div className="text-lg mb-2">Coming Soon</div>
            <div className="text-sm">Advanced engagement and conversion analytics</div>
          </div>
        </div>
      </Card>
    </div>
  );
}