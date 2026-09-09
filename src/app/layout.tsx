import type { Metadata } from "next";
import { Providers } from "./providers";
import "../styles.css";
export const metadata: Metadata = {
  title: "Düğün Anıları",
  description: "Fotoğraf ve videolarınızla bu özel günü ölümsüzleştirin.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className="dark">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
