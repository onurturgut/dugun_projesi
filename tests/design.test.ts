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
} from "../src/lib/design";
import { buildQrCards } from "../src/lib/qr-card";

test("existing invitations keep their original video and speed", () => {
  assert.equal(resolveDesign().intro, "video");
  assert.equal(resolveDesign().speed, 1.5);
});
test("all QR reference designs are available as valid presets", () => {
  assert.equal(cardPresets.length, 10);
  assert.equal(new Set(cardPresets.map((preset) => preset.id)).size, 10);
  for (const preset of cardPresets) {
    assert.ok(preset.image.startsWith("/qrtasarım/"));
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
test("every card style and palette renders A6 cards with a high contrast QR and escaped user text", () => {
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
      assert.match(cards.front, /width="105mm" height="148mm"/);
      assert.doesNotMatch(cards.front + cards.back, /<script>|<img>/);
      assert.match(cards.back, /A &amp; B &lt;img&gt;/);
      assert.match(cards.back, /shape-rendering="crispEdges"/);
      assert.match(cards.back, /fill="#fff"/);
      assert.match(cards.back, /fill="#111"/);
    }
});
test("QR pattern changes with the real invitation target", () => {
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
  assert.notEqual(a.back, b.back);
  assert.equal(a.front, b.front);
});
