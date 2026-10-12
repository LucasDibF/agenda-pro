import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f2ee" },
    { media: "(prefers-color-scheme: dark)", color: "#161014" },
  ],
};

const lilloDescription =
  "Lillo — agenda online para profissionais. Elegante, clara e fácil de usar.";

export const metadata: Metadata = {
  title: {
    default: "Lillo",
    template: "%s · Lillo",
  },
  applicationName: "Lillo",
  description: lilloDescription,
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Lillo",
    title: "Lillo",
    description: lilloDescription,
    images: [{ url: "/icons/lillo-192.png", width: 192, height: 192, alt: "Lillo" }],
  },
  twitter: {
    card: "summary",
    title: "Lillo",
    description: lilloDescription,
    images: ["/icons/lillo-192.png"],
  },
  appleWebApp: {
    capable: true,
    title: "Lillo",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      {
        url: "/icons/lillo-192.png",
        type: "image/png",
        sizes: "192x192",
      },
      {
        url: "/icons/icon-512.png",
        type: "image/png",
        sizes: "512x512",
      },
    ],
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
