"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/queries";
import { addMinutes, parseISO, startOfDay, endOfDay } from "date-fns";
import type { AppointmentStatus } from "@/types/database";

const BUSINESS_START_HOUR = 9;
const BUSINESS_END_HOUR = 18;

export async function getAvailableSlots(
  date: string,
  duration_mins: number
): Promise<string[]> {
  const supabase = await createClient();

  const dayStart = startOfDay(parseISO(date));
  const dayEnd = endOfDay(parseISO(date));

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
  businessEnd.setHours(BUSINESS_END_HOUR, 0, 0, 0);

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

  const { error } = await supabase
    .from("appointments")
    .update({ status })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
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
