import { mkdir, readFile, writeFile } from "node:fs/promises";
import { defaultDesign } from "../src/lib/design";
import { createMinimalCreamPrintPdf } from "../src/lib/minimal-cream-pdf";

const baseDesign = {
  ...defaultDesign,
  qrTemplateId: "modern-arch" as const,
  qrColorVariant: "cream" as const,
  qrProductId: "portrait-mini-75x100-duplex" as const,
  qrHook: "HER KARE BİR HİKAYE.",
  qrDescription: "Fotoğraf ve videolarını paylaş.",
  qrCta: "TARAT VE PAYLAŞ",
  message: "Bu özel günde yanımızda olduğun için teşekkür ederiz.",
  names: "ELA & DENİZ",
};

await mkdir("output/pdf", { recursive: true });
for (const variant of ["cream", "blush", "sage", "blue", "black"] as const) {
  const design = { ...baseDesign, qrColorVariant: variant };
  const bytes = await createMinimalCreamPrintPdf(design, "ELA & DENİZ", "2026-09-14", `https://shineqr.com/q/minimal-${variant}-kontrol`, {
    frontBackground: await readFile(`public/design-center/templates/modern-arch/${variant}/portrait-mini/minimal-${variant}-portrait-mini-front-base-clean.png`),
    backBackground: await readFile(`public/design-center/templates/modern-arch/${variant}/portrait-mini/minimal-${variant}-portrait-mini-back-base-clean.png`),
    solidLogoSvg: await readFile("public/brand/vector/shineqr-logo-solid-gold.svg", "utf8"),
    montserratLight: await readFile("public/fonts/qr/montserrat-light.ttf"),
    montserrat: await readFile("public/fonts/qr/montserrat-regular.ttf"),
    allura: await readFile("public/fonts/qr/allura-400.ttf"),
  });
  await writeFile(`output/pdf/shineqr-minimal-${variant}-75x100mm-proof.pdf`, bytes);
}
