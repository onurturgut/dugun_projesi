"use client";

import Image from "next/image";
import { ImagePlus, LoaderCircle } from "lucide-react";
import { useRef, useState } from "react";
import { prepareAdminImage } from "./CoverUpload";

export function PartnerLogoUpload({
  partnerId,
  partnerName,
  value,
  disabled,
  draft = false,
  onUploaded,
}: {
  partnerId: string;
  partnerName: string;
  value: string;
  disabled?: boolean;
  draft?: boolean;
  onUploaded: (url: string) => Promise<void>;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function upload(file?: File) {
    if (!file || busy || disabled) return;
    setBusy(true);
    setError("");
    try {
      const blob = await prepareAdminImage(file);
      const form = new FormData();
      form.append("file", blob, "logo.webp");
      form.append("partner_id", partnerId);
      if (draft) form.append("draft_partner", "1");
      const response = await fetch("/api/admin/covers", {
        method: "POST",
        body: form,
      });
      const result = (await response.json()) as {
        url?: string;
        error?: string;
      };
      if (!response.ok || !result.url)
        throw new Error(result.error || "Logo yüklenemedi.");
      await onUploaded(result.url);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Logo yüklenemedi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="partner-logo-control">
      <button
        type="button"
        className="partner-logo-button"
        disabled={busy || disabled}
        onClick={() => input.current?.click()}
        aria-label={`${partnerName} logosunu ${value ? "değiştir" : "yükle"}`}
      >
        {value ? (
          <Image
            src={value}
            alt={`${partnerName} logosu`}
            fill
            unoptimized
            sizes="112px"
            className="object-cover"
          />
        ) : busy ? (
          <LoaderCircle size={28} className="animate-spin" />
        ) : (
          <ImagePlus size={28} />
        )}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          void upload(file);
        }}
      />
      <span>
        {busy ? "Yükleniyor…" : value ? "Logoyu değiştir" : "Logo yükle"}
      </span>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
