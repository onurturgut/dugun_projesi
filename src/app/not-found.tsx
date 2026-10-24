import type { Metadata } from "next";
import { RouteState } from "@/components/system/RouteState";

export const metadata: Metadata = {
  title: "Sayfa bulunamadı",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <RouteState
      code="404"
      title="Aradığınız sayfa burada değil."
      description="Bağlantı değişmiş veya sayfa kaldırılmış olabilir. Ana sayfaya dönerek devam edebilirsiniz."
    />
  );
}
