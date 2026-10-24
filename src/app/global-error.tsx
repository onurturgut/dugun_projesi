"use client";

import { useEffect } from "react";
import { RouteState } from "@/components/system/RouteState";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="tr">
      <body>
        <RouteState
          code="SİSTEM HATASI"
          title="ShineQR’a şu anda ulaşılamıyor."
          description="Geçici bir sorun oluştu. Yeniden deneyebilir veya ana sayfaya dönebilirsiniz."
          retry={reset}
        />
      </body>
    </html>
  );
}
