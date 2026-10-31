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
  image: `/design-center/presentations/botanical/portrait-mini/botanical-${variant.id}-portrait-mini-3d-presentation-v3.png`,
}));

export const welcomeSignPresentations = variants.map((variant) => ({
  ...variant,
  image: `/design-center/presentations/velvet-flow/welcome-sign-500x700/velvet-flow-${variant.id}-welcome-sign-presentation.png`,
}));
