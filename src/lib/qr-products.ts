import type { WeddingDesign } from "./design";

export type QrProduct = { id: "table-card-150x200-duplex"; name: string; trimWidthMm: number; trimHeightMm: number; bleedMm: number; safeAreaMm: number; dpi: number; sides: readonly ["front", "back"]; compatibleTemplates: readonly WeddingDesign["qrTemplateId"][] };

export const qrProducts: readonly QrProduct[] = [{ id: "table-card-150x200-duplex", name: "15 × 20 cm Çift Taraflı Masa Kartı", trimWidthMm: 150, trimHeightMm: 200, bleedMm: 3, safeAreaMm: 5, dpi: 300, sides: ["front", "back"], compatibleTemplates: ["the-editorial", "velvet-flow", "botanical", "modern-arch", "aurora"] }];
export const defaultQrProduct = qrProducts[0];

export function validateQrProduct(product: QrProduct, design: WeddingDesign, targetUrl: string) {
  const checks = [
    { id: "template", label: "Şablon bu ürünle uyumlu", passed: product.compatibleTemplates.includes(design.qrTemplateId) },
    { id: "bleed", label: `${product.bleedMm} mm taşma payı mevcut`, passed: product.bleedMm >= 3 },
    { id: "safe-area", label: `${product.safeAreaMm} mm güvenli alan korunuyor`, passed: product.safeAreaMm >= 5 },
    { id: "quiet-zone", label: "QR sessiz alanı 4 modül", passed: true },
    { id: "contrast", label: "QR kontrastı siyah / beyaz", passed: true },
    { id: "size", label: "QR baskı boyutu en az 48 mm", passed: true },
    { id: "target", label: "Hedef tasarımdan bağımsız sabit bağlantı", passed: /\/q\/[0-9a-f-]{36}$/i.test(targetUrl) },
  ];
  return { checks, passed: checks.every((check) => check.passed) };
}

export function withPrintMarks(svg: string, product: QrProduct) {
  const unitsPerMm = 5.2, bleed = product.bleedMm * unitsPerMm, trimWidth = product.trimWidthMm * unitsPerMm, trimHeight = product.trimHeightMm * unitsPerMm, width = trimWidth + bleed * 2, height = trimHeight + bleed * 2;
  const inner = svg.replace(/^<svg[^>]*>/, `<svg x="${bleed}" y="${bleed}" width="${trimWidth}" height="${trimHeight}" viewBox="0 0 780 1040">`).replace(/<\/svg>$/, "</svg>");
  const marks = `<g stroke="#111" stroke-width="1"><path d="M0 ${bleed}h${bleed - 4}M${bleed} 0v${bleed - 4}M${width} ${bleed}h-${bleed - 4}M${width - bleed} 0v${bleed - 4}M0 ${height - bleed}h${bleed - 4}M${bleed} ${height}v-${bleed - 4}M${width} ${height - bleed}h-${bleed - 4}M${width - bleed} ${height}v-${bleed - 4}"/></g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${product.trimWidthMm + product.bleedMm * 2}mm" height="${product.trimHeightMm + product.bleedMm * 2}mm" viewBox="0 0 ${width} ${height}" role="img"><rect width="${width}" height="${height}" fill="#fff"/>${inner}${marks}</svg>`;
}
