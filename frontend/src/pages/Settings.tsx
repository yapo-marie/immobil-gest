import { User, Bell, CreditCard, Shield, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Settings() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your account and preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile" className="gap-2">
            <User size={16} />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell size={16} />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-2">
            <CreditCard size={16} />
            Billing
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield size={16} />
            Security
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" defaultValue="Jean" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" defaultValue="Propriétaire" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" defaultValue="jean@locatus.fr" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" type="tel" defaultValue="+33 6 12 34 56 78" />
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>Details about your property management company</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company">Company Name</Label>
                <Input id="company" defaultValue="LOCATUS Properties" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="siret">SIRET Number</Label>
                <Input id="siret" defaultValue="123 456 789 00012" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" defaultValue="15 Rue de la Paix, 75002 Paris" />
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>Configure when you receive email alerts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { id: "payment", label: "Payment received", description: "Get notified when a tenant pays rent" },
                { id: "late", label: "Late payments", description: "Alert when rent is overdue" },
                { id: "maintenance", label: "Maintenance requests", description: "New maintenance requests from tenants" },
                { id: "lease", label: "Lease expiring", description: "Reminder before leases expire" },
              ].map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Push Notifications</CardTitle>
              <CardDescription>Real-time alerts in the app</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { id: "push-payment", label: "Payment updates", description: "Real-time payment notifications" },
                { id: "push-urgent", label: "Urgent maintenance", description: "High-priority maintenance alerts" },
              ].map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Stripe Integration</CardTitle>
              <CardDescription>Connect your Stripe account for payment processing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <CreditCard size={20} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Stripe Connected</p>
                    <p className="text-sm text-muted-foreground">Account: acct_1234567890</p>
                  </div>
                </div>
              </div>
              <Button variant="outline">Manage Stripe Account</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Methods</CardTitle>
              <CardDescription>Accepted payment methods for rent collection</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { id: "card", label: "Credit/Debit Card", description: "Accept card payments via Stripe" },
                { id: "sepa", label: "SEPA Direct Debit", description: "Bank transfers for EU tenants" },
                { id: "offline", label: "Offline payments", description: "Manual entry for cash/check payments" },
              ].map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                  <Switch defaultChecked={item.id !== "sepa"} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Update your account password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input id="currentPassword" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input id="newPassword" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input id="confirmPassword" type="password" />
              </div>
              <Button>Update Password</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Two-Factor Authentication</CardTitle>
              <CardDescription>Add an extra layer of security to your account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Enable 2FA</p>
                  <p className="text-sm text-muted-foreground">Use an authenticator app for additional security</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
