import { Search, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function TopBar() {
  return (
    <header className="h-16 bg-transparent border-b border-border px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-medium text-foreground">Hello Olivia</h2>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search..."
            className="pl-10 w-64 bg-card/50 backdrop-blur-sm border-border"
          />
        </div>
        
        <Button variant="ghost" size="sm" className="flex items-center gap-2">
          <Settings className="w-4 h-4" />
          Settings
        </Button>
      </div>
    </header>
  );
}