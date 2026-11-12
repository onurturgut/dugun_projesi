"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Building2, CalendarDays, Save, ShieldCheck, Palette, Plus, Trash2, Users, WalletCards, Plug, Database } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { PartnerSettings } from "@/lib/models";
import { Notice } from "./Fields";

const notices: Record<keyof PartnerSettings["notifications"], string> = {
  approval_updates: "Organizasyon onay ve düzeltme güncellemeleri",
  photographer_delivery: "Fotoğrafçı teslimatları ve gecikmeler",
  quota_warning: "Depolama kotası uyarıları",
  retention_warning: "Saklama süresi hatırlatmaları",
  print_updates: "Baskı üretimi ve teslimat güncellemeleri",
  finance_updates: "Komisyon ve hakediş güncellemeleri",
  weekly_summary: "Haftalık işletme özeti",
};

export function PartnerSettingsPanel() {
  const qc = useQueryClient();
  const [form, setForm] = useState<PartnerSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const settings = useQuery({ queryKey: ["partner-settings"], queryFn: () => api<PartnerSettings>("/admin/partner-settings") });
  useEffect(() => { if (settings.data) setForm(settings.data); }, [settings.data]);
  const profile = (key: keyof PartnerSettings["profile"], value: string | string[]) => setForm((current) => current ? ({ ...current, profile: { ...current.profile, [key]: value } }) : current);
  const defaults = (key: keyof PartnerSettings["organization_defaults"], value: string) => setForm((current) => current ? ({ ...current, organization_defaults: { ...current.organization_defaults, [key]: value } }) : current);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!form) return;
    setBusy(true);
    try {
      const updated = await api<PartnerSettings>("/admin/partner-settings", { method: "PATCH", body: JSON.stringify({ profile: form.profile, brand: form.brand, locations: form.locations, organization_defaults: form.organization_defaults, notifications: form.notifications, privacy: form.privacy }) });
      setForm(updated);
      await qc.invalidateQueries({ queryKey: ["partner-settings"] });
      toast.success("İşletme ayarları kaydedildi.");
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "Ayarlar kaydedilemedi."); }
    finally { setBusy(false); }
  }
  if (settings.error) return <Notice>{settings.error.message}</Notice>;
  if (!form) return <div className="admin-empty">İşletme ayarları yükleniyor…</div>;
  return <form id="business-settings" className="partner-settings-form account-business-settings" onSubmit={save}>
    <div className="account-settings-section-title"><span>İŞLETME</span><h2>İşletme ayarları</h2><p>Marka profilinizi, yeni organizasyon başlangıçlarını ve operasyon bildirimlerini yönetin.</p></div>
    <section className="admin-panel partner-settings-section"><header><Building2 size={21}/><div><h3>İşletme profili</h3><p>Müşteri ve ekip iletişiminde kullanılacak bilgiler.</p></div></header><div className="partner-settings-grid">
      <label className="form-field"><span>Görünen işletme adı</span><input value={form.profile.public_name} maxLength={160} onChange={(e) => profile("public_name", e.target.value)}/></label>
      <label className="form-field"><span>Operasyon sorumlusu</span><input value={form.profile.operations_contact_name} maxLength={100} onChange={(e) => profile("operations_contact_name", e.target.value)}/></label>
      <label className="form-field"><span>Operasyon e-postası</span><input type="email" value={form.profile.operations_contact_email} maxLength={254} onChange={(e) => profile("operations_contact_email", e.target.value)}/></label>
      <label className="form-field"><span>Çalışma saatleri</span><input value={form.profile.working_hours} maxLength={240} placeholder="Pazartesi–Cumartesi 09.00–19.00" onChange={(e) => profile("working_hours", e.target.value)}/></label>
      <label className="form-field"><span>Web sitesi (HTTPS)</span><input type="url" value={form.profile.website_url} maxLength={500} placeholder="https://" onChange={(e) => profile("website_url", e.target.value)}/></label>
      <label className="form-field"><span>Instagram adresi (HTTPS)</span><input type="url" value={form.profile.instagram_url} maxLength={500} placeholder="https://instagram.com/…" onChange={(e) => profile("instagram_url", e.target.value)}/></label>
      <label className="form-field partner-settings-wide"><span>Hizmet verilen şehirler</span><input value={form.profile.service_cities.join(", ")} placeholder="Muğla, Antalya, İzmir" onChange={(e) => profile("service_cities", e.target.value.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 20))}/><small>Şehirleri virgülle ayırın.</small></label>
    </div></section>
    <section id="brand-settings" className="admin-panel partner-settings-section"><header><Palette size={21}/><div><h3>Marka ve müşteri görünümü</h3><p>Müşteri temas noktalarında gösterilecek destek ve marka bilgileri.</p></div></header><div className="partner-settings-grid">
      <label className="form-field"><span>Müşteriye görünen ad</span><input value={form.brand.customer_facing_name} maxLength={160} onChange={(e) => setForm({ ...form, brand: { ...form.brand, customer_facing_name: e.target.value } })}/></label>
      <label className="form-field"><span>Kurumsal renk</span><input type="color" value={form.brand.primary_color} onChange={(e) => setForm({ ...form, brand: { ...form.brand, primary_color: e.target.value } })}/></label>
      <label className="form-field"><span>Destek telefonu</span><input inputMode="numeric" placeholder="05xxxxxxxxx" value={form.brand.support_phone} onChange={(e) => setForm({ ...form, brand: { ...form.brand, support_phone: e.target.value.replace(/\D/g, "").slice(0, 11) } })}/></label>
      <label className="form-field"><span>Destek e-postası</span><input type="email" value={form.brand.support_email} onChange={(e) => setForm({ ...form, brand: { ...form.brand, support_email: e.target.value } })}/></label>
      <label className="form-field partner-settings-wide"><span>Karşılama metni</span><textarea value={form.brand.welcome_text} maxLength={500} onChange={(e) => setForm({ ...form, brand: { ...form.brand, welcome_text: e.target.value } })}/></label>
      <label className="form-field partner-settings-wide"><span>Tamamlanma mesajı</span><textarea value={form.brand.completion_text} maxLength={500} onChange={(e) => setForm({ ...form, brand: { ...form.brand, completion_text: e.target.value } })}/></label>
      <label className="partner-setting-toggle partner-settings-wide"><span><strong>Partner markasını göster</strong><small>Müşteri alanlarında işletme adını ve destek bilgisini gösterir.</small></span><input type="checkbox" checked={form.brand.show_partner_brand} onChange={(e) => setForm({ ...form, brand: { ...form.brand, show_partner_brand: e.target.checked } })}/></label>
    </div></section>
    <section id="locations-settings" className="admin-panel partner-settings-section"><header><CalendarDays size={21}/><div><h3>Salonlar ve çalışma planı</h3><p>Şube, salon ve hizmet noktalarınızı tanımlayın. Bu alan rezervasyon oluşturmaz.</p></div></header>
      <div className="partner-location-list">{form.locations.map((location, index) => <article key={location.id}><div className="partner-location-head"><strong>{location.name || `${index + 1}. hizmet noktası`}</strong><button type="button" className="admin-button danger" onClick={() => setForm({ ...form, locations: form.locations.filter((item) => item.id !== location.id) })}><Trash2 size={14}/> Kaldır</button></div><div className="partner-settings-grid">
        <label className="form-field"><span>Salon / şube adı</span><input value={location.name} maxLength={160} onChange={(e) => setForm({ ...form, locations: form.locations.map((item) => item.id === location.id ? { ...item, name: e.target.value } : item) })}/></label>
        <label className="form-field"><span>Kapasite</span><input type="number" min={1} max={100000} value={location.capacity || ""} onChange={(e) => setForm({ ...form, locations: form.locations.map((item) => item.id === location.id ? { ...item, capacity: e.target.value ? Number(e.target.value) : null } : item) })}/></label>
        <label className="form-field partner-settings-wide"><span>Adres</span><input value={location.address} maxLength={500} onChange={(e) => setForm({ ...form, locations: form.locations.map((item) => item.id === location.id ? { ...item, address: e.target.value } : item) })}/></label>
        <label className="form-field"><span>Harita adresi (HTTPS)</span><input type="url" value={location.map_url} onChange={(e) => setForm({ ...form, locations: form.locations.map((item) => item.id === location.id ? { ...item, map_url: e.target.value } : item) })}/></label>
        <label className="form-field"><span>Çalışma saatleri</span><input value={location.working_hours} maxLength={240} onChange={(e) => setForm({ ...form, locations: form.locations.map((item) => item.id === location.id ? { ...item, working_hours: e.target.value } : item) })}/></label>
      </div></article>)}</div>
      <button type="button" className="admin-button" disabled={form.locations.length >= 20} onClick={() => setForm({ ...form, locations: [...form.locations, { id: crypto.randomUUID(), name: "Yeni salon", address: "", map_url: "", capacity: null, working_hours: "", closed_weekdays: [], active: true }] })}><Plus size={15}/> Salon veya hizmet noktası ekle</button>
    </section>
    <section className="admin-panel partner-settings-section"><header><CalendarDays size={21}/><div><h3>Organizasyon varsayılanları</h3><p>Yalnızca yeni organizasyon formlarının başlangıç değerleridir.</p></div></header><div className="partner-settings-grid">
      <label className="form-field"><span>Organizasyon türü</span><input value={form.organization_defaults.event_type} maxLength={80} onChange={(e) => defaults("event_type", e.target.value)}/></label>
      <label className="form-field"><span>Varsayılan mekân</span><input value={form.organization_defaults.venue} maxLength={200} onChange={(e) => defaults("venue", e.target.value)}/></label>
      <label className="form-field partner-settings-wide"><span>Karşılama mesajı</span><textarea value={form.organization_defaults.hero_message} maxLength={1000} onChange={(e) => defaults("hero_message", e.target.value)}/></label>
      <label className="form-field partner-settings-wide"><span>Teşekkür mesajı</span><textarea value={form.organization_defaults.thank_you_message} maxLength={2000} onChange={(e) => defaults("thank_you_message", e.target.value)}/></label>
    </div></section>
    <section className="admin-panel partner-settings-section"><header><Bell size={21}/><div><h3>Bildirim tercihleri</h3><p>Operasyon merkezinde takip edilecek başlıklar.</p></div></header><div className="partner-notification-list">{(Object.keys(notices) as Array<keyof PartnerSettings["notifications"]>).map((key) => <label key={key}><span>{notices[key]}</span><input type="checkbox" checked={form.notifications[key]} onChange={(e) => setForm((current) => current ? ({ ...current, notifications: { ...current.notifications, [key]: e.target.checked } }) : current)}/></label>)}</div></section>
    <section className="partner-settings-shortcuts">
      <Link href="/admin/accounts"><Users/><span><strong>Ekip ve yetkiler</strong><small>Personel hesaplarını ve görev rollerini yönetin.</small></span></Link>
      <Link href="/admin/finance-center"><WalletCards/><span><strong>Finans bilgileri</strong><small>Komisyon ve işletme kazanç görünümünü açın.</small></span></Link>
      <article><Plug/><span><strong>Entegrasyonlar</strong><small>Bağlı entegrasyon yok. Sağlayıcı onayından sonra bağlantılar burada yönetilecek.</small></span><em>Bağlı değil</em></article>
    </section>
    <section id="privacy-settings" className="admin-panel partner-settings-section"><header><Database size={21}/><div><h3>Gizlilik ve veri yönetimi</h3><p>Müşteri veri talepleri için sorumlu iletişim noktasını belirleyin.</p></div></header><div className="partner-settings-grid">
      <label className="form-field"><span>Veri talepleri e-postası</span><input type="email" value={form.privacy.customer_data_contact_email} onChange={(e) => setForm({ ...form, privacy: { ...form.privacy, customer_data_contact_email: e.target.value } })}/></label>
      <label className="partner-setting-toggle"><span><strong>Güvenlik bildirimleri</strong><small>Hesap ve veri güvenliği olaylarını takip edin.</small></span><input type="checkbox" checked={form.privacy.security_alerts} onChange={(e) => setForm({ ...form, privacy: { ...form.privacy, security_alerts: e.target.checked } })}/></label>
    </div><p className="admin-hint">Hesap kapatma veya veri silme talepleri geçmiş satışları, finans kayıtlarını ve audit günlüklerini otomatik olarak silmez; inceleme sürecine alınır.</p></section>
    <div className="partner-settings-safe-note"><ShieldCheck size={20}/><p>Fiyat, komisyon, paket hakları, vergi ve geçmiş satış kayıtları bu alandan değiştirilemez.</p></div>
    <div className="partner-settings-actions"><button className="admin-button primary" disabled={busy}><Save size={16}/>{busy ? "Kaydediliyor…" : "İşletme ayarlarını kaydet"}</button></div>
  </form>;
}
