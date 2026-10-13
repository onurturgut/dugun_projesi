import QRCode from "qrcode";
import { designNames, editorialPresets, type WeddingDesign } from "./design";

export const escapeXml = (value: string) => value.replace(/[<>&"']/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[char]!);

function wrap(value: string, width: number, maxLines = 4) {
  const result: string[] = [];
  for (const word of value.trim().split(/\s+/u)) {
    const chunks = Array.from(word).reduce<string[]>((all, char, index) => { if (index % width === 0) all.push(""); all[all.length - 1] += char; return all; }, []);
    for (const chunk of chunks) {
      const last = result.length - 1;
      if (last >= 0 && Array.from(`${result[last]} ${chunk}`).length <= width) result[last] += ` ${chunk}`;
      else result.push(chunk);
    }
  }
  return result.slice(0, maxLines);
}

function textBlock({ text, x = 390, y, size, width, color, family = "'Cormorant Garamond', Georgia, serif", weight = 500, letterSpacing = 0, maxLines = 4 }: { text: string; x?: number; y: number; size: number; width: number; color: string; family?: string; weight?: number; letterSpacing?: number; maxLines?: number }) {
  return `<text x="${x}" y="${y}" text-anchor="middle" fill="${color}" font-family="${family}" font-size="${size}" font-weight="${weight}" letter-spacing="${letterSpacing}">${wrap(text, width, maxLines).map((line, index) => `<tspan x="${x}" dy="${index ? size * 1.08 : 0}">${escapeXml(line)}</tspan>`).join("")}</text>`;
}

function dateLabel(date: string | null) {
  if (!date) return "";
  return new Date(`${date.slice(0, 10)}T12:00:00+03:00`).toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric", timeZone: "Europe/Istanbul" }).toLocaleUpperCase("tr-TR");
}

function qrSvg(url: string) {
  const qr = QRCode.create(url, { errorCorrectionLevel: "M" });
  const quiet = 4, size = qr.modules.size, total = size + quiet * 2;
  let modules = "";
  for (let row = 0; row < size; row++) for (let column = 0; column < size; column++) if (qr.modules.get(row, column)) modules += `M${column + quiet} ${row + quiet}h1v1h-1z`;
  return `<svg x="425" y="530" width="250" height="250" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges" aria-label="Organizasyon QR kodu"><rect width="${total}" height="${total}" rx="1" fill="#fff"/><path d="${modules}" fill="#111"/></svg>`;
}

export function buildQrCards(design: WeddingDesign, title: string, date: string | null, url: string) {
  const preset = editorialPresets[design.qrPresetId];
  const names = designNames(design, title);
  const serif = design.qrFontPairId === "prata-manrope" ? "Prata, 'Times New Roman', serif" : "'Cormorant Garamond', Georgia, serif";
  const sans = "Manrope, Arial, sans-serif";
  const open = `<svg xmlns="http://www.w3.org/2000/svg" width="150mm" height="200mm" viewBox="0 0 780 1040" role="img" aria-label="${escapeXml(names)} The Editorial QR kartı"><defs><linearGradient id="surface" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${preset.secondary}" stop-opacity=".35"/><stop offset=".52" stop-color="${preset.primary}"/><stop offset="1" stop-color="${preset.accent}" stop-opacity=".62"/></linearGradient><filter id="paper"><feTurbulence type="fractalNoise" baseFrequency=".72" numOctaves="3" seed="17"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 .08"/></feComponentTransfer></filter></defs><rect width="780" height="1040" fill="${preset.primary}"/><rect width="780" height="1040" fill="url(#surface)"/><rect width="780" height="1040" filter="url(#paper)" opacity=".34"/>`;
  const arch = `<path d="M-58 90C80 18 274 18 355 121C427 212 379 330 271 359C171 386 111 454 115 576C118 704 44 799-58 835Z" fill="${preset.secondary}" fill-opacity=".48"/><path d="M-30 152C91 82 238 92 289 175C331 243 286 316 211 334C104 359 55 455 65 584" fill="none" stroke="${preset.accent}" stroke-opacity=".72" stroke-width="3"/><path d="M35 645C113 576 221 559 297 612C357 654 362 739 314 798C250 876 128 895 32 968Z" fill="${preset.secondary}" fill-opacity=".34"/><path d="M54 686C145 621 249 634 286 702" fill="none" stroke="${preset.accent}" stroke-opacity=".58" stroke-width="2"/>`;
  const brand = `<g fill="${preset.text}" text-anchor="middle"><text x="523" y="72" font-family="${serif}" font-size="34" font-weight="600">S✦</text><text x="523" y="103" font-family="${serif}" font-size="13" letter-spacing="5">SHINEQR</text></g>`;
  const common = `${open}${arch}${brand}`;
  const front = common + textBlock({ text: design.qrHook, x: 523, y: 180, size: 43, width: 18, maxLines: 4, color: preset.text, family: serif }) + textBlock({ text: design.qrDescription, x: 523, y: 370, size: 18, width: 34, maxLines: 3, color: preset.text, family: sans, weight: 400 }) + qrSvg(url) + `<g fill="${preset.text}" text-anchor="middle" font-family="${sans}"><text x="523" y="824" font-size="14" font-weight="700" letter-spacing="1.5">${escapeXml(design.qrCta.toLocaleUpperCase("tr-TR"))}</text><path d="M430 866H616" stroke="${preset.accent}" stroke-width="1"/><text x="523" y="906" font-family="${serif}" font-size="23" letter-spacing="3">${escapeXml(names.toLocaleUpperCase("tr-TR"))}</text><text x="523" y="936" font-size="12" letter-spacing="2">${escapeXml(dateLabel(date))}</text></g></svg>`;
  const back = common + textBlock({ text: "Anılar burada ışıldar.", x: 523, y: 235, size: 46, width: 18, maxLines: 3, color: preset.text, family: serif }) + textBlock({ text: design.message, x: 523, y: 420, size: 20, width: 34, maxLines: 5, color: preset.text, family: sans, weight: 400 }) + `<path d="M441 622H605" stroke="${preset.accent}"/><text x="523" y="690" text-anchor="middle" fill="${preset.text}" font-family="${serif}" font-size="27" letter-spacing="3">${escapeXml(names.toLocaleUpperCase("tr-TR"))}</text><text x="523" y="728" text-anchor="middle" fill="${preset.text}" font-family="${sans}" font-size="13" letter-spacing="2">${escapeXml(dateLabel(date))}</text><text x="523" y="920" text-anchor="middle" fill="${preset.text}" font-family="${sans}" font-size="11" letter-spacing="4">THE EDITORIAL · V${design.qrTemplateVersion}</text></svg>`;
  return { front, back };
}

export function svgDataUrl(svg: string) { return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`; }
