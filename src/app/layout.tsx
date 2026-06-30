import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Outfit, Cormorant_Garamond } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

// Fuentes de la identidad del salón (usadas en la landing)
const fontBody = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-body",
});

const fontDisplay = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "600"],
  style: ["normal", "italic"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Irene Rodríguez · Salón de Belleza Unisex · Guadalajara",
  description:
    "Salón de belleza unisex en Guadalajara. Cortes, color, tratamientos y estética con más de 10 años de experiencia. Reserva tu cita online.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${fontSans.variable} ${fontBody.variable} ${fontDisplay.variable} font-sans antialiased min-h-screen`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
