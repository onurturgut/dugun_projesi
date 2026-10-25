import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { inspectPrintPdf } from "../src/lib/pdf-preflight";
import { resolveQrProduct } from "../src/lib/qr-products";

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
