import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Download, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Vacancy {
  id: string;
  title: string;
  school_id: string;
  school?: {
    name: string;
    city: string;
  };
  salary_min?: number;
  salary_max?: number;
  date_posted?: string;
  status: string;
  apply_url?: string;
  description?: string;
  raw_json?: any;
}

const statusColors = {
  new: "bg-blue-100 text-blue-800",
  applied: "bg-yellow-100 text-yellow-800", 
  interview: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  offer: "bg-purple-100 text-purple-800",
};

export default function Vacancies() {
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedVacancy, setSelectedVacancy] = useState<Vacancy | null>(null);

  useEffect(() => {
    fetchVacancies();
  }, []);

  const fetchVacancies = async () => {
    try {
      const { data, error } = await supabase
        .from("vacancies")
        .select(`
          *,
          school:schools(name, city)
        `)
        .order("date_posted", { ascending: false });

      if (error) throw error;
      setVacancies(data || []);
    } catch (error) {
      console.error("Error fetching vacancies:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredVacancies = vacancies.filter((vacancy) => {
    const matchesSearch = vacancy.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vacancy.school?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || vacancy.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatSalary = (min?: number, max?: number) => {
    if (!min && !max) return "Not specified";
    if (min && max) return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
    if (min) return `$${min.toLocaleString()}+`;
    return `Up to $${max?.toLocaleString()}`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Unknown";
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading vacancies...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Vacancies</h1>
        <Button variant="outline" className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="flex gap-4 items-center">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search vacancies or schools..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="applied">Applied</SelectItem>
              <SelectItem value="interview">Interview</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="offer">Offer</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            More Filters
          </Button>
        </div>
      </div>

      {/* Vacancies Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="text-left p-4 font-medium text-foreground">Position</th>
                <th className="text-left p-4 font-medium text-foreground">School</th>
                <th className="text-left p-4 font-medium text-foreground">Location</th>
                <th className="text-left p-4 font-medium text-foreground">Posted</th>
                <th className="text-left p-4 font-medium text-foreground">Salary</th>
                <th className="text-left p-4 font-medium text-foreground">Status</th>
                <th className="text-left p-4 font-medium text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVacancies.map((vacancy) => (
                <tr
                  key={vacancy.id}
                  className="border-b border-border hover:bg-muted/30 cursor-pointer"
                  onClick={() => setSelectedVacancy(vacancy)}
                >
                  <td className="p-4">
                    <div className="font-medium text-foreground">{vacancy.title}</div>
                  </td>
                  <td className="p-4 text-foreground">{vacancy.school?.name || "Unknown"}</td>
                  <td className="p-4 text-muted-foreground">{vacancy.school?.city || "Unknown"}</td>
                  <td className="p-4 text-muted-foreground">{formatDate(vacancy.date_posted)}</td>
                  <td className="p-4 text-foreground">{formatSalary(vacancy.salary_min, vacancy.salary_max)}</td>
                  <td className="p-4">
                    <Badge 
                      variant="secondary" 
                      className={statusColors[vacancy.status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"}
                    >
                      {vacancy.status}
                    </Badge>
                  </td>
                  <td className="p-4">
                    {vacancy.apply_url && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(vacancy.apply_url, "_blank");
                        }}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vacancy Details Modal */}
      {selectedVacancy && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">{selectedVacancy.title}</h2>
                  <p className="text-muted-foreground">{selectedVacancy.school?.name}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedVacancy(null)}
                >
                  ✕
                </Button>
              </div>
              
              {selectedVacancy.description && (
                <div>
                  <h3 className="font-medium text-foreground mb-2">Description</h3>
                  <p className="text-muted-foreground text-sm whitespace-pre-wrap">
                    {selectedVacancy.description}
                  </p>
                </div>
              )}
              
              {selectedVacancy.raw_json && (
                <div>
                  <h3 className="font-medium text-foreground mb-2">Raw Data</h3>
                  <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                    {JSON.stringify(selectedVacancy.raw_json, null, 2)}
                  </pre>
                </div>
              )}
              
              <div className="flex gap-2 pt-4">
                {selectedVacancy.apply_url && (
                  <Button 
                    onClick={() => window.open(selectedVacancy.apply_url, "_blank")}
                    className="flex items-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Apply Now
                  </Button>
                )}
                <Button variant="outline" onClick={() => setSelectedVacancy(null)}>
                  Close
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {filteredVacancies.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No vacancies found matching your criteria.
        </div>
      )}
    </div>
  );
}