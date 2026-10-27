import fs from "node:fs/promises";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";

const root = process.cwd();
const variants = ["burgundy", "black", "navy", "emerald", "cream"];
const expected = { width: 5976, height: 8339, density: 300, pageWidthMm: 506, pageHeightMm: 706 };
const results = [];
const thumbs = [];

for (const variant of variants) {
  const directory = path.join(root, "output/design-center/velvet-flow", variant, "welcome-sign-500x700");
  const pngPath = path.join(directory, `velvet-flow-${variant}-welcome-sign-500x700-front-composed-preview.png`);
  const pdfPath = path.join(directory, `velvet-flow-${variant}-welcome-sign-front-print.pdf`);
  const metadata = await sharp(pngPath).metadata();
  const pdf = await PDFDocument.load(await fs.readFile(pdfPath));
  const page = pdf.getPage(0);
  const widthMm = page.getWidth() * 25.4 / 72;
  const heightMm = page.getHeight() * 25.4 / 72;
  const passed = metadata.width === expected.width && metadata.height === expected.height && Math.round(metadata.density ?? 0) === expected.density && pdf.getPageCount() === 1 && Math.abs(widthMm - expected.pageWidthMm) < 0.01 && Math.abs(heightMm - expected.pageHeightMm) < 0.01;
  results.push({ variant, passed, raster: { width: metadata.width, height: metadata.height, density: metadata.density }, pdf: { pages: pdf.getPageCount(), widthMm: Number(widthMm.toFixed(2)), heightMm: Number(heightMm.toFixed(2)) }, qrPhysicalSizeMm: Number((1840 / 300 * 25.4).toFixed(2)) });
  thumbs.push({ input: await sharp(pngPath).resize(480, 670, { fit: "fill" }).toBuffer(), top: 70, left: 40 + thumbs.length * 520 });
}

const contactSheet = path.join(root, "output/design-center/velvet-flow/qa/velvet-flow-welcome-sign-fronts-contact-sheet.png");
await fs.mkdir(path.dirname(contactSheet), { recursive: true });
const labels = variants.map((variant, index) => `<text x="${280 + index * 520}" y="40" text-anchor="middle" font-family="Arial" font-size="24" fill="#231F20">${variant.toUpperCase()}</text>`).join("");
const labelSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="2640" height="780">${labels}</svg>`);
await sharp({ create: { width: 2640, height: 780, channels: 4, background: "#F4F0E8" } }).composite([{ input: labelSvg, top: 0, left: 0 }, ...thumbs]).png().toFile(contactSheet);

const report = { status: results.every((item) => item.passed) ? "passed" : "failed", format: "50x70 cm trim + 3 mm bleed", safeAreaMm: 15, sourceQrTarget: "example preview URL; replace with production event URL before production", results };
const reportPath = path.join(root, "output/design-center/velvet-flow/qa/velvet-flow-welcome-sign-qa.json");
await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (report.status !== "passed") process.exitCode = 1;
