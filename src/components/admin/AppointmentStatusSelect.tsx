"use client";

import { useTransition } from "react";
import { updateAppointmentStatus } from "@/actions/booking";
import type { AppointmentStatus } from "@/types/database";

const OPTIONS: { value: AppointmentStatus; label: string }[] = [
  { value: "pending", label: "Pendiente" },
  { value: "confirmed", label: "Confirmada" },
  { value: "completed", label: "Completada" },
  { value: "cancelled", label: "Cancelada" },
];

export function AppointmentStatusSelect({
  appointmentId,
  currentStatus,
}: {
  appointmentId: string;
  currentStatus: AppointmentStatus;
}) {
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value as AppointmentStatus;
    startTransition(async () => {
      await updateAppointmentStatus(appointmentId, newStatus);
    });
  }

  return (
    <select
      defaultValue={currentStatus}
      onChange={handleChange}
      disabled={isPending}
      className="text-xs border border-border rounded-lg px-2 py-1.5 bg-secondary text-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 cursor-pointer"
    >
      {OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
