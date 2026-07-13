import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { createClient } from "@salon-app/supabase/server";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { ClientForm } from "@/components/ClientForm";
import { WhatsAppReminderButton } from "@/components/WhatsAppReminderButton";
import { StatusBadge } from "@/components/StatusBadge";
import { FichaLocal } from "@/components/local/FichaLocal";
import type { Appointment, AppointmentStatus, Client } from "@salon-app/supabase";

type AppointmentRow = Omit<Appointment, "services"> & {
  services: { name: string; price: number } | null;
};

function formatMXN(value: number) {
  return value.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: client }, { data: rawAppointments }] = await Promise.all([
    supabase.from("clients").select("*").eq("id", id).single(),
    supabase
      .from("appointments")
      .select("*, services(name, price)")
      .eq("client_id", id)
      .order("start_time", { ascending: false }),
  ]);

  if (!client) notFound();

  const appointments = (rawAppointments ?? []) as AppointmentRow[];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">{client.full_name}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Clienta desde {format(parseISO((client as Client).created_at), "MMMM yyyy", { locale: es })}
            {" · "}Total gastado: {formatMXN((client as Client).total_spent)}
          </p>
        </div>
        <Link
          href={`/agenda/nueva?client_id=${id}`}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nueva cita
        </Link>
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-4">Datos de contacto</h2>
        <ClientForm client={client as Client} />
      </section>

      {/* Ficha rica local-first: vive solo en el IndexedDB de este
          dispositivo, no en Supabase. */}
      <FichaLocal clientId={id} />

      <section>
        <h2 className="text-lg font-semibold mb-4">Historial de citas</h2>
        {appointments.length === 0 ? (
          <p className="text-muted-foreground">Sin citas registradas todavía.</p>
        ) : (
          <div className="rounded-2xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    {["Servicio", "Fecha y hora", "Precio", "Estado", ""].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-muted-foreground font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((appt) => (
                    <tr key={appt.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3">{appt.services?.name ?? "A consultar"}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {format(parseISO(appt.start_time), "d MMM yyyy · HH:mm", { locale: es })}
                      </td>
                      <td className="px-4 py-3 font-semibold text-primary">
                        {appt.services?.price != null ? formatMXN(appt.services.price) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={appt.status as AppointmentStatus} />
                      </td>
                      <td className="px-4 py-3">
                        {appt.status !== "completed" && appt.status !== "cancelled" && (
                          <WhatsAppReminderButton
                            clientName={client.full_name}
                            clientPhone={client.phone}
                            startTime={appt.start_time}
                            serviceName={appt.services?.name}
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
