"use client";

import { useState } from "react";
import { Lock, LockOpen, ShieldCheck, Loader2, AlertTriangle } from "lucide-react";
import {
  useEncryptionState,
  enableEncryption,
  disableEncryption,
  unlock,
  lock,
} from "@/lib/local/crypto";

const inputClass =
  "w-full px-3.5 py-2.5 rounded-md border border-border bg-secondary text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm";

export function EncryptionPanel() {
  const { enabled, key } = useEncryptionState();

  return (
    <section className="rounded-lg border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-primary" />
        <h2 className="font-semibold">Cifrado de las fichas locales</h2>
        {enabled && (
          <span
            className={`status-chip ${
              key
                ? "text-status-confirmed bg-status-confirmed/10"
                : "text-status-pending bg-status-pending/10"
            }`}
          >
            {key ? "Activado · desbloqueado" : "Activado · bloqueado"}
          </span>
        )}
      </div>

      <p className="text-sm text-muted-foreground max-w-prose">
        Protege con una frase de paso los campos sensibles de las fichas
        (alergias, preferencias, notas, fórmulas y fotos). La clave se deriva
        en este dispositivo y nunca sale de él: sin la frase, ni siquiera
        quien tenga acceso al equipo, a una copia exportada, o al servidor
        donde se sincronizan, puede leer esos campos ni ver las fotos. Los
        pies de foto y los datos de contacto de la clienta no se cifran.
      </p>

      <p className="text-sm bg-status-pending/10 text-status-pending rounded-md px-3 py-2 flex items-start gap-2 max-w-prose">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        Si olvidas la frase de paso, los datos cifrados —y sus copias de
        seguridad— son irrecuperables. No hay recuperación posible.
      </p>

      {enabled === null && (
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Comprobando estado…
        </p>
      )}
      {enabled === false && <EnableForm />}
      {enabled === true && !key && <UnlockForm />}
      {enabled === true && key && <EnabledControls />}
    </section>
  );
}

function EnableForm() {
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (pass.length < 8) {
      setError("La frase debe tener al menos 8 caracteres.");
      return;
    }
    if (pass !== confirm) {
      setError("Las frases no coinciden.");
      return;
    }
    setBusy(true);
    try {
      await enableEncryption(pass);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo activar el cifrado.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 max-w-sm">
      <div>
        <label htmlFor="enc-pass" className="block text-sm font-medium mb-1.5">
          Frase de paso
        </label>
        <input
          id="enc-pass"
          type="password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          autoComplete="new-password"
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="enc-confirm" className="block text-sm font-medium mb-1.5">
          Repite la frase
        </label>
        <input
          id="enc-confirm"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          className={inputClass}
        />
      </div>
      {error && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
        Activar cifrado
      </button>
    </form>
  );
}

function UnlockForm() {
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (!(await unlock(pass))) setError("Frase de paso incorrecta.");
    } finally {
      setBusy(false);
      setPass("");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 max-w-sm">
      <label htmlFor="enc-unlock" className="block text-sm font-medium">
        Frase de paso
      </label>
      <input
        id="enc-unlock"
        type="password"
        value={pass}
        onChange={(e) => setPass(e.target.value)}
        autoComplete="current-password"
        className={inputClass}
      />
      {error && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>
      )}
      <button
        type="submit"
        disabled={busy || pass.length === 0}
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <LockOpen className="w-4 h-4" />}
        Desbloquear
      </button>
    </form>
  );
}

function EnabledControls() {
  const [showDisable, setShowDisable] = useState(false);
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDisable(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await disableEncryption(pass);
      setShowDisable(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo desactivar.");
    } finally {
      setBusy(false);
      setPass("");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <button
          onClick={lock}
          className="flex items-center gap-2 px-4 py-2 rounded-full border border-border text-sm font-medium hover:bg-secondary transition-colors"
        >
          <Lock className="w-4 h-4" />
          Bloquear ahora
        </button>
        <button
          onClick={() => setShowDisable((v) => !v)}
          className="text-sm text-muted-foreground hover:text-destructive transition-colors underline underline-offset-2"
        >
          Desactivar cifrado…
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        Al bloquear (o cerrar la pestaña) hará falta la frase de paso para
        volver a leer los campos cifrados. Para cambiar la frase: desactiva el
        cifrado y actívalo de nuevo con la nueva.
      </p>

      {showDisable && (
        <form onSubmit={handleDisable} className="space-y-3 max-w-sm border-t border-border pt-3">
          <label htmlFor="enc-disable" className="block text-sm font-medium">
            Confirma la frase de paso para desactivar (las fichas quedarán sin cifrar)
          </label>
          <input
            id="enc-disable"
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            autoComplete="current-password"
            className={inputClass}
          />
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy || pass.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            Desactivar cifrado
          </button>
        </form>
      )}
    </div>
  );
}
