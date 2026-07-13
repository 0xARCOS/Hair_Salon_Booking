export type AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled";

export interface Service {
  id: string;
  name: string;
  price: number;
  duration_mins: number;
  is_multi_session: boolean;
  created_at: string;
}

export interface Client {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  internal_notes: string | null;
  active_treatment_phase: string | null;
  total_spent: number;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  client_id: string;
  service_id: string | null;
  start_time: string;
  status: AppointmentStatus;
  notes: string | null;
  created_at: string;
  services?: Pick<Service, "name" | "price" | "duration_mins"> | null;
  clients?: Pick<Client, "full_name" | "phone"> | null;
}

export interface ClientFormulaEntry {
  id: string;
  fecha: string;
  titulo: string;
  detalle: string;
}

export interface ClientFicha {
  client_id: string;
  alergias: string;
  preferencias: string;
  notas: string;
  formulas: ClientFormulaEntry[];
  enc: string | null;
  updated_at: string;
  created_at: string;
}

export interface ClientFoto {
  id: string;
  client_id: string;
  storage_path: string;
  caption: string;
  enc: boolean;
  mime_type: string;
  created_at: string;
  deleted_at: string | null;
}
