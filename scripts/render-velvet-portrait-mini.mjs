import fs from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";
import sharp from "sharp";

const root = process.cwd();
const layoutPath = path.join(root, "public/design-center/templates/velvet-flow/portrait-mini/layout.json");
const layout = JSON.parse(await fs.readFile(layoutPath, "utf8"));
const variantId = process.argv.find((argument) => argument.startsWith("--variant="))?.split("=")[1] ?? "burgundy";
const variant = layout.variants[variantId];
if (!variant) throw new Error(`Bilinmeyen Velvet Flow renk varyantı: ${variantId}`);

const outputDirectory = path.join(root, "output/design-center/velvet-flow", variantId, "portrait-mini");
await fs.mkdir(outputDirectory, { recursive: true });

const values = {
  qrHook: "Bu günün bir karesi de senden olsun.",
  qrDescription: "Fotoğraf ve videolarını bizimle paylaş.",
  qrCta: "QR kodu okut ve anılarını yükle.",
  names: "HİLAL & OĞUZ",
  eventDate: "14 EYLÜL 2026",
  message: "Bu özel günümüzü bizimle paylaştığınız için teşekkür ederiz.",
  permanentEventUrl: "https://example.com/q/67e55044-10b1-426f-9247-bb680e5fe0c8",
};

const mimeByExtension = { ".png": "image/png", ".svg": "image/svg+xml" };
const fileCache = new Map();
async function dataUrl(publicPath, color) {
  const key = `${publicPath}:${color ?? ""}`;
  if (fileCache.has(key)) return fileCache.get(key);
  const diskPath = path.join(root, "public", publicPath.replace(/^\//, ""));
  const extension = path.extname(diskPath).toLowerCase();
  let content = await fs.readFile(diskPath);
  if (extension === ".svg" && color) content = Buffer.from(content.toString("utf8").replaceAll("currentColor", color));
  if (extension === ".png" && color) {
    const { data, info } = await sharp(content).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const [red, green, blue] = [1, 3, 5].map((offset) => Number.parseInt(color.slice(offset, offset + 2), 16));
    for (let index = 0; index < data.length; index += 4) { data[index] = red; data[index + 1] = green; data[index + 2] = blue; }
    content = await sharp(data, { raw: info }).png().toBuffer();
  }
  const result = `data:${mimeByExtension[extension]};base64,${content.toString("base64")}`;
  fileCache.set(key, result);
  return result;
}

const fontFiles = {
  display: "public/fonts/qr/cinzel-600.ttf",
  serif: "public/fonts/qr/cormorant-garamond-500.ttf",
  sans: "public/fonts/qr/manrope-400.ttf",
};
function escapeXml(value) {
  return String(value).replace(/[<>&"']/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[character]);
}

function wrap(value, maxCharacters, maxLines) {
  const words = String(value).trim().split(/\s+/u);
  const lines = [];
  for (const word of words) {
    const previous = lines.at(-1);
    if (previous && Array.from(`${previous} ${word}`).length <= maxCharacters) lines[lines.length - 1] = `${previous} ${word}`;
    else lines.push(word);
  }
  if (lines.length > maxLines) {
    const result = lines.slice(0, maxLines);
    result[maxLines - 1] = `${result[maxLines - 1].replace(/[.…]+$/u, "")}…`;
    return result;
  }
  return lines;
}

async function renderText(layer) {
  const bounds = layer.bounds;
  const value = layer.uppercase ? values[layer.binding].toLocaleUpperCase("tr-TR") : values[layer.binding];
  const averageCharacterWidth = layer.font === "display" ? 0.61 : layer.font === "sans" ? 0.57 : 0.48;
  const maxCharacters = Math.max(4, Math.floor(bounds.width / (layer.fontSize * averageCharacterWidth)));
  const lines = wrap(value, maxCharacters, layer.maxLines);
  const markup = `<span foreground="${variant.ink}" letter_spacing="${Math.round((layer.letterSpacing ?? 0) * 1024)}">${lines.map(escapeXml).join("\n")}</span>`;
  const rendered = await sharp({ text: {
    text: markup,
    font: `${layout.typography[layer.font].family} ${layer.fontSize}`,
    fontfile: path.join(root, fontFiles[layer.font]),
    width: bounds.width,
    align: "centre",
    rgba: true,
    dpi: 72,
    wrap: "none",
  } }).png().toBuffer();
  const metadata = await sharp(rendered).metadata();
  if (!metadata.width || !metadata.height || metadata.height > bounds.height) throw new Error(`${layer.id} metni ayrılan alana sığmadı.`);
  const source = `data:image/png;base64,${rendered.toString("base64")}`;
  const x = bounds.x + (bounds.width - metadata.width) / 2;
  const y = bounds.y + (bounds.height - metadata.height) / 2;
  return `<image href="${source}" x="${x}" y="${y}" width="${metadata.width}" height="${metadata.height}"/>`;
}

async function renderLayer(layer, face) {
  const bounds = layer.bounds;
  if (layer.type === "text") return await renderText(layer);
  if (layer.type === "qr") {
    const qrSvg = await QRCode.toString(values[layer.binding], { type: "svg", errorCorrectionLevel: layer.errorCorrection, margin: layer.quietZoneModules, width: bounds.width, color: { dark: layer.foreground, light: layer.background } });
    const source = `data:image/svg+xml;base64,${Buffer.from(qrSvg).toString("base64")}`;
    return `<image href="${source}" x="${bounds.x}" y="${bounds.y}" width="${bounds.width}" height="${bounds.height}" shape-rendering="crispEdges"/>`;
  }
  const publicPath = layer.type === "variant-image" ? variant[face === "front" ? "frontBase" : "backBase"] : layout.assets[layer.asset];
  const color = layer.asset === "logo" ? variant.logoColor : layer.color ? variant.ink : undefined;
  const source = await dataUrl(publicPath, color);
  const preserve = layer.fit === "contain" ? "xMidYMid meet" : "xMidYMid slice";
  return `<image href="${source}" x="${bounds.x}" y="${bounds.y}" width="${bounds.width}" height="${bounds.height}" preserveAspectRatio="${preserve}"/>`;
}

async function renderFace(face) {
  const layers = [];
  for (const layer of layout[face].layers) layers.push(await renderLayer(layer, face));
  const { width, height } = layout.coordinateSpace.canvas;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Velvet Flow ${variant.name} dikey mini ${face === "front" ? "ön" : "arka"} yüz önizlemesi">${layers.join("")}</svg>`;
  const baseName = `velvet-flow-${variantId}-portrait-mini-${face}-composed-preview`;
  await fs.writeFile(path.join(outputDirectory, `${baseName}.svg`), svg);
  await sharp(Buffer.from(svg), { density: 72 })
    .resize(width, height, { fit: "fill" })
    .png({ compressionLevel: 9 })
    .withMetadata({ density: layout.coordinateSpace.canvas.dpi })
    .toFile(path.join(outputDirectory, `${baseName}.png`));
  return baseName;
}

const rendered = [await renderFace("front"), await renderFace("back")];
await fs.writeFile(path.join(outputDirectory, "preview-manifest.json"), `${JSON.stringify({ layoutId: layout.layoutId, status: "preview-only", variant: variantId, usesProductionQr: false, qrTarget: values.permanentEventUrl, files: rendered.flatMap((name) => [`${name}.svg`, `${name}.png`]) }, null, 2)}\n`);
console.log(`Rendered ${rendered.length} Velvet Flow ${variantId} portrait-mini faces to ${path.relative(root, outputDirectory)}`);
