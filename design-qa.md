# Muğla Üniversitesi Kampüs Loading — Visual QA (2026-10-24)

- Source visual truth: `C:/Users/onurt/Downloads/Muğla Üniversitesi Kampüs Yükleniyor.png`
- Implementation: `OpeningScene`, `campus` intro selection
- Intended viewport: source-like `941 × 1672` mobile portrait plus responsive phone preview
- Source pixels: `941 × 1672`
- Generated background: `public/intro/university-campus-loading.webp`, `1120 × 1990`
- Logo asset: `public/wedding-designs/mugla-university-logo-transparent.png`, `1080 × 1456`, alpha enabled
- Implementation screenshot: not captured
- CSS viewport and density: not measured because no browser surface was available
- State: opening animation playing, progress indicator active

## Full-view comparison evidence

Blocked. The supplied campus reference was opened and used as the visual target. Typecheck, lint, automated tests, and production compilation pass, but no browser is exposed by the computer-use environment, so the implementation could not be captured beside the source.

## Focused region comparison evidence

Blocked. The campus crop, logo scale, slogan spacing, progress timing, footer copy, short-screen response, and exit transition require browser-rendered evidence.

## Findings

- [P1] Browser-rendered campus loading evidence is missing.
  - Location: Wedding opening screen with `intro: campus`.
  - Evidence: code and assets validate, but no implementation screenshot exists.
  - Impact: crop, text placement, logo scale, and animation timing may still differ visibly from the reference.
  - Fix: capture the opening screen at `941 × 1672` and the admin phone preview, compare them with the source in one view, and correct every P0/P1/P2 mismatch.

## Required fidelity surfaces

- Fonts and typography: uppercase slogan, italic loading label, and footer tagline are implemented; rendered weight and spacing comparison is pending.
- Spacing and layout rhythm: centered logo/content stack, progress bar, and lower footer are implemented; rendered comparison is pending.
- Colors and visual tokens: ivory sunlight, burgundy ribbon and progress fill, pale stone, and muted greenery are implemented; rendered sampling is pending.
- Image quality and asset fidelity: dedicated campus WebP and the previously generated transparent university logo are used; exact crop and logo edge fidelity remain unverified.
- Copy and content: “Bilgiyle / Daha güçlü yarınlara”, “Hazırlanıyor...” and “Üreten üniversite / topluma değer” match the supplied reference.

## Comparison history

- Initial pass: blocked before rendered comparison because no browser was available.

## Primary interactions pending browser verification

- Six-second progress animation and speed multiplier
- Reduced-motion state
- Opening exit transition into the Wedding page
- Admin replay control and phone preview
- Short phone, standard phone, tablet, and desktop crops
- Browser console error review

## Follow-up polish

None classified until a rendered comparison is available.

final result: blocked

---

# Anasayfa Ek Ürünler Şeridi — Visual QA (2026-10-31)

- Source visual truth: user-provided conversation screenshot showing the horizontal “EK ÜRÜNLER” panel
- Implementation: `HomePage` extras section in `src/components/marketing/MarketingPages.tsx`
- Intended viewport: desktop reference crop, responsive tablet and mobile layouts
- Source pixels: 1176 × 195
- Implementation screenshot: not captured
- CSS viewport and density: not measured because no browser surface was available
- State: default extras panel with eight products and “Teklif Al” CTA

## Full-view comparison evidence

Blocked. The supplied screenshot was used as the visual target, but the computer-use inventory exposes no browser. The implementation could not be captured beside the source at a matching viewport.

## Focused region comparison evidence

Blocked. Header ornaments, icon-box dimensions, dividers, type wrapping, CTA radius, panel border, shadow, and spacing require browser-rendered evidence.

## Findings

- [P1] Browser-rendered extras panel evidence is missing.
  - Location: homepage pricing section, `.extrasSection`.
  - Evidence: source screenshot is available and code validates, but no implementation screenshot exists.
  - Impact: exact spacing, wrapping and visual density may still differ from the supplied reference.
  - Fix: capture the homepage extras section at the reference desktop width, compare it with the source in one view, then correct all P0/P1/P2 mismatches.

## Required fidelity surfaces

- Fonts and typography: serif heading and product labels are implemented; rendered optical size and wrapping remain unverified.
- Spacing and layout rhythm: horizontal eight-item strip, separators and right-side CTA are implemented; exact reference measurements remain unverified.
- Colors and visual tokens: ivory panel, burgundy copy, warm gold icons and border treatments are implemented; rendered sampling remains pending.
- Image quality and asset fidelity: the reference uses line icons; matching library icons are used without raster assets. Rendered stroke-weight comparison remains pending.
- Copy and content: eight reference product labels and “Teklif Al” are represented in the implementation.

## Comparison history

- Initial pass: blocked before rendered comparison because no browser was available.

## Primary interactions pending browser verification

- Extras card hover states
- “Teklif Al” navigation
- Package CTA focus and rounded-button treatment
- Desktop, tablet and mobile wrapping
- Browser console error review

## Follow-up polish

None classified until a rendered comparison is available.

final result: blocked

---

# 11 Romantik Tören Wedding — Visual QA (2026-10-24)

- Source visual truth: `public/wedding-designs/11_Romantik_Dugun.png`
- Original supplied file: `C:/Users/onurt/Downloads/Romantik Düğün Anı Yükleme Ekranı.png`
- Implementation route: `/wedding/{slug}`, `romantic-ceremony` template
- Intended viewport: source-like `941 × 1672` mobile portrait plus responsive tablet and desktop widths
- Source pixels: `941 × 1672`
- Generated decorative asset: `public/wedding-designs/romantic-ceremony-background.webp`, `1120 × 1990`
- Implementation screenshot: not captured
- CSS viewport and density: not measured because no browser surface was available
- State: idle upload form with separate camera, gallery, and video actions

## Full-view comparison evidence

Blocked. The supplied reference was opened at original resolution and used to build the composition. Typecheck, lint, automated tests, and production compilation pass, but the available computer-use inventory contains no browser. A rendered implementation screenshot could not be captured or placed beside the source.

## Focused region comparison evidence

Blocked. The ceremony background crop, burgundy ribbon path, dynamic event heading, three-source upload controls, message pill, submit button, typography, and responsive spacing require browser-rendered evidence at matching dimensions.

## Findings

- [P1] Browser-rendered Romantik Tören evidence is missing.
  - Location: `/wedding/{slug}`, Romantik Tören template.
  - Evidence: technical checks pass, but they do not establish pixel-level fidelity to the supplied `941 × 1672` reference.
  - Impact: background crop, content density, typography, control sizing, and vertical rhythm may still differ visibly.
  - Fix: capture the idle template at `941 × 1672`, compare it with the source in one view, then correct every P0/P1/P2 mismatch.

## Required fidelity surfaces

- Fonts and typography: dynamic event title, date, message, uppercase strapline, upload labels, and action captions are implemented; rendered family, weight, and wrapping comparison is pending.
- Spacing and layout rhythm: centered invitation copy, large dashed upload surface, three equal source actions, pill message field, and burgundy submit button are implemented; rendered comparison is pending.
- Colors and visual tokens: warm ivory, burgundy, soft rose, and translucent cream surfaces are implemented; rendered sampling is pending.
- Image quality and asset fidelity: a dedicated `1120 × 1990` WebP ceremony aisle, floral, curtain, petal, and satin-ribbon background was generated from the supplied reference; exact crop remains unverified.
- Copy and content: organization data remains dynamic. The university-specific logo and fixed institutional wording were intentionally not copied into the reusable Wedding template.

## Comparison history

- Initial pass: blocked before rendered comparison because no browser was available.

## Primary interactions pending browser verification

- Main dropzone and drag-and-drop state
- Camera capture file input
- Gallery multi-select input
- Video capture file input
- Message input focus state
- Selected-media review, upload progress, retry, and success states
- Mobile, tablet, and desktop overflow checks
- Browser console error review

## Follow-up polish

None classified until a rendered comparison is available.

final result: blocked

---

# QR, Loading and Wedding Design Workspaces — Visual QA

- Source visual truth: `C:\Users\onurt\.codex\generated_images\01a16941-b433-7f53-8a2e-9d217120b0c3\exec-e103d328-dcf5-4f67-91c5-f88efacb2dbe.png`
- Intended implementation route: `/admin/{organizationId}/design/qr`
- Intended viewport: `1440 × 1024` CSS px
- Source pixels: `1488 × 1058`
- Implementation pixels: not captured
- Density normalization: not performed because no browser surface was available
- State: QR workflow, Template step, Velvet Flow selected, front face

## Loading workspace target

- Visual language: the approved QR workspace shell already implemented in this project
- Intended implementation route: `/admin/{organizationId}/design/loading`
- Intended viewport: `1440 × 1024` CSS px
- State: QR complete, Loading unlocked, one ready-made opening selected
- Core interaction: choose a design, play it inside the phone preview, replay it, save a draft, and complete the stage

## Wedding workspace target

- Visual language: the approved QR and Loading workspace shell
- Intended implementation route: `/admin/{organizationId}/design/wedding`
- Intended viewport: `1440 × 1024` CSS px
- State: QR and Loading complete, Wedding unlocked
- Core interaction: select one of the 10 approved Wedding references, choose an organization photo, drag and zoom it in the shared phone preview, save a draft, and complete the workflow
- Published output: `/wedding/{slug}` uses the same template, focal point, and zoom values as the editor

## Full-view comparison evidence

Blocked. The selected QR source visual and its implemented workspace were used as the Loading workspace's design-system reference, but neither the in-app browser nor another browser was available in the current computer-use inventory. A browser-rendered implementation screenshot could not be captured.

## Focused region comparison evidence

Blocked for the same reason. The ready-made design list, phone opening preview, Wedding template gallery, organization photo gallery, drag/zoom behavior, selection summary, and completion controls require browser-rendered evidence before they can be compared.

## Findings

- [P1] Browser-rendered evidence is missing.
  - Location: QR and Loading design workspaces.
  - Evidence: production build, lint, typecheck, and automated tests pass, but these checks do not prove visual fidelity.
  - Impact: layout overflow, typography drift, responsive defects, or image-crop differences could remain undetected.
  - Fix: open the authenticated QR design route at `1440 × 1024`, capture the Template and Edit steps, compare them with the selected source, then correct all P0/P1/P2 differences.

## Comparison history

- Initial pass: blocked before visual comparison because no browser surface was available.

## Primary interactions pending browser verification

- Template selection and locked template states
- Product/size package entitlement states
- Extra selection and quantity
- Color selection
- Front/back preview and safe-area toggle
- Text editing and QR-size slider
- Draft save and QR-stage completion
- Loading Page unlock after QR completion
- Loading template selection and immediate phone preview replay
- Loading draft save and completion
- Wedding unlock only after QR and Loading completion
- Wedding template selection from the 10 approved references
- Organization photo ownership and empty-photo state
- Direct manipulation of the photo inside the phone preview
- Zoom, reset, draft save, and Wedding completion
- Published Wedding page crop parity with the editor
- Browser console error review

## Follow-up polish

None classified until a rendered comparison is available.

final result: blocked

---

# 01 Ivory Editorial Wedding — Visual QA (2026-10-24)

- Source visual truth: `public/wedding-designs/01_Ivory_Editorial.png`
- Implementation route: `/wedding/{slug}`, `ivory-editorial` template
- Intended viewport: source-like mobile portrait plus representative mobile, tablet, and desktop widths
- Source pixels: `247 × 511`
- Generated decorative asset: `public/wedding-designs/ivory-editorial-background.webp`, `941 × 1672`
- Implementation screenshot: not captured
- CSS viewport and density: not measured because no browser surface was available
- State: dynamic organization photo selected, upload card idle

## Full-view comparison evidence

Blocked. The source image was opened and used as the visual target, and the implementation passes the production build, but the available computer-use inventory contains no browser. A rendered implementation screenshot could not be captured or placed beside the source.

## Focused region comparison evidence

Blocked. The arched photo mask and crop, stone/floral ornament, editorial title/date treatment, lower message, and cream upload card require browser-rendered evidence at matching dimensions.

## Findings

- [P1] Browser-rendered Ivory Editorial evidence is missing.
  - Location: `/wedding/{slug}`, Ivory Editorial template.
  - Evidence: typecheck, lint, automated tests, and production build pass; these checks do not establish pixel-level fidelity to `01_Ivory_Editorial.png`.
  - Impact: photo-frame scale, floral crop, typography, vertical rhythm, and upload-card placement may still differ visibly.
  - Fix: capture the idle template at the source aspect ratio and representative responsive widths, compare it with the source in one view, and correct every P0/P1/P2 mismatch.

## Required fidelity surfaces

- Fonts and typography: editorial serif hierarchy is implemented; rendered family, weight, wrapping, and optical-size comparison is pending.
- Spacing and layout rhythm: isolated portrait stage, arched photo frame, copy stack, and upload-card placement are implemented; rendered comparison is pending.
- Colors and visual tokens: ivory, warm stone, muted greenery, and dark-brown text treatment are implemented; rendered sampling is pending.
- Image quality and asset fidelity: a dedicated `941 × 1672` WebP decorative background was generated from the supplied source direction; its visible crop and ornament fidelity remain unverified.
- Copy and content: organization title, formatted date, saved Wedding message, selected organization photo, and upload controls remain dynamic; rendered wrapping is pending.

## Comparison history

- Initial pass: blocked before rendered comparison because no browser was available.
- Geometry correction: the former semicircular `4 / 5` mask was replaced with a taller `.762` pointed-arch mask, aligned to the generated stone opening at `69.2%` width. The bottom rounding, inset border, and inner shadow that kept the photo away from the stone edge were removed. Post-fix browser evidence remains blocked because no browser surface is available.

## Primary interactions pending browser verification

- Organization-photo selection parity in the design preview
- Drag and zoom behavior inside the arched photo frame
- Upload card file picker, review, progress, retry, and success states
- Mobile, tablet, and desktop overflow checks
- Browser console error review

## Follow-up polish

None classified until a rendered comparison is available.

final result: blocked

---

# 02 Velvet Flow Wedding — Visual QA (2026-10-24)

- Source visual truth: `public/wedding-designs/02_Velvet_Flow.png`
- Decorative asset: `public/wedding-designs/velvet-flow-background.webp`
- Intended implementation route: `/wedding/{slug}` with `pageTemplate: velvet-flow`
- Intended viewport: mobile portrait, responsive through tablet and desktop
- Source pixels: `248 × 511`
- Implementation screenshot: not captured
- CSS viewport and density: not measured because no browser surface was available
- State: Velvet Flow template, upload enabled, idle upload card

## Full-view comparison evidence

Blocked. The source reference and generated velvet/rose background were opened and inspected, but the computer-use inventory exposed no browser. A browser-rendered implementation screenshot could not be captured for direct comparison.

## Focused region comparison evidence

Blocked. The gold title hierarchy, velvet folds, rose density, upload-panel proportions, controls, and responsive composition require browser-rendered evidence.

## Findings

- [P1] Browser-rendered Velvet Flow evidence is missing.
  - Location: `/wedding/{slug}`, Velvet Flow template.
  - Evidence: typecheck, lint, automated tests, and production build pass; these checks do not establish pixel-level fidelity to `02_Velvet_Flow.png`.
  - Impact: spacing, type scale, background crop, or upload-card density differences may remain.
  - Fix: capture the idle state at the source aspect ratio plus representative mobile, tablet, and desktop widths; compare it with the source and correct all P0/P1/P2 differences.

## Required fidelity surfaces

- Fonts and typography: gold display hierarchy and compact uppercase UI copy implemented; rendered comparison pending.
- Spacing and layout rhythm: reference-style upper identity region and lower upload panel implemented; rendered comparison pending.
- Colors and visual tokens: oxblood, burgundy, warm gold, and cream palette implemented; rendered comparison pending.
- Image quality and asset fidelity: dedicated optimized WebP velvet/rose background generated from the source art direction; rendered crop comparison pending.
- Copy and content: organization title, date, saved Wedding message, and upload copy remain dynamic; rendered wrapping comparison pending.

## Comparison history

- Initial pass: blocked before rendered comparison because no browser was available.

## Primary interactions pending browser verification

- Template selection and admin preview parity
- Upload file picker, review, progress, retry, and success states
- Input focus, hover, and drag-and-drop states
- Mobile, tablet, and desktop overflow checks
- Browser console error review

## Follow-up polish

None classified until a rendered comparison is available.

final result: blocked

---

# 07 Retro Romance Wedding — Visual QA (2026-10-24)

- Source visual truth: `public/wedding-designs/07_Retro_Romance.png`
- Decorative asset: `public/wedding-designs/retro-romance-background.webp`
- Intended implementation route: `/wedding/{slug}` with `pageTemplate: retro-romance`
- Intended viewport: mobile portrait, responsive through tablet and desktop
- Source pixels: `248 × 507`
- Implementation screenshot: not captured
- CSS viewport and density: not measured because no browser surface was available
- State: Retro Romance template, organization photo selected, upload enabled, idle upload card

## Full-view comparison evidence

Blocked. The source reference and generated decorative background were opened and inspected, but the computer-use inventory exposed no browser. A browser-rendered implementation screenshot could not be captured for direct comparison.

## Focused region comparison evidence

Blocked. The fixed 3:2 Polaroid crop, typography, floral edge density, terracotta upload card, form controls, and responsive composition require browser-rendered evidence.

## Findings

- [P1] Browser-rendered Retro Romance evidence is missing.
  - Location: `/wedding/{slug}`, Retro Romance template.
  - Evidence: typecheck, lint, automated tests, and production build pass; these checks do not establish pixel-level fidelity to `07_Retro_Romance.png`.
  - Impact: spacing, photo scale, text wrapping, or card density differences may remain.
  - Fix: capture the idle state at the source aspect ratio plus representative mobile, tablet, and desktop widths; compare it with the source and correct all P0/P1/P2 differences.

## Required fidelity surfaces

- Fonts and typography: implemented with the product display font and reference hierarchy; rendered comparison pending.
- Spacing and layout rhythm: fixed 3:2 photo frame and isolated responsive stage implemented; rendered comparison pending.
- Colors and visual tokens: cream, burgundy, terracotta, and warm-gold palette implemented; rendered comparison pending.
- Image quality and asset fidelity: dedicated 1200px WebP floral/candle background generated from the source art direction; rendered crop comparison pending.
- Copy and content: organization title, date, saved Wedding message, and upload copy remain dynamic; rendered wrapping comparison pending.

## Comparison history

- Initial pass: blocked before rendered comparison because no browser was available.

## Primary interactions pending browser verification

- Template and organization-photo selection parity in the admin preview
- Drag and zoom behavior inside the fixed Polaroid frame
- Upload card file picker, review, progress, retry, and success states
- Mobile, tablet, and desktop overflow checks
- Browser console error review

## Follow-up polish

None classified until a rendered comparison is available.

final result: blocked

---

# 09 Cinematic Wedding — Visual QA (2026-10-24)

- Source visual truth: `public/wedding-designs/09_Cinematic.png`
- Implementation route: `/wedding/cinematic-preview` against an isolated disposable database fixture
- Intended viewport: mobile portrait, full dynamic viewport height
- Source pixels: `248 × 507`
- Implementation pixels: not captured
- CSS viewport and density: not measured because no browser surface was available
- State: Cinematic template, upload enabled, idle upload card

## Full-view comparison evidence

Blocked. The source image was opened and inspected, and the isolated implementation route returned HTTP 200, but the computer-use inventory exposed no browser. A rendered implementation screenshot could not be captured.

## Focused region comparison evidence

Blocked. The full-screen couple-photo crop, title/date overlay, translucent upload card, inputs, privacy copy, and mobile safe-area behavior require browser-rendered evidence.

## Findings

- [P1] Browser-rendered Cinematic evidence is missing.
  - Location: `/wedding/{slug}`, Cinematic template.
  - Evidence: typecheck, lint, automated tests, production build, and the isolated HTTP route pass; these checks do not establish visual fidelity.
  - Impact: viewport-height, card overlap, image crop, or small-screen density differences may remain.
  - Fix: capture the idle state at the reference mobile ratio and a modern mobile viewport, compare it with `09_Cinematic.png`, then correct all P0/P1/P2 differences.

## Comparison history

- Initial pass: blocked before rendered comparison because no browser was available.

## Primary interactions pending browser verification

- Open the file picker from the upload card
- Drag-and-drop hover state on desktop
- Selected-media review state
- Name and message input focus states
- Upload progress, error/retry, and success states
- Editor preview parity and photo drag/zoom behavior
- Browser console error review

## Follow-up polish

None classified until a rendered comparison is available.

final result: blocked

---

# 03 Botanical Wedding — Visual QA (2026-10-24)

- Source visual truth: `public/wedding-designs/03_Botanical.png`
- Implementation route: `/wedding/{slug}`, `botanical` template
- Intended viewport: source-like mobile portrait plus representative mobile, tablet, and desktop widths
- Source pixels: `247 × 511`
- Generated decorative asset: `public/wedding-designs/botanical-background.webp`, `1120 × 1990`
- Implementation screenshot: not captured
- CSS viewport and density: not measured because no browser surface was available
- State: dynamic organization copy with idle upload card

## Full-view comparison evidence

Blocked. The reference was opened and inspected, and the implementation passes typecheck, lint, automated tests, and the production build. The available computer-use inventory contains no browser, so a rendered implementation screenshot could not be captured and placed beside the source.

## Focused region comparison evidence

Blocked. The floral border crop, title/date/message hierarchy, cream upload card, field spacing, privacy copy, and green submit button require browser-rendered evidence at matching dimensions.

## Findings

- [P1] Browser-rendered Botanical evidence is missing.
  - Location: `/wedding/{slug}`, Botanical template.
  - Evidence: technical checks pass, but they cannot establish visual fidelity to `03_Botanical.png`.
  - Impact: floral density, vertical rhythm, text wrapping, and card sizing may still differ visibly.
  - Fix: capture the idle template at the source aspect ratio and representative responsive widths, compare it with the source in one view, and correct every P0/P1/P2 mismatch.

## Required fidelity surfaces

- Fonts and typography: editorial serif hierarchy and compact uppercase date treatment are implemented; rendered weight and wrapping comparison is pending.
- Spacing and layout rhythm: centered copy and lower upload-card composition are implemented; rendered comparison is pending.
- Colors and visual tokens: ivory paper, dark botanical green, and translucent cream card treatments are implemented; rendered sampling is pending.
- Image quality and asset fidelity: a dedicated `1120 × 1990` WebP floral background was generated from the supplied reference; its edge crop and flower scale remain unverified.
- Copy and content: organization title, date, saved Wedding message, upload labels, inputs, privacy copy, and submit action remain dynamic; rendered wrapping is pending.

## Comparison history

- Initial pass: blocked before rendered comparison because no browser was available.

## Primary interactions pending browser verification

- Upload card file picker and drag-and-drop state
- Selected-media review, progress, retry, and success states
- Name and message input focus states
- Mobile, tablet, and desktop overflow checks
- Browser console error review

## Follow-up polish

None classified until a rendered comparison is available.

final result: blocked

---

# 05 Aurora Wedding — Visual QA (2026-10-24)

- Source visual truth: `public/wedding-designs/05_Aurora.png`
- Implementation route: `/wedding/{slug}`, `aurora` template
- Intended viewport: source-like mobile portrait plus representative mobile, tablet, and desktop widths
- Source pixels: `247 × 511`
- Generated decorative asset: `public/wedding-designs/aurora-background.webp`, `1120 × 1990`
- Implementation screenshot: not captured
- CSS viewport and density: not measured because no browser surface was available
- State: dynamic organization copy with idle upload card

## Full-view comparison evidence

Blocked. The supplied reference was opened and inspected. The implementation passes typecheck, lint, automated tests, and the production build, but the available computer-use inventory contains no browser. A rendered implementation screenshot could not be captured and placed beside the source.

## Focused region comparison evidence

Blocked. The rose-onyx crop, gold-vein scale, monogram, typography, translucent upload card, field spacing, and burgundy submit treatment require browser-rendered evidence at matching dimensions.

## Findings

- [P1] Browser-rendered Aurora evidence is missing.
  - Location: `/wedding/{slug}`, Aurora template.
  - Evidence: technical checks pass, but they cannot establish pixel-level fidelity to `05_Aurora.png`.
  - Impact: marble framing, vertical rhythm, typography, form density, and responsive overflow may still differ visibly.
  - Fix: capture the idle template at the source aspect ratio and representative responsive widths, compare it with the source in one view, and correct every P0/P1/P2 mismatch.

## Required fidelity surfaces

- Fonts and typography: editorial serif hierarchy, compact uppercase date, and dynamic initials are implemented; rendered weight and wrapping comparison is pending.
- Spacing and layout rhythm: upper copy group and lower translucent upload-card composition are implemented; rendered comparison is pending.
- Colors and visual tokens: blush onyx, metallic-gold veining, burgundy type, and rose-glass card treatment are implemented; rendered sampling is pending.
- Image quality and asset fidelity: a dedicated `1120 × 1990` WebP rose-onyx background was generated from the supplied reference; its crop and vein scale remain unverified.
- Copy and content: dynamic title, initials, date, saved Wedding message, upload labels, inputs, privacy copy, and submit action are implemented; rendered wrapping is pending.

## Comparison history

- Initial pass: blocked before rendered comparison because no browser was available.

## Primary interactions pending browser verification

- Upload card file picker and drag-and-drop state
- Selected-media review, progress, retry, and success states
- Name and message input focus states
- Mobile, tablet, and desktop overflow checks
- Browser console error review

## Follow-up polish

None classified until a rendered comparison is available.

final result: blocked
# Velvet Flow Landscape Mini Burgundy — Visual QA (2026-10-27)

- Source visual truth: `public/design-reference/02-velvet-flow.png` and the approved Velvet Flow portrait-mini burgundy composition.
- Generated background: `public/design-center/templates/velvet-flow/burgundy/landscape-mini/velvet-flow-burgundy-landscape-mini-front-base-clean.png`.
- Rendered implementation: `output/design-center/velvet-flow/burgundy/landscape-mini/velvet-flow-burgundy-landscape-mini-front-composed-preview.png`.
- Intended format: 10 × 7.5 cm landscape mini card, 300 DPI, front-face preview.
- State: draft preview with representative QR target and sample organization copy.

## Visual comparison

- Velvet Flow identity: passed — deep burgundy velvet, sculptural left fold and gold piping remain consistent with the selected reference.
- Landscape composition: passed — the fold occupies the left third without stretching; editable content uses the calm right field.
- Typography: passed — Cormorant Garamond, Allura and Cinzel reproduce the reference hierarchy.
- Safe-area composition: passed — logo, copy, QR, icons and footer remain inside the 5 mm safe box.
- QR presentation: passed for preview — high-contrast black/white QR with four-module quiet zone; production target and physical scan proof remain pending.
- Text fit: passed — Turkish sample copy renders without clipping or overflow.

## Result

final result: passed

## Reference-led front/back revision — 2026-10-27

- Front reference: `C:/Users/onurt/Downloads/Bordo kadife dokulu QR düğün kartı.png`.
- Back reference: `C:/Users/onurt/Downloads/Burgonya ve altın kurdeleli QR düğün kartı.png`.
- Both references were treated as visual sources only.
- Front: passed — headline, Allura script line, supporting copy, framed QR, three media icons, CTA, divider, names and date follow the supplied composition.
- Back: passed — centered brand, large framed QR, CTA, divider, names and date follow the supplied composition.
- QR framing: passed — both faces use a cream quiet-zone field with a gold rounded outline.
- Print geometry: passed — 100 × 75 mm trim, 3 mm bleed, 106 × 81 mm PDF pages, 300 DPI source.
- Physical print approval: pending — a real proof and multi-device scan test are still required.

final result: passed

# Velvet Flow 50 × 70 cm karşılama tabelası — 2026-10-27

- Kapsam: yalnızca ön yüz; bordo, obsidyen siyah, gece laciverti, zümrüt ve klasik krem.
- Net kesim: 500 × 700 mm; taşmalı PDF: 506 × 706 mm; taşma: 3 mm; içerik güvenliği: 15 mm.
- Raster: 5976 × 8339 px, 300 DPI.
- QR: 155,79 mm; H hata düzeltme; 4 modül sessiz alan; açık zemin ve altın/bordo dış çerçeve.
- Otomatik kontrol: 5/5 raster ve PDF ölçüsü geçti; `yarn typecheck`, `yarn lint` ve 58/58 test geçti.
- Görsel kontrol: tüm metinler, Türkçe karakterler, logo, QR çerçevesi ve ikonlar beş varyantta incelendi.
- Baskı öncesi kalan onay: örnek QR hedefi gerçek etkinlik URL’siyle değiştirilmeli; matbaa renk profili ve fiziksel prova insan tarafından onaylanmalı.

# Velvet Flow onaylı fiziksel ürün sunumları — 2026-10-27

- Yatay mini QR: bordo, obsidyen siyah, gece laciverti, zümrüt ve klasik krem olmak üzere 5 fotogerçekçi ön/arka kart sunumu.
- 50 × 70 cm karşılama tabelası: aynı 5 renk için siyah şövale üzerinde fotogerçekçi salon sunumu.
- Tasarım Merkezi: Fiziksel QR Ürünleri içinde iki ayrı onaylı görsel galeri.
- Sunum görselleri baskı dosyası değildir; baskı sanatları ve PDF’ler ayrı kaynak olarak korunur.

# Velvet Flow dikey mini sunumları — 2026-10-27

- 7,5 × 10 cm dikey mini kart için bordo, obsidyen siyah, gece laciverti, zümrüt ve klasik krem sunumları oluşturuldu.
- Her sunum ön ve arka yüzü, fiziksel kart ayağı, masa gölgesi ve yansımasıyla gösterir.
- Tasarım Merkezi > Fiziksel QR Ürünleri galerisine eklendi.
- Sunum QR’ları görsel amaçlıdır; baskı ve tarama için üretim dosyaları kullanılmalıdır.

