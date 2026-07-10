import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { MessageCircle } from "lucide-react";

interface WhatsAppReminderButtonProps {
  clientName: string;
  clientPhone: string;
  startTime: string;
  serviceName?: string | null;
}

// Genera un link wa.me con el mensaje precargado: un clic, sin backend ni
// API de pago. Staff confirma el envío manualmente desde su WhatsApp.
export function WhatsAppReminderButton({
  clientName,
  clientPhone,
  startTime,
  serviceName,
}: WhatsAppReminderButtonProps) {
  const phone = clientPhone.replace(/\D/g, "");
  const when = format(parseISO(startTime), "EEEE d 'de' MMMM 'a las' HH:mm", {
    locale: es,
  });
  const message = `Hola ${clientName}, te recordamos tu cita en Irene Hair Salon el ${when}${
    serviceName ? ` para ${serviceName}` : ""
  }. ¡Te esperamos!`;
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg px-2.5 py-1.5 transition-colors"
      title="Recordar por WhatsApp"
    >
      <MessageCircle className="w-3.5 h-3.5" />
      WhatsApp
    </a>
  );
}
