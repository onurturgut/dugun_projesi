import Link from "next/link";
import { ArrowUpRight, Building2, CircleDollarSign, Store, Workflow } from "lucide-react";
import type { Account } from "@/lib/api";
import { workspaceForAccount } from "@/lib/role-workspace";

const icons = [Workflow, CircleDollarSign, Store, Building2];

export function RoleWorkspaceOverview({ account }: { account: Account }) {
  const workspace = workspaceForAccount(account);
  return (
    <section className="role-workspace" aria-labelledby="role-workspace-title">
      <div className="role-workspace-hero">
        <div>
          <p>{workspace.eyebrow}</p>
          <h2 id="role-workspace-title">{workspace.title}</h2>
          <span>{workspace.description}</span>
        </div>
        <Link className="role-workspace-primary" href={workspace.primaryAction.href}>
          {workspace.primaryAction.label}<ArrowUpRight size={17} aria-hidden="true" />
        </Link>
      </div>
      <div className="role-workspace-grid">
        {workspace.modules.map((module, index) => {
          const Icon = icons[index % icons.length];
          return (
            <Link href={module.href} key={`${module.href}-${module.title}`} className="role-workspace-card">
              <span className="role-workspace-icon"><Icon size={19} aria-hidden="true" /></span>
              <small>{module.metricLabel}</small>
              <strong>{module.title}</strong>
              <p>{module.description}</p>
              <span className="role-workspace-link">Çalışma alanını aç <ArrowUpRight size={15} aria-hidden="true" /></span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
