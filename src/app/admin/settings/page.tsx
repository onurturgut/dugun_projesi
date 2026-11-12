import { redirect } from "next/navigation";

export default function LegacyPartnerSettingsPage() {
  redirect("/account/settings#business-settings");
}
