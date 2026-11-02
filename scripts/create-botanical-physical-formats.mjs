import fs from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";
import sharp from "sharp";

const root = process.cwd();
const presentationsOnly = process.argv.includes("--presentations-only");
const formatsArgument = process.argv.find((argument) => argument.startsWith("--formats="));
const variants = {
  sage: { name: "Adaçayı", ink: "#20291F" },
  cream: { name: "Krem", ink: "#33281F" },
  blush: { name: "Pudra", ink: "#3B2523" },
  blue: { name: "Mavi", ink: "#172A3A" },
  black: { name: "Siyah", ink: "#FFF8EB" },
};
const formats = {
  "portrait-mini": { width: 957, height: 1252, productId: "portrait-mini-75x100-duplex", print: { trimWidthMm: 75, trimHeightMm: 100, bleedMm: 3, safeAreaMm: 5 } },
  "landscape-mini": { width: 1252, height: 957, productId: "landscape-mini-100x75-duplex" },
  "welcome-sign-500x700": { width: 5976, height: 8339, productId: "welcome-sign-500x700-duplex" },
};
const selectedFormats = new Set(formatsArgument ? formatsArgument.slice("--formats=".length).split(",") : Object.keys(formats));

const escapeXml = (value) => value.replace(/[<>&"']/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[character]);
const qrSvg = await QRCode.toString("https://shineqr.com/q/botanical-presentation", { type: "svg", errorCorrectionLevel: "M", margin: 4, color: { dark: "#111111", light: "#FFFFFF" } });

function overlaySvg(format, face, ink) {
  const { width, height } = formats[format];
  const portraitLike = format === "portrait-mini";
  const scale = 1;
  const qrSize = portraitLike ? 230 * scale : format === "landscape-mini" ? 245 : 1260;
  const contentX = portraitLike ? 560 * scale : format === "landscape-mini" ? 760 : 3450;
  const brandY = portraitLike ? 105 * scale : format === "landscape-mini" ? 110 : 900;
  const qrY = portraitLike ? 510 * scale : format === "landscape-mini" ? 370 : 4750;
  const size = (portrait, landscape, welcome) => portraitLike ? portrait * scale : format === "landscape-mini" ? landscape : welcome;
  if (face === "back") {
    const messageY = size(360, 315, 2550);
    const namesY = size(970, 700, 5450);
    return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><g fill="${ink}" text-anchor="middle"><text x="${contentX}" y="${brandY}" font-family="Georgia" font-size="${size(42, 42, 230)}" font-weight="700">S✦</text><text x="${contentX}" y="${brandY + size(34, 34, 180)}" font-family="Arial" font-size="${size(13, 13, 64)}" letter-spacing="${size(5, 5, 25)}">SHINEQR</text><text x="${contentX}" y="${messageY}" font-family="Georgia" font-style="italic" font-size="${size(34, 34, 185)}"><tspan x="${contentX}">Bu güzel günün</tspan><tspan x="${contentX}" dy="1.15em">anılarını bizimle</tspan><tspan x="${contentX}" dy="1.15em">paylaştığınız için teşekkürler.</tspan></text><path d="M${contentX - size(125, 125, 650)} ${namesY - size(55, 55, 310)}H${contentX + size(125, 125, 650)}" stroke="${ink}" opacity=".65"/><text x="${contentX}" y="${namesY}" font-family="Georgia" font-size="${size(24, 24, 145)}" letter-spacing="${size(3, 3, 18)}">ELA &amp; DENİZ</text><text x="${contentX}" y="${namesY + size(38, 38, 230)}" font-family="Arial" font-size="${size(11, 11, 58)}" letter-spacing="${size(2, 2, 14)}">14 HAZİRAN 2026</text></g></svg>`;
  }
  const hookY = size(230, 235, 1900);
  const descriptionY = size(385, 310, 2800);
  const ctaY = size(830, 690, 6400);
  const namesY = size(970, 800, 7000);
  const embeddedQr = qrSvg.replace("<svg", `<svg x="${contentX - qrSize / 2}" y="${qrY}" width="${qrSize}" height="${qrSize}"`);
  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><g fill="${ink}" text-anchor="middle"><text x="${contentX}" y="${brandY}" font-family="Georgia" font-size="${size(42, 42, 230)}" font-weight="700">S✦</text><text x="${contentX}" y="${brandY + size(34, 34, 180)}" font-family="Arial" font-size="${size(13, 13, 64)}" letter-spacing="${size(5, 5, 25)}">SHINEQR</text><text x="${contentX}" y="${hookY}" font-family="Georgia" font-size="${size(34, 34, 205)}"><tspan x="${contentX}">${format === "landscape-mini" ? "Bir kare de" : "Anılarımıza Hoş Geldiniz"}</tspan><tspan x="${contentX}" dy="1.05em">${format === "landscape-mini" ? "senden olsun." : "Ela &amp; Deniz"}</tspan></text><text x="${contentX}" y="${descriptionY}" font-family="Georgia" font-style="italic" font-size="${size(21, 21, 125)}">${format === "landscape-mini" ? "Fotoğraf ve videolarını bizimle paylaş." : "Bu güzel günün her karesini birlikte saklayalım."}</text></g>${embeddedQr}<g fill="${ink}" text-anchor="middle"><text x="${contentX}" y="${ctaY}" font-family="Arial" font-size="${size(13, 13, 66)}" font-weight="700" letter-spacing="${size(1.5, 1.5, 8)}">QR KODU OKUT VE ANILARINI YÜKLE</text><path d="M${contentX - size(125, 125, 650)} ${namesY - size(55, 55, 300)}H${contentX + size(125, 125, 650)}" stroke="${ink}" opacity=".65"/><text x="${contentX}" y="${namesY}" font-family="Georgia" font-size="${size(24, 24, 145)}" letter-spacing="${size(3, 3, 18)}">ELA &amp; DENİZ</text><text x="${contentX}" y="${namesY + size(38, 38, 230)}" font-family="Arial" font-size="${size(11, 11, 58)}" letter-spacing="${size(2, 2, 14)}">14 HAZİRAN 2026</text></g></svg>`;
}

function solveLinear(matrix, values) {
  const rows = matrix.map((row, index) => [...row, values[index]]);
  for (let column = 0; column < values.length; column++) {
    let pivot = column;
    for (let row = column + 1; row < rows.length; row++) if (Math.abs(rows[row][column]) > Math.abs(rows[pivot][column])) pivot = row;
    [rows[column], rows[pivot]] = [rows[pivot], rows[column]];
    const divisor = rows[column][column];
    for (let index = column; index <= values.length; index++) rows[column][index] /= divisor;
    for (let row = 0; row < rows.length; row++) {
      if (row === column) continue;
      const factor = rows[row][column];
      for (let index = column; index <= values.length; index++) rows[row][index] -= factor * rows[column][index];
    }
  }
  return rows.map((row) => row[values.length]);
}

function destinationToSource(quad, width, height) {
  const source = [[0, 0], [width - 1, 0], [width - 1, height - 1], [0, height - 1]];
  const matrix = [], values = [];
  for (let index = 0; index < 4; index++) {
    const [x, y] = quad[index], [u, v] = source[index];
    matrix.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); values.push(u);
    matrix.push([0, 0, 0, x, y, 1, -v * x, -v * y]); values.push(v);
  }
  return solveLinear(matrix, values);
}

async function perspectiveLayer(canvas, canvasInfo, sourceBuffer, quad) {
  const { data: source, info } = await sharp(sourceBuffer).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const transform = destinationToSource(quad, info.width, info.height);
  const [a, b, c, d, e, f, g, h] = transform;
  const minX = Math.max(0, Math.floor(Math.min(...quad.map(([x]) => x))));
  const maxX = Math.min(canvasInfo.width - 1, Math.ceil(Math.max(...quad.map(([x]) => x))));
  const minY = Math.max(0, Math.floor(Math.min(...quad.map(([, y]) => y))));
  const maxY = Math.min(canvasInfo.height - 1, Math.ceil(Math.max(...quad.map(([, y]) => y))));
  for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
    const divisor = g * x + h * y + 1;
    const sourceX = (a * x + b * y + c) / divisor;
    const sourceY = (d * x + e * y + f) / divisor;
    if (sourceX < 0 || sourceY < 0 || sourceX >= info.width || sourceY >= info.height) continue;
    const sx = Math.min(info.width - 1, Math.round(sourceX)), sy = Math.min(info.height - 1, Math.round(sourceY));
    const sourceIndex = (sy * info.width + sx) * info.channels;
    const targetIndex = (y * canvasInfo.width + x) * canvasInfo.channels;
    const sceneLight = (canvas[targetIndex] * .2126 + canvas[targetIndex + 1] * .7152 + canvas[targetIndex + 2] * .0722) / 245;
    const shade = Math.max(.82, Math.min(1.08, sceneLight));
    canvas[targetIndex] = Math.min(255, source[sourceIndex] * shade * 1.025);
    canvas[targetIndex + 1] = Math.min(255, source[sourceIndex + 1] * shade * .995);
    canvas[targetIndex + 2] = Math.min(255, source[sourceIndex + 2] * shade * .955);
  }
}

async function presentation(format, variant, front, back) {
  const directory = path.join(root, `public/design-center/presentations/botanical/${format}`);
  await fs.mkdir(directory, { recursive: true });
  const scenes = {
    "portrait-mini": { file: "portrait-mini-blank-3d-scene-v1.png", front: [[214, 100], [741, 118], [757, 866], [230, 898]], back: [[813, 140], [1310, 90], [1292, 865], [796, 839]] },
    "landscape-mini": { file: "landscape-mini-blank-3d-scene-v1.png", front: [[53, 326], [760, 260], [842, 727], [115, 838]], back: [[866, 241], [1517, 279], [1483, 747], [843, 686]] },
    "welcome-sign-500x700": { file: "welcome-sign-blank-3d-scene-v1.png", front: [[168, 97], [869, 142], [934, 1180], [149, 1209]] },
  };
  const scene = scenes[format];
  const reference = path.join(root, "public/design-center/mockups/shared", scene.file);
  const { data: canvas, info } = await sharp(reference).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  await perspectiveLayer(canvas, info, front, scene.front);
  if (scene.back) await perspectiveLayer(canvas, info, back, scene.back);
  const outputName = format === "portrait-mini" ? `botanical-${variant}-portrait-mini-presentation-v4.png`
    : `botanical-${variant}-${format === "landscape-mini" ? "landscape-mini" : "welcome-sign"}-presentation.png`;
  await sharp(canvas, { raw: info }).png({ compressionLevel: 9 }).toFile(path.join(directory, outputName));
}

for (const [variant, palette] of Object.entries(variants)) {
  for (const format of Object.keys(formats)) {
    if (!selectedFormats.has(format)) continue;
    const sourceDirectory = path.join(root, `public/design-center/templates/botanical/${variant}/portrait-mini`);
    const targetDirectory = path.join(root, `public/design-center/templates/botanical/${variant}/${format}`);
    await fs.mkdir(targetDirectory, { recursive: true });
    const rendered = {};
    for (const face of ["front", "back"]) {
      const source = path.join(sourceDirectory, `botanical-${variant}-portrait-mini-${face}-base-clean.png`);
      const extension = format === "welcome-sign-500x700" ? "jpg" : "png";
      const target = format === "portrait-mini" ? source : path.join(targetDirectory, `botanical-${variant}-${format}-${face}-base-clean.${extension}`);
      if (!presentationsOnly && format !== "portrait-mini") {
        const pipeline = sharp(source).resize(formats[format].width, formats[format].height, { fit: "cover", position: "centre", kernel: sharp.kernel.lanczos3 }).withMetadata({ density: 300 });
        if (extension === "jpg") await pipeline.jpeg({ quality: 92, chromaSubsampling: "4:4:4", mozjpeg: true }).toFile(target);
        else await pipeline.png({ compressionLevel: 9 }).toFile(target);
      }
      rendered[face] = await sharp(target).composite([{ input: Buffer.from(overlaySvg(format, face, palette.ink)) }]).png().toBuffer();
    }
    await presentation(format, variant, rendered.front, rendered.back);
  }
}

for (const [format, dimensions] of Object.entries(formats)) {
  if (!selectedFormats.has(format)) continue;
  const directory = path.join(root, `public/design-center/templates/botanical/${format}`);
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, "layout.json"), `${JSON.stringify({
    schemaVersion: 1,
    layoutId: `botanical-${format}-v1`,
    templateId: "botanical",
    productId: dimensions.productId,
    status: "approved",
    units: "px",
    coordinateSpace: { canvas: { width: dimensions.width, height: dimensions.height, dpi: 300 }, print: dimensions.print ?? (format === "landscape-mini" ? { trimWidthMm: 100, trimHeightMm: 75, bleedMm: 3, safeAreaMm: 5 } : { trimWidthMm: 500, trimHeightMm: 700, bleedMm: 3, safeAreaMm: 5 }) },
    variants: Object.fromEntries(Object.entries(variants).map(([id, item]) => {
      const extension = format === "welcome-sign-500x700" ? "jpg" : "png";
      return [id, { name: item.name, ink: item.ink, frontBase: `/design-center/templates/botanical/${id}/${format}/botanical-${id}-${format}-front-base-clean.${extension}`, backBase: `/design-center/templates/botanical/${id}/${format}/botanical-${id}-${format}-back-base-clean.${extension}` }];
    })),
    contentLimits: { qrHook: 72, qrDescription: 110, qrCta: 48, names: 100, message: 240 },
  }, null, 2)}\n`);
}

console.log(`Created Botanical ${[...selectedFormats].join(", ")} templates and presentations.`);
