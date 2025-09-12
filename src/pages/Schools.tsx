import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ExternalLink, MapPin, Building } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface School {
  id: string;
  name: string;
  type?: string;
  city?: string;
  country?: string;
  website?: string;
  phases?: string[];
  subjects?: string[];
  _count?: {
    vacancies: number;
    contacts: number;
  };
}

export default function Schools() {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    try {
      const { data, error } = await supabase
        .from("schools")
        .select(`
          *,
          vacancies(count),
          contacts(count)
        `)
        .order("name");

      if (error) throw error;
      
      // Transform the data to include counts
      const schoolsWithCounts = data?.map(school => ({
        ...school,
        _count: {
          vacancies: school.vacancies?.length || 0,
          contacts: school.contacts?.length || 0,
        }
      })) || [];
      
      setSchools(schoolsWithCounts);
    } catch (error) {
      console.error("Error fetching schools:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSchools = schools.filter((school) =>
    school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    school.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    school.country?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading schools...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Schools</h1>
        <Button>Add School</Button>
      </div>

      {/* Search */}
      <div className="glass-card p-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search schools by name, city, or country..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Schools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSchools.map((school) => (
          <div key={school.id} className="glass-card p-6 hover:shadow-lg transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-foreground mb-1 truncate">{school.name}</h3>
                {school.type && (
                  <Badge variant="secondary" className="mb-2">{school.type}</Badge>
                )}
              </div>
              {school.website && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(school.website, "_blank")}
                  className="ml-2"
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              )}
            </div>

            {(school.city || school.country) && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                <MapPin className="w-4 h-4" />
                <span>{[school.city, school.country].filter(Boolean).join(", ")}</span>
              </div>
            )}

            {school.phases && school.phases.length > 0 && (
              <div className="mb-3">
                <div className="text-xs text-muted-foreground mb-1">Phases</div>
                <div className="flex flex-wrap gap-1">
                  {school.phases.slice(0, 3).map((phase, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {phase}
                    </Badge>
                  ))}
                  {school.phases.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{school.phases.length - 3}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {school.subjects && school.subjects.length > 0 && (
              <div className="mb-4">
                <div className="text-xs text-muted-foreground mb-1">Subjects</div>
                <div className="flex flex-wrap gap-1">
                  {school.subjects.slice(0, 2).map((subject, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {subject}
                    </Badge>
                  ))}
                  {school.subjects.length > 2 && (
                    <Badge variant="outline" className="text-xs">
                      +{school.subjects.length - 2}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
              <span>{school._count?.vacancies || 0} vacancies</span>
              <span>{school._count?.contacts || 0} contacts</span>
            </div>

            <Link to={`/schools/${school.id}`}>
              <Button variant="outline" className="w-full">
                View Details
              </Button>
            </Link>
          </div>
        ))}
      </div>

      {filteredSchools.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No schools found matching your criteria.
        </div>
      )}
    </div>
  );
}