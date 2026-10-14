import QRCode from "qrcode";
import { designNames, type WeddingDesign } from "./design";
import { qrTemplateLayouts, resolveQrVariant, type QrFontFamily } from "./qr-templates";

export type QrEmbeddedAssets = {
  front: string;
  back: string;
  fonts?: Partial<Record<QrFontFamily, string>>;
};

export const escapeXml = (value: string) => value.replace(/[<>&"']/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[char]!);

function wrap(value: string, width: number, maxLines = 4) {
  const result: string[] = [];
  for (const paragraph of value.trim().split(/\n/u)) {
    for (const word of paragraph.trim().split(/\s+/u)) {
      const chunks = Array.from(word).reduce<string[]>((all, char, index) => {
        if (index % width === 0) all.push("");
        all[all.length - 1] += char;
        return all;
      }, []);
      for (const chunk of chunks) {
        const last = result.length - 1;
        if (last >= 0 && Array.from(`${result[last]} ${chunk}`).length <= width) result[last] += ` ${chunk}`;
        else result.push(chunk);
      }
    }
  }
  return result.slice(0, maxLines);
}

const familyNames: Record<QrFontFamily, string> = {
  cormorant: "QrCormorant",
  cormorantItalic: "QrCormorantItalic",
  cinzel: "QrCinzel",
  allura: "QrAllura",
  manrope: "QrManrope",
};

function fontFaces(fonts?: QrEmbeddedAssets["fonts"]) {
  if (!fonts) return "";
  return `<defs><style>${Object.entries(fonts).map(([id, data]) => {
    const family = familyNames[id as QrFontFamily];
    const italic = id === "cormorantItalic" ? "font-style:italic;" : "";
    return `@font-face{font-family:${family};src:url('${data}') format('truetype');font-weight:400;${italic}}`;
  }).join("")}</style></defs>`;
}

function textBlock({ text, x, y, size, width, color, family, weight = 500, letterSpacing = 0, maxLines = 4, lineHeight = 1.02 }: { text: string; x: number; y: number; size: number; width: number; color: string; family: QrFontFamily; weight?: number; letterSpacing?: number; maxLines?: number; lineHeight?: number }) {
  return `<text x="${x}" y="${y}" text-anchor="middle" fill="${color}" font-family="${familyNames[family]}" font-size="${size}" font-weight="${weight}" letter-spacing="${letterSpacing}">${wrap(text, width, maxLines).map((line, index) => `<tspan x="${x}" dy="${index ? size * lineHeight : 0}">${escapeXml(line)}</tspan>`).join("")}</text>`;
}

function clipped(id: string, x: number, y: number, width: number, height: number, content: string) {
  return `<defs><clipPath id="${id}"><rect x="${x}" y="${y}" width="${width}" height="${height}"/></clipPath></defs><g clip-path="url(#${id})">${content}</g>`;
}

function dateLabel(date: string | null) {
  if (!date) return "";
  return new Date(`${date.slice(0, 10)}T12:00:00+03:00`).toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric", timeZone: "Europe/Istanbul" }).toLocaleUpperCase("tr-TR");
}

function qrSvg(url: string, x: number, y: number, renderedSize: number) {
  const qr = QRCode.create(url, { errorCorrectionLevel: "M" });
  const quiet = 4, size = qr.modules.size, total = size + quiet * 2;
  let modules = "";
  for (let row = 0; row < size; row++) for (let column = 0; column < size; column++) if (qr.modules.get(row, column)) modules += `M${column + quiet} ${row + quiet}h1v1h-1z`;
  return `<svg x="${x}" y="${y}" width="${renderedSize}" height="${renderedSize}" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges" aria-label="Organizasyon QR kodu"><rect width="${total}" height="${total}" rx="1" fill="#fff"/><path d="${modules}" fill="#111"/></svg>`;
}

function mediaIcons(x: number, y: number, width: number, height: number, color: string) {
  return `<g transform="translate(${x} ${y}) scale(${width / 154} ${height / 40})" fill="none" stroke="${color}" stroke-width="2"><circle cx="-58" cy="0" r="19"/><rect x="-68" y="-7" width="20" height="15" rx="3"/><circle cx="-58" cy="0" r="5"/><path d="M-65-7l4-6h7l4 6"/><circle cx="0" cy="0" r="19"/><rect x="-10" y="-8" width="15" height="16" rx="3"/><path d="M5-4l10-6v20L5 4Z"/><circle cx="58" cy="0" r="19"/><rect x="48" y="-9" width="20" height="18" rx="2"/><path d="m50 6 6-7 5 5 3-3 4 5"/></g>`;
}

export function buildQrCards(design: WeddingDesign, title: string, date: string | null, url: string, embeddedAssets?: QrEmbeddedAssets) {
  const variant = resolveQrVariant(design.qrTemplateId, design.qrColorVariant);
  const layout = qrTemplateLayouts[design.qrTemplateId];
  const custom = design.qrLayout;
  const names = designNames(design, title);
  const open = (face: "front" | "back") => {
    const asset = embeddedAssets?.[face] ?? variant[face];
    return `<svg xmlns="http://www.w3.org/2000/svg" width="150mm" height="200mm" viewBox="0 0 780 1040" role="img" aria-label="${escapeXml(names)} ${escapeXml(variant.name)} QR kartı">${fontFaces(embeddedAssets?.fonts)}<rect width="780" height="1040" fill="${variant.swatch}"/><image href="${escapeXml(asset)}" width="780" height="1040" preserveAspectRatio="xMidYMid slice"/>`;
  };
  const brand = `<g fill="${variant.ink}" text-anchor="middle"><text x="${layout.contentX}" y="${layout.brandY}" font-family="${familyNames.cormorant}" font-size="49" font-weight="600" letter-spacing="-7">Sℚ</text><text x="${layout.contentX}" y="${layout.brandY + 35}" font-family="${familyNames.cinzel}" font-size="14" letter-spacing="6">SHINEQR</text></g>`;
  const hookX = layout.contentX + custom.qrHook.x, hookY = layout.title.y + custom.qrHook.y;
  const descriptionX = layout.contentX + custom.qrDescription.x, descriptionY = layout.description.y + custom.qrDescription.y;
  const ctaX = layout.contentX + custom.qrCta.x, ctaY = layout.ctaY + custom.qrCta.y;
  const namesX = layout.contentX + custom.names.x, namesY = layout.namesY + custom.names.y;
  const qrSize = Math.min(custom.qr.width, custom.qr.height) * (layout.qr.size / 196);
  const qrX = layout.qr.x + custom.qr.x + (layout.qr.size - qrSize) / 2;
  const qrY = layout.qr.y + custom.qr.y + (layout.qr.size - qrSize) / 2;
  const iconsX = layout.contentX + custom.icons.x, iconsY = layout.iconsY + custom.icons.y;
  const dividerX = layout.contentX + custom.divider.x, dividerY = layout.dividerY + custom.divider.y;
  const front = open("front") + brand
    + clipped("clip-hook", hookX - custom.qrHook.width / 2, hookY - 55, custom.qrHook.width, custom.qrHook.height, textBlock({ text: design.qrHook, x: hookX, y: hookY, size: layout.title.size, width: Math.max(8, Math.floor(custom.qrHook.width / (layout.title.size * .46))), maxLines: layout.title.maxLines, color: variant.ink, family: layout.title.family, weight: 500, letterSpacing: layout.title.letterSpacing }))
    + clipped("clip-description", descriptionX - custom.qrDescription.width / 2, descriptionY - 32, custom.qrDescription.width, custom.qrDescription.height, textBlock({ text: design.qrDescription, x: descriptionX, y: descriptionY, size: layout.description.size, width: Math.max(10, Math.floor(custom.qrDescription.width / (layout.description.size * .52))), maxLines: layout.description.maxLines, color: variant.ink, family: "cormorant", weight: 500, lineHeight: 1.08 }))
    + qrSvg(url, qrX, qrY, qrSize)
    + mediaIcons(iconsX, iconsY, custom.icons.width, custom.icons.height, variant.ink)
    + clipped("clip-cta", ctaX - custom.qrCta.width / 2, ctaY - 28, custom.qrCta.width, custom.qrCta.height, `<text x="${ctaX}" y="${ctaY}" text-anchor="middle" fill="${variant.ink}" font-family="${familyNames.manrope}" font-size="15" font-weight="600" letter-spacing="1.6">${escapeXml(design.qrCta.toLocaleUpperCase("tr-TR"))}</text>`)
    + `<path d="M${dividerX - custom.divider.width / 2} ${dividerY}H${dividerX + custom.divider.width / 2}" stroke="${variant.ink}" stroke-width="${Math.max(1, custom.divider.height / 40)}" stroke-opacity=".65"/>`
    + clipped("clip-names", namesX - custom.names.width / 2, namesY - 32, custom.names.width, custom.names.height, `<text x="${namesX}" y="${namesY}" text-anchor="middle" fill="${variant.ink}" font-family="${familyNames.cinzel}" font-size="21" letter-spacing="4">${escapeXml(names.toLocaleUpperCase("tr-TR"))}</text>`)
    + `<text x="${layout.contentX}" y="${layout.dateY}" text-anchor="middle" fill="${variant.ink}" font-family="${familyNames.manrope}" font-size="11" letter-spacing="2">${escapeXml(dateLabel(date))}</text></svg>`;
  const messageX = layout.contentX + custom.message.x, messageY = 300 + custom.message.y;
  const back = open("back") + brand
    + clipped("clip-message", messageX - custom.message.width / 2, messageY - 55, custom.message.width, custom.message.height, textBlock({ text: design.message, x: messageX, y: messageY, size: 34, width: Math.max(10, Math.floor(custom.message.width / 16)), maxLines: 8, color: variant.ink, family: design.qrTemplateId === "aurora" ? "cormorantItalic" : "cormorant", weight: 500, lineHeight: 1.08 }))
    + `<path d="M${layout.contentX - 105} 760H${layout.contentX + 105}" stroke="${variant.ink}" stroke-opacity=".65"/>`
    + clipped("clip-back-names", namesX - custom.names.width / 2, 783 + custom.names.y, custom.names.width, custom.names.height, `<text x="${namesX}" y="${815 + custom.names.y}" text-anchor="middle" fill="${variant.ink}" font-family="${familyNames.cinzel}" font-size="22" letter-spacing="4">${escapeXml(names.toLocaleUpperCase("tr-TR"))}</text>`)
    + `<text x="${layout.contentX}" y="854" text-anchor="middle" fill="${variant.ink}" font-family="${familyNames.manrope}" font-size="11" letter-spacing="2">${escapeXml(dateLabel(date))}</text></svg>`;
  return { front, back };
}

export function svgDataUrl(svg: string) { return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`; }
