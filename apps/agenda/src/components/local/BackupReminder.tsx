"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, X } from "lucide-react";
import { localDB } from "@/lib/local/db";
import { lastBackupAt } from "@/lib/local/backup";

const REMIND_AFTER_DAYS = 30;
const SNOOZE_DAYS = 7;

// Banner que recuerda exportar copia si hay fichas locales y hace más de
// 30 días de la última exportación (o nunca se ha hecho).
export function BackupReminder() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    (async () => {
      const fichas = await localDB.fichas.count();
      const fotos = await localDB.fotos.count();
      if (fichas === 0 && fotos === 0) return;

      const snooze = await localDB.meta.get("backupReminderSnoozedAt");
      if (snooze && Date.now() - Number(snooze.value) < SNOOZE_DAYS * 86400_000) return;

      const last = await lastBackupAt();
      if (!last || Date.now() - last > REMIND_AFTER_DAYS * 86400_000) setShow(true);
    })();
  }, []);

  if (!show) return null;

  async function dismiss() {
    await localDB.meta.put({
      key: "backupReminderSnoozedAt",
      value: String(Date.now()),
    });
    setShow(false);
  }

  return (
    <div className="bg-status-pending/10 text-status-pending text-sm px-4 py-2.5 flex items-center justify-center gap-3">
      <AlertTriangle className="w-4 h-4 shrink-0" />
      <span>
        Hace más de un mes de la última copia de las fichas locales.{" "}
        <Link href="/ajustes" className="font-medium underline underline-offset-2">
          Exportar ahora
        </Link>
      </span>
      <button onClick={dismiss} title="Recordar en una semana" className="p-1 hover:opacity-70">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
