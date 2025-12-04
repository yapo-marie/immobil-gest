import { useState } from "react";
import { Search, Download, Filter, CreditCard, Euro, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const mockPayments = [
  {
    id: "1",
    tenant: "Marie Dupont",
    property: "Apt 12B - Paris",
    amount: 1350,
    dueDate: "2023-12-05",
    paidDate: "2023-12-03",
    method: "stripe",
    status: "paid",
  },
  {
    id: "2",
    tenant: "Pierre Martin",
    property: "Studio 3A - Paris",
    amount: 930,
    dueDate: "2023-12-05",
    paidDate: null,
    method: null,
    status: "pending",
  },
  {
    id: "3",
    tenant: "Sophie Bernard",
    property: "House 7 - Lyon",
    amount: 2000,
    dueDate: "2023-12-01",
    paidDate: null,
    method: null,
    status: "late",
  },
  {
    id: "4",
    tenant: "Jean Moreau",
    property: "Apt 4C - Nice",
    amount: 1050,
    dueDate: "2023-12-10",
    paidDate: null,
    method: null,
    status: "pending",
  },
  {
    id: "5",
    tenant: "Marie Dupont",
    property: "Apt 12B - Paris",
    amount: 1350,
    dueDate: "2023-11-05",
    paidDate: "2023-11-05",
    method: "stripe",
    status: "paid",
  },
  {
    id: "6",
    tenant: "Pierre Martin",
    property: "Studio 3A - Paris",
    amount: 930,
    dueDate: "2023-11-05",
    paidDate: "2023-11-07",
    method: "offline",
    status: "paid",
  },
];

const statusConfig = {
  paid: { label: "Paid", className: "badge-success", icon: CheckCircle2 },
  pending: { label: "Pending", className: "badge-info", icon: Clock },
  late: { label: "Late", className: "badge-destructive", icon: Clock },
};

const methodConfig = {
  stripe: { label: "Card", icon: CreditCard },
  offline: { label: "Offline", icon: Euro },
};

export default function Payments() {
  const [statusFilter, setStatusFilter] = useState("all");

  const totalCollected = mockPayments
    .filter(p => p.status === "paid")
    .reduce((sum, p) => sum + p.amount, 0);
  
  const totalPending = mockPayments
    .filter(p => p.status === "pending")
    .reduce((sum, p) => sum + p.amount, 0);
  
  const totalLate = mockPayments
    .filter(p => p.status === "late")
    .reduce((sum, p) => sum + p.amount, 0);

  const filteredPayments = statusFilter === "all"
    ? mockPayments
    : mockPayments.filter(p => p.status === statusFilter);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title">Payments</h1>
          <p className="page-subtitle">Track rent payments and schedules</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download size={18} />
          Export
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-success/5 border-success/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-success/10">
                <CheckCircle2 size={24} className="text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Collected (This Month)</p>
                <p className="text-2xl font-semibold text-success">€{totalCollected.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-info/5 border-info/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-info/10">
                <Clock size={24} className="text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-semibold text-info">€{totalPending.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-destructive/5 border-destructive/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-destructive/10">
                <Clock size={24} className="text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-2xl font-semibold text-destructive">€{totalLate.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input placeholder="Search by tenant or property..." className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="late">Late</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Payments Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Paid Date</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.map((payment) => {
                const StatusIcon = statusConfig[payment.status].icon;
                return (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">{payment.tenant}</TableCell>
                    <TableCell>{payment.property}</TableCell>
                    <TableCell className="font-semibold">€{payment.amount.toLocaleString()}</TableCell>
                    <TableCell>{new Date(payment.dueDate).toLocaleDateString('fr-FR')}</TableCell>
                    <TableCell>
                      {payment.paidDate 
                        ? new Date(payment.paidDate).toLocaleDateString('fr-FR')
                        : <span className="text-muted-foreground">—</span>
                      }
                    </TableCell>
                    <TableCell>
                      {payment.method ? (
                        <div className="flex items-center gap-2 text-sm">
                          {payment.method === "stripe" ? (
                            <CreditCard size={14} className="text-muted-foreground" />
                          ) : (
                            <Euro size={14} className="text-muted-foreground" />
                          )}
                          <span>{payment.method === "stripe" ? "Card" : "Offline"}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={statusConfig[payment.status].className}>
                        {statusConfig[payment.status].label}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
