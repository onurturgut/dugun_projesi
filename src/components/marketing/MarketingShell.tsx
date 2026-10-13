import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Instagram, Mail, Menu } from "lucide-react";
import { navigation } from "./data";
import styles from "./marketing.module.css";
import { ThemeToggle } from "./ThemeToggle";

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.site}>
      <header className={styles.header}>
        <Link href="/" className={styles.logo} aria-label="ShineQR ana sayfa">
          <Image
            src="/brand/shineqr-lockup.png"
            alt="ShineQR"
            width={210}
            height={72}
            priority
          />
        </Link>
        <nav className={styles.nav} aria-label="Ana menü">
          {navigation.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <details className={styles.mobileNav}>
          <summary aria-label="Menüyü aç">
            <Menu size={21} />
          </summary>
          <div>
            {navigation.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
            <Link href="/sss">Sık sorulan sorular</Link>
            <Link href="/iletisim">İletişim</Link>
          </div>
        </details>
        <ThemeToggle />
        <Link href="/auth" className={styles.headerCta}>
          Hemen başla <ArrowRight size={15} />
        </Link>
      </header>
      {children}
      <footer className={styles.footer}>
        <div>
          <Image
            src="/brand/shineqr-lockup.png"
            alt="ShineQR"
            width={180}
            height={62}
          />
          <p>Birlikte yaşanan anların dijital hatırası.</p>
        </div>
        <div className={styles.footerLinks}>
          <Link href="/nasil-calisir">Nasıl çalışır?</Link>
          <Link href="/temalar">Tema galerisi</Link>
          <Link href="/sss">Sık sorulan sorular</Link>
          <Link href="/iletisim">İletişim</Link>
        </div>
        <div className={styles.social}>
          <Mail size={18} />
          <Instagram size={18} />
        </div>
      </footer>
    </div>
  );
}

export function PageHero({
  eyebrow,
  title,
  description,
  image = "/marketing/shineqr-wedding-hero-composition.png",
}: {
  eyebrow: string;
  title: string;
  description: string;
  image?: string;
}) {
  return (
    <section className={styles.pageHero}>
      <div>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1>{title}</h1>
        <p className={styles.lead}>{description}</p>
      </div>
      <Image
        src={image}
        alt=""
        width={900}
        height={700}
        priority
        sizes="(max-width: 800px) 100vw, 48vw"
      />
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  text,
}: {
  eyebrow?: string;
  title: string;
  text?: string;
}) {
  return (
    <div className={styles.sectionHeading}>
      {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
      <h2>{title}</h2>
      {text && <p>{text}</p>}
    </div>
  );
}

export function CtaBand() {
  return (
    <section className={styles.ctaBand}>
      <p className={styles.eyebrow}>ŞİMDİ SIRA SİZDE</p>
      <h2>
        Bir gün geçer.
        <br />
        Anılar sizinle kalır.
      </h2>
      <div>
        <Link className={styles.primary} href="/auth">
          Hemen başla <ArrowRight size={18} />
        </Link>
        <Link className={styles.ghost} href="/iletisim">
          Bize ulaşın
        </Link>
      </div>
    </section>
  );
}
