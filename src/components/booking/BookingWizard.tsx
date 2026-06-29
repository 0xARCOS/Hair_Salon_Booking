"use client";

import { useState, useTransition } from "react";
import { format, parseISO } from "date-fns";
import { CheckCircle, Loader2, Scissors, Clock } from "lucide-react";
import { getAvailableSlots, createAppointment } from "@/actions/booking";
import type { Service } from "@/types/database";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";

interface BookingWizardProps {
  services: Service[];
  user: User | null;
}

type Step = "service" | "date" | "time" | "confirm" | "success";

export function BookingWizard({ services, user }: BookingWizardProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("service");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleOpen() {
    setOpen(true);
    setStep("service");
    setSelectedService(null);
    setSelectedDate(undefined);
    setAvailableSlots([]);
    setSelectedSlot(null);
    setError(null);
  }

  function handleSelectService(service: Service) {
    setSelectedService(service);
    setStep("date");
  }

  function handleSelectDate(date: Date | undefined) {
    if (!date || !selectedService) return;
    setSelectedDate(date);
    setError(null);
    startTransition(async () => {
      try {
        const slots = await getAvailableSlots(
          format(date, "yyyy-MM-dd"),
          selectedService.duration_mins
        );
        setAvailableSlots(slots);
        setStep("time");
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Error al cargar horarios.");
      }
    });
  }

  function handleSelectSlot(slot: string) {
    setSelectedSlot(slot);
    setStep("confirm");
  }

  function handleConfirm() {
    if (!selectedService || !selectedSlot) return;
    setError(null);
    startTransition(async () => {
      try {
        await createAppointment(selectedService.id, selectedSlot);
        setStep("success");
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Error al reservar.");
        setStep("confirm");
      }
    });
  }

  const stepTitles: Record<Step, string> = {
    service: "Selecciona un servicio",
    date: "Elige la fecha",
    time: "Elige la hora",
    confirm: "Confirma tu cita",
    success: "¡Cita reservada!",
  };

  if (!user) {
    return (
      <Link
        href="/login"
        className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-gradient-to-r from-primary to-amber-500 text-primary-foreground font-semibold hover:opacity-90 transition-all hover:scale-105 shadow-lg shadow-primary/20"
      >
        Reservar cita
      </Link>
    );
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-gradient-to-r from-primary to-amber-500 text-primary-foreground font-semibold hover:opacity-90 transition-all hover:scale-105 shadow-lg shadow-primary/20"
      >
        Reservar cita
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-xl">{stepTitles[step]}</DialogTitle>
          </DialogHeader>

          {step === "service" && (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {services.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No hay servicios disponibles aún.
                </p>
              ) : (
                services.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleSelectService(s)}
                    className="w-full flex items-center justify-between p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-accent/20 transition-all text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <Scissors className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{s.name}</p>
                        <p className="text-sm text-muted-foreground">{s.duration_mins} minutos</p>
                      </div>
                    </div>
                    <span className="font-semibold text-primary">
                      {s.price.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}

          {step === "date" && (
            <div className="flex flex-col items-center gap-4">
              {isPending ? (
                <div className="flex items-center gap-2 py-8 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Cargando horas disponibles…</span>
                </div>
              ) : (
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleSelectDate}
                  disabled={(date) =>
                    date < new Date(new Date().setHours(0, 0, 0, 0)) || date.getDay() === 0
                  }
                  className="rounded-xl border border-border"
                />
              )}
              <button
                onClick={() => setStep("service")}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                ← Volver
              </button>
            </div>
          )}

          {step === "time" && (
            <div>
              {availableSlots.length === 0 ? (
                <div className="text-center py-6">
                  <Clock className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No hay horas disponibles para este día.</p>
                  <button
                    onClick={() => setStep("date")}
                    className="mt-4 text-sm text-primary hover:underline"
                  >
                    Elegir otro día
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot}
                        onClick={() => handleSelectSlot(slot)}
                        className="py-2.5 px-3 rounded-lg border border-border text-sm font-medium hover:border-primary hover:bg-primary/10 hover:text-primary transition-all"
                      >
                        {format(parseISO(slot), "HH:mm")}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setStep("date")}
                    className="mt-4 text-sm text-muted-foreground hover:text-foreground"
                  >
                    ← Volver
                  </button>
                </>
              )}
            </div>
          )}

          {step === "confirm" && selectedService && selectedDate && selectedSlot && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border p-4 space-y-3">
                {[
                  { label: "Servicio", value: selectedService.name },
                  {
                    label: "Fecha",
                    value: format(selectedDate, "EEEE, d 'de' MMMM yyyy"),
                  },
                  { label: "Hora", value: format(parseISO(selectedSlot), "HH:mm") },
                  { label: "Duración", value: `${selectedService.duration_mins} minutos` },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium capitalize">{value}</span>
                  </div>
                ))}
                <div className="pt-3 border-t border-border flex justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold text-primary text-lg">
                    {selectedService.price.toLocaleString("es-ES", {
                      style: "currency",
                      currency: "EUR",
                    })}
                  </span>
                </div>
              </div>

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("time")}
                  className="flex-1 py-2.5 rounded-full border border-border text-sm font-medium hover:bg-secondary transition-colors"
                >
                  ← Volver
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={isPending}
                  className="flex-1 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Reservando…</>
                  ) : (
                    "Confirmar cita"
                  )}
                </button>
              </div>
            </div>
          )}

          {step === "success" && (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">¡Cita confirmada!</h3>
              <p className="text-muted-foreground text-sm mb-6">
                Tu reserva ha sido registrada. Te esperamos.
              </p>
              <button
                onClick={() => setOpen(false)}
                className="w-full py-2.5 rounded-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
              >
                Cerrar
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
