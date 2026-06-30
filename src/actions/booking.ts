"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/queries";
import { addMinutes, parseISO, startOfDay, endOfDay, format } from "date-fns";
import { es } from "date-fns/locale";
import type { AppointmentStatus } from "@/types/database";
import { getAdminMessaging } from "@/lib/firebase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BUSINESS_START_HOUR = 9;

// Hora de cierre por día de la semana (0 = domingo … 6 = sábado).
// L–V 9:00–20:00, sábado 9:00–14:00, domingo cerrado.
function closingHour(day: number): number | null {
  if (day === 0) return null; // domingo cerrado
  if (day === 6) return 14; // sábado
  return 20; // lunes a viernes
}

export async function getAvailableSlots(
  date: string,
  duration_mins: number
): Promise<string[]> {
  const supabase = await createClient();

  const parsedDate = parseISO(date);
  const endHour = closingHour(parsedDate.getDay());
  if (endHour === null) return []; // día cerrado

  const dayStart = startOfDay(parsedDate);
  const dayEnd = endOfDay(parsedDate);

  const { data: appointments, error } = await supabase
    .from("appointments")
    .select("start_time, services(duration_mins)")
    .gte("start_time", dayStart.toISOString())
    .lte("start_time", dayEnd.toISOString())
    .in("status", ["pending", "confirmed"]);

  if (error) throw new Error(error.message);

  const busyBlocks = (appointments ?? []).map((appt) => {
    const start = parseISO(appt.start_time);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mins = (appt as any).services?.duration_mins ?? 60;
    return { start, end: addMinutes(start, mins) };
  });

  const slots: string[] = [];
  const businessStart = new Date(dayStart);
  businessStart.setHours(BUSINESS_START_HOUR, 0, 0, 0);
  const businessEnd = new Date(dayStart);
  businessEnd.setHours(endHour, 0, 0, 0);

  let cursor = businessStart;
  while (addMinutes(cursor, duration_mins) <= businessEnd) {
    const slotEnd = addMinutes(cursor, duration_mins);
    const overlap = busyBlocks.some((b) => cursor < b.end && slotEnd > b.start);
    if (!overlap) slots.push(cursor.toISOString());
    cursor = addMinutes(cursor, 30);
  }

  return slots;
}

export async function createAppointment(
  service_id: string,
  start_time: string
): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Debes iniciar sesión para reservar.");

  const { data: service } = await supabase
    .from("services")
    .select("duration_mins, name")
    .eq("id", service_id)
    .single();
  if (!service) throw new Error("Servicio no encontrado.");

  const slotStart = parseISO(start_time);
  const slotEnd = addMinutes(slotStart, service.duration_mins);
  const dayStart = startOfDay(slotStart);
  const dayEnd = endOfDay(slotStart);

  const { data: conflicts } = await supabase
    .from("appointments")
    .select("start_time, services(duration_mins)")
    .gte("start_time", dayStart.toISOString())
    .lte("start_time", dayEnd.toISOString())
    .in("status", ["pending", "confirmed"]);

  const hasConflict = (conflicts ?? []).some((appt) => {
    const existStart = parseISO(appt.start_time);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existEnd = addMinutes(existStart, (appt as any).services?.duration_mins ?? 60);
    return slotStart < existEnd && slotEnd > existStart;
  });

  if (hasConflict) throw new Error("Esta hora ya no está disponible. Selecciona otra.");

  const { error } = await supabase.from("appointments").insert({
    client_id: user.id,
    service_id,
    start_time,
    status: "confirmed",
  });
  if (error) throw new Error(error.message);

  // Dispatch push notification
  await notifyStaffByPush({
    name: user.user_metadata?.full_name || "Cliente",
    serviceName: service.name || "Servicio",
    start: slotStart,
  });

  revalidatePath("/dashboard");
}

export async function updateAppointmentStatus(
  id: string,
  status: AppointmentStatus
): Promise<void> {
  const supabase = await createClient();
  const role = await getUserRole(supabase);
  if (role !== "staff") throw new Error("No autorizado.");

  if (status === "completed") {
    // Usa la función que, además de marcar la cita como completada,
    // actualiza el total gastado del cliente en el CRM.
    const { error } = await supabase.rpc("complete_appointment", {
      appointment_id: id,
    });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("appointments")
      .update({ status })
      .eq("id", id);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/admin");
}

export type GuestBookingState = { error: string | null; ok: boolean };

// Reserva sin registro (modelo híbrido): el cliente solicita cita con
// nombre + teléfono. Si hay sesión iniciada, se vincula a su cuenta.
// La cita entra como 'pending' y el salón la confirma desde el panel.
export async function createGuestAppointment(
  _prevState: GuestBookingState,
  formData: FormData
): Promise<GuestBookingState> {
  const supabase = await createClient();

  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const phone = (formData.get("phone") as string | null)?.trim() ?? "";
  const serviceValue = (formData.get("service_id") as string | null) ?? "";
  const date = (formData.get("date") as string | null) ?? "";
  const time = (formData.get("time") as string | null) ?? "";
  const message = (formData.get("message") as string | null)?.trim() ?? "";

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return {
      error: "Las reservas no están disponibles en el modo previsualización.",
      ok: false,
    };
  }

  if (!name || !phone) {
    return { error: "Indica tu nombre y teléfono.", ok: false };
  }
  if (!date || !time) {
    return { error: "Elige una fecha y una hora.", ok: false };
  }

  const start = parseISO(`${date}T${time}`);
  if (isNaN(start.getTime())) {
    return { error: "Fecha u hora no válidas.", ok: false };
  }
  if (start.getTime() < Date.now()) {
    return { error: "Elige una fecha y hora futuras.", ok: false };
  }
  if (closingHour(start.getDay()) === null) {
    return { error: "Los domingos permanecemos cerrados.", ok: false };
  }

  // Servicio: si se eligió uno del catálogo, lo vinculamos; "Otro" queda
  // como solicitud sin servicio concreto y se anota en el mensaje.
  let serviceId: string | null = null;
  let serviceName = "A consultar";
  let serviceNote = "";
  if (serviceValue && serviceValue !== "other") {
    const { data: service } = await supabase
      .from("services")
      .select("id, name")
      .eq("id", serviceValue)
      .single();
    if (service) {
      serviceId = service.id;
      serviceName = service.name;
    }
  } else if (serviceValue === "other") {
    serviceNote = "Servicio: a consultar. ";
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("appointments").insert({
    client_id: user?.id ?? null,
    service_id: serviceId,
    start_time: start.toISOString(),
    status: "pending",
    guest_name: name,
    guest_phone: phone,
    notes: (serviceNote + message).trim() || null,
  });

  if (error) return { error: error.message, ok: false };

  // Aviso al salón por email (no bloquea la reserva si falla).
  await notifySalonByEmail({
    name,
    phone,
    serviceName,
    start,
    message,
  });

  // Aviso al salón por notificación push
  await notifyStaffByPush({
    name,
    serviceName,
    start,
  });

  revalidatePath("/admin");
  return { error: null, ok: true };
}

// Envía un email de aviso al salón cuando entra una nueva solicitud.
// Usa Resend (plan gratuito). Si faltan las variables de entorno, no hace
// nada: las reservas siguen funcionando, solo no se manda el aviso.
async function notifySalonByEmail(data: {
  name: string;
  phone: string;
  serviceName: string;
  start: Date;
  message: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.SALON_NOTIFICATION_EMAIL;
  if (!apiKey || !to) return;

  const from = process.env.RESEND_FROM ?? "Reservas Irene <onboarding@resend.dev>";
  const when = format(data.start, "EEEE d 'de' MMMM yyyy 'a las' HH:mm", {
    locale: es,
  });

  const html = `
    <h2>Nueva solicitud de cita</h2>
    <p><strong>Cliente:</strong> ${escapeHtml(data.name)}</p>
    <p><strong>Teléfono:</strong> ${escapeHtml(data.phone)}</p>
    <p><strong>Servicio:</strong> ${escapeHtml(data.serviceName)}</p>
    <p><strong>Fecha solicitada:</strong> ${escapeHtml(when)}</p>
    ${data.message ? `<p><strong>Mensaje:</strong> ${escapeHtml(data.message)}</p>` : ""}
    <p>Confírmala desde el panel de administración.</p>
  `;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject: `Nueva cita: ${data.name} · ${data.serviceName}`,
        html,
      }),
    });
  } catch {
    // Silencioso: el aviso es secundario, la cita ya está registrada.
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function notifyStaffByPush(data: {
  name: string;
  serviceName: string;
  start: Date;
}) {
  try {
    const messaging = getAdminMessaging();
    if (!messaging) return; // Firebase no configurado: se omite el push

    // Los tokens del staff solo son legibles con service-role (las RLS
    // restringen a "tokens propios"; quien reserva no es staff).
    const admin = createAdminClient();
    if (!admin) return; // sin service-role no podemos leer los tokens

    const { data: tokens } = await admin.from("push_tokens").select("fcm_token");
    if (!tokens || tokens.length === 0) return;

    const tokenStrings = tokens.map((t) => t.fcm_token);
    const when = format(data.start, "EEEE d 'de' MMMM 'a las' HH:mm", { locale: es });

    await messaging.sendEachForMulticast({
      tokens: tokenStrings,
      notification: {
        title: "Nueva Cita Reservada",
        body: `${data.name} · ${data.serviceName} · ${when}`,
      },
      webpush: {
        fcmOptions: {
          link: "/admin",
        },
      },
    });
  } catch (err) {
    console.error("Error dispatching push notifications:", err);
  }
}

export type ServiceState = { error: string | null };

export async function addService(
  _prevState: ServiceState,
  formData: FormData
): Promise<ServiceState> {
  const supabase = await createClient();
  const role = await getUserRole(supabase);
  if (role !== "staff") return { error: "No autorizado." };

  const name = formData.get("name") as string;
  const price = parseFloat(formData.get("price") as string);
  const duration_mins = parseInt(formData.get("duration_mins") as string, 10);
  const is_multi_session = formData.get("is_multi_session") === "on";

  if (!name || isNaN(price) || isNaN(duration_mins)) {
    return { error: "Todos los campos son obligatorios." };
  }

  const { error } = await supabase.from("services").insert({
    name,
    price,
    duration_mins,
    is_multi_session,
  });
  if (error) return { error: error.message };

  revalidatePath("/admin");
  revalidatePath("/");
  return { error: null };
}
