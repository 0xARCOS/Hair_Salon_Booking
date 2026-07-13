import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Aviso de privacidad · Irene Rodríguez · Salón de Belleza Unisex",
  description:
    "Qué datos personales guarda el salón, con qué fin y cómo ejercer tus derechos.",
  alternates: { canonical: "/privacidad" },
};

// Texto honesto y mínimo: refleja exactamente lo que la agenda del salón
// guarda hoy (ver supabase/schema.sql y las fichas locales de apps/agenda).
// Si el tratamiento de datos cambia, esta página debe cambiar con él.
export default function PrivacidadPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-sm uppercase tracking-widest text-muted-foreground">
        Salón de Belleza Unisex Irene Rodríguez
      </p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl text-foreground">
        Aviso de privacidad
      </h1>

      <div className="mt-8 space-y-6 leading-relaxed text-foreground/90">
        <section>
          <h2 className="mb-2 text-lg font-semibold">Qué datos guardamos</h2>
          <p>
            Cuando reservas o acudes al salón guardamos los datos necesarios para
            atenderte: tu nombre, tu teléfono, tu correo electrónico si nos lo das,
            el historial de tus citas y notas internas del servicio (por ejemplo,
            preferencias, fórmulas de color aplicadas y, si nos las indicas,
            alergias o sensibilidades relevantes para tratamientos). Con tu
            permiso, también fotos del resultado de tu servicio para referencia en
            futuras visitas.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">Para qué los usamos</h2>
          <p>
            Únicamente para gestionar tus citas, recordártelas por teléfono o
            WhatsApp y darte un mejor servicio en tu siguiente visita. No usamos
            tus datos para publicidad, no los vendemos y no los compartimos con
            terceros.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">Dónde se almacenan</h2>
          <p>
            Los datos se guardan en la herramienta de agenda privada del salón,
            protegida con contraseña y accesible solo por el personal. Las notas
            de servicio más sensibles pueden guardarse además cifradas. Este sitio
            web público no usa cookies ni recoge datos de quien lo visita.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">Tus derechos</h2>
          <p>
            Puedes pedirnos en cualquier momento ver los datos que tenemos sobre
            ti, corregirlos o que los eliminemos por completo. Basta con
            decírnoslo en el salón o por los medios de contacto de esta web y lo
            haremos sin condiciones.
          </p>
        </section>
      </div>

      <p className="mt-12">
        <Link href="/" className="text-primary underline underline-offset-4">
          ← Volver al inicio
        </Link>
      </p>
    </main>
  );
}
