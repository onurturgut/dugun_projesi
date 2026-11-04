import { mkdir, readFile, writeFile } from "node:fs/promises";
import { defaultDesign } from "../src/lib/design";
import { createMinimalCreamLandscapePrintPdf } from "../src/lib/minimal-cream-landscape-pdf";

const baseDesign = {
  ...defaultDesign,
  qrTemplateId: "modern-arch" as const,
  qrProductId: "landscape-mini-100x75-duplex" as const,
  qrHook: "HER KARE BİR HİKÂYE.",
  qrDescription: "Fotoğraf ve videolarını paylaş.",
  qrCta: "TARAT VE PAYLAŞ",
  message: "Bu özel günde yanımızda olduğun için teşekkür ederiz.",
};

await mkdir("output/pdf", { recursive: true });
for (const variant of ["cream", "blush", "sage", "blue", "black"] as const) {
  const design = { ...baseDesign, qrColorVariant: variant };
  const bytes = await createMinimalCreamLandscapePrintPdf(design, "ELA & DENİZ", "2026-09-14", `https://shineqr.com/q/minimal-${variant}-landscape-kontrol`, {
    frontBackground: await readFile(`public/design-center/templates/modern-arch/${variant}/landscape-mini/minimal-${variant}-landscape-mini-front-base-clean.png`),
    backBackground: await readFile(`public/design-center/templates/modern-arch/${variant}/landscape-mini/minimal-${variant}-landscape-mini-back-base-clean.png`),
    solidLogoSvg: await readFile("public/brand/vector/shineqr-logo-solid-gold.svg", "utf8"),
    montserratLight: await readFile("public/fonts/qr/montserrat-light.ttf"),
    montserrat: await readFile("public/fonts/qr/montserrat-regular.ttf"),
    allura: await readFile("public/fonts/qr/allura-400.ttf"),
  });
  await writeFile(`output/pdf/shineqr-minimal-${variant}-landscape-100x75mm-proof.pdf`, bytes);
}
