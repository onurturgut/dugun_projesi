const VISUAL_QA_HEADER = "role-panel-contract";

export function allowsVisualQaBypass(
  enabled: string | undefined,
  requestHeader: string | null,
) {
  return enabled === "1" && requestHeader === VISUAL_QA_HEADER;
}
