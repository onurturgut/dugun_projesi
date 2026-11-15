"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, Clock3, History, Plus, UserRound } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { canTransitionCrmTask, CRM_TASK_STATUS_LABELS } from "@/lib/crm";
import type { CrmActivity, CrmTask, CrmTaskStatus } from "@/lib/models";
import { CrmQuotePanel } from "./CrmQuotePanel";

export interface CrmTeamMember {
  id: string;
  display_name: string;
  staff_role: string;
}

const taskStatuses = Object.keys(CRM_TASK_STATUS_LABELS) as CrmTaskStatus[];
const activityLabels = {
  note: "Not",
  call: "Telefon görüşmesi",
  email: "E-posta",
  meeting: "Toplantı",
  system: "Sistem",
} as const;

function dateTime(value: string) {
  return new Date(value).toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function CrmLeadOperations({
  leadId,
  team,
}: {
  leadId: string;
  team: CrmTeamMember[];
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [activityType, setActivityType] = useState<
    "note" | "call" | "email" | "meeting"
  >("note");
  const [activityContent, setActivityContent] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueAt, setTaskDueAt] = useState("");
  const [taskPriority, setTaskPriority] = useState<"low" | "normal" | "high">(
    "normal",
  );
  const [taskAssignee, setTaskAssignee] = useState("");
  const [saving, setSaving] = useState(false);

  const activities = useQuery({
    queryKey: ["crm-activities", leadId],
    queryFn: () => api<CrmActivity[]>(`/admin/crm/leads/${leadId}/activities`),
    enabled: open,
  });
  const tasks = useQuery({
    queryKey: ["crm-tasks", leadId],
    queryFn: () => api<CrmTask[]>(`/admin/crm/tasks?lead_id=${leadId}`),
    enabled: open,
  });

  async function addActivity(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await api(`/admin/crm/leads/${leadId}/activities`, {
        method: "POST",
        body: JSON.stringify({ type: activityType, content: activityContent }),
      });
      setActivityContent("");
      await qc.invalidateQueries({ queryKey: ["crm-activities", leadId] });
      toast.success("Aktivite zaman çizelgesine eklendi.");
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Aktivite eklenemedi.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function addTask(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await api("/admin/crm/tasks", {
        method: "POST",
        body: JSON.stringify({
          lead_id: leadId,
          title: taskTitle,
          description: "",
          priority: taskPriority,
          due_at: taskDueAt ? new Date(taskDueAt).toISOString() : null,
          assigned_to: taskAssignee || null,
        }),
      });
      setTaskTitle("");
      setTaskDueAt("");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["crm-tasks", leadId] }),
        qc.invalidateQueries({ queryKey: ["crm-leads"] }),
      ]);
      toast.success("Görev oluşturuldu.");
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Görev oluşturulamadı.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function updateTask(task: CrmTask, status: CrmTaskStatus) {
    try {
      await api(`/admin/crm/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["crm-tasks", leadId] }),
        qc.invalidateQueries({ queryKey: ["crm-leads"] }),
      ]);
      toast.success("Görev durumu güncellendi.");
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Görev güncellenemedi.",
      );
    }
  }

  return (
    <div className="crm-operations">
      <button
        className="crm-operations-trigger"
        type="button"
        aria-expanded={open}
        aria-controls={`crm-operations-${leadId}`}
        onClick={() => setOpen((value) => !value)}
      >
        <History size={16} />{" "}
        {open ? "İş takibini kapat" : "Aktivite ve görevler"}
      </button>
      {open ? (
        <div className="crm-operations-panel" id={`crm-operations-${leadId}`}>
          <section>
            <h4>
              <History size={15} /> Zaman çizelgesi
            </h4>
            <form className="crm-compact-form" onSubmit={addActivity}>
              <select
                aria-label="Aktivite türü"
                value={activityType}
                onChange={(event) =>
                  setActivityType(event.target.value as typeof activityType)
                }
              >
                <option value="note">Not</option>
                <option value="call">Telefon görüşmesi</option>
                <option value="email">E-posta</option>
                <option value="meeting">Toplantı</option>
              </select>
              <textarea
                aria-label="Aktivite açıklaması"
                placeholder="Görüşme sonucu veya müşteri notu"
                minLength={2}
                maxLength={4000}
                required
                value={activityContent}
                onChange={(event) => setActivityContent(event.target.value)}
              />
              <button type="submit" disabled={saving}>
                <Plus size={15} /> Ekle
              </button>
            </form>
            {activities.isLoading ? (
              <p className="crm-inline-state">Aktiviteler yükleniyor…</p>
            ) : null}
            {activities.error ? (
              <p className="crm-inline-error">{activities.error.message}</p>
            ) : null}
            <div className="crm-timeline">
              {activities.data?.map((activity) => (
                <article key={activity.id}>
                  <i aria-hidden="true" />
                  <div>
                    <strong>{activityLabels[activity.type]}</strong>
                    <time dateTime={activity.occurred_at}>
                      {dateTime(activity.occurred_at)}
                    </time>
                    <p>{activity.content}</p>
                  </div>
                </article>
              ))}
              {activities.data?.length === 0 ? (
                <p className="crm-inline-state">Henüz aktivite yok.</p>
              ) : null}
            </div>
          </section>
          <section>
            <h4>
              <CheckCircle2 size={15} /> Görevler
            </h4>
            <form className="crm-compact-form" onSubmit={addTask}>
              <input
                aria-label="Görev başlığı"
                placeholder="Örn. Teklif için müşteriyi ara"
                minLength={2}
                maxLength={180}
                required
                value={taskTitle}
                onChange={(event) => setTaskTitle(event.target.value)}
              />
              <div className="crm-form-row">
                <select
                  aria-label="Görev önceliği"
                  value={taskPriority}
                  onChange={(event) =>
                    setTaskPriority(event.target.value as typeof taskPriority)
                  }
                >
                  <option value="low">Düşük</option>
                  <option value="normal">Normal</option>
                  <option value="high">Yüksek</option>
                </select>
                <input
                  aria-label="Görev vadesi"
                  type="datetime-local"
                  value={taskDueAt}
                  onChange={(event) => setTaskDueAt(event.target.value)}
                />
              </div>
              <select
                aria-label="Görev sorumlusu"
                value={taskAssignee}
                onChange={(event) => setTaskAssignee(event.target.value)}
              >
                <option value="">Sorumlu seçilmedi</option>
                {team.map((member) => (
                  <option value={member.id} key={member.id}>
                    {member.display_name}
                  </option>
                ))}
              </select>
              <button type="submit" disabled={saving}>
                <Plus size={15} /> Görev oluştur
              </button>
            </form>
            {tasks.isLoading ? (
              <p className="crm-inline-state">Görevler yükleniyor…</p>
            ) : null}
            {tasks.error ? (
              <p className="crm-inline-error">{tasks.error.message}</p>
            ) : null}
            <div className="crm-task-list">
              {tasks.data?.map((task) => (
                <article className={`priority-${task.priority}`} key={task.id}>
                  <div>
                    <strong>{task.title}</strong>
                    <small>
                      <UserRound size={13} />{" "}
                      {team.find((member) => member.id === task.assigned_to)
                        ?.display_name || "Atanmamış"}
                    </small>
                    {task.due_at ? (
                      <small>
                        <Clock3 size={13} /> {dateTime(task.due_at)}
                      </small>
                    ) : null}
                  </div>
                  <select
                    aria-label={`${task.title} durumu`}
                    value={task.status}
                    onChange={(event) =>
                      updateTask(task, event.target.value as CrmTaskStatus)
                    }
                  >
                    <option value={task.status}>
                      {CRM_TASK_STATUS_LABELS[task.status]}
                    </option>
                    {taskStatuses
                      .filter(
                        (status) =>
                          status !== task.status &&
                          canTransitionCrmTask(task.status, status),
                      )
                      .map((status) => (
                        <option value={status} key={status}>
                          {CRM_TASK_STATUS_LABELS[status]}
                        </option>
                      ))}
                  </select>
                </article>
              ))}
              {tasks.data?.length === 0 ? (
                <p className="crm-inline-state">Henüz görev yok.</p>
              ) : null}
            </div>
          </section>
          <CrmQuotePanel leadId={leadId} />
        </div>
      ) : null}
    </div>
  );
}
