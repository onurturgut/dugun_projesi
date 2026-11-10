"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import QRCode from "qrcode";
import { ArrowLeft, Check, Copy, ExternalLink, Eye, ImagePlus, Images, LoaderCircle, MessageCircle, Plus, Send, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { prepareAdminImage } from "@/components/admin/CoverUpload";
import { InvitationRenderer } from "@/components/invitation/InvitationRenderer";
import { defaultDigitalInvitationContent, digitalInvitationAccessEnabled, digitalInvitationThemes, type DigitalInvitationContent } from "@/lib/digital-invitation";
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
type StudioView = "catalog" | "studio";

export default function DigitalInvitationPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const invitation = useQuery({ queryKey: ["digital-invitation", id], queryFn: () => api<InvitationRecord | null>(`/admin/weddings/${id}/digital-invitation`) });
  const wedding = useQuery({ queryKey: ["wedding", id], queryFn: () => api<Wedding>(`/admin/weddings/${id}`) });
  const canEdit = digitalInvitationAccessEnabled(wedding.data || {});
  const [form, setForm] = useState<DigitalInvitationContent>(defaultDigitalInvitationContent);
  const [view, setView] = useState<StudioView>("catalog");
  const [previewTheme, setPreviewTheme] = useState<DigitalInvitationContent["theme_id"] | null>(null);
  const [section, setSection] = useState<EditorSection>("content");
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");
  const [saveState, setSaveState] = useState<"saved" | "saving" | "dirty" | "error">("saved");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [publishedNow, setPublishedNow] = useState(false);
  const [animationReplayKey, setAnimationReplayKey] = useState(0);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const galleryInput = useRef<HTMLInputElement>(null);
  const initialized = useRef(false);
  const editVersion = useRef(0);
  const latestForm = useRef(form);
  latestForm.current = form;

  useEffect(() => {
    if (initialized.current || invitation.isLoading || wedding.isLoading) return;
    const event = wedding.data;
    const stored = invitation.data;
    setForm(stored?.content ? { ...defaultDigitalInvitationContent, ...stored.content } : {
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
    setView(!canEdit || stored?.content ? "studio" : "catalog");
    initialized.current = true;
  }, [canEdit, invitation.data, invitation.isLoading, wedding.data, wedding.isLoading]);

  const persist = useCallback(async (content: DigitalInvitationContent, quiet = false) => {
    if (!canEdit) return false;
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
  }, [canEdit, id, queryClient]);

  useEffect(() => {
    if (!canEdit || !initialized.current || saveState !== "dirty") return;
    const timer = window.setTimeout(() => void persist(latestForm.current, true), 900);
    return () => window.clearTimeout(timer);
  }, [canEdit, form, persist, saveState]);

  const update = <K extends keyof DigitalInvitationContent>(key: K, value: DigitalInvitationContent[K]) => {
    if (!canEdit) return;
    editVersion.current += 1;
    setForm((current) => ({ ...current, [key]: value }));
    setSaveState("dirty");
  };

  async function publish() {
    if (!canEdit) return;
    setBusy(true);
    setError("");
    try {
      if (saveState !== "saved" && !(await persist(latestForm.current, true))) return;
      await api(`/admin/weddings/${id}/digital-invitation/publish`, { method: "POST", body: "{}" });
      await queryClient.invalidateQueries({ queryKey: ["digital-invitation", id] });
      setPublishedNow(true);
      toast.success("Dijital davetiye yayınlandı.", { description: publicUrl });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Davetiye yayınlanamadı.");
    } finally { setBusy(false); }
  }

  const stateLabel = !canEdit ? "Önizleme modu" : saveState === "saving" ? "Kaydediliyor…" : saveState === "dirty" ? "Değişiklikler bekliyor" : saveState === "error" ? "Kaydedilemedi" : invitation.data?.has_unpublished_changes ? "Yayınlanmamış değişiklik var" : "Tüm değişiklikler kaydedildi";
  const publicUrl = wedding.data?.slug ? `https://${wedding.data.slug}.davetiye.shineqr.com` : "";
  const isPublished = invitation.data?.status === "published" || publishedNow;
  const whatsappUrl = publicUrl ? `https://wa.me/?text=${encodeURIComponent(`Dijital davetiyemizi sizinle paylaşmak istiyoruz:\n\n${publicUrl}`)}` : "";
  const purchaseWhatsappUrl = `https://wa.me/905512314736?text=${encodeURIComponent(
    `Merhaba, ${wedding.data?.title || "organizasyonum"} için Dijital Davetiye ek ürününü satın almak istiyorum. Organizasyon kodu: ${id}`,
  )}`;

  useEffect(() => {
    if (!isPublished || !publicUrl) { setQrDataUrl(""); return; }
    let active = true;
    QRCode.toDataURL(publicUrl, { width: 320, margin: 2, errorCorrectionLevel: "M", color: { dark: "#251f1b", light: "#fffaf5" } })
      .then((value) => { if (active) setQrDataUrl(value); })
      .catch(() => { if (active) setQrDataUrl(""); });
    return () => { active = false; };
  }, [isPublished, publicUrl]);

  async function copyPublicUrl() {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success("Davetiye bağlantısı panoya kopyalandı.");
    } catch {
      toast.error("Bağlantı kopyalanamadı. Adresi elle seçip kopyalayın.");
    }
  }

  async function uploadGalleryImages(files: File[]) {
    if (!canEdit || !files.length || galleryUploading) return;
    const available = 20 - (wedding.data?.cover_images?.length || 0);
    if (available <= 0) {
      toast.error("Davetiye galerisine en fazla 20 görsel eklenebilir.");
      return;
    }
    setGalleryUploading(true);
    setError("");
    let gallery = [...latestForm.current.gallery_images];
    try {
      for (const file of files.slice(0, available)) {
        const blob = await prepareAdminImage(file);
        const body = new FormData();
        body.append("file", blob, "davetiye-galeri.webp");
        body.append("event_id", id);
        const upload = await fetch("/api/admin/covers", { method: "POST", body });
        const uploaded = await upload.json();
        if (!upload.ok)
          throw new Error(uploaded.error || "Görsel yüklenemedi.");
        const attached = await api<{ cover_images: string[] }>(
          `/admin/weddings/${id}/digital-invitation/gallery`,
          { method: "POST", body: JSON.stringify({ image_url: uploaded.url }) },
        );
        queryClient.setQueryData<Wedding>(["wedding", id], (current) =>
          current ? { ...current, cover_images: attached.cover_images } : current,
        );
        gallery = [
          ...gallery.filter((image) => image !== uploaded.url),
          uploaded.url,
        ].slice(0, 20);
        editVersion.current += 1;
        setForm((current) => ({ ...current, gallery_images: gallery }));
        setSaveState("dirty");
      }
      toast.success("Görsel yüklendi ve davetiye galerisine eklendi.");
    } catch (reason) {
      const message =
        reason instanceof Error ? reason.message : "Görsel yüklenemedi.";
      setError(message);
      toast.error(message);
    } finally {
      setGalleryUploading(false);
    }
  }

  async function chooseTheme(themeId: DigitalInvitationContent["theme_id"]) {
    if (!canEdit) return;
    const next = { ...latestForm.current, theme_id: themeId };
    editVersion.current += 1;
    setForm(next);
    setPreviewTheme(null);
    setView("studio");
    setSaveState("dirty");
    await persist(next, true);
  }

  if (view === "catalog") {
    const inspectedTheme = digitalInvitationThemes.find((theme) => theme.id === previewTheme);
    const previewContent = inspectedTheme ? { ...form, theme_id: inspectedTheme.id } : form;
    return <AdminShell><div className={styles.catalogPage}>
      <header className={styles.catalogHero}><div><span>DİJİTAL DAVETİYE KOLEKSİYONU</span><h1>Hikâyenize uygun temayı seçin</h1><p>Temayı canlı inceleyin, organizasyonunuza bağlayın ve içerikleri profesyonel stüdyoda düzenleyin.</p></div>{invitation.data?.content ? <button type="button" className="admin-button" onClick={() => setView("studio")}><ArrowLeft size={16} /> Stüdyoya dön</button> : null}</header>
      <div className={styles.catalogFilters}><button type="button" aria-pressed="true">Tümü</button><button type="button">Romantik</button><button type="button">Botanik</button><button type="button">Animasyonlu</button><span>{digitalInvitationThemes.length} premium tema</span></div>
      <section className={styles.themeGrid} aria-label="Dijital davetiye temaları">{digitalInvitationThemes.map((theme) => <article className={styles.catalogCard} key={theme.id}>
        <button type="button" className={styles.catalogVisual} onClick={() => setPreviewTheme(theme.id)} aria-label={`${theme.name} temasını önizle`}><img src={theme.image} alt={`${theme.name} dijital davetiye teması`} /><span><Eye size={16} /> Canlı önizle</span></button>
        <div className={styles.catalogBody}><small>{theme.category}</small><h2>{theme.name}</h2><p>{theme.description}</p><div className={styles.featureChips}>{theme.features.map((feature) => <span key={feature}>{feature}</span>)}</div>{canEdit ? <button type="button" className="admin-button primary" onClick={() => void chooseTheme(theme.id)}>Bu temayı seç</button> : <a className="admin-button primary" href={purchaseWhatsappUrl} target="_blank" rel="noreferrer"><MessageCircle size={15} /> Satın almak için iletişime geç</a>}</div>
      </article>)}</section>
      {inspectedTheme ? <div className={styles.themeModal} role="dialog" aria-modal="true" aria-label={`${inspectedTheme.name} tema önizlemesi`}><button className={styles.modalBackdrop} type="button" onClick={() => setPreviewTheme(null)} aria-label="Önizlemeyi kapat" /><div className={styles.modalContent}><header><div><small>{inspectedTheme.category}</small><h2>{inspectedTheme.name}</h2></div><button type="button" onClick={() => setPreviewTheme(null)}>Kapat</button></header><div className={styles.modalPreview}><div className={styles.catalogPhone}><InvitationRenderer content={previewContent} preview /></div><aside><p>{inspectedTheme.description}</p>{inspectedTheme.features.map((feature) => <span key={feature}><Check size={14} /> {feature}</span>)}{canEdit ? <button type="button" className="admin-button primary" onClick={() => void chooseTheme(inspectedTheme.id)}>Bu temayla devam et</button> : <a className="admin-button primary" href={purchaseWhatsappUrl} target="_blank" rel="noreferrer"><MessageCircle size={15} /> WhatsApp’tan iletişime geç</a>}</aside></div></div></div> : null}
    </div></AdminShell>;
  }

  return <AdminShell><div className={styles.editorPage}>
    <header className={styles.topbar}>
      <div className={styles.titleGroup}><p>Dijital davetiye stüdyosu</p><h1>{wedding.data?.title || "Davetiyenizi hazırlayın"}</h1></div>
      <div className={styles.status} data-state={saveState}><i /><span>{stateLabel}</span></div>
      <div className={styles.actions}>
        <button className={`admin-button ${styles.secondaryAction}`} type="button" onClick={() => setView("catalog")}><Images size={15} /> Temalar</button>
        {isPublished && publicUrl ? <a className={`admin-button ${styles.secondaryAction}`} href={publicUrl} target="_blank" rel="noreferrer"><ExternalLink size={15} /> Görüntüle</a> : null}
        <button className="admin-button primary" type="button" disabled={!canEdit || busy || saveState === "saving"} onClick={() => void publish()}><Send size={15} /> {canEdit ? (invitation.data?.status === "published" ? "Değişiklikleri yayınla" : "Yayınla") : "Ek ürün gerekli"}</button>
      </div>
    </header>
    {!canEdit ? <section className={styles.upgradeNotice} aria-label="Dijital davetiye ek ürün bilgisi">
      <div><Sparkles size={22} /><span><strong>Stüdyo önizleme modunda</strong><p>Dijital davetiyeyi düzenlemek ve yayınlamak için Dijital Davetiye ek ürününü satın almanız gerekir.</p></span></div>
      <a href={purchaseWhatsappUrl} target="_blank" rel="noreferrer"><MessageCircle size={17} /> WhatsApp’tan iletişime geç</a>
    </section> : null}
    <div className={styles.mobileSwitch}><button aria-selected={mobileView === "edit"} onClick={() => setMobileView("edit")}>Düzenle</button><button aria-selected={mobileView === "preview"} onClick={() => setMobileView("preview")}>Önizle</button></div>
    {error ? <div className={styles.error} role="alert">{error}</div> : null}
    {isPublished && publicUrl ? <section className={styles.sharePanel} aria-label="Yayınlanan dijital davetiye bağlantısı">
      <div className={styles.shareCopy}><span>YAYINDA</span><h2>Davetiyeniz paylaşılmaya hazır</h2><p>{publicUrl}</p></div>
      {qrDataUrl ? <img src={qrDataUrl} alt="Dijital davetiye bağlantısı QR kodu" /> : null}
      <div className={styles.shareActions}>
        <button type="button" className="admin-button" onClick={() => void copyPublicUrl()}><Copy size={15} /> Bağlantıyı kopyala</button>
        <a className="admin-button" href={whatsappUrl} target="_blank" rel="noreferrer"><MessageCircle size={15} /> WhatsApp ile paylaş</a>
        {qrDataUrl ? <a className="admin-button" href={qrDataUrl} download={`${wedding.data?.slug || "dijital-davetiye"}-qr.png`}>QR indir</a> : null}
        <a className="admin-button primary" href={publicUrl} target="_blank" rel="noreferrer"><ExternalLink size={15} /> Davetiyeyi görüntüle</a>
      </div>
    </section> : null}
    <div className={styles.workspace}>
      <section className={styles.panel} data-mobile-active={mobileView === "edit"}>
        <nav className={styles.tabs} aria-label="Davetiye bölümleri">{([ ["content", "Karşılama"], ["event", "Etkinlik"], ["details", "Detaylar"], ["design", "Tema"] ] as const).map(([value,label]) => <button type="button" key={value} aria-selected={section === value} onClick={() => setSection(value)}>{label}</button>)}</nav>
        <fieldset disabled={!canEdit} className={styles.lockedControls}>
        <div className={styles.form}>
          {section === "content" ? <>
            <EditorHeading eyebrow="01 · Karşılama" title="Davetiyenin ilk izlenimi" description="İsimler ve ana mesaj telefon önizlemesinde anında güncellenir." />
            <div className={styles.grid2}><EditorField label="Gelin adı" value={form.bride_name} onChange={(v) => update("bride_name", v)} /><EditorField label="Damat adı" value={form.groom_name} onChange={(v) => update("groom_name", v)} /></div>
            <EditorField label="Etkinlik türü" value={form.event_type} onChange={(v) => update("event_type", v)} />
            <EditorField label="Davet mesajı" textarea value={form.message} onChange={(v) => update("message", v)} maxLength={500} />
            <div className={styles.grid2}><EditorField label="Gelin tarafı" value={form.bride_family} onChange={(v) => update("bride_family", v)} /><EditorField label="Damat tarafı" value={form.groom_family} onChange={(v) => update("groom_family", v)} /></div>
            <EditorHeading eyebrow="Hikâye" title="Sizi anlatan kısa bölüm" description="Davetlilere ilişkinizin ruhunu birkaç cümleyle aktarın." />
            <EditorField label="Hikâye başlığı" value={form.story_title} onChange={(v) => update("story_title", v)} />
            <EditorField label="Hikâye metni" textarea value={form.story_text} onChange={(v) => update("story_text", v)} maxLength={1200} />
            <EditorToggle label="Hikâyeyi davetiyede göster" checked={form.show_story} onChange={(v) => update("show_story", v)} />
            <EditorField label="Özel not" textarea value={form.special_note} onChange={(v) => update("special_note", v)} maxLength={600} />
          </> : null}
          {section === "event" ? <>
            <EditorHeading eyebrow="02 · Etkinlik" title="Tarih ve buluşma noktası" description="Davetlilerin ihtiyaç duyduğu temel etkinlik bilgilerini tamamlayın." />
            <div className={styles.grid2}><EditorField label="Tarih" type="date" value={form.event_date} onChange={(v) => update("event_date", v)} /><EditorField label="Saat" type="time" value={form.event_time} onChange={(v) => update("event_time", v)} /></div>
            <EditorField label="Mekân adı" value={form.venue} onChange={(v) => update("venue", v)} />
            <EditorField label="Açık adres" textarea value={form.venue_address} onChange={(v) => update("venue_address", v)} />
            <EditorField label="HTTPS harita bağlantısı" type="url" value={form.map_url} onChange={(v) => update("map_url", v)} placeholder="https://maps.google.com/…" />
            <EditorHeading eyebrow="İkinci etkinlik" title="Nikâh veya ek buluşma" description="Tarih girildiğinde davetiyede ikinci etkinlik kartı olarak gösterilir." />
            <EditorField label="Etkinlik başlığı" value={form.ceremony_title} onChange={(v) => update("ceremony_title", v)} placeholder="Nikâh" />
            <div className={styles.grid2}><EditorField label="Tarih" type="date" value={form.ceremony_date} onChange={(v) => update("ceremony_date", v)} /><EditorField label="Saat" type="time" value={form.ceremony_time} onChange={(v) => update("ceremony_time", v)} /></div>
            <EditorField label="Mekân adı" value={form.ceremony_venue} onChange={(v) => update("ceremony_venue", v)} />
            <EditorField label="Açık adres" textarea value={form.ceremony_address} onChange={(v) => update("ceremony_address", v)} />
            <EditorField label="HTTPS harita bağlantısı" type="url" value={form.ceremony_map_url} onChange={(v) => update("ceremony_map_url", v)} placeholder="https://maps.google.com/…" />
            <EditorHeading eyebrow="Program" title="Etkinlik akışı" description="Saat sırasına göre davetlilere gösterilecek program." />
            {form.timeline.map((item,index) => <div className={styles.repeatCard} key={index}><button type="button" aria-label="Program satırını sil" onClick={() => update("timeline", form.timeline.filter((_,i) => i !== index))}><Trash2 size={15} /></button><div className={styles.grid2}><EditorField label="Saat" type="time" value={item.time} onChange={(v) => update("timeline", form.timeline.map((x,i) => i === index ? {...x,time:v} : x))} /><EditorField label="Başlık" value={item.title} onChange={(v) => update("timeline", form.timeline.map((x,i) => i === index ? {...x,title:v} : x))} /></div><EditorField label="Açıklama" value={item.description} onChange={(v) => update("timeline", form.timeline.map((x,i) => i === index ? {...x,description:v} : x))} /></div>)}
            <button type="button" className={styles.addButton} onClick={() => update("timeline", [...form.timeline,{time:"19:00",title:"Yeni aşama",description:""}])}><Plus size={15} /> Program satırı ekle</button>
          </> : null}
          {section === "details" ? <>
            <EditorHeading eyebrow="03 · Detaylar" title="Menü ve davetli notları" description="Boş bıraktığınız isteğe bağlı bilgiler davetiyede gösterilmez." />
            <div className={styles.emptyBehaviorNote} role="note"><strong>Akıllı görünürlük</strong><span>Menü, etkinlik akışı, aileler, hikâye, kıyafet kodu, RSVP, müzik, galeri ve özel not alanları boş bırakılırsa yayınlanan davetiyede ilgili bölüm hiç gösterilmez.</span></div>
            {form.menu.map((group,index) => <div className={styles.repeatCard} key={index}><button type="button" aria-label="Menü grubunu sil" onClick={() => update("menu", form.menu.filter((_,i) => i !== index))}><Trash2 size={15} /></button><EditorField label="Menü başlığı" value={group.course} onChange={(v) => update("menu", form.menu.map((x,i) => i === index ? {...x,course:v} : x))} /><EditorField label="Ürünler (her satıra bir ürün)" textarea value={group.items.join("\n")} onChange={(v) => update("menu", form.menu.map((x,i) => i === index ? {...x,items:v.split("\n").filter(Boolean)} : x))} /></div>)}
            <button type="button" className={styles.addButton} onClick={() => update("menu", [...form.menu,{course:"Yeni bölüm",items:[]}])}><Plus size={15} /> Menü bölümü ekle</button><div style={{height:16}} />
            <EditorField label="Kıyafet kodu başlığı" value={form.dress_code_title} onChange={(v) => update("dress_code_title", v)} />
            <EditorField label="Kıyafet kodu açıklaması" value={form.dress_code_note} onChange={(v) => update("dress_code_note", v)} />
            <EditorField label="RSVP WhatsApp numarası" value={form.whatsapp_number} onChange={(v) => update("whatsapp_number", v)} placeholder="905551112233" />
            <EditorField label="Müzik bağlantısı" type="url" value={form.music_url} onChange={(v) => update("music_url", v)} placeholder="https://…" />
            <EditorHeading eyebrow="Galeri" title="Organizasyon fotoğraflarını seçin" description="Yalnızca bu organizasyona ait görseller kullanılabilir. Seçim sırası davetiyedeki sıradır." />
            <input ref={galleryInput} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(event) => { const files = Array.from(event.target.files || []); event.target.value = ""; void uploadGalleryImages(files); }} />
            <button type="button" className={styles.galleryUpload} disabled={galleryUploading || (wedding.data?.cover_images?.length || 0) >= 20} onClick={() => galleryInput.current?.click()}>{galleryUploading ? <LoaderCircle size={19} className="animate-spin" /> : <ImagePlus size={19} />}<span><strong>{galleryUploading ? "Görseller yükleniyor…" : "Galeriden görsel yükle"}</strong><small>JPG, PNG veya WebP · En fazla 20 görsel</small></span></button>
            {wedding.data?.cover_images?.length ? <div className={styles.mediaPicker}>{wedding.data.cover_images.map((image) => { const selected = form.gallery_images.includes(image); return <button type="button" key={image} aria-pressed={selected} onClick={() => update("gallery_images", selected ? form.gallery_images.filter((item) => item !== image) : [...form.gallery_images, image].slice(0,20))}><img src={image} alt="Organizasyon galeri adayı" />{selected ? <span><Check size={14} /> Seçildi</span> : <span>Galeriye ekle</span>}</button>; })}</div> : <div className={styles.emptyMedia}><Images size={24} /><strong>Henüz organizasyon fotoğrafı yok</strong><p>Organizasyon medyasına yüklenen fotoğraflar burada güvenli biçimde seçilebilir.</p></div>}
            <EditorHeading eyebrow="Görünürlük" title="Davetiyede gösterilecek bölümler" description="İhtiyacınız olmayan bölümleri yayından kaldırabilirsiniz." />
            <div className={styles.toggleList}><EditorToggle label="Geri sayım" checked={form.show_countdown} onChange={(v) => update("show_countdown", v)} /><EditorToggle label="Aile bilgileri" checked={form.show_families} onChange={(v) => update("show_families", v)} /><EditorToggle label="Fotoğraf galerisi" checked={form.show_gallery} onChange={(v) => update("show_gallery", v)} /></div>
          </> : null}
          {section === "design" ? <>
            <EditorHeading eyebrow="04 · Tema" title="Davetiye koleksiyonu" description="Tema değiştiğinde içerikleriniz korunur; yalnızca davetiyenin görsel dili değişir." />
            <button type="button" className={styles.themeCard} aria-pressed={form.theme_id === "botanical"} onClick={() => update("theme_id", "botanical")}><img src="/digital-invitation/botanical/gallery-1.jpg" alt="Botanical tema önizlemesi" /><div><strong>{form.theme_id === "botanical" ? <Check size={15} /> : null} Botanical</strong><span>Romantik çiçekler, pudra tonları ve zarif tipografi.</span></div></button>
            <button type="button" className={styles.themeCard} aria-pressed={form.theme_id === "bluebell-timeless"} onClick={() => update("theme_id", "bluebell-timeless")}><img src="/digital-invitation/bluebell/bluebell-watercolor.png" alt="Bluebell tema önizlemesi" /><div><strong>{form.theme_id === "bluebell-timeless" ? <Check size={15} /> : null} Bluebell — Zamansız Zarafet</strong><span>Mavi çan çiçekleri, fildişi kâğıt ve klasik davetiye düzeni.</span></div></button>
            <EditorHeading eyebrow="Deneyim" title="Loading ve hareket sistemi" description="Düşük hareket tercih eden ziyaretçiler için erişilebilir yedek görünüm otomatik uygulanır." />
            <label className={styles.field}><span>Loading deneyimi</span><select value={form.loading_style} onChange={(event) => update("loading_style", event.target.value as DigitalInvitationContent["loading_style"])}><option value="theme">Temaya özel açılış</option><option value="minimal">Minimal loading</option><option value="none">Loading gösterme</option></select></label>
            <EditorField label="Loading mesajı" value={form.loading_message} onChange={(v) => update("loading_message", v)} maxLength={120} />
            <label className={styles.field}><span>Animasyon yoğunluğu</span><select value={form.animation_intensity} onChange={(event) => update("animation_intensity", event.target.value as DigitalInvitationContent["animation_intensity"])}><option value="reduced">Sade</option><option value="rich">Zengin</option><option value="cinematic">Sinematik</option></select></label>
            <button type="button" className={styles.previewIntroButton} onClick={() => { setMobileView("preview"); setAnimationReplayKey((value) => value + 1); toast.success("Açılış animasyonu yeniden başlatıldı."); }}><Sparkles size={16} /> Açılışı oynat</button>
            <p style={{fontSize:'.78rem',lineHeight:1.6,color:'#75695e',marginTop:16}}>Yeni Lovable temaları aynı katalogda ayrı seçenek olarak görünecek. Tema ortak kullanılır; her organizasyonun içeriği ve yayın kaydı birbirinden ayrıdır.</p>
          </> : null}
        </div>
        </fieldset>
      </section>
      <aside className={styles.previewStage} data-mobile-active={mobileView === "preview"} aria-label="Telefon içinde canlı davetiye önizlemesi">
        <div className={styles.phone}><div className={styles.screen}><div className={styles.screenScroll}><div className={styles.screenScale}><InvitationRenderer content={form} preview replayKey={animationReplayKey} /></div></div></div><img className={styles.phoneFrame} src="/editor/purple-phone-frame.webp" alt="Mor telefon önizleme çerçevesi" /></div>
        <span className={styles.previewHint}>Telefon içinde kaydırarak kontrol edin</span>
      </aside>
    </div>
  </div></AdminShell>;
}

function EditorHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) { return <div className={styles.sectionHeading}><span>{eyebrow}</span><h2>{title}</h2><p>{description}</p></div>; }
function EditorField({ label, value, onChange, textarea = false, type = "text", ...props }: { label: string; value: string; onChange: (value: string) => void; textarea?: boolean; type?: string; maxLength?: number; placeholder?: string }) { return <label className={styles.field}><span>{label}</span>{textarea ? <textarea value={value} onChange={(event) => onChange(event.target.value)} {...props} /> : <input type={type} value={value} onChange={(event) => onChange(event.target.value)} {...props} />}</label>; }
function EditorToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) { return <label className={styles.toggle}><span>{label}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /></label>; }
