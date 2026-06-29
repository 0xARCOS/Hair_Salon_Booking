import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Irene Hair Salon | Guadalajara",
  description: "Peluquería premium en Guadalajara. Reserva tu cita online.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${fontSans.variable} font-sans antialiased min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
