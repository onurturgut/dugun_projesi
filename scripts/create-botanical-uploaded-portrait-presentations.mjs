import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const variants = ["sage", "cream", "blue", "blush", "black"];
const sourceRoot = path.join(root, "public/design-center/source-art/botanical/portrait-mini");
const scenePath = path.join(root, "public/design-center/mockups/shared/portrait-mini-blank-3d-scene-v1.png");
const outputRoot = path.join(root, "public/design-center/presentations/botanical/portrait-mini");
const frontQuad = [[214, 100], [741, 118], [757, 866], [230, 898]];
const backQuad = [[813, 140], [1310, 90], [1300, 889], [795, 861]];

function solveLinear(matrix, values) {
  const rows = matrix.map((row, index) => [...row, values[index]]);
  for (let column = 0; column < values.length; column++) {
    let pivot = column;
    for (let row = column + 1; row < rows.length; row++) if (Math.abs(rows[row][column]) > Math.abs(rows[pivot][column])) pivot = row;
    [rows[column], rows[pivot]] = [rows[pivot], rows[column]];
    const divisor = rows[column][column];
    for (let index = column; index <= values.length; index++) rows[column][index] /= divisor;
    for (let row = 0; row < rows.length; row++) {
      if (row === column) continue;
      const factor = rows[row][column];
      for (let index = column; index <= values.length; index++) rows[row][index] -= factor * rows[column][index];
    }
  }
  return rows.map((row) => row[values.length]);
}

function destinationToSource(quad, width, height) {
  const source = [[0, 0], [width - 1, 0], [width - 1, height - 1], [0, height - 1]], matrix = [], values = [];
  for (let index = 0; index < 4; index++) {
    const [x, y] = quad[index], [u, v] = source[index];
    matrix.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); values.push(u);
    matrix.push([0, 0, 0, x, y, 1, -v * x, -v * y]); values.push(v);
  }
  return solveLinear(matrix, values);
}

async function perspectiveLayer(canvas, canvasInfo, sourceBuffer, quad) {
  const { data: source, info } = await sharp(sourceBuffer).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const [a, b, c, d, e, f, g, h] = destinationToSource(quad, info.width, info.height);
  const minX = Math.max(0, Math.floor(Math.min(...quad.map(([x]) => x)))), maxX = Math.min(canvasInfo.width - 1, Math.ceil(Math.max(...quad.map(([x]) => x))));
  const minY = Math.max(0, Math.floor(Math.min(...quad.map(([, y]) => y)))), maxY = Math.min(canvasInfo.height - 1, Math.ceil(Math.max(...quad.map(([, y]) => y))));
  for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
    const divisor = g * x + h * y + 1, sourceXValue = (a * x + b * y + c) / divisor, sourceYValue = (d * x + e * y + f) / divisor;
    if (sourceXValue < 0 || sourceYValue < 0 || sourceXValue >= info.width || sourceYValue >= info.height) continue;
    const sourceX = Math.min(info.width - 1, Math.round(sourceXValue)), sourceY = Math.min(info.height - 1, Math.round(sourceYValue));
    const sourceIndex = (sourceY * info.width + sourceX) * info.channels, targetIndex = (y * canvasInfo.width + x) * canvasInfo.channels;
    const sceneLight = (canvas[targetIndex] * .2126 + canvas[targetIndex + 1] * .7152 + canvas[targetIndex + 2] * .0722) / 245;
    const shade = Math.max(.86, Math.min(1.06, sceneLight));
    canvas[targetIndex] = Math.min(255, source[sourceIndex] * shade * 1.015);
    canvas[targetIndex + 1] = Math.min(255, source[sourceIndex + 1] * shade);
    canvas[targetIndex + 2] = Math.min(255, source[sourceIndex + 2] * shade * .98);
  }
}

await fs.mkdir(outputRoot, { recursive: true });
for (const variant of variants) {
  const front = await sharp(path.join(sourceRoot, `${variant}-front.png`)).resize(957, 1252, { fit: "cover", position: "centre" }).png().toBuffer();
  const back = await sharp(path.join(sourceRoot, `${variant}-back.png`)).resize(957, 1252, { fit: "cover", position: "centre" }).png().toBuffer();
  const { data: canvas, info } = await sharp(scenePath).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  await perspectiveLayer(canvas, info, front, frontQuad);
  await perspectiveLayer(canvas, info, back, backQuad);
  await sharp(canvas, { raw: info }).png({ compressionLevel: 9 }).toFile(path.join(outputRoot, `botanical-${variant}-portrait-mini-uploaded-presentation-v1.png`));
}

console.log("Created Botanical uploaded-art portrait mini presentations.");
