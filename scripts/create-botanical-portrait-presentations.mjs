import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const variants = ["sage", "cream", "blush", "blue", "black"];
const outputRoot = path.join(root, "public/design-center/presentations/botanical/portrait-mini");
await fs.mkdir(outputRoot, { recursive: true });

const backdrop = Buffer.from(`<svg width="1536" height="1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f5f0e8"/><stop offset="1" stop-color="#d9d0c1"/></linearGradient>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dx="0" dy="24" stdDeviation="22" flood-color="#342b22" flood-opacity=".3"/></filter>
  </defs>
  <rect width="1536" height="1024" fill="url(#bg)"/>
  <ellipse cx="770" cy="885" rx="590" ry="64" fill="#4b4034" opacity=".12"/>
  <g opacity=".14" fill="#53604b"><path d="M0 0h380C245 78 170 176 118 322 82 207 43 112 0 74z"/><path d="M1536 1024h-360c115-82 201-178 260-315 28 117 61 208 100 271z"/></g>
  <rect x="228" y="120" width="1080" height="770" rx="36" fill="none" stroke="#786b5c" stroke-opacity=".2"/>
</svg>`);

for (const variant of variants) {
  const directory = path.join(root, "output/design-center/botanical", variant, "portrait-mini");
  const frontPath = path.join(directory, `botanical-${variant}-portrait-mini-front-composed-preview.png`);
  const backPath = path.join(directory, `botanical-${variant}-portrait-mini-back-composed-preview.png`);
  const front = await sharp(frontPath).resize(474, 620, { fit: "fill" }).extend({ top: 8, bottom: 8, left: 8, right: 8, background: "#fff" }).rotate(-4, { background: "#0000" }).png().toBuffer();
  const back = await sharp(backPath).resize(474, 620, { fit: "fill" }).extend({ top: 8, bottom: 8, left: 8, right: 8, background: "#fff" }).rotate(4, { background: "#0000" }).png().toBuffer();
  await sharp(backdrop)
    .composite([
      { input: Buffer.from(`<svg width="650" height="760" xmlns="http://www.w3.org/2000/svg"><rect x="68" y="55" width="500" height="650" rx="4" fill="#fff" filter="url(#s)"/><defs><filter id="s" x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dx="0" dy="22" stdDeviation="18" flood-opacity=".3"/></filter></defs></svg>`), left: 700, top: 125 },
      { input: Buffer.from(`<svg width="650" height="760" xmlns="http://www.w3.org/2000/svg"><rect x="68" y="55" width="500" height="650" rx="4" fill="#fff" filter="url(#s)"/><defs><filter id="s" x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dx="0" dy="22" stdDeviation="18" flood-opacity=".3"/></filter></defs></svg>`), left: 220, top: 150 },
      { input: back, left: 785, top: 165 },
      { input: front, left: 310, top: 190 }
    ])
    .png({ compressionLevel: 9 })
    .toFile(path.join(outputRoot, `botanical-${variant}-portrait-mini-presentation.png`));
}

console.log(`Created ${variants.length} Botanical portrait-mini presentation images.`);
