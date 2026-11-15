import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, MailOpen, Smartphone, Sparkles } from "lucide-react";
import { ElevatedCard, V4Button } from "@/components/v4/ui";
import { V4MarketingShell } from "./V4MarketingShell";
import styles from "./V4Marketing.module.css";

const invitationCards = [
  ["Botanical", "/digital-invitation/botanical/gallery-1.jpg", "Doğal dokular ve zarif tipografi."],
  ["Bluebell", "/digital-invitation/bluebell/bluebell-watercolor.png", "Yumuşak suluboya tonları ve modern akış."],
  ["ShineQR Experience", "/marketing/celebration.webp", "Davet, konum ve anı paylaşımı tek bağlantıda."],
] as const;

export function V4InvitationsPage() {
  return (
    <V4MarketingShell currentPath="/dijital-davetiyeler">
      <div className={styles.page}>
        <section className={`${styles.hero} ${styles.inviteHero}`}>
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>Dijital davetiyeler</p>
              <h1>İlk izlenim, davetle başlar.</h1>
              <p className={styles.heroLead}>Etkinliğinizin ruhunu taşıyan mobil öncelikli davetiyeler; tarih, konum ve ShineQR anı deneyimiyle tek bir akışta.</p>
              <div className={styles.actions}><V4Button asChild><Link href="/iletisim">Davetiyenizi oluşturun <ArrowRight aria-hidden="true" /></Link></V4Button><V4Button asChild tone="outline"><Link href="#koleksiyon">Koleksiyonu keşfet</Link></V4Button></div>
            </div>
            <div className={styles.showcase}><Image src="/digital-invitation/botanical/gallery-1.jpg" alt="ShineQR dijital davetiye örneği" fill priority sizes="(max-width: 900px) 92vw, 45vw" /></div>
          </div>
        </section>
        <section className={`${styles.section} ${styles.sectionTint}`} id="koleksiyon"><div className={styles.container}><div className={styles.sectionHead}><p className={styles.eyebrow}>Davetiyeniz, sizin stiliniz</p><h2>Zarif tasarım. Akıcı mobil deneyim.</h2></div><div className={styles.inviteGrid}>{invitationCards.map(([title,image,text])=><ElevatedCard interactive className={`${styles.card} ${styles.inviteCard}`} key={title}><Image src={image} alt={`${title} dijital davetiye`} width={700} height={520} /><div><h3>{title}</h3><p>{text}</p></div></ElevatedCard>)}</div></div></section>
        <section className={styles.section}><div className={styles.container}><div className={styles.featureGrid}>{[[MailOpen,"Tek bağlantıda davet"],[Smartphone,"Her ekranda kusursuz"],[Sparkles,"ShineQR ile bütünleşik"]].map(([Icon,title])=><ElevatedCard className={styles.card} key={title as string}><span className={styles.icon}><Icon aria-hidden="true" /></span><h3>{title as string}</h3><p><Check size={16} aria-hidden="true" /> Tarih, konum ve etkinlik bilgileri sade bir akışta sunulur.</p></ElevatedCard>)}</div></div></section>
      </div>
    </V4MarketingShell>
  );
}
