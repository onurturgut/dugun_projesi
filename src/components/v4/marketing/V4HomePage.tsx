import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Building2, CalendarHeart, Camera, Check, LayoutDashboard, QrCode, Sparkles, Users } from "lucide-react";
import { BraidedGradient, ElevatedCard, V4Button } from "@/components/v4/ui";
import { V4MarketingShell } from "./V4MarketingShell";
import styles from "./V4Marketing.module.css";

const steps = [
  [QrCode, "QR kodunu paylaşın", "Masanıza, davetiyenize veya etkinlik alanına ait QR kodu saniyeler içinde erişilebilir olur."],
  [Camera, "Misafirler anıları yüklesin", "Uygulama ve misafir hesabı gerekmeden fotoğraf, video ve mesajlar tek akışta yüklenir."],
  [Sparkles, "Albümünüz yaşamaya başlasın", "Farklı açılardan yakalanan tüm anlar size özel profesyonel albümde bir araya gelir."],
] as const;

const features = [
  [LayoutDashboard, "Profesyonel dijital albüm", "Tüm anılarınızı seçkin, düzenli ve yönetilebilir tek bir deneyimde saklayın."],
  [CalendarHeart, "Dijital davetiye", "Etkinliğinizin diliyle uyumlu, mobil öncelikli davetiyelerle ilk izlenimi güçlendirin."],
  [Building2, "İşletmeler için dijital vitrin", "Hizmetlerinizi sergileyin, talepleri toplayın ve müşteri yolculuğunu tek panelden yönetin."],
  [Users, "CRM ve operasyon", "Müşterileri, organizasyonları ve takip adımlarını ekipler için sade bir akışta birleştirin."],
] as const;

export function V4HomePage() {
  return (
    <V4MarketingShell currentPath="/">
      <div className={styles.page}>
        <section className={styles.hero}>
          <BraidedGradient />
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>Yeni nesil dijital anı deneyimi</p>
              <h1>Bir gün. Binlerce anı. Tek bir ShineQR.</h1>
              <p className={styles.heroLead}>Misafirlerinizin yakaladığı fotoğraf ve videoları QR ile toplayın; profesyonel albüm, dijital davetiye ve işletme araçlarıyla deneyimi uçtan uca yönetin.</p>
              <div className={styles.actions}>
                <V4Button asChild><Link href="/auth">Hemen başla <ArrowRight aria-hidden="true" /></Link></V4Button>
                <V4Button asChild tone="outline"><Link href="#nasil-calisir">Nasıl çalışır?</Link></V4Button>
              </div>
              <ul className={styles.proof}>
                {["Uygulama gerekmez", "Misafir hesabı gerekmez", "Mobil uyumlu"].map((item) => <li key={item}><Check size={16} aria-hidden="true" />{item}</li>)}
              </ul>
            </div>
            <div className={styles.heroVisual} aria-label="ShineQR albüm ve QR deneyimi">
              <div className={`${styles.visualCard} ${styles.visualMain}`}><Image src="/marketing/seher-muhammed-wedding-composition-v2.png" alt="ShineQR dijital albüm deneyimi" fill priority sizes="(max-width: 900px) 92vw, 42vw" /></div>
              <div className={`${styles.visualCard} ${styles.visualFloat}`}><Image src="/marketing/qr-scan-wedding-cards.png" alt="ShineQR QR kartı" fill sizes="(max-width: 900px) 38vw, 18vw" /></div>
              <div className={styles.visualBadge}>QR ile<br />tek dokunuş</div>
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.sectionTint}`} id="nasil-calisir">
          <div className={styles.container}>
            <div className={styles.sectionHead}><p className={styles.eyebrow}>Üç adımda ShineQR</p><h2>Anıları toplamak bu kadar kolay.</h2><p className={styles.sectionLead}>Fiziksel QR temasından dijital albüme uzanan kesintisiz, zarif ve hızlı akış.</p></div>
            <div className={styles.steps}>{steps.map(([Icon,title,text],index)=><ElevatedCard interactive className={styles.card} key={title}><span className={styles.cardNumber}>0{index+1}</span><Icon size={28} aria-hidden="true" /><h3>{title}</h3><p>{text}</p></ElevatedCard>)}</div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={`${styles.container} ${styles.split}`}>
            <div className={styles.showcase}><Image src="/marketing/album-gallery-card.webp" alt="ShineQR profesyonel dijital albüm" fill sizes="(max-width: 900px) 92vw, 50vw" /></div>
            <div className={styles.splitCopy}><p className={styles.eyebrow}>Profesyonel albüm</p><h2>Her açıdan yaşayan bir hikâye.</h2><p className={styles.sectionLead}>Sevdiklerinizin gözünden yakalanan doğal anlar, yalnızca size ait güvenli bir albümde birikir. Seçin, yönetin ve toplu indirin.</p><div className={styles.actions}><V4Button asChild tone="secondary"><Link href="/wedding/oguz-hilal">Örnek albümü keşfet <ArrowRight aria-hidden="true" /></Link></V4Button></div></div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.sectionTint}`}>
          <div className={styles.container}>
            <div className={styles.sectionHead}><p className={styles.eyebrow}>Tek platform, bütün deneyim</p><h2>Etkinliğin her dijital teması ShineQR'da.</h2></div>
            <div className={styles.featureGrid}>{features.map(([Icon,title,text])=><ElevatedCard interactive className={styles.card} key={title}><span className={styles.icon}><Icon aria-hidden="true" /></span><h3>{title}</h3><p>{text}</p></ElevatedCard>)}</div>
          </div>
        </section>

        <section className={styles.section} id="paketler">
          <div className={styles.container}>
            <div className={styles.sectionHead}><p className={styles.eyebrow}>Paketler</p><h2>İhtiyacınıza göre büyüyen kapsam.</h2><p className={styles.sectionLead}>QR ile misafir yükleme, albüm, davetiye ve profesyonel hizmet seçeneklerini tek yerde karşılaştırın.</p></div>
            <div className={styles.pricingGrid}>{[
              ["Başlangıç", "Samimi etkinlikler için temel QR ve albüm deneyimi."],
              ["Deneyim", "Daha geniş depolama ve zengin etkinlik dokunuşları."],
              ["Profesyonel", "Markalar ve işletmeler için gelişmiş yönetim kapsamı."],
            ].map(([title,text],index)=><ElevatedCard className={`${styles.card} ${styles.priceCard}`} key={title}><p className={styles.eyebrow}>{index===1?"En çok tercih edilen":`Plan 0${index+1}`}</p><h3>{title}</h3><p>{text}</p><ul>{["QR ile misafir yükleme","Özel dijital albüm","Mobil uyumlu deneyim"].map(item=><li key={item}><Check size={17} aria-hidden="true" />{item}</li>)}</ul><V4Button asChild tone={index===1?"primary":"outline"}><Link href="/paketler">Paketi incele</Link></V4Button></ElevatedCard>)}</div>
          </div>
        </section>

        <section className={styles.cta}><div className={styles.ctaInner}><p className={styles.eyebrow}>Sıra sizin anılarınızda</p><h2>Etkinliğinizi tek QR ile geleceğe taşıyın.</h2><p>Misafirler için zahmetsiz, sizin için düzenli ve her ekranda premium bir deneyim.</p><V4Button asChild><Link href="/auth">ShineQR'ı başlat <ArrowRight aria-hidden="true" /></Link></V4Button></div></section>
      </div>
    </V4MarketingShell>
  );
}
