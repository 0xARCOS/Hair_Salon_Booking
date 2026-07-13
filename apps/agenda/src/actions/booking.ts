"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@salon-app/supabase/server";
import { addMinutes, parseISO, startOfDay, endOfDay } from "date-fns";
import type { AppointmentStatus } from "@salon-app/supabase";

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

export type AppointmentState = { error: string | null };

// Crea una cita manualmente desde la agenda tras la llamada telefónica.
// Solo la usa staff autenticado; el cliente nunca reserva por su cuenta.
export async function createAppointmentForClient(
  _prevState: AppointmentState,
  formData: FormData
): Promise<AppointmentState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Debes iniciar sesión." };

  const client_id = formData.get("client_id") as string;
  const service_id = (formData.get("service_id") as string | null) || null;
  const date = formData.get("date") as string;
  const time = formData.get("time") as string;
  const notes = (formData.get("notes") as string | null)?.trim() || null;

  if (!client_id || !date || !time) {
    return { error: "Selecciona clienta, fecha y hora." };
  }

  const start_time = parseISO(`${date}T${time}`);
  if (isNaN(start_time.getTime())) {
    return { error: "Fecha u hora no válidas." };
  }

  let duration_mins = 60;
  if (service_id) {
    const { data: service } = await supabase
      .from("services")
      .select("duration_mins")
      .eq("id", service_id)
      .single();
    duration_mins = service?.duration_mins ?? 60;
  }

  const slotEnd = addMinutes(start_time, duration_mins);
  const dayStart = startOfDay(start_time);
  const dayEnd = endOfDay(start_time);

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
    return start_time < existEnd && slotEnd > existStart;
  });

  if (hasConflict) return { error: "Esa hora ya está ocupada. Elige otra." };

  const { error } = await supabase.from("appointments").insert({
    client_id,
    service_id,
    start_time: start_time.toISOString(),
    status: "confirmed",
    notes,
  });
  if (error) return { error: error.message };

  revalidatePath("/agenda");
  revalidatePath(`/clientes/${client_id}`);
  redirect("/agenda");
}

export async function updateAppointmentStatus(
  id: string,
  status: AppointmentStatus
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado.");

  if (status === "completed") {
    // Usa la función que, además de marcar la cita como completada,
    // actualiza el total gastado de la clienta.
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

  revalidatePath("/agenda");
}

export type ServiceState = { error: string | null };

export async function addService(
  _prevState: ServiceState,
  formData: FormData
): Promise<ServiceState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado." };

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

  revalidatePath("/agenda");
  return { error: null };
}
