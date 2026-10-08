"use client";
import { useState } from "react";
import { Download, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

export function ArchiveButton({ weddingId }: { weddingId: string }) {
  const [busy, setBusy] = useState(false);
  const start = async () => {
    setBusy(true);
    try {
      const job = await api<{ id: string }>(
        `/admin/weddings/${weddingId}/archive-jobs`,
        { method: "POST" },
      );
      for (let attempt = 0; attempt < 120; attempt++) {
        const result = await api<{
          status: string;
          url: string | null;
          error: string | null;
        }>(`/admin/weddings/${weddingId}/archive-jobs/${job.id}`);
        if (result.status === "ready" && result.url) {
          window.location.assign(result.url);
          toast.success("Albüm arşivi hazırlandı.");
          return;
        }
        if (result.status === "failed")
          throw new Error(result.error || "Arşiv oluşturulamadı.");
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
      throw new Error(
        "Arşiv hazırlanıyor. Birkaç dakika sonra tekrar deneyin.",
      );
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <button className="admin-button" disabled={busy} onClick={start}>
      {busy ? (
        <LoaderCircle className="animate-spin" size={16} />
      ) : (
        <Download size={16} />
      )}
      {busy ? " Arşiv hazırlanıyor" : " Tüm albümü indir"}
    </button>
  );
}
