"use client";

import { useEffect, useState } from "react";
import { MonitorDown, Check } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallButton() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
      return;
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) {
    return (
      <p className="text-sm text-status-confirmed flex items-center gap-2">
        <Check className="w-4 h-4" /> La app ya está instalada en este dispositivo.
      </p>
    );
  }

  if (!promptEvent) {
    return (
      <p className="text-sm text-muted-foreground">
        Para instalar la app, usa el menú del navegador («Instalar aplicación»
        en Chrome/Edge, «Añadir a pantalla de inicio» en móvil).
      </p>
    );
  }

  return (
    <button
      onClick={() => promptEvent.prompt()}
      className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
    >
      <MonitorDown className="w-4 h-4" />
      Instalar app en este dispositivo
    </button>
  );
}
