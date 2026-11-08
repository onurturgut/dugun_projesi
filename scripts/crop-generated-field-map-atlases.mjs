import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve("public/design-center/field-map/generated");
const atlasRoot = path.join(root, "atlases");
const outputRoot = path.join(root, "faces");
const variants = {
  "velvet-flow": ["burgundy", "black", "navy", "emerald", "cream"],
  botanical: ["sage", "cream", "blush", "blue", "black"],
  "modern-arch": ["cream", "blush", "sage", "blue", "black"],
  aurora: ["rose", "blue", "cream", "green", "lavender"],
};
const formats = ["landscape-mini", "portrait-mini", "welcome-sign-500x700"];

await mkdir(outputRoot, { recursive: true });
const files = await readdir(atlasRoot);
for (const collection of Object.keys(variants)) {
  for (const format of formats) {
    const name = `${collection}-${format}-v1.png`;
    if (!files.includes(name)) throw new Error(`Atlas missing: ${name}`);
    const trimmed = await sharp(path.join(atlasRoot, name))
      .trim({ background: "#ffffff", threshold: 12 })
      .png()
      .toBuffer({ resolveWithObject: true });
    const cellWidth = Math.floor(trimmed.info.width / 2);
    const cellHeight = Math.floor(trimmed.info.height / 5);
    for (let row = 0; row < 5; row++) {
      for (let column = 0; column < 2; column++) {
        const face = column === 0 ? "front" : "back";
        const left = column * cellWidth;
        const top = row * cellHeight;
        const width = column === 1 ? trimmed.info.width - left : cellWidth;
        const height = row === 4 ? trimmed.info.height - top : cellHeight;
        const cell = await sharp(trimmed.data)
          .extract({
            left,
            top,
            width,
            height,
          })
          .png({ compressionLevel: 9 })
          .toBuffer();
        await sharp(cell).toFile(
          path.join(
            outputRoot,
            `${collection}-${variants[collection][row]}-${format}-${face}-v1.png`,
          ),
        );
      }
    }
  }
}
