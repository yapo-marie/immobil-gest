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
