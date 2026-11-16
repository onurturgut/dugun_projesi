import { AdminShell } from "@/components/admin/AdminShell";
import { StorefrontWorkspace } from "@/components/admin/StorefrontWorkspace";

export default function StorefrontPage() {
  return (
    <AdminShell>
      <StorefrontWorkspace />
    </AdminShell>
  );
}
