import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, MailOpen, MapPin, Smartphone } from "lucide-react";
import { MarketingShell } from "./MarketingShell";
import styles from "./digital-invitations.module.css";

const invitations = [
  {
    name: "Botanical",
    image: "/digital-invitation/botanical/gallery-1.jpg",
    description: "Doğal dokular, zarif tipografi ve romantik bir karşılama.",
  },
  {
    name: "Bluebell",
    image: "/digital-invitation/bluebell/bluebell-watercolor.png",
    description: "Yumuşak suluboya tonlarıyla sade ve zamansız bir davet.",
  },
  {
    name: "ShineQR Experience",
    image: "/marketing/celebration.webp",
    description: "Davet, konum ve anı paylaşımını tek bağlantıda birleştirin.",
  },
] as const;

export function DigitalInvitationsPage() {
  return (
    <MarketingShell>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>DİJİTAL DAVETİYELER</p>
          <h1>İlk izlenim, davetle başlar.</h1>
          <p className={styles.lead}>
            Etkinliğinizin ruhunu taşıyan mobil uyumlu davetiyeler; tarih,
            konum ve ShineQR anı deneyimiyle tek bir zarif akışta.
          </p>
          <div className={styles.actions}>
            <Link href="/iletisim" className={styles.primary}>
              Davetiyenizi oluşturun <ArrowRight size={17} />
            </Link>
            <Link href="#koleksiyon" className={styles.secondary}>
              Koleksiyonu keşfet
            </Link>
          </div>
        </div>
        <div className={styles.heroVisual}>
          <Image
            src="/digital-invitation/botanical/gallery-1.jpg"
            alt="ShineQR Botanical dijital davetiye"
            fill
            priority
            sizes="(max-width: 800px) 100vw, 48vw"
          />
        </div>
      </section>

      <section className={styles.collection} id="koleksiyon">
        <div className={styles.heading}>
          <p className={styles.eyebrow}>DAVETİYENİZ, SİZİN STİLİNİZ</p>
          <h2>Zarif tasarım. Akıcı mobil deneyim.</h2>
        </div>
        <div className={styles.grid}>
          {invitations.map((invitation) => (
            <article className={styles.card} key={invitation.name}>
              <div className={styles.cardImage}>
                <Image
                  src={invitation.image}
                  alt={`${invitation.name} dijital davetiye`}
                  fill
                  sizes="(max-width: 760px) 100vw, 33vw"
                />
              </div>
              <div className={styles.cardBody}>
                <h3>{invitation.name}</h3>
                <p>{invitation.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.features}>
        {[
          [MailOpen, "Tek bağlantıda davet"],
          [Smartphone, "Her ekranda zarif"],
          [MapPin, "Tarih ve konum birlikte"],
        ].map(([Icon, title]) => (
          <article key={title as string}>
            <span><Icon aria-hidden="true" /></span>
            <h3>{title as string}</h3>
            <p><CheckCircle2 size={16} /> Etkinlik bilgileri sade ve erişilebilir bir akışta sunulur.</p>
          </article>
        ))}
      </section>
    </MarketingShell>
  );
}
