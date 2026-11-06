import { redirect } from "next/navigation";
import Image from "next/image";
import { ChevronDown, GitBranch, History, MonitorSmartphone, PackageOpen, Palette, QrCode, Sparkles, Type } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { QrThemeAccordion } from "@/components/admin/QrThemeAccordion";
import { availableTemplates, isVideoIntro, qrCollectionReferences, videoIntroAssets } from "@/lib/design";
import { weddingTemplates } from "@/lib/wedding-templates";
import { session } from "@/lib/server/auth";
import "./design-center.css";

const modules = [
  { id: "qr", title: "QR Tasarımları", detail: "1 yayınlanmış · 4 onay bekliyor", description: "QR ürün tasarımlarını ve onay durumlarını tek koleksiyonda inceleyin.", Icon: QrCode },
  { id: "wedding", title: "Wedding Tasarımları", detail: "Mevcut yükleme deneyimi korunuyor", description: "Organizasyonların wedding ekranı şablonlarını ve mevcut deneyimi yönetin.", Icon: MonitorSmartphone },
  { id: "loading", title: "Loading Page Tasarımları", detail: "8 mevcut açılış", description: "Yükleme sırasında kullanılan açılış tasarımlarını bir arada değerlendirin.", Icon: Sparkles },
  { id: "colors", title: "Renk ve Gradient Kütüphanesi", detail: "3 onaylı renk preset’i", description: "Onaylı renk ve gradient preset’lerini tasarım yüzeylerinde tutarlı biçimde kullanın.", Icon: Palette },
  { id: "fonts", title: "Font Kütüphanesi", detail: "2 onaylı eşleşme", description: "Onaylı tipografi eşleşmelerini ve kullanım bağlamlarını görüntüleyin.", Icon: Type },
  { id: "physical", title: "Fiziksel QR Ürünleri", detail: "Mini QR ve karşılama tabelası", description: "Baskıya hazırlanan fiziksel QR ürünlerinin format ve güvenli alanlarını inceleyin.", Icon: PackageOpen },
  { id: "matching", title: "Tasarım Eşleştirmeleri", detail: "Organizasyon bazlı", description: "Organizasyonlara atanan tasarım yüzeylerini ve şablon bağlantılarını izleyin.", Icon: GitBranch },
  { id: "versions", title: "Tasarım Sürümleri", detail: "Değişmez snapshot geçmişi", description: "Yayınlanan sürümlerin geçmişini mevcut organizasyonları değiştirmeden takip edin.", Icon: History },
] as const;

const loadingTemplates = availableTemplates("loading");
const imageTreatmentLabels = { arch: "Kemer kadraj", full: "Tam ekran", polaroid: "Polaroid kolaj" } as const;

export default async function DesignCenterPage() {
  const user = await session();
  if (user?.role !== "platform") redirect("/admin");

  return <AdminShell><section className="design-center">
    <header className="design-center__hero">
      <div><p>TASARIM MERKEZİ · V2</p><h1>Her yüzey, tek bir yaratıcı sistem.</h1><span>Yayınlanan şablonları, kontrollü preset’leri, fiziksel ürünleri ve organizasyon eşleştirmelerini yönetin.</span></div>
      <div className="design-center__status"><strong>FAZ 1 + 2</strong><span>Aktif koleksiyonlar üretime hazırlanıyor</span></div>
    </header>

    <div className="design-center__section-head"><div><p>TASARIM AKIŞLARI</p><h2>Yönetmek istediğiniz alanı açın</h2></div><span>Her bölüm ayrı ayrı açılıp kapatılabilir.</span></div>

    <div className="design-center__modules">
      {modules.map(({ id, title, detail, description, Icon }) => <details className="design-center__module" key={id}>
        <summary>
          <span className="design-center__module-icon"><Icon size={20}/></span>
          <span className="design-center__module-title"><strong>{title}</strong><small>{detail}</small></span>
          <ChevronDown className="design-center__chevron" size={20}/>
        </summary>
        <div className="design-center__module-content">
          <p>{description}</p>
          {id === "qr" ? <>
            <div className="design-center__collection-head"><div><span>WEDDING COLLECTION</span><h3>QR tasarım koleksiyonu</h3></div><small>4 ana tasarım · 20 renk varyasyonu</small></div>
            <div className="design-center__collection">{qrCollectionReferences.map((item) => <article key={item.id}>
              <Image src={item.image} alt={`${item.name} ZIP ürün mockup'ı`} width={768} height={768}/>
              <div><span>{item.number}</span><h3>{item.name}</h3><p>{item.tagline}</p></div><b>ZIP REFERANSI</b>
            </article>)}</div>
          </> : id === "wedding" ? <>
            <div className="design-center__collection-head"><div><span>WEDDING COLLECTION</span><h3>Wedding tema kütüphanesi</h3></div><small>{weddingTemplates.length} yayınlanmış tema</small></div>
            <div className="design-center__catalog design-center__catalog--wedding">{weddingTemplates.map((template) => <article key={template.id}>
              <div className="design-center__catalog-media"><Image src={template.reference} alt={`${template.name} wedding tema önizlemesi`} fill sizes="(max-width: 640px) 100vw, (max-width: 1000px) 50vw, 33vw"/></div>
              <div className="design-center__catalog-copy"><header><span>{template.number}</span><div><h3>{template.name}</h3><p>{template.description}</p></div></header>
                <dl><div><dt>Görsel yaklaşımı</dt><dd>{imageTreatmentLabels[template.imageTreatment]}</dd></div><div><dt>Renk modu</dt><dd>{template.monochrome ? "Monokrom" : "Renkli"}</dd></div></dl>
                <div className="design-center__swatches" aria-label={`${template.name} renk paleti`}>{[template.base, template.light, template.accent, template.ink].map((color) => <i key={color} style={{ backgroundColor: color }} title={color}/>)}</div>
              </div>
            </article>)}</div>
          </> : id === "loading" ? <>
            <div className="design-center__collection-head"><div><span>LOADING COLLECTION</span><h3>Loading Page tasarımları</h3></div><small>{loadingTemplates.length} yayınlanmış açılış</small></div>
            <div className="design-center__catalog design-center__catalog--loading">{loadingTemplates.map((template, index) => {
              const video = isVideoIntro(template.id) ? videoIntroAssets[template.id] : undefined;
              return <article key={template.id}>
                <div className="design-center__loading-preview" data-static={!video} data-transparent={template.id === "autumn-phone" || undefined} style={video ? undefined : { "--preview-hue": (index * 47 + 338) % 360 } as React.CSSProperties}>
                  {video ? <video src={video.video} poster={video.poster} aria-label={`${template.name} loading page önizlemesi`} autoPlay muted loop playsInline preload="metadata"/> : <><Sparkles size={24}/><strong>{template.name}</strong></>}
                </div>
                <h3 className="design-center__loading-title">{template.name}</h3>
              </article>;
            })}</div>
          </> : id === "physical" ? <QrThemeAccordion/> : <div className="design-center__empty-state"><Icon size={22}/><span>{detail}</span></div>}
        </div>
      </details>)}
    </div>

    <aside className="design-center__note"><strong>Sürüm güvenliği</strong><p>Organizasyonlar şablon kimliği ve sürümüyle sabitlenir. Yeni bir yayın mevcut organizasyonların görünümünü kendiliğinden değiştirmez.</p></aside>
  </section></AdminShell>;
}
