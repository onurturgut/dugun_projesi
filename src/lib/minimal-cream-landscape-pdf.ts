import fontkit from "@pdf-lib/fontkit";
import { degrees, PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import QRCode from "qrcode";
import { designNames, type WeddingDesign } from "./design";
import type { MinimalCreamPdfAssets } from "./minimal-cream-pdf";
import { minimalCreamDateLabel } from "./minimal-cream-template";
import { minimalCreamLandscapeMaster } from "./minimal-cream-landscape-template";

type MinimalCreamLandscapePdfAssets = MinimalCreamPdfAssets & { montserratBold: Uint8Array };

const pt = (mm: number) => mm * 72 / 25.4;
const ink = rgb(23 / 255, 23 / 255, 23 / 255), muted = rgb(39 / 255, 34 / 255, 30 / 255), gold = rgb(199 / 255, 161 / 255, 90 / 255), scriptGold = rgb(168 / 255, 100 / 255, 25 / 255);

function fitted(font: PDFFont, value: string, wanted: number, widthMm: number) {
  const width = font.widthOfTextAtSize(value, wanted);
  return width > pt(widthMm) ? wanted * pt(widthMm) / width : wanted;
}

function centered(page: PDFPage, font: PDFFont, value: string, element: { xMm: number; yMm: number; widthMm: number; fontSizePt: number }, color = ink) {
  const size = fitted(font, value, element.fontSizePt, element.widthMm), width = font.widthOfTextAtSize(value, size);
  page.drawText(value, { x: pt(element.xMm + element.widthMm / 2) - width / 2, y: pt(minimalCreamLandscapeMaster.media.heightMm - element.yMm) - size, size, font, color });
}

function centeredLines(page: PDFPage, font: PDFFont, value: string, element: { xMm: number; yMm: number; widthMm: number; fontSizePt: number }, color = ink) {
  const words = value.trim().split(/\s+/u);
  const split = Array.from({ length: words.length - 1 }, (_, index) => index + 1).reduce((best, index) => {
    const score = Math.abs(words.slice(0, index).join(" ").length - words.slice(index).join(" ").length);
    return score < best.score ? { index, score } : best;
  }, { index: 1, score: Number.POSITIVE_INFINITY }).index;
  [words.slice(0, split).join(" "), words.slice(split).join(" ")].forEach((line, index) => centered(page, font, line, { ...element, yMm: element.yMm + index * element.fontSizePt * .352778 }, color));
}

function drawLogo(page: PDFPage, svg: string, element: { xMm: number; yMm: number; widthMm: number }) {
  const path = svg.match(/<path[^>]*\sd="([^"]+)"/u)?.[1];
  if (!path) throw new Error("Tek renk vektör logo yolu okunamadı.");
  page.drawSvgPath(path, { x: pt(element.xMm), y: pt(minimalCreamLandscapeMaster.media.heightMm - element.yMm), scale: pt(element.widthMm) / 1536, color: gold });
}

function drawQr(page: PDFPage, url: string) {
  const target = minimalCreamLandscapeMaster.elements.qr, frame = minimalCreamLandscapeMaster.elements.qrFrame, qr = QRCode.create(url, { errorCorrectionLevel: "M" }), quiet = 4, total = qr.modules.size + quiet * 2, moduleMm = target.widthMm / total;
  page.drawRectangle({ x: pt(frame.xMm), y: pt(minimalCreamLandscapeMaster.media.heightMm - frame.yMm - frame.heightMm), width: pt(frame.widthMm), height: pt(frame.heightMm), color: rgb(1, .98, .94), borderColor: gold, borderWidth: pt(.45) });
  page.drawRectangle({ x: pt(target.xMm), y: pt(minimalCreamLandscapeMaster.media.heightMm - target.yMm - target.heightMm), width: pt(target.widthMm), height: pt(target.heightMm), color: rgb(1, 1, 1) });
  for (let row = 0; row < qr.modules.size; row++) for (let column = 0; column < qr.modules.size; column++) if (qr.modules.get(row, column)) page.drawRectangle({
    x: pt(target.xMm + (column + quiet) * moduleMm), y: pt(minimalCreamLandscapeMaster.media.heightMm - target.yMm - (row + quiet + 1) * moduleMm), width: pt(moduleMm + .01), height: pt(moduleMm + .01), color: rgb(.05, .05, .05),
  });
}

export async function createMinimalCreamLandscapePrintPdf(design: WeddingDesign, title: string, date: string | null, url: string, assets: MinimalCreamLandscapePdfAssets) {
  const master = minimalCreamLandscapeMaster, pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle(`ShineQR Minimal Krem Yatay - ${designNames(design, title)}`);
  pdf.setCreator("ShineQR Tasarım Merkezi");
  pdf.setProducer("ShineQR Baskı Otomasyonu");
  const [frontImage, backImage, montserratLight, montserrat, montserratBold, allura] = await Promise.all([
    pdf.embedPng(assets.frontBackground), pdf.embedPng(assets.backBackground), pdf.embedFont(assets.montserratLight, { subset: false }), pdf.embedFont(assets.montserrat, { subset: false }), pdf.embedFont(assets.montserratBold, { subset: false }), pdf.embedFont(assets.allura, { subset: false }),
  ]);
  const names = designNames(design, title).toLocaleUpperCase("tr-TR"), dateText = minimalCreamDateLabel(date);
  for (const face of ["front", "back"] as const) {
    const page = pdf.addPage([pt(master.media.widthMm), pt(master.media.heightMm)]);
    page.setBleedBox(0, 0, pt(master.media.widthMm), pt(master.media.heightMm));
    page.setTrimBox(pt(master.trim.xMm), pt(master.trim.yMm), pt(master.trim.widthMm), pt(master.trim.heightMm));
    page.drawImage(face === "front" ? frontImage : backImage, { x: 0, y: 0, width: pt(master.media.widthMm), height: pt(master.media.heightMm) });
    if (face === "front") {
      drawLogo(page, assets.solidLogoSvg, master.elements.frontLogo);
      centeredLines(page, montserratBold, design.qrHook, master.elements.title);
      centered(page, allura, "Sen de iz bırak.", master.elements.frontScript, scriptGold);
      centered(page, montserratBold, design.qrDescription, master.elements.description, muted);
      drawQr(page, url);
      centered(page, montserrat, design.qrCta.toLocaleUpperCase("tr-TR"), master.elements.cta);
      centered(page, montserrat, names, master.elements.names);
      centered(page, montserrat, dateText, master.elements.date);
    } else {
      drawLogo(page, assets.solidLogoSvg, master.elements.backLogo);
      centeredLines(page, montserratBold, "BU HİKÂYENİN PARÇASISIN.", master.elements.backTitle);
      centered(page, allura, "İyi ki geldin.", master.elements.backScript, scriptGold);
      centeredLines(page, montserratBold, design.message, master.elements.backDescription, muted);
      const y = pt(master.media.heightMm - master.elements.backDivider.yMm);
      page.drawLine({ start: { x: pt(40), y }, end: { x: pt(52.3), y }, thickness: pt(.18), color: gold });
      page.drawLine({ start: { x: pt(53.7), y }, end: { x: pt(66), y }, thickness: pt(.18), color: gold });
      page.drawRectangle({ x: pt(53), y: y - pt(.65), width: pt(.92), height: pt(.92), rotate: degrees(45), color: gold });
      centered(page, montserrat, names, master.elements.backNames);
      centered(page, montserrat, dateText, master.elements.backDate);
    }
  }
  return pdf.save({ useObjectStreams: false });
}

async function fetchBytes(path: string) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Baskı varlığı yüklenemedi: ${path}`);
  return new Uint8Array(await response.arrayBuffer());
}

export async function downloadMinimalCreamLandscapePrintPdf(design: WeddingDesign, title: string, date: string | null, url: string) {
  const assets = minimalCreamLandscapeMaster.assets;
  const [frontBackground, backBackground, logoResponse, montserratLight, montserrat, montserratBold, allura] = await Promise.all([
    fetchBytes(assets.front), fetchBytes(assets.back), fetch(assets.foilLogo), fetchBytes("/fonts/qr/montserrat-light.ttf"), fetchBytes("/fonts/qr/montserrat-regular.ttf"), fetchBytes("/fonts/qr/montserrat-bold.ttf"), fetchBytes("/fonts/qr/allura-400.ttf"),
  ]);
  if (!logoResponse.ok) throw new Error("Vektör logo yüklenemedi.");
  const bytes = await createMinimalCreamLandscapePrintPdf(design, title, date, url, { frontBackground, backBackground, solidLogoSvg: await logoResponse.text(), montserratLight, montserrat, montserratBold, allura });
  const href = URL.createObjectURL(new Blob([new Uint8Array(bytes).buffer], { type: "application/pdf" })), link = document.createElement("a");
  link.href = href;
  link.download = "shineqr-minimal-krem-100x75mm-yatay-baski.pdf";
  link.click();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}
