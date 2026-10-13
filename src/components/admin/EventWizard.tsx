"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, LoaderCircle, X } from "lucide-react";
import { api } from "@/lib/api";
import type { Account, Partner, Wedding } from "@/lib/models";
import { CoverUpload } from "./CoverUpload";
import { Field, Notice, TextField } from "./Fields";
import { SelectField } from "./SelectField";

const steps = [
  "Organizasyon",
  "Detaylar",
  "Karşılama",
  "Görseller",
  "Sayfa adresi",
  "Müşteri",
  "Kontrol",
] as const;

type DraftState = {
  title: string;
  event_type: string;
  venue: string;
  description: string;
  wedding_date: string;
  bride_name: string;
  groom_name: string;
  hero_message: string;
  thank_you_message: string;
  slug: string;
  logo_url: string;
  customer_name: string;
  customer_email: string;
  upload_days: number;
  trash_days: number;
};

function slugify(value: string) {
  return value
    .toLocaleLowerCase("tr")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ş/g, "s")
    .replace(/ç/g, "c")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

function initialState(event?: Wedding): DraftState {
  return {
    title: event?.title === "İsimsiz organizasyon" ? "" : event?.title || "",
    event_type: event?.event_type || "Düğün",
    venue: event?.venue || "",
    description: event?.description || "",
    wedding_date: event?.wedding_date || "",
    bride_name: event?.bride_name === "Gelin" ? "" : event?.bride_name || "",
    groom_name: event?.groom_name === "Damat" ? "" : event?.groom_name || "",
    hero_message: event?.hero_message || "Bu özel günü anılarınızla ölümsüzleştirelim.",
    thank_you_message: event?.thank_you_message || "Bu mutlu günümüze eşlik ettiğiniz için teşekkür ederiz.",
    slug: event?.slug?.startsWith("taslak-") ? "" : event?.slug || "",
    logo_url: event?.logo_url || "",
    customer_name: event?.customer_name || "",
    customer_email: event?.customer_email || "",
    upload_days: event?.upload_days || 7,
    trash_days: event?.trash_days || 7,
  };
}

export function EventWizard({
  user,
  initialEvent,
  onClose,
  onPublished,
}: {
  user: Account;
  initialEvent?: Wedding;
  onClose: () => void;
  onPublished: () => void;
}) {
  const [event, setEvent] = useState<Wedding | undefined>(initialEvent);
  const [step, setStep] = useState(Math.min(initialEvent?.wizard_step || 1, 7));
  const [data, setData] = useState(() => initialState(initialEvent));
  const [covers, setCovers] = useState(initialEvent?.cover_images || []);
  const [partnerId, setPartnerId] = useState(initialEvent?.partner_id || user.partner_id || "platform");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [coverBusy, setCoverBusy] = useState(false);
  const [error, setError] = useState("");
  const partners = useQuery({
    queryKey: ["partners"],
    queryFn: () => api<Partner[]>("/admin/partners"),
    enabled: user.role === "platform",
  });
  const selectedPartner = partners.data?.find((item) => item.id === partnerId);
  const set = <K extends keyof DraftState>(key: K, value: DraftState[K]) => {
    setData((current) => ({ ...current, [key]: value }));
    setError("");
  };
  useEffect(() => {
    const listener = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === "Escape" && !busy && !coverBusy) onClose();
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [busy, coverBusy, onClose]);

  const missing = useMemo(() => {
    if (step === 1 && !data.title.trim()) return "Organizasyon başlığını girin.";
    if (step === 2 && !data.wedding_date) return "Organizasyon tarihini seçin.";
    if (step === 3 && (!data.bride_name.trim() || !data.groom_name.trim())) return "İki ismi de girin.";
    if (step === 5 && !data.slug.trim()) return "Sayfa adresini girin.";
    if (step === 6 && (!data.customer_name.trim() || !data.customer_email.trim())) return "Müşteri adı ve e-posta adresi gerekli.";
    return "";
  }, [data, step]);

  async function saveDraft(nextStep = step) {
    const payload = {
      ...(event ? { id: event.id } : {}),
      ...data,
      slug: data.slug || undefined,
      wedding_date: data.wedding_date || undefined,
      cover_images: covers,
      partner_id: partnerId,
      wizard_step: nextStep,
    };
    const saved = await api<Wedding>("/admin/weddings/draft", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setEvent(saved);
    return saved;
  }

  async function next() {
    if (missing) return setError(missing);
    setBusy(true);
    setError("");
    try {
      const nextStep = Math.min(7, step + 1);
      await saveDraft(nextStep);
      setStep(nextStep);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function saveAndClose() {
    setBusy(true);
    setError("");
    try {
      await saveDraft(step);
      onPublished();
      onClose();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    if (!event) return setError("Önce taslağı kaydedin.");
    if (password.length < 12) return setError("Geçici parola en az 12 karakter olmalı.");
    if (password !== confirmPassword) return setError("Parolalar eşleşmiyor.");
    setBusy(true);
    setError("");
    try {
      await saveDraft(7);
      await api(`/admin/weddings/${event.id}/publish`, {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      setPassword("");
      setConfirmPassword("");
      onPublished();
      onClose();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="event-wizard-layer" role="presentation">
      <button className="event-wizard-backdrop" aria-label="Sihirbazı kapat" onClick={onClose} />
      <section className="event-wizard" role="dialog" aria-modal="true" aria-labelledby="wizard-title">
        <header className="event-wizard-header">
          <div><p className="admin-kicker">YENİ ORGANİZASYON</p><h2 id="wizard-title">{event ? "Taslağa devam et" : "Organizasyon oluştur"}</h2></div>
          <button type="button" className="event-wizard-close" onClick={onClose} aria-label="Kapat"><X size={20} /></button>
        </header>
        <ol className="event-wizard-progress" aria-label="Oluşturma adımları">
          {steps.map((label, index) => <li key={label} className={index + 1 === step ? "active" : index + 1 < step ? "done" : ""}><span>{index + 1 < step ? <Check size={13} /> : index + 1}</span><small>{label}</small></li>)}
        </ol>
        <div className="event-wizard-body">
          <div className="event-wizard-step-copy"><span>ADIM {step} / 7</span><h3>{steps[step - 1]}</h3></div>
          {step === 1 && <div className="event-wizard-fields"><Field label="Organizasyon başlığı" value={data.title} onChange={(e) => { set("title", e.target.value); if (!data.slug) set("slug", slugify(e.target.value)); }} placeholder="Hilal & Oğuz" maxLength={160} autoFocus /><label className="form-field"><span>Organizasyon türü</span><SelectField value={data.event_type} onValueChange={(value) => set("event_type", value)}>{["Düğün", "Nişan", "Doğum günü", "Kurumsal etkinlik", "Diğer"].map((type) => <option key={type}>{type}</option>)}</SelectField></label>{user.role === "platform" && !event ? <label className="form-field"><span>İşletme</span><SelectField value={partnerId} onValueChange={setPartnerId}>{partners.data?.filter((partner) => partner.active).map((partner) => <option key={partner.id} value={partner.id}>{partner.name}</option>)}</SelectField></label> : null}</div>}
          {step === 2 && <div className="event-wizard-fields"><Field label="Organizasyon tarihi" type="date" value={data.wedding_date} onChange={(e) => set("wedding_date", e.target.value)} /><Field label="Mekân" value={data.venue} onChange={(e) => set("venue", e.target.value)} placeholder="Mekân adı, ilçe" maxLength={200} /><TextField label="Kısa açıklama" value={data.description} onChange={(e) => set("description", e.target.value)} maxLength={1200} /></div>}
          {step === 3 && <div className="event-wizard-fields"><Field label="Gelin adı" value={data.bride_name} onChange={(e) => set("bride_name", e.target.value)} /><Field label="Damat adı" value={data.groom_name} onChange={(e) => set("groom_name", e.target.value)} /><TextField label="Karşılama mesajı" value={data.hero_message} onChange={(e) => set("hero_message", e.target.value)} maxLength={1000} /><TextField label="Teşekkür mesajı" value={data.thank_you_message} onChange={(e) => set("thank_you_message", e.target.value)} maxLength={2000} /></div>}
          {step === 4 && <CoverUpload value={covers} onChange={setCovers} eventId={event?.id} partnerId={partnerId} disabled={busy} onBusyChange={setCoverBusy} />}
          {step === 5 && <div className="event-wizard-fields"><Field label="Sayfa adresi" value={data.slug} onChange={(e) => set("slug", slugify(e.target.value))} placeholder="hilal-oguz" pattern="[a-z0-9]+(-[a-z0-9]+)*" /><Field label="Logo adresi (isteğe bağlı)" value={data.logo_url} onChange={(e) => set("logo_url", e.target.value)} /><p className="event-wizard-url">shineqr.com/wedding/<strong>{data.slug || "sayfa-adresi"}</strong></p></div>}
          {step === 6 && <div className="event-wizard-fields"><Field label="Müşteri adı soyadı" value={data.customer_name} onChange={(e) => set("customer_name", e.target.value)} maxLength={100} /><Field label="Müşteri e-posta adresi" type="email" value={data.customer_email} onChange={(e) => set("customer_email", e.target.value)} maxLength={254} /><div className="event-wizard-security"><strong>Parola taslağa kaydedilmez.</strong><p>Sayfayı yenilediğinizde bu güvenli profil alanları korunur. Geçici parolayı yayınlama adımında yeniden gireceksiniz.</p></div></div>}
          {step === 7 && <div className="event-wizard-review"><dl><div><dt>Organizasyon</dt><dd>{data.title}</dd></div><div><dt>Tarih ve mekân</dt><dd>{data.wedding_date} {data.venue ? `· ${data.venue}` : ""}</dd></div><div><dt>Sayfa</dt><dd>/wedding/{data.slug}</dd></div><div><dt>Müşteri</dt><dd>{data.customer_name} · {data.customer_email}</dd></div><div><dt>İşletme</dt><dd>{selectedPartner?.name || user.partner_name || "ShineQR Platform"}</dd></div></dl><div className="event-wizard-fields"><Field label="Geçici parola" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={12} maxLength={256} autoComplete="new-password" /><Field label="Geçici parolayı tekrar girin" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={12} maxLength={256} autoComplete="new-password" /><p className="admin-hint">Parola yalnızca şimdi gönderilir, hashlenerek hesapta saklanır ve ilk girişte değiştirilmesi istenir.</p></div></div>}
          {error && <Notice>{error}</Notice>}
        </div>
        <footer className="event-wizard-footer">
          <button type="button" className="admin-button" onClick={saveAndClose} disabled={busy || coverBusy}>{busy ? "Kaydediliyor…" : "Taslak olarak kaydet"}</button>
          <div><button type="button" className="admin-button" onClick={() => setStep((value) => Math.max(1, value - 1))} disabled={step === 1 || busy}><ArrowLeft size={15} /> Geri</button>{step < 7 ? <button type="button" className="admin-button primary" onClick={next} disabled={busy || coverBusy || partners.isLoading}>{busy ? <LoaderCircle size={16} className="animate-spin" /> : null} Kaydet ve devam et <ArrowRight size={15} /></button> : <button type="button" className="admin-button primary" onClick={publish} disabled={busy}>{busy ? "Yayınlanıyor…" : "Organizasyonu yayınla"}</button>}</div>
        </footer>
      </section>
    </div>
  );
}
