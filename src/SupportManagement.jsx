import React, { useEffect, useState } from "react";
import useAdminResource from "./use-admin-resource";
import { adminRequest } from "./admin-api";
import { ResourceState } from "./orders-ui";
import { PricingDialog } from "./pricing-ui";
import {
  ticketPath,
  ticketPriorities,
  supportDate,
  readTicket,
} from "./support-api";
const uncertainNotes = new Map();
export default function SupportManagement({
  row,
  onUpdated,
  onDeleted,
  onBusyChange = () => {},
  disabled = false,
  onSessionExpired,
}) {
  const assignees = useAdminResource("/api/support-tickets/admin/assignees"),
    me = useAdminResource("/api/admin/me");
  const [action, setAction] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [note, setNote] = useState(uncertainNotes.get(row.id)?.body || ""),
    [pending, setPending] = useState(uncertainNotes.get(row.id) || null),
    [committed, setCommitted] = useState(false);
  useEffect(() => {
    onBusyChange(busy);
    return () => onBusyChange(false);
  }, [busy]);
  const staff = assignees.data?.data?.items || [],
    account = me.data?.data,
    notes = Array.isArray(row.internal_notes) ? row.internal_notes : [];
  async function save() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (action.kind === "note") {
        let record = pending;
        if (!record) {
          if (!note.trim() || note.trim().length > 2000)
            throw new Error("اكتب ملاحظة من 1 إلى 2000 حرف.");
          record = { body: note.trim(), unknown: true };
          uncertainNotes.set(row.id, record);
          setPending(record);
          try {
            const result = await adminRequest(ticketPath(row.id) + "/notes", {
              method: "POST",
              body: { body: record.body },
            });
            if (!result.data?.id)
              throw new Error(
                "تعذر تأكيد رقم الملاحظة. راجع التذكرة قبل إعادة الإرسال.",
              );
            record = { id: result.data.id, body: record.body };
            uncertainNotes.set(row.id, record);
            setPending(record);
          } catch (e) {
            if (e.status && e.status < 500) {
              uncertainNotes.delete(row.id);
              setPending(null);
            }
            throw e;
          }
        }
        if (!record.id)
          throw new Error(
            "نتيجة الإرسال غير مؤكدة. راجع الملاحظات قبل إرسال ملاحظة جديدة.",
          );
        const fresh = await readTicket(row.id);
        if (
          !fresh.internal_notes?.some(
            (x) => x.id === record.id && x.body === record.body,
          )
        )
          throw new Error("لم تظهر الملاحظة في التذكرة. أعد التحقق.");
        uncertainNotes.delete(row.id);
        setPending(null);
        setNote("");
        onUpdated(fresh);
      } else if (action.kind === "delete") {
        if (!committed) {
          try {
            await adminRequest(ticketPath(row.id), { method: "DELETE" });
          } catch (e) {
            if (e.status !== 404) {
              if (!e.status || e.status >= 500) setCommitted(true);
              throw e;
            }
          }
          setCommitted(true);
        }
        let absent = false;
        try {
          await adminRequest(ticketPath(row.id));
        } catch (e) {
          if (e.status === 404) absent = true;
          else throw e;
        }
        if (!absent) throw new Error("التذكرة ما زالت متاحة. أعد التحقق.");
        onDeleted();
      } else {
        const suffix =
          action.kind === "assign"
            ? "assign"
            : action.kind === "priority"
              ? "priority"
              : "notes/" + encodeURIComponent(action.id);
        if (!committed) {
          try {
            await adminRequest(ticketPath(row.id) + "/" + suffix, {
              method: action.kind === "delete-note" ? "DELETE" : "PATCH",
              ...(action.kind === "assign"
                ? { body: { staffId: action.value || null } }
                : action.kind === "priority"
                  ? { body: { priority: action.value } }
                  : {}),
            });
          } catch (e) {
            if (!(action.kind === "delete-note" && e.status === 404)) {
              if (!e.status || e.status >= 500) setCommitted(true);
              throw e;
            }
          }
          setCommitted(true);
        }
        const fresh = await readTicket(row.id);
        if (
          action.kind === "assign" &&
          (fresh.assigned_to ?? null) !== (action.value || null)
        )
          throw new Error("لم يتم تأكيد الموظف المحفوظ.");
        if (action.kind === "priority" && fresh.priority !== action.value)
          throw new Error("لم يتم تأكيد الأولوية المحفوظة.");
        if (
          action.kind === "delete-note" &&
          (!Array.isArray(fresh.internal_notes) ||
            fresh.internal_notes.some((x) => x.id === action.id))
        )
          throw new Error("الملاحظة ما زالت موجودة.");
        onUpdated(fresh);
      }
      setAction(null);
      setCommitted(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function open(value) {
    setAction(value);
    setCommitted(false);
    setError("");
  }
  return (
    <section className="support-management">
      <ResourceState resource={assignees} onLogin={onSessionExpired} />
      <div className="support-management-controls">
        <label>
          الموظف المسؤول
          <select
            aria-label="تعيين التذكرة"
            disabled={
              disabled || busy || assignees.loading || !!assignees.error
            }
            value={row.assigned_to || ""}
            onChange={(e) => open({ kind: "assign", value: e.target.value })}
          >
            <option value="">غير معيّن</option>
            {row.assigned_to &&
              !staff.some((x) => x.id === row.assigned_to) && (
                <option value={row.assigned_to}>
                  {row.assigned_name || "الموظف الحالي"}
                </option>
              )}
            {staff.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name} · {x.open_tickets} مفتوحة
              </option>
            ))}
          </select>
        </label>
        <label>
          الأولوية
          <select
            aria-label="تغيير أولوية التذكرة"
            value={row.priority || "normal"}
            disabled={disabled || busy}
            onChange={(e) => open({ kind: "priority", value: e.target.value })}
          >
            {Object.entries(ticketPriorities).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button
          className="delete-ticket"
          disabled={disabled || busy}
          onClick={() => open({ kind: "delete" })}
        >
          حذف التذكرة
        </button>
      </div>
      <h3>الملاحظات الداخلية</h3>
      <p className="support-api-note">
        تظهر للإدارة فقط، ولا تُرسل للعميل أو المورد.
      </p>
      {notes.map((n) => (
        <article className="support-private-note" key={n.id}>
          <b>{n.author_name || "الإدارة"}</b>
          <p>{n.body}</p>
          <small>{supportDate(n.created_at)}</small>
          {(account?.isSuperAdmin || account?.id === n.author_id) && (
            <button
              disabled={disabled || busy}
              onClick={() => open({ kind: "delete-note", id: n.id })}
              aria-label={"حذف الملاحظة " + n.id}
            >
              حذف الملاحظة
            </button>
          )}
        </article>
      ))}
      {!notes.length && (
        <p className="support-api-note">لا توجد ملاحظات داخلية مسجلة.</p>
      )}
      <textarea
        aria-label="نص الملاحظة الداخلية"
        value={note}
        maxLength={2000}
        disabled={disabled || busy || !!pending}
        onChange={(e) => setNote(e.target.value)}
        placeholder="اكتب ملاحظة داخلية…"
      />
      {pending?.unknown && (
        <p role="alert">
          نتيجة إضافة الملاحظة غير مؤكدة. حدّث التذكرة وراجع الملاحظات قبل
          إرسالها مرة أخرى.
        </p>
      )}
      <button
        className="pricing-primary"
        disabled={
          disabled || busy || (!note.trim() && !pending) || !!pending?.unknown
        }
        onClick={() => open({ kind: "note" })}
      >
        {pending ? "إعادة التحقق من الملاحظة" : "إضافة ملاحظة داخلية"}
      </button>
      {action && (
        <PricingDialog
          title={
            action.kind === "delete"
              ? "حذف التذكرة"
              : action.kind === "note"
                ? "حفظ ملاحظة داخلية"
                : action.kind === "delete-note"
                  ? "حذف الملاحظة"
                  : action.kind === "assign"
                    ? "تعيين مسؤول التذكرة"
                    : "تغيير الأولوية"
          }
          busy={busy}
          onClose={() => {
            setAction(null);
            setCommitted(false);
          }}
        >
          <p>
            {action.kind === "delete"
              ? "سيتم إخفاء التذكرة من الإدارة وتطبيق العميل أو المورد، مع الاحتفاظ بالرسائل للمراجعة."
              : action.kind === "note"
                ? "لن يظهر هذا النص للعميل أو المورد."
                : action.kind === "assign"
                  ? "تأكيد الموظف المسؤول عن هذه التذكرة؟"
                  : "تأكيد حفظ التغيير؟"}
          </p>
          {error && (
            <p className="support-api-error" role="alert">
              {error}
            </p>
          )}
          <button className="pricing-primary" disabled={busy} onClick={save}>
            {committed || pending?.id ? "إعادة التحقق" : "تأكيد"}
          </button>
        </PricingDialog>
      )}
    </section>
  );
}
