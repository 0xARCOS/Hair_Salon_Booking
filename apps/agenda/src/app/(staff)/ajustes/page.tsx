import { MonitorDown } from "lucide-react";
import { BackupPanel } from "@/components/local/BackupPanel";
import { EncryptionPanel } from "@/components/local/EncryptionPanel";
import { InstallButton } from "@/components/local/InstallButton";
import { brand } from "@/config/brand";

export const metadata = { title: `Ajustes · Agenda ${brand.shortName}` };

export default function AjustesPage() {
  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold font-display">Ajustes</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Instalación de la app y copia de seguridad de este dispositivo
        </p>
      </div>

      <section className="rounded-lg border border-border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <MonitorDown className="w-4 h-4 text-primary" />
          <h2 className="font-semibold">Instalar como aplicación</h2>
        </div>
        <p className="text-sm text-muted-foreground max-w-prose">
          Instalada, la agenda se abre en su propia ventana, con icono propio y
          sin barra de navegador — como cualquier programa del equipo.
        </p>
        <InstallButton />
      </section>

      <EncryptionPanel />

      <BackupPanel />
    </div>
  );
}
