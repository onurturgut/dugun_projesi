import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Camera,
  CheckCircle2,
  Download,
  Heart,
  ImageIcon,
  LayoutDashboard,
  QrCode,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
} from "lucide-react";
import {
  ContactForm,
  FaqList,
  HomeThemeShowcase,
  ThemeGallery,
} from "./Interactive";
import {
  CtaBand,
  MarketingShell,
  PageHero,
  SectionHeading,
} from "./MarketingShell";
import { features, useCases } from "./data";
import styles from "./marketing.module.css";

const featureIcons = [
  QrCode,
  Camera,
  ImageIcon,
  ShieldCheck,
  Sparkles,
  Download,
  Smartphone,
  Heart,
  ShieldCheck,
  LayoutDashboard,
];

export function HomePage() {
  const launchSteps = [
    {
      title: "QR kodunu okut",
      text: "Misafiriniz masa kartındaki kodu telefon kamerasıyla saniyeler içinde okutur.",
      image: "/marketing/qr-scan-wedding-cards.png",
      className: styles.productSceneQr,
    },
    {
      title: "Anını yükle",
      text: "Uygulama veya üyelik olmadan fotoğrafını, videosunu ve mesajını paylaşır.",
      image: "/marketing/upload-memory-couple.webp",
      className: styles.productSceneUpload,
    },
    {
      title: "Albümde biriktir",
      text: "Her an, yalnızca size ait dijital albümde güvenle bir araya gelir.",
      image: "/marketing/album-gallery-card.webp",
      className: styles.productSceneAlbum,
    },
  ];

  return (
    <MarketingShell>
      <section className={styles.premiumHero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>
            DÜĞÜN VE ETKİNLİKLER İÇİN DİJİTAL ANI DENEYİMİ
          </p>
          <h1>
            Bir gün.
            <br />
            Binlerce anı.
          </h1>
          <p className={styles.lead}>
            En özel gününüzü sevdiklerinizin gözünden yeniden keşfedin. Size özel
            QR kodlar, etkileyici karşılama ekranları ve tüm anılarınızı bir araya
            getiren dijital albümler.
          </p>
          <div className={styles.heroActions}>
            <Link href="/auth" className={styles.primary}>
              Hemen Başla <ArrowRight size={17} />
            </Link>
            <Link href="#deneyim" className={styles.ghost}>
              Deneyimi Keşfet
            </Link>
          </div>
          <div className={styles.perks}>
            <span>
              <CheckCircle2 size={15} /> Uygulama gerekmez
            </span>
            <span>
              <CheckCircle2 size={15} /> Misafir hesabı gerekmez
            </span>
            <span>
              <CheckCircle2 size={15} /> Tüm anılar tek albümde
            </span>
          </div>
        </div>
        <div className={styles.premiumHeroVisual}>
          <Image
            src="/marketing/shineqr-wedding-hero-composition.png"
            alt="ShineQR dijital albümünü gösteren telefon ve düğün fotoğrafları"
            fill
            priority
            sizes="(max-width: 760px) 100vw, 58vw"
          />
          <span className={styles.heroShadow} aria-hidden="true" />
        </div>
      </section>
      <section className={styles.partnerStrip}>
        <p className={styles.eyebrow}>İŞ ORTAKLARIMIZ</p>
        <span>Doğrulanmış iş ortaklarımız yakında burada.</span>
      </section>
      <section id="deneyim" className={`${styles.section} ${styles.launchSection}`}>
        <SectionHeading
          eyebrow="ÜÇ ADIMDA SHINEQR"
          title="Anı paylaşmak hiç bu kadar zarif olmamıştı."
          text="Fiziksel QR kartından özel albümünüze uzanan kesintisiz bir deneyim."
        />
        <div className={styles.productScenes}>
          {launchSteps.map((step, i) => (
            <article className={styles.productScene} key={step.title}>
              <div className={`${styles.productStage} ${step.className}`}>
                <Image src={step.image} alt="" fill sizes="(max-width: 760px) 92vw, 380px" />
                <span className={styles.sceneNumber}>0{i + 1}</span>
              </div>
              <div className={styles.sceneCopy}>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className={`${styles.section} ${styles.themeShowcaseSection}`}>
        <SectionHeading
          eyebrow="TASARIM KOLEKSİYONU"
          title="Her etkinliğe özel. Her detayda size ait."
          text="QR kartınızdan karşılama ekranınıza kadar tüm deneyimi etkinliğinizin kimliğine göre şekillendirin."
        />
        <HomeThemeShowcase />
        <div className={styles.centerAction}>
          <Link className={styles.ghost} href="/temalar">
            Tüm tasarımları keşfet <ArrowRight size={16} />
          </Link>
        </div>
      </section>
      <section className={`${styles.section} ${styles.bentoSection}`}>
        <SectionHeading
          eyebrow="DENEYİMİN HER DETAYI"
          title="Teknoloji görünmez. Anılar başrolde."
          text="Etkinliğinizin tüm dijital dokunuşları tek, sade ve güvenli bir deneyimde."
        />
        <div className={styles.bentoGrid}>
          <article className={`${styles.bentoCard} ${styles.bentoAlbum}`}>
            <div><span>01</span><h3>Özel Dijital Albüm</h3><p>Tüm fotoğraf, video ve mesajlar yalnızca size ait tek bir albümde.</p></div>
            <Image src="/marketing/seher-muhammed-wedding-composition.png" alt="ShineQR özel dijital albümü" fill sizes="600px" />
          </article>
          <article className={`${styles.bentoCard} ${styles.bentoQr}`}>
            <div><span>02</span><h3>Kişiselleştirilebilir QR Tasarımı</h3><p>Etkinliğinizin stilini masadaki ilk dokunuştan itibaren hissettirin.</p></div>
            <Image src="/marketing/qr-table-card-a2-flat.png" alt="Kişiselleştirilebilir ShineQR masa kartı" fill sizes="420px" />
          </article>
          <article className={`${styles.bentoCard} ${styles.bentoWelcome}`}>
            <div><span>03</span><h3>Temalı Karşılama Ekranları</h3><p>QR kartınızla aynı görsel dili taşıyan etkileyici mobil açılış.</p></div>
            <Image src="/intro/shineqr-portrait-v2-final.jpg" alt="ShineQR temalı karşılama ekranı" fill sizes="420px" />
          </article>
          {[
            [Smartphone, "Uygulamasız kullanım"],
            [Camera, "Fotoğraf ve video"],
            [ShieldCheck, "Kontrollü erişim"],
            [Download, "3 aylık saklama"],
            [Heart, "Kişisel mesajlar"],
          ].map(([Icon, title]) => (
            <article className={`${styles.bentoCard} ${styles.bentoMini}`} key={title as string}>
              <Icon size={22} strokeWidth={1.6} />
              <h3>{title as string}</h3>
            </article>
          ))}
        </div>
      </section>
      <section className={`${styles.section} ${styles.albumShowcase}`}>
        <div className={styles.albumVisual}>
          <Image src="/marketing/seher-muhammed-wedding-composition-v2.png" alt="ShineQR örnek düğün albümü" fill sizes="(max-width: 760px) 100vw, 58vw" />
          <div className={styles.memoryCardOne}><Image src="/covers/couple-1.jpg" alt="Düğün anısı" fill sizes="180px" /></div>
          <div className={styles.memoryCardTwo}><Image src="/covers/couple-2.jpg" alt="Düğün anısı" fill sizes="160px" /></div>
        </div>
        <div className={styles.albumCopy}>
          <p className={styles.eyebrow}>ÖRNEK ALBÜM</p>
          <h2>Her açıdan yaşayan bir hikâye.</h2>
          <p className={styles.lead}>Sevdiklerinizin yakaladığı doğal anları, size özel dijital albümde yeniden keşfedin.</p>
          <div className={styles.albumStats}>
            <span><strong>Tek QR</strong> ile kolay paylaşım</span>
            <span><strong>Tek albüm</strong> içinde tüm anılar</span>
          </div>
          <Link className={styles.primary} href="/wedding/oguz-hilal">Örnek Albümü Keşfet <ArrowRight size={17} /></Link>
        </div>
      </section>
      <CtaBand />
    </MarketingShell>
  );
}

export function HowPage() {
  const rows = [
    [
      "Etkinliğini oluştur",
      "İşletme ya da organizasyon sahibi panelden etkinlik tarihini, çift adlarını ve erişim süresini belirler.",
      "/marketing/qr-card-options-editorial.webp",
    ],
    [
      "QR kodunu paylaş",
      "Oluşturulan QR kod, seçtiğiniz masa kartı tasarımıyla basılır veya dijital davetlerde paylaşılır.",
      "/marketing/qr-scan-wedding-cards.png",
    ],
    [
      "Fotoğraf ve videoları yükleyin",
      "Misafirler tarayıcıdan içeriklerini gönderir; siz albümden görüntüler ve topluca indirirsiniz.",
      "/marketing/guest-camera.webp",
    ],
  ];
  return (
    <MarketingShell>
      <PageHero
        eyebrow="SADECE ÜÇ ADIM"
        title="Nasıl çalışır?"
        description="QR koddan özel albüme uzanan zahmetsiz ve güvenli bir anı akışı."
        image="/marketing/qr-scan-wedding-cards.png"
      />
      <section className={styles.section}>
        <div className={styles.editorialSteps}>
          {rows.map(([title, text, image], i) => (
            <article className={styles.editorialStep} key={title}>
              <div>
                <span className={styles.stepNumber}>0{i + 1}</span>
                <h2>{title}</h2>
                <p>{text}</p>
              </div>
              <div className={styles.editorialPhoto}>
                <Image src={image} alt="" fill sizes="600px" />
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className={`${styles.section} ${styles.soft}`}>
        <SectionHeading
          title="Misafir deneyimi"
          text="Uygulama indirmeden, hesap oluşturmadan, saniyeler içinde."
        />
        <div className={styles.featureGrid}>
          {features.slice(0, 5).map(([t, d], i) => {
            const Icon = featureIcons[i];
            return (
              <article className={styles.featureCard} key={t}>
                <div className={styles.featureIcon}>
                  <Icon size={20} />
                </div>
                <h3>{t}</h3>
                <p>{d}</p>
              </article>
            );
          })}
        </div>
      </section>
      <CtaBand />
    </MarketingShell>
  );
}

export function FeaturesPage() {
  return (
    <MarketingShell>
      <PageHero
        eyebrow="HER ANI İÇİN TASARLANDI"
        title="Özellikler"
        description="Kullanımı kolay, teması size özel ve yönetimi tek panelde olan bir dijital anı deneyimi."
      />
      <section className={styles.section}>
        <div className={styles.featureGrid}>
          {features.map(([title, text], i) => {
            const Icon = featureIcons[i];
            return (
              <article className={styles.featureCard} key={title}>
                <div className={styles.featureIcon}>
                  <Icon size={21} />
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            );
          })}
        </div>
      </section>
      <section className={`${styles.section} ${styles.soft}`}>
        <div className={styles.split}>
          <div>
            <SectionHeading
              eyebrow="NEDEN SHINEQR?"
              title="Güvenli, zarif ve zahmetsiz."
            />
            <div className={styles.checkList}>
              {features.slice(2, 7).map(([t, d]) => (
                <div key={t}>
                  <CheckCircle2 />
                  <span>
                    <strong>{t}</strong>
                    <p>{d}</p>
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className={styles.splitImage}>
            <Image
              src="/marketing/seher-muhammed-wedding-composition.png"
              alt="ShineQR mobil albüm ekranı"
              fill
              sizes="50vw"
            />
          </div>
        </div>
      </section>
      <CtaBand />
    </MarketingShell>
  );
}

export function ThemesPage() {
  return (
    <MarketingShell>
      <PageHero
        eyebrow="QR KOD VE YÜKLEME SAYFASI"
        title="Tema galerisi"
        description="QR masa kartınız ve misafir yükleme ekranınız aynı tasarım hikâyesini anlatsın."
        image="/marketing/qr-card-options-editorial.webp"
      />
      <section className={styles.section}>
        <SectionHeading
          title="Gerçek ShineQR tasarımları"
          text="Bir temaya dokunarak kart görünümünü ve ürün bağlantısını inceleyin."
        />
        <ThemeGallery />
      </section>
      <section className={`${styles.section} ${styles.soft}`}>
        <div className={styles.emptyState}>
          <Sparkles size={30} />
          <h2>Kendi temanızı tasarlayalım</h2>
          <p>
            Logo, renk ve tipografiyle markanıza ya da etkinliğinize özel bir
            yön oluşturabiliriz.
          </p>
          <Link href="/iletisim" className={styles.primary}>
            Tema talebi oluştur
          </Link>
        </div>
      </section>
      <CtaBand />
    </MarketingShell>
  );
}

export function PricingPage() {
  return (
    <MarketingShell>
      <PageHero
        eyebrow="PAKETLER"
        title="İhtiyacınıza göre doğru paket"
        description="Güncel fiyatlar ve kapasite limitleri teklif sırasında doğrulanır; burada yalnızca paket yapısını gösteriyoruz."
        image="/marketing/qr-table-card-a2-flat.png"
      />
      <section className={styles.section}>
        <div className={styles.pricing}>
          {["Başlangıç", "Standart", "Premium"].map((name, i) => (
            <article className={styles.priceCard} key={name}>
              <p className={styles.eyebrow}>
                {i === 1 ? "EN ÇOK TERCİH EDİLEN" : "SHINEQR"}
              </p>
              <h3>{name}</h3>
              <div className={styles.price}>Teklif alın</div>
              <ul>
                {[
                  "Etkinliğe özel QR kod",
                  "Fotoğraf ve video yükleme",
                  "Özel dijital albüm",
                  i > 0 ? "Geniş tema seçenekleri" : "Temel tema seçenekleri",
                  i > 1 ? "Öncelikli destek" : "Standart destek",
                ].map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
              <Link
                className={i === 1 ? styles.primary : styles.ghost}
                href="/iletisim"
              >
                Güncel teklif iste
              </Link>
            </article>
          ))}
        </div>
        <div className={styles.notice}>
          <strong>Not:</strong> Fiyat, saklama süresi ve yükleme limitleri
          doğrulanmış satış verisi olmadan yayınlanmamıştır.
        </div>
      </section>
      <section className={`${styles.section} ${styles.soft}`}>
        <div className={styles.split}>
          <div>
            <p className={styles.eyebrow}>KURUMSAL ETKİNLİKLER</p>
            <h2 style={{ fontSize: "52px", color: "#650d1c" }}>
              Size özel fiyatlandırma
            </h2>
            <p className={styles.lead}>
              Çoklu etkinlik, marka teması ve ekip erişimi gerektiren projeler
              için kapsamı birlikte oluşturalım.
            </p>
            <Link className={styles.primary} href="/iletisim">
              Kurumsal teklif al
            </Link>
          </div>
          <div className={styles.splitImage}>
            <Image
              src="/marketing/celebration.webp"
              alt="Kurumsal etkinlik masası"
              fill
              sizes="50vw"
            />
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}

export function BusinessPage() {
  return (
    <MarketingShell>
      <PageHero
        eyebrow="İŞLETMELER İÇİN"
        title="Müşterilerinize yeni bir deneyim sunun"
        description="Organizasyon firmaları, fotoğrafçılar ve etkinlik ekipleri için markanıza uyum sağlayan dijital anı çözümü."
        image="/marketing/qr-card-options.webp"
      />
      <section className={styles.section}>
        <div className={styles.split}>
          <div>
            <SectionHeading
              eyebrow="PARTNER PANELİ"
              title="Tüm etkinlikleri tek yerde yönetin."
            />
            <div className={styles.checkList}>
              {[
                [
                  Building2,
                  "Etkinlik oluşturma",
                  "Müşteriniz için tarih, erişim ve görünüm ayarlarını yönetin.",
                ],
                [
                  Users,
                  "Müşteri hesabı",
                  "Organizasyon sahibine kontrollü albüm erişimi oluşturun.",
                ],
                [
                  Sparkles,
                  "Markanıza özel tasarımlar",
                  "Desteklenen temaları ve QR kartlarını müşterinize göre uyarlayın.",
                ],
                [
                  LayoutDashboard,
                  "Merkezi panel",
                  "Organizasyonları, yüklemeleri ve arşivi tek panelden takip edin.",
                ],
              ].map(([Icon, t, d]) => (
                <div key={String(t)}>
                  <Icon size={22} />
                  <span>
                    <strong>{String(t)}</strong>
                    <p>{String(d)}</p>
                  </span>
                </div>
              ))}
            </div>
            <Link className={styles.primary} href="/iletisim">
              Partner olmak istiyorum
            </Link>
          </div>
          <div className={styles.splitImage}>
            <Image
              src="/marketing/seher-muhammed-wedding-composition.png"
              alt="ShineQR partner albüm deneyimi"
              fill
              sizes="50vw"
            />
          </div>
        </div>
      </section>
      <section className={`${styles.section} ${styles.soft}`}>
        <SectionHeading title="Kimler için?" />
        <div className={styles.partnerGrid}>
          {[
            "Düğün organizasyon firmaları",
            "Wedding planner ekipleri",
            "Fotoğrafçılar",
            "Etkinlik ajansları",
            "Davetiye ve baskı işletmeleri",
            "Üniversite organizatörleri",
          ].map((x) => (
            <article className={styles.partnerCard} key={x}>
              <Building2 />
              <h3>{x}</h3>
              <p>
                Müşteri deneyimine dijital anı albümü eklemek isteyen ekipler
                için.
              </p>
            </article>
          ))}
        </div>
      </section>
      <CtaBand />
    </MarketingShell>
  );
}

export function UseCasesPage() {
  return (
    <MarketingShell>
      <PageHero
        eyebrow="YILIN HER ANINA"
        title="Kullanım alanları"
        description="Düğünden kurumsal etkinliğe, paylaşılan her anı tek bir albümde buluşturun."
        image="/marketing/celebration.webp"
      />
      <section className={styles.section}>
        <div className={styles.useGrid}>
          {useCases.map(([title, text, image]) => (
            <article className={styles.useCard} key={title}>
              <div className={styles.useCardImage}>
                <Image
                  src={image}
                  alt={`${title} etkinliği`}
                  fill
                  sizes="380px"
                />
              </div>
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
                <Link href="/iletisim">Detayları konuşalım →</Link>
              </div>
            </article>
          ))}
        </div>
      </section>
      <CtaBand />
    </MarketingShell>
  );
}

export function PartnersPage() {
  return (
    <MarketingShell>
      <PageHero
        eyebrow="GÜÇLÜ İŞ BİRLİKLERİ"
        title="İş ortaklarımız"
        description="ShineQR deneyimini müşterilerine sunan doğrulanmış işletmeler için merkezi partner alanı."
        image="/marketing/printed-memories.webp"
      />
      <section className={styles.section}>
        <div className={styles.emptyState}>
          <Users size={34} />
          <h2>Doğrulanmış partnerler hazırlanıyor</h2>
          <p>
            Referans görseldeki markaları gerçek iş ortağı olarak
            yayınlamıyoruz. Onaylanan partnerler; logo, kategori, açıklama ve
            web sitesi bilgileriyle burada listelenecek.
          </p>
          <Link className={styles.primary} href="/iletisim">
            Partner olmak istiyorum
          </Link>
        </div>
      </section>
      <section className={`${styles.section} ${styles.soft}`}>
        <SectionHeading title="Partner kategorileri" />
        <div className={styles.partnerGrid}>
          {[
            "Organizasyon firmaları",
            "Düğün salonları",
            "Fotoğrafçılar",
            "Etkinlik ajansları",
            "Diğer işletmeler",
          ].map((x) => (
            <article className={styles.partnerCard} key={x}>
              <Building2 />
              <h3>{x}</h3>
              <p>Doğrulanmış iş ortakları için ayrılmış kategori.</p>
            </article>
          ))}
        </div>
      </section>
      <CtaBand />
    </MarketingShell>
  );
}

export function FaqPage() {
  return (
    <MarketingShell>
      <PageHero
        eyebrow="MERAK ETTİKLERİNİZ"
        title="Sık sorulan sorular"
        description="ShineQR’ın çalışma biçimi, güvenliği ve etkinlik akışı hakkında net cevaplar."
        image="/marketing/guest-camera.webp"
      />
      <section className={styles.section}>
        <FaqList />
      </section>
      <CtaBand />
    </MarketingShell>
  );
}

export function ContactPage() {
  return (
    <MarketingShell>
      <PageHero
        eyebrow="BİRLİKTE TASARLAYALIM"
        title="İletişime geçin"
        description="Etkinliğiniz, kurumsal iş birliği veya ShineQR hakkında merak ettikleriniz için bize yazın."
        image="/marketing/seher-muhammed-wedding-composition-v2.png"
      />
      <section className={styles.section}>
        <div className={styles.contactLayout}>
          <ContactForm />
          <aside className={styles.contactAside}>
            <p className={styles.eyebrow}>SHINEQR</p>
            <h2>En özel anlarınız için buradayız.</h2>
            <p>
              E-posta: <a href="mailto:info@shineqr.com">info@shineqr.com</a>
            </p>
            <p>
              Kurumsal iş birliği taleplerinizde konu alanından “Kurumsal iş
              birliği” seçeneğini kullanın.
            </p>
            <p>
              Telefon ve adres bilgisi projede doğrulanmadığı için
              yayınlanmamıştır.
            </p>
          </aside>
        </div>
      </section>
    </MarketingShell>
  );
}
