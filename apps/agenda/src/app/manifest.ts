import type { MetadataRoute } from "next";

// El icono es SVG (válido para instalación en Chrome/Edge). TODO opcional:
// añadir versiones PNG 192/512 para máxima compatibilidad (Safari iOS).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Agenda · Irene Hair Salon",
    short_name: "Agenda Irene",
    description: "Agenda privada de citas y fichas de clientas.",
    start_url: "/agenda",
    display: "standalone",
    background_color: "#fdf9f4",
    theme_color: "#a87d6f",
    icons: [
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
