import type { MetadataRoute } from "next";

/** PWA/meta; navegadores ainda diferem quanto ao ícone por tema — favicons em layout.tsx tratam prefers-color-scheme. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lillo",
    short_name: "Lillo",
    description: "Lillo — agenda online para profissionais. Elegante, clara e fácil de usar.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f2ee",
    theme_color: "#b8899e",
    icons: [
      {
        src: "/icons/lillo-192.png",
        type: "image/png",
        sizes: "192x192",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        type: "image/png",
        sizes: "512x512",
        purpose: "any",
      },
    ],
  };
}
