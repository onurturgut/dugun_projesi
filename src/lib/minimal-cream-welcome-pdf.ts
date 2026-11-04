import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import QRCode from "qrcode";
import { designNames, type WeddingDesign } from "./design";
import { minimalCreamDateLabel } from "./minimal-cream-template";
import { minimalCreamWelcomeMaster } from "./minimal-cream-welcome-template";

export type MinimalWelcomePdfAssets = {
  background: Uint8Array;
  solidLogoSvg: string;
  montserratLight: Uint8Array;
  montserrat: Uint8Array;
  allura: Uint8Array;
};

const pt = (mm: number) => (mm * 72) / 25.4;
const ink = rgb(23 / 255, 23 / 255, 23 / 255);
const muted = rgb(39 / 255, 34 / 255, 30 / 255);
const scriptGold = rgb(168 / 255, 100 / 255, 25 / 255);

function fitted(font: PDFFont, value: string, wanted: number, widthMm: number) {
  const width = font.widthOfTextAtSize(value, wanted);
  return width > pt(widthMm) ? (wanted * pt(widthMm)) / width : wanted;
}

function centered(
  page: PDFPage,
  font: PDFFont,
  value: string,
  element: { xMm: number; yMm: number; widthMm: number; fontSizePt: number },
  color = ink,
) {
  const size = fitted(font, value, element.fontSizePt, element.widthMm);
  const width = font.widthOfTextAtSize(value, size);
  page.drawText(value, {
    x: pt(element.xMm + element.widthMm / 2) - width / 2,
    y: pt(minimalCreamWelcomeMaster.media.heightMm - element.yMm) - size,
    size,
    font,
    color,
  });
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

function drawTitle(page: PDFPage, font: PDFFont, value: string) {
  const element = minimalCreamWelcomeMaster.elements.title;
  balancedTwoLines(value).forEach((line, index) =>
    centered(page, font, line, {
      ...element,
      yMm: element.yMm + index * element.lineGapMm,
    }),
  );
}

function drawLogo(page: PDFPage, svg: string) {
  const path = svg.match(/<path[^>]*\sd="([^"]+)"/u)?.[1];
  if (!path) throw new Error("Tek renk vektör logo yolu okunamadı.");
  const element = minimalCreamWelcomeMaster.elements.logo;
  page.drawSvgPath(path, {
    x: pt(element.xMm),
    y: pt(minimalCreamWelcomeMaster.media.heightMm - element.yMm),
    scale: pt(element.widthMm) / 1536,
    color: rgb(199 / 255, 161 / 255, 90 / 255),
  });
}

function drawQr(page: PDFPage, url: string) {
  const target = minimalCreamWelcomeMaster.elements.qr;
  const qr = QRCode.create(url, { errorCorrectionLevel: "M" });
  const quiet = 4;
  const total = qr.modules.size + quiet * 2;
  const moduleMm = target.widthMm / total;
  page.drawRectangle({
    x: pt(target.xMm),
    y: pt(
      minimalCreamWelcomeMaster.media.heightMm - target.yMm - target.heightMm,
    ),
    width: pt(target.widthMm),
    height: pt(target.heightMm),
    color: rgb(1, 0.992, 0.973),
  });
  for (let row = 0; row < qr.modules.size; row++)
    for (let column = 0; column < qr.modules.size; column++)
      if (qr.modules.get(row, column)) {
        page.drawRectangle({
          x: pt(target.xMm + (column + quiet) * moduleMm),
          y: pt(
            minimalCreamWelcomeMaster.media.heightMm -
              target.yMm -
              (row + quiet + 1) * moduleMm,
          ),
          width: pt(moduleMm + 0.02),
          height: pt(moduleMm + 0.02),
          color: rgb(0.05, 0.05, 0.05),
        });
      }
}

export async function createMinimalCreamWelcomePrintPdf(
  design: WeddingDesign,
  title: string,
  date: string | null,
  url: string,
  assets: MinimalWelcomePdfAssets,
) {
  const master = minimalCreamWelcomeMaster;
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle(
    `ShineQR Minimal Krem Karşılama Tabelası - ${designNames(design, title)}`,
  );
  pdf.setCreator("ShineQR Tasarım Merkezi");
  pdf.setProducer("ShineQR Baskı Otomasyonu");
  const [background, montserratLight, montserrat, allura] = await Promise.all([
    pdf.embedPng(assets.background),
    pdf.embedFont(assets.montserratLight, { subset: false }),
    pdf.embedFont(assets.montserrat, { subset: false }),
    pdf.embedFont(assets.allura, { subset: false }),
  ]);
  const page = pdf.addPage([
    pt(master.media.widthMm),
    pt(master.media.heightMm),
  ]);
  page.setBleedBox(0, 0, pt(master.media.widthMm), pt(master.media.heightMm));
  page.setTrimBox(
    pt(master.trim.xMm),
    pt(master.trim.yMm),
    pt(master.trim.widthMm),
    pt(master.trim.heightMm),
  );
  page.drawImage(background, {
    x: 0,
    y: 0,
    width: pt(master.media.widthMm),
    height: pt(master.media.heightMm),
  });
  drawLogo(page, assets.solidLogoSvg);
  centered(page, montserratLight, "HOŞ GELDİNİZ", master.elements.welcome);
  drawTitle(page, montserratLight, design.qrHook);
  centered(
    page,
    allura,
    "Sen de iz bırak.",
    master.elements.script,
    scriptGold,
  );
  centered(
    page,
    montserrat,
    design.qrDescription,
    master.elements.description,
    muted,
  );
  drawQr(page, url);
  centered(
    page,
    montserrat,
    design.qrCta.toLocaleUpperCase("tr-TR"),
    master.elements.cta,
  );
  const names = designNames(design, title).toLocaleUpperCase("tr-TR");
  centered(page, montserrat, names, master.elements.names);
  centered(page, montserrat, minimalCreamDateLabel(date), master.elements.date);
  return pdf.save({ useObjectStreams: false });
}

async function fetchBytes(path: string) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Baskı varlığı yüklenemedi: ${path}`);
  return new Uint8Array(await response.arrayBuffer());
}

export async function downloadMinimalCreamWelcomePrintPdf(
  design: WeddingDesign,
  title: string,
  date: string | null,
  url: string,
) {
  const assets = minimalCreamWelcomeMaster.assets;
  const [background, logoResponse, montserratLight, montserrat, allura] =
    await Promise.all([
      fetchBytes(assets.background),
      fetch(assets.foilLogo),
      fetchBytes("/fonts/qr/montserrat-light.ttf"),
      fetchBytes("/fonts/qr/montserrat-regular.ttf"),
      fetchBytes("/fonts/qr/allura-400.ttf"),
    ]);
  if (!logoResponse.ok) throw new Error("Vektör logo yüklenemedi.");
  const bytes = await createMinimalCreamWelcomePrintPdf(
    design,
    title,
    date,
    url,
    {
      background,
      solidLogoSvg: await logoResponse.text(),
      montserratLight,
      montserrat,
      allura,
    },
  );
  const href = URL.createObjectURL(
    new Blob([new Uint8Array(bytes).buffer], { type: "application/pdf" }),
  );
  const link = document.createElement("a");
  link.href = href;
  link.download =
    "shineqr-minimal-krem-500x700mm-karsilama-tabelasi-kontrol.pdf";
  link.click();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}
