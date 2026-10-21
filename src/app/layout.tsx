import type { Metadata } from "next";
import Script from "next/script";
import { Providers } from "./providers";
import { ConsentManager } from "@/components/legal/ConsentManager";
import "../styles.css";
const authThemeScript = `try { const key = "shineqr-auth-theme"; const saved = localStorage.getItem(key); const theme = saved === "light" || saved === "dark" ? saved : (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"); document.documentElement.dataset.authTheme = theme; } catch (_) { document.documentElement.dataset.authTheme = "light"; }`;
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://shineqr.com",
  ),
  title: { default: "ShineQR | Özel Anılar İçin", template: "%s | ShineQR" },
  description:
    "Düğün ve etkinlik fotoğraflarını QR kodla tek bir özel albümde toplayın.",
  icons: {
    icon: "/brand/shineqr-mark.png",
    apple: "/brand/shineqr-mark.png",
  },
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
      </body>
    </html>
  );
}
