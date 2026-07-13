"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import {
  createClientRecord,
  updateClientRecord,
  type ClientFormState,
} from "@/actions/clients";
import type { Client } from "@salon-app/supabase";

const initialState: ClientFormState = { error: null };

interface ClientFormProps {
  client?: Client;
}

export function ClientForm({ client }: ClientFormProps) {
  const action = client ? updateClientRecord.bind(null, client.id) : createClientRecord;
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4 max-w-md">
      <div>
        <label htmlFor="full_name" className="block text-sm font-medium mb-1.5">
          Nombre completo
        </label>
        <input
          id="full_name"
          name="full_name"
          required
          defaultValue={client?.full_name}
          className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-secondary text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium mb-1.5">
          Teléfono (WhatsApp)
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          required
          placeholder="52XXXXXXXXXX"
          defaultValue={client?.phone}
          className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-secondary text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-1.5">
          Email (opcional)
        </label>
        <input
          id="email"
          name="email"
          type="email"
          defaultValue={client?.email ?? ""}
          className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-secondary text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {client && (
        <div>
          <label htmlFor="active_treatment_phase" className="block text-sm font-medium mb-1.5">
            Fase de tratamiento activa
          </label>
          <input
            id="active_treatment_phase"
            name="active_treatment_phase"
            placeholder="Ej. keratina, sesión 2 de 3"
            defaultValue={client?.active_treatment_phase ?? ""}
            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-secondary text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      )}

      <div>
        <label htmlFor="internal_notes" className="block text-sm font-medium mb-1.5">
          Notas internas
        </label>
        <textarea
          id="internal_notes"
          name="internal_notes"
          rows={3}
          placeholder="Preferencias, alergias, historial relevante…"
          defaultValue={client?.internal_notes ?? ""}
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
        ) : client ? (
          "Guardar cambios"
        ) : (
          "Crear ficha"
        )}
      </button>
    </form>
  );
}
