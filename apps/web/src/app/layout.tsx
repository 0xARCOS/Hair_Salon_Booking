import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { SITE_URL } from "@/config/site";
import "./globals.css";

// Pareja tipográfica de la identidad (ver docs/DESIGN.md):
// Fraunces para display, Outfit para cuerpo y etiquetas utilitarias.
const fontDisplay = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["SOFT", "opsz"],
  variable: "--font-display",
});

const fontBody = Outfit({
  subsets: ["latin"],
  variable: "--font-body",
});

// TODO: nombre/descripción real de la clienta antes de publicar (ver
// docs/TEMPLATE.md) — mismo criterio que los TODO en LandingClient.tsx.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Irene Rodríguez · Salón de Belleza Unisex · Guadalajara",
  description:
    "Salón de belleza unisex en Guadalajara. Cortes, color, tratamientos y estética con más de 10 años de experiencia. Reserva por teléfono o WhatsApp.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "es_MX",
    url: "/",
    siteName: "Irene Rodríguez · Salón de Belleza Unisex",
    title: "Irene Rodríguez · Salón de Belleza Unisex · Guadalajara",
    description:
      "Cortes, color, tratamientos y estética con más de 10 años de experiencia. Reserva por teléfono o WhatsApp.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${fontBody.variable} ${fontDisplay.variable} antialiased min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
