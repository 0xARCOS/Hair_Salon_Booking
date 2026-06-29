import { createClient } from "@/lib/supabase/server";
import { format, parseISO, isToday } from "date-fns";
import { es } from "date-fns/locale";
import { TrendingUp, Calendar, Clock, Scissors } from "lucide-react";
import { AppointmentStatusSelect } from "@/components/admin/AppointmentStatusSelect";
import { AddServiceForm } from "@/components/admin/AddServiceForm";
import type { Appointment, AppointmentStatus, Service } from "@/types/database";

type AppointmentRow = Omit<Appointment, "services" | "profiles"> & {
  services: { name: string; price: number; duration_mins: number } | null;
  profiles: { full_name: string; phone: string | null } | null;
};

export default async function AdminPage() {
  const supabase = await createClient();

  const [{ data: rawAppointments }, { data: services }] = await Promise.all([
    supabase
      .from("appointments")
      .select("*, profiles(full_name, phone), services(name, price, duration_mins)")
      .order("start_time", { ascending: false }),
    supabase.from("services").select("*").order("price", { ascending: true }),
  ]);

  const appointments = (rawAppointments ?? []) as AppointmentRow[];

  const todayAppts = appointments.filter((a) => isToday(parseISO(a.start_time)));
  const revenueToday = todayAppts
    .filter((a) => a.status === "completed")
    .reduce((sum, a) => sum + (a.services?.price ?? 0), 0);
  const pendingCount = appointments.filter((a) => a.status === "pending").length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Panel de administración</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gestiona citas, clientes y servicios
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          icon={<TrendingUp className="w-5 h-5 text-primary" />}
          label="Ingresos hoy"
          value={revenueToday.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
        />
        <StatCard
          icon={<Calendar className="w-5 h-5 text-primary" />}
          label="Citas hoy"
          value={String(todayAppts.length)}
        />
        <StatCard
          icon={<Clock className="w-5 h-5 text-primary" />}
          label="Pendientes"
          value={String(pendingCount)}
        />
      </div>

      {/* Appointments table */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Todas las citas</h2>
        <div className="rounded-2xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  {["Cliente", "Servicio", "Fecha y hora", "Precio", "Estado"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-muted-foreground font-medium"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {appointments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                      No hay citas registradas.
                    </td>
                  </tr>
                ) : (
                  appointments.map((appt) => (
                    <tr
                      key={appt.id}
                      className="border-b border-border last:border-0 hover:bg-secondary/20"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium flex items-center gap-2">
                          {appt.guest_name ?? appt.profiles?.full_name ?? "—"}
                          {!appt.client_id && (
                            <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                              Invitado
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {appt.guest_phone ?? appt.profiles?.phone ?? ""}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        {appt.services?.name ?? "A consultar"}
                        {appt.notes && (
                          <p className="text-xs text-muted-foreground mt-0.5 max-w-[220px] truncate" title={appt.notes}>
                            {appt.notes}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {format(parseISO(appt.start_time), "d MMM yyyy · HH:mm", {
                          locale: es,
                        })}
                      </td>
                      <td className="px-4 py-3 font-semibold text-primary">
                        {appt.services?.price != null
                          ? appt.services.price.toLocaleString("es-ES", {
                              style: "currency",
                              currency: "EUR",
                            })
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <AppointmentStatusSelect
                          appointmentId={appt.id}
                          currentStatus={appt.status as AppointmentStatus}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Services management */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Servicios</h2>
          <AddServiceForm />
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(services ?? []).length === 0 ? (
            <div className="sm:col-span-2 lg:col-span-3 rounded-2xl border border-border p-8 text-center text-muted-foreground">
              <Scissors className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No hay servicios. Añade el primero.</p>
            </div>
          ) : (
            (services as Service[]).map((service) => (
              <div key={service.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{service.name}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {service.duration_mins} min
                    </p>
                  </div>
                  <span className="font-bold text-primary">
                    {service.price.toLocaleString("es-ES", {
                      style: "currency",
                      currency: "EUR",
                    })}
                  </span>
                </div>
                {service.is_multi_session && (
                  <span className="mt-2 inline-block text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    Multi-sesión
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
        {icon}
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}
