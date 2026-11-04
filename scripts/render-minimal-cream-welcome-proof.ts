import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { defaultDesign } from "../src/lib/design";
import { createMinimalCreamWelcomePrintPdf } from "../src/lib/minimal-cream-welcome-pdf";
import { buildMinimalCreamWelcome } from "../src/lib/minimal-cream-welcome-template";

const root = process.cwd();
const output = path.join(
  root,
  "output/design-center/modern-arch/cream/welcome-sign-500x700",
);
const publicOutput = path.join(
  root,
  "public/design-center/presentations/modern-arch/welcome-sign-500x700",
);
await mkdir(output, { recursive: true });
await mkdir(publicOutput, { recursive: true });

const dataUrl = (mime: string, bytes: Uint8Array) =>
  `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`;
const background = await readFile(
  "public/design-center/templates/modern-arch/cream/welcome-sign-500x700/minimal-cream-welcome-sign-front-base-clean.png",
);
const metallicLogo = await readFile(
  "public/brand/vector/shineqr-logo-metallic-gold.svg",
);
const solidLogoSvg = await readFile(
  "public/brand/vector/shineqr-logo-solid-gold.svg",
  "utf8",
);
const montserratLight = await readFile("public/fonts/qr/montserrat-light.ttf");
const montserrat = await readFile("public/fonts/qr/montserrat-regular.ttf");
const allura = await readFile("public/fonts/qr/allura-400.ttf");
const design = {
  ...defaultDesign,
  qrTemplateId: "modern-arch" as const,
  qrColorVariant: "cream" as const,
  qrProductId: "welcome-sign-500x700-duplex" as const,
  qrHook: "HER KARE BİR HİKÂYE.",
  qrDescription: "Fotoğraf ve videolarını paylaş.",
  qrCta: "TARAT VE PAYLAŞ",
  names: "ELA & DENİZ",
};
const assets = {
  background: dataUrl("image/png", background),
  logo: dataUrl("image/svg+xml", metallicLogo),
  fonts: {
    montserratLight: dataUrl("font/ttf", montserratLight),
    montserrat: dataUrl("font/ttf", montserrat),
    allura: dataUrl("font/ttf", allura),
  },
};
const svg = buildMinimalCreamWelcome(
  design,
  "ELA & DENİZ",
  "2026-09-14",
  "https://shineqr.test/q/minimal-cream-welcome",
  assets,
).front;
await writeFile(path.join(output, "minimal-cream-welcome-sign-proof.svg"), svg);
const proofPath = path.join(output, "minimal-cream-welcome-sign-proof.png");
const proof =
  process.env.SHINEQR_USE_EXISTING_PROOF === "1"
    ? await readFile(proofPath)
    : await sharp(Buffer.from(svg))
        .resize(1060, 1484)
        .png({ compressionLevel: 9 })
        .toBuffer();
if (process.env.SHINEQR_USE_EXISTING_PROOF !== "1")
  await writeFile(proofPath, proof);
const pdf = await createMinimalCreamWelcomePrintPdf(
  design,
  "ELA & DENİZ",
  "2026-09-14",
  "https://shineqr.test/q/minimal-cream-welcome",
  { background, solidLogoSvg, montserratLight, montserrat, allura },
);
await writeFile(
  path.join(output, "minimal-cream-welcome-sign-control.pdf"),
  pdf,
);

const scenePath =
  "public/design-center/mockups/shared/welcome-sign-blank-3d-scene-v1.png";
const { data: canvas, info } = await sharp(scenePath)
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const source = await sharp(proof)
  .resize(1400, 1960)
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const quad = [
  [168, 97],
  [869, 142],
  [934, 1180],
  [149, 1209],
] as const;
const solve = (matrix: number[][], vector: number[]) => {
  for (let index = 0; index < vector.length; index++) {
    let pivot = index;
    for (let row = index + 1; row < vector.length; row++)
      if (Math.abs(matrix[row][index]) > Math.abs(matrix[pivot][index]))
        pivot = row;
    [matrix[index], matrix[pivot]] = [matrix[pivot], matrix[index]];
    [vector[index], vector[pivot]] = [vector[pivot], vector[index]];
    const divisor = matrix[index][index];
    for (let column = index; column < vector.length; column++)
      matrix[index][column] /= divisor;
    vector[index] /= divisor;
    for (let row = 0; row < vector.length; row++)
      if (row !== index) {
        const factor = matrix[row][index];
        for (let column = index; column < vector.length; column++)
          matrix[row][column] -= factor * matrix[index][column];
        vector[row] -= factor * vector[index];
      }
  }
  return vector;
};
const sourceCorners = [
  [0, 0],
  [source.info.width - 1, 0],
  [source.info.width - 1, source.info.height - 1],
  [0, source.info.height - 1],
];
const points = quad.map(([x, y], index) => [x, y, ...sourceCorners[index]]);
const matrix: number[][] = [],
  vector: number[] = [];
for (const [x, y, u, v] of points) {
  matrix.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
  vector.push(u);
  matrix.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
  vector.push(v);
}
const [a, b, c, d, e, f, g, h] = solve(matrix, vector);
const minX = Math.max(0, Math.floor(Math.min(...quad.map(([x]) => x))));
const maxX = Math.min(
  info.width - 1,
  Math.ceil(Math.max(...quad.map(([x]) => x))),
);
const minY = Math.max(0, Math.floor(Math.min(...quad.map(([, y]) => y))));
const maxY = Math.min(
  info.height - 1,
  Math.ceil(Math.max(...quad.map(([, y]) => y))),
);
for (let y = minY; y <= maxY; y++)
  for (let x = minX; x <= maxX; x++) {
    const denominator = g * x + h * y + 1;
    const sx = (a * x + b * y + c) / denominator,
      sy = (d * x + e * y + f) / denominator;
    if (sx < 0 || sy < 0 || sx >= source.info.width || sy >= source.info.height)
      continue;
    const sourceIndex =
      (Math.round(sy) * source.info.width + Math.round(sx)) *
      source.info.channels;
    const targetIndex = (y * info.width + x) * info.channels;
    for (let channel = 0; channel < 3; channel++)
      canvas[targetIndex + channel] = source.data[sourceIndex + channel];
  }
const presentation = await sharp(canvas, { raw: info })
  .png({ compressionLevel: 9 })
  .toBuffer();
await writeFile(
  path.join(
    publicOutput,
    "modern-arch-cream-welcome-sign-500x700-uploaded-v1-presentation.png",
  ),
  presentation,
);
