import type { AppointmentStatus } from "@salon-app/supabase";

export const STATUS_META: Record<
  AppointmentStatus,
  { label: string; chipClass: string }
> = {
  pending: {
    label: "Pendiente",
    chipClass: "text-status-pending bg-status-pending/10",
  },
  confirmed: {
    label: "Confirmada",
    chipClass: "text-status-confirmed bg-status-confirmed/10",
  },
  completed: {
    label: "Completada",
    chipClass: "text-status-completed bg-status-completed/10",
  },
  cancelled: {
    label: "Cancelada",
    chipClass: "text-status-cancelled bg-status-cancelled/10",
  },
};
