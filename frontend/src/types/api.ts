export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  role: string;
  is_active: boolean;
}

export type PropertyStatus = "disponible" | "occupé" | "en maintenance" | "fermé";
export type PropertyType = "appartement" | "villa" | "studio" | "commercial";

export interface Property {
  id: number;
  owner_id: number;
  title: string;
  description?: string | null;
  property_type: PropertyType;
  address: string;
  city: string;
  postal_code?: string | null;
  surface_area?: number | null;
  rooms?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  rent_amount: number;
  charges?: number | null;
  deposit?: number | null;
  application_fee?: number | null;
  status: PropertyStatus;
  available_date?: string | null;
  images?: string[] | null;
  amenities?: string[] | null;
  created_at: string;
  updated_at?: string | null;
}

export interface Tenant {
  id: number;
  user_id: number;
  date_of_birth?: string | null;
  identity_documents?: string[] | null;
  income_proof?: string[] | null;
  employment_info?: string | null;
  references?: Record<string, unknown>[] | null;
  notes?: string | null;
  user?: User;
}

export type LeaseStatus = "active" | "terminated" | "expired";

export interface Lease {
  id: number;
  property_id: number;
  tenant_id: number;
  start_date: string;
  end_date?: string | null;
  rent_amount: number;
  charges?: number | null;
  deposit_paid?: number | null;
  payment_day?: number | null;
  status: LeaseStatus;
  special_conditions?: string | null;
  contract_url?: string | null;
  created_at: string;
  actual_end_date?: string | null;
}

export type PaymentStatus = "pending" | "paid" | "late" | "partial";
export type PaymentMethod = "stripe" | "paypal" | "bank_transfer" | "cash" | "check" | null;

export interface Payment {
  id: number;
  lease_id: number;
  amount: number;
  due_date: string;
  payment_date?: string | null;
  status: PaymentStatus;
  payment_method?: PaymentMethod;
  transaction_reference?: string | null;
  receipt_url?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export type MaintenanceStatus = "pending" | "in_progress" | "resolved" | "rejected";
export type MaintenancePriority = "low" | "medium" | "high" | "urgent";
export type MaintenanceType = "plumbing" | "electrical" | "heating" | "appliance" | "other";

export interface MaintenanceRequest {
  id: number;
  property_id: number;
  tenant_id: number;
  type: MaintenanceType;
  description: string;
  status: MaintenanceStatus;
  priority: MaintenancePriority;
  images?: string[] | null;
  resolution_notes?: string | null;
  created_at: string;
  resolved_at?: string | null;
}

export type NotificationType =
  | "payment_confirmation"
  | "payment_reminder"
  | "payment_late"
  | "lease_expiring"
  | "maintenance_update"
  | "general";

export interface Notification {
  id: number;
  user_id: number;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}
