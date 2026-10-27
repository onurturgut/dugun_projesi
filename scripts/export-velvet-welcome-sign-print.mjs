import fs from "node:fs/promises";
import path from "node:path";
import { PDFDocument, rgb } from "pdf-lib";

const root = process.cwd();
const variants = ["burgundy", "black", "navy", "emerald", "cream"];
const mmToPt = 72 / 25.4;
const pageWidth = 506 * mmToPt, pageHeight = 706 * mmToPt, bleed = 3 * mmToPt, markLength = 2 * mmToPt;
function addCropMarks(page) {
  const color = rgb(0.05, 0.05, 0.05);
  const lines = [[0, bleed, markLength, bleed], [bleed, 0, bleed, markLength], [pageWidth - markLength, bleed, pageWidth, bleed], [pageWidth - bleed, 0, pageWidth - bleed, markLength], [0, pageHeight - bleed, markLength, pageHeight - bleed], [bleed, pageHeight - markLength, bleed, pageHeight], [pageWidth - markLength, pageHeight - bleed, pageWidth, pageHeight - bleed], [pageWidth - bleed, pageHeight - markLength, pageWidth - bleed, pageHeight]];
  for (const [startX, startY, endX, endY] of lines) page.drawLine({ start: { x: startX, y: startY }, end: { x: endX, y: endY }, thickness: 0.35, color });
}
for (const variant of variants) {
  const directory = path.join(root, "output/design-center/velvet-flow", variant, "welcome-sign-500x700");
  const imageBytes = await fs.readFile(path.join(directory, `velvet-flow-${variant}-welcome-sign-500x700-front-composed-preview.png`));
  const pdf = await PDFDocument.create();
  pdf.setTitle(`ShineQR Velvet Flow ${variant} 50x70 cm karşılama tabelası`);
  pdf.setSubject("Tek yüzlü karşılama tabelası baskı dosyası");
  const image = await pdf.embedPng(imageBytes);
  const page = pdf.addPage([pageWidth, pageHeight]);
  page.drawImage(image, { x: 0, y: 0, width: pageWidth, height: pageHeight });
  addCropMarks(page);
  await fs.writeFile(path.join(directory, `velvet-flow-${variant}-welcome-sign-front-print.pdf`), await pdf.save({ useObjectStreams: false }));
}
console.log(`Exported ${variants.length} welcome-sign print PDFs.`);
