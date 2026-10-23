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
