"use client";

import { useActionState } from "react";
import type { User } from "@supabase/supabase-js";
import type { Service } from "@/types/database";
import {
  createGuestAppointment,
  type GuestBookingState,
} from "@/actions/booking";

const initialState: GuestBookingState = { error: null, ok: false };

const TIME_SLOTS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "15:00", "15:30", "16:00",
  "16:30", "17:00", "17:30", "18:00", "18:30", "19:00",
];

interface GuestBookingFormProps {
  services: Service[];
  user: User | null;
}

export function GuestBookingForm({ services, user }: GuestBookingFormProps) {
  const [state, formAction, isPending] = useActionState(
    createGuestAppointment,
    initialState
  );

  const defaultName =
    (user?.user_metadata?.full_name as string | undefined) ?? "";

  if (state.ok) {
    return (
      <div className="booking-form-wrap reveal reveal-delay-2" id="reserva">
        <div className="booking-form-title">¡Cita solicitada!</div>
        <div className="booking-form-sub">
          Hemos recibido tu solicitud. Te confirmaremos la disponibilidad en
          menos de 24h. ¡Gracias por confiar en nosotras!
        </div>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="booking-form-wrap reveal reveal-delay-2"
      id="reserva"
    >
      <div className="booking-form-title">Reservar cita</div>
      <div className="booking-form-sub">
        Te confirmamos disponibilidad en menos de 24h
      </div>

      <div className="field-row">
        <div className="field">
          <input
            type="text"
            name="name"
            id="fname"
            placeholder=" "
            defaultValue={defaultName}
            required
          />
          <label htmlFor="fname">Nombre</label>
        </div>
        <div className="field">
          <input type="tel" name="phone" id="fphone" placeholder=" " required />
          <label htmlFor="fphone">Teléfono</label>
        </div>
      </div>

      <div className="field">
        <select name="service_id" id="fservice" defaultValue="">
          <option value="" disabled></option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
          <option value="other">Otro</option>
        </select>
        <label htmlFor="fservice">Servicio</label>
      </div>

      <div className="field-row">
        <div className="field">
          <input type="date" name="date" id="fdate" placeholder=" " required />
          <label htmlFor="fdate">Fecha</label>
        </div>
        <div className="field">
          <select name="time" id="ftime" defaultValue="">
            <option value="">Hora preferida</option>
            {TIME_SLOTS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <label htmlFor="ftime">Hora</label>
        </div>
      </div>

      <div className="field">
        <textarea name="message" id="fmsg" placeholder=" " />
        <label htmlFor="fmsg">Mensaje (opcional)</label>
      </div>

      {state.error && (
        <p
          style={{
            color: "#b3261e",
            fontSize: "0.85rem",
            marginBottom: "0.8rem",
          }}
        >
          {state.error}
        </p>
      )}

      <button type="submit" className="btn-submit" disabled={isPending}>
        {isPending ? "Enviando…" : "Solicitar cita"}
        <svg viewBox="0 0 16 16">
          <path d="M2 8h12M9 4l4 4-4 4" />
        </svg>
      </button>
    </form>
  );
}
