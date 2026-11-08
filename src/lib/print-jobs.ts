import type { PrintJobStatus, Wedding } from "./models";
import { qrProductIds, type QrProductId } from "./qr-products";

export function approvedPrintSource(
  event: Pick<
    Wedding,
    | "design_request"
    | "design_status"
    | "design_snapshot_id"
    | "design"
    | "design_revision"
  >,
) {
  const requestQr = event.design_request?.surfaces.qr;
  if (
    requestQr?.status === "completed" &&
    qrProductIds.includes(requestQr.format as QrProductId)
  )
    return {
      source: "design_request" as const,
      productId: requestQr.format as QrProductId,
      revision: requestQr.delivery?.version || 1,
    };
  if (
    event.design_status === "approved_for_print" &&
    event.design_snapshot_id &&
    event.design
  )
    return {
      source: "legacy_design" as const,
      productId: event.design.qrProductId,
      revision: event.design_revision || 1,
    };
  return null;
}

export const PRINT_JOB_STATUS_LABELS: Record<PrintJobStatus, string> = {
  assigned: "Baskıcıya atandı",
  downloaded: "Dosya indirildi",
  printing: "Baskıda",
  ready: "Teslime hazır",
  received_by_shineqr: "ShineQR teslim aldı",
  quality_checked: "Kalite kontrol tamamlandı",
  delivered_to_partner: "Partnere teslim edildi",
  cancelled: "İptal edildi",
};

const transitions: Record<PrintJobStatus, readonly PrintJobStatus[]> = {
  assigned: ["downloaded", "cancelled"],
  downloaded: ["printing", "cancelled"],
  printing: ["ready", "cancelled"],
  ready: ["received_by_shineqr", "cancelled"],
  received_by_shineqr: ["quality_checked", "cancelled"],
  quality_checked: ["delivered_to_partner", "cancelled"],
  delivered_to_partner: [],
  cancelled: [],
};

export function allowedPrintJobTransitions(
  status: PrintJobStatus,
  actor: "platform" | "printer",
) {
  return transitions[status].filter((next) =>
    actor === "printer"
      ? ["downloaded", "printing", "ready"].includes(next)
      : true,
  );
}

export function canTransitionPrintJob(
  current: PrintJobStatus,
  next: PrintJobStatus,
  actor: "platform" | "printer",
) {
  return allowedPrintJobTransitions(current, actor).includes(next);
}
