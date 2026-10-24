"use client";

import { useEffect } from "react";
import { RouteState } from "@/components/system/RouteState";

export default function ErrorPage({
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
    <RouteState
      code="BEKLENMEYEN HATA"
      title="Bu sayfa şu anda açılamıyor."
      description="Bilgileriniz korunuyor. Bağlantınızı kontrol edip işlemi yeniden deneyebilirsiniz."
      retry={reset}
    />
  );
}
