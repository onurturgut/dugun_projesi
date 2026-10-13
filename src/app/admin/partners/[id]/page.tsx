"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Building2, CalendarDays, HardDrive, Users } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Notice } from "@/components/admin/Fields";
import { api, type Account, type Partner } from "@/lib/api";
import { formatBytes } from "@/lib/config";
type EventRow = { id: string; title: string; lifecycle_status?: string; wedding_date?: string; photo_count?: number; video_count?: number; media_bytes?: number };
type Activity = { at: string; action: string; actor_role?: string };
type Detail = { partner: Partner; events: EventRow[]; accounts: Account[]; activity: Activity[] };
export default function PartnerDetailPage() {
  const params = useParams<{ id: string }>();
  const detail = useQuery({ queryKey: ["partner-detail", params.id], queryFn: () => api<Detail>(`/admin/partners/${params.id}`) });
  if (detail.error) return <AdminShell><Notice>{detail.error.message}</Notice></AdminShell>;
  if (!detail.data) return <AdminShell><div className="admin-empty">İşletme yükleniyor…</div></AdminShell>;
  const { partner, events, accounts, activity } = detail.data;
  const media = events.reduce((sum, item) => sum + (item.photo_count || 0) + (item.video_count || 0), 0), bytes = events.reduce((sum, item) => sum + (item.media_bytes || 0), 0);
  return <AdminShell><Link href="/admin/partners" className="admin-back-link"><ArrowLeft size={15}/> İşletmelere dön</Link><div className="admin-heading"><div><p className="admin-kicker">İŞLETME DETAYI</p><h1>{partner.name}</h1><p className="admin-subtitle">Organizasyon, hesap, medya ve son hareketler.</p></div><span className={`admin-status-pill ${partner.active ? "active" : "inactive"}`}><i/>{partner.active ? "Aktif" : "Erişim kapalı"}</span></div>
  <section className="partner-stat-grid"><article><Building2/><span>Organizasyonlar</span><strong>{events.length}</strong></article><article><Users/><span>Yetkili ve müşteriler</span><strong>{accounts.length}</strong></article><article><HardDrive/><span>Medya</span><strong>{media}</strong></article><article><span>Depolama</span><strong>{formatBytes(bytes)}</strong></article></section>
  <div className="partner-detail-grid"><section className="admin-panel detail-list"><header><CalendarDays/><div><span>ORGANİZASYONLAR</span><h2>Son kayıtlar</h2></div></header>{events.map((event) => <Link href={`/admin/${event.id}`} key={event.id}><div><strong>{event.title}</strong><small>{event.wedding_date ? new Date(event.wedding_date).toLocaleDateString("tr-TR") : "Tarih yok"} · {event.lifecycle_status || "yayında"}</small></div><span>{(event.photo_count || 0) + (event.video_count || 0)} medya</span></Link>)}{!events.length ? <p>Organizasyon bulunmuyor.</p> : null}</section>
  <section className="admin-panel detail-list"><header><Users/><div><span>HESAPLAR</span><h2>Yetkili ve müşteriler</h2></div></header>{accounts.map((account) => <div className="detail-static-row" key={account.id}><div><strong>{account.display_name}</strong><small>{account.email}</small></div><span>{account.disabled ? "Kapalı" : account.role === "owner" ? "Müşteri" : "Yetkili"}</span></div>)}</section></div>
  <section className="admin-panel detail-list partner-activity"><header><div><span>SON HAREKETLER</span><h2>İşlem zaman çizelgesi</h2></div></header>{activity.map((item, index) => <div className="detail-static-row" key={`${item.at}-${index}`}><div><strong>{item.action}</strong><small>{item.actor_role || "Sistem"}</small></div><time>{new Date(item.at).toLocaleString("tr-TR")}</time></div>)}{!activity.length ? <p>İşlem kaydı bulunmuyor.</p> : null}</section>
  </AdminShell>;
}
