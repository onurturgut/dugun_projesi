# Botanical 3D Presentation QA

## Evidence

- Source visual truth: `public/design-center/presentations/velvet-flow/landscape-mini/velvet-flow-burgundy-landscape-mini-presentation.png`
- Implementation: `public/design-center/presentations/botanical/landscape-mini/botanical-sage-landscape-mini-presentation.png`
- Comparison: `output/design-qa/botanical-landscape-reference-comparison.png`
- Viewport and pixels: source and implementation are 1536 × 1024 px at 1× density.
- Source visual truth: `public/design-center/presentations/velvet-flow/welcome-sign-500x700/velvet-flow-burgundy-welcome-sign-presentation.png`
- Implementation: `public/design-center/presentations/botanical/welcome-sign-500x700/botanical-sage-welcome-sign-presentation.png`
- Comparison: `output/design-qa/botanical-welcome-reference-comparison.png`
- Viewport and pixels: source and implementation are 1060 × 1484 px at 1× density.
- State: static Design Center presentation gallery assets.
- Portrait implementation: `public/design-center/presentations/botanical/portrait-mini/botanical-sage-portrait-mini-presentation-v4.png` (1536 × 1024 px).
- Table-card implementation: `public/design-center/presentations/botanical/table-card-150x200/botanical-sage-table-card-presentation.png` (1536 × 1024 px).
- Reusable scene contract: `public/design-center/mockups/shared/` contains blank portrait mini, landscape mini, table-card, and welcome-sign photographic scenes. New collections reuse these surfaces and supply their own exact front/back print artwork.

## Full-view comparison

- Landscape cards use a dedicated blank professional 3D scene derived from the Velvet Flow reference, preserving its camera perspective, card scale, overlap, tent-card depth, warm lighting, depth of field, contact shadows, cardstock edges, and surface reflection.
- Welcome sign uses a dedicated blank professional 3D scene derived from the Velvet Flow reference, preserving its venue framing, easel geometry, rigid-board thickness, perspective, lighting, depth of field, and floor reflection.
- Portrait mini cards use two folded tent-card surfaces with complementary front/back views, visible cardstock thickness, contact shadows, and candlelit reflections.
- Table QR cards use two rigid 15 × 20 cm display surfaces on discreet holders with complementary front/back views, visible board thickness, contact shadows, and table reflections.
- Botanical artwork, colors, typography, QR, and copy remain collection-specific rather than copying Velvet Flow branding.

## Focused-region comparison

- Card and board edges were inspected after the final perspective pass. Clean blank 3D surfaces keep their physical bevels and thickness visible around the exact Botanical artwork.
- QR modules remain crisp and readable after perspective mapping.
- Botanical paper texture and florals retain sufficient detail across sage and black contrast extremes.

## Required fidelity surfaces

- Fonts and typography: Botanical hierarchy is preserved; perspective follows the reference surface. Minor type-size differences are intentional collection styling.
- Spacing and layout rhythm: product bounds, scene framing, overlap, and board placement match the Velvet Flow reference.
- Colors and visual tokens: generated blank scenes follow the reference lighting; scene luminance and warmth are transferred onto the Botanical surfaces while collection colors remain recognizable.
- Image quality and asset fidelity: source Botanical raster artwork is mapped directly; no placeholder, CSS art, or regenerated flower artwork is used.
- Copy and content: Botanical sample copy and QR content are preserved.

## Comparison history

1. P1: first version used a flat neutral mockup and did not match Velvet Flow's photographic 3D scene. Fixed with perspective-mapped Botanical surfaces in photographic wedding scenes.
2. P2: direct surface replacement still looked two-dimensional and inherited thin burgundy reference edges. Fixed by generating clean blank 3D product scenes with real cardstock/board thickness, contact shadows, bevels, and reflections, then compositing exact Botanical artwork.
3. Post-fix evidence: both side-by-side comparison files listed above show the professional 3D geometry, clean edges, scene-integrated lighting, and preserved artwork.

## Findings

- No actionable P0, P1, or P2 differences remain.
- P3: Botanical's lighter typographic hierarchy appears quieter than Velvet Flow by design; this preserves the collection's natural character.

## Verification note

- These are static image assets, not an interactive browser prototype; browser interactions and console checks are not applicable.

final result: passed

# Dijital Davetiye Editörü QA — 2026-11-09

## Evidence

- Source interaction reference: `C:/Users/onurt/Videos/Ekran Kayıtları/Ekran Kaydı 2026-11-08 182344.mp4`.
- Source phone frame: `C:/Users/onurt/Downloads/realistic-front-view-smartphone-mockup-mobile-iphone-purple-frame-with-blank-white-display-vector/phone_14_01.jpg` and EPS counterpart.
- Source theme: `C:/Users/onurt/OneDrive/Masaüstü/dijital_davetiye.zip`.
- Implementation: `/admin/[id]/invitation` editor and `/invitation/[slug]` published experience.

## Verification note

- Production compilation, TypeScript, ESLint and automated business-rule tests pass.
- The available computer-use environment reported no browser surfaces, so a same-viewport rendered screenshot, console inspection and source-versus-implementation visual comparison could not be completed.
- Before visual approval, inspect desktop and mobile editor states, all four editor tabs, phone scrolling, autosave status transitions and the published invitation route in a browser.

final result: blocked - browser surface unavailable for the required rendered visual comparison

---

# Minimal Krem 50x70 Karşılama Tabelası QA - 2026-11-03

## Evidence

- Clean background sources: `Krem Kâğıtta Altın QR Çerçevesi-2.png` and `Krem zeminli altın çizgili davetiye şablonu-1.png`.
- Browser-rendered proof: `output/design-center/modern-arch/cream/welcome-sign-500x700/minimal-cream-welcome-sign-proof.png`.
- One-page control PDF: `output/design-center/modern-arch/cream/welcome-sign-500x700/minimal-cream-welcome-sign-control.pdf`.
- Design Center presentation: `public/design-center/presentations/modern-arch/welcome-sign-500x700/modern-arch-cream-welcome-sign-500x700-uploaded-v1-presentation.png`.

## Findings

- The 506 x 706 mm media, 500 x 700 mm trim, 3 mm bleed and 5 mm internal safe-area contract passes automated preflight.
- The browser preview, PDF and 3D presentation use the same master coordinates and dynamic QR target.
- The supplied 1060 x 1484 px raster base resolves to approximately 53.85 DPI at 500 x 700 mm. It is suitable for visual approval but not a true 300 DPI production background.
- A complete flattened final reference was not supplied, so exact pixel-level fidelity of the final composed typography cannot be certified against a separate approved reference.

## Verification note

- Type checking passed.
- 33 design and PDF preflight tests passed.
- Browser proof and 3D presentation were visually inspected; no clipping or overlap was found.
- PDF geometry and page boxes were verified by automated preflight. Poppler was unavailable, so a separate PDF-to-PNG visual render could not be completed in this environment.

final result: blocked - replace the background with a 300 DPI source of at least 5976 x 8339 px and approve the composed proof before production release

---

# Minimal Yatay Mini QR — Beş Renk QA — 2026-11-03

## Evidence

- Source visual targets: `public/design-center/source-art/modern-arch/landscape-mini/*-presentation-source.png`.
- Combined implementation evidence: `output/pdf/shineqr-minimal-landscape-five-variants-qa.png` (Cream, Blush, Sage, Blue, Black).
- Print artifacts: `output/pdf/shineqr-minimal-*-landscape-100x75mm-proof.pdf`.
- State: Minimal / 100 × 75 mm Yatay Mini QR / ön ve arka yüz / beş renk.

## Required fidelity surfaces

- Fonts and typography: bütün renklerde Montserrat Light başlık, Montserrat Regular açıklama ve Allura script korunuyor.
- Spacing and layout rhythm: beş varyasyon aynı master koordinatları, 100 × 75 mm kesim ve 3 mm taşma alanını kullanıyor.
- Colors and visual tokens: krem, pudra, adaçayı, mavi ve siyah zeminler ayrı üretildi; altın çizgiler korunuyor. Siyah varyasyonda metin açık krem.
- Image quality and asset fidelity: on zemin dosyasının tamamı 1252 × 957 px ve 300 DPI.
- Copy and content: müşteri metinleri ve gerçek QR hedefi tüm varyasyonlarda dinamik.

## Comparison history

1. P1: ilk siyah dönüşümde sıcak krem zemin altın maske olarak yanlış algılandı ve açık kaldı.
2. Düzeltme: altın piksel maskesi yalnızca gerçek metalik çizgileri koruyacak biçimde daraltıldı.
3. Son kanıt: birleşik QA görselinde siyah zemin temiz ve metin kontrastı yeterli; diğer dört renk de tutarlı.

## Findings

- No actionable P0, P1, or P2 mismatch remains.
- Beş QR kodun tamamı render edilmiş PDF üzerinden doğru varyasyon URL’siyle tarandı.

final result: passed

---

# Minimal Krem Yatay Mini QR Font Eşleştirmesi — 2026-11-03

## Evidence

- Source visual truth: `public/design-center/source-art/modern-arch/landscape-mini/cream-presentation-source.png` (1536 × 1024 px).
- Rendered implementation: `output/pdf/shineqr-minimal-cream-landscape-front-preview.png` and `output/pdf/shineqr-minimal-cream-landscape-back-preview.png`.
- State: Minimal / Krem / 100 × 75 mm yatay mini QR, ön ve arka yüz.

## Required fidelity surfaces

- Fonts and typography: başlık Montserrat Light (300), açıklama Montserrat Regular (400), script Allura. Önceki Montserrat Bold (700) kaldırıldı.
- Spacing and layout rhythm: ağırlık değişimi mevcut satır kırılımlarını, QR yerleşimini ve güvenli alanı değiştirmedi.
- Colors and visual tokens: referanstaki siyah metin, altın script ve krem zemin korunuyor.
- Image quality and asset fidelity: 300 DPI zemin ile vektör metin/QR üretimi korunuyor.
- Copy and content: müşteri tarafından düzenlenebilir metinler değişmedi.

## Findings

- Bold sürüm referanstan belirgin biçimde ağırdı; Light/Regular eşleştirmesiyle düzeltildi.
- Son renderlarda taşma, çakışma veya okunabilirlik sorunu görülmedi.

## Comparison history

1. P2: başlık ve açıklamanın Bold (700) olması sunum dosyasındaki zarif tipografiyle uyuşmuyordu.
2. Düzeltme: başlık 300, açıklama 400 ağırlığına alındı.
3. Son kanıt: ön/arka PDF renderları referanstaki ağırlık ve hiyerarşiyi yeniden sağlıyor.

final result: passed

---

# Minimal Krem Yatay Mini QR QA — 2026-11-03

## Evidence

- Source visual truth: user-provided Minimal Krem landscape card mockup (front/back pair, 812 × 582 px in conversation).
- Rendered implementation: `output/pdf/shineqr-minimal-cream-landscape-front-preview.png` and `output/pdf/shineqr-minimal-cream-landscape-back-preview.png` (106 × 81 mm page renders at 3× PDF rasterization).
- Print artifact: `output/pdf/shineqr-minimal-cream-landscape-100x75mm-proof.pdf`.
- State: Minimal / Krem / 10 × 7.5 cm Yatay Mini QR; ELA & DENİZ; 14 EYLÜL 2026; real test target `https://shineqr.com/q/minimal-cream-landscape-kontrol`.

## Required fidelity surfaces

- Fonts and typography: Montserrat Light, Montserrat Regular, and Allura reproduce the reference’s light geometric heading, compact metadata, and gold script hierarchy; font files are embedded in the PDF.
- Spacing and layout rhythm: front uses the reference split composition (copy left, framed QR right); back uses centered logo, two-line heading, script, message, divider, names, and date.
- Colors and visual tokens: warm cream paper texture, near-black ink, and restrained gold curves/logo/script/frame match the approved Minimal direction.
- Image quality and asset fidelity: the background is a dedicated 1252 × 957 px, 300 DPI print base; logo, type, divider, and QR remain vector in the PDF.
- Copy and content: names, date, front hook/description/CTA, back message, and QR target remain customer-driven.

## Comparison history

1. P2: the first print render omitted the visible gold QR frame. Fixed by adding the frame to both browser SVG and print PDF output.
2. Post-fix evidence: the revised front render shows the gold frame and the rendered QR decodes to the expected ShineQR URL.

## Findings

- No actionable P0, P1, or P2 mismatch remains.
- P3: PDF-lib renders the print frame with square corners, while the live SVG preview uses the reference-like 2 mm radius; this does not affect trim, QR quiet zone, or scan reliability.

## Verification note

- Static print artwork was validated from the generated PDF. Interactive browser states are outside this print-output comparison.

final result: passed

---

# Minimal Beş Renk Baskı Serisi QA — 2026-11-03

## Evidence

- Approved layout source: the Minimal Krem master documented in the preceding QA section.
- Implementations: Cream, Blush, Sage, Blue, and Black front/back PDF renders in `output/pdf/shineqr-minimal-*-preview.png`.
- Combined comparison: `output/pdf/shineqr-minimal-five-variants-qa.png` (1255 × 656 px).
- Print artifacts: `output/pdf/shineqr-minimal-*-75x100mm-proof.pdf`.
- State: Minimal / Dikey Mini QR / five selectable color variants, identical customer copy and real per-variant QR targets.

## Required fidelity surfaces

- Fonts and typography: all variants share the approved Montserrat Light, Montserrat Regular, and Allura hierarchy and millimetric coordinates.
- Spacing and layout rhythm: all five variants inherit the approved 81 × 106 mm media, 75 × 100 mm trim, 34 mm frame, and 30.5 mm QR geometry.
- Colors and visual tokens: Cream retains its approved original 300 DPI files. Blush, Sage, and Blue use dark ink; Black uses warm off-white ink for production contrast. Gold logo, script, curves, frame, and divider remain consistent.
- Image quality and asset fidelity: every front/back base is 957 × 1252 px at 300 DPI. The original texture and gold curves are preserved; only the paper color changes.
- Copy and content: all customer-editable fields remain shared and dynamic across color changes.

## Full-view and focused comparison

- Full view: the combined sheet confirms identical geometry and hierarchy across all ten faces.
- Focused contrast check: Black uses `#f8f0df`/`#efe2cc` text and retains a white QR quiet zone; no dark-on-dark text remains.
- Focused QR check: all five QR codes decoded from their rendered print PDFs and returned the expected per-variant ShineQR URLs.

## Comparison history

1. P1 risk: applying the Cream dark text palette to Black would make production copy unreadable. Fixed with a variant-aware print and SVG palette.
2. P2 risk: regenerating Cream could alter the approved master. Fixed by restoring the approved 300 DPI front/back sources and limiting the color-base generator to the other four variants.
3. Post-fix evidence: all five PDFs pass preflight, all ten bases report 957 × 1252 px at 300 DPI, and all five QR scans pass.

## Findings

- No actionable P0, P1, or P2 mismatch remains.
- No P3 follow-up is required for this five-color expansion.

## Verification note

- Static print artwork was verified from generated PDFs; interactive browser states are not applicable to the print-output comparison.

final result: passed

---

# Minimal Krem Dikey Mini QR QA — 2026-11-02

## Evidence

- Source visual truth: `C:/Users/onurt/Downloads/Altın detaylı iki kartlı krem davetiye.png` (1536 × 1024 px, 1×).
- Rendered implementation: `output/pdf/shineqr-minimal-krem-front-preview.png` and `output/pdf/shineqr-minimal-krem-back-preview.png` (957 × 1252 px each, 300 DPI PDF render).
- Normalized comparison: `output/pdf/shineqr-minimal-krem-design-qa-normalized.png` (1800 × 640 px). Source card faces and implementation faces were normalized to equal displayed height before comparison.
- State: Minimal / Krem / 7.5 × 10 cm Dikey Mini QR; sample names ELA & DENİZ, 14 EYLÜL 2026; real test target `https://shineqr.com/q/minimal-krem-kontrol`.

## Required fidelity surfaces

- Fonts and typography: Montserrat Light is used for the large two-line headings, Montserrat Regular for body/CTA/names/date, and Allura for the script lines. Font files are embedded in the PDF. The reference font identity cannot be proven from pixels alone; these are the closest licensed project fonts and visually reproduce the reference hierarchy.
- Spacing and layout rhythm: front and back use the same 81 × 106 mm bleed canvas and 75 × 100 mm trim. The final pass moved the back script, description, divider, names, and date down to match the reference rhythm. The front title, script, description, QR frame, CTA, names, and date do not overlap.
- Colors and visual tokens: original cream texture and gold curves are unchanged. Text remains near-black, script/divider gold, and QR black on white.
- Image quality and asset fidelity: the supplied 300 DPI front/back raster bases remain unchanged; logo, QR, and typography are vector in the PDF. No replacement illustration or CSS-drawn approximation was introduced.
- Copy and content: reference sample copy is used only when the previous generic defaults are selected. Customer-edited names, date, hook, description, CTA, and back message remain dynamic.

## Full-view and focused comparison

- Full view: the normalized comparison confirms matching two-face hierarchy, enlarged title/script scale, prominent framed QR, and reference-like lower metadata grouping.
- Focused QR region: QR is a 30.5 mm square centered at x=25.25 mm, y=56.75 mm inside the 34 mm frame at x=23.5 mm, y=55 mm. It retains a four-module quiet zone and decoded successfully from the 300 DPI PDF render.
- Focused typography region: headings remain exactly two lines; back description remains two lines; no clipping or truncation is visible.

## Comparison history

1. P1: previous implementation used undersized headings and script, a 28.2 mm QR, and compressed hierarchy. Fixed by increasing the main headings to 21 pt, script to 24 pt, body/metadata sizes, and QR to 30.5 mm.
2. P2: first revised back face still placed the script, description, divider, and names 3–5 mm above the reference rhythm. Fixed by moving them to y=44, 55, 74, 81, and 87 mm respectively.
3. Post-fix evidence: the normalized comparison and 300 DPI front/back renders listed above show the revised proportions and spacing.

## Findings

- No actionable P0, P1, or P2 mismatch remains.
- P3: the source mockup uses a metallic photographic logo effect; the print PDF intentionally uses the approved single-color gold vector for predictable production, while the browser preview retains the metallic SVG.

## Verification note

- Static print artwork was validated from the generated PDF rather than an interactive browser viewport. Browser interactions and console states are not applicable to this PDF-focused comparison.

final result: passed
/// <reference types="next" />

## Bluebell digital invitation — 2026-11-09

- Reference: WhatsApp physical invitation photograph.
- Automated checks: TypeScript, ESLint, unit tests and production build passed.
- Source visual inspection: completed.
- Browser capture: blocked because no browser or app surface is available to the computer-use runtime in this session.
- Remaining check: inspect the authenticated editor theme switch, second-event controls and published wildcard subdomain at mobile and desktop widths.

final result: blocked

## Digital invitation catalog and studio — 2026-11-09

- Added a product-style theme catalog, theme detail preview, studio transition, organization-owned gallery picker, story controls and loading/animation settings.
- Automated checks: TypeScript, ESLint, unit tests and production build passed.
- Browser capture remains blocked because no browser or app surface is available to the computer-use runtime in this session.

final result: blocked
