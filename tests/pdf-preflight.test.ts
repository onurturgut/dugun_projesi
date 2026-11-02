import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { inspectPrintPdf } from "../src/lib/pdf-preflight";
import { resolveQrProduct } from "../src/lib/qr-products";
import { readFile } from "node:fs/promises";
import { defaultDesign } from "../src/lib/design";
import { createMinimalCreamPrintPdf } from "../src/lib/minimal-cream-pdf";
import { minimalCreamPortraitMaster } from "../src/lib/minimal-cream-template";
import { createMinimalCreamLandscapePrintPdf } from "../src/lib/minimal-cream-landscape-pdf";
import { minimalCreamLandscapeMaster } from "../src/lib/minimal-cream-landscape-template";
import { buildMinimalCreamLandscape } from "../src/lib/minimal-cream-landscape-template";

const mmToPoints = (value: number) => (value * 72) / 25.4;

test("print PDF preflight accepts two bleed-sized product pages", async () => {
  const pdf = await PDFDocument.create();
  pdf.addPage([mmToPoints(81), mmToPoints(106)]);
  pdf.addPage([mmToPoints(81), mmToPoints(106)]);
  const result = await inspectPrintPdf(
    await pdf.save(),
    resolveQrProduct("portrait-mini-75x100-duplex"),
  );
  assert.equal(result.passed, true);
  assert.equal(result.page_count, 2);
  assert.equal(
    result.checks.find((check) => check.id === "page-size")?.status,
    "passed",
  );
});

test("print PDF preflight rejects wrong page count and dimensions", async () => {
  const pdf = await PDFDocument.create();
  pdf.addPage([100, 100]);
  const result = await inspectPrintPdf(
    await pdf.save(),
    resolveQrProduct("portrait-mini-75x100-duplex"),
  );
  assert.equal(result.passed, false);
  assert.equal(
    result.checks.find((check) => check.id === "page-count")?.status,
    "failed",
  );
  assert.equal(
    result.checks.find((check) => check.id === "page-size")?.status,
    "failed",
  );
});

test("welcome sign preflight accepts one front-only bleed-sized page", async () => {
  const product = resolveQrProduct("welcome-sign-500x700-duplex");
  const pdf = await PDFDocument.create();
  pdf.addPage([mmToPoints(506), mmToPoints(706)]);
  const result = await inspectPrintPdf(await pdf.save(), product);

  assert.deepEqual(product.sides, ["front"]);
  assert.equal(result.passed, true);
  assert.equal(result.page_count, 1);
  assert.equal(
    result.checks.find((check) => check.id === "page-count")?.status,
    "passed",
  );
});

test("all five Minimal variants export two-page print PDFs with exact bleed and trim boxes", async () => {
  const baseDesign = {
    ...defaultDesign,
    qrTemplateId: "modern-arch" as const,
    qrColorVariant: "cream" as const,
    qrProductId: "portrait-mini-75x100-duplex" as const,
    qrHook: "HER KARE BİR HİKAYE.",
    qrDescription: "Fotoğraf ve videolarını paylaş.",
    qrCta: "TARAT VE PAYLAŞ",
    message: "Bu özel günde yanımızda olduğun için teşekkür ederiz.",
  };
  for (const variant of ["cream", "blush", "sage", "blue", "black"] as const) {
    const design = { ...baseDesign, qrColorVariant: variant };
    const bytes = await createMinimalCreamPrintPdf(design, "ELA & DENİZ", "2026-09-14", `https://shineqr.test/q/${variant}-event`, {
      frontBackground: await readFile(`public/design-center/templates/modern-arch/${variant}/portrait-mini/minimal-${variant}-portrait-mini-front-base-clean.png`),
      backBackground: await readFile(`public/design-center/templates/modern-arch/${variant}/portrait-mini/minimal-${variant}-portrait-mini-back-base-clean.png`),
      solidLogoSvg: await readFile("public/brand/vector/shineqr-logo-solid-gold.svg", "utf8"),
      montserratLight: await readFile("public/fonts/qr/montserrat-light.ttf"),
      montserrat: await readFile("public/fonts/qr/montserrat-regular.ttf"),
      allura: await readFile("public/fonts/qr/allura-400.ttf"),
    });
    const pdf = await PDFDocument.load(bytes);
    assert.equal(pdf.getPageCount(), 2);
    for (const page of pdf.getPages()) {
      const media = page.getMediaBox();
      const bleed = page.getBleedBox();
      const trim = page.getTrimBox();
      assert.ok(Math.abs(media.width - mmToPoints(81)) < 0.01);
      assert.ok(Math.abs(media.height - mmToPoints(106)) < 0.01);
      assert.deepEqual(bleed, media);
      assert.ok(Math.abs(trim.x - mmToPoints(3)) < 0.01);
      assert.ok(Math.abs(trim.y - mmToPoints(3)) < 0.01);
      assert.ok(Math.abs(trim.width - mmToPoints(75)) < 0.01);
      assert.ok(Math.abs(trim.height - mmToPoints(100)) < 0.01);
    }
    assert.equal((await inspectPrintPdf(bytes, resolveQrProduct("portrait-mini-75x100-duplex"))).passed, true);
  }
  assert.deepEqual(minimalCreamPortraitMaster.elements.qrFrame, { xMm: 23.5, yMm: 55, widthMm: 34, heightMm: 34, radiusMm: 2 });
  assert.deepEqual(minimalCreamPortraitMaster.elements.qr, { xMm: 25.25, yMm: 56.75, widthMm: 30.5, heightMm: 30.5 });
});

test("Minimal cream landscape exports an exact two-page 100x75mm print PDF", async () => {
  const design = {
    ...defaultDesign,
    qrTemplateId: "modern-arch" as const,
    qrColorVariant: "cream" as const,
    qrProductId: "landscape-mini-100x75-duplex" as const,
    qrHook: "HER KARE BİR HİKÂYE.",
    qrDescription: "Fotoğraf ve videolarını paylaş.",
    qrCta: "TARAT VE PAYLAŞ",
    message: "Bu özel günde yanımızda olduğun için teşekkür ederiz.",
  };
  const bytes = await createMinimalCreamLandscapePrintPdf(design, "ELA & DENİZ", "2026-09-14", "https://shineqr.test/q/minimal-cream-landscape", {
    frontBackground: await readFile("public/design-center/templates/modern-arch/cream/landscape-mini/minimal-cream-landscape-mini-front-base-clean.png"),
    backBackground: await readFile("public/design-center/templates/modern-arch/cream/landscape-mini/minimal-cream-landscape-mini-back-base-clean.png"),
    solidLogoSvg: await readFile("public/brand/vector/shineqr-logo-solid-gold.svg", "utf8"),
    montserratLight: await readFile("public/fonts/qr/montserrat-light.ttf"),
    montserrat: await readFile("public/fonts/qr/montserrat-regular.ttf"),
    montserratBold: await readFile("public/fonts/qr/montserrat-bold.ttf"),
    allura: await readFile("public/fonts/qr/allura-400.ttf"),
  });
  const pdf = await PDFDocument.load(bytes);
  assert.equal(pdf.getPageCount(), 2);
  for (const page of pdf.getPages()) {
    const media = page.getMediaBox(), trim = page.getTrimBox();
    assert.ok(Math.abs(media.width - mmToPoints(106)) < 0.01);
    assert.ok(Math.abs(media.height - mmToPoints(81)) < 0.01);
    assert.ok(Math.abs(trim.x - mmToPoints(3)) < 0.01);
    assert.ok(Math.abs(trim.y - mmToPoints(3)) < 0.01);
    assert.ok(Math.abs(trim.width - mmToPoints(100)) < 0.01);
    assert.ok(Math.abs(trim.height - mmToPoints(75)) < 0.01);
  }
  assert.equal((await inspectPrintPdf(bytes, resolveQrProduct("landscape-mini-100x75-duplex"))).passed, true);
  assert.deepEqual(minimalCreamLandscapeMaster.elements.qr, { xMm: 67.4, yMm: 21.4, widthMm: 27.2, heightMm: 27.2 });
  const preview = buildMinimalCreamLandscape(design, "ELA & DENİZ", "2026-09-14", "https://shineqr.test/q/minimal-cream-landscape", {
    front: "front.png", back: "back.png", logo: "logo.svg",
  });
  assert.match(preview.front, /width="100mm" height="75mm" viewBox="3 3 100 75"/);
});
