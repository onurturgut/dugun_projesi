import QRCode from "qrcode";
import { designNames, type WeddingDesign } from "./design";
import type { QrColorVariantId } from "./qr-templates";

export const minimalPortraitVariantIds = ["cream", "blush", "sage", "blue", "black"] as const;

export function minimalPortraitAssets(variant: QrColorVariantId) {
  const safeVariant = minimalPortraitVariantIds.includes(variant as (typeof minimalPortraitVariantIds)[number]) ? variant : "cream";
  return {
    front: `/design-center/templates/modern-arch/${safeVariant}/portrait-mini/minimal-${safeVariant}-portrait-mini-front-base-clean.png`,
    back: `/design-center/templates/modern-arch/${safeVariant}/portrait-mini/minimal-${safeVariant}-portrait-mini-back-base-clean.png`,
  };
}

export function minimalPortraitPalette(variant: QrColorVariantId) {
  return variant === "black"
    ? { ink: "#f8f0df", inkRgb: [248, 240, 223] as const, muted: "#efe2cc", mutedRgb: [239, 226, 204] as const }
    : { ink: "#171717", inkRgb: [23, 23, 23] as const, muted: "#27221e", mutedRgb: [39, 34, 30] as const };
}

export const minimalCreamPortraitMaster = {
  id: "minimal-cream-portrait-v1",
  version: 1,
  media: { widthMm: 81, heightMm: 106 },
  trim: { xMm: 3, yMm: 3, widthMm: 75, heightMm: 100 },
  safe: { xMm: 8, yMm: 8, widthMm: 65, heightMm: 90 },
  assets: {
    front: minimalPortraitAssets("cream").front,
    back: minimalPortraitAssets("cream").back,
    logo: "/brand/vector/shineqr-logo-metallic-gold.svg",
    foilLogo: "/brand/vector/shineqr-logo-solid-gold.svg",
  },
  elements: {
    logo: { xMm: 29, yMm: 5, widthMm: 23, heightMm: 15.333 },
    title: { xMm: 14, yMm: 23, widthMm: 53, heightMm: 16, fontSizePt: 21 },
    frontScript: { xMm: 11, yMm: 37.5, widthMm: 59, heightMm: 8, fontSizePt: 24 },
    description: { xMm: 11, yMm: 49, widthMm: 59, heightMm: 5, fontSizePt: 9.5 },
    qrFrame: { xMm: 23.5, yMm: 55, widthMm: 34, heightMm: 34, radiusMm: 2 },
    qr: { xMm: 25.25, yMm: 56.75, widthMm: 30.5, heightMm: 30.5 },
    cta: { xMm: 11, yMm: 89.2, widthMm: 59, heightMm: 3, fontSizePt: 8.2 },
    names: { xMm: 11, yMm: 92.3, widthMm: 59, heightMm: 4, fontSizePt: 10 },
    date: { xMm: 11, yMm: 95.7, widthMm: 59, heightMm: 2.5, fontSizePt: 6.5 },
    backTitle: { xMm: 10, yMm: 26, widthMm: 61, heightMm: 16, fontSizePt: 21 },
    backScript: { xMm: 10, yMm: 44, widthMm: 61, heightMm: 8, fontSizePt: 24 },
    backDescription: { xMm: 12, yMm: 55, widthMm: 57, heightMm: 9, fontSizePt: 10 },
    backDivider: { xMm: 30, yMm: 74, widthMm: 21, heightMm: 1 },
    backNames: { xMm: 12, yMm: 81, widthMm: 57, heightMm: 5, fontSizePt: 11 },
    backDate: { xMm: 12, yMm: 87, widthMm: 57, heightMm: 4, fontSizePt: 7.5 },
  },
} as const;

export type MinimalCreamAssets = {
  front: string;
  back: string;
  logo: string;
  fonts?: Partial<Record<"montserratLight" | "montserrat" | "montserratBold" | "allura", string>>;
};

const xml = (value: string) =>
  value.replace(/[<>&"']/g, (char) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[char]!,
  );

export function minimalCreamDateLabel(date: string | null) {
  if (!date) return "";
  return new Date(`${date.slice(0, 10)}T12:00:00+03:00`)
    .toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric", timeZone: "Europe/Istanbul" })
    .toLocaleUpperCase("tr-TR");
}

function qrMarkup(url: string) {
  const target = minimalCreamPortraitMaster.elements.qr;
  const qr = QRCode.create(url, { errorCorrectionLevel: "M" });
  const quiet = 4;
  const total = qr.modules.size + quiet * 2;
  let modules = "";
  for (let row = 0; row < qr.modules.size; row++) {
    for (let column = 0; column < qr.modules.size; column++) {
      if (qr.modules.get(row, column)) modules += `M${column + quiet} ${row + quiet}h1v1h-1z`;
    }
  }
  return `<svg x="${target.xMm}" y="${target.yMm}" width="${target.widthMm}" height="${target.heightMm}" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges"><rect width="${total}" height="${total}" fill="#fff"/><path d="${modules}" fill="#111"/></svg>`;
}

function fontDefinitions(fonts?: MinimalCreamAssets["fonts"]) {
  const definitions = [
    ["MinimalMontserratLight", fonts?.montserratLight],
    ["MinimalMontserrat", fonts?.montserrat],
    ["MinimalAllura", fonts?.allura],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));
  return definitions.length
    ? `<defs><style>${definitions.map(([family, source]) => `@font-face{font-family:${family};src:url('${source}') format('truetype');}`).join("")}</style></defs>`
    : "";
}

function centeredText(value: string, element: { xMm: number; yMm: number; widthMm: number; fontSizePt: number }, family: string, options = "") {
  const sizeMm = element.fontSizePt * 0.352778;
  return `<text x="${element.xMm + element.widthMm / 2}" y="${element.yMm + sizeMm * 0.82}" text-anchor="middle" font-family="${family}" font-size="${sizeMm}" ${options}>${xml(value)}</text>`;
}

function centeredLines(value: string, element: { xMm: number; yMm: number; widthMm: number; fontSizePt: number }, family: string, lines: number, options = "") {
  const words = value.trim().split(/\s+/u);
  const split = lines === 2 && words.length > 1
    ? Array.from({ length: words.length - 1 }, (_, index) => index + 1).reduce((best, index) => {
      const score = Math.abs(words.slice(0, index).join(" ").length - words.slice(index).join(" ").length);
      return score < best.score ? { index, score } : best;
    }, { index: 1, score: Number.POSITIVE_INFINITY }).index
    : words.length;
  const buckets = lines === 2 ? [words.slice(0, split).join(" "), words.slice(split).join(" ")] : [words.join(" ")];
  const x = element.xMm + element.widthMm / 2;
  const sizeMm = element.fontSizePt * 0.352778;
  return `<text x="${x}" y="${element.yMm + sizeMm * 0.82}" text-anchor="middle" font-family="${family}" font-size="${sizeMm}" ${options}>${buckets.filter(Boolean).map((line, index) => `<tspan x="${x}" dy="${index ? sizeMm : 0}">${xml(line)}</tspan>`).join("")}</text>`;
}

export function buildMinimalCreamPortrait(
  design: WeddingDesign,
  title: string,
  date: string | null,
  url: string,
  assets: MinimalCreamAssets,
) {
  const master = minimalCreamPortraitMaster;
  const palette = minimalPortraitPalette(design.qrColorVariant);
  const names = designNames(design, title).toLocaleUpperCase("tr-TR");
  const open = (face: "front" | "back") =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="81mm" height="106mm" viewBox="0 0 81 106" role="img">${fontDefinitions(assets.fonts)}<image href="${xml(assets[face])}" x="0" y="0" width="81" height="106" preserveAspectRatio="none"/><image href="${xml(assets.logo)}" x="${master.elements.logo.xMm}" y="${master.elements.logo.yMm}" width="${master.elements.logo.widthMm}" height="${master.elements.logo.heightMm}" preserveAspectRatio="xMidYMid meet"/>`;

  const front = open("front")
    + centeredLines(design.qrHook, master.elements.title, "MinimalMontserratLight", 2, `fill="${palette.ink}" letter-spacing="0.08"`)
    + centeredText("Sen de iz bırak.", master.elements.frontScript, "MinimalAllura", `fill="#a86419"`)
    + centeredText(design.qrDescription, master.elements.description, "MinimalMontserrat", `fill="${palette.muted}" letter-spacing="0.12"`)
    + qrMarkup(url)
    + centeredText(design.qrCta.toLocaleUpperCase("tr-TR"), master.elements.cta, "MinimalMontserrat", `fill="${palette.ink}" letter-spacing="0.55"`)
    + centeredText(names, master.elements.names, "MinimalMontserrat", `fill="${palette.ink}" letter-spacing="0.65"`)
    + centeredText(minimalCreamDateLabel(date), master.elements.date, "MinimalMontserrat", `fill="${palette.ink}" letter-spacing="0.5"`)
    + `</svg>`;

  const back = open("back")
    + centeredLines("BU HİKÂYENİN PARÇASISIN.", master.elements.backTitle, "MinimalMontserratLight", 2, `fill="${palette.ink}" letter-spacing="0.08"`)
    + centeredText("İyi ki geldin.", master.elements.backScript, "MinimalAllura", `fill="#a86419"`)
    + centeredLines(design.message, master.elements.backDescription, "MinimalMontserrat", 2, `fill="${palette.muted}" letter-spacing="0.12"`)
    + `<path d="M${master.elements.backDivider.xMm} ${master.elements.backDivider.yMm}H39.65M40.95 ${master.elements.backDivider.yMm}H${master.elements.backDivider.xMm + master.elements.backDivider.widthMm}" stroke="#b87925" stroke-width=".18"/><rect x="39.84" y="73.54" width=".92" height=".92" transform="rotate(45 40.3 74)" fill="#b87925"/>`
    + centeredText(names, master.elements.backNames, "MinimalMontserrat", `fill="${palette.ink}" letter-spacing="0.65"`)
    + centeredText(minimalCreamDateLabel(date), master.elements.backDate, "MinimalMontserrat", `fill="${palette.ink}" letter-spacing="0.5"`)
    + `</svg>`;
  return { front, back };
}
