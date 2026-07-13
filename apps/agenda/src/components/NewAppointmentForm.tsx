"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { createAppointmentForClient, type AppointmentState } from "@/actions/booking";
import type { Client, Service } from "@salon-app/supabase";

const initialState: AppointmentState = { error: null };

interface NewAppointmentFormProps {
  clients: Pick<Client, "id" | "full_name" | "phone">[];
  services: Service[];
  preselectedClientId?: string;
}

export function NewAppointmentForm({
  clients,
  services,
  preselectedClientId,
}: NewAppointmentFormProps) {
  const [state, formAction, isPending] = useActionState(
    createAppointmentForClient,
    initialState
  );

  return (
    <form action={formAction} className="space-y-4 max-w-md">
      <div>
        <label htmlFor="client_id" className="block text-sm font-medium mb-1.5">
          Clienta
        </label>
        <select
          id="client_id"
          name="client_id"
          required
          defaultValue={preselectedClientId ?? ""}
          className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-secondary text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="" disabled>
            Selecciona una clienta
          </option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.full_name} · {c.phone}
            </option>
          ))}
        </select>
        {clients.length === 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            No hay clientas aún. Crea una ficha primero desde &quot;Clientas&quot;.
          </p>
        )}
      </div>

      <div>
        <label htmlFor="service_id" className="block text-sm font-medium mb-1.5">
          Servicio
        </label>
        <select
          id="service_id"
          name="service_id"
          className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-secondary text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">A consultar</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} · {s.duration_mins} min
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="date" className="block text-sm font-medium mb-1.5">
            Fecha
          </label>
          <input
            id="date"
            name="date"
            type="date"
            required
            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-secondary text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label htmlFor="time" className="block text-sm font-medium mb-1.5">
            Hora
          </label>
          <input
            id="time"
            name="time"
            type="time"
            required
            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-secondary text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium mb-1.5">
          Notas (opcional)
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-secondary text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {state?.error && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-2.5 rounded-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isPending ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Guardando…</>
        ) : (
          "Crear cita"
        )}
      </button>
    </form>
  );
}
