import QRCode from "qrcode";
import {
  cardPalette,
  designNames,
  designMonogram,
  type WeddingDesign,
} from "./design";

export const escapeXml = (value: string) =>
  value.replace(
    /[<>&"']/g,
    (char) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[char]!,
  );
function lines(value: string, width: number) {
  const result: string[] = [];
  for (const word of value.trim().split(/\s+/u)) {
    // Long unbroken names must stay inside the printable area too.
    const pieces = Array.from(word).reduce<string[]>((all, char, i) => {
      if (i % width === 0) all.push("");
      all[all.length - 1] += char;
      return all;
    }, []);
    for (const piece of pieces) {
      const last = result.length - 1;
      if (last >= 0 && Array.from(result[last] + " " + piece).length <= width)
        result[last] += ` ${piece}`;
      else result.push(piece);
    }
  }
  return result;
}
function textBlock(
  text: string,
  y: number,
  size: number,
  width: number,
  color: string,
  italic = false,
) {
  return `<text x="315" y="${y}" text-anchor="middle" fill="${color}" font-family="Georgia, serif" font-size="${size}"${italic ? ' font-style="italic"' : ""}>${lines(
    text,
    width,
  )
    .map(
      (line, i) =>
        `<tspan x="315" dy="${i ? size * 1.4 : 0}">${escapeXml(line)}</tspan>`,
    )
    .join("")}</text>`;
}
function flower(x: number, y: number, scale: number, color: string) {
  return `<g transform="translate(${x} ${y}) scale(${scale})" stroke="${color}" fill="none" stroke-width="1.1">${Array.from({ length: 8 }, (_, i) => `<ellipse cx="0" cy="-14" rx="10" ry="20" transform="rotate(${i * 45})" fill="${color}" fill-opacity=".06"/>`).join("")}<circle r="8"/><circle r="4"/></g>`;
}
function decoration(design: WeddingDesign, color: string) {
  if (design.cardTemplate === "minimal")
    return `<path d="M265 175H365M265 700H365" stroke="${color}"/>`;
  if (design.cardTemplate === "ribbon")
    return `<g stroke="${color}" fill="none"><path d="M30 176Q210 158 315 181Q440 155 600 176M30 189Q210 171 315 190Q440 168 600 189"/><path d="M315 182C210 75 176 183 315 182C425 78 460 188 315 182ZM315 184Q262 240 235 267L264 250L273 269Q289 215 315 184M315 184Q356 240 395 267L366 250L357 269Q340 214 315 184" stroke-width="2"/><circle cx="315" cy="182" r="7" fill="${color}"/></g>`;
  if (design.cardTemplate === "couple")
    return `<g stroke="${color}" stroke-width="2" fill="none" stroke-linecap="round"><path d="M278 210Q262 166 289 155Q314 151 315 185Q314 203 300 213M322 211Q312 174 337 163Q362 161 359 191Q355 208 342 214M279 214Q236 240 229 298Q275 309 317 294Q291 254 300 215M324 216Q303 257 319 298L381 298Q384 244 344 216M280 251Q308 273 336 250"/><path d="M270 169Q235 203 253 261M360 191Q372 215 370 239" opacity=".5"/></g>`;
  if (design.cardTemplate === "night")
    return `<g fill="${color}">${Array.from({ length: 32 }, (_, i) => {
      const x = 62 + ((i * 137) % 506),
        y = 74 + ((i * 53) % 180);
      return `<path d="M${x} ${y - 4}l1 3 3 1-3 1-1 3-1-3-3-1 3-1Z" opacity="${0.25 + (i % 4) * 0.2}"/>`;
    }).join(
      "",
    )}<path d="M341 135A33 33 0 1 1 309 91A27 27 0 0 0 341 135Z"/></g>`;
  return `<g stroke="${color}" fill="none" opacity=".85"><path d="M56 350Q120 230 68 108M60 250Q158 165 180 86M574 720Q510 620 570 506M560 665Q477 721 440 792"/>${[125, 180, 230, 275].map((y, i) => `<path d="M${76 + i * 2} ${y}q-38 -25-25-42q32 10 25 42q48-25 42-42q-28 0-42 42"/>`).join("")}</g>${flower(80, 118, 1.3, color)}${flower(128, 173, 0.8, color)}${flower(70, 247, 1, color)}${flower(551, 731, 1.4, color)}${flower(508, 777, 0.8, color)}${flower(566, 648, 0.9, color)}`;
}
export function buildQrCards(
  design: WeddingDesign,
  title: string,
  date: string | null,
  url: string,
) {
  const palette = cardPalette(design);
  const { base, accent, ink } = palette;
  const names = designNames(design, title);
  const nameSize = names.length > 50 ? 29 : 37;
  const nameLines = lines(names, 24).length;
  const dateText = date
    ? new Date(`${date.slice(0, 10)}T12:00:00+03:00`).toLocaleDateString(
        "tr-TR",
        {
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: "Europe/Istanbul",
        },
      )
    : "";
  const open = `<svg xmlns="http://www.w3.org/2000/svg" width="105mm" height="148mm" viewBox="0 0 630 888" role="img" aria-label="${escapeXml(names)} QR davet kartı"><defs><radialGradient id="glow" cx="50%" cy="0%" r="100%"><stop stop-color="#fff" stop-opacity=".12"/><stop offset="1" stop-color="#000" stop-opacity=".12"/></radialGradient></defs><rect width="630" height="888" fill="${base}"/><rect width="630" height="888" fill="url(#glow)"/><rect x="27" y="27" width="576" height="834" rx="2" fill="none" stroke="${accent}" stroke-opacity=".6"/><rect x="35" y="35" width="560" height="818" fill="none" stroke="${accent}" stroke-opacity=".2"/>`;
  const footer = `<text x="315" y="828" text-anchor="middle" font-family="Georgia, serif" font-size="11" letter-spacing="4" fill="${ink}">SHINEQR</text></svg>`;
  const front =
    open +
    decoration(design, accent) +
    `<text x="315" y="93" text-anchor="middle" font-family="Georgia, serif" font-size="11" letter-spacing="3" fill="${ink}">BİRLİKTE, BİR ÖMÜR</text>` +
    textBlock(designMonogram(design, title), 354, 54, 12, ink) +
    `<path d="M270 392H360" stroke="${accent}"/>` +
    textBlock(names, 445, nameSize, 24, ink) +
    textBlock(dateText, 465 + nameLines * nameSize * 1.4, 15, 36, ink) +
    textBlock(
      "En güzel anılarımızda sizin de iziniz olsun.",
      695,
      19,
      32,
      ink,
      true,
    ) +
    footer;
  const qr = QRCode.create(url, { errorCorrectionLevel: "M" });
  const quiet = 4,
    size = qr.modules.size,
    total = size + quiet * 2;
  let modules = "";
  for (let row = 0; row < size; row++)
    for (let col = 0; col < size; col++)
      if (qr.modules.get(row, col))
        modules += `M${col + quiet} ${row + quiet}h1v1h-1z`;
  const back =
    open +
    textBlock("Birlikte biriktirdik.", 116, 30, 28, ink, true) +
    textBlock(design.message, 174, 18, 38, ink) +
    `<svg x="165" y="365" width="300" height="300" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges"><rect width="${total}" height="${total}" fill="#fff"/><path d="${modules}" fill="#111"/></svg>` +
    textBlock("Fotoğraf, video ve dileklerinizi paylaşın.", 711, 17, 38, ink) +
    textBlock("Kameranızı QR koda tutmanız yeterli.", 768, 14, 42, ink) +
    footer;
  return { front, back };
}
export function svgDataUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
