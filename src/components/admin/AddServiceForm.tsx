"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Plus, X, Loader2 } from "lucide-react";
import { addService, type ServiceState } from "@/actions/booking";

const initialState: ServiceState = { error: null };

export function AddServiceForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(addService, initialState);
  const prevPending = useRef(false);

  // Cierra el formulario automáticamente cuando la acción termina sin error
  useEffect(() => {
    if (prevPending.current && !isPending && !state.error) {
      setOpen(false);
    }
    prevPending.current = isPending;
  }, [isPending, state.error]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 text-primary text-sm font-medium hover:bg-primary/10 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Añadir servicio
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="p-4 rounded-2xl border border-border bg-card space-y-3 w-full sm:w-80"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Nuevo servicio</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <input
        name="name"
        required
        placeholder="Nombre del servicio"
        className="w-full px-3 py-2 rounded-xl border border-border bg-secondary text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      />

      <div className="grid grid-cols-2 gap-3">
        <input
          name="price"
          type="number"
          step="0.01"
          min="0"
          required
          placeholder="Precio (€)"
          className="w-full px-3 py-2 rounded-xl border border-border bg-secondary text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <input
          name="duration_mins"
          type="number"
          min="15"
          step="15"
          required
          placeholder="Duración (min)"
          className="w-full px-3 py-2 rounded-xl border border-border bg-secondary text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
        <input type="checkbox" name="is_multi_session" className="rounded" />
        Tratamiento multi-sesión
      </label>

      {state.error && (
        <p className="text-xs text-destructive">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isPending ? (
          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Guardando…</>
        ) : (
          "Guardar servicio"
        )}
      </button>
    </form>
  );
}
