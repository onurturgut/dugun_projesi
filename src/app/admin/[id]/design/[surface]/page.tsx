"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CreditCard,
  LoaderCircle,
  MonitorSmartphone,
  Sparkles,
} from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { DesignPanel } from "@/components/admin/DesignPanel";
import { Notice } from "@/components/admin/Fields";
import { api, type Wedding } from "@/lib/api";

const surfaces = {
  wedding: {
    label: "Wedding sayfası",
    icon: MonitorSmartphone,
    preview: "page" as const,
  },
  loading: {
    label: "Loading / Açılış",
    icon: Sparkles,
    preview: "opening" as const,
  },
  qr: { label: "QR kartı", icon: CreditCard, preview: "card" as const },
};

export default function DesignSurfacePage() {
  const params = useParams<{ id: string; surface: string }>();
  const surface =
    params.surface in surfaces
      ? (params.surface as keyof typeof surfaces)
      : "wedding";
  const event = useQuery({
    queryKey: ["admin-wedding", params.id],
    queryFn: () => api<Wedding>(`/admin/weddings/${params.id}`),
  });
  return (
    <AdminShell>
      <Link className="admin-back" href={`/admin/${params.id}`}>
        <ArrowLeft size={15} /> Organizasyona dön
      </Link>
      <div className="admin-design-workspace">
        <aside className="admin-design-sidebar">
          <p className="admin-kicker">TASARIM STÜDYOSU</p>
          <h1>Deneyim yüzeyleri</h1>
          <nav>
            {Object.entries(surfaces).map(([id, item]) => {
              const Icon = item.icon;
              return (
                <Link
                  key={id}
                  href={`/admin/${params.id}/design/${id}`}
                  aria-current={surface === id ? "page" : undefined}
                >
                  <Icon size={17} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <div className="admin-design-content">
          {event.isLoading ? (
            <p className="admin-empty">
              <LoaderCircle className="animate-spin" /> Tasarım yükleniyor…
            </p>
          ) : event.error ? (
            <Notice>{event.error.message}</Notice>
          ) : event.data ? (
            <DesignPanel
              key={`${event.data.id}-${surface}`}
              event={event.data}
              initialPreview={surfaces[surface].preview}
              surface={surfaces[surface].preview}
            />
          ) : null}
        </div>
      </div>
    </AdminShell>
  );
}
