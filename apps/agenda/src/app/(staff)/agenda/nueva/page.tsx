import { createClient } from "@salon-app/supabase/server";
import { NewAppointmentForm } from "@/components/NewAppointmentForm";

export default async function NewAppointmentPage({
  searchParams,
}: {
  searchParams: Promise<{ client_id?: string }>;
}) {
  const { client_id } = await searchParams;
  const supabase = await createClient();

  const [{ data: clients }, { data: services }] = await Promise.all([
    supabase.from("clients").select("id, full_name, phone").order("full_name"),
    supabase.from("services").select("*").order("price", { ascending: true }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Nueva cita</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Regístrala tras confirmar con la clienta por teléfono o WhatsApp.
        </p>
      </div>
      <NewAppointmentForm
        clients={clients ?? []}
        services={services ?? []}
        preselectedClientId={client_id}
      />
    </div>
  );
}
