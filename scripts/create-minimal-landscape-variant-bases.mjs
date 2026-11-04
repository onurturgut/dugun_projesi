import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const variants = { blush: [242, 211, 207], sage: [216, 221, 200], blue: [220, 236, 246], black: [27, 27, 27] };
const sourceDir = "public/design-center/templates/modern-arch/cream/landscape-mini";

for (const face of ["front", "back"]) {
  const source = path.join(sourceDir, `minimal-cream-landscape-mini-${face}-base-clean.png`);
  const { data, info } = await sharp(source).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  for (const [variant, target] of Object.entries(variants)) {
    const output = Buffer.from(data);
    for (let index = 0; index < output.length; index += 3) {
      const red = data[index], green = data[index + 1], blue = data[index + 2];
      const goldCurve = red - green > 25 && green - blue > 12 && red < 235;
      if (goldCurve) continue;
      const luminance = red * .2126 + green * .7152 + blue * .0722;
      const texture = (luminance - 237) * (variant === "black" ? .12 : .42);
      output[index] = Math.max(0, Math.min(255, target[0] + texture));
      output[index + 1] = Math.max(0, Math.min(255, target[1] + texture));
      output[index + 2] = Math.max(0, Math.min(255, target[2] + texture));
    }
    const outputDir = `public/design-center/templates/modern-arch/${variant}/landscape-mini`;
    await fs.mkdir(outputDir, { recursive: true });
    await sharp(output, { raw: info }).withMetadata({ density: 300 }).png({ compressionLevel: 9 }).toFile(path.join(outputDir, `minimal-${variant}-landscape-mini-${face}-base-clean.png`));
  }
}
