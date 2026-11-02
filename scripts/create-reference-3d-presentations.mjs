import fs from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";
import sharp from "sharp";

const root = process.cwd();
const collections = {
  "modern-arch": { name: "Minimal", variants: { cream: ["Krem", "01_Krem"], blush: ["Pudra", "02_Pudra"], sage: ["Adaçayı", "03_Adacayi"], blue: ["Mavi", "04_Mavi"], black: ["Siyah", "05_Siyah"] } },
  aurora: { name: "Aurora", variants: { rose: ["Gül", "Aurora_01_Rose"], blue: ["Mavi", "Aurora_02_Mavi"], cream: ["Krem", "Aurora_03_Krem"], green: ["Yeşil", "Aurora_04_Yesil"], lavender: ["Lavanta", "Aurora_05_Lavanta"] } },
};
const scenes = {
  "portrait-mini": { file: "portrait-mini-blank-3d-scene-v1.png", size: [957, 1252], front: [[214, 100], [741, 118], [757, 866], [230, 898]], back: [[813, 140], [1310, 90], [1292, 865], [796, 839]] },
  "landscape-mini": { file: "landscape-mini-blank-3d-scene-v1.png", size: [1252, 957], front: [[53, 326], [760, 260], [842, 727], [115, 838]], back: [[866, 241], [1517, 279], [1483, 747], [843, 686]] },
  "welcome-sign-500x700": { file: "welcome-sign-blank-3d-scene-v1.png", size: [1400, 1960], front: [[168, 97], [869, 142], [934, 1180], [149, 1209]] },
};
const qrSvg = await QRCode.toString("https://shineqr.com/q/design-center-presentation", { type: "svg", margin: 4, errorCorrectionLevel: "M", color: { dark: "#111111", light: "#FFFFFF" } });

const escapeXml = (value) => value.replace(/[<>&"']/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[character]);

function overlay(width, height, face, collectionName) {
  const x = width * .59;
  const ink = "#211b18";
  if (face === "back") return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><g text-anchor="middle" fill="${ink}"><text x="${x}" y="${height * .16}" font-family="Georgia" font-size="${width * .055}" font-weight="700">S✦</text><text x="${x}" y="${height * .205}" font-family="Arial" font-size="${width * .017}" letter-spacing="${width * .007}">SHINEQR</text><text x="${x}" y="${height * .42}" font-family="Georgia" font-style="italic" font-size="${width * .04}"><tspan x="${x}">Bu güzel günün anılarını</tspan><tspan x="${x}" dy="1.2em">bizimle paylaştığınız için</tspan><tspan x="${x}" dy="1.2em">teşekkürler.</tspan></text><path d="M${x-width*.13} ${height*.74}H${x+width*.13}" stroke="${ink}" opacity=".5"/><text x="${x}" y="${height*.79}" font-family="Georgia" font-size="${width*.028}" letter-spacing="${width*.003}">ELA &amp; DENİZ</text><text x="${x}" y="${height*.83}" font-family="Arial" font-size="${width*.013}" letter-spacing="${width*.002}">14 HAZİRAN 2026</text></g></svg>`);
  const qrSize = Math.min(width, height) * .23;
  const embeddedQr = qrSvg.replace("<svg", `<svg x="${x - qrSize/2}" y="${height*.45}" width="${qrSize}" height="${qrSize}"`);
  return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><g text-anchor="middle" fill="${ink}"><text x="${x}" y="${height*.11}" font-family="Georgia" font-size="${width*.055}" font-weight="700">S✦</text><text x="${x}" y="${height*.15}" font-family="Arial" font-size="${width*.017}" letter-spacing="${width*.007}">SHINEQR</text><text x="${x}" y="${height*.255}" font-family="Georgia" font-size="${width*.045}"><tspan x="${x}">Bir kare de</tspan><tspan x="${x}" dy="1.05em">senden olsun.</tspan></text><text x="${x}" y="${height*.37}" font-family="Georgia" font-style="italic" font-size="${width*.021}">Fotoğraf ve videolarını bizimle paylaş.</text></g>${embeddedQr}<g text-anchor="middle" fill="${ink}"><text x="${x}" y="${height*.73}" font-family="Arial" font-size="${width*.015}" font-weight="700" letter-spacing="${width*.0015}">QR KODU OKUT VE ANILARINI YÜKLE</text><path d="M${x-width*.13} ${height*.79}H${x+width*.13}" stroke="${ink}" opacity=".5"/><text x="${x}" y="${height*.84}" font-family="Georgia" font-size="${width*.028}" letter-spacing="${width*.003}">ELA &amp; DENİZ</text><text x="${x}" y="${height*.88}" font-family="Arial" font-size="${width*.013}" letter-spacing="${width*.002}">14 HAZİRAN 2026</text><text x="${x}" y="${height*.94}" font-family="Arial" font-size="${width*.011}" opacity=".7">${escapeXml(collectionName)}</text></g></svg>`);
}

function solveLinear(matrix, values) {
  const rows = matrix.map((row, index) => [...row, values[index]]);
  for (let column = 0; column < values.length; column++) {
    let pivot = column;
    for (let row = column + 1; row < rows.length; row++) if (Math.abs(rows[row][column]) > Math.abs(rows[pivot][column])) pivot = row;
    [rows[column], rows[pivot]] = [rows[pivot], rows[column]];
    const divisor = rows[column][column];
    for (let index = column; index <= values.length; index++) rows[column][index] /= divisor;
    for (let row = 0; row < rows.length; row++) if (row !== column) { const factor = rows[row][column]; for (let index = column; index <= values.length; index++) rows[row][index] -= factor * rows[column][index]; }
  }
  return rows.map((row) => row[values.length]);
}

function destinationToSource(quad, width, height) {
  const source = [[0, 0], [width - 1, 0], [width - 1, height - 1], [0, height - 1]], matrix = [], values = [];
  for (let index = 0; index < 4; index++) { const [x, y] = quad[index], [u, v] = source[index]; matrix.push([x,y,1,0,0,0,-u*x,-u*y]); values.push(u); matrix.push([0,0,0,x,y,1,-v*x,-v*y]); values.push(v); }
  return solveLinear(matrix, values);
}

async function perspectiveLayer(canvas, canvasInfo, sourceBuffer, quad) {
  const { data: source, info } = await sharp(sourceBuffer).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const [a,b,c,d,e,f,g,h] = destinationToSource(quad, info.width, info.height);
  const minX=Math.max(0,Math.floor(Math.min(...quad.map(([x])=>x)))), maxX=Math.min(canvasInfo.width-1,Math.ceil(Math.max(...quad.map(([x])=>x))));
  const minY=Math.max(0,Math.floor(Math.min(...quad.map(([,y])=>y)))), maxY=Math.min(canvasInfo.height-1,Math.ceil(Math.max(...quad.map(([,y])=>y))));
  for (let y=minY;y<=maxY;y++) for (let x=minX;x<=maxX;x++) { const divisor=g*x+h*y+1, sx=(a*x+b*y+c)/divisor, sy=(d*x+e*y+f)/divisor; if(sx<0||sy<0||sx>=info.width||sy>=info.height) continue; const sourceX=Math.min(info.width-1,Math.round(sx)), sourceY=Math.min(info.height-1,Math.round(sy)); const si=(sourceY*info.width+sourceX)*info.channels, ti=(y*canvasInfo.width+x)*canvasInfo.channels; const light=(canvas[ti]*.2126+canvas[ti+1]*.7152+canvas[ti+2]*.0722)/245, shade=Math.max(.82,Math.min(1.08,light)); canvas[ti]=Math.min(255,source[si]*shade*1.025); canvas[ti+1]=Math.min(255,source[si+1]*shade*.995); canvas[ti+2]=Math.min(255,source[si+2]*shade*.955); }
}

for (const [collectionId, collection] of Object.entries(collections)) for (const [variantId, [, fileStem]] of Object.entries(collection.variants)) {
  for (const [format, scene] of Object.entries(scenes)) {
    const sourceDirectory = path.join(root, "public/qr-templates", collectionId);
    const [width, height] = scene.size;
    const fit = format === "landscape-mini" ? "cover" : "cover";
    const frontBackground = await sharp(path.join(sourceDirectory, `${fileStem}_On_Yuz.webp`)).resize(width, height, { fit, position: "centre" }).composite([{ input: overlay(width, height, "front", collection.name) }]).png().toBuffer();
    const backBackground = await sharp(path.join(sourceDirectory, `${fileStem}_Arka_Yuz.webp`)).resize(width, height, { fit, position: "centre" }).composite([{ input: overlay(width, height, "back", collection.name) }]).png().toBuffer();
    const scenePath = path.join(root, "public/design-center/mockups/shared", scene.file);
    const { data: canvas, info } = await sharp(scenePath).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    await perspectiveLayer(canvas, info, frontBackground, scene.front);
    if (scene.back) await perspectiveLayer(canvas, info, backBackground, scene.back);
    const directory = path.join(root, "public/design-center/presentations", collectionId, format);
    await fs.mkdir(directory, { recursive: true });
    await sharp(canvas, { raw: info }).png({ compressionLevel: 9 }).toFile(path.join(directory, `${collectionId}-${variantId}-${format}-presentation.png`));
  }
}

console.log("Created presentation-only 3D galleries for Minimal and Aurora.");
