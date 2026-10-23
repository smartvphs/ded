import React, { useEffect, useState } from "react";
import useAdminResource from "./use-admin-resource";
import { adminRequest, queryString } from "./admin-api";
import { ResourceState } from "./orders-ui";
import { PricingDialog } from "./pricing-ui";
import { supportDate } from "./support-api";
const labels = {
  new: "جديدة",
  read: "مقروءة",
  replied: "تم الرد",
  archived: "مؤرشفة",
};
export default function ContactMessages({ onSessionExpired }) {
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState(null),
    [revision, setRevision] = useState(0);
  const resource = useAdminResource(
      "/api/contact/admin?" +
        queryString({ search, status, limit: 10, offset: (page - 1) * 10 }),
      revision,
    ),
    rows = resource.data?.data?.items || [],
    counts = resource.data?.data?.countsByStatus,
    all = counts
      ? Object.values(counts).reduce((s, x) => s + Number(x), 0)
      : null;
  return (
    <div className="st-messages">
      <div className="st-message-stats">
        {[
          ["إجمالي الرسائل", all, "blue"],
          ["رسائل جديدة", counts?.new, "yellow"],
          ["تم الرد عليها", counts?.replied, "green"],
          ["رسائل مؤرشفة", counts?.archived, "red"],
        ].map(([label, value, tint]) => (
          <div key={label} className={"st-message-stat " + tint}>
            <b>{value ?? "—"}</b>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <div className="st-message-filters">
        <input
          aria-label="البحث في الرسائل"
          placeholder="ابحث باسم المرسل أو الموضوع..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <select
          aria-label="حالة الرسائل"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">كل الحالات</option>
          {Object.entries(labels).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <ResourceState resource={resource} onLogin={onSessionExpired} />
      <div className="st-messages-table">
        <table>
          <thead>
            <tr>
              <th>المرسل</th>
              <th>الموضوع</th>
              <th>التاريخ</th>
              <th>الحالة</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  {row.name}
                  <small>{row.phone}</small>
                </td>
                <td>{row.subject}</td>
                <td>{supportDate(row.created_at)}</td>
                <td>{labels[row.status] || row.status}</td>
                <td>
                  <button onClick={() => setSelected(row.id)}>
                    عرض الرسالة
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {resource.data && !rows.length && (
        <p className="support-api-note">لا توجد رسائل تطابق البحث.</p>
      )}
      <div className="st-pagination">
        <button disabled={page === 1} onClick={() => setPage((n) => n - 1)}>
          السابق
        </button>
        <span>{page}</span>
        <button
          disabled={rows.length < 10}
          onClick={() => setPage((n) => n + 1)}
        >
          التالي
        </button>
      </div>
      {selected && (
        <ContactMessage
          id={selected}
          onClose={() => setSelected(null)}
          onSessionExpired={onSessionExpired}
          onSaved={() => setRevision((n) => n + 1)}
        />
      )}
    </div>
  );
}
function ContactMessage({ id, onClose, onSaved, onSessionExpired }) {
  const resource = useAdminResource(
      "/api/contact/admin/" + encodeURIComponent(id),
    ),
    row = resource.data?.data;
  const [status, setStatus] = useState(""),
    [notes, setNotes] = useState(""),
    [busy, setBusy] = useState(false),
    [committed, setCommitted] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (row) {
      setStatus(row.status);
      setNotes(row.admin_notes || "");
    }
  }, [row]);
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (!committed) {
        const body = {};
        if (status !== row.status) body.status = status;
        if (notes !== (row.admin_notes || "")) body.adminNotes = notes;
        await adminRequest("/api/contact/admin/" + encodeURIComponent(id), {
          method: "PATCH",
          body,
        });
        setCommitted(true);
      }
      const fresh = await adminRequest(
        "/api/contact/admin/" + encodeURIComponent(id),
      );
      if (
        fresh.data?.status !== status ||
        (fresh.data.admin_notes || "") !== notes
      )
        throw new Error("تعذر تأكيد بيانات الرسالة. أعد التحقق.");
      onSaved();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <PricingDialog title="تفاصيل رسالة التواصل" busy={busy} onClose={onClose}>
      <ResourceState resource={resource} onLogin={onSessionExpired} />
      {row && (
        <form onSubmit={save}>
          <h3>{row.subject}</h3>
          <p>
            {row.name} · {row.phone} · {row.email}
          </p>
          <p style={{ whiteSpace: "pre-wrap" }}>{row.message}</p>
          <label>
            حالة الرسالة
            <select
              aria-label="تعديل حالة الرسالة"
              disabled={busy || committed}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {Object.entries(labels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            ملاحظات الإدارة
            <textarea
              aria-label="ملاحظات رسالة التواصل"
              disabled={busy || committed}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          <p className="support-api-note">
            تحديث الحالة والملاحظات لا يرسل رسالة للعميل. الرد الخارجي يتم من
            وسيلة التواصل المعتمدة.
          </p>
          {error && (
            <p role="alert" className="support-api-error">
              {error}
            </p>
          )}
          <button disabled={busy} className="pricing-primary">
            {committed ? "إعادة التحقق" : "حفظ الرسالة"}
          </button>
        </form>
      )}
    </PricingDialog>
  );
}
