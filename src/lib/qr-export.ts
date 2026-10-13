import type { QrProduct } from "./qr-products";

function downloadBlob(blob: Blob, fileName: string) {
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}

export function downloadSvg(svg: string, fileName: string) {
  downloadBlob(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), fileName);
}

async function render(svg: string, product: QrProduct) {
  const image = new Image();
  const source = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Baskı görseli oluşturulamadı."));
      image.src = source;
    });
    const mmToInch = 1 / 25.4;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round((product.trimWidthMm + product.bleedMm * 2) * mmToInch * product.dpi);
    canvas.height = Math.round((product.trimHeightMm + product.bleedMm * 2) * mmToInch * product.dpi);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas kullanılamıyor.");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    URL.revokeObjectURL(source);
  }
}

export async function downloadPng(svg: string, product: QrProduct, fileName: string) {
  const canvas = await render(svg, product);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("PNG oluşturulamadı.");
  downloadBlob(blob, fileName);
}

function pdfFromJpeg(jpeg: Uint8Array, widthMm: number, heightMm: number, imageWidth: number, imageHeight: number) {
  const encoder = new TextEncoder();
  const width = (widthMm * 72) / 25.4;
  const height = (heightMm * 72) / 25.4;
  const objects: (string | Uint8Array)[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width.toFixed(3)} ${height.toFixed(3)}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`,
    jpeg,
    `q ${width.toFixed(3)} 0 0 ${height.toFixed(3)} 0 0 cm /Im0 Do Q`,
  ];
  const chunks: Uint8Array[] = [encoder.encode("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n")];
  const offsets = [0];
  let length = chunks[0].length;
  objects.forEach((object, index) => {
    offsets.push(length);
    let chunk: Uint8Array;
    if (object instanceof Uint8Array) {
      const head = encoder.encode(`${index + 1} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${object.length} >>\nstream\n`);
      const tail = encoder.encode("\nendstream\nendobj\n");
      chunk = new Uint8Array(head.length + object.length + tail.length);
      chunk.set(head); chunk.set(object, head.length); chunk.set(tail, head.length + object.length);
    } else {
      const body = index === 4 ? `<< /Length ${encoder.encode(object).length} >>\nstream\n${object}\nendstream` : object;
      chunk = encoder.encode(`${index + 1} 0 obj\n${body}\nendobj\n`);
    }
    chunks.push(chunk); length += chunk.length;
  });
  const xref = length;
  chunks.push(encoder.encode(`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `).join("\n")}\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`));
  return new Blob(chunks as BlobPart[], { type: "application/pdf" });
}

export async function downloadPdf(svg: string, product: QrProduct, fileName: string) {
  const canvas = await render(svg, product);
  const data = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.96));
  if (!data) throw new Error("PDF oluşturulamadı.");
  downloadBlob(pdfFromJpeg(new Uint8Array(await data.arrayBuffer()), product.trimWidthMm + product.bleedMm * 2, product.trimHeightMm + product.bleedMm * 2, canvas.width, canvas.height), fileName);
}
