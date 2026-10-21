import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { buildQrCards } from "../src/lib/qr-card";
import { defaultDesign } from "../src/lib/design";
import { resolveQrVariant } from "../src/lib/qr-templates";

const root = process.cwd();
const output = path.join(root, "SHINEQR-PREMIUM-KATALOG-V2/05-katalog-kaynaklari/catalog-prototype/public/assets/print-ready");
const publicDir = path.join(root, "public");

const jobs = [
  ["editorial-cream", "the-editorial", "cream"],
  ["velvet-burgundy", "velvet-flow", "burgundy"],
  ["botanical-cream", "botanical", "cream"],
  ["modern-arch-cream", "modern-arch", "cream"],
  ["aurora-lavender", "aurora", "lavender"],
  ["editorial-black", "the-editorial", "black"],
] as const;

const mime = (file: string) => file.endsWith(".webp") ? "image/webp" : "font/ttf";
async function dataUrl(file: string) {
  const bytes = await readFile(file);
  return `data:${mime(file)};base64,${bytes.toString("base64")}`;
}

await mkdir(output, { recursive: true });
const fonts = {
  cormorant: await dataUrl(path.join(publicDir, "fonts/qr/cormorant-garamond-500.ttf")),
  cormorantItalic: await dataUrl(path.join(publicDir, "fonts/qr/cormorant-garamond-500-italic.ttf")),
  cinzel: await dataUrl(path.join(publicDir, "fonts/qr/cinzel-600.ttf")),
  allura: await dataUrl(path.join(publicDir, "fonts/qr/allura-400.ttf")),
  manrope: await dataUrl(path.join(publicDir, "fonts/qr/manrope-400.ttf")),
};

for (const [filename, template, color] of jobs) {
  const variant = resolveQrVariant(template, color);
  const design = { ...defaultDesign, qrTemplateId: template, qrColorVariant: color, names: "Hilal & Oğuz" };
  const front = await dataUrl(path.join(publicDir, variant.front.replace(/^\//, "")));
  const back = await dataUrl(path.join(publicDir, variant.back.replace(/^\//, "")));
  const cards = buildQrCards(design, "Hilal & Oğuz", "2026-09-14", "https://shineqr.com", { front, back, fonts });
  await writeFile(path.join(output, `${filename}.svg`), cards.front, "utf8");
  await sharp(Buffer.from(cards.front)).resize(1170, 1560).png().toFile(path.join(output, `${filename}.png`));
}
