import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
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
  availableDesignRequestTemplates,
  templateCatalog,
  runtimeIntroForTemplate,
} from "../src/lib/design";
import { buildQrCards } from "../src/lib/qr-card";
import { designRequestReadyToSend, submittedSurfaceStatus } from "../src/lib/design-request-workflow";
import type { DesignRequest } from "../src/lib/models";
import {
  defaultQrProduct,
  qrProductEntitlement,
  qrProducts,
  validateQrProduct,
  withPrintMarks,
} from "../src/lib/qr-products";
import { packageSnapshot } from "../src/lib/commercial-policy";
import {
  accountAvatarUrl,
  organizationIdFromAdminPath,
} from "../src/lib/customer-panel";
import {
  qrTemplates,
  resolvePhysicalQrBackground,
  resolveGeneratedQrFieldMapFace,
  resolveQrFieldMapFace,
} from "../src/lib/qr-templates";
import {
  auroraPresentationSet,
  botanicalLandscapeMiniPresentations,
  botanicalPortraitMiniPresentations,
  botanicalWelcomeSignPresentations,
  landscapeMiniPresentations,
  minimalPresentationSet,
  portraitMiniPresentations,
  welcomeSignPresentations,
} from "../src/lib/qr-presentations";
import {
  weddingImageBelongsToEvent,
  weddingTemplates,
} from "../src/lib/wedding-templates";
import { defaultDigitalInvitationContent, digitalInvitationAccessEnabled, digitalInvitationThemes, invitationGalleryBelongsToWedding, invitationRsvpUrl, invitationTextPresent, priceSnapshotIncludesDigitalInvitation } from "../src/lib/digital-invitation";

test("digital invitation defaults remain backward compatible and Bluebell asset is bundled", () => {
  assert.equal(defaultDigitalInvitationContent.theme_id, "botanical");
  assert.equal(defaultDigitalInvitationContent.show_countdown, true);
  assert.equal(defaultDigitalInvitationContent.show_families, true);
  assert.equal(defaultDigitalInvitationContent.show_gallery, true);
  assert.equal(defaultDigitalInvitationContent.show_story, true);
  assert.equal(defaultDigitalInvitationContent.loading_style, "theme");
  assert.equal(defaultDigitalInvitationContent.animation_intensity, "rich");
  assert.deepEqual(digitalInvitationThemes.map((theme) => theme.id), ["botanical", "bluebell-timeless"]);
  assert.equal(new Set(digitalInvitationThemes.map((theme) => theme.id)).size, digitalInvitationThemes.length);
  for (const theme of digitalInvitationThemes) {
    assert.equal(existsSync(`public${theme.image}`), true);
    assert.ok(theme.features.length > 0);
  }
  assert.equal(
    existsSync("public/digital-invitation/bluebell/bluebell-watercolor.png"),
    true,
  );
});

test("digital invitation gallery enforces wedding ownership and the twenty-image limit", () => {
  assert.equal(invitationGalleryBelongsToWedding(["/covers/a.jpg"], ["/covers/a.jpg", "/covers/b.jpg"]), true);
  assert.equal(invitationGalleryBelongsToWedding(["/covers/other.jpg"], ["/covers/a.jpg"]), false);
  assert.equal(invitationGalleryBelongsToWedding(Array.from({ length: 21 }, () => "/covers/a.jpg"), ["/covers/a.jpg"]), false);
});

test("digital invitation access accepts frozen Plan 3 rights or an explicit audited grant", () => {
  assert.equal(digitalInvitationAccessEnabled({ package_snapshot: { version: 2, code: "plan-3", digitalInvitationIncluded: true } }), true);
  assert.equal(digitalInvitationAccessEnabled({ package_snapshot: { version: 2, code: "plan-1" } }), false);
  assert.equal(digitalInvitationAccessEnabled({ package_snapshot: { version: 2, code: "plan-1" }, digital_invitation_access: { granted: true } }), true);
});

test("digital invitation add-on is recognized only from a positive frozen sale line", () => {
  assert.equal(priceSnapshotIncludesDigitalInvitation(), false);
  assert.equal(priceSnapshotIncludesDigitalInvitation({ add_ons: [{ effect_type: "digital_invitation", quantity: 0 }] }), false);
  assert.equal(priceSnapshotIncludesDigitalInvitation({ add_ons: [{ effect_type: "custom_design", quantity: 1 }] }), false);
  assert.equal(priceSnapshotIncludesDigitalInvitation({ add_ons: [{ effect_type: "digital_invitation", quantity: 1 }] }), true);
});

test("digital invitation optional content and RSVP links are normalized safely", () => {
  assert.equal(invitationTextPresent("   "), false);
  assert.equal(invitationTextPresent("Menü"), true);
  const attending = invitationRsvpUrl({
    whatsapp_number: "+90 (551) 231 47 36",
    bride_name: "Esra",
    groom_name: "Hüseyin Can",
    event_type: "Nişan",
  }, true);
  assert.match(attending, /^https:\/\/wa\.me\/905512314736\?text=/);
  assert.match(decodeURIComponent(attending), /Nişan davetinize katılacağım/);
  assert.equal(invitationRsvpUrl({ whatsapp_number: "", bride_name: "", groom_name: "", event_type: "" }, false), "");
});

test("catalog Loading and Wedding selections bypass approval while QR still requires delivery", () => {
  assert.equal(submittedSurfaceStatus("qr", "catalog"), "submitted");
  assert.equal(submittedSurfaceStatus("loading", "catalog"), "completed");
  assert.equal(submittedSurfaceStatus("wedding", "catalog"), "completed");
  assert.equal(submittedSurfaceStatus("loading", "custom"), "submitted");
  const surface = (mode: "catalog" | "custom", delivered = false) => ({
    mode,
    color: "",
    heading: "",
    title: "title",
    description: "",
    cta: "cta",
    footer: "",
    back_title: "",
    back_description: "",
    back_names: "",
    back_date: "",
    style: "",
    format: "",
    typography: "",
    layout: "",
    notes: "",
    reference_image_urls: [],
    status: "submitted" as const,
    ...(delivered ? { delivery: { preview_url: "/api/covers/test", notes: "", version: 1, uploaded_at: "2026-01-01", uploaded_by: "platform" } } : {}),
  });
  const request = {
    version: 1,
    status: "submitted",
    surfaces: { qr: surface("catalog", true), loading: surface("catalog"), wedding: surface("catalog") },
    updated_at: "2026-01-01",
    updated_by: "owner",
  } as DesignRequest;
  assert.equal(designRequestReadyToSend(request), true);
  request.surfaces.loading = surface("custom") as DesignRequest["surfaces"]["loading"];
  assert.equal(designRequestReadyToSend(request), false);
});

test("existing invitations keep their original video and speed", () => {
  assert.equal(resolveDesign().intro, "video");
  assert.equal(resolveDesign().speed, 1.5);
  assert.equal(resolveDesign().version, 2);
});
test("legacy design values migrate to studio schema v2", () => {
  const legacy = {
    ...defaultDesign,
    version: 1 as const,
    theme: "navy" as const,
  };
  const migrated = resolveDesign(legacy);
  assert.equal(migrated.version, 2);
  assert.equal(migrated.theme, "navy");
});

test("retired QR collection and table-card selections migrate without losing the design", () => {
  const migrated = resolveDesign({
    ...defaultDesign,
    names: "Ela & Deniz",
    qrTemplateId: "the-editorial",
    qrProductId: "table-card-150x200-duplex",
  });
  assert.equal(migrated.names, "Ela & Deniz");
  assert.equal(migrated.qrTemplateId, "botanical");
  assert.equal(migrated.qrProductId, "portrait-mini-75x100-duplex");
});
test("template libraries expose only available templates", () => {
  assert.deepEqual(
    availableTemplates("loading").map((template) => template.id),
    [
      "autumn-phone-source",
      "autumn-phone-variant-2",
      "autumn-phone-variant-3",
      "phone-pink-curtain",
      "phone-floral-envelope",
    ],
  );
  for (const surface of ["wedding", "loading", "qr"] as const) {
    const templates = availableTemplates(surface);
    assert.ok(templates.length > 0);
    assert.ok(
      templates.every(
        (template) => template.available && template.surface === surface,
      ),
    );
  }
});
test("design center catalog metadata includes titles and display properties", () => {
  assert.equal(weddingTemplates.length, 11);
  for (const template of weddingTemplates) {
    assert.ok(template.name.length > 0);
    assert.ok(template.description.length > 0);
    assert.ok(["arch", "full", "polaroid"].includes(template.imageTreatment));
    assert.match(template.reference, /^\/wedding-designs\/.+\.png$/);
    assert.equal(
      existsSync(
        `public/design-center/mockups/wedding-phone/${template.id}.png`,
      ),
      true,
    );
  }
  for (const template of availableTemplates("loading")) {
    assert.ok(template.name.length > 0);
    assert.ok(template.description.length > 0);
    assert.ok(template.version >= 1);
  }
});
test("design request reuses the published Design Center visuals", () => {
  assert.deepEqual(
    availableDesignRequestTemplates("qr").map((template) => template.id),
    ["velvet-flow", "botanical", "modern-arch", "aurora"],
  );
  for (const template of availableDesignRequestTemplates("wedding")) {
    assert.equal(
      template.asset,
      `/design-center/mockups/wedding-phone/${template.id}.png`,
    );
    assert.equal(existsSync(`public${template.asset}`), true);
  }
  for (const template of availableDesignRequestTemplates("loading")) {
    assert.match(template.asset || "", /^\/intro\/.+\.mp4$/);
    assert.match(template.poster || "", /^\/intro\/.+\.(jpg|png|webp)$/);
  }
});
test("retired loading templates remain valid historical records", () => {
  const templates = templateCatalog.filter(
    (template) => template.surface === "loading",
  );
  const legacy = templates.find((template) => template.id === "video");
  const envelope = templates.find((template) => template.id === "envelope");
  const album = templates.find((template) => template.id === "album");
  const autumnPhone = templates.find(
    (template) => template.id === "autumn-phone",
  );
  const uploadedAutumnPhones = [
    "autumn-phone-source",
    "autumn-phone-variant-1",
    "autumn-phone-variant-2",
    "autumn-phone-variant-3",
  ].map((id) => templates.find((template) => template.id === id));

  assert.ok(templates.length > 0);
  assert.equal(templates.filter((template) => template.available).length, 5);

  assert.equal(legacy?.asset, "/intro/shineqr-portrait-v2.mp4");
  assert.equal(envelope?.asset, "/intro/wedding-envelope-loading-9x16.mp4");
  assert.equal(album?.asset, "/intro/wedding-album-loading-9x16.mp4");
  assert.equal(autumnPhone?.asset, "/intro/autumn-phone-loading-9x16.mp4");
  assert.deepEqual(
    uploadedAutumnPhones.map((template) => template?.asset),
    [
      "/intro/autumn-phone-source-loading-9x16.mp4",
      "/intro/autumn-phone-variant-1-loading-9x16.mp4",
      "/intro/autumn-phone-variant-2-loading-9x16.mp4",
      "/intro/autumn-phone-variant-3-loading-9x16.mp4",
    ],
  );
  assert.equal(
    designSchema.safeParse({ ...defaultDesign, intro: "envelope" }).success,
    true,
  );
  assert.equal(
    designSchema.safeParse({ ...defaultDesign, intro: "album" }).success,
    true,
  );
  assert.equal(
    designSchema.safeParse({ ...defaultDesign, intro: "autumn-phone" }).success,
    true,
  );
  for (const intro of [
    "autumn-phone-source",
    "autumn-phone-variant-1",
    "autumn-phone-variant-2",
    "autumn-phone-variant-3",
  ]) {
    assert.equal(
      designSchema.safeParse({ ...defaultDesign, intro }).success,
      true,
    );
  }
  assert.equal(
    designSchema.safeParse({ ...defaultDesign, intro: "campus" }).success,
    true,
  );
});

test("non-phone loading counterparts remain runtime assets rather than customer cards", () => {
  const publishedIds = availableDesignRequestTemplates("loading").map(
    (template) => template.id,
  );
  for (const id of ["blush-floral-envelope", "pink-velvet-curtain"] as const) {
    assert.equal(publishedIds.includes(id), false);
    assert.equal(
      designSchema.safeParse({ ...defaultDesign, intro: id }).success,
      true,
    );
  }
});

test("customer presentation stays phone-framed while runtime uses intro.mp4", () => {
  const templates = availableDesignRequestTemplates("loading");
  for (const [id, name] of [
    ["phone-pink-curtain", "Telefonda pembe perde"],
    ["phone-floral-envelope", "Telefonda çiçekli davetiye"],
  ] as const) {
    const template = templates.find((item) => item.id === id);
    assert.equal(template?.name, name);
    assert.equal(template?.asset, `/intro/${id}-loading-9x16.mp4`);
    assert.equal(template?.poster, `/intro/${id}-loading-9x16-poster.jpg`);
    assert.equal(existsSync(`public${template?.asset}`), true);
    assert.equal(existsSync(`public${template?.poster}`), true);
    assert.equal(
      designSchema.safeParse({ ...defaultDesign, intro: id }).success,
      true,
    );
  }
  assert.equal(
    runtimeIntroForTemplate("phone-floral-envelope"),
    "blush-floral-envelope",
  );
  assert.equal(
    resolveDesign({ ...defaultDesign, intro: "phone-floral-envelope" }).intro,
    "blush-floral-envelope",
  );
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
test("Botanical renders high contrast QR cards with escaped user text", () => {
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
      assert.match(cards.front, /Botanical_Krem_On_Yuz\.webp/);
      assert.match(cards.front, /preserveAspectRatio="xMidYMid slice"/);
      assert.doesNotMatch(
        cards.front + cards.back,
        /fill-opacity="\.78"|xMidYMid meet/,
      );
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
  assert.equal(
    validateQrProduct(
      defaultQrProduct,
      defaultDesign,
      "https://example.com/wedding/degisebilir",
    ).passed,
    false,
  );
});
test("print exports include bleed canvas and crop marks without changing QR target", () => {
  const target = "https://example.com/q/67e55044-10b1-426f-9247-bb680e5fe0c8";
  const cards = buildQrCards(defaultDesign, "A & B", null, target);
  const printable = withPrintMarks(cards.front, defaultQrProduct);
  assert.match(printable, /width="81mm" height="106mm"/);
  assert.match(printable, /viewBox="0 0 421\.2 551\.2"/);
  assert.match(printable, /shape-rendering="crispEdges"/);
});

test("Velvet Flow exposes every approved physical format and color base", () => {
  assert.deepEqual(
    qrProducts.map((product) => [product.trimWidthMm, product.trimHeightMm]),
    [
      [75, 100],
      [100, 75],
      [500, 700],
    ],
  );
  for (const variant of [
    "burgundy",
    "navy",
    "black",
    "cream",
    "emerald",
  ] as const) {
    for (const face of ["front", "back"] as const) {
      assert.match(
        resolvePhysicalQrBackground("velvet-flow", variant, face) ?? "",
        /^\/design-center\/templates\/velvet-flow\//,
      );
    }
  }
});

test("approved Velvet Flow presentation galleries expose five color images", () => {
  for (const gallery of [
    landscapeMiniPresentations,
    portraitMiniPresentations,
    welcomeSignPresentations,
  ]) {
    assert.deepEqual(
      gallery.map((item) => item.id),
      ["burgundy", "black", "navy", "emerald", "cream"],
    );
    assert.ok(
      gallery.every(
        (item) =>
          item.image.startsWith("/design-center/presentations/velvet-flow/") &&
          item.image.endsWith("-presentation.png"),
      ),
    );
  }
});

test("reference collections expose presentation-only galleries for active products", () => {
  for (const [collection, set] of [
    ["modern-arch", minimalPresentationSet],
    ["aurora", auroraPresentationSet],
  ] as const) {
    for (const [format, gallery] of Object.entries(set)) {
      assert.equal(gallery.length, 5);
      assert.ok(
        gallery.every(
          (item) =>
            item.image.startsWith(
              `/design-center/presentations/${collection}/`,
            ) && item.image.endsWith("-presentation.png"),
        ),
        `${collection}/${format}`,
      );
    }
  }
});

test("Botanical portrait mini exposes five physical backgrounds and presentations", () => {
  assert.deepEqual(
    botanicalPortraitMiniPresentations.map((item) => item.id),
    ["sage", "cream", "blush", "blue", "black"],
  );
  assert.ok(
    botanicalPortraitMiniPresentations.every((item) =>
      item.image.startsWith(
        "/design-center/presentations/botanical/portrait-mini/",
      ),
    ),
  );
  for (const variant of ["sage", "cream", "blush", "blue", "black"] as const) {
    for (const face of ["front", "back"] as const) {
      assert.match(
        resolvePhysicalQrBackground("botanical", variant, face) ?? "",
        /^\/design-center\/templates\/botanical\//,
      );
    }
  }
  const portrait = qrProducts.find(
    (product) => product.id === "portrait-mini-75x100-duplex",
  )!;
  assert.equal(portrait.compatibleTemplates.includes("botanical"), true);
});

test("Botanical landscape mini and welcome sign expose approved print assets", () => {
  for (const gallery of [
    botanicalLandscapeMiniPresentations,
    botanicalWelcomeSignPresentations,
  ]) {
    assert.deepEqual(
      gallery.map((item) => item.id),
      ["sage", "cream", "blush", "blue", "black"],
    );
    assert.ok(
      gallery.every((item) =>
        item.image.startsWith("/design-center/presentations/botanical/"),
      ),
    );
  }
  for (const variant of ["sage", "cream", "blush", "blue", "black"] as const) {
    for (const face of ["front", "back"] as const) {
      assert.match(
        resolvePhysicalQrBackground(
          "botanical",
          variant,
          face,
          "landscape-mini-100x75-duplex",
        ) ?? "",
        /\/landscape-mini\//,
      );
      assert.match(
        resolvePhysicalQrBackground(
          "botanical",
          variant,
          face,
          "welcome-sign-500x700-duplex",
        ) ?? "",
        /\/welcome-sign-500x700\//,
      );
    }
  }
  const landscape = qrProducts.find(
    (product) => product.id === "landscape-mini-100x75-duplex",
  )!;
  const welcome = qrProducts.find(
    (product) => product.id === "welcome-sign-500x700-duplex",
  )!;
  assert.equal(landscape.artworkReady, true);
  assert.equal(welcome.artworkReady, true);
  assert.deepEqual(welcome.sides, ["front"]);
  assert.equal(landscape.compatibleTemplates.includes("botanical"), true);
  assert.equal(welcome.compatibleTemplates.includes("botanical"), true);
});

test("every physical format exports exact trim plus bleed dimensions", () => {
  const cards = buildQrCards(
    defaultDesign,
    "A & B",
    null,
    "https://example.com/q/67e55044-10b1-426f-9247-bb680e5fe0c8",
  );
  for (const product of qrProducts) {
    const printable = withPrintMarks(cards.front, product);
    assert.match(
      printable,
      new RegExp(
        `width="${product.trimWidthMm + 6}mm" height="${product.trimHeightMm + 6}mm"`,
      ),
    );
  }
});

test("Minimal landscape mini exposes all five print-ready color backgrounds", () => {
  for (const variant of ["cream", "blush", "sage", "blue", "black"] as const) {
    for (const face of ["front", "back"] as const) {
      assert.match(
        resolvePhysicalQrBackground(
          "modern-arch",
          variant,
          face,
          "landscape-mini-100x75-duplex",
        ) ?? "",
        new RegExp(`/modern-arch/${variant}/landscape-mini/`),
      );
    }
  }
});

test("Minimal cream welcome sign is selectable and uses its clean physical background", () => {
  const welcome = qrProducts.find(
    (product) => product.id === "welcome-sign-500x700-duplex",
  )!;
  assert.equal(welcome.compatibleTemplates.includes("modern-arch"), true);
  assert.equal(welcome.sides.length, 1);
  assert.equal(
    resolvePhysicalQrBackground(
      "modern-arch",
      "cream",
      "front",
      "welcome-sign-500x700-duplex",
    ),
    "/design-center/templates/modern-arch/cream/welcome-sign-500x700/minimal-cream-welcome-sign-front-base-clean.png",
  );
});

test("legacy designs receive safe sequential workflow defaults", () => {
  const resolved = resolveDesign({
    ...defaultDesign,
    qrProductId: undefined,
    qrCompleted: undefined,
    loadingCompleted: undefined,
    weddingCompleted: undefined,
    weddingImage: undefined,
  } as unknown as Record<string, unknown>);
  assert.equal(resolved.qrProductId, "portrait-mini-75x100-duplex");
  assert.equal(resolved.qrCompleted, false);
  assert.equal(resolved.loadingCompleted, false);
  assert.equal(resolved.weddingCompleted, false);
  assert.equal(resolved.weddingImage, "");
});

test("Loading cannot be completed before the QR stage", () => {
  const invalid = designSchema.safeParse({
    ...defaultDesign,
    qrCompleted: false,
    loadingCompleted: true,
  });
  assert.equal(invalid.success, false);
  assert.equal(
    invalid.error?.issues[0].message,
    "Loading aşaması QR aşaması tamamlanmadan tamamlanamaz.",
  );
  assert.equal(
    designSchema.safeParse({
      ...defaultDesign,
      qrCompleted: true,
      loadingCompleted: true,
    }).success,
    true,
  );
});

test("Wedding completion requires Loading and an organization photo", () => {
  assert.equal(
    designSchema.safeParse({
      ...defaultDesign,
      qrCompleted: true,
      loadingCompleted: false,
      weddingImage: "/covers/couple-1.jpg",
      weddingCompleted: true,
    }).success,
    false,
  );
  assert.equal(
    designSchema.safeParse({
      ...defaultDesign,
      qrCompleted: true,
      loadingCompleted: true,
      weddingImage: "",
      weddingCompleted: true,
    }).success,
    false,
  );
  assert.equal(
    designSchema.safeParse({
      ...defaultDesign,
      qrCompleted: true,
      loadingCompleted: true,
      pageTemplate: "velvet-flow",
      weddingImage: "/covers/couple-1.jpg",
      weddingCompleted: true,
    }).success,
    true,
  );
});

test("Wedding templates use the approved references and photo ownership is exact", () => {
  assert.equal(weddingTemplates.length, 11);
  assert.equal(
    new Set(weddingTemplates.map((template) => template.id)).size,
    11,
  );
  for (const template of weddingTemplates)
    assert.match(template.reference, /^\/wedding-designs\/\d{2}_.+\.png$/);
  assert.equal(
    weddingImageBelongsToEvent("/covers/a.jpg", ["/covers/a.jpg"]),
    true,
  );
  assert.equal(
    weddingImageBelongsToEvent("/covers/b.jpg", ["/covers/a.jpg"]),
    false,
  );
});

test("QR product access uses the frozen package snapshot and artwork readiness", () => {
  const plan1 = packageSnapshot("plan-1");
  const plan2 = packageSnapshot("plan-2");
  const portrait = qrProducts.find(
    (product) => product.id === "portrait-mini-75x100-duplex",
  )!;
  const welcome = qrProducts.find(
    (product) => product.id === "welcome-sign-500x700-duplex",
  )!;
  assert.equal(qrProductEntitlement(portrait, plan1).allowed, true);
  assert.equal(qrProductEntitlement(welcome, plan2).includedQuantity, 1);
  assert.equal(qrProductEntitlement(welcome, plan2).allowed, true);
  assert.equal(
    qrProductEntitlement(welcome, plan1).reason,
    "Paket seçimi nedeniyle kapalıdır; mevcut pakete dâhil değildir.",
  );
});

test("every QR collection supports every active physical product", () => {
  for (const template of Object.values(qrTemplates))
    for (const product of qrProducts)
      assert.equal(
        product.compatibleTemplates.includes(template.id),
        true,
        `${template.id} must support ${product.id}`,
      );
});

test("every physical QR color and size resolves to an existing 2D field-map face", () => {
  for (const template of Object.values(qrTemplates)) {
    for (const variant of template.variants) {
      for (const product of qrProducts) {
        for (const side of product.sides) {
          const face = resolveQrFieldMapFace(
            template.id,
            variant.id,
            product.id,
            side,
          );
          assert.equal(existsSync(`public${face}`), true, face);
          assert.equal(face.includes("/presentations/"), false, face);
        }
      }
    }
  }
});

test("ImageGen field-map catalog contains every collection color size and face", () => {
  for (const template of Object.values(qrTemplates))
    for (const variant of template.variants)
      for (const product of qrProducts)
        for (const face of ["front", "back"] as const) {
          const asset = resolveGeneratedQrFieldMapFace(
            template.id,
            variant.id,
            product.id,
            face,
          );
          assert.equal(existsSync(`public${asset}`), true, asset);
        }
});

test("customer panel keeps catalog routes separate from organization workspaces", () => {
  const organizationId = "c4751278-c139-4c3f-a212-c4324fa367a3";

  assert.equal(organizationIdFromAdminPath("/admin"), undefined);
  assert.equal(organizationIdFromAdminPath("/admin/design-center"), undefined);
  assert.equal(organizationIdFromAdminPath(`/admin/${organizationId}`), organizationId);
  assert.equal(
    organizationIdFromAdminPath(`/admin/${organizationId}/design/qr`),
    organizationId,
  );
});

test("customer accounts never inherit the partner brand image as a personal avatar", () => {
  const logo = "https://cdn.example.com/partner-logo.jpg";

  assert.equal(accountAvatarUrl("owner", logo), undefined);
  assert.equal(accountAvatarUrl("partner", logo), logo);
  assert.equal(accountAvatarUrl("platform", null), undefined);
});
