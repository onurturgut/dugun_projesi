import fs from "node:fs/promises";
import path from "node:path";
import opentype from "opentype.js";
import QRCode from "qrcode";
import sharp from "sharp";

const root = process.cwd();
const templateId = process.argv.find((argument) => argument.startsWith("--template="))?.split("=")[1] ?? "velvet-flow";
const formatId = process.argv.find((argument) => argument.startsWith("--format="))?.split("=")[1] ?? "portrait-mini";
const layoutPath = path.join(root, `public/design-center/templates/${templateId}/${formatId}/layout.json`);
const layout = JSON.parse(await fs.readFile(layoutPath, "utf8"));
const variantId = process.argv.find((argument) => argument.startsWith("--variant="))?.split("=")[1] ?? "burgundy";
const variant = layout.variants[variantId];
if (!variant) throw new Error(`Bilinmeyen ${templateId} renk varyantı: ${variantId}`);

const outputDirectory = path.join(root, "output/design-center", templateId, variantId, formatId);
await fs.mkdir(outputDirectory, { recursive: true });

const values = {
  welcomeTitle: "HOŞ GELDİNİZ",
  qrHook: ["landscape-mini", "welcome-sign-500x700"].includes(formatId) ? "EN GÜZEL ANILARI" : "Bu günün bir karesi de senden olsun.",
  qrDescription: ["landscape-mini", "welcome-sign-500x700"].includes(formatId) ? "sadece biz görmeyelim." : "Fotoğraf ve videolarını bizimle paylaş.",
  qrBody: "Fotoğraf ve videolarını bizimle paylaş.",
  qrCta: ["landscape-mini", "welcome-sign-500x700"].includes(formatId) ? "QR KODU OKUT VE YÜKLE" : "QR kodu okut ve anılarını yükle.",
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
  display: "public/fonts/qr/cormorant-garamond-500.ttf",
  welcomeDisplay: "public/fonts/qr/cinzel-600.ttf",
  script: "public/fonts/qr/allura-400.ttf",
  smallCaps: "public/fonts/qr/cinzel-600.ttf",
  body: "public/fonts/qr/cormorant-garamond-500.ttf",
  welcomeBody: "public/fonts/qr/manrope-400.ttf",
};
const loadedFonts = new Map();
async function loadFont(fontId) {
  if (loadedFonts.has(fontId)) return loadedFonts.get(fontId);
  const buffer = await fs.readFile(path.join(root, fontFiles[fontId]));
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  const font = opentype.parse(arrayBuffer);
  loadedFonts.set(fontId, font);
  return font;
}

function textPath(font, value, x, baseline, fontSize, letterSpacing) {
  if (!letterSpacing) {
    const path = font.getPath(value, x, baseline, fontSize, { kerning: true });
    const box = path.getBoundingBox();
    return { data: path.toPathData(2), width: Math.max(0, box.x2 - box.x1) };
  }
  let cursor = x;
  const paths = [];
  for (const character of Array.from(value)) {
    paths.push(font.getPath(character, cursor, baseline, fontSize).toPathData(2));
    cursor += font.getAdvanceWidth(character, fontSize) + letterSpacing;
  }
  return { data: paths.join(" "), width: Math.max(0, cursor - x - letterSpacing) };
}

async function renderText(layer) {
  const bounds = layer.bounds;
  const value = layer.uppercase ? values[layer.binding].toLocaleUpperCase("tr-TR") : values[layer.binding];
  const font = await loadFont(layer.font);
  const words = String(value).trim().split(/\s+/u);
  const lines = [];
  for (const word of words) {
    const candidate = lines.length ? `${lines.at(-1)} ${word}` : word;
    const width = textPath(font, candidate, 0, 0, layer.fontSize, layer.letterSpacing ?? 0).width;
    if (lines.length && width > bounds.width) lines.push(word);
    else if (lines.length) lines[lines.length - 1] = candidate;
    else lines.push(word);
  }
  if (lines.length > layer.maxLines) {
    lines.length = layer.maxLines;
    lines[layer.maxLines - 1] = `${lines[layer.maxLines - 1].replace(/[.…]+$/u, "")}…`;
  }
  const lineHeight = layer.fontSize * (layer.lineHeight ?? 1.1);
  const blockHeight = lines.length * lineHeight;
  if (blockHeight > bounds.height) throw new Error(`${layer.id} metni ayrılan alana sığmadı.`);
  const ascender = font.ascender / font.unitsPerEm * layer.fontSize;
  const firstBaseline = (bounds.height - blockHeight) / 2 + ascender;
  const paths = lines.map((line, index) => {
    const measured = textPath(font, line, 0, 0, layer.fontSize, layer.letterSpacing ?? 0);
    if (measured.width > bounds.width) throw new Error(`${layer.id} satırı ayrılan genişliğe sığmadı.`);
    const x = (bounds.width - measured.width) / 2;
    const data = textPath(font, line, x, firstBaseline + index * lineHeight, layer.fontSize, layer.letterSpacing ?? 0).data;
    return `<path d="${data}" fill="${variant.ink}"/>`;
  });
  return `<g transform="translate(${bounds.x} ${bounds.y})">${paths.join("")}</g>`;
}

async function renderLayer(layer, face) {
  const bounds = layer.bounds;
  if (layer.type === "text") return await renderText(layer);
  if (layer.type === "qr-frame") {
    return `<rect x="${bounds.x}" y="${bounds.y}" width="${bounds.width}" height="${bounds.height}" rx="${layer.radius ?? 18}" fill="${layer.fill ?? "#FFF9E8"}" stroke="${layer.stroke ?? variant.ink}" stroke-width="${layer.strokeWidth ?? 4}"/>`;
  }
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
  const faceLayers = layout[face].layers;
  const backgroundLayer = faceLayers.find((layer) => layer.type === "variant-image");
  const foregroundLayers = [];
  for (const layer of faceLayers.filter((item) => item !== backgroundLayer)) foregroundLayers.push(await renderLayer(layer, face));
  const { width, height } = layout.coordinateSpace.canvas;
  const basePublicPath = variant[face === "front" ? "frontBase" : "backBase"];
  const baseDiskPath = path.join(root, "public", basePublicPath.replace(/^\//, ""));
  const overlaySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${foregroundLayers.join("")}</svg>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${templateId} ${variant.name} ${formatId} ${face === "front" ? "ön" : "arka"} yüz önizlemesi"><image href="${basePublicPath}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice"/>${foregroundLayers.join("")}</svg>`;
  const baseName = `${templateId}-${variantId}-${formatId}-${face}-composed-preview`;
  await fs.writeFile(path.join(outputDirectory, `${baseName}.svg`), svg);
  await sharp(baseDiskPath)
    .resize(width, height, { fit: "fill" })
    .composite([{ input: Buffer.from(overlaySvg), top: 0, left: 0 }])
    .png({ compressionLevel: 9 })
    .withMetadata({ density: layout.coordinateSpace.canvas.dpi })
    .toFile(path.join(outputDirectory, `${baseName}.png`));
  return baseName;
}

const requestedFace = process.argv.find((argument) => argument.startsWith("--face="))?.split("=")[1];
const faces = requestedFace ? [requestedFace] : ["front", "back"];
const rendered = [];
for (const face of faces) {
  if (!layout[face]) throw new Error(`${formatId} düzeninde ${face} yüzü bulunamadı.`);
  rendered.push(await renderFace(face));
}
await fs.writeFile(path.join(outputDirectory, "preview-manifest.json"), `${JSON.stringify({ layoutId: layout.layoutId, status: "preview-only", variant: variantId, usesProductionQr: false, qrTarget: values.permanentEventUrl, files: rendered.flatMap((name) => [`${name}.svg`, `${name}.png`]) }, null, 2)}\n`);
console.log(`Rendered ${rendered.length} ${templateId} ${variantId} ${formatId} face(s) to ${path.relative(root, outputDirectory)}`);
