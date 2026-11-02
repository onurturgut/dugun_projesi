import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const variants = {
  blush: [242, 211, 207],
  sage: [216, 221, 200],
  blue: [220, 236, 246],
  black: [27, 27, 27],
};
const sourceDir = "public/design-center/templates/modern-arch/cream/portrait-mini";

for (const face of ["front", "back"]) {
  const source = path.join(sourceDir, `minimal-cream-portrait-mini-${face}-base-clean.png`);
  const { data, info } = await sharp(source).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  for (const [variant, target] of Object.entries(variants)) {
    const output = Buffer.from(data);
    for (let index = 0; index < output.length; index += 3) {
      const red = data[index], green = data[index + 1], blue = data[index + 2];
      const goldCurve = red > green * 1.06 && green > blue * 1.04 && red - blue > 22;
      if (goldCurve) continue;
      const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
      const texture = (luminance - 237) * (variant === "black" ? 0.12 : 0.42);
      output[index] = Math.max(0, Math.min(255, target[0] + texture));
      output[index + 1] = Math.max(0, Math.min(255, target[1] + texture));
      output[index + 2] = Math.max(0, Math.min(255, target[2] + texture));
    }
    const outputDir = `public/design-center/templates/modern-arch/${variant}/portrait-mini`;
    await fs.mkdir(outputDir, { recursive: true });
    await sharp(output, { raw: info }).withMetadata({ density: 300 }).png({ compressionLevel: 9 }).toFile(
      path.join(outputDir, `minimal-${variant}-portrait-mini-${face}-base-clean.png`),
    );
  }
}
