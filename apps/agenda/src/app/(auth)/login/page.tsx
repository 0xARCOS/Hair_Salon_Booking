"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Scissors, Loader2 } from "lucide-react";
import { login, type AuthState } from "@/actions/auth";
import { brand } from "@/config/brand";

const initialState: AuthState = { error: null };

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, initialState);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
          <Scissors className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Agenda {brand.fullName}</h1>
        <p className="text-muted-foreground text-sm mt-1">Acceso solo para el equipo</p>
      </div>

      <form action={formAction} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1.5">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="tu@email.com"
            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1.5">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
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
            <><Loader2 className="w-4 h-4 animate-spin" /> Accediendo…</>
          ) : (
            "Acceder"
          )}
        </button>

        <Link
          href="/forgot-password"
          className="block text-center text-sm text-muted-foreground hover:underline"
        >
          ¿Olvidaste tu contraseña?
        </Link>
      </form>
    </div>
  );
}
