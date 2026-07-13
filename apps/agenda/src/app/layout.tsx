import type { Metadata, Viewport } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { brand } from "@/config/brand";
import "./globals.css";

// Misma pareja tipográfica que la web pública (ver docs/DESIGN.md).
const fontSans = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontDisplay = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["SOFT", "opsz"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: `Agenda · ${brand.fullName}`,
  description: `${brand.description} — ${brand.fullName}.`,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: `Agenda ${brand.shortName}`,
  },
};

export const viewport: Viewport = {
  themeColor: "#a87d6f",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${fontSans.variable} ${fontDisplay.variable} font-sans antialiased min-h-screen`}
      >
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
