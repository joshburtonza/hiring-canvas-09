import { useState } from "react";
import { NavLink } from "react-router-dom";
import { BarChart3, Building2, Calendar, Home, Settings, Users, Search } from "lucide-react";
import { SearchModal } from "./SearchModal";

const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Vacancies", href: "/vacancies", icon: Calendar },
  { name: "Schools", href: "/schools", icon: Building2 },
  { name: "Contacts", href: "/contacts", icon: Users },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  return (
    <>
      <div className="w-[260px] bg-sidebar-background border-r border-sidebar-border h-screen flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-semibold text-sidebar-foreground">Schools Hiring</h1>
        </div>
        
        <nav className="flex-1 px-4 space-y-2">
          {/* Search Button */}
          <button
            onClick={() => setIsSearchModalOpen(true)}
            className="sidebar-nav-item w-full text-left"
          >
            <Search className="w-5 h-5" />
            <span className="font-medium">Search</span>
          </button>

          {/* Regular Navigation Items */}
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              end={item.href === "/"}
              className={({ isActive }) =>
                `sidebar-nav-item ${isActive ? "active" : ""}`
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.name}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <SearchModal 
        open={isSearchModalOpen} 
        onClose={() => setIsSearchModalOpen(false)}
      />
    </>
  );
}