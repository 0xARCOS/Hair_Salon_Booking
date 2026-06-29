export type UserRole = "client" | "staff";
export type AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled";

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  phone: string | null;
  created_at: string;
}

export interface Service {
  id: string;
  name: string;
  price: number;
  duration_mins: number;
  is_multi_session: boolean;
}

export interface Appointment {
  id: string;
  client_id: string;
  service_id: string;
  start_time: string;
  status: AppointmentStatus;
  gcal_event_id: string | null;
  created_at: string;
  services?: Pick<Service, "name" | "price" | "duration_mins"> | null;
  profiles?: Pick<Profile, "full_name" | "phone"> | null;
}

export interface ClientCRM {
  id: string;
  client_id: string;
  total_spent: number;
  active_treatment_phase: string | null;
  internal_notes: string | null;
  updated_at: string;
}
