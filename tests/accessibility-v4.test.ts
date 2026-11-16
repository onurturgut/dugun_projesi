import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { contrastRatio } from "../src/lib/accessibility";
import { allowsVisualQaBypass } from "../src/lib/visual-qa";

test("V4 text tokens meet WCAG AA contrast in light and dark themes", () => {
  assert.ok(contrastRatio("#211c1b", "#faf8f4") >= 4.5);
  assert.ok(contrastRatio("#756e69", "#ffffff") >= 4.5);
  assert.ok(contrastRatio("#756e69", "#faf8f4") >= 4.5);
  assert.ok(contrastRatio("#171713", "#b88a48") >= 4.5);
  assert.ok(contrastRatio("#79561f", "#ffffff") >= 4.5);
  assert.ok(contrastRatio("#79561f", "#faf8f4") >= 4.5);
  assert.ok(contrastRatio("#f2efe9", "#111315") >= 4.5);
  assert.ok(contrastRatio("#a7adb2", "#191c1f") >= 4.5);
  assert.ok(contrastRatio("#171713", "#c3a46b") >= 4.5);
});

test("visual QA auth bypass is closed unless both explicit gates match", () => {
  assert.equal(allowsVisualQaBypass(undefined, null), false);
  assert.equal(allowsVisualQaBypass("1", null), false);
  assert.equal(allowsVisualQaBypass(undefined, "role-panel-contract"), false);
  assert.equal(allowsVisualQaBypass("1", "wrong-contract"), false);
  assert.equal(allowsVisualQaBypass("1", "role-panel-contract"), true);
});

test("V4 role workspace exposes focus, reduced motion, mobile and tablet contracts", () => {
  const css = readFileSync("src/components/admin/admin.css", "utf8");
  assert.match(css, /\.role-workspace a:focus-visible/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /max-width: 1100px/);
  assert.match(css, /max-width: 680px/);
  assert.match(css, /min-height: 44px/);
  assert.doesNotMatch(css, /--admin-gold:\s*#966d2e/);
  assert.doesNotMatch(css, /--admin-muted:\s*#796b61/);
});

test("V4 application surfaces consume the central font tokens", () => {
  const surfaces = [
    "src/components/admin/admin.css",
    "src/components/v4/ui/V4Ui.module.css",
    "src/components/v4/marketing/V4Marketing.module.css",
    "src/components/business/business.module.css",
  ];

  for (const surface of surfaces) {
    const css = readFileSync(surface, "utf8");
    assert.doesNotMatch(
      css,
      /font(?:-family|\s*:)\s*[^;}]*\b(?:Georgia|Geist|Inter|Manrope|Arial)\b/i,
      `${surface} must use --font-sans or --font-display instead of a local stack`,
    );
  }
});
