import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Providers } from "./providers";
import { ConsentManager } from "@/components/legal/ConsentManager";
import { PwaRegistrar } from "@/components/system/PwaRegistrar";
import "../styles.css";
const authThemeScript = `try { const key = "shineqr-auth-theme"; const saved = localStorage.getItem(key); const theme = saved === "light" || saved === "dark" ? saved : (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"); document.documentElement.dataset.authTheme = theme; } catch (_) { document.documentElement.dataset.authTheme = "light"; }`;
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://shineqr.com",
  ),
  title: { default: "ShineQR | Özel Anılar İçin", template: "%s | ShineQR" },
  description:
    "Düğün ve etkinlik fotoğraflarını QR kodla tek bir özel albümde toplayın.",
  applicationName: "ShineQR",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ShineQR",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/pwa/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/pwa/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/pwa/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f1e8" },
    { media: "(prefers-color-scheme: dark)", color: "#120b08" },
  ],
  colorScheme: "light dark",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" data-auth-theme="light" suppressHydrationWarning>
      <body>
        <Script id="shineqr-auth-theme" strategy="beforeInteractive">
          {authThemeScript}
        </Script>
        <Providers>{children}</Providers>
        <ConsentManager />
        <PwaRegistrar />
      </body>
    </html>
  );
}
