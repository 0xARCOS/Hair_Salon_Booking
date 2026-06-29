import { createClient } from "@/lib/supabase/server";
import { format, parseISO, isPast } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, Clock, Scissors } from "lucide-react";
import type { Appointment, AppointmentStatus } from "@/types/database";

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  completed: "Completada",
  cancelled: "Cancelada",
};

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  pending: "bg-yellow-500/10 text-yellow-500",
  confirmed: "bg-primary/10 text-primary",
  completed: "bg-green-500/10 text-green-500",
  cancelled: "bg-muted text-muted-foreground",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: raw } = await supabase
    .from("appointments")
    .select("*, services(name, price, duration_mins)")
    .eq("client_id", user!.id)
    .order("start_time", { ascending: false });

  const appointments = (raw ?? []) as Appointment[];

  const upcoming = appointments.filter(
    (a) => !isPast(parseISO(a.start_time)) && a.status !== "cancelled"
  );
  const past = appointments.filter(
    (a) => isPast(parseISO(a.start_time)) || a.status === "cancelled"
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Mis citas</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gestiona tus reservas y consulta tu historial
        </p>
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          Próximas citas
        </h2>

        {upcoming.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
            <Scissors className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No tienes citas próximas.</p>
            <p className="text-sm mt-1">Reserva desde la página principal.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((appt) => (
              <AppointmentCard key={appt.id} appointment={appt} />
            ))}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            Historial
          </h2>
          <div className="space-y-3">
            {past.map((appt) => (
              <AppointmentCard key={appt.id} appointment={appt} muted />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function AppointmentCard({
  appointment,
  muted = false,
}: {
  appointment: Appointment;
  muted?: boolean;
}) {
  const start = parseISO(appointment.start_time);
  const service = appointment.services;

  return (
    <div
      className={`rounded-2xl border border-border p-4 sm:p-5 flex items-center gap-4 ${
        muted ? "bg-secondary/30 opacity-70" : "bg-card"
      }`}
    >
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Scissors className="w-5 h-5 text-primary" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{service?.name ?? "Servicio"}</p>
        <p className="text-sm text-muted-foreground">
          {format(start, "EEEE, d 'de' MMMM · HH:mm", { locale: es })}
        </p>
      </div>

      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        <span
          className={`text-xs font-medium px-2.5 py-1 rounded-full ${
            STATUS_STYLES[appointment.status]
          }`}
        >
          {STATUS_LABELS[appointment.status]}
        </span>
        {service?.price != null && (
          <span className="text-sm font-semibold text-primary">
            {service.price.toLocaleString("es-ES", {
              style: "currency",
              currency: "EUR",
            })}
          </span>
        )}
      </div>
    </div>
  );
}
