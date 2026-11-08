import { redirect } from "next/navigation";
import Image from "next/image";
import {
  ChevronDown,
  MonitorSmartphone,
  PackageOpen,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { LoadingTemplateCatalog } from "@/components/admin/LoadingTemplateCatalog";
import { QrThemeAccordion } from "@/components/admin/QrThemeAccordion";
import {
  availableTemplates,
  isVideoIntro,
  videoIntroAssets,
} from "@/lib/design";
import { weddingTemplates } from "@/lib/wedding-templates";
import type { AddOnProduct } from "@/lib/models";
import { session } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import "./design-center.css";

const modules = [
  {
    id: "wedding",
    title: "Wedding Tasarımları",
    detail: "Mevcut yükleme deneyimi korunuyor",
    description:
      "Organizasyonların wedding ekranı şablonlarını ve mevcut deneyimi yönetin.",
    Icon: MonitorSmartphone,
  },
  {
    id: "loading",
    title: "Loading Page Tasarımları",
    detail: "3 mevcut açılış",
    description:
      "Yükleme sırasında kullanılan açılış tasarımlarını bir arada değerlendirin.",
    Icon: Sparkles,
  },
  {
    id: "physical",
    title: "Fiziksel QR Ürünleri",
    detail: "Mini QR ve karşılama tabelası",
    description:
      "Baskıya hazırlanan fiziksel QR ürünlerinin format ve güvenli alanlarını inceleyin.",
    Icon: PackageOpen,
  },
  {
    id: "addons",
    title: "Ek Ürünler",
    detail: "Finans kataloğuyla senkron",
    description:
      "Finans ve Fiyatlandırma alanında satışa açılan ek ürünleri inceleyin.",
    Icon: ShoppingBag,
  },
] as const;

const loadingTemplates = availableTemplates("loading");
const loadingVideos = loadingTemplates.flatMap((template) => {
  if (!isVideoIntro(template.id)) return [];
  const media = videoIntroAssets[template.id];
  return [
    {
      id: template.id,
      name: template.name,
      video: media.video,
      poster: media.poster,
    },
  ];
});
const imageTreatmentLabels = {
  arch: "Kemer kadraj",
  full: "Tam ekran",
  polaroid: "Polaroid kolaj",
} as const;
const addOnCategoryLabels: Record<
  NonNullable<AddOnProduct["category"]>,
  string
> = {
  qr_print: "QR baskı",
  storage_retention: "Depolama ve saklama",
  digital: "Dijital hizmet",
  design: "Tasarım ve tabela",
  organization: "Organizasyon",
};
const money = (value: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(
    value / 100,
  );

export default async function DesignCenterPage() {
  const user = await session();
  if (user?.role !== "platform") redirect("/admin");
  const database = await db();
  const addOns = await database
    .collection<AddOnProduct>("add_on_products")
    .find({ active: true }, { projection: { _id: 0 } })
    .sort({ category: 1, name: 1 })
    .toArray();

  return (
    <AdminShell>
      <section className="design-center">
        <header className="design-center__hero">
          <div>
            <p>TASARIM MERKEZİ · V2</p>
            <h1>Her yüzey, tek bir yaratıcı sistem.</h1>
            <span>
              Yayınlanan şablonları, kontrollü preset’leri, fiziksel ürünleri ve
              organizasyon eşleştirmelerini yönetin.
            </span>
          </div>
          <div className="design-center__status">
            <strong>FAZ 1 + 2</strong>
            <span>Aktif koleksiyonlar üretime hazırlanıyor</span>
          </div>
        </header>

        <div className="design-center__section-head">
          <div>
            <p>TASARIM AKIŞLARI</p>
            <h2>Yönetmek istediğiniz alanı açın</h2>
          </div>
          <span>Her bölüm ayrı ayrı açılıp kapatılabilir.</span>
        </div>

        <div className="design-center__modules">
          {modules.map(({ id, title, detail, description, Icon }) => (
            <details className="design-center__module" key={id}>
              <summary>
                <span className="design-center__module-icon">
                  <Icon size={20} />
                </span>
                <span className="design-center__module-title">
                  <strong>{title}</strong>
                  <small>{detail}</small>
                </span>
                <ChevronDown className="design-center__chevron" size={20} />
              </summary>
              <div className="design-center__module-content">
                <p>{description}</p>
                {id === "wedding" ? (
                  <>
                    <div className="design-center__collection-head">
                      <div>
                        <span>WEDDING COLLECTION</span>
                        <h3>Wedding tema kütüphanesi</h3>
                      </div>
                      <small>{weddingTemplates.length} yayınlanmış tema</small>
                    </div>
                    <div className="design-center__catalog design-center__catalog--wedding">
                      {weddingTemplates.map((template) => (
                        <article key={template.id}>
                          <div className="design-center__catalog-media">
                            <Image
                              src={`/design-center/mockups/wedding-phone/${template.id}.png`}
                              alt={`${template.name} wedding tema telefon önizlemesi`}
                              fill
                              sizes="(max-width: 640px) 100vw, (max-width: 1000px) 50vw, 33vw"
                            />
                          </div>
                          <div className="design-center__catalog-copy">
                            <header>
                              <span>{template.number}</span>
                              <div>
                                <h3>{template.name}</h3>
                                <p>{template.description}</p>
                              </div>
                            </header>
                            <dl>
                              <div>
                                <dt>Görsel yaklaşımı</dt>
                                <dd>
                                  {
                                    imageTreatmentLabels[
                                      template.imageTreatment
                                    ]
                                  }
                                </dd>
                              </div>
                              <div>
                                <dt>Renk modu</dt>
                                <dd>
                                  {template.monochrome ? "Monokrom" : "Renkli"}
                                </dd>
                              </div>
                            </dl>
                            <div
                              className="design-center__swatches"
                              aria-label={`${template.name} renk paleti`}
                            >
                              {[
                                template.base,
                                template.light,
                                template.accent,
                                template.ink,
                              ].map((color) => (
                                <i
                                  key={color}
                                  style={{ backgroundColor: color }}
                                  title={color}
                                />
                              ))}
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </>
                ) : id === "loading" ? (
                  <>
                    <div className="design-center__collection-head">
                      <div>
                        <span>LOADING COLLECTION</span>
                        <h3>Loading Page tasarımları</h3>
                      </div>
                      <small>
                        {loadingTemplates.length} yayınlanmış açılış
                      </small>
                    </div>
                    <LoadingTemplateCatalog templates={loadingVideos} />
                  </>
                ) : id === "addons" ? (
                  <>
                    <div className="design-center__collection-head">
                      <div>
                        <span>CANLI FİNANS KATALOĞU</span>
                        <h3>Satışa açık ek ürünler</h3>
                      </div>
                      <small>{addOns.length} aktif ürün</small>
                    </div>
                    {addOns.length ? (
                      <div className="design-center__addon-grid">
                        {addOns.map((product) => (
                          <article key={product.id}>
                            <div className="design-center__addon-icon">
                              <ShoppingBag size={22} />
                            </div>
                            <div className="design-center__addon-copy">
                              <span>
                                {
                                  addOnCategoryLabels[
                                    product.category || "digital"
                                  ]
                                }
                              </span>
                              <h3>{product.name}</h3>
                              <p>
                                {product.description ||
                                  "Bu ürün için açıklama girilmedi."}
                              </p>
                            </div>
                            <dl>
                              <div>
                                <dt>Fiyat</dt>
                                <dd>
                                  {product.pricing_type ===
                                  "package_percentage_discount"
                                    ? `%${(product.percentage_bps || 0) / 100} indirim`
                                    : money(product.gross_price_cents)}
                                </dd>
                              </div>
                              <div>
                                <dt>Adet</dt>
                                <dd>
                                  {product.quantity ??
                                    product.maximum_quantity ??
                                    1}
                                </dd>
                              </div>
                              <div>
                                <dt>Paketler</dt>
                                <dd>
                                  {product.eligible_package_codes?.length
                                    ? product.eligible_package_codes.join(", ")
                                    : "Tüm paketler"}
                                </dd>
                              </div>
                            </dl>
                            <footer>
                              <span>AKTİF</span>
                              <small>
                                {product.code || product.effect_type}
                              </small>
                            </footer>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className="design-center__empty-state">
                        <ShoppingBag size={22} />
                        <span>
                          Finans ve Fiyatlandırma alanında aktif ek ürün
                          bulunmuyor.
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <QrThemeAccordion />
                )}
              </div>
            </details>
          ))}
        </div>

        <aside className="design-center__note">
          <strong>Sürüm güvenliği</strong>
          <p>
            Organizasyonlar şablon kimliği ve sürümüyle sabitlenir. Yeni bir
            yayın mevcut organizasyonların görünümünü kendiliğinden değiştirmez.
          </p>
        </aside>
      </section>
    </AdminShell>
  );
}
