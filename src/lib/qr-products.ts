import type { PackagePolicy } from "./commercial-policy";
import type { QrCollectionId, WeddingDesign } from "./design";

export const qrProductIds = ["portrait-mini-75x100-duplex", "landscape-mini-100x75-duplex", "table-card-150x200-duplex", "welcome-sign-500x700-duplex"] as const;
export type QrProductId = (typeof qrProductIds)[number];
export type QrProduct = { id: QrProductId; name: string; shortName: string; trimWidthMm: number; trimHeightMm: number; bleedMm: number; safeAreaMm: number; dpi: number; sides: readonly ["front", "back"]; compatibleTemplates: readonly QrCollectionId[]; artworkReady: boolean };

const allTemplates = ["the-editorial", "velvet-flow", "botanical", "modern-arch", "aurora"] as const;
const velvetFlowOnly = ["velvet-flow"] as const;
const portraitMiniTemplates = ["velvet-flow", "botanical"] as const;
export const qrProducts: readonly QrProduct[] = [
  { id: "portrait-mini-75x100-duplex", name: "7,5 × 10 cm Dikey Mini Kart", shortName: "Dikey mini kart", trimWidthMm: 75, trimHeightMm: 100, bleedMm: 3, safeAreaMm: 5, dpi: 300, sides: ["front", "back"], compatibleTemplates: portraitMiniTemplates, artworkReady: true },
  { id: "landscape-mini-100x75-duplex", name: "10 × 7,5 cm Yatay Mini Kart", shortName: "Yatay mini kart", trimWidthMm: 100, trimHeightMm: 75, bleedMm: 3, safeAreaMm: 5, dpi: 300, sides: ["front", "back"], compatibleTemplates: velvetFlowOnly, artworkReady: false },
  { id: "table-card-150x200-duplex", name: "15 × 20 cm Çift Taraflı Masa Kartı", shortName: "Masa kartı", trimWidthMm: 150, trimHeightMm: 200, bleedMm: 3, safeAreaMm: 5, dpi: 300, sides: ["front", "back"], compatibleTemplates: allTemplates, artworkReady: false },
  { id: "welcome-sign-500x700-duplex", name: "50 × 70 cm Karşılama Tabelası", shortName: "Karşılama tabelası", trimWidthMm: 500, trimHeightMm: 700, bleedMm: 3, safeAreaMm: 5, dpi: 300, sides: ["front", "back"], compatibleTemplates: velvetFlowOnly, artworkReady: false },
];
export const defaultQrProduct = qrProducts[2];
export function resolveQrProduct(id: QrProductId) { return qrProducts.find((product) => product.id === id) ?? defaultQrProduct; }

export function qrProductEntitlement(product: QrProduct, policy?: PackagePolicy) {
  const includedQuantity = !policy ? 0
    : product.id === "welcome-sign-500x700-duplex" ? policy.welcomeSignCount
      : product.id === "table-card-150x200-duplex" ? policy.tableQrCount
        : policy.miniQrCount;
  if (!product.artworkReady) return { allowed: false, includedQuantity, reason: "Bu ölçünün tasarımı henüz hazırlanıyor." };
  if (!policy) return { allowed: false, includedQuantity, reason: "Paket bilgisi doğrulanamadı." };
  if (includedQuantity < 1) return { allowed: false, includedQuantity, reason: "Bu ürün mevcut pakete dâhil değil." };
  return { allowed: true, includedQuantity, reason: `${includedQuantity} adet paket kapsamında.` };
}

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
  const sourceAspect = 780 / 1040, targetAspect = product.trimWidthMm / product.trimHeightMm;
  const sourceWidth = targetAspect >= sourceAspect ? 1040 * targetAspect : 780;
  const sourceHeight = targetAspect >= sourceAspect ? 1040 : 780 / targetAspect;
  const viewBoxX = (780 - sourceWidth) / 2, viewBoxY = (1040 - sourceHeight) / 2;
  const inner = svg.replace(/^<svg[^>]*>/, `<svg x="${bleed}" y="${bleed}" width="${trimWidth}" height="${trimHeight}" viewBox="${viewBoxX} ${viewBoxY} ${sourceWidth} ${sourceHeight}" preserveAspectRatio="xMidYMid slice">`).replace(/<\/svg>$/, "</svg>");
  const marks = `<g stroke="#111" stroke-width="1"><path d="M0 ${bleed}h${bleed - 4}M${bleed} 0v${bleed - 4}M${width} ${bleed}h-${bleed - 4}M${width - bleed} 0v${bleed - 4}M0 ${height - bleed}h${bleed - 4}M${bleed} ${height}v-${bleed - 4}M${width} ${height - bleed}h-${bleed - 4}M${width - bleed} ${height}v-${bleed - 4}"/></g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${product.trimWidthMm + product.bleedMm * 2}mm" height="${product.trimHeightMm + product.bleedMm * 2}mm" viewBox="0 0 ${width} ${height}" role="img"><rect width="${width}" height="${height}" fill="#fff"/>${inner}${marks}</svg>`;
}
