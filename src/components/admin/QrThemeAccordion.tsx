"use client";

import Image from "next/image";
import { useState } from "react";
import { botanicalPortraitMiniPresentations, landscapeMiniPresentations, portraitMiniPresentations, welcomeSignPresentations } from "@/lib/qr-presentations";
import { qrTemplates } from "@/lib/qr-templates";

const themes = [
  { id: "velvet-flow", label: "Velvet Flow", status: "3 format hazır" },
  { id: "botanical", label: "Botanical", status: "Dikey mini hazır" },
  { id: "the-editorial", label: "The Editorial", status: "Referans" },
  { id: "modern-arch", label: "Minimal", status: "Referans" },
  { id: "aurora", label: "Aurora", status: "Referans" },
] as const;

type ThemeId = (typeof themes)[number]["id"];
type Presentation = { id: string; name: string; image: string };

export function QrThemeAccordion() {
  const [activeTheme, setActiveTheme] = useState<ThemeId>("velvet-flow");
  const active = themes.find((theme) => theme.id === activeTheme)!;

  return <section className="design-center__theme-accordion" aria-label="QR tasarım koleksiyonları">
    <div className="design-center__theme-tabs" role="group" aria-label="QR tasarımını seçin">
      {themes.map((theme) => {
        const selected = theme.id === activeTheme;
        return <button
          type="button"
          id={`qr-theme-${theme.id}`}
          aria-controls="qr-theme-panel"
          aria-expanded={selected}
          key={theme.id}
          onClick={() => setActiveTheme(theme.id)}
        >
          <strong>{theme.label}</strong>
          <span>{theme.status}</span>
        </button>;
      })}
    </div>

    <div className="design-center__theme-panel" id="qr-theme-panel" role="region" aria-labelledby={`qr-theme-${activeTheme}`}>
      <header>
        <div><span>SEÇİLİ QR TASARIMI</span><h3>{active.label}</h3></div>
        <small>{active.status}</small>
      </header>
      {activeTheme === "velvet-flow" ? <>
        <PresentationGallery title="10 × 7,5 cm Yatay Mini QR" detail="Onaylı ön/arka kart sunumları" items={landscapeMiniPresentations}/>
        <PresentationGallery title="7,5 × 10 cm Dikey Mini QR" detail="Onaylı ön/arka kart sunumları" items={portraitMiniPresentations}/>
        <PresentationGallery title="50 × 70 cm Karşılama Tabelası" detail="Onaylı şövale sunumları" items={welcomeSignPresentations} welcomeSign/>
      </> : activeTheme === "botanical" ?
        <PresentationGallery title="7,5 × 10 cm Dikey Mini QR" detail="300 dpi ön/arka 3D kart sunumları" items={botanicalPortraitMiniPresentations}/>
        : <ReferenceGallery templateId={activeTheme}/>
      }
    </div>
  </section>;
}

function PresentationGallery({ title, detail, items, welcomeSign = false }: { title: string; detail: string; items: readonly Presentation[]; welcomeSign?: boolean }) {
  return <section className="design-center__presentation-section" data-format={welcomeSign ? "welcome-sign" : "mini-card"}>
    <div className="design-center__collection-head"><div><span>3D SUNUM</span><h3>{title}</h3></div><small>{detail} · {items.length} renk</small></div>
    <div className="design-center__presentation-grid">{items.map((item) => <article key={item.id}>
      <Image src={item.image} alt={`${item.name} ${title} ön ve arka yüz 3D sunumu`} width={welcomeSign ? 1060 : 1536} height={welcomeSign ? 1484 : 1024}/>
      <div><strong>{item.name}</strong><span>3D SUNUM</span></div>
    </article>)}</div>
  </section>;
}

function ReferenceGallery({ templateId }: { templateId: Exclude<ThemeId, "velvet-flow" | "botanical"> }) {
  const template = qrTemplates[templateId];
  return <section className="design-center__reference-section">
    <div className="design-center__collection-head"><div><span>MEVCUT REFERANSLAR</span><h3>Ön ve arka yüz varyantları</h3></div><small>Fiziksel baskı tabanı henüz hazırlanmadı</small></div>
    <div className="design-center__reference-grid">{template.variants.map((variant) => <article key={variant.id}>
      <div className="design-center__reference-pair">
        <Image src={variant.front} alt={`${template.name} ${variant.name} ön yüz referansı`} width={768} height={1024}/>
        <Image src={variant.back} alt={`${template.name} ${variant.name} arka yüz referansı`} width={768} height={1024}/>
      </div>
      <footer><span style={{ background: variant.swatch }}/><strong>{variant.name}</strong><small>REFERANS</small></footer>
    </article>)}</div>
  </section>;
}
