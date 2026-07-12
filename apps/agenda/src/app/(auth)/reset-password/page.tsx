"use client";

import { useActionState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { updatePassword, type AuthState } from "@/actions/auth";

const initialState: AuthState = { error: null };

export default function ResetPasswordPage() {
  const [state, formAction, isPending] = useActionState(updatePassword, initialState);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
          <KeyRound className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Nueva contraseña</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Elige una contraseña nueva para tu cuenta
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1.5">
            Contraseña nueva
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            placeholder="••••••••"
            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
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
          className="w-full py-2.5 rounded-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isPending ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Guardando…</>
          ) : (
            "Guardar contraseña"
          )}
        </button>
      </form>
    </div>
  );
}
