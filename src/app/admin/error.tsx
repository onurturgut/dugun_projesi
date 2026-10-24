"use client";

import { useEffect } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { RouteState } from "@/components/system/RouteState";

export default function AdminError({
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
    <AdminShell>
      <RouteState
        code="YÖNETİM PANELİ"
        title="Bu alan yüklenemedi."
        description="Kaydedilmiş verileriniz etkilenmedi. Sayfayı yeniden yükleyerek devam edebilirsiniz."
        retry={reset}
        homeHref="/admin"
        homeLabel="Organizasyonlara dön"
        compact
      />
    </AdminShell>
  );
}
