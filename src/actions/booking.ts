"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/queries";
import { addMinutes, parseISO, startOfDay, endOfDay } from "date-fns";
import type { AppointmentStatus } from "@/types/database";

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
    .select("duration_mins")
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
  let serviceNote = "";
  if (serviceValue && serviceValue !== "other") {
    const { data: service } = await supabase
      .from("services")
      .select("id")
      .eq("id", serviceValue)
      .single();
    if (service) serviceId = service.id;
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

  revalidatePath("/admin");
  return { error: null, ok: true };
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
