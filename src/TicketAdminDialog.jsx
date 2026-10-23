import React from "react";
import { PricingDialog } from "./pricing-ui";
import { SupplierModal } from "./supplier-ui";
import { ticketPriorities, supportDate } from "./support-api";
export function TicketAssignment({ admin, row, disabled }) {
  const staff = admin.assignees.data?.data?.items,
    valid = Array.isArray(staff);
  return (
    <select
      title={
        admin.assignees.error?.message || "تعيين موظف مسؤول أو إلغاء التعيين"
      }
      aria-label="تعيين التذكرة"
      value={row.assigned_to || ""}
      disabled={
        disabled ||
        !admin.canManage ||
        admin.assignees.loading ||
        !valid ||
        !!admin.assignees.error
      }
      onChange={(e) =>
        admin.open("assign", { staffId: e.target.value || null })
      }
    >
      <option value="">غير معيّنة</option>
      {row.assigned_to && !staff?.some((s) => s.id === row.assigned_to) && (
        <option value={row.assigned_to}>
          {row.assigned_name || "الموظف الحالي"}
        </option>
      )}
      {(staff || []).map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
          {s.open_tickets != null ? " (" + s.open_tickets + ")" : ""}
        </option>
      ))}
    </select>
  );
}
export default function TicketAdminDialog({ admin, supplier = false }) {
  const { action, row } = admin;
  if (!action || !row) return null;
  const titles = {
    assign: "تعيين التذكرة",
    priority: "تغيير الأولوية",
    notes: "الملاحظات الداخلية",
    delete: "حذف التذكرة",
    deleteNote: "حذف الملاحظة",
  };
  const Dialog = supplier ? SupplierModal : PricingDialog;
  return (
    <Dialog title={titles[action.kind]} busy={admin.busy} onClose={admin.close}>
      <p>{row.ticket_number || row.subject}</p>
      {action.kind === "assign" && (
        <p>
          {action.staffId
            ? "تأكيد إسناد التذكرة إلى " +
              (admin.assignees.data?.data?.items?.find(
                (s) => s.id === action.staffId,
              )?.name || "الموظف المحدد")
            : "إلغاء تعيين الموظف لهذه التذكرة؟"}
        </p>
      )}
      {action.kind === "priority" && (
        <label className="pricing-field">
          <span>الأولوية</span>
          <select
            aria-label="أولوية التذكرة"
            disabled={admin.busy || action.sent}
            value={action.priority}
            onChange={(e) =>
              admin.setAction({ ...action, priority: e.target.value })
            }
          >
            {Object.entries(ticketPriorities).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
      )}
      {action.kind === "delete" && (
        <p>هتختفي التذكرة من قوائم الإدارة والعميل أو المورد. تأكيد الحذف؟</p>
      )}
      {action.kind === "deleteNote" && <p>تأكيد حذف الملاحظة الداخلية؟</p>}
      {action.kind === "notes" && (
        <>
          <p className="support-api-note">
            الملاحظات للإدارة فقط، ولا تظهر للعميل أو المورد ولا تُرسل كرسالة.
          </p>
          {Array.isArray(row.internal_notes) ? (
            row.internal_notes.map((n) => (
              <article className="support-message" key={n.id}>
                <b>{n.author_name || "الإدارة"}</b>
                <small> — {supportDate(n.created_at)}</small>
                <p>{n.body}</p>
                {(admin.account?.isSuperAdmin ||
                  n.author_id === admin.account?.id) && (
                  <button
                    type="button"
                    className="pricing-back"
                    disabled={admin.busy || !admin.canManage || !!admin.pending}
                    onClick={() => admin.open("deleteNote", { noteId: n.id })}
                  >
                    حذف الملاحظة
                  </button>
                )}
              </article>
            ))
          ) : (
            <p className="support-api-note">
              قائمة الملاحظات غير مكتملة؛ حدّث التذكرة قبل الإضافة.
            </p>
          )}
          <label className="pricing-field">
            <span>ملاحظة داخلية</span>
            <textarea
              aria-label="نص الملاحظة الداخلية"
              maxLength={2000}
              value={admin.note}
              disabled={
                admin.busy ||
                !admin.canManage ||
                !!admin.pending ||
                !Array.isArray(row.internal_notes)
              }
              onChange={(e) => admin.setNote(e.target.value)}
            />
          </label>
        </>
      )}
      {admin.error && (
        <p className="support-api-error" role="alert">
          {admin.error}
        </p>
      )}
      <div className="quote-modal-buttons">
        <button
          className={supplier ? "su-button" : "pricing-primary"}
          disabled={
            admin.busy ||
            !admin.canManage ||
            (action.kind === "notes" &&
              (!Array.isArray(row.internal_notes) ||
                (!admin.pending && !admin.note.trim())))
          }
          onClick={admin.save}
        >
          {action.sent || (action.kind === "notes" && admin.pending)
            ? "إعادة التحقق"
            : action.kind === "notes"
              ? "حفظ الملاحظة"
              : "تأكيد"}
        </button>
        <button
          className={supplier ? "su-button secondary" : "pricing-back"}
          disabled={admin.busy}
          onClick={admin.close}
        >
          إلغاء
        </button>
      </div>
    </Dialog>
  );
}
