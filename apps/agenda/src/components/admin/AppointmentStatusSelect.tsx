"use client";

import { useState, useTransition } from "react";
import { updateAppointmentStatus } from "@/actions/booking";
import type { AppointmentStatus } from "@salon-app/supabase";
import { STATUS_META } from "@/lib/status";

export function AppointmentStatusSelect({
  appointmentId,
  currentStatus,
}: {
  appointmentId: string;
  currentStatus: AppointmentStatus;
}) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<AppointmentStatus>(currentStatus);

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value as AppointmentStatus;
    setStatus(newStatus);
    startTransition(async () => {
      await updateAppointmentStatus(appointmentId, newStatus);
    });
  }

  return (
    <select
      value={status}
      onChange={handleChange}
      disabled={isPending}
      className={`status-chip appearance-none border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 ${STATUS_META[status].chipClass}`}
    >
      {(Object.keys(STATUS_META) as AppointmentStatus[]).map((value) => (
        <option key={value} value={value}>
          {STATUS_META[value].label}
        </option>
      ))}
    </select>
  );
}
