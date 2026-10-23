import useTicketAdministration from "./use-ticket-administration";
import TicketAdminDialog, { TicketAssignment } from "./TicketAdminDialog";
import React, { useEffect, useState } from "react";
import { adminRequest } from "./admin-api";
import useAdminResource from "./use-admin-resource";
import { ResourceState } from "./orders-ui";
import {
  attachmentRows,
  readTicket,
  verifyTicketReply,
  ticketPriorities,
} from "./support-api";
import {
  SupplierIcon,
  SupplierPanel,
  SupplierField,
  SupplierBadge,
  SupplierModal,
} from "./supplier-ui";
const date = (v) =>
  v
    ? new Intl.DateTimeFormat("ar-EG", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Riyadh",
      }).format(new Date(v))
    : "—";
export default function SupplierTickets({ supplier, onSessionExpired }) {
  const [resource, setResource] = useState({
      loading: true,
      data: null,
      error: null,
    }),
    [revision, setRevision] = useState(0),
    [selected, setSelected] = useState(null),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    async function load() {
      setResource({ loading: true, data: null, error: null });
      try {
        let items = [],
          total = Infinity,
          offset = 0;
        while (offset < total) {
          const result = await adminRequest(
            "/api/support-tickets/admin?source=supplier&limit=100&offset=" +
              offset,
          );
          if (
            !Array.isArray(result.data?.items) ||
            !Number.isFinite(result.data.total)
          )
            throw new Error("رد قائمة التذاكر غير مكتمل.");
          items.push(...result.data.items);
          total = result.data.total;
          if (!result.data.items.length && offset < total)
            throw new Error("تعذر تحميل جميع التذاكر.");
          offset += result.data.items.length;
        }
        const rows = items.filter((x) => x.supplier_id === supplier.id);
        if (active) {
          setResource({ loading: false, data: rows, error: null });
          setSelected((id) =>
            rows.some((x) => x.id === id) ? id : rows[0]?.id || null,
          );
        }
      } catch (error) {
        if (active) setResource({ loading: false, data: null, error });
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [supplier.id, revision]);
  const rows = (resource.data || []).filter(
    (x) =>
      (!status || x.status === status) &&
      (!search ||
        [x.ticket_number, x.subject].some((v) => v?.includes(search))),
  );
  const counts = resource.data || [];
  return (
    <SupplierPanel>
      <ResourceState
        resource={{ ...resource, reload: () => setRevision((n) => n + 1) }}
        onLogin={onSessionExpired}
      />
      <div className="su-ticket-layout">
        <aside className="su-ticket-sidebar">
          <div className="su-panel-heading">
            <h3>جميع التذاكر</h3>
            <span className="su-muted">
              {resource.data?.length ?? "—"} تذكرة
            </span>
          </div>
          <div className="su-ticket-search">
            <SupplierField label="البحث">
              <input
                placeholder="ابحث برقم التذكرة أو الاسم..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </SupplierField>
          </div>
          <div className="su-status-tabs">
            {[
              ["", "الكل"],
              ["open", "جديد"],
              ["in_progress", "تحت المعالجة"],
            ].map(([key, label]) => (
              <button
                key={key}
                className={status === key ? "active" : ""}
                onClick={() => setStatus(key)}
              >
                {label}
                <span>
                  {key
                    ? counts.filter((x) => x.status === key).length
                    : (resource.data?.length ?? "—")}
                </span>
              </button>
            ))}
          </div>
          {rows.map((row) => (
            <button
              key={row.id}
              disabled={busy}
              className={
                "su-ticket-card" + (row.id === selected ? " active" : "")
              }
              onClick={() => setSelected(row.id)}
            >
              <div>
                <b>رقم التذكرة {row.ticket_number}</b>
                <SupplierBadge
                  status={row.status}
                  label={
                    {
                      open: "جديد",
                      in_progress: "تحت المعالجة",
                      closed: "مغلقة",
                      resolved: "تم الحل",
                    }[row.status]
                  }
                />
              </div>
              <small className="su-muted">
                التاريخ {date(row.created_at)} · نوع التذكرة{" "}
                {row.category_name || row.category}
              </small>
              <p>{row.subject}</p>
            </button>
          ))}
          {resource.data && !rows.length && (
            <p className="su-empty">لا توجد تذاكر لهذا المورد.</p>
          )}
        </aside>
        <div className="su-ticket-thread">
          {selected ? (
            <SupplierThread
              key={selected}
              id={selected}
              supplier={supplier}
              onSessionExpired={onSessionExpired}
              onBusy={setBusy}
              onChanged={() => setRevision((n) => n + 1)}
            />
          ) : (
            <p className="su-empty">اختر تذكرة لعرض المحادثة.</p>
          )}
        </div>
      </div>
    </SupplierPanel>
  );
}
const ticketOutcomes = new Map();
function SupplierThread({ id, supplier, onSessionExpired, onBusy, onChanged }) {
  const previous = ticketOutcomes.get(id);
  const [revision, setRevision] = useState(0),
    [reply, setReply] = useState(previous?.body || ""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [record, setRecord] = useState(previous?.record || null),
    [uncertain, setUncertain] = useState(!!previous?.uncertain),
    [action, setAction] = useState(null);
  const resource = useAdminResource(
      "/api/support-tickets/admin/" + encodeURIComponent(id),
      revision,
    ),
    row = resource.data?.data;
  const administration = useTicketAdministration({
    row,
    onUpdated: () => {
      setRevision((n) => n + 1);
      onChanged();
    },
    onDeleted: onChanged,
  });
  useEffect(() => {
    onBusy(busy || administration.busy);
    return () => onBusy(false);
  }, [busy, administration.busy]);
  async function send(e) {
    e.preventDefault();
    if (busy || administration.busy || uncertain) return;
    setBusy(true);
    setError("");
    try {
      let saved = record;
      if (!saved) {
        ticketOutcomes.set(id, { body: reply.trim(), uncertain: true });
        try {
          const r = await adminRequest(
            "/api/support-tickets/admin/" + encodeURIComponent(id) + "/reply",
            { method: "POST", body: { body: reply.trim(), attachments: [] } },
          );
          if (!r.data?.id) {
            setUncertain(true);
            throw new Error("تعذر تأكيد الرد. راجع المحادثة قبل إرسال رد آخر.");
          }
          saved = r.data;
          ticketOutcomes.set(id, { body: reply.trim(), record: saved });
          setRecord(saved);
        } catch (err) {
          if (!err.status || err.status >= 500) setUncertain(true);
          else ticketOutcomes.delete(id);
          throw err;
        }
      }
      const result = await readTicket(id);
      verifyTicketReply(result, saved.id, {
        body: reply.trim(),
        attachments: [],
      });
      ticketOutcomes.delete(id);
      setRecord(null);
      setReply("");
      setRevision((n) => n + 1);
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  async function update() {
    setBusy(true);
    setError("");
    try {
      await adminRequest(
        "/api/support-tickets/admin/" + encodeURIComponent(id) + "/status",
        { method: "PATCH", body: { status: action } },
      );
      const result = await readTicket(id);
      if (result.status !== action)
        throw new Error("تعذر تأكيد حالة التذكرة. أعد تحميلها.");
      setAction(null);
      setRevision((n) => n + 1);
      onChanged();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <ResourceState resource={resource} onLogin={onSessionExpired} />
      {row && (
        <>
          <div className="su-thread-heading">
            <b>{row.ticket_number}</b>
            <SupplierBadge
              status={row.status}
              label={
                {
                  open: "جديد",
                  in_progress: "تحت المعالجة",
                  closed: "مغلقة",
                  resolved: "تم الحل",
                }[row.status]
              }
            />
            <button aria-label="طباعة التذكرة" onClick={() => window.print()}>
              <SupplierIcon name="print" size={38} />
            </button>
          </div>
          <div className="su-thread-summary">
            <h3>
              {row.ticket_number} — {row.subject}
            </h3>
            <small>أُنشئت: {date(row.created_at)}</small>
            <div>
              {[
                ["نوع التذكرة", row.category_name || row.category],
                ["الأولوية", ticketPriorities[row.priority] || row.priority],
                ["الطلب المرتبط", row.order_number],
                ["وقت الاستجابة", null],
              ].map(([label, value]) => (
                <span key={label}>
                  <small>{label}</small>
                  <b>{value || "—"}</b>
                </span>
              ))}
            </div>
          </div>
          <section className="su-chat">
            <h3>المحادثة ({row.messages?.length ?? 0} رسائل)</h3>
            {(row.messages || []).map((message) => (
              <article
                key={message.id}
                className={
                  "su-chat-message" + (message.is_staff ? " staff" : "")
                }
              >
                <b>
                  {message.sender_name ||
                    (message.is_staff
                      ? "مسؤول الدعم الفني"
                      : supplier.contact_name || "المورد")}
                </b>
                <p>{message.body}</p>
                {attachmentRows(message.attachments).map((x) => (
                  <a href={x.url} key={x.url} target="_blank" rel="noreferrer">
                    {x.image ? <img alt={x.name} src={x.url} /> : x.name}
                  </a>
                ))}
                <small>{date(message.created_at)}</small>
              </article>
            ))}
            <div className="su-internal-note">
              <span>ملاحظة داخلية</span>
              <textarea
                readOnly
                disabled={busy || administration.busy}
                onClick={() => administration.open("notes")}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    administration.open("notes");
                  }
                }}
                value={row.internal_notes?.at(-1)?.body || ""}
                aria-label="ملاحظة داخلية"
                placeholder="اضغط لإضافة أو مراجعة الملاحظات الداخلية"
              />
            </div>
            <form className="su-chat-form" onSubmit={send}>
              <textarea
                placeholder="اكتب ردك هنا... (يظهر للعميل والمورد)"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                disabled={
                  busy ||
                  administration.busy ||
                  !!record ||
                  uncertain ||
                  row.status === "closed"
                }
                aria-label="رسالة الرد"
              />
              <button
                disabled={
                  busy ||
                  administration.busy ||
                  uncertain ||
                  !reply.trim() ||
                  row.status === "closed"
                }
                aria-label={record ? "إعادة التحقق من الرد" : "إرسال الرد"}
              >
                <SupplierIcon name="send" size={49} />
              </button>
            </form>
            {error && (
              <p role="alert" className="su-error">
                {error}
              </p>
            )}
            {uncertain && (
              <p className="su-inline-note">
                نتيجة الإرسال غير مؤكدة. حدّث المحادثة للتحقق.
              </p>
            )}
          </section>
          <SupplierPanel title="إجراءات سريعة">
            <SupplierField label="الموظف المسؤول">
              <TicketAssignment
                admin={administration}
                row={row}
                disabled={busy || administration.busy}
              />
            </SupplierField>
            <div className="su-ticket-quick">
              <button
                disabled={
                  busy || administration.busy || !administration.canManage
                }
                onClick={() =>
                  administration.open("priority", { priority: "urgent" })
                }
              >
                رفع الأولوية القصوى
              </button>
              <button
                disabled={
                  busy || administration.busy || row.status === "closed"
                }
                onClick={() => setAction("closed")}
              >
                إغلاق التذكرة
              </button>
              <button
                disabled={
                  busy || administration.busy || row.status !== "closed"
                }
                onClick={() => setAction("in_progress")}
              >
                إعادة فتح
              </button>
              <button
                disabled={
                  busy || administration.busy || !administration.canManage
                }
                onClick={() => administration.open("delete")}
              >
                حذف التذكرة
              </button>
            </div>
          </SupplierPanel>
          <TicketAdminDialog admin={administration} supplier />
          {action && (
            <SupplierModal
              title="تأكيد تغيير حالة التذكرة"
              small
              onClose={() => setAction(null)}
              busy={busy}
            >
              <SupplierPanel>
                <p>
                  {action === "closed"
                    ? "إغلاق التذكرة؟"
                    : "إعادة فتح التذكرة؟"}
                </p>
                <button
                  className="su-button full"
                  disabled={busy}
                  onClick={update}
                >
                  تأكيد
                </button>
                {error && (
                  <p role="alert" className="su-error">
                    {error}
                  </p>
                )}
              </SupplierPanel>
            </SupplierModal>
          )}
        </>
      )}
    </>
  );
}
