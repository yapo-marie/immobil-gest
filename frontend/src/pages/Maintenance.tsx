import { Plus, Search, Wrench, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const mockRequests = [
  {
    id: "1",
    title: "Plumbing leak in bathroom",
    description: "Water leaking from under the sink. Needs urgent attention.",
    property: "Apt 12B - Paris",
    tenant: "Marie Dupont",
    type: "plumbing",
    priority: "high",
    status: "pending",
    createdAt: "2023-12-01",
  },
  {
    id: "2",
    title: "Heating not working",
    description: "Central heating system not turning on. Very cold in the apartment.",
    property: "Studio 3A - Paris",
    tenant: "Pierre Martin",
    type: "heating",
    priority: "high",
    status: "in_progress",
    createdAt: "2023-11-28",
  },
  {
    id: "3",
    title: "Broken window lock",
    description: "Lock on bedroom window is broken and won't close properly.",
    property: "House 7 - Lyon",
    tenant: "Sophie Bernard",
    type: "general",
    priority: "medium",
    status: "pending",
    createdAt: "2023-11-25",
  },
  {
    id: "4",
    title: "Dishwasher not draining",
    description: "Dishwasher fills with water but doesn't drain after cycle.",
    property: "Apt 4C - Nice",
    tenant: "Jean Moreau",
    type: "appliance",
    priority: "low",
    status: "resolved",
    createdAt: "2023-11-20",
  },
  {
    id: "5",
    title: "Electrical outlet sparking",
    description: "Outlet in living room sparks when plugging in devices. Safety hazard.",
    property: "Apt 12B - Paris",
    tenant: "Marie Dupont",
    type: "electrical",
    priority: "high",
    status: "in_progress",
    createdAt: "2023-11-15",
  },
];

const statusConfig = {
  pending: { label: "Pending", className: "badge-warning", icon: Clock },
  in_progress: { label: "In Progress", className: "badge-info", icon: Wrench },
  resolved: { label: "Resolved", className: "badge-success", icon: CheckCircle2 },
};

const priorityConfig = {
  high: { label: "High", className: "text-destructive" },
  medium: { label: "Medium", className: "text-warning" },
  low: { label: "Low", className: "text-muted-foreground" },
};

const typeConfig = {
  plumbing: "Plumbing",
  heating: "Heating/AC",
  electrical: "Electrical",
  appliance: "Appliance",
  general: "General",
};

export default function Maintenance() {
  const pendingCount = mockRequests.filter(r => r.status === "pending").length;
  const inProgressCount = mockRequests.filter(r => r.status === "in_progress").length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title">Maintenance</h1>
          <p className="page-subtitle">Track and manage maintenance requests</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-warning/5 border-warning/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-warning/10">
                <Clock size={24} className="text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-semibold text-warning">{pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-info/5 border-info/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-info/10">
                <Wrench size={24} className="text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-semibold text-info">{inProgressCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-destructive/5 border-destructive/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-destructive/10">
                <AlertTriangle size={24} className="text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">High Priority</p>
                <p className="text-2xl font-semibold text-destructive">
                  {mockRequests.filter(r => r.priority === "high" && r.status !== "resolved").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input placeholder="Search requests..." className="pl-10" />
        </div>
        <Select defaultValue="all">
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
        <Select defaultValue="all">
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {mockRequests.map((request, index) => {
          const StatusIcon = statusConfig[request.status].icon;
          return (
            <Card 
              key={request.id}
              className="animate-slide-up hover:shadow-card-hover transition-all duration-300"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "p-2 rounded-lg",
                        request.status === "pending" && "bg-warning/10",
                        request.status === "in_progress" && "bg-info/10",
                        request.status === "resolved" && "bg-success/10"
                      )}>
                        <StatusIcon size={20} className={cn(
                          request.status === "pending" && "text-warning",
                          request.status === "in_progress" && "text-info",
                          request.status === "resolved" && "text-success"
                        )} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground">{request.title}</h3>
                          <span className={cn("text-xs font-medium", priorityConfig[request.priority].className)}>
                            {priorityConfig[request.priority].label} Priority
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{request.description}</p>
                        <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
                          <span>📍 {request.property}</span>
                          <span>👤 {request.tenant}</span>
                          <span>🏷️ {typeConfig[request.type]}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={statusConfig[request.status].className}>
                      {statusConfig[request.status].label}
                    </span>
                    {request.status !== "resolved" && (
                      <Button size="sm" variant="outline">
                        Update
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
