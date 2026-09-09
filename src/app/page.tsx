import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  Camera,
  Check,
  Download,
  Heart,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import styles from "./landing.module.css";

const steps = [
  {
    icon: QrCode,
    title: "Bir QR kodla başlayın.",
    text: "Organizasyonunuza özel QR kodu masalara yerleştirin. Misafirleriniz telefonlarının kamerasıyla sayfanıza ulaşsın.",
  },
  {
    icon: Camera,
    title: "O anı paylaşsınlar.",
    text: "Yeni bir fotoğraf veya video çeksinler, galerilerinden seçsinler. Dilerlerse isimlerini ve size bir mesaj bıraksınlar.",
  },
  {
    icon: Heart,
    title: "Hepsi size kalsın.",
    text: "Paylaşılan anıları özel albümünüzde anında görün. Fotoğraf ve videolarınızı indirip yıllarca saklayın.",
  },
];
const questions = [
  [
    "Misafirlerin uygulama indirmesi gerekiyor mu?",
    "Hayır. Misafirler QR kodu okutarak tarayıcı üzerinden organizasyon sayfasına ulaşır. Hesap açmadan fotoğraf ve video paylaşabilirler.",
  ],
  [
    "Fotoğraf ve videoları kimler görebilir?",
    "Albüm herkese açık değildir. Yalnızca organizasyon sahibi, organizasyondan sorumlu işletme ve platform yöneticisi içeriklere erişebilir. Misafirler diğer paylaşımları göremez.",
  ],
  [
    "Anılarımız ne kadar süre saklanır?",
    "Varsayılan olarak organizasyon tarihinden itibaren 3 ay saklanır. Bu süre dolmadan fotoğraf ve videolarınızı indirebilirsiniz. Süre sonunda medya, misafir isimleri ve mesajları kalıcı olarak silinir.",
  ],
  [
    "Organizasyondan sonra da paylaşım yapılabilir mi?",
    "Evet. Varsayılan olarak organizasyon tarihinden sonraki 7 gün boyunca yükleme yapılabilir. Böylece misafirleriniz galerilerinde kalan anıları da paylaşabilir.",
  ],
  [
    "Sadece düğünler için mi kullanılabilir?",
    "Düğün, nişan, doğum günü ve diğer özel organizasyonlarda kullanılabilir. Her organizasyonun kendine ait sayfası, QR kodu ve özel albümü olur.",
  ],
];

export default function Landing() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="Anılar ana sayfa">
          ANILAR<span>HER ANIN BİR HİKÂYESİ VAR.</span>
        </Link>
        <nav className={styles.nav} aria-label="Ana menü">
          <a href="#nasil-calisir">Nasıl çalışır?</a>
          <a href="#isletmeler">İşletmeler için</a>
          <a href="#sorular">Merak edilenler</a>
        </nav>
        <Link href="/auth" className={styles.login}>
          Giriş yap <ArrowRight size={15} />
        </Link>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>
            <span /> BİRLİKTE YAŞANAN, BİRLİKTE BİRİKEN
          </p>
          <h1>
            En güzel anlar,
            <br />
            tek bir açıya
            <br />
            <em>sığmaz.</em>
          </h1>
          <p className={styles.intro}>
            Sizin gününüz. Onların gözünden yüzlerce anı.
            <br />
            Misafirlerinizin çektiği fotoğraf ve videoları bir QR kodla, size
            özel tek bir albümde bir araya getirin.
          </p>
          <div className={styles.actions}>
            <Link href="/wedding/oguz-hilal" className={styles.primary}>
              Örnek sayfayı keşfet <ArrowRight size={18} />
            </Link>
            <a href="#nasil-calisir" className={styles.textLink}>
              Nasıl çalışır? <ArrowDown size={16} />
            </a>
          </div>
          <div className={styles.perks}>
            <span>
              <Check size={14} /> Uygulama gerektirmez
            </span>
            <span>
              <Check size={14} /> Misafirlere üyelik yok
            </span>
          </div>
        </div>
        <div className={styles.collage}>
          <div className={styles.orbit} />
          <figure className={styles.mainPhoto}>
            <Image
              src="/marketing/celebration.webp"
              alt="Mum ışıkları ve beyaz çiçeklerle hazırlanmış açık hava organizasyonu"
              width={600}
              height={800}
              loading="eager"
              fetchPriority="high"
              sizes="(max-width: 700px) 70vw, 400px"
            />
            <figcaption>birlikte, hep hatırlamak için.</figcaption>
          </figure>
          <figure className={styles.smallPhoto}>
            <Image
              src="/marketing/guest-camera.webp"
              alt="Bir misafirin telefonuyla organizasyondan anı fotoğraflaması"
              width={240}
              height={320}
              sizes="(max-width: 700px) 32vw, 190px"
            />
            <figcaption>iyi ki, birlikte. ♡</figcaption>
          </figure>
          <div className={styles.qrNote}>
            <QrCode size={38} strokeWidth={1.3} />
            <div>
              <strong>Bir kod. Bütün anılar.</strong>
              <span>Okut · Paylaş · Hatırla</span>
            </div>
          </div>
          <span className={styles.photoLabel}>BÜYÜK GÜNÜN KÜÇÜK ANLARI</span>
        </div>
      </section>

      <div className={styles.occasions}>
        <span>HER ÖZEL GÜNÜNÜZE EŞLİK EDER</span>
        <p>
          Düğün <i>✧</i> Nişan <i>✧</i> Doğum günü <i>✧</i> Kutlama
        </p>
      </div>

      <section id="nasil-calisir" className={styles.how}>
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>ANI BİRİKTİRMENİN EN KOLAY HALİ</p>
          <h2>
            Üç küçük adım.
            <br />
            <em>Kocaman bir hatıra.</em>
          </h2>
          <p>Telefonlarda kalan anılar, sizin hikâyenizin bir parçası olsun.</p>
        </div>
        <div className={styles.steps}>
          {steps.map(({ icon: Icon, title, text }, index) => (
            <article key={title}>
              <div className={styles.stepTop}>
                <Icon size={29} strokeWidth={1.2} />
                <span>0{index + 1}</span>
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.album}>
        <div className={styles.albumPhotos}>
          <Image
            src="/marketing/printed-memories.webp"
            alt="Keten üzerinde çiçekler ve mum eşliğinde basılı organizasyon hatıraları"
            width={390}
            height={530}
            sizes="(max-width: 700px) 65vw, 330px"
          />
          <div className={styles.albumBadge}>
            <ShieldCheck size={23} />
            <span>
              Size özel.
              <br />
              <strong>Güvenle saklanan anılar.</strong>
            </span>
          </div>
        </div>
        <div className={styles.albumCopy}>
          <p className={styles.eyebrow}>
            SADECE FOTOĞRAF DEĞİL, HİSSETTİRDİKLERİ
          </p>
          <h2>
            Siz anı yaşayın.
            <br />
            <em>Anılar biriksin.</em>
          </h2>
          <p>
            Bir kahkaha, beklenmedik bir dans, sıcacık bir mesaj… Her
            misafirinizin yakaladığı başka bir güzellik var.
          </p>
          <ul>
            <li>
              <Camera size={19} />
              <div>
                <strong>Fotoğraf, video ve içten bir not</strong>
                <p>O an çekilenler de galeride bekleyenler de aynı yerde.</p>
              </div>
            </li>
            <li>
              <ShieldCheck size={19} />
              <div>
                <strong>Kontrolü sizde olan özel albüm</strong>
                <p>
                  Misafirler paylaşır; siz ve yetkili yöneticiler görüntüler.
                </p>
              </div>
            </li>
            <li>
              <Download size={19} />
              <div>
                <strong>İndirin, yıllarca saklayın</strong>
                <p>
                  3 aylık saklama süresi içinde anılarınızı topluca indirin.
                </p>
              </div>
            </li>
          </ul>
        </div>
      </section>

      <section id="masa-kartlari" className={styles.cardOptions}>
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>KÜÇÜK BİR DAVET, SAYISIZ ANI</p>
          <h2>
            Masanıza uygun <em>iki seçenek.</em>
          </h2>
          <p>
            Ayakta duran bir masa kartı veya masaya düz yerleştirilen A2
            tasarım. Anılarınızı paylaşmaya davet eden zarif bir detay.
          </p>
        </div>
        <figure>
          <a
            href="/marketing/qr-card-options-editorial.webp"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="İki masa kartı tasarımını büyük görüntüle"
          >
            <Image
              src="/marketing/qr-card-options-editorial.webp"
              alt="Solda ayakta duran katlanmış QR masa kartı, sağda masaya düz yerleştirilmiş A2 kart; krem zemin ve altın detaylarla iki tasarım"
              width={1536}
              height={1024}
              sizes="(max-width: 700px) 100vw, 1152px"
            />
          </a>
          <figcaption>
            <span>
              <strong>01 · Ayaklı masa kartı</strong>Katlanabilir, dik duran
              tasarım
            </span>
            <span>
              <strong>02 · Düz A2 kart</strong>42 × 59,4 cm · Masaya düz
              yerleşim
            </span>
          </figcaption>
        </figure>
        <p className={styles.cardNote}>
          Tasarım örnekleridir. Kullanımda organizasyonunuza özel QR kod yer
          alır.
        </p>
      </section>

      <section id="isletmeler" className={styles.partners}>
        <div>
          <p className={styles.eyebrow}>
            İŞLETMELER VE ORGANİZASYON EKİPLERİ İÇİN
          </p>
          <h2>
            Güzel bir organizasyon.
            <br />
            <em>Unutulmayan bir deneyim.</em>
          </h2>
          <p>
            Müşterilerinize günün ötesine geçen bir hatıra sunun. İşletme
            hesabınızdan organizasyon sayfaları oluşturun, QR kodlarını indirin
            ve organizasyon sahiplerine kendi albümlerinin erişimini verin.
          </p>
          <Link href="/auth" className={styles.primary}>
            İşletme paneline giriş <ArrowRight size={17} />
          </Link>
          <small>
            İşletme hesapları platform yöneticisi tarafından açılır.
          </small>
        </div>
        <div className={styles.partnerList}>
          {[
            "Her organizasyona özel sayfa ve QR kod",
            "Organizasyon sahibine özel kullanıcı hesabı",
            "Organizasyonlarınızı tek panelden yönetme",
            "Fotoğraf ve videoları topluca indirme",
          ].map((item, i) => (
            <div key={item}>
              <span>0{i + 1}</span>
              <p>{item}</p>
              <Check size={18} />
            </div>
          ))}
        </div>
      </section>

      <section id="sorular" className={styles.faq}>
        <div>
          <p className={styles.eyebrow}>AKLINIZDA KALMASIN</p>
          <h2>
            Küçük sorular,
            <br />
            <em>net cevaplar.</em>
          </h2>
        </div>
        <div>
          {questions.map(([question, answer]) => (
            <details key={question}>
              <summary>
                {question}
                <span aria-hidden="true">+</span>
              </summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>
      <section className={styles.closing}>
        <Heart size={26} strokeWidth={1} />
        <h2>
          O gün geçer.
          <br />
          <em>Anılar sizinle kalır.</em>
        </h2>
        <p>Bir organizasyon sayfasını yakından keşfedin.</p>
        <Link href="/wedding/oguz-hilal" className={styles.primary}>
          Örnek sayfayı incele <ArrowRight size={18} />
        </Link>
      </section>
      <footer className={styles.footer}>
        <Link href="/" className={styles.brand}>
          ANILAR
        </Link>
        <p>Birlikte yaşanan anların dijital hatırası.</p>
        <Link href="/auth">
          Hesabınıza giriş <ArrowRight size={14} />
        </Link>
      </footer>
    </main>
  );
}
