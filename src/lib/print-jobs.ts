import type { PrintJobStatus } from "./models";

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
