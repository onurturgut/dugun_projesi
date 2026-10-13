import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CakeSlice,
  Camera,
  Heart,
  ImageIcon,
  PartyPopper,
  QrCode,
  Users,
  ShieldCheck,
  Download,
  Building2,
  Check,
} from "lucide-react";
import styles from "./preview.module.css";
import { LandingDemo, TrackedContactLink } from "./LandingDemo";

const occasions = [
  [Heart, "Düğünler"],
  [Heart, "Nişanlar"],
  [PartyPopper, "Kına geceleri"],
  [CakeSlice, "Doğum günleri"],
  [Users, "Özel etkinlikler"],
] as const;

const steps = [
  {
    icon: QrCode,
    title: "QR kodu okut",
    text: "Davetlileriniz, masadaki QR kodu telefon kamerasıyla kolayca okutur.",
  },
  {
    icon: ImageIcon,
    title: "Anını paylaş",
    text: "Fotoğraf, video veya kısa bir notla o anı sizinle paylaşır.",
  },
  {
    icon: Users,
    title: "Birlikte hatırla",
    text: "Tüm anılar size özel albümde birikir; siz görüntüler ve indirirsiniz.",
  },
];

const questions = [
  [
    "Uygulama indirmek gerekiyor mu?",
    "Hayır. Misafirler QR kodu okutup doğrudan tarayıcılarından paylaşım yapar.",
  ],
  [
    "Albümü kimler görebilir?",
    "Yalnızca organizasyon sahibi, ilgili işletme ve platform yöneticisi albüme erişebilir.",
  ],
  [
    "Fotoğraf ve videolar ne kadar saklanır?",
    "Varsayılan saklama süresi organizasyon tarihinden itibaren üç aydır.",
  ],
  [
    "Organizasyondan sonra yükleme yapılabilir mi?",
    "Evet. Yüklemeler varsayılan olarak organizasyon tarihinden yedi gün sonrasına kadar açıktır.",
  ],
];

export default function DesignPreviewPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.logo} aria-label="ShineQR ana sayfa">
          shineqr<span>.</span>
        </Link>
        <nav className={styles.nav} aria-label="Önizleme menüsü">
          <a href="#nasil">Nasıl çalışır?</a>
          <a href="#tasarimlar">QR Tasarımları</a>
          <a href="#isletmeler">İşletmeler için</a>
          <a href="#sorular">Sorular</a>
        </nav>
        <Link href="/auth" className={styles.login}>
          Giriş yap
        </Link>
      </header>

      <section className={styles.hero}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>
            ANILARIN YENİ ADRESİ <span />
          </p>
          <h1>
            Bir gün.
            <br />
            <em>Binlerce anı.</em>
          </h1>
          <p className={styles.lead}>
            Düğününüzde sevdiklerinizin gözünden anıları toplayın, hepsini tek
            bir yerde, hep birlikte yaşayın.
          </p>
          <div className={styles.actions}>
            <Link href="/wedding/oguz-hilal" className={styles.primary}>
              Örnek sayfayı keşfet <ArrowRight size={19} />
            </Link>
            <a href="#nasil" className={styles.secondary}>
              Nasıl çalışır?
            </a>
          </div>
        </div>

        <div
          className={styles.visual}
          aria-label="ShineQR organizasyon sayfası önizlemesi"
        >
          <div className={`${styles.polaroid} ${styles.polaroidLeft}`}>
            <Image
              src="/marketing/printed-memories.webp"
              alt="Masa çiçekleri ve organizasyon anıları"
              fill
              sizes="190px"
            />
          </div>
          <div className={`${styles.note} ${styles.noteLeft}`}>
            <strong>Her açıdan</strong>
            <span>Aynı günü farklı gözlerden görün.</span>
          </div>
          <div className={styles.phone}>
            <div className={styles.phoneTop}>
              <span>9:41</span>
              <i />
            </div>
            <div className={styles.phoneBody}>
              <p className={styles.phoneDate}>11 EKİM 2026</p>
              <h2>Seher &amp; Muhammed</h2>
              <p>Bu güzel günün bir parçasısın.</p>
              <div className={styles.mediaTabs}>
                <span>
                  <Camera size={14} /> Fotoğraf
                </span>
                <span>Video</span>
                <span>Mesaj</span>
              </div>
              <LandingDemo />
              <div className={styles.phoneGallery}>
                <Image
                  src="/marketing/celebration.webp"
                  alt="Organizasyon masası"
                  width={92}
                  height={92}
                />
                <Image
                  src="/marketing/guest-camera.webp"
                  alt="Misafir fotoğraf çekiyor"
                  width={92}
                  height={92}
                />
                <Image
                  src="/marketing/printed-memories.webp"
                  alt="Basılı anılar"
                  width={92}
                  height={92}
                />
              </div>
            </div>
          </div>
          <div className={`${styles.polaroid} ${styles.polaroidRight}`}>
            <Image
              src="/marketing/celebration.webp"
              alt="Kutlama anı"
              fill
              sizes="190px"
            />
          </div>
          <div className={`${styles.note} ${styles.noteRight}`}>
            <strong>Birlikte</strong>
            <span>Tüm anılar tek bir yerde buluşur.</span>
          </div>
        </div>
      </section>

      <section className={styles.occasionBar} aria-label="Kullanım alanları">
        {occasions.map(([Icon, label], index) => (
          <div key={label} className={index === 0 ? styles.activeOccasion : ""}>
            <Icon size={23} strokeWidth={1.4} />
            <span>{label}</span>
          </div>
        ))}
      </section>

      <section id="nasil" className={styles.steps}>
        {steps.map(({ icon: Icon, title, text }, index) => (
          <article key={title}>
            <div className={styles.icon}>
              <Icon size={28} strokeWidth={1.4} />
            </div>
            <div>
              <h2>{title}</h2>
              <p>{text}</p>
            </div>
            <span className={styles.number}>0{index + 1}</span>
          </article>
        ))}
      </section>

      <section id="tasarimlar" className={styles.showcase}>
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>MASANIZIN BİR PARÇASI</p>
          <h2>
            Sadece bir kod değil.
            <br />
            <em>Tasarımın bir parçası.</em>
          </h2>
          <p>
            Organizasyonunuza özel hazırlanan QR kartları, masanızın estetiğine
            sessizce eşlik eder.
          </p>
        </div>
        <figure className={styles.qrVisual}>
          <Image
            src="/marketing/qr-card-options-editorial.webp"
            alt="Ayaklı ve düz QR masa kartı tasarımları"
            width={1536}
            height={1024}
            sizes="(max-width: 800px) 100vw, 58vw"
          />
          <figcaption>
            <span>01 · Ayaklı masa kartı</span>
            <span>02 · Düz masa kartı</span>
          </figcaption>
        </figure>
      </section>

      <section className={styles.benefits}>
        <div className={styles.benefitPhoto}>
          <Image
            src="/marketing/guest-camera.webp"
            alt="Misafirin organizasyonda fotoğraf çekmesi"
            fill
            sizes="(max-width: 800px) 100vw, 42vw"
          />
        </div>
        <div className={styles.benefitCopy}>
          <p className={styles.eyebrow}>
            TEKNOLOJİ GERİ PLANDA, ANILAR ÖN PLANDA
          </p>
          <h2>
            Siz günü yaşayın.
            <br />
            <em>Anılar kendiliğinden biriksin.</em>
          </h2>
          <p>
            Misafirlerinizin gördüğü kahkahalar, danslar ve küçük anlar tek bir
            özel albümde size ulaşsın.
          </p>
          <ul>
            <li>
              <Camera size={20} />
              <span>
                <strong>Fotoğraf, video ve mesaj</strong>Tek bir kolay paylaşım
                ekranında.
              </span>
            </li>
            <li>
              <ShieldCheck size={20} />
              <span>
                <strong>Özel ve kontrollü albüm</strong>Misafirler diğer
                paylaşımları göremez.
              </span>
            </li>
            <li>
              <Download size={20} />
              <span>
                <strong>Toplu indirme</strong>Anılarınızı saklama süresi içinde
                arşivleyin.
              </span>
            </li>
          </ul>
        </div>
      </section>

      <section id="isletmeler" className={styles.business}>
        <div>
          <Building2 size={28} strokeWidth={1.3} />
          <p className={styles.eyebrow}>
            İŞLETMELER VE ORGANİZASYON EKİPLERİ İÇİN
          </p>
          <h2>
            Güzel bir organizasyon.
            <br />
            <em>Unutulmayan bir deneyim.</em>
          </h2>
          <p>
            Müşterilerinize günün ötesine geçen bir hatıra sunun;
            organizasyonlarınızı ve QR kodlarınızı tek panelden yönetin.
          </p>
          <Link href="/auth" className={styles.lightButton}>
            İşletme paneline giriş <ArrowRight size={18} />
          </Link>
        </div>
        <div className={styles.businessList}>
          {[
            "Her organizasyona özel sayfa ve QR kod",
            "Organizasyon sahibine özel hesap",
            "Fotoğraf ve videoları topluca indirme",
            "Organizasyonları tek panelden yönetme",
          ].map((item, index) => (
            <div key={item}>
              <span>0{index + 1}</span>
              <p>{item}</p>
              <Check size={19} />
            </div>
          ))}
        </div>
      </section>

      <section id="sorular" className={styles.faq}>
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>AKLINIZDA KALMASIN</p>
          <h2>
            Küçük sorular.
            <br />
            <em>Net cevaplar.</em>
          </h2>
        </div>
        <div className={styles.faqList}>
          {questions.map(([question, answer]) => (
            <details key={question}>
              <summary>
                {question}
                <span>+</span>
              </summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className={styles.trust}>
        <div>
          <ShieldCheck size={32} strokeWidth={1.2} />
          <p className={styles.eyebrow}>ANILARINIZ SİZE ÖZEL</p>
          <h2>
            Paylaşmak kolay.
            <br />
            <em>Kontrol her zaman sizde.</em>
          </h2>
        </div>
        <div className={styles.trustGrid}>
          <article>
            <strong>Özel albüm</strong>
            <p>Misafirler diğer yüklemeleri göremez.</p>
          </article>
          <article>
            <strong>Yetkili erişim</strong>
            <p>Albüm yalnızca ilgili hesaplara açıktır.</p>
          </article>
          <article>
            <strong>Belirli saklama süresi</strong>
            <p>İçerikler varsayılan olarak üç ay saklanır.</p>
          </article>
          <article>
            <strong>Toplu arşiv</strong>
            <p>Süre dolmadan bütün anılar indirilebilir.</p>
          </article>
        </div>
      </section>

      <section className={styles.closing}>
        <Heart size={28} strokeWidth={1.2} />
        <p className={styles.eyebrow}>BUGÜNÜNÜZ, YARININIZIN HİKÂYESİ</p>
        <h2>
          O gün geçer.
          <br />
          <em>Anılar sizinle kalır.</em>
        </h2>
        <div className={styles.closingActions}>
          <Link href="/wedding/oguz-hilal" className={styles.primary}>
            Örnek organizasyonu keşfet <ArrowRight size={18} />
          </Link>
          <TrackedContactLink />
        </div>
      </section>

      <footer className={styles.footer}>
        <Link href="/" className={styles.logo}>
          shineqr<span>.</span>
        </Link>
        <p>Birlikte yaşanan anların dijital hatırası.</p>
        <Link href="/auth">
          Hesabınıza giriş <ArrowRight size={14} />
        </Link>
      </footer>
    </main>
  );
}
