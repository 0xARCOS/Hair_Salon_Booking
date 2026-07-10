"use client";

import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  HardDrive,
  Plus,
  Trash2,
  Camera,
  Check,
  Loader2,
  AlertTriangle,
  Lock,
  LockOpen,
} from "lucide-react";
import {
  localDB,
  emptyFicha,
  storageEstimate,
  type FichaLocal as Ficha,
  type FormulaEntry,
} from "@/lib/local/db";
import { compressImage } from "@/lib/local/image";
import {
  useEncryptionState,
  encryptFicha,
  decryptFicha,
  unlock,
} from "@/lib/local/crypto";

type Tab = "notas" | "formulas" | "fotos";

const TABS: { id: Tab; label: string }[] = [
  { id: "notas", label: "Notas" },
  { id: "formulas", label: "Fórmulas" },
  { id: "fotos", label: "Fotos" },
];

const LOW_SPACE_RATIO = 0.9;

export function FichaLocal({ clientId }: { clientId: string }) {
  const [tab, setTab] = useState<Tab>("notas");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [lowSpace, setLowSpace] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // El borrador en memoria es la fuente autoritativa mientras se edita;
  // IndexedDB solo se usa para la carga inicial y la persistencia debounced.
  const [ficha, setFicha] = useState<Ficha | null>(null);
  const [locked, setLocked] = useState(false);

  // Estado del cifrado opcional (ver crypto.ts). La ref evita que el
  // timeout del autosave capture un estado obsoleto.
  const { enabled: encEnabled, key: encKey } = useEncryptionState();
  const cryptoRef = useRef({ enabled: encEnabled, key: encKey });
  cryptoRef.current = { enabled: encEnabled, key: encKey };

  useEffect(() => {
    if (encEnabled === null) return; // aún comprobando el estado del cifrado
    let cancelled = false;
    setFicha(null);
    setLocked(false);
    (async () => {
      const stored = await localDB.fichas.get(clientId);
      // Con cifrado activado hace falta la clave tanto para leer fichas
      // cifradas como para crear nuevas (se guardarían cifradas).
      if (encEnabled && !encKey && (stored?.enc || !stored)) {
        if (!cancelled) setLocked(true);
        return;
      }
      let loaded = stored ?? emptyFicha(clientId);
      if (loaded.enc && encKey) {
        try {
          loaded = await decryptFicha(loaded, encKey);
        } catch {
          if (!cancelled) setLocked(true);
          return;
        }
      }
      if (!cancelled) setFicha(loaded);
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId, encEnabled, encKey]);

  const fotos = useLiveQuery(
    () => localDB.fotos.where("clientId").equals(clientId).reverse().sortBy("createdAt"),
    [clientId]
  );

  useEffect(() => {
    storageEstimate().then((est) => {
      if (est && est.quota > 0) setLowSpace(est.usage / est.quota > LOW_SPACE_RATIO);
    });
  }, [fotos?.length]);

  // Autosave con debounce: cada cambio se persiste a IndexedDB a los 600 ms.
  function save(patch: Partial<Ficha>) {
    setFicha((prev) => {
      if (!prev) return prev;
      const next: Ficha = { ...prev, ...patch, updatedAt: Date.now() };
      setSaveState("saving");
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        const { enabled, key } = cryptoRef.current;
        await localDB.fichas.put(enabled && key ? await encryptFicha(next, key) : next);
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 2000);
      }, 600);
      return next;
    });
  }

  if (locked) return <LockedPanel />;
  if (!ficha) return null;

  return (
    <section className="rounded-lg border border-border bg-card overflow-hidden">
      <header className="px-5 py-4 border-b border-border flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-primary" />
          <h2 className="font-semibold">Ficha local</h2>
          <span className="text-xs text-muted-foreground">
            solo en este dispositivo
          </span>
          {encEnabled && (
            <span title="Los campos de texto se guardan cifrados">
              <Lock className="w-3 h-3 text-status-confirmed" />
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
          {saveState === "saving" && (
            <>
              <Loader2 className="w-3 h-3 animate-spin" /> Guardando…
            </>
          )}
          {saveState === "saved" && (
            <>
              <Check className="w-3 h-3 text-status-confirmed" /> Guardado
            </>
          )}
          {saveState === "idle" && ficha.updatedAt !== ficha.createdAt && (
            <>Editado {format(ficha.updatedAt, "d MMM · HH:mm", { locale: es })}</>
          )}
        </span>
      </header>

      {lowSpace && (
        <p className="px-5 py-2.5 text-xs bg-status-pending/10 text-status-pending flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          Queda poco espacio en este navegador. Exporta una copia de seguridad
          desde Ajustes antes de añadir más fotos.
        </p>
      )}

      <nav className="flex border-b border-border" aria-label="Secciones de la ficha">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-5 py-2.5 text-sm transition-colors border-b-2 -mb-px ${
              tab === t.id
                ? "border-primary text-foreground font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
            {t.id === "fotos" && fotos && fotos.length > 0 && (
              <span className="ml-1.5 text-xs text-muted-foreground">{fotos.length}</span>
            )}
          </button>
        ))}
      </nav>

      <div className="p-5">
        {tab === "notas" && <NotasTab ficha={ficha} onChange={save} />}
        {tab === "formulas" && <FormulasTab ficha={ficha} onChange={save} />}
        {tab === "fotos" && <FotosTab clientId={clientId} fotos={fotos ?? []} />}
      </div>
    </section>
  );
}

/* ─── Cifrado bloqueado ──────────────────────────────────────────────── */

function LockedPanel() {
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      // Si la frase es correcta, useEncryptionState notifica y el padre
      // recarga la ficha descifrada automáticamente.
      if (!(await unlock(pass))) setError("Frase de paso incorrecta.");
    } finally {
      setBusy(false);
      setPass("");
    }
  }

  return (
    <section className="rounded-lg border border-border bg-card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Lock className="w-4 h-4 text-primary" />
        <h2 className="font-semibold">Ficha local cifrada</h2>
      </div>
      <p className="text-sm text-muted-foreground max-w-prose">
        Las fichas locales de este dispositivo están protegidas. Introduce la
        frase de paso para leerlas y editarlas durante esta sesión.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 max-w-md">
        <input
          type="password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          autoComplete="current-password"
          placeholder="Frase de paso"
          aria-label="Frase de paso"
          className="flex-1 min-w-[180px] px-3.5 py-2.5 rounded-md border border-border bg-secondary text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
        />
        <button
          type="submit"
          disabled={busy || pass.length === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <LockOpen className="w-4 h-4" />}
          Desbloquear
        </button>
      </form>
      {error && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2 max-w-md">
          {error}
        </p>
      )}
    </section>
  );
}

/* ─── Notas ──────────────────────────────────────────────────────────── */

function NotasTab({
  ficha,
  onChange,
}: {
  ficha: Ficha;
  onChange: (patch: Partial<Ficha>) => void;
}) {
  const inputClass =
    "w-full px-3.5 py-2.5 rounded-md border border-border bg-secondary text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm";

  return (
    <div className="space-y-4 max-w-xl">
      <div>
        <label htmlFor="ficha-alergias" className="block text-sm font-medium mb-1.5">
          Alergias y patch-test
        </label>
        <textarea
          id="ficha-alergias"
          rows={2}
          defaultValue={ficha.alergias}
          onChange={(e) => onChange({ alergias: e.target.value })}
          placeholder="Ej. alergia al PPD — usar solo tintes sin amoniaco. Patch-test 12/05/2026 OK."
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="ficha-preferencias" className="block text-sm font-medium mb-1.5">
          Preferencias
        </label>
        <textarea
          id="ficha-preferencias"
          rows={2}
          defaultValue={ficha.preferencias}
          onChange={(e) => onChange({ preferencias: e.target.value })}
          placeholder="Ej. café solo, prefiere silencio, siempre con Irene…"
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="ficha-notas" className="block text-sm font-medium mb-1.5">
          Notas
        </label>
        <textarea
          id="ficha-notas"
          rows={5}
          defaultValue={ficha.notas}
          onChange={(e) => onChange({ notas: e.target.value })}
          placeholder="Historial, observaciones, lo que quieras recordar de esta clienta…"
          className={inputClass}
        />
      </div>
    </div>
  );
}

/* ─── Fórmulas ───────────────────────────────────────────────────────── */

function FormulasTab({
  ficha,
  onChange,
}: {
  ficha: Ficha;
  onChange: (patch: Partial<Ficha>) => void;
}) {
  function addFormula() {
    const nueva: FormulaEntry = {
      id: crypto.randomUUID(),
      fecha: new Date().toISOString().slice(0, 10),
      titulo: "",
      detalle: "",
    };
    onChange({ formulas: [nueva, ...ficha.formulas] });
  }

  function updateFormula(id: string, patch: Partial<FormulaEntry>) {
    onChange({
      formulas: ficha.formulas.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    });
  }

  function removeFormula(id: string) {
    onChange({ formulas: ficha.formulas.filter((f) => f.id !== id) });
  }

  const inputClass =
    "px-3 py-2 rounded-md border border-border bg-secondary text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm";

  return (
    <div className="space-y-4">
      <button
        onClick={addFormula}
        className="flex items-center gap-1.5 text-sm text-primary font-medium hover:underline"
      >
        <Plus className="w-4 h-4" /> Nueva fórmula
      </button>

      {ficha.formulas.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center border border-dashed border-border rounded-md">
          Sin fórmulas guardadas. Apunta aquí color, oxidante y tiempos de la
          próxima visita para repetir el resultado exacto.
        </p>
      ) : (
        <ul className="space-y-3">
          {ficha.formulas.map((f) => (
            <li key={f.id} className="rounded-md border border-border p-3.5 space-y-2.5">
              <div className="flex flex-wrap gap-2.5">
                <input
                  type="date"
                  value={f.fecha}
                  onChange={(e) => updateFormula(f.id, { fecha: e.target.value })}
                  className={inputClass}
                  aria-label="Fecha de la fórmula"
                />
                <input
                  value={f.titulo}
                  onChange={(e) => updateFormula(f.id, { titulo: e.target.value })}
                  placeholder="Ej. Balayage raíz sombreada"
                  className={`${inputClass} flex-1 min-w-[180px]`}
                  aria-label="Título de la fórmula"
                />
                <button
                  onClick={() => removeFormula(f.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors p-1.5"
                  title="Eliminar fórmula"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <textarea
                rows={2}
                value={f.detalle}
                onChange={(e) => updateFormula(f.id, { detalle: e.target.value })}
                placeholder="Ej. Wella 7/1 + 8/81 (1:1), oxidante 20 vol, 35 min con calor…"
                className={`${inputClass} w-full`}
                aria-label="Detalle de la fórmula"
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ─── Fotos ──────────────────────────────────────────────────────────── */

function FotosTab({
  clientId,
  fotos,
}: {
  clientId: string;
  fotos: { id?: number; blob: Blob; caption: string; createdAt: number }[];
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const blob = await compressImage(file);
        await localDB.fotos.add({
          clientId,
          blob,
          caption: "",
          createdAt: Date.now(),
        });
      }
    } catch {
      setError("No se pudo guardar la foto. Comprueba el espacio disponible en Ajustes.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removeFoto(id?: number) {
    if (id != null) await localDB.fotos.delete(id);
  }

  async function updateCaption(id: number | undefined, caption: string) {
    if (id != null) await localDB.fotos.update(id, { caption });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
          id="ficha-foto-input"
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 text-sm text-primary font-medium hover:underline disabled:opacity-50"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Guardando…
            </>
          ) : (
            <>
              <Camera className="w-4 h-4" /> Añadir fotos
            </>
          )}
        </button>
        <span className="text-xs text-muted-foreground">
          Se comprimen y guardan solo en este dispositivo
        </span>
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>
      )}

      {fotos.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center border border-dashed border-border rounded-md">
          Sin fotos todavía. El antes/después de cada visita es la mejor
          referencia para la próxima.
        </p>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {fotos.map((foto) => (
            <FotoCard
              key={foto.id}
              foto={foto}
              onRemove={() => removeFoto(foto.id)}
              onCaption={(c) => updateCaption(foto.id, c)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function FotoCard({
  foto,
  onRemove,
  onCaption,
}: {
  foto: { blob: Blob; caption: string; createdAt: number };
  onRemove: () => void;
  onCaption: (caption: string) => void;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(foto.blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [foto.blob]);

  return (
    <li className="rounded-md border border-border overflow-hidden bg-secondary/30">
      <div className="aspect-square relative group">
        {url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={foto.caption || "Foto de la ficha"}
            className="w-full h-full object-cover"
          />
        )}
        <button
          onClick={onRemove}
          className="absolute top-1.5 right-1.5 p-1.5 rounded-md bg-background/80 text-muted-foreground opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-destructive transition-opacity"
          title="Eliminar foto"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="p-2 space-y-0.5">
        <input
          defaultValue={foto.caption}
          onChange={(e) => onCaption(e.target.value)}
          placeholder="Añadir pie…"
          className="w-full text-xs bg-transparent focus:outline-none placeholder:text-muted-foreground"
          aria-label="Pie de foto"
        />
        <p className="text-[10px] text-muted-foreground">
          {format(foto.createdAt, "d MMM yyyy", { locale: es })}
        </p>
      </div>
    </li>
  );
}
