import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Providers } from "./providers";
import "../styles.css";
export const metadata: Metadata = {
  title: "ShineQR | Özel Anılar İçin",
  description: "Fotoğraf ve videolarınızla bu özel günü ölümsüzleştirin.",
  icons: {
    icon: "/brand/shineqr-mark.png",
    apple: "/brand/shineqr-mark.png",
  },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className="dark">
      <body>
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
