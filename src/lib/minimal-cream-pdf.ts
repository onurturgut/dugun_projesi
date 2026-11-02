import fontkit from "@pdf-lib/fontkit";
import { degrees, PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import QRCode from "qrcode";
import { designNames, type WeddingDesign } from "./design";
import { minimalCreamPortraitMaster, minimalCreamDateLabel, minimalPortraitAssets, minimalPortraitPalette } from "./minimal-cream-template";

export type MinimalCreamPdfAssets = {
  frontBackground: Uint8Array;
  backBackground: Uint8Array;
  solidLogoSvg: string;
  montserratLight: Uint8Array;
  montserrat: Uint8Array;
  allura: Uint8Array;
};

const pt = (mm: number) => (mm * 72) / 25.4;
const ink = rgb(45 / 255, 36 / 255, 29 / 255);
const gold = rgb(199 / 255, 161 / 255, 90 / 255);

function fitSize(font: PDFFont, text: string, wanted: number, maxWidthMm: number) {
  const width = font.widthOfTextAtSize(text, wanted);
  return width > pt(maxWidthMm) ? wanted * (pt(maxWidthMm) / width) : wanted;
}

function centered(page: PDFPage, font: PDFFont, text: string, yMm: number, widthMm: number, xMm: number, sizePt: number, color = ink) {
  const size = fitSize(font, text, sizePt, widthMm);
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, {
    x: pt(xMm + widthMm / 2) - width / 2,
    y: pt(minimalCreamPortraitMaster.media.heightMm - yMm) - size,
    size,
    font,
    color,
  });
}

function centeredLines(page: PDFPage, font: PDFFont, text: string, yMm: number, widthMm: number, xMm: number, sizePt: number, color = ink) {
  const words = text.trim().split(/\s+/u);
  const split = Array.from({ length: Math.max(1, words.length - 1) }, (_, index) => index + 1).reduce((best, index) => {
    const score = Math.abs(words.slice(0, index).join(" ").length - words.slice(index).join(" ").length);
    return score < best.score ? { index, score } : best;
  }, { index: 1, score: Number.POSITIVE_INFINITY }).index;
  [words.slice(0, split).join(" "), words.slice(split).join(" ")].filter(Boolean).forEach((line, index) => {
    centered(page, font, line, yMm + index * sizePt * 0.352778, widthMm, xMm, sizePt, color);
  });
}

function drawQr(page: PDFPage, url: string) {
  const target = minimalCreamPortraitMaster.elements.qr;
  const qr = QRCode.create(url, { errorCorrectionLevel: "M" });
  const quiet = 4;
  const total = qr.modules.size + quiet * 2;
  const moduleMm = target.widthMm / total;
  page.drawRectangle({
    x: pt(target.xMm),
    y: pt(minimalCreamPortraitMaster.media.heightMm - target.yMm - target.heightMm),
    width: pt(target.widthMm),
    height: pt(target.heightMm),
    color: rgb(1, 1, 1),
  });
  for (let row = 0; row < qr.modules.size; row++) {
    for (let column = 0; column < qr.modules.size; column++) {
      if (!qr.modules.get(row, column)) continue;
      page.drawRectangle({
        x: pt(target.xMm + (column + quiet) * moduleMm),
        y: pt(minimalCreamPortraitMaster.media.heightMm - target.yMm - (row + quiet + 1) * moduleMm),
        width: pt(moduleMm + 0.01),
        height: pt(moduleMm + 0.01),
        color: rgb(0.05, 0.05, 0.05),
      });
    }
  }
}

function drawLogo(page: PDFPage, svg: string) {
  const path = svg.match(/<path[^>]*\sd="([^"]+)"/u)?.[1];
  if (!path) throw new Error("Tek renk vektör logo yolu okunamadı.");
  const element = minimalCreamPortraitMaster.elements.logo;
  page.drawSvgPath(path, {
    x: pt(element.xMm),
    y: pt(minimalCreamPortraitMaster.media.heightMm - element.yMm),
    scale: pt(element.widthMm) / 1536,
    color: gold,
  });
}

export async function createMinimalCreamPrintPdf(
  design: WeddingDesign,
  title: string,
  date: string | null,
  url: string,
  assets: MinimalCreamPdfAssets,
) {
  const master = minimalCreamPortraitMaster;
  const palette = minimalPortraitPalette(design.qrColorVariant);
  const textInk = rgb(palette.inkRgb[0] / 255, palette.inkRgb[1] / 255, palette.inkRgb[2] / 255);
  const mutedInk = rgb(palette.mutedRgb[0] / 255, palette.mutedRgb[1] / 255, palette.mutedRgb[2] / 255);
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle(`ShineQR Minimal ${design.qrColorVariant} - ${designNames(design, title)}`);
  pdf.setCreator("ShineQR Tasarım Merkezi");
  pdf.setProducer("ShineQR Baskı Otomasyonu");
  const [frontImage, backImage, montserratLight, montserrat, allura] = await Promise.all([
    pdf.embedPng(assets.frontBackground),
    pdf.embedPng(assets.backBackground),
    pdf.embedFont(assets.montserratLight, { subset: false }),
    pdf.embedFont(assets.montserrat, { subset: false }),
    pdf.embedFont(assets.allura, { subset: false }),
  ]);
  const names = designNames(design, title).toLocaleUpperCase("tr-TR");
  const dateText = minimalCreamDateLabel(date);

  for (const face of ["front", "back"] as const) {
    const page = pdf.addPage([pt(master.media.widthMm), pt(master.media.heightMm)]);
    page.setBleedBox(0, 0, pt(master.media.widthMm), pt(master.media.heightMm));
    page.setTrimBox(pt(master.trim.xMm), pt(master.trim.yMm), pt(master.trim.widthMm), pt(master.trim.heightMm));
    page.drawImage(face === "front" ? frontImage : backImage, { x: 0, y: 0, width: pt(master.media.widthMm), height: pt(master.media.heightMm) });
    drawLogo(page, assets.solidLogoSvg);
    if (face === "front") {
      centeredLines(page, montserratLight, design.qrHook, master.elements.title.yMm, master.elements.title.widthMm, master.elements.title.xMm, master.elements.title.fontSizePt, textInk);
      centered(page, allura, "Sen de iz bırak.", master.elements.frontScript.yMm, master.elements.frontScript.widthMm, master.elements.frontScript.xMm, master.elements.frontScript.fontSizePt, rgb(168 / 255, 100 / 255, 25 / 255));
      centered(page, montserrat, design.qrDescription, master.elements.description.yMm, master.elements.description.widthMm, master.elements.description.xMm, master.elements.description.fontSizePt, mutedInk);
      drawQr(page, url);
      centered(page, montserrat, design.qrCta.toLocaleUpperCase("tr-TR"), master.elements.cta.yMm, master.elements.cta.widthMm, master.elements.cta.xMm, master.elements.cta.fontSizePt, textInk);
      centered(page, montserrat, names, master.elements.names.yMm, master.elements.names.widthMm, master.elements.names.xMm, master.elements.names.fontSizePt, textInk);
      centered(page, montserrat, dateText, master.elements.date.yMm, master.elements.date.widthMm, master.elements.date.xMm, master.elements.date.fontSizePt, textInk);
    } else {
      centeredLines(page, montserratLight, "BU HİKÂYENİN PARÇASISIN.", master.elements.backTitle.yMm, master.elements.backTitle.widthMm, master.elements.backTitle.xMm, master.elements.backTitle.fontSizePt, textInk);
      centered(page, allura, "İyi ki geldin.", master.elements.backScript.yMm, master.elements.backScript.widthMm, master.elements.backScript.xMm, master.elements.backScript.fontSizePt, rgb(168 / 255, 100 / 255, 25 / 255));
      centeredLines(page, montserrat, design.message, master.elements.backDescription.yMm, master.elements.backDescription.widthMm, master.elements.backDescription.xMm, master.elements.backDescription.fontSizePt, mutedInk);
      const dividerY = pt(master.media.heightMm - master.elements.backDivider.yMm);
      page.drawLine({ start: { x: pt(30), y: dividerY }, end: { x: pt(39.65), y: dividerY }, thickness: pt(0.18), color: gold });
      page.drawLine({ start: { x: pt(40.95), y: dividerY }, end: { x: pt(51), y: dividerY }, thickness: pt(0.18), color: gold });
      page.drawRectangle({ x: pt(40.3), y: dividerY - pt(0.65), width: pt(0.92), height: pt(0.92), rotate: degrees(45), color: gold });
      centered(page, montserrat, names, master.elements.backNames.yMm, master.elements.backNames.widthMm, master.elements.backNames.xMm, master.elements.backNames.fontSizePt, textInk);
      centered(page, montserrat, dateText, master.elements.backDate.yMm, master.elements.backDate.widthMm, master.elements.backDate.xMm, master.elements.backDate.fontSizePt, textInk);
    }
  }
  return pdf.save({ useObjectStreams: false });
}

async function fetchBytes(path: string) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Baskı varlığı yüklenemedi: ${path}`);
  return new Uint8Array(await response.arrayBuffer());
}

export async function downloadMinimalCreamPrintPdf(design: WeddingDesign, title: string, date: string | null, url: string) {
  const master = minimalCreamPortraitMaster;
  const variantAssets = minimalPortraitAssets(design.qrColorVariant);
  const [frontBackground, backBackground, logoResponse, montserratLight, montserrat, allura] = await Promise.all([
    fetchBytes(variantAssets.front),
    fetchBytes(variantAssets.back),
    fetch(master.assets.foilLogo),
    fetchBytes("/fonts/qr/montserrat-light.ttf"),
    fetchBytes("/fonts/qr/montserrat-regular.ttf"),
    fetchBytes("/fonts/qr/allura-400.ttf"),
  ]);
  if (!logoResponse.ok) throw new Error("Vektör logo yüklenemedi.");
  const bytes = await createMinimalCreamPrintPdf(design, title, date, url, {
    frontBackground,
    backBackground,
    solidLogoSvg: await logoResponse.text(),
    montserratLight,
    montserrat,
    allura,
  });
  const href = URL.createObjectURL(new Blob([new Uint8Array(bytes).buffer], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = href;
  link.download = `shineqr-minimal-${design.qrColorVariant}-75x100mm-baski.pdf`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}
