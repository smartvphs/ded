import React, { useEffect, useRef, useState } from "react";
import {
  Search,
  ChevronDown,
  MoreVertical,
  Eye,
  Circle,
  CircleCheck,
  ArchiveRestore,
} from "lucide-react";
import { settingsArtwork, settingsImageHeights } from "./settings-assets";
import useAdminResource from "./use-admin-resource";
import { adminRequest, queryString } from "./admin-api";
import { PricingDialog } from "./pricing-ui";
const labels = {
  new: "جديدة",
  read: "مقروءة",
  replied: "تم الرد",
  archived: "مؤرشفة",
};
const icons = {
  new: Circle,
  read: Eye,
  replied: CircleCheck,
  archived: ArchiveRestore,
};
function Art({ name }) {
  const [file, x, y, w, h] = settingsArtwork[name];
  return (
    <svg
      className="st-art"
      viewBox={`${x} ${y} ${w} ${h}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <image
        href={`/settings-reference/${file}.png`}
        width="1440"
        height={settingsImageHeights[file]}
      />
    </svg>
  );
}
function MessageDetails({ id, onClose, onSaved, onSessionExpired }) {
  const resource = useAdminResource(
      "/api/contact/admin/" + encodeURIComponent(id),
    ),
    me = useAdminResource("/api/admin/me");
  const [draft, setDraft] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [pending, setPending] = useState(null),
    lock = useRef(false);
  const row = resource.data?.data,
    canEdit =
      me.data?.data?.isSuperAdmin ||
      me.data?.data?.permissions?.includes("support.manage");
  useEffect(() => {
    if (row)
      setDraft({ status: row.status, adminNotes: row.admin_notes ?? "" });
  }, [row]);
  async function save() {
    if (lock.current || !canEdit || !draft) return;
    const body =
      pending ||
      Object.fromEntries(
        Object.entries(draft).filter(
          ([key, value]) =>
            value !== (key === "status" ? row.status : (row.admin_notes ?? "")),
        ),
      );
    if (!Object.keys(body).length) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      if (!pending) {
        try {
          await adminRequest("/api/contact/admin/" + encodeURIComponent(id), {
            method: "PATCH",
            body,
          });
          setPending(body);
        } catch (e) {
          if (!e.status || e.status >= 500) setPending(body);
          throw e;
        }
      }
      const fresh = await adminRequest(
        "/api/contact/admin/" + encodeURIComponent(id),
      );
      if (
        Object.entries(body).some(
          ([key, value]) =>
            (key === "status"
              ? fresh.data?.status
              : (fresh.data?.admin_notes ?? "")) !== value,
        )
      )
        throw new Error("لم يتم تأكيد التعديل؛ أعد التحقق.");
      setPending(null);
      onSaved();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <PricingDialog title="تفاصيل الرسالة" onClose={onClose} busy={busy}>
      {resource.loading && <p role="status">جارٍ التحميل…</p>}
      {resource.error && (
        <p role="alert">
          {resource.error.message}
          <button onClick={resource.reload}>إعادة المحاولة</button>
          {resource.error.status === 401 && (
            <button onClick={onSessionExpired}>تسجيل الدخول</button>
          )}
        </p>
      )}
      {row && draft && (
        <>
          <p>
            {row.name} — {row.email} — <span dir="ltr">{row.phone}</span>
          </p>
          <h3>{row.subject}</h3>
          <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
            {row.message}
          </p>
          <label className="st-field">
            <span>الحالة</span>
            <span className="st-control">
              <select
                aria-label="حالة الرسالة"
                value={draft.status}
                disabled={!canEdit || busy || !!pending}
                onChange={(e) => setDraft({ ...draft, status: e.target.value })}
              >
                {Object.entries(labels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </span>
          </label>
          <label className="st-field">
            <span>ملاحظات الإدارة</span>
            <textarea
              aria-label="ملاحظات الإدارة"
              value={draft.adminNotes}
              disabled={!canEdit || busy || !!pending}
              onChange={(e) =>
                setDraft({ ...draft, adminNotes: e.target.value })
              }
            />
          </label>
          <p>
            تغيير الحالة إلى «تم الرد» يسجل الحالة فقط؛ لا يرسل رسالة للعميل.
          </p>
          {error && <p role="alert">{error}</p>}
          <button
            className="st-button"
            disabled={busy || !canEdit}
            onClick={save}
          >
            {pending ? "إعادة التحقق" : "حفظ"}
          </button>
        </>
      )}
    </PricingDialog>
  );
}
export default function SettingsMessages({
  active,
  onCount,
  onSessionExpired,
}) {
  const [selected, setSelected] = useState([]),
    [search, setSearch] = useState(""),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState(""),
    [page, setPage] = useState(1),
    [revision, setRevision] = useState(0),
    [detail, setDetail] = useState(null);
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  const resource = useAdminResource(
      active
        ? "/api/contact/admin?" +
            queryString({
              search: query,
              status,
              limit: 10,
              offset: (page - 1) * 10,
            })
        : null,
      revision,
    ),
    data = resource.data?.data;
  const valid =
      !data ||
      (Array.isArray(data.items) &&
        data.countsByStatus &&
        typeof data.countsByStatus === "object"),
    rows = valid && data ? data.items : [],
    counts = valid ? data?.countsByStatus : null;
  useEffect(() => {
    if (counts) onCount(counts.new ?? 0);
  }, [counts, onCount]);
  useEffect(() => setSelected([]), [query, status, page]);
  const total = resource.data?.meta?.total,
    hasNext = Number.isFinite(total) ? page * 10 < total : rows.length === 10;
  const pages = Number.isFinite(total)
    ? Math.max(1, Math.ceil(total / 10))
    : page + (hasNext ? 1 : 0);
  const numbers = [
    ...new Set([
      1,
      ...[page - 1, page, page + 1].filter((n) => n > 0 && n <= pages),
      pages,
    ]),
  ].sort((a, b) => a - b);
  return (
    <div className="st-messages">
      <div className="st-message-stats">
        {[
          [
            "إجمالي الرسائل",
            counts
              ? Object.values(counts).reduce((a, n) => a + Number(n || 0), 0)
              : "—",
            "totalMessages",
            "blue",
          ],
          ["رسائل جديدة", counts?.new ?? "—", "newMessages", "yellow"],
          [
            "تم الرد عليها",
            counts?.replied ?? "—",
            "answeredMessages",
            "green",
          ],
          ["رسائل مؤرشفة", counts?.archived ?? "—", "archivedMessages", "red"],
        ].map(([label, number, icon, tint]) => (
          <div key={label} className={"st-message-stat " + tint}>
            <Art name={icon} />
            <b>{number}</b>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <div className="st-message-filters">
        <label className="st-message-search">
          <input
            aria-label="البحث في الرسائل"
            placeholder="ابحث باسم المرسل أو الموضوع..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Search size={23} />
        </label>
        <label className="st-message-status">
          <select
            aria-label="حالة الرسائل"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">الحالة</option>
            {Object.entries(labels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <ChevronDown size={17} />
        </label>
      </div>
      {resource.loading && <p role="status">جارٍ تحميل الرسائل…</p>}
      {(resource.error || !valid) && (
        <p role="alert">
          {resource.error?.message || "رد الرسائل غير مكتمل."}
          <button onClick={resource.reload}>إعادة المحاولة</button>
          {resource.error?.status === 401 && (
            <button onClick={onSessionExpired}>تسجيل الدخول</button>
          )}
        </p>
      )}
      <div className="st-messages-table">
        <table>
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  aria-label="تحديد كل الرسائل"
                  checked={
                    rows.length > 0 &&
                    rows.every((row) => selected.includes(row.id))
                  }
                  onChange={(e) =>
                    setSelected(
                      e.target.checked ? rows.map((row) => row.id) : [],
                    )
                  }
                />
              </th>
              <th>المرسل</th>
              <th>الموضوع</th>
              <th>التاريخ</th>
              <th>الحالة</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const StatusIcon = icons[row.status] || Circle;
              return (
                <tr
                  key={row.id}
                  className={
                    row.status === "new" || selected.includes(row.id)
                      ? "st-highlight"
                      : ""
                  }
                >
                  <td>
                    <input
                      type="checkbox"
                      aria-label={"تحديد رسالة " + row.name}
                      checked={selected.includes(row.id)}
                      onChange={(e) =>
                        setSelected(
                          e.target.checked
                            ? [...selected, row.id]
                            : selected.filter((id) => id !== row.id),
                        )
                      }
                    />
                  </td>
                  <td>
                    <div className="st-sender">
                      {row.avatar_url ? (
                        <img className="st-art" src={row.avatar_url} alt="" />
                      ) : (
                        <span className="st-art" aria-hidden="true" />
                      )}
                      <div>
                        {row.name}
                        <small>{row.phone || row.email || "—"}</small>
                      </div>
                    </div>
                  </td>
                  <td>{row.subject}</td>
                  <td>
                    <span>
                      {row.created_at
                        ? new Date(row.created_at).toLocaleString("ar-EG", {
                            timeZone: "Asia/Riyadh",
                          })
                        : "—"}
                    </span>
                  </td>
                  <td>
                    <span
                      className={
                        "st-message-badge st-badge-" +
                        Object.keys(labels).indexOf(row.status)
                      }
                    >
                      <StatusIcon size={12} />
                      {labels[row.status] || row.status}
                    </span>
                  </td>
                  <td className="st-message-actions">
                    <button
                      aria-label={"إجراءات رسالة " + row.name}
                      onClick={() => setDetail(row.id)}
                    >
                      <MoreVertical size={25} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {data && valid && !rows.length && <p>لا توجد رسائل.</p>}
      </div>
      <div className="st-pagination">
        <button
          disabled={page === 1 || resource.loading}
          onClick={() => setPage(page - 1)}
        >
          السابق
        </button>
        {numbers.map((number, index) => (
          <React.Fragment key={number}>
            {index > 0 && number > numbers[index - 1] + 1 && <span>...</span>}
            <button
              className={page === number ? "active" : ""}
              disabled={resource.loading}
              onClick={() => setPage(number)}
            >
              {number}
            </button>
          </React.Fragment>
        ))}
        <button
          disabled={!hasNext || resource.loading}
          onClick={() => setPage(page + 1)}
        >
          التالي
        </button>
      </div>
      {detail && (
        <MessageDetails
          key={detail}
          id={detail}
          onClose={() => setDetail(null)}
          onSaved={() => setRevision((n) => n + 1)}
          onSessionExpired={onSessionExpired}
        />
      )}
    </div>
  );
}
