import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Send, Phone, Mail, Linkedin, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Contact {
  id: string;
  full_name: string;
  role_title?: string;
  department?: string;
  email?: string;
  email_confidence: number;
  phone?: string;
  linkedin_url?: string;
  last_verified_at?: string;
  school?: {
    name: string;
  };
}

const getConfidenceColor = (confidence: number) => {
  if (confidence >= 90) return "bg-green-100 text-green-800";
  if (confidence >= 70) return "bg-yellow-100 text-yellow-800";
  if (confidence >= 50) return "bg-orange-100 text-orange-800";
  return "bg-red-100 text-red-800";
};

const getConfidenceLabel = (confidence: number) => {
  if (confidence >= 90) return "High";
  if (confidence >= 70) return "Medium";
  if (confidence >= 50) return "Low";
  return "Very Low";
};

export default function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from("contacts")
        .select(`
          *,
          school:schools(name)
        `)
        .order("full_name");

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error("Error fetching contacts:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredContacts = contacts.filter((contact) =>
    contact.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.role_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.school?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectContact = (contactId: string) => {
    setSelectedContacts(prev =>
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleSendToOutreach = async () => {
    if (selectedContacts.length === 0) {
      toast({
        title: "No contacts selected",
        description: "Please select contacts to send to outreach.",
        variant: "destructive",
      });
      return;
    }

    try {
      // This would typically call your outreach API
      toast({
        title: "Contacts sent to outreach",
        description: `${selectedContacts.length} contacts have been added to your outreach campaign.`,
      });
      setSelectedContacts([]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send contacts to outreach.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading contacts...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Contacts</h1>
        <div className="flex gap-2">
          {selectedContacts.length > 0 && (
            <Button 
              onClick={handleSendToOutreach}
              className="flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Send to Outreach ({selectedContacts.length})
            </Button>
          )}
          <Button>Add Contact</Button>
        </div>
      </div>

      {/* Search */}
      <div className="glass-card p-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search contacts by name, role, school, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Contacts Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="text-left p-4 font-medium text-foreground w-12">
                  <input
                    type="checkbox"
                    checked={selectedContacts.length === filteredContacts.length && filteredContacts.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedContacts(filteredContacts.map(c => c.id));
                      } else {
                        setSelectedContacts([]);
                      }
                    }}
                    className="rounded border-border"
                  />
                </th>
                <th className="text-left p-4 font-medium text-foreground">Name</th>
                <th className="text-left p-4 font-medium text-foreground">Role</th>
                <th className="text-left p-4 font-medium text-foreground">School</th>
                <th className="text-left p-4 font-medium text-foreground">Email</th>
                <th className="text-left p-4 font-medium text-foreground">Phone</th>
                <th className="text-left p-4 font-medium text-foreground">Last Verified</th>
                <th className="text-left p-4 font-medium text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredContacts.map((contact) => (
                <tr
                  key={contact.id}
                  className="border-b border-border hover:bg-muted/30"
                >
                  <td className="p-4">
                    <input
                      type="checkbox"
                      checked={selectedContacts.includes(contact.id)}
                      onChange={() => handleSelectContact(contact.id)}
                      className="rounded border-border"
                    />
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-foreground">{contact.full_name}</div>
                    {contact.department && (
                      <div className="text-sm text-muted-foreground">{contact.department}</div>
                    )}
                  </td>
                  <td className="p-4 text-foreground">{contact.role_title || "Unknown"}</td>
                  <td className="p-4 text-foreground">{contact.school?.name || "Unknown"}</td>
                  <td className="p-4">
                    {contact.email ? (
                      <div className="flex items-center gap-2">
                        <span className="text-foreground">{contact.email}</span>
                        <Badge 
                          variant="secondary"
                          className={getConfidenceColor(contact.email_confidence)}
                        >
                          {getConfidenceLabel(contact.email_confidence)} ({contact.email_confidence}%)
                        </Badge>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">No email</span>
                    )}
                  </td>
                  <td className="p-4 text-foreground">{contact.phone || "—"}</td>
                  <td className="p-4 text-muted-foreground">
                    {formatDate(contact.last_verified_at)}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      {contact.email && (
                        <Button variant="ghost" size="sm" title="Send email">
                          <Mail className="w-4 h-4" />
                        </Button>
                      )}
                      {contact.phone && (
                        <Button variant="ghost" size="sm" title="Call">
                          <Phone className="w-4 h-4" />
                        </Button>
                      )}
                      {contact.linkedin_url && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          title="LinkedIn"
                          onClick={() => window.open(contact.linkedin_url, "_blank")}
                        >
                          <Linkedin className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredContacts.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No contacts found matching your criteria.
        </div>
      )}
    </div>
  );
}