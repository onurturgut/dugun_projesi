import type { QrCollectionId } from "./design";

export const qrColorVariantIds = [
  "cream",
  "blush",
  "sage",
  "blue",
  "black",
  "burgundy",
  "navy",
  "emerald",
  "rose",
  "green",
  "lavender",
] as const;

export type QrColorVariantId = (typeof qrColorVariantIds)[number];

export type QrFontFamily =
  "cormorant" | "cormorantItalic" | "cinzel" | "allura" | "manrope";
export type QrTemplateLayout = {
  contentX: number;
  brandY: number;
  title: {
    y: number;
    size: number;
    width: number;
    maxLines: number;
    family: QrFontFamily;
    letterSpacing?: number;
  };
  description: { y: number; size: number; width: number; maxLines: number };
  qr: { x: number; y: number; size: number };
  iconsY: number;
  ctaY: number;
  dividerY: number;
  namesY: number;
  dateY: number;
};

type QrVariant = {
  id: QrColorVariantId;
  name: string;
  swatch: string;
  ink: string;
  front: string;
  back: string;
};

type QrTemplate = {
  id: QrCollectionId;
  name: string;
  defaultVariant: QrColorVariantId;
  flatBackground: string;
  variants: readonly QrVariant[];
};

const variant = (
  template: QrCollectionId,
  id: QrColorVariantId,
  name: string,
  swatch: string,
  ink: string,
  front: string,
  back: string,
): QrVariant => ({
  id,
  name,
  swatch,
  ink,
  front: `/qr-templates/${template}/${front}`,
  back: `/qr-templates/${template}/${back}`,
});

export const qrTemplates: Record<QrCollectionId, QrTemplate> = {
  "velvet-flow": {
    id: "velvet-flow",
    name: "Velvet Flow",
    defaultVariant: "burgundy",
    flatBackground: "/qr-flat/02_Velvet_Flow_Arka_Yuz.webp",
    variants: [
      variant(
        "velvet-flow",
        "burgundy",
        "Bordo",
        "#760b19",
        "#f3cf82",
        "01_Bordo_On_Yuz.webp",
        "01_Bordo_Arka_Yuz.webp",
      ),
      variant(
        "velvet-flow",
        "navy",
        "Lacivert",
        "#092444",
        "#f3cf82",
        "02_Lacivert_On_Yuz.webp",
        "02_Lacivert_Arka_Yuz.webp",
      ),
      variant(
        "velvet-flow",
        "black",
        "Siyah",
        "#181716",
        "#e9c780",
        "03_Siyah_On_Yuz.webp",
        "03_Siyah_Arka_Yuz.webp",
      ),
      variant(
        "velvet-flow",
        "cream",
        "Krem",
        "#ead9bd",
        "#33261d",
        "04_Krem_On_Yuz.webp",
        "04_Krem_Arka_Yuz.webp",
      ),
      variant(
        "velvet-flow",
        "emerald",
        "Zümrüt",
        "#07524c",
        "#f3cf82",
        "05_Zumrut_On_Yuz.webp",
        "05_Zumrut_Arka_Yuz.webp",
      ),
    ],
  },
  botanical: {
    id: "botanical",
    name: "Botanical",
    defaultVariant: "sage",
    flatBackground: "/qr-flat/03_Botanical_Arka_Yuz.webp",
    variants: [
      variant(
        "botanical",
        "sage",
        "Adaçayı",
        "#8e9b78",
        "#20291f",
        "Botanical_Adacayi_On_Yuz.webp",
        "Botanical_Adacayi_Arka_Yuz.webp",
      ),
      variant(
        "botanical",
        "cream",
        "Krem",
        "#eee3cf",
        "#33281f",
        "Botanical_Krem_On_Yuz.webp",
        "Botanical_Krem_Arka_Yuz.webp",
      ),
      variant(
        "botanical",
        "blue",
        "Mavi",
        "#a9c9e5",
        "#172a3a",
        "Botanical_Mavi_On_Yuz.webp",
        "Botanical_Mavi_Arka_Yuz.webp",
      ),
      variant(
        "botanical",
        "blush",
        "Pudra",
        "#e6b8b3",
        "#3b2523",
        "Botanical_Pudra_On_Yuz.webp",
        "Botanical_Pudra_Arka_Yuz.webp",
      ),
      variant(
        "botanical",
        "black",
        "Siyah",
        "#171717",
        "#fff8eb",
        "Botanical_Siyah_On_Yuz.webp",
        "Botanical_Siyah_Arka_Yuz.webp",
      ),
    ],
  },
  "modern-arch": {
    id: "modern-arch",
    name: "Minimal",
    defaultVariant: "cream",
    flatBackground: "/qr-templates/modern-arch/01_Krem_Arka_Yuz.webp",
    variants: [
      variant(
        "modern-arch",
        "cream",
        "Krem",
        "#ecddc7",
        "#30271f",
        "01_Krem_On_Yuz.webp",
        "01_Krem_Arka_Yuz.webp",
      ),
      variant(
        "modern-arch",
        "blush",
        "Pudra",
        "#dda9a0",
        "#35211e",
        "02_Pudra_On_Yuz.webp",
        "02_Pudra_Arka_Yuz.webp",
      ),
      variant(
        "modern-arch",
        "sage",
        "Adaçayı",
        "#9aa087",
        "#20251d",
        "03_Adacayi_On_Yuz.webp",
        "03_Adacayi_Arka_Yuz.webp",
      ),
      variant(
        "modern-arch",
        "blue",
        "Mavi",
        "#afc5df",
        "#172331",
        "04_Mavi_On_Yuz.webp",
        "04_Mavi_Arka_Yuz.webp",
      ),
      variant(
        "modern-arch",
        "black",
        "Siyah",
        "#171717",
        "#fff8eb",
        "05_Siyah_On_Yuz.webp",
        "05_Siyah_Arka_Yuz.webp",
      ),
    ],
  },
  aurora: {
    id: "aurora",
    name: "Aurora",
    defaultVariant: "rose",
    flatBackground: "/qr-flat/04_Aurora_Arka_Yuz.webp",
    variants: [
      variant(
        "aurora",
        "rose",
        "Gül",
        "#d98f98",
        "#3a2025",
        "Aurora_01_Rose_On_Yuz.webp",
        "Aurora_01_Rose_Arka_Yuz.webp",
      ),
      variant(
        "aurora",
        "blue",
        "Mavi",
        "#a9c7e7",
        "#172a3f",
        "Aurora_02_Mavi_On_Yuz.webp",
        "Aurora_02_Mavi_Arka_Yuz.webp",
      ),
      variant(
        "aurora",
        "cream",
        "Krem",
        "#ecd7b8",
        "#362719",
        "Aurora_03_Krem_On_Yuz.webp",
        "Aurora_03_Krem_Arka_Yuz.webp",
      ),
      variant(
        "aurora",
        "green",
        "Yeşil",
        "#88a185",
        "#1c2a20",
        "Aurora_04_Yesil_On_Yuz.webp",
        "Aurora_04_Yesil_Arka_Yuz.webp",
      ),
      variant(
        "aurora",
        "lavender",
        "Lavanta",
        "#c5a5df",
        "#2f203b",
        "Aurora_05_Lavanta_On_Yuz.webp",
        "Aurora_05_Lavanta_Arka_Yuz.webp",
      ),
    ],
  },
};

export const qrTemplateLayouts: Record<QrCollectionId, QrTemplateLayout> = {
  "velvet-flow": {
    contentX: 532,
    brandY: 104,
    title: {
      y: 217,
      size: 39,
      width: 15,
      maxLines: 4,
      family: "cinzel",
      letterSpacing: 0.4,
    },
    description: { y: 371, size: 19, width: 26, maxLines: 3 },
    qr: { x: 438, y: 448, size: 188 },
    iconsY: 672,
    ctaY: 734,
    dividerY: 810,
    namesY: 853,
    dateY: 890,
  },
  botanical: {
    contentX: 390,
    brandY: 106,
    title: {
      y: 222,
      size: 47,
      width: 19,
      maxLines: 4,
      family: "cormorant",
      letterSpacing: -0.6,
    },
    description: { y: 385, size: 19, width: 29, maxLines: 3 },
    qr: { x: 292, y: 456, size: 196 },
    iconsY: 684,
    ctaY: 746,
    dividerY: 817,
    namesY: 861,
    dateY: 897,
  },
  "modern-arch": {
    contentX: 430,
    brandY: 104,
    title: {
      y: 220,
      size: 40,
      width: 16,
      maxLines: 4,
      family: "cinzel",
      letterSpacing: 0.1,
    },
    description: { y: 382, size: 18, width: 27, maxLines: 4 },
    qr: { x: 337, y: 462, size: 186 },
    iconsY: 680,
    ctaY: 739,
    dividerY: 812,
    namesY: 855,
    dateY: 892,
  },
  aurora: {
    contentX: 465,
    brandY: 106,
    title: {
      y: 218,
      size: 47,
      width: 19,
      maxLines: 4,
      family: "cormorantItalic",
      letterSpacing: -0.5,
    },
    description: { y: 382, size: 19, width: 29, maxLines: 3 },
    qr: { x: 367, y: 452, size: 196 },
    iconsY: 682,
    ctaY: 744,
    dividerY: 816,
    namesY: 859,
    dateY: 896,
  },
};

const botanicalLandscapeLayout: QrTemplateLayout = {
  contentX: 500,
  brandY: 265,
  title: {
    y: 330,
    size: 38,
    width: 19,
    maxLines: 2,
    family: "cormorant",
    letterSpacing: -0.4,
  },
  description: { y: 400, size: 17, width: 34, maxLines: 2 },
  qr: { x: 375, y: 420, size: 250 },
  iconsY: 680,
  ctaY: 720,
  dividerY: 750,
  namesY: 780,
  dateY: 805,
};

export function resolveQrTemplateLayout(
  templateId: QrCollectionId,
  productId?: string,
) {
  return templateId === "botanical" &&
    productId === "landscape-mini-100x75-duplex"
    ? botanicalLandscapeLayout
    : qrTemplateLayouts[templateId];
}

export function resolveQrVariant(
  templateId: QrCollectionId,
  variantId: QrColorVariantId,
) {
  const template = qrTemplates[templateId];
  return (
    template.variants.find((item) => item.id === variantId) ??
    template.variants.find((item) => item.id === template.defaultVariant)!
  );
}

const velvetPhysicalVariantFolders: Partial<Record<QrColorVariantId, string>> =
  {
    burgundy: "burgundy",
    navy: "midnight-navy",
    black: "obsidian-black",
    cream: "classic-cream",
    emerald: "emerald",
  };

const botanicalPhysicalVariantFolders: Partial<
  Record<QrColorVariantId, string>
> = {
  sage: "sage",
  cream: "cream",
  blush: "blush",
  blue: "blue",
  black: "black",
};

export function resolvePhysicalQrBackground(
  templateId: QrCollectionId,
  variantId: QrColorVariantId,
  face: "front" | "back",
  productId = "portrait-mini-75x100-duplex",
) {
  const format =
    productId === "landscape-mini-100x75-duplex"
      ? "landscape-mini"
      : productId === "welcome-sign-500x700-duplex"
        ? "welcome-sign-500x700"
        : "portrait-mini";
  if (
    templateId === "modern-arch" &&
    format === "portrait-mini" &&
    ["cream", "blush", "sage", "blue", "black"].includes(variantId)
  ) {
    return `/design-center/templates/modern-arch/${variantId}/portrait-mini/minimal-${variantId}-portrait-mini-${face}-base-clean.png`;
  }
  if (
    templateId === "modern-arch" &&
    format === "landscape-mini" &&
    ["cream", "blush", "sage", "blue", "black"].includes(variantId)
  ) {
    return `/design-center/templates/modern-arch/${variantId}/landscape-mini/minimal-${variantId}-landscape-mini-${face}-base-clean.png`;
  }
  if (
    templateId === "modern-arch" &&
    format === "welcome-sign-500x700" &&
    variantId === "cream"
  ) {
    return "/design-center/templates/modern-arch/cream/welcome-sign-500x700/minimal-cream-welcome-sign-front-base-clean.png";
  }
  if (templateId === "botanical") {
    const folder = botanicalPhysicalVariantFolders[variantId];
    if (!folder) return null;
    const extension = format === "welcome-sign-500x700" ? "jpg" : "png";
    return `/design-center/templates/botanical/${folder}/${format}/botanical-${folder}-${format}-${face}-base-clean.${extension}`;
  }
  if (templateId !== "velvet-flow") return null;
  const folder = velvetPhysicalVariantFolders[variantId];
  if (!folder) return null;
  const availableFace =
    format === "welcome-sign-500x700"
      ? "front"
      : folder === "obsidian-black" && format === "portrait-mini"
        ? "back"
        : face;
  if (format === "welcome-sign-500x700")
    return `/design-center/templates/velvet-flow/${folder}/${format}/velvet-flow-${folder}-welcome-sign-${availableFace}-base-clean.png`;
  return `/design-center/templates/velvet-flow/${folder}/${format}/velvet-flow-${folder}-${format}-${availableFace}-base-clean.png`;
}

/** Returns the untouched published 2D face used by the field-map UI. */
export function resolveQrFieldMapFace(
  templateId: QrCollectionId,
  variantId: QrColorVariantId,
  productId: string,
  face: "front" | "back" = "front",
) {
  const original = resolveQrVariant(templateId, variantId)[face];
  if (
    templateId === "aurora" ||
    (templateId === "modern-arch" &&
      productId === "welcome-sign-500x700-duplex" &&
      variantId !== "cream") ||
    (face === "front" &&
      templateId === "velvet-flow" &&
      variantId === "black" &&
      productId === "portrait-mini-75x100-duplex")
  )
    return original;
  return (
    resolvePhysicalQrBackground(templateId, variantId, face, productId) ||
    original
  );
}

export function resolveGeneratedQrFieldMapFace(
  templateId: QrCollectionId,
  variantId: QrColorVariantId,
  productId: string,
  face: "front" | "back",
) {
  const format =
    productId === "portrait-mini-75x100-duplex"
      ? "portrait-mini"
      : productId === "landscape-mini-100x75-duplex"
        ? "landscape-mini"
        : "welcome-sign-500x700";
  return `/design-center/field-map/generated/faces/${templateId}-${variantId}-${format}-${face}-v1.png`;
}
