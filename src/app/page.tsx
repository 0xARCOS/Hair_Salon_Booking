import { createClient } from "@/lib/supabase/server";
import { LandingClient } from "@/components/landing/LandingClient";
import type { Service } from "@/types/database";
import type { User } from "@supabase/supabase-js";

export default async function HomePage() {
  let services: Service[] = [];
  let user: User | null = null;

  // La landing debe renderizar siempre, aunque Supabase aún no esté
  // configurado (modo previsualización del diseño).
  try {
    const supabase = await createClient();
    const [{ data: servicesData }, { data: userData }] = await Promise.all([
      supabase.from("services").select("*").order("price", { ascending: true }),
      supabase.auth.getUser(),
    ]);
    services = (servicesData as Service[]) ?? [];
    user = userData?.user ?? null;
  } catch {
    // Sin claves de Supabase: se muestra el diseño sin datos dinámicos.
  }

  return <LandingClient services={services} user={user} />;
}
