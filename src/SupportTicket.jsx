import React, { useEffect, useState } from "react";
import { Send, RefreshCw } from "lucide-react";
import { adminRequest } from "./admin-api";
import { ResourceState } from "./orders-ui";
import { PricingDialog } from "./pricing-ui";
import { useMutation, Feedback } from "./ProductExtras";
import {
  ticketPath,
  ticketStatuses,
  ticketPriorities,
  supportDate,
  readTicket,
  ticketStatusBody,
  ticketReplyBody,
  verifyTicketReply,
} from "./support-api";
import { TicketAttachments, TicketUpload } from "./SupportAttachments";
export function TicketBadge({ status }) {
  const [label, color] = ticketStatuses[status] || [status || "—", "blue"];
  return (
    <span className={"pricing-badge " + color}>
      <i />
      {label}
    </span>
  );
}
export default function SupportTicket({
  id,
  listRow,
  onChanged,
  onBusyChange,
  uncertain,
  onUncertain,
  onSessionExpired,
}) {
  const [resource, setResource] = useState({
      loading: true,
      data: null,
      error: null,
    }),
    [revision, setRevision] = useState(0),
    [text, setText] = useState(""),
    [files, setFiles] = useState([]),
    [uploading, setUploading] = useState(false),
    [replyRecord, setReplyRecord] = useState(null),
    [statusAction, setStatusAction] = useState(null),
    [statusCommitted, setStatusCommitted] = useState(false),
    reply = useMutation(),
    statusMutation = useMutation();
  const row = resource.data,
    busy = reply.busy || statusMutation.busy || uploading;
  useEffect(() => {
    onBusyChange(busy);
    return () => onBusyChange(false);
  }, [busy]);
  useEffect(() => {
    let cancelled = false;
    setResource({ loading: true, data: null, error: null });
    readTicket(id)
      .then((data) => {
        if (!cancelled) setResource({ loading: false, data, error: null });
      })
      .catch((error) => {
        if (!cancelled) setResource({ loading: false, data: null, error });
      });
    return () => {
      cancelled = true;
    };
  }, [id, revision]);
  function refresh() {
    setRevision((n) => n + 1);
  }
  async function send(e) {
    e.preventDefault();
    if (uncertain || uploading) return;
    await reply.run(async () => {
      let saved = replyRecord;
      if (!saved) {
        const body = ticketReplyBody(text, files);
        let result;
        try {
          result = await adminRequest(ticketPath(id) + "/reply", {
            method: "POST",
            body,
          });
        } catch (error) {
          if (!error.status || error.status >= 500) onUncertain(id);
          throw error;
        }
        if (!result.data?.id) {
          onUncertain(id);
          throw new Error(
            "الخادم لم يرجع رقم الرد. راجع المحادثة قبل تكرار الإرسال.",
          );
        }
        saved = { id: result.data.id, body };
        setReplyRecord(saved);
        setText("");
        setFiles([]);
      }
      const fresh = await readTicket(id);
      verifyTicketReply(fresh, saved.id, saved.body);
      setResource({ loading: false, data: fresh, error: null });
      setReplyRecord(null);
      reply.setNotice("تم إرسال الرد وتأكيد ظهوره في المحادثة.");
      onChanged();
    });
  }
  async function changeStatus() {
    await statusMutation.run(async () => {
      if (!statusCommitted) {
        await adminRequest(ticketPath(id) + "/status", {
          method: "PATCH",
          body: ticketStatusBody(statusAction),
        });
        setStatusCommitted(true);
      }
      const fresh = await readTicket(id);
      if (fresh.status !== statusAction)
        throw new Error(
          "حالة التذكرة لم ترجع بالقيمة المحفوظة. حدّث البيانات.",
        );
      setResource({ loading: false, data: fresh, error: null });
      setStatusAction(null);
      setStatusCommitted(false);
      statusMutation.setNotice("تم حفظ حالة التذكرة وتأكيدها من الخادم.");
      onChanged();
    });
  }
  const source =
      row?.source ||
      listRow?.source ||
      (row?.supplier_id ? "supplier" : row?.user_id ? "customer" : null),
    name =
      source === "supplier"
        ? row?.supplier_name || listRow?.supplier_name || row?.customer_name
        : row?.customer_name || listRow?.customer_name;
  return (
    <div className="support-ticket-detail">
      <ResourceState
        resource={{ ...resource, reload: refresh }}
        onLogin={onSessionExpired}
      />
      {row && (
        <>
          <div className="support-detail-toolbar">
            <b className="support-ticket-number">{row.ticket_number || "—"}</b>
            <TicketBadge status={row.status} />
            <select
              aria-label="حالة التذكرة"
              value={row.status}
              disabled={busy}
              onChange={(e) => {
                setStatusCommitted(false);
                setStatusAction(e.target.value);
              }}
            >
              {!ticketStatuses[row.status] && (
                <option value={row.status}>{row.status}</option>
              )}
              {Object.entries(ticketStatuses).map(([key, [label]]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <select aria-label="تعيين التذكرة" disabled>
              <option>تعيين الموظف غير متاح حاليًا</option>
            </select>
            <button className="pricing-back" disabled={busy} onClick={refresh}>
              <RefreshCw size={14} />
              تحديث
            </button>
          </div>
          <Feedback mutation={statusMutation} />
          <section className="support-summary">
            <div className="support-summary-banner">
              <h2>
                {row.ticket_number} — {row.subject || "—"}
              </h2>
              <small>أنشئت في {supportDate(row.created_at)}</small>
            </div>
            <div className="support-summary-meta">
              {[
                [
                  "نوع التذكرة",
                  row.category_name ||
                    row.category_name_en ||
                    row.category ||
                    "—",
                ],
                ["رقم الطلب", row.order_number || "—"],
                [
                  "الأولوية",
                  ticketPriorities[row.priority] || row.priority || "—",
                ],
                ["آخر تحديث", supportDate(row.updated_at)],
              ].map(([label, value]) => (
                <div key={label}>
                  <small>{label}</small>
                  <b>{value}</b>
                </div>
              ))}
            </div>
            {row.description && (
              <p className="support-description">{row.description}</p>
            )}
            <div className="support-customer">
              <span className="support-avatar">{name?.[0] || "—"}</span>
              <b>
                {name || "—"} ·{" "}
                {source === "supplier"
                  ? "مورد"
                  : source === "customer"
                    ? "عميل"
                    : "—"}
              </b>
            </div>
            <div className="support-contact">
              <div>
                <small>البريد الإلكتروني</small>
                <span dir="ltr">
                  {row.customer_email || row.supplier_email || "—"}
                </span>
              </div>
              <div>
                <small>رقم الجوال</small>
                <span dir="ltr">
                  {row.customer_phone ||
                    row.supplier_phone ||
                    listRow?.customer_phone ||
                    "—"}
                </span>
              </div>
            </div>
          </section>
          <section className="support-attachments">
            <h2>مرفقات التذكرة</h2>
            <TicketAttachments items={row.attachments} />
          </section>
          <section className="support-chat">
            <h2>المحادثة ({row.messages.length} رسالة)</h2>
            <div className="support-messages">
              {row.messages.map((message) => (
                <article
                  className={
                    "support-message " +
                    (message.is_staff ? "support" : "client")
                  }
                  key={message.id}
                >
                  <div className="support-message-name">
                    {message.sender_name ||
                      (message.is_staff ? "فريق الدعم" : name) ||
                      "—"}
                  </div>
                  <p>{message.body || "—"}</p>
                  {message.attachments?.length > 0 && (
                    <TicketAttachments items={message.attachments} />
                  )}
                  <small>{supportDate(message.created_at)}</small>
                </article>
              ))}
              {!row.messages.length && (
                <p className="support-api-note">لا توجد رسائل مسجلة.</p>
              )}
            </div>
            <form className="support-reply-form" onSubmit={send}>
              <div className="support-composer">
                <textarea
                  aria-label="رسالة الرد"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="اكتب ردك هنا…"
                  disabled={
                    busy ||
                    row.status === "closed" ||
                    !!replyRecord ||
                    uncertain
                  }
                />
                <button
                  aria-label={replyRecord ? "تأكيد الرد" : "إرسال الرد"}
                  type="submit"
                  disabled={
                    busy ||
                    uncertain ||
                    (!replyRecord && (row.status === "closed" || !text.trim()))
                  }
                >
                  <Send size={18} />
                </button>
              </div>
              <TicketUpload
                items={files}
                onChange={setFiles}
                onBusyChange={setUploading}
                disabled={
                  busy || row.status === "closed" || !!replyRecord || uncertain
                }
              />
              <Feedback mutation={reply} />
              {replyRecord && (
                <p className="support-api-note">
                  تم إرسال الرد؛ اضغط «تأكيد الرد» لتحديث المحادثة بدون إرسال
                  الرد تاني.
                </p>
              )}
              {uncertain && (
                <p className="support-api-error" role="alert">
                  نتيجة الإرسال السابق غير مؤكدة. حدّث المحادثة وراجعها قبل أي
                  محاولة جديدة.
                </p>
              )}
              {row.status === "closed" && (
                <p className="support-api-note">أعد فتح التذكرة لإضافة رد.</p>
              )}
            </form>
          </section>
          <section className="support-quick-actions">
            <h2>إجراءات سريعة</h2>
            <div>
              <button className="escalate" disabled title="غير متاح حاليًا">
                رفع الأولوية للمشرف
              </button>
              <button
                className="close-ticket"
                disabled={busy || row.status === "closed"}
                onClick={() => {
                  setStatusCommitted(false);
                  setStatusAction("closed");
                }}
              >
                إغلاق التذكرة
              </button>
              <button
                className="reopen-ticket"
                disabled={busy || !["closed", "resolved"].includes(row.status)}
                onClick={() => {
                  setStatusCommitted(false);
                  setStatusAction("in_progress");
                }}
              >
                إعادة فتح
              </button>
              <button
                className="delete-ticket"
                disabled
                title="غير متاح حاليًا"
              >
                حذف التذكرة
              </button>
              <button
                className="internal-note"
                disabled
                title="غير متاح حاليًا"
              >
                إضافة ملاحظة داخلية
              </button>
            </div>
            <p className="support-api-note">
              تعيين الموظف وتغيير الأولوية والملاحظات الداخلية والحذف غير متاحين
              حاليًا.
            </p>
          </section>
        </>
      )}
      {statusAction && (
        <PricingDialog
          title="تغيير حالة التذكرة"
          onClose={() => {
            setStatusAction(null);
            setStatusCommitted(false);
          }}
          busy={statusMutation.busy}
        >
          <p className="support-api-note">
            {row?.ticket_number} — {ticketStatuses[statusAction]?.[0]}
          </p>
          <Feedback mutation={statusMutation} />
          {statusCommitted && (
            <p className="support-api-note">
              تم إرسال التغيير؛ الزر هيأكد البيانات بدون تكرار التعديل.
            </p>
          )}
          <div className="quote-modal-buttons">
            <button
              className="pricing-primary"
              disabled={statusMutation.busy}
              onClick={changeStatus}
            >
              {statusCommitted ? "تأكيد البيانات" : "تأكيد تغيير الحالة"}
            </button>
            <button
              className="pricing-back"
              disabled={statusMutation.busy}
              onClick={() => {
                setStatusAction(null);
                setStatusCommitted(false);
              }}
            >
              إلغاء
            </button>
          </div>
        </PricingDialog>
      )}
    </div>
  );
}
