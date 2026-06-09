import type { MetadataRoute } from "next";

/** PWA/meta; navegadores ainda diferem quanto ao ícone por tema — favicons em layout.tsx tratam prefers-color-scheme. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Agenda Online",
    short_name: "Agenda Online",
    description: "App de agendamento online para profissionais",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#8b5cf6",
    icons: [
      {
        src: "/icons/icon-light.png",
        type: "image/png",
        sizes: "755x1024",
        purpose: "any",
      },
      {
        src: "/icons/icon-dark.png",
        type: "image/png",
        sizes: "755x1024",
        purpose: "any",
      },
    ],
  };
}
