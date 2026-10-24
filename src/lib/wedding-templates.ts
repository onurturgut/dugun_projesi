export const weddingTemplateIds = [
  "ivory-editorial",
  "velvet-flow",
  "botanical",
  "modern-arch",
  "aurora",
  "champagne",
  "retro-romance",
  "mediterranean",
  "cinematic",
  "timeless",
  "romantic-ceremony",
] as const;

export type WeddingTemplateId = (typeof weddingTemplateIds)[number];

export type WeddingTemplateDefinition = {
  id: WeddingTemplateId;
  number: string;
  name: string;
  description: string;
  reference: string;
  base: `#${string}`;
  light: `#${string}`;
  accent: `#${string}`;
  ink: `#${string}`;
  imageTreatment: "arch" | "full" | "polaroid";
  monochrome?: boolean;
};

export const weddingTemplates: readonly WeddingTemplateDefinition[] = [
  { id: "ivory-editorial", number: "01", name: "Ivory Editorial", description: "Zamansız, aydınlık ve editoryal", reference: "/wedding-designs/01_Ivory_Editorial.png", base: "#F3E9D8", light: "#FFF9EF", accent: "#7A5127", ink: "#35271C", imageTreatment: "arch" },
  { id: "velvet-flow", number: "02", name: "Velvet Flow", description: "Bordo, dramatik ve modern", reference: "/wedding-designs/02_Velvet_Flow.png", base: "#4A0911", light: "#8F1C2C", accent: "#E7C783", ink: "#FFF1D6", imageTreatment: "full" },
  { id: "botanical", number: "03", name: "Botanical", description: "Doğal, ferah ve zarif", reference: "/wedding-designs/03_Botanical.png", base: "#E8E8D4", light: "#FBF9ED", accent: "#285B3B", ink: "#183A2B", imageTreatment: "arch" },
  { id: "modern-arch", number: "04", name: "Modern Arch", description: "Sıcak, mimari ve çağdaş", reference: "/wedding-designs/04_Modern_Arch.png", base: "#D2A56F", light: "#F5E1C4", accent: "#69401E", ink: "#342318", imageTreatment: "arch" },
  { id: "aurora", number: "05", name: "Aurora", description: "Yumuşak, romantik ve ışıltılı", reference: "/wedding-designs/05_Aurora.png", base: "#E9B7AF", light: "#FBE5DF", accent: "#8A152D", ink: "#5B1524", imageTreatment: "full" },
  { id: "champagne", number: "06", name: "Champagne", description: "Işıltılı ve kutlama odaklı", reference: "/wedding-designs/06_Champagne.png", base: "#B88A4A", light: "#F5DFB5", accent: "#714515", ink: "#362311", imageTreatment: "full" },
  { id: "retro-romance", number: "07", name: "Retro Romance", description: "Nostaljik ve sıcak", reference: "/wedding-designs/07_Retro_Romance.png", base: "#A44938", light: "#E7A889", accent: "#F6D79D", ink: "#FFF0DC", imageTreatment: "polaroid" },
  { id: "mediterranean", number: "08", name: "Mediterranean", description: "Canlı, ferah ve Akdeniz esintili", reference: "/wedding-designs/08_Mediterranean.png", base: "#DCEBF0", light: "#F7FBFC", accent: "#075D8A", ink: "#064A70", imageTreatment: "arch" },
  { id: "cinematic", number: "09", name: "Cinematic", description: "Siyah beyaz ve sinematik", reference: "/wedding-designs/09_Cinematic.png", base: "#111111", light: "#343434", accent: "#F2F2F2", ink: "#FFFFFF", imageTreatment: "full", monochrome: true },
  { id: "timeless", number: "10", name: "Timeless", description: "Klasik, sade ve zamansız", reference: "/wedding-designs/10_Timeless.png", base: "#EDE2CF", light: "#FFF9ED", accent: "#5C3B20", ink: "#38281B", imageTreatment: "arch" },
  { id: "romantic-ceremony", number: "11", name: "Romantik Tören", description: "Aydınlık, romantik ve bordo detaylı", reference: "/wedding-designs/11_Romantik_Dugun.png", base: "#F4E9DD", light: "#FFF9F2", accent: "#8B0D25", ink: "#391A16", imageTreatment: "full" },
] as const;

export function resolveWeddingTemplate(id: string) {
  return weddingTemplates.find((template) => template.id === id);
}

export function weddingImageBelongsToEvent(image: string, coverImages: string[]) {
  return image.length === 0 || coverImages.includes(image);
}
