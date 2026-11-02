const variants = [
  { id: "burgundy", name: "Bordo" },
  { id: "black", name: "Obsidyen Siyah" },
  { id: "navy", name: "Gece Laciverti" },
  { id: "emerald", name: "Zümrüt" },
  { id: "cream", name: "Klasik Krem" },
] as const;

export const landscapeMiniPresentations = variants.map((variant) => ({
  ...variant,
  image: `/design-center/presentations/velvet-flow/landscape-mini/velvet-flow-${variant.id}-landscape-mini-presentation.png`,
}));

export const portraitMiniPresentations = variants.map((variant) => ({
  ...variant,
  image: `/design-center/presentations/velvet-flow/portrait-mini/velvet-flow-${variant.id}-portrait-mini-presentation.png`,
}));

const botanicalVariants = [
  { id: "sage", name: "Adaçayı" },
  { id: "cream", name: "Krem" },
  { id: "blush", name: "Pudra" },
  { id: "blue", name: "Mavi" },
  { id: "black", name: "Siyah" },
] as const;

export const botanicalPortraitMiniPresentations = botanicalVariants.map((variant) => ({
  ...variant,
  image: `/design-center/presentations/botanical/portrait-mini/botanical-${variant.id}-portrait-mini-uploaded-presentation-v1.png`,
}));

export const botanicalLandscapeMiniPresentations = botanicalVariants.map((variant) => ({
  ...variant,
  image: `/design-center/presentations/botanical/landscape-mini/botanical-${variant.id}-landscape-mini-uploaded-presentation-v1.png`,
}));

export const botanicalWelcomeSignPresentations = botanicalVariants.map((variant) => ({
  ...variant,
  image: `/design-center/presentations/botanical/welcome-sign-500x700/botanical-${variant.id}-welcome-sign-uploaded-presentation-v1.png`,
}));

export const welcomeSignPresentations = variants.map((variant) => ({
  ...variant,
  image: `/design-center/presentations/velvet-flow/welcome-sign-500x700/velvet-flow-${variant.id}-welcome-sign-presentation.png`,
}));

const editorialVariants = [
  { id: "cream", name: "Krem" }, { id: "blush", name: "Pudra" }, { id: "sage", name: "Adaçayı" }, { id: "blue", name: "Mavi" }, { id: "black", name: "Siyah" },
] as const;
const auroraVariants = [
  { id: "rose", name: "Gül" }, { id: "blue", name: "Mavi" }, { id: "cream", name: "Krem" }, { id: "green", name: "Yeşil" }, { id: "lavender", name: "Lavanta" },
] as const;
const presentationSet = (collection: string, collectionVariants: readonly { id: string; name: string }[]) => ({
  portrait: collectionVariants.map((variant) => ({ ...variant, image: `/design-center/presentations/${collection}/portrait-mini/${collection}-${variant.id}-portrait-mini-presentation.png` })),
  landscape: collectionVariants.map((variant) => ({ ...variant, image: `/design-center/presentations/${collection}/landscape-mini/${collection}-${variant.id}-landscape-mini-presentation.png` })),
  welcome: collectionVariants.map((variant) => ({ ...variant, image: `/design-center/presentations/${collection}/welcome-sign-500x700/${collection}-${variant.id}-welcome-sign-500x700-presentation.png` })),
});

export const minimalPresentationSet = {
  ...presentationSet("modern-arch", editorialVariants),
  portrait: editorialVariants.map((variant) => ({
    ...variant,
    image: `/design-center/presentations/modern-arch/portrait-mini/modern-arch-${variant.id}-portrait-mini-uploaded-v1-presentation.png`,
  })),
  landscape: editorialVariants.map((variant) => ({
    ...variant,
    image: `/design-center/presentations/modern-arch/landscape-mini/modern-arch-${variant.id}-landscape-mini-uploaded-v1-presentation.png`,
  })),
  welcome: editorialVariants.map((variant) => ({
    ...variant,
    image: `/design-center/presentations/modern-arch/welcome-sign-500x700/modern-arch-${variant.id}-welcome-sign-500x700-uploaded-v1-presentation.png`,
  })),
};
export const auroraPresentationSet = {
  ...presentationSet("aurora", auroraVariants),
  portrait: auroraVariants.map((variant) => ({
    ...variant,
    image: `/design-center/presentations/aurora/portrait-mini/aurora-${variant.id}-portrait-mini-uploaded-v1-presentation.png`,
  })),
  landscape: auroraVariants.map((variant) => ({
    ...variant,
    image: `/design-center/presentations/aurora/landscape-mini/aurora-${variant.id}-landscape-mini-uploaded-v1-presentation.png`,
  })),
  welcome: auroraVariants.map((variant) => ({
    ...variant,
    image: `/design-center/presentations/aurora/welcome-sign-500x700/aurora-${variant.id}-welcome-sign-500x700-uploaded-v1-presentation.png`,
  })),
};
