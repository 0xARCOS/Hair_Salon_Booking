import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@irene/supabase/server";
import { ClientSearchList } from "@/components/ClientSearchList";

export default async function ClientesPage() {
  const supabase = await createClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("id, full_name, phone, active_treatment_phase")
    .order("full_name");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Clientas</h1>
          <p className="text-muted-foreground text-sm mt-1">Fichas e historial</p>
        </div>
        <Link
          href="/clientes/nueva"
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nueva ficha
        </Link>
      </div>

      <ClientSearchList clients={clients ?? []} />
    </div>
  );
}
