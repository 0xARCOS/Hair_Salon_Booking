import { createClient } from "@salon-app/supabase/server";
import { LandingClient } from "@/components/landing/LandingClient";
import type { Service } from "@salon-app/supabase";

export default async function HomePage() {
  let services: Service[] = [];

  // La landing debe renderizar siempre, aunque Supabase aún no esté
  // configurado (modo previsualización del diseño).
  try {
    const supabase = await createClient();
    const { data: servicesData } = await supabase
      .from("services")
      .select("*")
      .order("price", { ascending: true });
    services = (servicesData as Service[]) ?? [];
  } catch {
    // Sin claves de Supabase: se muestra el diseño sin datos dinámicos.
  }

  return <LandingClient services={services} />;
}
