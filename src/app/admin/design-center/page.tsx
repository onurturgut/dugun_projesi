import { redirect } from "next/navigation";
import Image from "next/image";
import { ChevronDown, GitBranch, History, MonitorSmartphone, PackageOpen, Palette, QrCode, Sparkles, Type } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { qrCollectionReferences } from "@/lib/design";
import { session } from "@/lib/server/auth";
import "./design-center.css";

const modules = [
  { id: "qr", title: "QR Tasarımları", detail: "1 yayınlanmış · 4 onay bekliyor", description: "QR ürün tasarımlarını ve onay durumlarını tek koleksiyonda inceleyin.", Icon: QrCode },
  { id: "wedding", title: "Wedding Tasarımları", detail: "Mevcut yükleme deneyimi korunuyor", description: "Organizasyonların wedding ekranı şablonlarını ve mevcut deneyimi yönetin.", Icon: MonitorSmartphone },
  { id: "loading", title: "Loading Page Tasarımları", detail: "4 mevcut açılış", description: "Yükleme sırasında kullanılan açılış tasarımlarını bir arada değerlendirin.", Icon: Sparkles },
  { id: "colors", title: "Renk ve Gradient Kütüphanesi", detail: "3 The Editorial preset’i", description: "Onaylı renk ve gradient preset’lerini tasarım yüzeylerinde tutarlı biçimde kullanın.", Icon: Palette },
  { id: "fonts", title: "Font Kütüphanesi", detail: "2 onaylı eşleşme", description: "Onaylı tipografi eşleşmelerini ve kullanım bağlamlarını görüntüleyin.", Icon: Type },
  { id: "physical", title: "Fiziksel QR Ürünleri", detail: "15 × 20 cm masa kartı", description: "Baskıya hazırlanan fiziksel QR ürünlerinin format ve güvenli alanlarını inceleyin.", Icon: PackageOpen },
  { id: "matching", title: "Tasarım Eşleştirmeleri", detail: "Organizasyon bazlı", description: "Organizasyonlara atanan tasarım yüzeylerini ve şablon bağlantılarını izleyin.", Icon: GitBranch },
  { id: "versions", title: "Tasarım Sürümleri", detail: "Değişmez snapshot geçmişi", description: "Yayınlanan sürümlerin geçmişini mevcut organizasyonları değiştirmeden takip edin.", Icon: History },
] as const;

export default async function DesignCenterPage() {
  const user = await session();
  if (user?.role !== "platform") redirect("/admin");

  return <AdminShell><section className="design-center">
    <header className="design-center__hero">
      <div><p>TASARIM MERKEZİ · V2</p><h1>Her yüzey, tek bir yaratıcı sistem.</h1><span>Yayınlanan şablonları, kontrollü preset’leri, fiziksel ürünleri ve organizasyon eşleştirmelerini yönetin.</span></div>
      <div className="design-center__status"><strong>FAZ 1 + 2</strong><span>The Editorial üretime hazır</span></div>
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
            <div className="design-center__collection-head"><div><span>WEDDING COLLECTION</span><h3>QR tasarım koleksiyonu</h3></div><small>5 ana tasarım · 15 planlanan varyasyon</small></div>
            <div className="design-center__collection">{qrCollectionReferences.map((item) => <article key={item.id}>
              <Image src={item.image} alt={`${item.name} ZIP ürün mockup'ı`} width={768} height={768}/>
              <div><span>{item.number}</span><h3>{item.name}</h3><p>{item.tagline}</p></div><b>ZIP REFERANSI</b>
            </article>)}</div>
          </> : <div className="design-center__empty-state"><Icon size={22}/><span>{detail}</span></div>}
        </div>
      </details>)}
    </div>

    <aside className="design-center__note"><strong>Sürüm güvenliği</strong><p>Organizasyonlar şablon kimliği ve sürümüyle sabitlenir. Yeni bir yayın mevcut organizasyonların görünümünü kendiliğinden değiştirmez.</p></aside>
  </section></AdminShell>;
}
