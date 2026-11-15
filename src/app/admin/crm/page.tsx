"use client";

import { CalendarDays, Mail, MapPin, Phone } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  CrmLeadOperations,
  type CrmTeamMember,
} from "@/components/admin/CrmLeadOperations";
import { Notice } from "@/components/admin/Fields";
import { api } from "@/lib/api";
import { canTransitionLead, CRM_STAGE_LABELS } from "@/lib/crm";
import type { BusinessLead, BusinessLeadStatus } from "@/lib/models";

type LeadRow = Omit<BusinessLead, "idempotency_key"> & {
  catalog_item_name: string | null;
  assigned_to_name: string | null;
  open_task_count: number;
};

const stages = Object.keys(CRM_STAGE_LABELS) as BusinessLeadStatus[];
const date = (value: string) =>
  new Date(value).toLocaleDateString("tr-TR", {
    timeZone: "Europe/Istanbul",
    dateStyle: "medium",
  });

export default function CrmPage() {
  const qc = useQueryClient();
  const leads = useQuery({
    queryKey: ["crm-leads"],
    queryFn: () => api<LeadRow[]>("/admin/crm/leads"),
  });
  const team = useQuery({
    queryKey: ["crm-team"],
    queryFn: () => api<CrmTeamMember[]>("/admin/crm/team"),
  });

  async function move(lead: LeadRow, status: BusinessLeadStatus) {
    try {
      await api(`/admin/crm/leads/${lead.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await qc.invalidateQueries({ queryKey: ["crm-leads"] });
      toast.success(`Talep “${CRM_STAGE_LABELS[status]}” aşamasına taşındı.`);
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Talep güncellenemedi.",
      );
    }
  }

  async function assign(lead: LeadRow, assignedTo: string | null) {
    try {
      await api(`/admin/crm/leads/${lead.id}/assignment`, {
        method: "PATCH",
        body: JSON.stringify({ assigned_to: assignedTo }),
      });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["crm-leads"] }),
        qc.invalidateQueries({ queryKey: ["crm-activities", lead.id] }),
      ]);
      toast.success("Talep sorumlusu güncellendi.");
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Sorumlu güncellenemedi.",
      );
    }
  }

  return (
    <AdminShell>
      <div className="admin-heading">
        <div>
          <p className="admin-kicker">İŞLETME CRM</p>
          <h1>CRM ve iş takibi</h1>
          <p className="admin-subtitle">
            Dijital mağazadan gelen müşteri taleplerini görüşmeden sonuca kadar
            yönetin.
          </p>
        </div>
      </div>
      {leads.error ? <Notice>{leads.error.message}</Notice> : null}
      {team.error ? <Notice>{team.error.message}</Notice> : null}
      <section className="crm-metric-grid" aria-label="CRM özeti">
        <article>
          <span>Yeni talep</span>
          <strong>
            {leads.data?.filter((item) => item.status === "new").length || 0}
          </strong>
        </article>
        <article>
          <span>Görüşmede</span>
          <strong>
            {leads.data?.filter((item) => item.status === "contacted").length ||
              0}
          </strong>
        </article>
        <article>
          <span>Açık teklif</span>
          <strong>
            {leads.data?.filter((item) =>
              ["quote_preparing", "quote_sent"].includes(item.status),
            ).length || 0}
          </strong>
        </article>
        <article>
          <span>Kazanılan</span>
          <strong>
            {leads.data?.filter((item) => item.status === "won").length || 0}
          </strong>
        </article>
      </section>
      {leads.isLoading ? (
        <div className="admin-empty">CRM talepleri yükleniyor…</div>
      ) : null}
      <section className="crm-board" aria-label="CRM satış aşamaları">
        {stages.map((stage) => (
          <div className="crm-column" key={stage}>
            <header>
              <h2>{CRM_STAGE_LABELS[stage]}</h2>
              <span>
                {leads.data?.filter((item) => item.status === stage).length ||
                  0}
              </span>
            </header>
            <div>
              {leads.data
                ?.filter((item) => item.status === stage)
                .map((lead) => (
                  <article className="crm-card" key={lead.id}>
                    <div className="crm-card-badges">
                      <span className="crm-source">Dijital mağaza</span>
                      {lead.open_task_count ? (
                        <span className="crm-task-count">
                          {lead.open_task_count} açık görev
                        </span>
                      ) : null}
                    </div>
                    <h3>{lead.customer_name}</h3>
                    <strong>{lead.catalog_item_name || lead.event_type}</strong>
                    <p>
                      <MapPin size={14} /> {lead.city}
                    </p>
                    {lead.event_date ? (
                      <p>
                        <CalendarDays size={14} /> {date(lead.event_date)}
                      </p>
                    ) : null}
                    <p>
                      <Phone size={14} /> {lead.customer_phone}
                    </p>
                    <p>
                      <Mail size={14} /> {lead.customer_email}
                    </p>
                    {lead.message ? (
                      <blockquote>{lead.message}</blockquote>
                    ) : null}
                    <label>
                      <span>Sorumlu</span>
                      <select
                        value={lead.assigned_to || ""}
                        onChange={(event) =>
                          assign(lead, event.target.value || null)
                        }
                        disabled={team.isLoading}
                      >
                        <option value="">Sorumlu seçilmedi</option>
                        {team.data?.map((member) => (
                          <option value={member.id} key={member.id}>
                            {member.display_name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Sonraki aşama</span>
                      <select
                        value={lead.status}
                        onChange={(event) =>
                          move(lead, event.target.value as BusinessLeadStatus)
                        }
                      >
                        <option value={lead.status}>
                          {CRM_STAGE_LABELS[lead.status]}
                        </option>
                        {stages
                          .filter(
                            (next) =>
                              next !== lead.status &&
                              canTransitionLead(lead.status, next),
                          )
                          .map((next) => (
                            <option value={next} key={next}>
                              {CRM_STAGE_LABELS[next]}
                            </option>
                          ))}
                      </select>
                    </label>
                    <CrmLeadOperations
                      leadId={lead.id}
                      team={team.data || []}
                    />
                  </article>
                ))}
              {!leads.data?.some((item) => item.status === stage) ? (
                <p className="crm-empty">Bu aşamada talep yok.</p>
              ) : null}
            </div>
          </div>
        ))}
      </section>
    </AdminShell>
  );
}
