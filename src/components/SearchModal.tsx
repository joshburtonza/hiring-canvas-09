import { useState } from "react";
import { Search, Calendar, MapPin, DollarSign, Building, Filter } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface SearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SearchParams {
  keywords: string;
  location: string;
  radius: number;
  contractType: string;
  dateRange: string;
  salaryMin: number;
  salaryMax: number;
  category: string;
}

export function SearchModal({ open, onOpenChange }: SearchModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchParams, setSearchParams] = useState<SearchParams>({
    keywords: "",
    location: "",
    radius: 10,
    contractType: "any",
    dateRange: "7",
    salaryMin: 20000,
    salaryMax: 80000,
    category: "any",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchParams.keywords.trim()) {
      toast({
        title: "Keywords required",
        description: "Please enter search keywords to continue.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('search-trigger', {
        body: {
          keywords: searchParams.keywords,
          location: searchParams.location,
          radius: searchParams.radius,
          contractType: searchParams.contractType,
          dateRange: searchParams.dateRange,
          salaryMin: searchParams.salaryMin,
          salaryMax: searchParams.salaryMax,
          category: searchParams.category,
          timestamp: new Date().toISOString(),
        }
      });

      if (error) throw error;

      toast({
        title: "Search submitted successfully!",
        description: "Your search has been sent to n8n workflow. Results will appear in the dashboard shortly.",
      });

      // Reset form and close modal
      setSearchParams({
        keywords: "",
        location: "",
        radius: 10,
        contractType: "any",
        dateRange: "7",
        salaryMin: 20000,
        salaryMax: 80000,
        category: "any",
      });
      onOpenChange(false);

    } catch (error) {
      console.error('Search submission error:', error);
      toast({
        title: "Search failed",
        description: "There was an error submitting your search. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="modal-content max-w-2xl max-h-[90vh] overflow-y-auto glass-card border-[hsl(var(--line))] 
        shadow-2xl backdrop-blur-lg will-change-transform">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Search className="w-5 h-5 text-primary" />
            Search Adzuna Jobs
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Keywords */}
          <div className="space-y-2">
            <Label htmlFor="keywords" className="text-sm font-medium">
              Keywords *
            </Label>
            <Input
              id="keywords"
              placeholder="e.g. Math Teacher, Head of Department, Science..."
              value={searchParams.keywords}
              onChange={(e) => setSearchParams(prev => ({ ...prev, keywords: e.target.value }))}
            className="bg-background/50 border-[hsl(var(--line))] smooth-transition focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location" className="text-sm font-medium flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Location
            </Label>
            <Input
              id="location"
              placeholder="e.g. London, Manchester, Birmingham..."
              value={searchParams.location}
              onChange={(e) => setSearchParams(prev => ({ ...prev, location: e.target.value }))}
            className="bg-background/50 border-[hsl(var(--line))] smooth-transition focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Quick Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Posted Within
              </Label>
              <Select 
                value={searchParams.dateRange} 
                onValueChange={(value) => setSearchParams(prev => ({ ...prev, dateRange: value }))}
              >
                <SelectTrigger className="bg-background/50 border-[hsl(var(--line))]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Last 24 hours</SelectItem>
                  <SelectItem value="7">Last week</SelectItem>
                  <SelectItem value="30">Last month</SelectItem>
                  <SelectItem value="90">Last 3 months</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Building className="w-4 h-4" />
                Contract Type
              </Label>
              <Select 
                value={searchParams.contractType} 
                onValueChange={(value) => setSearchParams(prev => ({ ...prev, contractType: value }))}
              >
                <SelectTrigger className="bg-background/50 border-[hsl(var(--line))]">
                  <SelectValue placeholder="Any contract type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any contract type</SelectItem>
                  <SelectItem value="permanent">Permanent</SelectItem>
                  <SelectItem value="temporary">Temporary</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="part_time">Part Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Advanced Filters */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button 
                type="button" 
                variant="outline" 
                className="w-full justify-center gap-2 bg-background/50 border-[hsl(var(--line))] smooth-transition hover-lift"
              >
                <Filter className="w-4 h-4" />
                {showAdvanced ? "Hide" : "Show"} Advanced Filters
              </Button>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="space-y-4 pt-4">
              {/* Job Category */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Job Category</Label>
                <Select 
                  value={searchParams.category} 
                  onValueChange={(value) => setSearchParams(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger className="bg-background/50 border-[hsl(var(--line))]">
                    <SelectValue placeholder="Any category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any category</SelectItem>
                    <SelectItem value="teaching">Teaching Positions</SelectItem>
                    <SelectItem value="leadership">Leadership & Management</SelectItem>
                    <SelectItem value="support">Support Staff</SelectItem>
                    <SelectItem value="admin">Administration</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Salary Range */}
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Salary Range (£{searchParams.salaryMin.toLocaleString()} - £{searchParams.salaryMax.toLocaleString()})
                </Label>
                <div className="px-2">
                  <Slider
                    value={[searchParams.salaryMin, searchParams.salaryMax]}
                    onValueChange={([min, max]) => 
                      setSearchParams(prev => ({ ...prev, salaryMin: min, salaryMax: max }))
                    }
                    min={15000}
                    max={100000}
                    step={1000}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Search Radius */}
              {searchParams.location && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">
                    Search Radius ({searchParams.radius} miles)
                  </Label>
                  <div className="px-2">
                    <Slider
                      value={[searchParams.radius]}
                      onValueChange={([radius]) => 
                        setSearchParams(prev => ({ ...prev, radius }))
                      }
                      min={5}
                      max={50}
                      step={5}
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 bg-background/50 border-[hsl(var(--line))] smooth-transition hover-lift"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !searchParams.keywords.trim()}
              className="flex-1 smooth-transition hover-lift"
            >
              {isSubmitting ? "Submitting..." : "Search Jobs"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}