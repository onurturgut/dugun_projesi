"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  CreditCard,
  LoaderCircle,
  LockKeyhole,
  MonitorSmartphone,
  Sparkles,
} from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { LoadingDesignWorkspace } from "@/components/admin/LoadingDesignWorkspace";
import { QrDesignWorkspace } from "@/components/admin/QrDesignWorkspace";
import { WeddingDesignWorkspace } from "@/components/admin/WeddingDesignWorkspace";
import { Notice } from "@/components/admin/Fields";
import { api, type Wedding } from "@/lib/api";
import styles from "./page.module.css";

const surfaces = {
  qr: { label: "QR Kod", description: "Fiziksel QR tasarımınızı oluşturun", icon: CreditCard },
  loading: {
    label: "Loading Page",
    description: "QR aşamasından sonra açılır",
    icon: Sparkles,
  },
  wedding: {
    label: "Wedding Alanı",
    description: "Dijital düğün deneyiminizi oluşturun",
    icon: MonitorSmartphone,
  },
};

export default function DesignSurfacePage() {
  const params = useParams<{ id: string; surface: string }>();
  const surface =
    params.surface in surfaces
      ? (params.surface as keyof typeof surfaces)
      : "qr";
  const event = useQuery({
    queryKey: ["admin-wedding", params.id],
    queryFn: () => api<Wedding>(`/admin/weddings/${params.id}`),
  });
  const qrComplete = Boolean(event.data?.design?.qrCompleted);
  const loadingComplete = Boolean(event.data?.design?.loadingCompleted);
  const weddingComplete = Boolean(
    event.data?.design?.weddingCompleted &&
    event.data.design.weddingImage &&
    event.data.cover_images?.includes(event.data.design.weddingImage),
  );
  const surfaceLocked =
    (surface === "loading" && !qrComplete) ||
    (surface === "wedding" && (!qrComplete || !loadingComplete));
  return (
    <AdminShell>
      <Link className="admin-back" href={`/admin/${params.id}`}>
        <ArrowLeft size={15} /> Organizasyona dön
      </Link>
      <div className={styles.surfaceFlow} aria-label="Tasarım aşamaları">
        {Object.entries(surfaces).map(([id, item], index) => {
          const Icon = item.icon;
          const locked =
            (id === "loading" && !qrComplete) ||
            (id === "wedding" && (!qrComplete || !loadingComplete));
          const complete =
            (id === "qr" && qrComplete) ||
            (id === "loading" && loadingComplete) ||
            (id === "wedding" && weddingComplete);
          const content = <><span className={styles.surfaceNumber}>{complete ? <Check size={16} /> : locked ? <LockKeyhole size={15} /> : index + 1}</span><Icon size={19} /><span><strong>{item.label}</strong><small>{complete ? "Tamamlandı" : item.description}</small></span></>;
          return locked ? <div key={id} className={styles.surfaceItem} data-locked="true">{content}</div> : <Link key={id} className={styles.surfaceItem} href={`/admin/${params.id}/design/${id}`} aria-current={surface === id ? "step" : undefined}>{content}</Link>;
        })}
      </div>
      <div className={styles.content}>
          {event.isLoading ? (
            <p className="admin-empty">
              <LoaderCircle className="animate-spin" /> Tasarım yükleniyor…
            </p>
          ) : event.error ? (
            <Notice>{event.error.message}</Notice>
          ) : event.data && surface === "qr" ? (
            <QrDesignWorkspace key={`${event.data.id}-qr`} event={event.data} />
          ) : event.data && surface === "loading" && !surfaceLocked ? (
            <LoadingDesignWorkspace
              key={`${event.data.id}-loading`}
              event={event.data}
            />
          ) : event.data && surface === "wedding" && !surfaceLocked ? (
            <WeddingDesignWorkspace
              key={`${event.data.id}-wedding`}
              event={event.data}
            />
          ) : event.data && surfaceLocked ? (
            <section className={styles.lockedState}>
              <LockKeyhole size={30} />
              <span>SIRALI TASARIM AKIŞI</span>
              <h1>{surfaces[surface].label} henüz kilitli</h1>
              <p>{surface === "loading" ? "Loading Page’e geçmek için önce QR tasarımını kaydedip QR aşamasını tamamlayın." : "Wedding alanını açmak için önce Loading tasarımını seçip aşamayı tamamlayın."}</p>
              <Link href={`/admin/${params.id}/design/${surface === "loading" ? "qr" : "loading"}`}>{surface === "loading" ? "QR tasarımına dön" : "Loading tasarımına dön"}</Link>
            </section>
          ) : null}
      </div>
    </AdminShell>
  );
}
