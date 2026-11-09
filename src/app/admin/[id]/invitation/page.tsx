"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ExternalLink, Plus, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { BotanicalInvitation } from "@/components/invitation/BotanicalInvitation";
import { defaultDigitalInvitationContent, type DigitalInvitationContent } from "@/lib/digital-invitation";
import type { Wedding } from "@/lib/models";
import { api } from "@/lib/api";
import styles from "./invitation-editor.module.css";

type InvitationRecord = {
  template_version: 1;
  status: "draft" | "published";
  content?: DigitalInvitationContent;
  event_date: string;
  event_time: string;
  venue: string;
  map_url: string;
  message: string;
  has_unpublished_changes?: boolean;
};
type EditorSection = "content" | "event" | "details" | "design";

export default function DigitalInvitationPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const invitation = useQuery({ queryKey: ["digital-invitation", id], queryFn: () => api<InvitationRecord | null>(`/admin/weddings/${id}/digital-invitation`) });
  const wedding = useQuery({ queryKey: ["wedding", id], queryFn: () => api<Wedding>(`/admin/weddings/${id}`) });
  const [form, setForm] = useState<DigitalInvitationContent>(defaultDigitalInvitationContent);
  const [section, setSection] = useState<EditorSection>("content");
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");
  const [saveState, setSaveState] = useState<"saved" | "saving" | "dirty" | "error">("saved");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const initialized = useRef(false);
  const editVersion = useRef(0);
  const latestForm = useRef(form);
  latestForm.current = form;

  useEffect(() => {
    if (initialized.current || invitation.isLoading || wedding.isLoading) return;
    const event = wedding.data;
    const stored = invitation.data;
    setForm(stored?.content || {
      ...defaultDigitalInvitationContent,
      bride_name: event?.bride_name || "Gelin",
      groom_name: event?.groom_name || "Damat",
      event_type: event?.event_type || "Düğün",
      event_date: stored?.event_date || event?.wedding_date || defaultDigitalInvitationContent.event_date,
      event_time: stored?.event_time || defaultDigitalInvitationContent.event_time,
      venue: stored?.venue || "",
      map_url: stored?.map_url || "",
      message: stored?.message || event?.hero_message || defaultDigitalInvitationContent.message,
    });
    initialized.current = true;
  }, [invitation.data, invitation.isLoading, wedding.data, wedding.isLoading]);

  const persist = useCallback(async (content: DigitalInvitationContent, quiet = false) => {
    const version = editVersion.current;
    setSaveState("saving");
    setError("");
    try {
      await api(`/admin/weddings/${id}/digital-invitation`, { method: "PUT", body: JSON.stringify(content) });
      setSaveState(editVersion.current === version ? "saved" : "dirty");
      await queryClient.invalidateQueries({ queryKey: ["digital-invitation", id] });
      if (!quiet) toast.success("Dijital davetiye taslağı kaydedildi.");
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Taslak kaydedilemedi.");
      setSaveState("error");
      return false;
    }
  }, [id, queryClient]);

  useEffect(() => {
    if (!initialized.current || saveState !== "dirty") return;
    const timer = window.setTimeout(() => void persist(latestForm.current, true), 900);
    return () => window.clearTimeout(timer);
  }, [form, persist, saveState]);

  const update = <K extends keyof DigitalInvitationContent>(key: K, value: DigitalInvitationContent[K]) => {
    editVersion.current += 1;
    setForm((current) => ({ ...current, [key]: value }));
    setSaveState("dirty");
  };

  async function publish() {
    setBusy(true);
    setError("");
    try {
      if (saveState !== "saved" && !(await persist(latestForm.current, true))) return;
      await api(`/admin/weddings/${id}/digital-invitation/publish`, { method: "POST", body: "{}" });
      await queryClient.invalidateQueries({ queryKey: ["digital-invitation", id] });
      toast.success("Dijital davetiye yayınlandı.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Davetiye yayınlanamadı.");
    } finally { setBusy(false); }
  }

  const stateLabel = saveState === "saving" ? "Kaydediliyor…" : saveState === "dirty" ? "Değişiklikler bekliyor" : saveState === "error" ? "Kaydedilemedi" : invitation.data?.has_unpublished_changes ? "Yayınlanmamış değişiklik var" : "Tüm değişiklikler kaydedildi";
  const publicUrl = wedding.data?.slug ? `/invitation/${wedding.data.slug}` : "";

  return <AdminShell><div className={styles.editorPage}>
    <header className={styles.topbar}>
      <div className={styles.titleGroup}><p>Dijital davetiye stüdyosu</p><h1>{wedding.data?.title || "Davetiyenizi hazırlayın"}</h1></div>
      <div className={styles.status} data-state={saveState}><i /><span>{stateLabel}</span></div>
      <div className={styles.actions}>
        {invitation.data?.status === "published" && publicUrl ? <Link className={`admin-button ${styles.secondaryAction}`} href={publicUrl} target="_blank"><ExternalLink size={15} /> Görüntüle</Link> : null}
        <button className="admin-button primary" type="button" disabled={busy || saveState === "saving"} onClick={() => void publish()}><Send size={15} /> {invitation.data?.status === "published" ? "Değişiklikleri yayınla" : "Yayınla"}</button>
      </div>
    </header>
    <div className={styles.mobileSwitch}><button aria-selected={mobileView === "edit"} onClick={() => setMobileView("edit")}>Düzenle</button><button aria-selected={mobileView === "preview"} onClick={() => setMobileView("preview")}>Önizle</button></div>
    {error ? <div className={styles.error} role="alert">{error}</div> : null}
    <div className={styles.workspace}>
      <section className={styles.panel} data-mobile-active={mobileView === "edit"}>
        <nav className={styles.tabs} aria-label="Davetiye bölümleri">{([ ["content", "Karşılama"], ["event", "Etkinlik"], ["details", "Detaylar"], ["design", "Tema"] ] as const).map(([value,label]) => <button type="button" key={value} aria-selected={section === value} onClick={() => setSection(value)}>{label}</button>)}</nav>
        <div className={styles.form}>
          {section === "content" ? <>
            <EditorHeading eyebrow="01 · Karşılama" title="Davetiyenin ilk izlenimi" description="İsimler ve ana mesaj telefon önizlemesinde anında güncellenir." />
            <div className={styles.grid2}><EditorField label="Gelin adı" value={form.bride_name} onChange={(v) => update("bride_name", v)} /><EditorField label="Damat adı" value={form.groom_name} onChange={(v) => update("groom_name", v)} /></div>
            <EditorField label="Etkinlik türü" value={form.event_type} onChange={(v) => update("event_type", v)} />
            <EditorField label="Davet mesajı" textarea value={form.message} onChange={(v) => update("message", v)} maxLength={500} />
            <div className={styles.grid2}><EditorField label="Gelin tarafı" value={form.bride_family} onChange={(v) => update("bride_family", v)} /><EditorField label="Damat tarafı" value={form.groom_family} onChange={(v) => update("groom_family", v)} /></div>
            <EditorField label="Özel not" textarea value={form.special_note} onChange={(v) => update("special_note", v)} maxLength={600} />
          </> : null}
          {section === "event" ? <>
            <EditorHeading eyebrow="02 · Etkinlik" title="Tarih ve buluşma noktası" description="Davetlilerin ihtiyaç duyduğu temel etkinlik bilgilerini tamamlayın." />
            <div className={styles.grid2}><EditorField label="Tarih" type="date" value={form.event_date} onChange={(v) => update("event_date", v)} /><EditorField label="Saat" type="time" value={form.event_time} onChange={(v) => update("event_time", v)} /></div>
            <EditorField label="Mekân adı" value={form.venue} onChange={(v) => update("venue", v)} />
            <EditorField label="Açık adres" textarea value={form.venue_address} onChange={(v) => update("venue_address", v)} />
            <EditorField label="HTTPS harita bağlantısı" type="url" value={form.map_url} onChange={(v) => update("map_url", v)} placeholder="https://maps.google.com/…" />
            <EditorHeading eyebrow="Program" title="Etkinlik akışı" description="Saat sırasına göre davetlilere gösterilecek program." />
            {form.timeline.map((item,index) => <div className={styles.repeatCard} key={index}><button type="button" aria-label="Program satırını sil" onClick={() => update("timeline", form.timeline.filter((_,i) => i !== index))}><Trash2 size={15} /></button><div className={styles.grid2}><EditorField label="Saat" type="time" value={item.time} onChange={(v) => update("timeline", form.timeline.map((x,i) => i === index ? {...x,time:v} : x))} /><EditorField label="Başlık" value={item.title} onChange={(v) => update("timeline", form.timeline.map((x,i) => i === index ? {...x,title:v} : x))} /></div><EditorField label="Açıklama" value={item.description} onChange={(v) => update("timeline", form.timeline.map((x,i) => i === index ? {...x,description:v} : x))} /></div>)}
            <button type="button" className={styles.addButton} onClick={() => update("timeline", [...form.timeline,{time:"19:00",title:"Yeni aşama",description:""}])}><Plus size={15} /> Program satırı ekle</button>
          </> : null}
          {section === "details" ? <>
            <EditorHeading eyebrow="03 · Detaylar" title="Menü ve davetli notları" description="Boş bıraktığınız isteğe bağlı bilgiler davetiyede gösterilmez." />
            {form.menu.map((group,index) => <div className={styles.repeatCard} key={index}><button type="button" aria-label="Menü grubunu sil" onClick={() => update("menu", form.menu.filter((_,i) => i !== index))}><Trash2 size={15} /></button><EditorField label="Menü başlığı" value={group.course} onChange={(v) => update("menu", form.menu.map((x,i) => i === index ? {...x,course:v} : x))} /><EditorField label="Ürünler (her satıra bir ürün)" textarea value={group.items.join("\n")} onChange={(v) => update("menu", form.menu.map((x,i) => i === index ? {...x,items:v.split("\n").filter(Boolean)} : x))} /></div>)}
            <button type="button" className={styles.addButton} onClick={() => update("menu", [...form.menu,{course:"Yeni bölüm",items:[]}])}><Plus size={15} /> Menü bölümü ekle</button><div style={{height:16}} />
            <EditorField label="Kıyafet kodu başlığı" value={form.dress_code_title} onChange={(v) => update("dress_code_title", v)} />
            <EditorField label="Kıyafet kodu açıklaması" value={form.dress_code_note} onChange={(v) => update("dress_code_note", v)} />
            <EditorField label="RSVP WhatsApp numarası" value={form.whatsapp_number} onChange={(v) => update("whatsapp_number", v)} placeholder="905551112233" />
            <EditorField label="Müzik bağlantısı" type="url" value={form.music_url} onChange={(v) => update("music_url", v)} placeholder="https://…" />
          </> : null}
          {section === "design" ? <>
            <EditorHeading eyebrow="04 · Tema" title="Botanical koleksiyonu" description="Lovable tasarımı ShineQR tema sistemine güvenli biçimde uyarlandı." />
            <div className={styles.themeCard}><img src="/digital-invitation/botanical/gallery-1.jpg" alt="Botanical tema önizlemesi" /><div><strong><Check size={15} /> Botanical seçili</strong><span>Romantik çiçekler, pudra tonları ve zarif tipografi.</span></div></div>
            <p style={{fontSize:'.78rem',lineHeight:1.6,color:'#75695e',marginTop:16}}>Yeni Lovable temaları aynı katalogda ayrı seçenek olarak görünecek. Tema ortak kullanılır; her organizasyonun içeriği ve yayın kaydı birbirinden ayrıdır.</p>
          </> : null}
        </div>
      </section>
      <aside className={styles.previewStage} data-mobile-active={mobileView === "preview"} aria-label="Telefon içinde canlı davetiye önizlemesi">
        <div className={styles.phone}><div className={styles.screen}><div className={styles.screenScroll}><div className={styles.screenScale}><BotanicalInvitation content={form} /></div></div></div><img className={styles.phoneFrame} src="/editor/purple-phone-frame.webp" alt="Mor telefon önizleme çerçevesi" /></div>
        <span className={styles.previewHint}>Telefon içinde kaydırarak kontrol edin</span>
      </aside>
    </div>
  </div></AdminShell>;
}

function EditorHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) { return <div className={styles.sectionHeading}><span>{eyebrow}</span><h2>{title}</h2><p>{description}</p></div>; }
function EditorField({ label, value, onChange, textarea = false, type = "text", ...props }: { label: string; value: string; onChange: (value: string) => void; textarea?: boolean; type?: string; maxLength?: number; placeholder?: string }) { return <label className={styles.field}><span>{label}</span>{textarea ? <textarea value={value} onChange={(event) => onChange(event.target.value)} {...props} /> : <input type={type} value={value} onChange={(event) => onChange(event.target.value)} {...props} />}</label>; }
