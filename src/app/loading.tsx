import { RouteState } from "@/components/system/RouteState";

export default function Loading() {
  return (
    <RouteState
      code="SHINEQR"
      title="Deneyiminiz hazırlanıyor."
      description="Sayfa içeriğini güvenli biçimde yüklüyoruz."
      loading
    />
  );
}
