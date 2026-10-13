import { redirect } from "next/navigation";
import Image from "next/image";
import { Palette, QrCode, MonitorSmartphone, Sparkles, Type, PackageOpen, GitBranch, History } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { qrCollectionReferences } from "@/lib/design";
import { session } from "@/lib/server/auth";
import "./design-center.css";

const modules = [
  ["QR Tasarımları", "1 yayınlanmış · 4 onay bekliyor", QrCode],
  ["Wedding Tasarımları", "Mevcut yükleme deneyimi korunuyor", MonitorSmartphone],
  ["Loading Page Tasarımları", "4 mevcut açılış", Sparkles],
  ["Renk ve Gradient Kütüphanesi", "3 The Editorial preset’i", Palette],
  ["Font Kütüphanesi", "2 onaylı eşleşme", Type],
  ["Fiziksel QR Ürünleri", "15 × 20 cm masa kartı", PackageOpen],
  ["Tasarım Eşleştirmeleri", "Organizasyon bazlı", GitBranch],
  ["Tasarım Sürümleri", "Değişmez snapshot geçmişi", History],
] as const;

export default async function DesignCenterPage() {
  const user = await session();
  if (user?.role !== "platform") redirect("/admin");
  return <AdminShell>
    <section className="design-center">
      <header className="design-center__hero">
        <div><p>TASARIM MERKEZİ · V2</p><h1>Her yüzey, tek bir yaratıcı sistem.</h1><span>Yayınlanan şablonları, kontrollü preset’leri, fiziksel ürünleri ve organizasyon eşleştirmelerini yönetin.</span></div>
        <div className="design-center__status"><strong>FAZ 1 + 2</strong><span>The Editorial üretime hazır</span></div>
      </header>
      <div className="design-center__modules">{modules.map(([title, detail, Icon]) => <article key={title}><Icon size={19}/><div><h2>{title}</h2><p>{detail}</p></div></article>)}</div>
      <div className="design-center__section-head"><div><p>WEDDING COLLECTION</p><h2>QR tasarım koleksiyonu</h2></div><span>5 ana tasarım · 15 planlanan varyasyon</span></div>
      <div className="design-center__collection">{qrCollectionReferences.map((item) => <article key={item.id}><Image src={item.image} alt={`${item.name} ZIP ürün mockup'ı`} width={768} height={768} /><div><span>{item.number}</span><h3>{item.name}</h3><p>{item.tagline}</p></div><b>ZIP REFERANSI</b></article>)}</div>
      <aside className="design-center__note"><strong>Sürüm güvenliği</strong><p>Organizasyonlar şablon kimliği ve sürümüyle sabitlenir. Yeni bir yayın mevcut organizasyonların görünümünü kendiliğinden değiştirmez.</p></aside>
    </section>
  </AdminShell>;
}
