import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const brandSerif = Playfair_Display({
  variable: "--font-brand-serif",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0c10" },
  ],
};

export const metadata: Metadata = {
  title: "Agenda Online",
  description: "App de agendamento online para profissionais",
  icons: {
    icon: [
      {
        url: "/icons/icon-light.png",
        type: "image/png",
        sizes: "755x1024",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icons/icon-dark.png",
        type: "image/png",
        sizes: "755x1024",
        media: "(prefers-color-scheme: dark)",
      },
    ],
    apple: [
      {
        url: "/icons/icon-light.png",
        sizes: "180x180",
        type: "image/png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icons/icon-dark.png",
        sizes: "180x180",
        type: "image/png",
        media: "(prefers-color-scheme: dark)",
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
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} ${brandSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
