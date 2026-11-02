"use client";

import Image from "next/image";
import { useState } from "react";
import { auroraPresentationSet, botanicalLandscapeMiniPresentations, botanicalPortraitMiniPresentations, botanicalWelcomeSignPresentations, landscapeMiniPresentations, minimalPresentationSet, portraitMiniPresentations, welcomeSignPresentations } from "@/lib/qr-presentations";

const themes = [
  { id: "velvet-flow", label: "Velvet Flow", status: "3 format hazır" },
  { id: "botanical", label: "Botanical", status: "3 format hazır" },
  { id: "modern-arch", label: "Minimal", status: "3 sunum hazır" },
  { id: "aurora", label: "Aurora", status: "3 sunum hazır" },
] as const;

type ThemeId = (typeof themes)[number]["id"];
type Presentation = { id: string; name: string; image: string };
const presentationSets = { "modern-arch": minimalPresentationSet, aurora: auroraPresentationSet } as const;

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
      </> : activeTheme === "botanical" ? <>
        <PresentationGallery title="10 × 7,5 cm Yatay Mini QR" detail="300 dpi ön/arka kart sunumları" items={botanicalLandscapeMiniPresentations}/>
        <PresentationGallery title="7,5 × 10 cm Dikey Mini QR" detail="300 dpi ön/arka 3D kart sunumları" items={botanicalPortraitMiniPresentations}/>
        <PresentationGallery title="50 × 70 cm Karşılama Tabelası" detail="300 dpi şövale sunumları" items={botanicalWelcomeSignPresentations} welcomeSign/>
      </> : <CollectionPresentationGalleries set={presentationSets[activeTheme]}/>
      }
    </div>
  </section>;
}

function CollectionPresentationGalleries({ set }: { set: (typeof presentationSets)[keyof typeof presentationSets] }) {
  return <>
    <PresentationGallery title="10 × 7,5 cm Yatay Mini QR" detail="Sunum onayından sonra baskı yüzü hazırlanacak" items={set.landscape}/>
    <PresentationGallery title="7,5 × 10 cm Dikey Mini QR" detail="Sunum onayından sonra baskı yüzü hazırlanacak" items={set.portrait}/>
    <PresentationGallery title="50 × 70 cm Karşılama Tabelası" detail="Sunum onayından sonra baskı yüzü hazırlanacak" items={set.welcome} welcomeSign/>
  </>;
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

