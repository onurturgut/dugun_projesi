import { z } from "zod";

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
    image: "/qrtasarım/ChatGPT Görseli 3 Eki 2026 20_32_35.png",
    template: "minimal",
    theme: "burgundy",
    primary: "#74151B",
    accent: "#E4C59A",
  },
  {
    id: "satin-babys-breath",
    name: "Saten & Cipso",
    image: "/qrtasarım/ChatGPT Görseli 3 Eki 2026 20_32_51.png",
    template: "ribbon",
    theme: "ivory",
    primary: "#F1E5D4",
    accent: "#8D6A3F",
  },
  {
    id: "mediterranean-terracotta",
    name: "Akdeniz Terrakota",
    image: "/qrtasarım/ChatGPT Görseli 3 Eki 2026 20_32_58.png",
    template: "couple",
    theme: "terracotta",
    primary: "#C77B50",
    accent: "#493322",
  },
  {
    id: "botanical-olive",
    name: "Botanik Zeytin",
    image: "/qrtasarım/ChatGPT Görseli 3 Eki 2026 20_33_28.png",
    template: "floral",
    theme: "olive",
    primary: "#66654A",
    accent: "#E4D4A9",
  },
  {
    id: "moonlight-navy",
    name: "Ay Işığı",
    image: "/qrtasarım/ChatGPT Görseli 3 Eki 2026 20_33_38.png",
    template: "night",
    theme: "navy",
    primary: "#101827",
    accent: "#E6BD7C",
  },
  {
    id: "black-ribbon",
    name: "Siyah Kurdele",
    image: "/qrtasarım/ChatGPT Görseli 3 Eki 2026 20_33_51.png",
    template: "ribbon",
    theme: "ivory",
    primary: "#E9DAC7",
    accent: "#171411",
  },
  {
    id: "organic-blush",
    name: "Pudra Organik",
    image: "/qrtasarım/ChatGPT Görseli 3 Eki 2026 20_33_58.png",
    template: "floral",
    theme: "blush",
    primary: "#EBC5B5",
    accent: "#84372D",
  },
  {
    id: "elegant-sepia",
    name: "Zarif Sepya",
    image: "/qrtasarım/ChatGPT Görseli 3 Eki 2026 20_34_11.png",
    template: "couple",
    theme: "ivory",
    primary: "#E7D4BC",
    accent: "#4B3929",
  },
  {
    id: "burgundy-glow",
    name: "Bordo Işıltı",
    image: "/qrtasarım/ChatGPT Görseli 3 Eki 2026 20_34_35.png",
    template: "couple",
    theme: "burgundy",
    primary: "#651016",
    accent: "#F0C46F",
  },
  {
    id: "ivory-floral",
    name: "Fildişi Çiçek",
    image: "/qrtasarım/ChatGPT Görseli 3 Eki 2026 20_34_45.png",
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
const hex = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Altı haneli bir renk kodu girin.");
export const designSchema = z
  .object({
    version: z.literal(1),
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
    pageTemplate: z.enum(["filmstrip"]).default("filmstrip"),
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
  .strict();
export type WeddingDesign = z.infer<typeof designSchema>;
export const defaultDesign: WeddingDesign = {
  version: 1,
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
  pageTemplate: "filmstrip",
  brandTagline: "Anılarınız her karede ışıldasın.",
  pageHeading: "Sıradaki kare sizden.",
  pageMessage: "Bu özel günde yakaladığınız anları bizimle paylaşın.",
  uploadTitle: "Fotoğraf / Video Yükle",
  uploadPrompt: "Fotoğraf veya video seçin",
};
export function resolveDesign(value?: WeddingDesign): WeddingDesign {
  const parsed = designSchema.safeParse(value);
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
