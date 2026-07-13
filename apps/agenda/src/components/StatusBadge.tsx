import type { AppointmentStatus } from "@salon-app/supabase";
import { STATUS_META } from "@/lib/status";

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const meta = STATUS_META[status];
  return <span className={`status-chip ${meta.chipClass}`}>{meta.label}</span>;
}
