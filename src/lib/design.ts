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
