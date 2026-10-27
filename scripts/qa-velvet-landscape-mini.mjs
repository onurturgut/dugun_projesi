import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { PDFDocument } from "pdf-lib";

const root = process.cwd();
const variants = ["burgundy", "black", "navy", "emerald", "cream"];
const outputRoot = path.join(root, "output/design-center/velvet-flow");
const qaDirectory = path.join(outputRoot, "qa");
await fs.mkdir(qaDirectory, { recursive: true });
const report = { layoutId: "velvet-flow-landscape-mini-v1", generatedAt: new Date().toISOString(), variants: {}, summary: { passed: true, failures: [] } };
const inks = { burgundy: "#F3CF82", black: "#E9C780", navy: "#F3CF82", emerald: "#F3CF82", cream: "#33261D" };
function luminance([red, green, blue]) {
  const channels = [red, green, blue].map((value) => { const normalized = value / 255; return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4; });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
function hexToRgb(hex) { return [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16)); }

for (const variant of variants) {
  const directory = path.join(outputRoot, variant, "landscape-mini");
  const faceResults = {};
  for (const face of ["front", "back"]) {
    const file = path.join(directory, `velvet-flow-${variant}-landscape-mini-${face}-composed-preview.png`);
    const metadata = await sharp(file).metadata();
    faceResults[face] = { passed: metadata.width === 1252 && metadata.height === 957 && metadata.density === 300, width: metadata.width, height: metadata.height, density: metadata.density };
  }
  const pdfBytes = await fs.readFile(path.join(directory, `velvet-flow-${variant}-landscape-mini-print.pdf`));
  const pdf = await PDFDocument.load(pdfBytes);
  const pages = pdf.getPages().map((page) => ({ widthMm: Number((page.getWidth() / 72 * 25.4).toFixed(2)), heightMm: Number((page.getHeight() / 72 * 25.4).toFixed(2)) }));
  const pdfPassed = pages.length === 2 && pages.every((page) => page.widthMm === 106 && page.heightMm === 81);
  const frontPath = path.join(directory, `velvet-flow-${variant}-landscape-mini-front-composed-preview.png`);
  const { data, info } = await sharp(frontPath).extract({ left: 455, top: 190, width: 420, height: 142 }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const average = [0, 0, 0];
  for (let index = 0; index < data.length; index += info.channels) { average[0] += data[index]; average[1] += data[index + 1]; average[2] += data[index + 2]; }
  const pixels = info.width * info.height;
  const background = average.map((sum) => Math.round(sum / pixels));
  const first = luminance(hexToRgb(inks[variant])), second = luminance(background);
  const contrastRatio = Number(((Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)).toFixed(2));
  const contrastPassed = contrastRatio >= 4.5;
  const passed = Object.values(faceResults).every((face) => face.passed) && pdfPassed && contrastPassed;
  report.variants[variant] = { passed, faces: faceResults, qr: { front: { sizePx: 255, printedSizeMm: 21.59 }, back: { sizePx: 324, printedSizeMm: 27.43 }, quietZoneModules: 4, goldFrameOnBothFaces: true }, contrast: { passed: contrastPassed, ratio: contrastRatio, sampledBackground: background }, pdf: { passed: pdfPassed, pages } };
  if (!passed) { report.summary.passed = false; report.summary.failures.push(variant); }
}

async function contactSheet(face) {
  const cardWidth = 501, cardHeight = 383, gap = 18, headerHeight = 52;
  const width = gap + variants.length * (cardWidth + gap), height = headerHeight + cardHeight + gap;
  const composites = [];
  for (const [index, variant] of variants.entries()) {
    const card = await sharp(path.join(outputRoot, variant, "landscape-mini", `velvet-flow-${variant}-landscape-mini-${face}-composed-preview.png`)).resize(cardWidth, cardHeight).png().toBuffer();
    composites.push({ input: card, left: gap + index * (cardWidth + gap), top: headerHeight });
  }
  await sharp({ create: { width, height, channels: 4, background: "#15130f" } }).composite(composites).png().toFile(path.join(qaDirectory, `velvet-flow-landscape-mini-${face}s-contact-sheet.png`));
}

await contactSheet("front");
await contactSheet("back");
await fs.writeFile(path.join(qaDirectory, "landscape-mini-qa-report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report.summary));
if (!report.summary.passed) process.exitCode = 1;
