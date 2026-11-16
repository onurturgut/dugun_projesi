"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  Eye,
  Images,
  LayoutDashboard,
  MapPin,
  MessageCircle,
  PackagePlus,
  Store,
} from "lucide-react";
import { StorefrontCatalogPanel } from "./StorefrontCatalogPanel";
import { StorefrontSettingsPanel } from "./StorefrontSettingsPanel";

const sections = [
  { href: "#storefront-overview", label: "Genel görünüm", icon: LayoutDashboard },
  { href: "#storefront-settings", label: "İşletme vitrini", icon: Store },
  { href: "#catalog-settings", label: "Ürün ve hizmetler", icon: PackagePlus },
  { href: "#storefront-settings", label: "Kapak ve galeri", icon: Images },
  { href: "#storefront-settings", label: "İletişim", icon: MessageCircle },
  { href: "#storefront-settings", label: "Konum ve bölgeler", icon: MapPin },
];

export function StorefrontWorkspace() {
  return (
    <div className="storefront-workspace">
      <header className="storefront-workspace-heading" id="storefront-overview">
        <div>
          <p className="admin-kicker">DİJİTAL MAĞAZA</p>
          <h1>İşletme vitrininizi yönetin</h1>
          <p>
            Müşterilerin gördüğü işletme profilini, hizmet kartlarını ve iletişim
            seçeneklerini tek çalışma alanında düzenleyin.
          </p>
        </div>
        <Link className="admin-button" href="/isletmeler" target="_blank">
          <Eye size={16} /> İşletmeler sayfası <ArrowUpRight size={15} />
        </Link>
      </header>

      <section className="storefront-readiness" aria-label="Mağaza yönetimi özeti">
        <article>
          <span>Yayın akışı</span>
          <strong>Taslak → Önizleme → Yayın</strong>
          <small>Değişikliklerinizi yayınlamadan önce kontrol edin.</small>
        </article>
        <article>
          <span>Vitrin yapısı</span>
          <strong>Profil, hizmetler ve galeri</strong>
          <small>Müşteri sayfasındaki bölümler ayrı ayrı yönetilir.</small>
        </article>
        <article>
          <span>Güvenli yönetim</span>
          <strong>Yalnızca işletme sahibi</strong>
          <small>Yayınlama işlemleri yetki ve denetim kaydıyla korunur.</small>
        </article>
      </section>

      <div className="storefront-workspace-layout">
        <aside className="storefront-section-nav" aria-label="Dijital mağaza bölümleri">
          <strong>Mağaza bölümleri</strong>
          <p>Düzenlemek istediğiniz alanı seçin.</p>
          <nav>
            {sections.map(({ href, label, icon: Icon }, index) => (
              <a href={href} key={`${href}-${label}`} className={index === 0 ? "is-active" : undefined}>
                <Icon size={17} />
                <span>{label}</span>
              </a>
            ))}
          </nav>
          <div className="storefront-nav-note">
            <Eye size={18} />
            <span>
              <strong>Canlı önizleme</strong>
              <small>Yayınlanan mağazanın bağlantısı vitrin bölümünde görünür.</small>
            </span>
          </div>
        </aside>

        <main className="storefront-workspace-content">
          <StorefrontSettingsPanel />
          <StorefrontCatalogPanel />
        </main>
      </div>
    </div>
  );
}
