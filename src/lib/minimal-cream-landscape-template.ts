import QRCode from "qrcode";
import { designNames, type WeddingDesign } from "./design";
import { minimalCreamDateLabel, type MinimalCreamAssets } from "./minimal-cream-template";

export const minimalCreamLandscapeMaster = {
  id: "minimal-cream-landscape-v1",
  version: 1,
  media: { widthMm: 106, heightMm: 81 },
  trim: { xMm: 3, yMm: 3, widthMm: 100, heightMm: 75 },
  safe: { xMm: 8, yMm: 8, widthMm: 90, heightMm: 65 },
  assets: {
    front: "/design-center/templates/modern-arch/cream/landscape-mini/minimal-cream-landscape-mini-front-base-clean.png",
    back: "/design-center/templates/modern-arch/cream/landscape-mini/minimal-cream-landscape-mini-back-base-clean.png",
    logo: "/brand/vector/shineqr-logo-metallic-gold.svg",
    foilLogo: "/brand/vector/shineqr-logo-solid-gold.svg",
  },
  elements: {
    frontLogo: { xMm: 22, yMm: 7, widthMm: 18, heightMm: 12 },
    title: { xMm: 8, yMm: 23, widthMm: 46, fontSizePt: 17 },
    frontScript: { xMm: 8, yMm: 37, widthMm: 46, fontSizePt: 19 },
    description: { xMm: 8, yMm: 46, widthMm: 46, fontSizePt: 7.2 },
    qrFrame: { xMm: 66, yMm: 20, widthMm: 30, heightMm: 30, radiusMm: 2 },
    qr: { xMm: 67.4, yMm: 21.4, widthMm: 27.2, heightMm: 27.2 },
    cta: { xMm: 62, yMm: 52, widthMm: 38, fontSizePt: 7.2 },
    names: { xMm: 8, yMm: 60, widthMm: 46, fontSizePt: 9 },
    date: { xMm: 8, yMm: 65, widthMm: 46, fontSizePt: 6.2 },
    backLogo: { xMm: 44, yMm: 7, widthMm: 18, heightMm: 12 },
    backTitle: { xMm: 25, yMm: 23, widthMm: 56, fontSizePt: 17 },
    backScript: { xMm: 25, yMm: 37, widthMm: 56, fontSizePt: 19 },
    backDescription: { xMm: 23, yMm: 46, widthMm: 60, fontSizePt: 7.2 },
    backDivider: { xMm: 40, yMm: 59, widthMm: 26 },
    backNames: { xMm: 25, yMm: 63, widthMm: 56, fontSizePt: 9 },
    backDate: { xMm: 25, yMm: 68, widthMm: 56, fontSizePt: 6.2 },
  },
} as const;

const xml = (value: string) => value.replace(/[<>&"']/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[char]!);
const mm = (pt: number) => pt * 0.352778;

function fontDefinitions(fonts?: MinimalCreamAssets["fonts"]) {
  const values = [["MinimalMontserratLight", fonts?.montserratLight], ["MinimalMontserrat", fonts?.montserrat], ["MinimalMontserratBold", fonts?.montserratBold], ["MinimalAllura", fonts?.allura]].filter((entry): entry is [string, string] => Boolean(entry[1]));
  return values.length ? `<defs><style>${values.map(([family, source]) => `@font-face{font-family:${family};src:url('${source}') format('truetype');}`).join("")}</style></defs>` : "";
}

function text(value: string, element: { xMm: number; yMm: number; widthMm: number; fontSizePt: number }, family: string, options = "") {
  const size = mm(element.fontSizePt);
  return `<text x="${element.xMm + element.widthMm / 2}" y="${element.yMm + size * .82}" text-anchor="middle" font-family="${family}" font-size="${size}" ${options}>${xml(value)}</text>`;
}

function lines(value: string, element: { xMm: number; yMm: number; widthMm: number; fontSizePt: number }, family: string, options = "") {
  const words = value.trim().split(/\s+/u);
  const split = Array.from({ length: words.length - 1 }, (_, index) => index + 1).reduce((best, index) => {
    const score = Math.abs(words.slice(0, index).join(" ").length - words.slice(index).join(" ").length);
    return score < best.score ? { index, score } : best;
  }, { index: 1, score: Number.POSITIVE_INFINITY }).index;
  const size = mm(element.fontSizePt), x = element.xMm + element.widthMm / 2;
  return `<text x="${x}" y="${element.yMm + size * .82}" text-anchor="middle" font-family="${family}" font-size="${size}" ${options}><tspan x="${x}">${xml(words.slice(0, split).join(" "))}</tspan><tspan x="${x}" dy="${size}">${xml(words.slice(split).join(" "))}</tspan></text>`;
}

function qrMarkup(url: string) {
  const target = minimalCreamLandscapeMaster.elements.qr, frame = minimalCreamLandscapeMaster.elements.qrFrame;
  const qr = QRCode.create(url, { errorCorrectionLevel: "M" }), quiet = 4, total = qr.modules.size + quiet * 2;
  let modules = "";
  for (let row = 0; row < qr.modules.size; row++) for (let column = 0; column < qr.modules.size; column++) if (qr.modules.get(row, column)) modules += `M${column + quiet} ${row + quiet}h1v1h-1z`;
  return `<rect x="${frame.xMm}" y="${frame.yMm}" width="${frame.widthMm}" height="${frame.heightMm}" rx="${frame.radiusMm}" fill="#fffaf1" stroke="#b87925" stroke-width=".45"/><svg x="${target.xMm}" y="${target.yMm}" width="${target.widthMm}" height="${target.heightMm}" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges"><rect width="${total}" height="${total}" fill="#fff"/><path d="${modules}" fill="#111"/></svg>`;
}

export function buildMinimalCreamLandscape(design: WeddingDesign, title: string, date: string | null, url: string, assets: MinimalCreamAssets) {
  const master = minimalCreamLandscapeMaster, names = designNames(design, title).toLocaleUpperCase("tr-TR"), dateText = minimalCreamDateLabel(date);
  const open = (face: "front" | "back", logo: { xMm: number; yMm: number; widthMm: number; heightMm: number }) => `<svg xmlns="http://www.w3.org/2000/svg" width="100mm" height="75mm" viewBox="3 3 100 75" role="img">${fontDefinitions(assets.fonts)}<image href="${xml(assets[face])}" x="0" y="0" width="106" height="81" preserveAspectRatio="none"/><image href="${xml(assets.logo)}" x="${logo.xMm}" y="${logo.yMm}" width="${logo.widthMm}" height="${logo.heightMm}" preserveAspectRatio="xMidYMid meet"/>`;
  const front = open("front", master.elements.frontLogo)
    + lines(design.qrHook, master.elements.title, "MinimalMontserratBold", `fill="#171717" letter-spacing=".08"`)
    + text("Sen de iz bırak.", master.elements.frontScript, "MinimalAllura", `fill="#a86419"`)
    + text(design.qrDescription, master.elements.description, "MinimalMontserratBold", `fill="#27221e" letter-spacing=".12"`)
    + qrMarkup(url)
    + text(design.qrCta.toLocaleUpperCase("tr-TR"), master.elements.cta, "MinimalMontserrat", `fill="#171717" letter-spacing=".5"`)
    + text(names, master.elements.names, "MinimalMontserrat", `fill="#171717" letter-spacing=".65"`)
    + text(dateText, master.elements.date, "MinimalMontserrat", `fill="#171717" letter-spacing=".5"`)
    + `</svg>`;
  const divider = master.elements.backDivider;
  const back = open("back", master.elements.backLogo)
    + lines("BU HİKÂYENİN PARÇASISIN.", master.elements.backTitle, "MinimalMontserratBold", `fill="#171717" letter-spacing=".08"`)
    + text("İyi ki geldin.", master.elements.backScript, "MinimalAllura", `fill="#a86419"`)
    + lines(design.message, master.elements.backDescription, "MinimalMontserratBold", `fill="#27221e" letter-spacing=".12"`)
    + `<path d="M${divider.xMm} ${divider.yMm}H52.3M53.7 ${divider.yMm}H${divider.xMm + divider.widthMm}" stroke="#b87925" stroke-width=".18"/><rect x="52.54" y="58.54" width=".92" height=".92" transform="rotate(45 53 59)" fill="#b87925"/>`
    + text(names, master.elements.backNames, "MinimalMontserrat", `fill="#171717" letter-spacing=".65"`)
    + text(dateText, master.elements.backDate, "MinimalMontserrat", `fill="#171717" letter-spacing=".5"`)
    + `</svg>`;
  return { front, back };
}
