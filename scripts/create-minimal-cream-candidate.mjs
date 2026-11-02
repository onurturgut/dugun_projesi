import fs from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";
import sharp from "sharp";

const root = process.cwd();
const width = 957;
const height = 1252;
const output = path.join(root, "public/design-center/candidates/modern-arch/cream/portrait-mini");
await fs.mkdir(output, { recursive: true });

const baseSvg = (face) => {
  const front = face === "front";
  return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="paper" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f6ead8"/><stop offset=".48" stop-color="#efe0c9"/><stop offset="1" stop-color="#e8d4b8"/></linearGradient>
      <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".72" numOctaves="4" seed="17"/><feColorMatrix values=".18 0 0 0 .82  0 .16 0 0 .78  0 0 .13 0 .70  0 0 0 .10 0"/><feBlend mode="multiply" in2="SourceGraphic"/></filter>
      <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#7b4b1e"/><stop offset=".32" stop-color="#d8ad68"/><stop offset=".55" stop-color="#8c5725"/><stop offset=".8" stop-color="#e2bd79"/><stop offset="1" stop-color="#6f421b"/></linearGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#paper)"/>
    <rect width="${width}" height="${height}" fill="#fff" filter="url(#grain)" opacity=".08" style="mix-blend-mode:multiply"/>
    ${front
      ? `<path d="M95 -30 C150 190 119 335 23 455 C-45 540 -26 670 126 746" fill="none" stroke="#6c3f1c" stroke-width="7" opacity=".24"/><path d="M95 -30 C150 190 119 335 23 455 C-45 540 -26 670 126 746" fill="none" stroke="url(#gold)" stroke-width="3"/><path d="M1015 455 C900 586 866 724 887 845 C908 968 866 1093 760 1286" fill="none" stroke="#6c3f1c" stroke-width="7" opacity=".24"/><path d="M1015 455 C900 586 866 724 887 845 C908 968 866 1093 760 1286" fill="none" stroke="url(#gold)" stroke-width="3"/>`
      : `<path d="M-55 225 C126 330 184 465 128 600 C72 735 126 884 292 1030" fill="none" stroke="#6c3f1c" stroke-width="7" opacity=".24"/><path d="M-55 225 C126 330 184 465 128 600 C72 735 126 884 292 1030" fill="none" stroke="url(#gold)" stroke-width="3"/><path d="M1030 -10 C824 185 782 356 861 507 C933 645 915 803 775 974" fill="none" stroke="#6c3f1c" stroke-width="7" opacity=".24"/><path d="M1030 -10 C824 185 782 356 861 507 C933 645 915 803 775 974" fill="none" stroke="url(#gold)" stroke-width="3"/>`}
  </svg>`);
};

const qrSvg = await QRCode.toString("https://shineqr.com/q/minimal-cream-approval", { type: "svg", margin: 4, errorCorrectionLevel: "M", color: { dark: "#251d17", light: "#f7ecdc" } });
const contentSvg = (face) => {
  if (face === "back") return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><g text-anchor="middle" fill="#34271e"><text x="478" y="145" font-family="Georgia" font-size="46" font-weight="700">S✦</text><text x="478" y="183" font-family="Arial" font-size="13" letter-spacing="6">SHINEQR</text><text x="478" y="455" font-family="Georgia" font-size="39" font-style="italic"><tspan x="478">Bu güzel günün anılarını</tspan><tspan x="478" dy="1.18em">bizimle paylaştığınız için</tspan><tspan x="478" dy="1.18em">teşekkür ederiz.</tspan></text><path d="M348 908H608" stroke="#9f743e" stroke-width="2"/><text x="478" y="970" font-family="Georgia" font-size="27" letter-spacing="4">ELA &amp; DENİZ</text><text x="478" y="1010" font-family="Arial" font-size="12" letter-spacing="3">14 HAZİRAN 2026</text></g></svg>`);
  const embedded = qrSvg.replace("<svg", `<svg x="348" y="485" width="262" height="262"`);
  return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><g text-anchor="middle" fill="#34271e"><text x="478" y="132" font-family="Georgia" font-size="46" font-weight="700">S✦</text><text x="478" y="170" font-family="Arial" font-size="13" letter-spacing="6">SHINEQR</text><text x="478" y="295" font-family="Georgia" font-size="46"><tspan x="478">Bir kare de</tspan><tspan x="478" dy="1.05em">senden olsun.</tspan></text><text x="478" y="408" font-family="Georgia" font-size="20" font-style="italic">Fotoğraf ve videolarını bizimle paylaş.</text></g>${embedded}<g text-anchor="middle" fill="#34271e"><text x="478" y="805" font-family="Arial" font-size="14" font-weight="700" letter-spacing="2">QR KODU OKUT VE ANILARINI YÜKLE</text><path d="M348 908H608" stroke="#9f743e" stroke-width="2"/><text x="478" y="970" font-family="Georgia" font-size="27" letter-spacing="4">ELA &amp; DENİZ</text><text x="478" y="1010" font-family="Arial" font-size="12" letter-spacing="3">14 HAZİRAN 2026</text></g></svg>`);
};

const proofs = {};
for (const face of ["front", "back"]) {
  const basePath = path.join(output, `minimal-cream-portrait-mini-${face}-base-clean.png`);
  await sharp(baseSvg(face)).withMetadata({ density: 300 }).png({ compressionLevel: 9 }).toFile(basePath);
  proofs[face] = await sharp(basePath).composite([{ input: contentSvg(face) }]).withMetadata({ density: 300 }).png({ compressionLevel: 9 }).toBuffer();
  await sharp(proofs[face]).toFile(path.join(output, `minimal-cream-portrait-mini-${face}-approval.png`));
}

const cardWidth = 478, cardHeight = 626;
const preview = await sharp({ create: { width: 1280, height: 820, channels: 4, background: "#e9dfd1" } })
  .composite([
    { input: Buffer.from(`<svg width="1280" height="820" xmlns="http://www.w3.org/2000/svg"><rect width="1280" height="820" fill="#e9dfd1"/><text x="640" y="65" text-anchor="middle" font-family="Georgia" font-size="32" fill="#2b211a">Minimal · Krem · Dikey Mini QR</text><text x="640" y="96" text-anchor="middle" font-family="Arial" font-size="14" letter-spacing="2" fill="#705d4e">İLK ONAY ÇALIŞMASI · ÖN / ARKA YÜZ</text><rect x="116" y="135" width="478" height="626" rx="4" fill="#000" opacity=".16"/><rect x="686" y="135" width="478" height="626" rx="4" fill="#000" opacity=".16"/></svg>`), top: 0, left: 0 },
    { input: await sharp(proofs.front).resize(cardWidth, cardHeight).png().toBuffer(), top: 123, left: 104 },
    { input: await sharp(proofs.back).resize(cardWidth, cardHeight).png().toBuffer(), top: 123, left: 674 },
  ]).png().toBuffer();
await sharp(preview).toFile(path.join(output, "minimal-cream-portrait-mini-approval-board.png"));
console.log(output);
