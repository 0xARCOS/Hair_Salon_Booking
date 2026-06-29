import Link from "next/link";
import { Scissors, Clock, Star, MapPin, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BookingWizard } from "@/components/booking/BookingWizard";
import { Navbar } from "@/components/shared/Navbar";
import type { Service } from "@/types/database";

export default async function HomePage() {
  const supabase = await createClient();

  const [{ data: services }, { data: { user } }] = await Promise.all([
    supabase.from("services").select("*").order("price", { ascending: true }),
    supabase.auth.getUser(),
  ]);

  return (
    <div className="min-h-screen">
      <Navbar user={user} />

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-accent/20" />
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />

        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto pt-16">
          <div className="inline-flex items-center gap-2 text-primary text-sm font-medium mb-6 border border-primary/30 rounded-full px-4 py-1.5 bg-primary/5">
            <Star className="w-3.5 h-3.5 fill-primary" />
            <span>Peluquería premium en Guadalajara</span>
          </div>

          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight mb-6 leading-tight">
            Transforma{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-amber-400">
              tu look
            </span>
          </h1>

          <p className="text-muted-foreground text-lg sm:text-xl max-w-2xl mx-auto mb-10">
            Técnicas avanzadas, atención personalizada. Tu cabello merece lo mejor.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <BookingWizard services={services ?? []} user={user} />
            <Link
              href="#servicios"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full border border-border text-foreground hover:bg-secondary transition-colors font-medium"
            >
              Ver servicios
            </Link>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="servicios" className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Nuestros Servicios</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Cada servicio está diseñado para realzar tu belleza natural con técnicas de vanguardia.
            </p>
          </div>

          {services && services.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((service: Service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <Scissors className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>Los servicios aparecerán aquí cuando sean configurados desde el panel de administración.</p>
            </div>
          )}
        </div>
      </section>

      {/* Info strip */}
      <section className="py-16 px-4 border-t border-border">
        <div className="max-w-6xl mx-auto grid sm:grid-cols-3 gap-8 text-center">
          {[
            { icon: <MapPin className="w-5 h-5 text-primary" />, label: "Ubicación", value: "Guadalajara, España" },
            { icon: <Clock className="w-5 h-5 text-primary" />, label: "Horario", value: "Lun–Sáb: 9:00 – 18:00" },
            { icon: <Phone className="w-5 h-5 text-primary" />, label: "Reservas", value: "Online 24 horas" },
          ].map(({ icon, label, value }) => (
            <div key={label} className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                {icon}
              </div>
              <div>
                <p className="font-semibold">{label}</p>
                <p className="text-muted-foreground text-sm">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="py-8 px-4 border-t border-border text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} Irene Hair Salon. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}

function ServiceCard({ service }: { service: Service }) {
  return (
    <div className="group relative p-6 rounded-2xl border border-border bg-card hover:border-primary/40 hover:bg-accent/20 transition-all duration-300 hover:-translate-y-1">
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
          <Scissors className="w-5 h-5 text-primary" />
        </div>
        {service.is_multi_session && (
          <span className="text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">
            Multi-sesión
          </span>
        )}
      </div>
      <h3 className="font-semibold text-lg mb-2">{service.name}</h3>
      <p className="text-sm text-muted-foreground flex items-center gap-1">
        <Clock className="w-3.5 h-3.5" />
        {service.duration_mins} minutos
      </p>
      <div className="mt-4 pt-4 border-t border-border">
        <span className="text-2xl font-bold text-primary">
          {service.price.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
        </span>
      </div>
    </div>
  );
}
