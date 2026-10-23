import { z } from "zod";
import { qrColorVariantIds } from "./qr-templates";
import { qrProductIds } from "./qr-products";
import { weddingTemplateIds, weddingTemplates } from "./wedding-templates";

export const themeIds = [
  "burgundy",
  "blush",
  "navy",
  "olive",
  "emerald",
  "ivory",
  "black",
  "terracotta",
] as const;
export type ThemeId = (typeof themeIds)[number];
export type TemplateSurface = "wedding" | "loading" | "qr";
export const qrCollectionIds = ["the-editorial", "velvet-flow", "botanical", "modern-arch", "aurora"] as const;
export type QrCollectionId = (typeof qrCollectionIds)[number];
export const qrCollectionReferences: ReadonlyArray<{ id: QrCollectionId; number: string; name: string; tagline: string; image: string }> = [
  { id: "the-editorial", number: "01", name: "THE EDITORIAL", tagline: "Zamansız ve zarif", image: "/design-reference/01-the-editorial.png" },
  { id: "velvet-flow", number: "02", name: "VELVET FLOW", tagline: "Modern lüks ve etkileyici", image: "/design-reference/02-velvet-flow.png" },
  { id: "botanical", number: "03", name: "BOTANICAL", tagline: "Doğal ve modern", image: "/design-reference/03-botanical.png" },
  { id: "modern-arch", number: "04", name: "MINIMAL", tagline: "Sade ve çağdaş", image: "/qr-templates/modern-arch/01_Krem_On_Yuz.webp" },
  { id: "aurora", number: "05", name: "AURORA", tagline: "Sanatsal ve özgün", image: "/design-reference/05-aurora.png" },
];
export const editorialPresetIds = [
  "editorial-cream",
  "editorial-sage",
  "editorial-terracotta",
] as const;
export type EditorialPresetId = (typeof editorialPresetIds)[number];
export const editorialFontPairIds = [
  "cormorant-manrope",
  "prata-manrope",
] as const;
export const editorialPresets: Record<
  EditorialPresetId,
  {
    name: string;
    primary: `#${string}`;
    secondary: `#${string}`;
    accent: `#${string}`;
    text: `#${string}`;
    gradient: string;
  }
> = {
  "editorial-cream": {
    name: "Krem Taş",
    primary: "#E9DDCC",
    secondary: "#BBA48A",
    accent: "#8A6B52",
    text: "#30271F",
    gradient: "linear-gradient(135deg,#F6F0E7 0%,#E9DDCC 52%,#C7B49D 100%)",
  },
  "editorial-sage": {
    name: "Adaçayı Yeşili",
    primary: "#525D47",
    secondary: "#899178",
    accent: "#D7C5A3",
    text: "#FFFFFF",
    gradient: "linear-gradient(145deg,#78816A 0%,#525D47 55%,#303D32 100%)",
  },
  "editorial-terracotta": {
    name: "Terracotta",
    primary: "#B87352",
    secondary: "#E4B58F",
    accent: "#F4E5D5",
    text: "#FFFFFF",
    gradient: "linear-gradient(135deg,#E4B58F 0%,#B87352 55%,#84422F 100%)",
  },
};
export type TemplateMetadata = {
  id: string;
  name: string;
  surface: TemplateSurface;
  version: number;
  available: boolean;
  asset?: string;
  description: string;
};
export const themes: Record<
  ThemeId,
  { name: string; base: string; light: string; accent: string; ink: string }
> = {
  burgundy: {
    name: "Bordo",
    base: "#42090F",
    light: "#961D2B",
    accent: "#E6C38B",
    ink: "#FFF0DE",
  },
  blush: {
    name: "Pudra",
    base: "#BF8D82",
    light: "#F4D4C2",
    accent: "#713C32",
    ink: "#42261F",
  },
  navy: {
    name: "Lacivert",
    base: "#071326",
    light: "#233E66",
    accent: "#DDB77B",
    ink: "#F3EDDF",
  },
  olive: {
    name: "Zeytin",
    base: "#292D1B",
    light: "#77764D",
    accent: "#DEC99A",
    ink: "#F3EDD9",
  },
  emerald: {
    name: "Zümrüt",
    base: "#082719",
    light: "#215639",
    accent: "#DFC38C",
    ink: "#F4EFDF",
  },
  ivory: {
    name: "Fildişi",
    base: "#E8DAC4",
    light: "#FFF7E8",
    accent: "#886338",
    ink: "#46331E",
  },
  black: {
    name: "Siyah",
    base: "#10100F",
    light: "#38332B",
    accent: "#DAC8A7",
    ink: "#F4EEE3",
  },
  terracotta: {
    name: "Terrakota",
    base: "#A95D36",
    light: "#E6AD77",
    accent: "#422819",
    ink: "#291A12",
  },
};
export const introTypes = {
  curtain: "Perde ve kurdele",
  monogram: "Monogram",
  fade: "Sade geçiş",
  video: "Klasik bordo video",
} as const;
export const cardTemplates = {
  floral: "Çiçekli",
  ribbon: "Kurdeleli",
  couple: "Çift illüstrasyonu",
  minimal: "Minimal",
  night: "Gece",
} as const;
export const cardPresets = [
  {
    id: "campus-burgundy",
    name: "Etkinlik Bordo",
    image: "/qr-templates/velvet-flow/01_Bordo_On_Yuz.webp",
    template: "minimal",
    theme: "burgundy",
    primary: "#74151B",
    accent: "#E4C59A",
  },
  {
    id: "satin-babys-breath",
    name: "Saten & Cipso",
    image: "/qr-templates/the-editorial/01_Krem_On_Yuz.webp",
    template: "ribbon",
    theme: "ivory",
    primary: "#F1E5D4",
    accent: "#8D6A3F",
  },
  {
    id: "mediterranean-terracotta",
    name: "Akdeniz Terrakota",
    image: "/qr-templates/modern-arch/02_Pudra_On_Yuz.webp",
    template: "couple",
    theme: "terracotta",
    primary: "#C77B50",
    accent: "#493322",
  },
  {
    id: "botanical-olive",
    name: "Botanik Zeytin",
    image: "/qr-templates/botanical/Botanical_Adacayi_On_Yuz.webp",
    template: "floral",
    theme: "olive",
    primary: "#66654A",
    accent: "#E4D4A9",
  },
  {
    id: "moonlight-navy",
    name: "Ay Işığı",
    image: "/qr-templates/velvet-flow/02_Lacivert_On_Yuz.webp",
    template: "night",
    theme: "navy",
    primary: "#101827",
    accent: "#E6BD7C",
  },
  {
    id: "black-ribbon",
    name: "Siyah Kurdele",
    image: "/qr-templates/velvet-flow/03_Siyah_On_Yuz.webp",
    template: "ribbon",
    theme: "ivory",
    primary: "#E9DAC7",
    accent: "#171411",
  },
  {
    id: "organic-blush",
    name: "Pudra Organik",
    image: "/qr-templates/botanical/Botanical_Pudra_On_Yuz.webp",
    template: "floral",
    theme: "blush",
    primary: "#EBC5B5",
    accent: "#84372D",
  },
  {
    id: "elegant-sepia",
    name: "Zarif Sepya",
    image: "/qr-templates/aurora/Aurora_03_Krem_On_Yuz.webp",
    template: "couple",
    theme: "ivory",
    primary: "#E7D4BC",
    accent: "#4B3929",
  },
  {
    id: "burgundy-glow",
    name: "Bordo Işıltı",
    image: "/qr-templates/aurora/Aurora_01_Rose_On_Yuz.webp",
    template: "couple",
    theme: "burgundy",
    primary: "#651016",
    accent: "#F0C46F",
  },
  {
    id: "ivory-floral",
    name: "Fildişi Çiçek",
    image: "/qr-templates/modern-arch/01_Krem_On_Yuz.webp",
    template: "floral",
    theme: "ivory",
    primary: "#EEE0CB",
    accent: "#9A7132",
  },
] as const satisfies ReadonlyArray<{
  id: string;
  name: string;
  image: string;
  template: keyof typeof cardTemplates;
  theme: ThemeId;
  primary: `#${string}`;
  accent: `#${string}`;
}>;
export const pageTemplates = {
  filmstrip: "Hareketli film şeridi",
} as const;
export const templateCatalog: readonly TemplateMetadata[] = [
  { id: "filmstrip", name: pageTemplates.filmstrip, surface: "wedding", version: 1, available: true, description: "Hareketli iki sıralı fotoğraf alanı" },
  ...weddingTemplates.map((template) => ({ id: template.id, name: template.name, surface: "wedding" as const, version: 1, available: true, asset: template.reference, description: template.description })),
  ...Object.entries(introTypes).filter(([id]) => id !== "video").map(([id, name]) => ({ id, name, surface: "loading" as const, version: 1, available: true, description: "Hazır animasyonlu açılış" })),
  { id: "video", name: introTypes.video, surface: "loading", version: 1, available: true, asset: "/intro/shineqr-portrait-v2.mp4", description: "ShineQR bordo açılış filmi" },
  ...cardPresets.map((preset) => ({ id: preset.id, name: preset.name, surface: "qr" as const, version: 1, available: true, asset: preset.image, description: `${cardTemplates[preset.template]} QR kartı` })),
];
export function availableTemplates(surface: TemplateSurface) {
  return templateCatalog.filter((template) => template.surface === surface && template.available);
}
const hex = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Altı haneli bir renk kodu girin.");
const qrElementLayoutSchema = z.object({
  x: z.number().min(-300).max(300),
  y: z.number().min(-400).max(400),
  width: z.number().min(80).max(600),
  height: z.number().min(40).max(500),
});
export const defaultQrLayout = {
  qrHook: { x: 0, y: 0, width: 340, height: 190 },
  qrDescription: { x: 0, y: 0, width: 340, height: 100 },
  qrCta: { x: 0, y: 0, width: 340, height: 55 },
  names: { x: 0, y: 0, width: 340, height: 60 },
  message: { x: 0, y: 0, width: 400, height: 280 },
  qr: { x: 0, y: 0, width: 196, height: 196 },
  icons: { x: 0, y: 0, width: 154, height: 40 },
  divider: { x: 0, y: 0, width: 210, height: 40 },
} as const;
export const designSchema = z
  .object({
    version: z.literal(2),
    theme: z.enum(themeIds),
    intro: z.enum(["curtain", "monogram", "fade", "video"]),
    speed: z.number().min(0.75).max(2),
    cardTemplate: z.enum(["floral", "ribbon", "couple", "minimal", "night"]),
    linked: z.boolean(),
    cardTheme: z.enum(themeIds),
    customColors: z.boolean(),
    primary: hex,
    accent: hex,
    names: z.string().trim().max(100),
    monogram: z.string().trim().max(8),
    message: z.string().trim().max(240),
    qrTemplateId: z.enum(qrCollectionIds).default("the-editorial"),
    qrColorVariant: z.enum(qrColorVariantIds).default("cream"),
    qrTemplateVersion: z.number().int().min(1).default(1),
    qrProductId: z.enum(qrProductIds).default("portrait-mini-75x100-duplex"),
    qrCompleted: z.boolean().default(false),
    loadingCompleted: z.boolean().default(false),
    qrPresetId: z.enum(editorialPresetIds).default("editorial-cream"),
    qrFontPairId: z.enum(editorialFontPairIds).default("cormorant-manrope"),
    qrHook: z.string().trim().min(1).max(72).default("Bu günün bir karesi de senden olsun."),
    qrDescription: z.string().trim().min(1).max(110).default("Fotoğraf ve videolarını bizimle paylaş."),
    qrCta: z.string().trim().min(1).max(48).default("QR kodu okut ve anılarını yükle."),
    qrLayout: z.object({
      qrHook: qrElementLayoutSchema,
      qrDescription: qrElementLayoutSchema,
      qrCta: qrElementLayoutSchema,
      names: qrElementLayoutSchema,
      message: qrElementLayoutSchema,
      qr: qrElementLayoutSchema,
      icons: qrElementLayoutSchema.default(defaultQrLayout.icons),
      divider: qrElementLayoutSchema.default(defaultQrLayout.divider),
    }).default(defaultQrLayout),
    pageTemplate: z.enum(["filmstrip", ...weddingTemplateIds]).default("filmstrip"),
    weddingTemplateVersion: z.number().int().min(1).default(1),
    weddingImage: z.string().trim().max(2048).default(""),
    weddingImagePositionX: z.number().min(0).max(100).default(50),
    weddingImagePositionY: z.number().min(0).max(100).default(50),
    weddingImageZoom: z.number().min(1).max(3).default(1),
    weddingCompleted: z.boolean().default(false),
    brandTagline: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .default("Anılarınız her karede ışıldasın."),
    pageHeading: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .default("Sıradaki kare sizden."),
    pageMessage: z
      .string()
      .trim()
      .min(1)
      .max(240)
      .default("Bu özel günde yakaladığınız anları bizimle paylaşın."),
    uploadTitle: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .default("Fotoğraf / Video Yükle"),
    uploadPrompt: z
      .string()
      .trim()
      .min(1)
      .max(160)
      .default("Fotoğraf veya video seçin"),
  })
  .strict()
  .superRefine((design, context) => {
    if (design.loadingCompleted && !design.qrCompleted) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["loadingCompleted"],
        message: "Loading aşaması QR aşaması tamamlanmadan tamamlanamaz.",
      });
    }
    if (design.weddingCompleted && !design.loadingCompleted) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["weddingCompleted"],
        message: "Wedding aşaması Loading aşaması tamamlanmadan tamamlanamaz.",
      });
    }
    if (design.weddingCompleted && !design.weddingImage) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["weddingImage"],
        message: "Wedding aşamasını tamamlamak için bir organizasyon fotoğrafı seçin.",
      });
    }
  });
export type WeddingDesign = z.infer<typeof designSchema>;
export const defaultDesign: WeddingDesign = {
  version: 2,
  theme: "burgundy",
  intro: "video",
  speed: 1.5,
  cardTemplate: "floral",
  linked: true,
  cardTheme: "burgundy",
  customColors: false,
  primary: "#42090F",
  accent: "#E6C38B",
  names: "",
  monogram: "",
  message: "Bu özel günümüzü bizimle paylaştığınız için teşekkür ederiz.",
  qrTemplateId: "the-editorial",
  qrColorVariant: "cream",
  qrTemplateVersion: 1,
  qrProductId: "portrait-mini-75x100-duplex",
  qrCompleted: false,
  loadingCompleted: false,
  qrPresetId: "editorial-cream",
  qrFontPairId: "cormorant-manrope",
  qrHook: "Bu günün bir karesi de senden olsun.",
  qrDescription: "Fotoğraf ve videolarını bizimle paylaş.",
  qrCta: "QR kodu okut ve anılarını yükle.",
  qrLayout: defaultQrLayout,
  pageTemplate: "filmstrip",
  weddingTemplateVersion: 1,
  weddingImage: "",
  weddingImagePositionX: 50,
  weddingImagePositionY: 50,
  weddingImageZoom: 1,
  weddingCompleted: false,
  brandTagline: "Anılarınız her karede ışıldasın.",
  pageHeading: "Sıradaki kare sizden.",
  pageMessage: "Bu özel günde yakaladığınız anları bizimle paylaşın.",
  uploadTitle: "Fotoğraf / Video Yükle",
  uploadPrompt: "Fotoğraf veya video seçin",
};
export function resolveDesign(value?: WeddingDesign | Record<string, unknown>): WeddingDesign {
  const parsed = designSchema.safeParse({ ...defaultDesign, ...value, version: 2 });
  return parsed.success ? parsed.data : { ...defaultDesign };
}
export function designNames(design: WeddingDesign, title: string) {
  return design.names || title;
}
export function designMonogram(design: WeddingDesign, title: string) {
  return (
    design.monogram ||
    designNames(design, title)
      .split(/\s+/)
      .filter((s) => !["&", "ve"].includes(s.toLowerCase()))
      .slice(0, 2)
      .map((s) => Array.from(s)[0])
      .join(" · ")
      .toLocaleUpperCase("tr")
  );
}
export function cardPalette(design: WeddingDesign) {
  const palette = themes[design.linked ? design.theme : design.cardTheme];
  return design.customColors
    ? {
        ...palette,
        base: design.primary,
        accent: design.accent,
        ink: readableInk(design.primary),
      }
    : palette;
}
export function readableInk(hex: string) {
  const rgb = [1, 3, 5]
    .map((start) => parseInt(hex.slice(start, start + 2), 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722 > 0.179
    ? "#191612"
    : "#FFF8EE";
}
