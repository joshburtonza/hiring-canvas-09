import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Save, Key, User, Building, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeys, setApiKeys] = useState({
    n8n: "••••••••••••••••",
    apollo: "••••••••••••••••",
    instantly: "••••••••••••••••",
  });
  
  const [profile, setProfile] = useState({
    name: "Olivia Johnson",
    email: "olivia@company.com",
    role: "Senior Designer",
  });

  const [organization, setOrganization] = useState({
    name: "Education Recruitment Co",
    domain: "company.com",
    timezone: "UTC",
  });

  const { toast } = useToast();

  const handleSaveProfile = () => {
    toast({
      title: "Profile updated",
      description: "Your profile information has been saved successfully.",
    });
  };

  const handleSaveOrganization = () => {
    toast({
      title: "Organization updated", 
      description: "Your organization settings have been saved successfully.",
    });
  };

  const handleRegenerateApiKey = (service: string) => {
    const newKey = `sk_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    setApiKeys(prev => ({ ...prev, [service]: newKey }));
    toast({
      title: "API Key regenerated",
      description: `New ${service} API key has been generated.`,
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage your account and organization settings</p>
      </div>

      {/* Profile Settings */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary/10 rounded-lg">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-medium text-foreground">Profile</h2>
            <p className="text-sm text-muted-foreground">Update your personal information</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={profile.name}
              onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={profile.email}
              onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Input
              id="role"
              value={profile.role}
              onChange={(e) => setProfile(prev => ({ ...prev, role: e.target.value }))}
            />
          </div>
        </div>

        <Button onClick={handleSaveProfile} className="flex items-center gap-2">
          <Save className="w-4 h-4" />
          Save Profile
        </Button>
      </Card>

      {/* Organization Settings */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-accent/10 rounded-lg">
            <Building className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="text-lg font-medium text-foreground">Organization</h2>
            <p className="text-sm text-muted-foreground">Manage your organization settings</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="space-y-2">
            <Label htmlFor="orgName">Organization Name</Label>
            <Input
              id="orgName"
              value={organization.name}
              onChange={(e) => setOrganization(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="domain">Domain</Label>
            <Input
              id="domain"
              value={organization.domain}
              onChange={(e) => setOrganization(prev => ({ ...prev, domain: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Input
              id="timezone"
              value={organization.timezone}
              onChange={(e) => setOrganization(prev => ({ ...prev, timezone: e.target.value }))}
            />
          </div>
        </div>

        <Button onClick={handleSaveOrganization} className="flex items-center gap-2">
          <Save className="w-4 h-4" />
          Save Organization
        </Button>
      </Card>

      {/* API Keys */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-secondary/50 rounded-lg">
            <Key className="w-5 h-5 text-secondary-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-medium text-foreground">API Keys</h2>
            <p className="text-sm text-muted-foreground">Manage your integration API keys</p>
          </div>
        </div>

        <div className="space-y-4">
          {Object.entries(apiKeys).map(([service, key]) => (
            <div key={service} className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div className="flex items-center gap-3">
                <div>
                  <div className="font-medium text-foreground capitalize">{service}</div>
                  <div className="text-sm text-muted-foreground">
                    API key for {service} integration
                  </div>
                </div>
                <Badge variant="secondary">
                  {service === 'n8n' ? 'Automation' : service === 'apollo' ? 'Data' : 'Outreach'}
                </Badge>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="font-mono text-sm bg-muted px-3 py-1 rounded">
                  {showApiKey ? key : "••••••••••••••••"}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRegenerateApiKey(service)}
                >
                  Regenerate
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Danger Zone */}
      <Card className="p-6 border-destructive/20">
        <div className="mb-4">
          <h2 className="text-lg font-medium text-destructive">Danger Zone</h2>
          <p className="text-sm text-muted-foreground">Irreversible and destructive actions</p>
        </div>
        
        <Separator className="my-4" />
        
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-foreground">Delete Organization</div>
            <div className="text-sm text-muted-foreground">
              Permanently delete your organization and all associated data
            </div>
          </div>
          <Button variant="destructive">Delete Organization</Button>
        </div>
      </Card>
    </div>
  );
}