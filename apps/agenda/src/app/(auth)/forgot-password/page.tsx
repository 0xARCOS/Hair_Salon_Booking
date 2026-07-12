"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Mail, Loader2 } from "lucide-react";
import { requestPasswordReset, type RequestResetState } from "@/actions/auth";

const initialState: RequestResetState = { error: null, sent: false };

export default function ForgotPasswordPage() {
  const [state, formAction, isPending] = useActionState(requestPasswordReset, initialState);

  if (state.sent) {
    return (
      <div className="space-y-4 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-2">
          <Mail className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Revisa tu correo</h1>
        <p className="text-muted-foreground text-sm">
          Si ese email pertenece a una cuenta del equipo, te llegará un enlace
          para elegir una contraseña nueva.
        </p>
        <Link href="/login" className="inline-block text-sm text-primary hover:underline">
          Volver a acceder
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
          <Mail className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Recuperar acceso</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Escribe tu email y te enviamos un enlace para elegir una nueva contraseña
        </p>
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
            <><Loader2 className="w-4 h-4 animate-spin" /> Enviando…</>
          ) : (
            "Enviar enlace"
          )}
        </button>

        <Link href="/login" className="block text-center text-sm text-muted-foreground hover:underline">
          Volver a acceder
        </Link>
      </form>
    </div>
  );
}
