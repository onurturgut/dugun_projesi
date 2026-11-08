"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { DesignRequestWorkspace } from "@/components/admin/DesignRequestWorkspace";
import { Notice } from "@/components/admin/Fields";
import { api, type Wedding } from "@/lib/api";
export default function DesignSurfacePage() {
  const params = useParams<{ id: string; surface: string }>();
  const surface = (["qr", "loading", "wedding"] as const).includes(params.surface as "qr") ? params.surface as "qr" | "loading" | "wedding" : "qr";
  const event = useQuery({ queryKey: ["admin-wedding", params.id], queryFn: () => api<Wedding>(`/admin/weddings/${params.id}`) });
  return <AdminShell><Link className="admin-back" href={`/admin/${params.id}`}><ArrowLeft size={15}/> Organizasyona dön</Link>{event.isLoading ? <p className="admin-empty"><LoaderCircle className="animate-spin"/> Tasarım planı yükleniyor…</p> : event.error ? <Notice>{event.error.message}</Notice> : event.data ? <DesignRequestWorkspace event={event.data} initialSurface={surface}/> : null}</AdminShell>;
}
