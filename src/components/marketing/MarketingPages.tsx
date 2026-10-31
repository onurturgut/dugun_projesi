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
import { HomePartnerStrip } from "./HomePartnerStrip";
import {
  GIB,
  PACKAGE_CATALOG,
  PHOTOGRAPHER_PACKAGE,
  packageStorageLimit,
  type PackageCode,
} from "@/lib/commercial-policy";
import albumDashboard from "../../../shineqr_planlama/düzenleme24_10/dijital_albüm.png";
import uploadWedding from "../../../shineqr_planlama/düzenleme24_10/fotograf_ve_videolari_yukleyin.png";
import qrCollection from "../../../shineqr_planlama/düzenleme24_10/kisilestirilebilir_qr_tasarımları.png";
import createEvent from "../../../shineqr_planlama/düzenleme24_10/organizasyonunu_olustur.png";

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

function PhotographerPackageCard() {
  return (
    <section className={styles.photographerPackage}>
      <div className={styles.photographerPackageCopy}>
        <p className={styles.eyebrow}>PROFESYONEL ÇEKİM</p>
        <h3>{PHOTOGRAPHER_PACKAGE.name}</h3>
        <p className={styles.lead}>
          Özel gününüz profesyonelce çekilsin, fotoğraflarınız ShineQR
          üzerinden güvenle teslim edilsin.
        </p>
        <div className={styles.photographerPackagePrice}>
          {new Intl.NumberFormat("tr-TR", {
            style: "currency",
            currency: "TRY",
            maximumFractionDigits: 0,
          }).format(PHOTOGRAPHER_PACKAGE.grossPriceCents / 100)}
          <small>KDV dahil</small>
        </div>
        <Link className={styles.primary} href="/fotografci-paketi">
          Fotoğrafçı Paketini İncele <ArrowRight size={17} />
        </Link>
      </div>
      <ul className={styles.photographerPackageFeatures}>
        <li><Camera size={18} />Profesyonel fotoğrafçı</li>
        <li><Sparkles size={18} />Organizasyona özel çekim</li>
        <li><ImageIcon size={18} />Dijital teslim</li>
        <li><CheckCircle2 size={18} />Teslimat takibi</li>
        <li><Download size={18} />Toplu indirme</li>
        <li><ShieldCheck size={18} />12 ay saklama</li>
        <li className={styles.photographerPackageNote}>Bağımsız olarak satın alınır.</li>
      </ul>
    </section>
  );
}

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
        <div className={styles.premiumHeroVisual} aria-label="ShineQR tasarım örnekleri">
          <div className={styles.heroVisualTrack}>
            {[
              ["/marketing/qr-table-cards-hero-transparent.png", "Dört kişiselleştirilmiş ShineQR QR masa kartı"],
              ["/marketing/floral-wedding-cards-hero-transparent.png", "Çiçek detaylı ShineQR düğün masa kartları"],
              ["/marketing/seher-muhammed-wedding-composition-v2.png", "ShineQR düğün albümü deneyimi"],
            ].map(([src, alt], index) => (
              <Image key={src} src={src} alt={alt} fill priority={index === 0} sizes="(max-width: 760px) 100vw, 58vw" />
            ))}
          </div>
          <span className={styles.heroShadow} aria-hidden="true" />
        </div>
      </section>
      <HomePartnerStrip />
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
      <section className={`${styles.section} ${styles.bentoSection}`}>
        <SectionHeading
          eyebrow="DENEYİMİN HER DETAYI"
          title="Teknoloji görünmez. Anılar başrolde."
          text="Etkinliğinizin tüm dijital dokunuşları tek, sade ve güvenli bir deneyimde."
        />
        <div className={styles.experienceGrid}>
          <article className={styles.experienceCard}>
            <div className={styles.experienceVisual}><Image src={albumDashboard} alt="ShineQR özel dijital albüm yönetim ekranı" fill sizes="(max-width: 760px) 92vw, 38vw" /></div>
            <div className={styles.experienceCopy}><span>01</span><h3>Özel Dijital Albüm</h3><p>Tüm fotoğraf, video ve mesajlar yalnızca size ait tek bir albümde.</p></div>
          </article>
          <article className={styles.experienceCard}>
            <div className={styles.experienceVisual}><Image src={qrCollection} alt="Kişiselleştirilebilir ShineQR QR tasarım koleksiyonu" fill sizes="(max-width: 760px) 92vw, 38vw" /></div>
            <div className={styles.experienceCopy}><span>02</span><h3>Kişiselleştirilebilir QR Tasarımı</h3><p>Etkinliğinizin stilini masadaki ilk dokunuştan itibaren hissettirin.</p></div>
          </article>
          <article className={styles.experienceCard}>
            <div className={styles.experienceVisual}><video className={styles.experienceVideo} autoPlay muted loop playsInline poster="/intro/shineqr-portrait-v2-final.jpg">
              <source src="/intro/shineqr-portrait-v2.mp4" type="video/mp4" />
            </video></div>
            <div className={styles.experienceCopy}><span>03</span><h3>Temalı Karşılama Ekranları</h3><p>QR kartınızla aynı görsel dili taşıyan etkileyici mobil açılış.</p></div>
          </article>
        </div>
        <div className={`${styles.bentoGrid} ${styles.bentoMiniGrid}`}>
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
      <section className={`${styles.section} ${styles.homePricingSection}`}>
        <SectionHeading eyebrow="PAKETLER" title="Anılarınız için doğru kapsam." text="Fiyatlar KDV dahildir; paket hakkı ve fiyatı satış anında kayıt altına alınır." />
        <div className={styles.pricing}>
          {(Object.keys(PACKAGE_CATALOG) as PackageCode[]).map((code, index) => {
            const plan = PACKAGE_CATALOG[code];
            return <article className={styles.priceCard} key={code}>
              <p className={styles.eyebrow}>{index === 1 ? "EN ÇOK TERCİH EDİLEN" : `PLAN ${index + 1}`}</p>
              <h3>{plan.name}</h3>
              <div className={styles.price}>{new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(plan.grossPriceCents / 100)}</div>
              <ul>
                <li>{plan.miniQrCount} mini QR kart</li>
                {plan.tableQrCount ? <li>{plan.tableQrCount} masa QR kartı</li> : null}
                {plan.welcomeSignCount ? <li>{plan.welcomeSignCount} karşılama panosu</li> : null}
                <li>{(packageStorageLimit(plan) || 0) / GIB} GB depolama</li>
                <li>{plan.digitalRetentionMonths} ay dijital saklama</li>
                {plan.digitalInvitationIncluded ? <li>Dijital davetiye</li> : null}
              </ul>
              <Link className={index === 1 ? styles.primary : styles.ghost} href="/iletisim">Paketi görüşelim</Link>
            </article>;
          })}
        </div>
        <PhotographerPackageCard />
        <div className={styles.centerAction}><Link className={styles.ghost} href="/paketler">Tüm paket detayları <ArrowRight size={16} /></Link></div>
      </section>
      <CtaBand />
    </MarketingShell>
  );
}

export function HowPage() {
  const rows = [
    { title: "Etkinliğini oluştur", text: "İşletme ya da organizasyon sahibi panelden etkinlik tarihini, çift adlarını ve erişim süresini belirler.", image: createEvent },
    { title: "QR kodunu paylaş", text: "Oluşturulan QR kod, seçtiğiniz masa kartı tasarımıyla basılır veya dijital davetlerde paylaşılır.", image: "/marketing/qr-scan-wedding-cards.png" },
    { title: "Fotoğraf ve videoları yükleyin", text: "Misafirler tarayıcıdan içeriklerini gönderir; siz albümden görüntüler ve topluca indirirsiniz.", image: uploadWedding },
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
          {rows.map(({ title, text, image }, i) => (
            <article className={styles.editorialStep} key={title}>
              <div>
                <span className={styles.stepNumber}>0{i + 1}</span>
                <h2>{title}</h2>
                <p>{text}</p>
              </div>
              <div className={styles.editorialPhoto}>
                <Image className={styles.editorialPhotoDesktop} src={image} alt={`${title} adımı`} fill sizes="(max-width: 760px) 1px, 52vw" />
                <Image className={styles.editorialPhotoMobile} src={image} alt={`${title} mobil görünümü`} fill sizes="(max-width: 760px) 92vw, 1px" />
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
        description="KDV dahil paket fiyatlarını ve kayıt altına alınan kullanım haklarını tek bakışta karşılaştırın."
        hideVisual
      />
      <section className={styles.section}>
        <div className={styles.pricing}>
          {(Object.keys(PACKAGE_CATALOG) as PackageCode[]).map((code, i) => {
            const plan = PACKAGE_CATALOG[code];
            return (
            <article className={styles.priceCard} key={code}>
              <p className={styles.eyebrow}>
                {i === 1 ? "EN ÇOK TERCİH EDİLEN" : `PLAN ${i + 1}`}
              </p>
              <h3>{plan.name}</h3>
              <div className={styles.price}>
                {new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(plan.grossPriceCents / 100)}
              </div>
              <ul>
                <li>{plan.miniQrCount} mini QR kart</li>
                {plan.tableQrCount ? <li>{plan.tableQrCount} masa QR kartı</li> : null}
                {plan.welcomeSignCount ? <li>{plan.welcomeSignCount} karşılama panosu</li> : null}
                <li>{(packageStorageLimit(plan) || 0) / GIB} GB depolama</li>
                <li>{plan.digitalRetentionMonths} ay dijital saklama</li>
                {plan.digitalInvitationIncluded ? <li>Dijital davetiye</li> : null}
              </ul>
              <Link
                className={i === 1 ? styles.primary : styles.ghost}
                href="/iletisim"
              >
                Güncel teklif iste
              </Link>
            </article>
            );
          })}
        </div>
        <div className={styles.packageComparisonWrap}>
          <table className={styles.packageComparison}>
            <caption>Paket hakları karşılaştırması</caption>
            <thead>
              <tr>
                <th scope="col">Hak</th>
                {(Object.keys(PACKAGE_CATALOG) as PackageCode[]).map((code) => (
                  <th scope="col" key={code}>{PACKAGE_CATALOG[code].name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["Mini QR", (plan: (typeof PACKAGE_CATALOG)[PackageCode]) => `${plan.miniQrCount} adet`],
                ["Karşılama tabelası", (plan: (typeof PACKAGE_CATALOG)[PackageCode]) => plan.welcomeSignCount ? `${plan.welcomeSignCount} adet` : "Dahil değil"],
                ["Depolama", (plan: (typeof PACKAGE_CATALOG)[PackageCode]) => `${(packageStorageLimit(plan) || 0) / GIB} GB`],
                ["Dijital saklama", (plan: (typeof PACKAGE_CATALOG)[PackageCode]) => `${plan.digitalRetentionMonths} ay`],
                ["Profesyonel çekim", () => "Dahil değil - bağımsız paket"],
              ].map(([label, value]) => (
                <tr key={String(label)}>
                  <th scope="row">{String(label)}</th>
                  {(Object.keys(PACKAGE_CATALOG) as PackageCode[]).map((code) => (
                    <td key={code}>{(value as (plan: (typeof PACKAGE_CATALOG)[PackageCode]) => string)(PACKAGE_CATALOG[code])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PhotographerPackageCard />
        <div className={styles.notice}>
          <strong>Not:</strong> Gösterilen fiyatlar KDV dahildir. Satış anındaki
          paket ve fiyat bilgileri organizasyon kaydında saklanır.
        </div>
      </section>
      <section className={`${styles.section} ${styles.soft}`}>
        <div className={styles.pricingEditorial}>
          <div className={styles.pricingStatement}>
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
          <div className={styles.pricingNotes}>
            <span>Çoklu etkinlik kapsamı</span>
            <span>Markaya uyarlanan görünüm</span>
            <span>Ekip erişimi planlaması</span>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}

export function PhotographerPackagePage() {
  return (
    <MarketingShell>
      <PageHero
        eyebrow="BAĞIMSIZ HİZMET"
        title={PHOTOGRAPHER_PACKAGE.name}
        description="Ana QR paketlerinden bağımsız profesyonel çekim ve kontrollü dijital teslimat akışı."
        hideVisual
      />
      <section className={styles.section}>
        <PhotographerPackageCard />
        <div className={styles.photographerScopeGrid}>
          <article>
            <h2>Pakete dahil</h2>
            <ul>
              <li>Organizasyona atanmış profesyonel fotoğrafçı</li>
              <li>Müşteri satın alma onayı</li>
              <li>Profesyonel dosyaların kontrollü yüklenmesi</li>
              <li>Müşteri teslimat onayı</li>
              <li>ShineQR üzerinden dijital teslim</li>
            </ul>
          </article>
          <article>
            <h2>Pakete dahil değil</h2>
            <ul>
              <li>Mini QR veya masa QR baskısı</li>
              <li>Karşılama tabelası</li>
              <li>Dijital davetiye</li>
              <li>Ana QR paketlerinin depolama kapasitesini artırma</li>
              <li>Onaylanmamış ek çekim veya baskı hizmetleri</li>
            </ul>
          </article>
        </div>
        <div className={styles.notice}>
          <strong>{new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(PHOTOGRAPHER_PACKAGE.grossPriceCents / 100)} KDV dahil.</strong>{" "}
          Paket bağımsız satın alınır ve müşteri onayı verilmeden profesyonel yükleme açılmaz.
        </div>
        <div className={styles.centerAction}>
          <Link className={styles.primary} href="/iletisim">Fotoğrafçı Paketi hakkında görüşelim</Link>
        </div>
      </section>
      <CtaBand />
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
        hideVisual
      />
      <section className={styles.section}>
        <div className={styles.businessIntro}>
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
        </div>
      </section>
      <section className={`${styles.section} ${styles.roleEditorial}`}>
        <div className={styles.roleLead}>
          <p className={styles.eyebrow}>FOTOĞRAFÇI ÇALIŞMA ALANI</p>
          <h2>Profesyonel çekimler için ayrı ve anlaşılır bir akış.</h2>
          <p>
            Fotoğrafçı rolü; organizasyon erişimini, profesyonel çekimlerin
            düzenlenmesini ve albüm teslim sürecini müşteri alanından ayıracak
            şekilde planlanır.
          </p>
        </div>
        <div className={styles.roleSteps}>
          {[
            ["01", "Organizasyona bağlan", "Yetkili olduğunuz organizasyonları tek çalışma alanında görün."],
            ["02", "Çekimleri düzenle", "Profesyonel içerikleri misafir yüklemelerinden ayrı bir akışta yönetin."],
            ["03", "Teslimi hazırlayın", "Müşteriye açılacak albüm kapsamını kontrollü biçimde hazırlayın."],
          ].map(([number, title, text]) => (
            <article className={styles.roleStep} key={number}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
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
        hideVisual
      />
      <section className={styles.section}>
        <div className={styles.useEditorialGrid}>
          {useCases.map(([title, text], index) => (
            <article className={styles.useEditorialCard} key={title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
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
        hideVisual
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
        image="/brand/shineqr-lockup.png"
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
