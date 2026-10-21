import { test } from "node:test";
import assert from "node:assert/strict";
import {
  defaultDesign,
  designSchema,
  resolveDesign,
  cardPalette,
  designMonogram,
  themeIds,
  cardTemplates,
  cardPresets,
  availableTemplates,
} from "../src/lib/design";
import { buildQrCards } from "../src/lib/qr-card";
import { defaultQrProduct, validateQrProduct, withPrintMarks } from "../src/lib/qr-products";

test("existing invitations keep their original video and speed", () => {
  assert.equal(resolveDesign().intro, "video");
  assert.equal(resolveDesign().speed, 1.5);
  assert.equal(resolveDesign().version, 2);
});
test("legacy design values migrate to studio schema v2", () => {
  const legacy = { ...defaultDesign, version: 1 as const, theme: "navy" as const };
  const migrated = resolveDesign(legacy);
  assert.equal(migrated.version, 2);
  assert.equal(migrated.theme, "navy");
});
test("template libraries expose only available templates", () => {
  for (const surface of ["wedding", "loading", "qr"] as const) {
    const templates = availableTemplates(surface);
    assert.ok(templates.length > 0);
    assert.ok(templates.every((template) => template.available && template.surface === surface));
  }
});
test("all QR reference designs are available as valid presets", () => {
  assert.equal(cardPresets.length, 10);
  assert.equal(new Set(cardPresets.map((preset) => preset.id)).size, 10);
  for (const preset of cardPresets) {
    assert.ok(preset.image.startsWith("/qr-templates/"));
    assert.ok(preset.image.endsWith("_On_Yuz.webp"));
    assert.ok(preset.template in cardTemplates);
    assert.ok(themeIds.includes(preset.theme));
    assert.match(preset.primary, /^#[0-9A-F]{6}$/i);
    assert.match(preset.accent, /^#[0-9A-F]{6}$/i);
  }
});

test("existing saved designs receive the wedding page template and copy defaults", () => {
  const legacy = { ...defaultDesign } as Record<string, unknown>;
  delete legacy.pageTemplate;
  delete legacy.brandTagline;
  delete legacy.pageHeading;
  delete legacy.pageMessage;
  delete legacy.uploadTitle;
  delete legacy.uploadPrompt;

  const resolved = resolveDesign(legacy as typeof defaultDesign);
  assert.equal(resolved.pageTemplate, "filmstrip");
  assert.equal(resolved.pageHeading, "Sıradaki kare sizden.");
  assert.equal(resolved.uploadTitle, "Fotoğraf / Video Yükle");
});
test("design input rejects privilege fields, CSS injection, unsupported options and invalid speeds", () => {
  for (const patch of [
    { owner_id: "other" },
    { partner_id: "other" },
    { primary: "red; background:url(https://evil.test)" },
    { theme: "unknown" },
    { speed: 0 },
    { speed: 3 },
    { message: "x".repeat(241) },
    { pageTemplate: "unknown" },
    { pageHeading: "" },
    { pageMessage: "x".repeat(241) },
    { uploadTitle: "x".repeat(101) },
  ]) {
    assert.equal(
      designSchema.safeParse({ ...defaultDesign, ...patch }).success,
      false,
    );
  }
  assert.equal(
    designSchema.safeParse({
      ...defaultDesign,
      intro: "curtain",
      theme: "ivory",
      speed: 0.75,
    }).success,
    true,
  );
});
test("linked, independent and custom QR colors resolve independently", () => {
  assert.equal(
    cardPalette({ ...defaultDesign, theme: "ivory", cardTheme: "navy" }).base,
    "#E8DAC4",
  );
  assert.equal(
    cardPalette({
      ...defaultDesign,
      theme: "ivory",
      linked: false,
      cardTheme: "navy",
    }).base,
    "#071326",
  );
  assert.equal(
    cardPalette({ ...defaultDesign, customColors: true, primary: "#ffffff" })
      .ink,
    "#191612",
  );
  assert.equal(
    cardPalette({ ...defaultDesign, customColors: true, primary: "#000000" })
      .ink,
    "#FFF8EE",
  );
  assert.equal(designMonogram(defaultDesign, "İpek & Özgür"), "İ · Ö");
});
test("The Editorial renders 15 × 20 cm cards with a high contrast QR and escaped user text", () => {
  for (const theme of themeIds)
    for (const cardTemplate of Object.keys(
      cardTemplates,
    ) as (keyof typeof cardTemplates)[]) {
      const cards = buildQrCards(
        {
          ...defaultDesign,
          theme,
          cardTemplate,
          names: '<script>alert("x")</script>',
          message: "A & B <img>",
        },
        "Test",
        "2026-10-02",
        "https://example.com/wedding/test",
      );
      assert.match(cards.front, /width="150mm" height="200mm"/);
      assert.match(cards.front, /01_Krem_On_Yuz\.webp/);
      assert.match(cards.front, /preserveAspectRatio="xMidYMid slice"/);
      assert.doesNotMatch(cards.front + cards.back, /fill-opacity="\.78"|xMidYMid meet/);
      assert.doesNotMatch(cards.front + cards.back, /<script>|<img>/);
      assert.match(cards.back, /A &amp; B &lt;img&gt;/);
      assert.match(cards.front, /shape-rendering="crispEdges"/);
      assert.match(cards.front, /fill="#fff"/);
      assert.match(cards.front, /fill="#111"/);
    }
});
test("QR pattern changes with the real invitation target without changing the back face", () => {
  const a = buildQrCards(
    defaultDesign,
    "A & B",
    null,
    "https://example.com/wedding/a",
  );
  const b = buildQrCards(
    defaultDesign,
    "A & B",
    null,
    "https://example.com/wedding/b",
  );
  assert.notEqual(a.front, b.front);
  assert.equal(a.back, b.back);
});
test("QR text crop boxes and organization QR placement are persisted in the SVG", () => {
  const cards = buildQrCards(
    {
      ...defaultDesign,
      qrLayout: {
        ...defaultDesign.qrLayout,
        qrHook: { x: 24, y: 18, width: 220, height: 74 },
        qr: { x: 30, y: -12, width: 150, height: 150 },
        icons: { x: 12, y: 8, width: 200, height: 50 },
        divider: { x: -10, y: 6, width: 180, height: 80 },
      },
    },
    "A & B",
    null,
    "https://example.com/q/67e55044-10b1-426f-9247-bb680e5fe0c8",
  );
  assert.match(cards.front, /id="clip-hook"/);
  assert.match(cards.front, /width="220" height="74"/);
  assert.match(cards.front, /shape-rendering="crispEdges"/);
  assert.match(cards.front, /x="[0-9.]+" y="[0-9.]+" width="150" height="150"/);
  assert.match(cards.front, /scale\(1\.2987012987012987 1\.25\)/);
  assert.match(cards.front, /stroke-width="2" stroke-opacity="\.65"/);
});
test("QR physical product enforces compatibility, bleed and safe area", () => {
  const target = "https://example.com/q/67e55044-10b1-426f-9247-bb680e5fe0c8";
  const validation = validateQrProduct(defaultQrProduct, defaultDesign, target);
  assert.equal(validation.passed, true);
  assert.equal(defaultQrProduct.bleedMm, 3);
  assert.equal(defaultQrProduct.safeAreaMm, 5);
  assert.equal(validateQrProduct(defaultQrProduct, defaultDesign, "https://example.com/wedding/degisebilir").passed, false);
});
test("print exports include bleed canvas and crop marks without changing QR target", () => {
  const target = "https://example.com/q/67e55044-10b1-426f-9247-bb680e5fe0c8";
  const cards = buildQrCards(defaultDesign, "A & B", null, target);
  const printable = withPrintMarks(cards.front, defaultQrProduct);
  assert.match(printable, /width="156mm" height="206mm"/);
  assert.match(printable, /viewBox="0 0 811\.2 1071\.2"/);
  assert.match(printable, /shape-rendering="crispEdges"/);
});
