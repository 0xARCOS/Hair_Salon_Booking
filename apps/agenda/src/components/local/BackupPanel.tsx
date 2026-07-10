"use client";

import { useEffect, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Download, Upload, Loader2, HardDrive } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { localDB, storageEstimate } from "@/lib/local/db";
import { exportBackup, importBackup, lastBackupAt } from "@/lib/local/backup";

function formatBytes(bytes: number) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

export function BackupPanel() {
  const [busy, setBusy] = useState<"export" | "import" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastBackup, setLastBackup] = useState<number | null>(null);
  const [estimate, setEstimate] = useState<{ usage: number; quota: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const counts = useLiveQuery(async () => ({
    fichas: await localDB.fichas.count(),
    fotos: await localDB.fotos.count(),
  }));

  useEffect(() => {
    lastBackupAt().then(setLastBackup);
    storageEstimate().then(setEstimate);
  }, [busy]);

  async function handleExport() {
    setBusy("export");
    setError(null);
    setMessage(null);
    try {
      await exportBackup();
      setMessage("Copia exportada. Guárdala fuera de este equipo (nube, USB…).");
    } catch {
      setError("No se pudo exportar la copia.");
    } finally {
      setBusy(null);
    }
  }

  async function handleImport(files: FileList | null) {
    if (!files?.[0]) return;
    setBusy("import");
    setError(null);
    setMessage(null);
    try {
      const result = await importBackup(files[0]);
      setMessage(
        `Copia restaurada: ${result.fichas} fichas y ${result.fotos} fotos nuevas.`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "El archivo no se pudo importar.");
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <section className="rounded-lg border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <HardDrive className="w-4 h-4 text-primary" />
        <h2 className="font-semibold">Copia de seguridad de las fichas locales</h2>
      </div>

      <p className="text-sm text-muted-foreground max-w-prose">
        Las fichas locales (notas, fórmulas y fotos) viven solo en este
        navegador. Si se borran los datos del sitio o cambias de equipo, la
        copia exportada es la única forma de recuperarlas.
      </p>

      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Fichas</dt>
          <dd className="font-semibold">{counts?.fichas ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Fotos</dt>
          <dd className="font-semibold">{counts?.fotos ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Última copia</dt>
          <dd className="font-semibold">
            {lastBackup
              ? formatDistanceToNow(lastBackup, { addSuffix: true, locale: es })
              : "Nunca"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Espacio usado</dt>
          <dd className="font-semibold">
            {estimate ? `${formatBytes(estimate.usage)} de ${formatBytes(estimate.quota)}` : "—"}
          </dd>
        </div>
      </dl>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleExport}
          disabled={busy !== null}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {busy === "export" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          Exportar copia
        </button>

        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          onChange={(e) => handleImport(e.target.files)}
          className="hidden"
          id="backup-import-input"
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy !== null}
          className="flex items-center gap-2 px-4 py-2 rounded-full border border-border text-sm font-medium hover:bg-secondary transition-colors disabled:opacity-50"
        >
          {busy === "import" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          Importar copia
        </button>
      </div>

      {message && (
        <p className="text-sm text-status-confirmed bg-status-confirmed/10 rounded-md px-3 py-2">
          {message}
        </p>
      )}
      {error && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
          {error}
        </p>
      )}
    </section>
  );
}
