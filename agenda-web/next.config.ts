import path from "node:path";
import type { NextConfig } from "next";

function buildContentSecurityPolicy(): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  let supabaseOrigin = "";
  try {
    if (supabaseUrl) supabaseOrigin = new URL(supabaseUrl).origin;
  } catch {
    supabaseOrigin = "";
  }

  const connectSrc = [
    "'self'",
    supabaseOrigin,
    supabaseOrigin ? supabaseOrigin.replace(/^https:/, "wss:") : "",
    "https://exp.host",
    "wss://*.supabase.co",
  ]
    .filter(Boolean)
    .join(" ");

  const imgSrc = ["'self'", "data:", "blob:", supabaseOrigin].filter(Boolean).join(" ");

  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    `connect-src ${connectSrc}`,
    `img-src ${imgSrc}`,
    "font-src 'self' https://fonts.gstatic.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Content-Security-Policy", value: buildContentSecurityPolicy() },
];

/** Hostname do Supabase Storage para o componente <Image>. */
function supabaseImageHostname(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

const supabaseImgHost = supabaseImageHostname();

const appRoot = path.resolve(__dirname);

const isDev = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
  // O repo vive no iCloud Drive. Escrever .next lá congela o File Provider
  // e o localhost para de responder. Pasta *.nosync fica fora da sync.
  distDir: isDev ? ".next.nosync" : ".next",
  allowedDevOrigins: ["127.0.0.1"],
  // Trava o root neste app. process.cwd() sobe para o monorepo e o bundler
  // passa a observar mobile, docs e caches — o que trava o compile.
  turbopack: {
    root: appRoot,
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          "**/node_modules/**",
          "**/.next/**",
          "**/.next.nosync/**",
          "**/docs/**",
        ],
      };
    }
    return config;
  },
  images: supabaseImgHost
    ? {
        remotePatterns: [
          {
            protocol: "https",
            hostname: supabaseImgHost,
            pathname: "/storage/v1/object/public/**",
          },
        ],
      }
    : undefined,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
