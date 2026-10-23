import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const variants = ["burgundy", "black", "navy", "emerald", "cream"];
const layout = JSON.parse(await fs.readFile(path.join(root, "public/design-center/templates/velvet-flow/portrait-mini/layout.json"), "utf8"));
const outputRoot = path.join(root, "output/design-center/velvet-flow");
const qaDirectory = path.join(outputRoot, "qa");
await fs.mkdir(qaDirectory, { recursive: true });

function sha256(buffer) { return crypto.createHash("sha256").update(buffer).digest("hex"); }
function relativeLuminance(red, green, blue) {
  const channels = [red, green, blue].map((value) => {
    const normalized = value / 255;
    return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
function contrastRatio(first, second) {
  const lighter = Math.max(first, second), darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}
function hexToRgb(hex) { return [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16)); }

async function averageBackground(publicPath, bounds) {
  const file = path.join(root, "public", publicPath.replace(/^\//, ""));
  const { data, info } = await sharp(file).extract({ left: bounds.x, top: bounds.y, width: bounds.width, height: bounds.height }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const sums = [0, 0, 0];
  for (let index = 0; index < data.length; index += info.channels) for (let channel = 0; channel < 3; channel++) sums[channel] += data[index + channel];
  const pixels = info.width * info.height;
  return sums.map((sum) => Math.round(sum / pixels));
}

const report = { layoutId: layout.layoutId, generatedAt: new Date().toISOString(), variants: {}, summary: { passed: true, failures: [] } };
for (const variantId of variants) {
  const variant = layout.variants[variantId];
  const directory = path.join(outputRoot, variantId, "portrait-mini");
  const frontPath = path.join(directory, `velvet-flow-${variantId}-portrait-mini-front-composed-preview.png`);
  const backPath = path.join(directory, `velvet-flow-${variantId}-portrait-mini-back-composed-preview.png`);
  const front = await fs.readFile(frontPath), back = await fs.readFile(backPath);
  const frontMetadata = await sharp(front).metadata(), backMetadata = await sharp(back).metadata();
  const metadataPassed = [frontMetadata, backMetadata].every((metadata) => metadata.width === 957 && metadata.height === 1252 && metadata.density === 300);
  const facesDiffer = sha256(front) !== sha256(back);
  const qrBounds = layout.front.layers.find((layer) => layer.id === "qr").bounds;
  const { data: qrPixels, info: qrInfo } = await sharp(front).extract({ left: qrBounds.x, top: qrBounds.y, width: qrBounds.width, height: qrBounds.height }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let darkPixels = 0, lightPixels = 0;
  for (let index = 0; index < qrPixels.length; index += qrInfo.channels) {
    const luminance = (qrPixels[index] + qrPixels[index + 1] + qrPixels[index + 2]) / 3;
    if (luminance < 40) darkPixels++;
    if (luminance > 245) lightPixels++;
  }
  const qrPassed = darkPixels > 1000 && lightPixels > 1000;
  const inkLuminance = relativeLuminance(...hexToRgb(variant.ink));
  const contrast = {};
  for (const face of ["front", "back"]) {
    const backgroundPath = variant[face === "front" ? "frontBase" : "backBase"];
    for (const layer of layout[face].layers.filter((item) => item.type === "text" || item.color === "variant.ink")) {
      const rgb = await averageBackground(backgroundPath, layer.bounds);
      contrast[`${face}.${layer.id}`] = { backgroundRgb: rgb, ratio: Number(contrastRatio(inkLuminance, relativeLuminance(...rgb)).toFixed(2)) };
    }
  }
  const minimumContrast = Math.min(...Object.values(contrast).map((item) => item.ratio));
  const contrastPassed = minimumContrast >= 3;
  const passed = metadataPassed && facesDiffer && qrPassed && contrastPassed;
  report.variants[variantId] = {
    passed,
    metadataPassed,
    facesDiffer,
    qr: { passed: qrPassed, widthPx: qrBounds.width, heightPx: qrBounds.height, printedSizeMm: Number((qrBounds.width / 300 * 25.4).toFixed(2)), quietZoneModules: 4, darkPixels, lightPixels },
    contrast: { passed: contrastPassed, minimumRatio: minimumContrast, layers: contrast },
  };
  if (!passed) { report.summary.passed = false; report.summary.failures.push(variantId); }
}

async function contactSheet(face) {
  const cardWidth = 383, cardHeight = 501, gap = 18, headerHeight = 54;
  const width = gap + variants.length * (cardWidth + gap), height = headerHeight + cardHeight + gap;
  const composites = [];
  for (const [index, variantId] of variants.entries()) {
    const card = await sharp(path.join(outputRoot, variantId, "portrait-mini", `velvet-flow-${variantId}-portrait-mini-${face}-composed-preview.png`)).resize(cardWidth, cardHeight).png().toBuffer();
    const x = gap + index * (cardWidth + gap);
    composites.push({ input: card, left: x, top: headerHeight });
    composites.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${cardWidth}" height="${headerHeight}"><text x="${cardWidth / 2}" y="34" text-anchor="middle" fill="#f4ead5" font-family="Arial" font-size="20" font-weight="700">${variantId.toLocaleUpperCase("tr-TR")} · ${face === "front" ? "ÖN" : "ARKA"}</text></svg>`), left: x, top: 0 });
  }
  await sharp({ create: { width, height, channels: 4, background: "#15130f" } }).composite(composites).png().toFile(path.join(qaDirectory, `velvet-flow-portrait-mini-${face}s-contact-sheet.png`));
}

await contactSheet("front");
await contactSheet("back");
await fs.writeFile(path.join(qaDirectory, "qa-report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report.summary));
if (!report.summary.passed) process.exitCode = 1;
