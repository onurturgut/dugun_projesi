import { PDFDocument } from "pdf-lib";
import type { QrProduct } from "./qr-products";

const pointsToMm = (points: number) => (points * 25.4) / 72;
const closeTo = (actual: number, expected: number, tolerance = 0.6) =>
  Math.abs(actual - expected) <= tolerance;

export type PdfPreflightCheck = {
  id: string;
  label: string;
  status: "passed" | "failed" | "manual";
  detail: string;
};

export async function inspectPrintPdf(body: Uint8Array, product: QrProduct) {
  let pdf: PDFDocument;
  try {
    pdf = await PDFDocument.load(body, {
      ignoreEncryption: false,
      updateMetadata: false,
    });
  } catch {
    return {
      passed: false,
      page_count: 0,
      checks: [
        {
          id: "structure",
          label: "PDF yapısı okunabiliyor",
          status: "failed" as const,
          detail: "PDF bozuk, şifreli veya desteklenmeyen bir yapıda.",
        },
      ],
    };
  }
  const pages = pdf.getPages();
  const expectedWidth = product.trimWidthMm + product.bleedMm * 2;
  const expectedHeight = product.trimHeightMm + product.bleedMm * 2;
  const pageDetails = pages.map((page, index) => {
    const width = pointsToMm(page.getWidth());
    const height = pointsToMm(page.getHeight());
    const matches =
      (closeTo(width, expectedWidth) && closeTo(height, expectedHeight)) ||
      (closeTo(width, expectedHeight) && closeTo(height, expectedWidth));
    return { index: index + 1, width, height, matches };
  });
  const checks: PdfPreflightCheck[] = [
    {
      id: "structure",
      label: "PDF yapısı okunabiliyor",
      status: "passed",
      detail: "Dosya PDF ayrıştırıcısı tarafından başarıyla açıldı.",
    },
    {
      id: "page-count",
      label: "Ön ve arka yüz mevcut",
      status: pages.length === product.sides.length ? "passed" : "failed",
      detail: `${pages.length} sayfa bulundu; ${product.sides.length} sayfa bekleniyor.`,
    },
    {
      id: "page-size",
      label: "Kesim ve taşma paylı sayfa ölçüsü doğru",
      status:
        pageDetails.length > 0 && pageDetails.every((page) => page.matches)
          ? "passed"
          : "failed",
      detail: `Beklenen ${expectedWidth} × ${expectedHeight} mm. ${pageDetails
        .map(
          (page) =>
            `${page.index}. sayfa ${page.width.toFixed(1)} × ${page.height.toFixed(1)} mm`,
        )
        .join("; ")}.`,
    },
    {
      id: "color-profile",
      label: "Renk profili ve toplam boya limiti",
      status: "manual",
      detail:
        "Matbaanın ICC profiline göre Acrobat Preflight ile kontrol edilmeli.",
    },
    {
      id: "fonts",
      label: "Fontlar gömülü veya kontura çevrilmiş",
      status: "manual",
      detail:
        "Font lisansı ve gömme durumu profesyonel PDF preflight aracıyla kontrol edilmeli.",
    },
    {
      id: "resolution",
      label: "Görsellerin efektif baskı çözünürlüğü yeterli",
      status: "manual",
      detail: `Hedef ${product.dpi} DPI; yerleştirilmiş görseller Acrobat Preflight ile kontrol edilmeli.`,
    },
  ];
  return {
    passed: checks.every((check) => check.status !== "failed"),
    page_count: pages.length,
    checks,
  };
}
