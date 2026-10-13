import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Providers } from "./providers";
import "../styles.css";
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
    <html lang="tr">
      <body>
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
