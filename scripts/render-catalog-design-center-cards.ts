import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { buildQrCards } from "../src/lib/qr-card";
import { defaultDesign, type QrCollectionId } from "../src/lib/design";
import {
  qrTemplates,
  type QrColorVariantId,
  resolveQrVariant,
} from "../src/lib/qr-templates";

const root = process.cwd();
const publicDir = path.join(root, "public");
const output = path.join(root, "tmp", "pdfs", "catalog-v3-cards");

const mime = (file: string) =>
  file.endsWith(".webp") ? "image/webp" : "font/ttf";

async function dataUrl(file: string) {
  const bytes = await readFile(file);
  return `data:${mime(file)};base64,${bytes.toString("base64")}`;
}

await mkdir(output, { recursive: true });

const fonts = {
  cormorant: await dataUrl(
    path.join(publicDir, "fonts/qr/cormorant-garamond-500.ttf"),
  ),
  cormorantItalic: await dataUrl(
    path.join(publicDir, "fonts/qr/cormorant-garamond-500-italic.ttf"),
  ),
  cinzel: await dataUrl(path.join(publicDir, "fonts/qr/cinzel-600.ttf")),
  allura: await dataUrl(path.join(publicDir, "fonts/qr/allura-400.ttf")),
  manrope: await dataUrl(path.join(publicDir, "fonts/qr/manrope-400.ttf")),
};

for (const [templateId, template] of Object.entries(qrTemplates) as Array<
  [QrCollectionId, (typeof qrTemplates)[QrCollectionId]]
>) {
  for (const variantItem of template.variants) {
    const variantId = variantItem.id as QrColorVariantId;
    const variant = resolveQrVariant(templateId, variantId);
    const design = {
      ...defaultDesign,
      qrTemplateId: templateId,
      qrColorVariant: variantId,
      names: "Hilal & Oğuz",
    };
    const front = await dataUrl(
      path.join(publicDir, variant.front.replace(/^\//, "")),
    );
    const back = await dataUrl(
      path.join(publicDir, variant.back.replace(/^\//, "")),
    );
    const cards = buildQrCards(
      design,
      "Hilal & Oğuz",
      "2026-09-14",
      "https://shineqr.com",
      { front, back, fonts },
    );
    const base = `${templateId}-${variantId}`;
    await writeFile(path.join(output, `${base}-front.svg`), cards.front, "utf8");
    await writeFile(path.join(output, `${base}-back.svg`), cards.back, "utf8");
    await sharp(Buffer.from(cards.front))
      .resize(1170, 1560)
      .png()
      .toFile(path.join(output, `${base}-front.png`));
    await sharp(Buffer.from(cards.back))
      .resize(1170, 1560)
      .png()
      .toFile(path.join(output, `${base}-back.png`));
  }
}

console.log(output);
