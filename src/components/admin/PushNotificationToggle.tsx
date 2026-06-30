"use client";

import { useState } from "react";
import { requestPushPermission } from "@/lib/firebase/client";
import { savePushToken } from "@/actions/push";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PushNotificationToggle() {
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  async function handleSubscribe() {
    setIsSubscribing(true);
    setMessage(null);
    try {
      const token = await requestPushPermission();
      if (!token) {
        setMessage({ text: "No se pudieron activar las notificaciones o el navegador no lo soporta.", error: true });
        return;
      }
      
      const result = await savePushToken(token);
      if (result.error) {
        setMessage({ text: result.error, error: true });
      } else {
        setMessage({ text: "Notificaciones activadas correctamente.", error: false });
      }
    } catch {
      setMessage({ text: "Error al activar notificaciones.", error: true });
    } finally {
      setIsSubscribing(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button 
        onClick={handleSubscribe} 
        disabled={isSubscribing}
        variant="outline"
        className="gap-2"
      >
        <Bell className="w-4 h-4" />
        {isSubscribing ? "Activando..." : "Activar Notificaciones"}
      </Button>
      {message && (
        <p className={`text-sm ${message.error ? "text-red-500" : "text-green-500"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
