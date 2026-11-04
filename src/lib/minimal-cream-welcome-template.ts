import QRCode from "qrcode";
import { designNames, type WeddingDesign } from "./design";
import { minimalCreamDateLabel } from "./minimal-cream-template";

export const minimalCreamWelcomeMaster = {
  id: "minimal-cream-welcome-sign-v1",
  version: 1,
  media: { widthMm: 506, heightMm: 706 },
  trim: { xMm: 3, yMm: 3, widthMm: 500, heightMm: 700 },
  safe: { xMm: 8, yMm: 8, widthMm: 490, heightMm: 690 },
  source: {
    widthPx: 1060,
    heightPx: 1484,
    suppliedDpi: 72,
    effectiveDpiAtTrim: 53.85,
    productionDpiTarget: 300,
  },
  assets: {
    background:
      "/design-center/templates/modern-arch/cream/welcome-sign-500x700/minimal-cream-welcome-sign-front-base-clean.png",
    logo: "/brand/vector/shineqr-logo-metallic-gold.svg",
    foilLogo: "/brand/vector/shineqr-logo-solid-gold.svg",
  },
  elements: {
    logo: { xMm: 196, yMm: 24, widthMm: 114, heightMm: 76 },
    welcome: { xMm: 55, yMm: 112, widthMm: 396, fontSizePt: 49 },
    title: { xMm: 69, yMm: 174, widthMm: 368, fontSizePt: 42, lineGapMm: 38 },
    script: { xMm: 70, yMm: 258, widthMm: 366, fontSizePt: 45 },
    description: { xMm: 55, yMm: 311, widthMm: 396, fontSizePt: 18 },
    qrFrame: { xMm: 151, yMm: 371, widthMm: 198, heightMm: 198 },
    qr: { xMm: 168, yMm: 388, widthMm: 164, heightMm: 164 },
    cta: { xMm: 80, yMm: 574, widthMm: 346, fontSizePt: 16 },
    divider: { xMm: 156, yMm: 610, widthMm: 194 },
    names: { xMm: 70, yMm: 628, widthMm: 366, fontSizePt: 23 },
    date: { xMm: 80, yMm: 661, widthMm: 346, fontSizePt: 14 },
  },
} as const;

export type MinimalWelcomeAssets = {
  background: string;
  logo: string;
  fonts?: Partial<Record<"montserratLight" | "montserrat" | "allura", string>>;
};

const escapeXml = (value: string) =>
  value.replace(
    /[<>&"']/g,
    (character) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[character]!,
  );

function fontDefinitions(fonts?: MinimalWelcomeAssets["fonts"]) {
  const definitions = [
    ["MinimalMontserratLight", fonts?.montserratLight],
    ["MinimalMontserrat", fonts?.montserrat],
    ["MinimalAllura", fonts?.allura],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));
  return definitions.length
    ? `<defs><style>${definitions.map(([family, source]) => `@font-face{font-family:${family};src:url('${source}') format('truetype');}`).join("")}</style></defs>`
    : "";
}

function centeredText(
  value: string,
  element: { xMm: number; yMm: number; widthMm: number; fontSizePt: number },
  family: string,
  options = "",
) {
  const sizeMm = element.fontSizePt * 0.352778;
  return `<text x="${element.xMm + element.widthMm / 2}" y="${element.yMm + sizeMm * 0.82}" text-anchor="middle" font-family="${family}" font-size="${sizeMm}" ${options}>${escapeXml(value)}</text>`;
}

function balancedTwoLines(value: string) {
  const words = value.trim().split(/\s+/u);
  if (words.length < 2) return [value];
  const split = Array.from(
    { length: words.length - 1 },
    (_, index) => index + 1,
  ).reduce(
    (best, index) => {
      const score = Math.abs(
        words.slice(0, index).join(" ").length -
          words.slice(index).join(" ").length,
      );
      return score < best.score ? { index, score } : best;
    },
    { index: 1, score: Number.POSITIVE_INFINITY },
  ).index;
  return [words.slice(0, split).join(" "), words.slice(split).join(" ")];
}

function titleMarkup(value: string) {
  const element = minimalCreamWelcomeMaster.elements.title;
  const sizeMm = element.fontSizePt * 0.352778;
  const x = element.xMm + element.widthMm / 2;
  return `<text x="${x}" y="${element.yMm + sizeMm * 0.82}" text-anchor="middle" font-family="MinimalMontserratLight" font-size="${sizeMm}" fill="#171717" letter-spacing=".55">${balancedTwoLines(
    value,
  )
    .map(
      (line, index) =>
        `<tspan x="${x}" dy="${index ? element.lineGapMm : 0}">${escapeXml(line)}</tspan>`,
    )
    .join("")}</text>`;
}

function qrMarkup(url: string) {
  const target = minimalCreamWelcomeMaster.elements.qr;
  const qr = QRCode.create(url, { errorCorrectionLevel: "M" });
  const quiet = 4;
  const total = qr.modules.size + quiet * 2;
  let modules = "";
  for (let row = 0; row < qr.modules.size; row++)
    for (let column = 0; column < qr.modules.size; column++) {
      if (qr.modules.get(row, column))
        modules += `M${column + quiet} ${row + quiet}h1v1h-1z`;
    }
  return `<svg x="${target.xMm}" y="${target.yMm}" width="${target.widthMm}" height="${target.heightMm}" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges"><rect width="${total}" height="${total}" fill="#fffdf8"/><path d="${modules}" fill="#111"/></svg>`;
}

export function buildMinimalCreamWelcome(
  design: WeddingDesign,
  title: string,
  date: string | null,
  url: string,
  assets: MinimalWelcomeAssets,
) {
  const master = minimalCreamWelcomeMaster;
  const names = designNames(design, title).toLocaleUpperCase("tr-TR");
  const front =
    `<svg xmlns="http://www.w3.org/2000/svg" width="500mm" height="700mm" viewBox="3 3 500 700" role="img" aria-label="Minimal Krem karşılama tabelası">${fontDefinitions(assets.fonts)}<image href="${escapeXml(assets.background)}" x="0" y="0" width="506" height="706" preserveAspectRatio="none"/><image href="${escapeXml(assets.logo)}" x="${master.elements.logo.xMm}" y="${master.elements.logo.yMm}" width="${master.elements.logo.widthMm}" height="${master.elements.logo.heightMm}" preserveAspectRatio="xMidYMid meet"/>` +
    centeredText(
      "HOŞ GELDİNİZ",
      master.elements.welcome,
      "MinimalMontserratLight",
      `fill="#171717" letter-spacing="1.8"`,
    ) +
    titleMarkup(design.qrHook) +
    centeredText(
      "Sen de iz bırak.",
      master.elements.script,
      "MinimalAllura",
      `fill="#a86419"`,
    ) +
    centeredText(
      design.qrDescription,
      master.elements.description,
      "MinimalMontserrat",
      `fill="#27221e" letter-spacing=".7"`,
    ) +
    qrMarkup(url) +
    centeredText(
      design.qrCta.toLocaleUpperCase("tr-TR"),
      master.elements.cta,
      "MinimalMontserrat",
      `fill="#171717" letter-spacing="2.1"`,
    ) +
    centeredText(
      names,
      master.elements.names,
      "MinimalMontserrat",
      `fill="#171717" letter-spacing="2.4"`,
    ) +
    centeredText(
      minimalCreamDateLabel(date),
      master.elements.date,
      "MinimalMontserrat",
      `fill="#171717" letter-spacing="2"`,
    ) +
    `</svg>`;
  return { front, back: front };
}
