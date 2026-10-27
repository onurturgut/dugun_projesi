import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const sourcePath = path.join(root, "public/design-center/templates/velvet-flow/burgundy/welcome-sign-500x700/velvet-flow-burgundy-welcome-sign-reference-v1.png");
const variants = {
  burgundy: { folder: "burgundy", dark: [22, 0, 3], light: [142, 8, 20] },
  black: { folder: "obsidian-black", dark: [5, 5, 5], light: [82, 76, 70] },
  navy: { folder: "midnight-navy", dark: [0, 10, 24], light: [4, 68, 126] },
  emerald: { folder: "emerald", dark: [0, 17, 11], light: [2, 100, 62] },
  cream: { folder: "classic-cream", dark: [190, 158, 120], light: [248, 230, 202] }
};
const { data, info } = await sharp(sourcePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const mix = (start, end, amount) => start.map((value, index) => Math.round(value + (end[index] - value) * amount));
for (const [id, variant] of Object.entries(variants)) {
  const output = Buffer.from(data);
  for (let index = 0; index < output.length; index += 4) {
    const red = data[index], green = data[index + 1], blue = data[index + 2];
    const luminance = (red * 0.2126 + green * 0.7152 + blue * 0.0722) / 255;
    const warmMetal = red > 135 && green > 72 && green / Math.max(red, 1) > 0.42 && blue / Math.max(red, 1) < 0.55;
    if (warmMetal && id !== "cream") continue;
    const shaped = Math.min(1, Math.max(0, Math.pow(luminance * 1.65, id === "cream" ? 0.7 : 0.88)));
    const [nextRed, nextGreen, nextBlue] = mix(variant.dark, variant.light, shaped);
    output[index] = nextRed; output[index + 1] = nextGreen; output[index + 2] = nextBlue;
  }
  const directory = path.join(root, `public/design-center/templates/velvet-flow/${variant.folder}/welcome-sign-500x700`);
  await fs.mkdir(directory, { recursive: true });
  const file = path.join(directory, `velvet-flow-${variant.folder}-welcome-sign-front-base-clean.png`);
  await sharp(output, { raw: info }).resize(5976, 8339, { fit: "fill", kernel: sharp.kernel.lanczos3 }).png({ compressionLevel: 9 }).withMetadata({ density: 300 }).toFile(file);
  console.log(path.relative(root, file));
}
