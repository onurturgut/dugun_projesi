import type {
  DesignRequest,
  DesignRequestStatus,
  DesignRequestSurfaceId,
} from "./models";

export function submittedSurfaceStatus(
  surface: DesignRequestSurfaceId,
  mode: "catalog" | "custom",
): DesignRequestStatus {
  return surface !== "qr" && mode === "catalog" ? "completed" : "submitted";
}

export function designRequestReadyToSend(request?: DesignRequest | null) {
  if (!request?.surfaces.qr.delivery) return false;
  return (["loading", "wedding"] as const).every((surface) => {
    const item = request.surfaces[surface];
    return item.mode === "catalog" || Boolean(item.delivery);
  });
}
