import React, { useState } from "react";
import useAdminResource from "./use-admin-resource";
import { queryString } from "./admin-api";
import { ResourceState, dateText } from "./orders-ui";
export default function StaffAudit({ employee, onSessionExpired }) {
  const [page, setPage] = useState(1),
    [action, setAction] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    resource = useAdminResource(
      "/api/admin/audit-log?" +
        queryString({
          actorId: employee.id,
          limit: 10,
          offset: (page - 1) * 10,
          action: action || undefined,
          from: from || undefined,
          to: to || undefined,
        }),
    ),
    valid =
      resource.data && !Array.isArray(resource.data.data)
        ? { ...resource, error: new Error("رد سجل النشاط غير صالح.") }
        : resource,
    rows = Array.isArray(resource.data?.data) ? resource.data.data : [];
  return (
    <section className="staff-audit">
      <h2>سجل نشاط {employee.name}</h2>
      <div className="staff-audit-filters">
        <label>
          العملية
          <select
            aria-label="نوع عملية الموظف"
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
          >
            <option value="">كل العمليات</option>
            {resource.data?.meta?.actions?.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </label>
        <label>
          من تاريخ
          <input
            type="date"
            aria-label="نشاط الموظف من تاريخ"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <label>
          إلى تاريخ
          <input
            type="date"
            aria-label="نشاط الموظف إلى تاريخ"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
          />
        </label>
      </div>
      <ResourceState resource={valid} onLogin={onSessionExpired} />
      <div className="employee-table-scroll">
        <table className="employee-table">
          <thead>
            <tr>
              {["التاريخ", "الموظف", "العملية", "القسم", "التفاصيل"].map(
                (h) => (
                  <th key={h}>{h}</th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{dateText(row.created_at)}</td>
                <td>{row.actor_name || "—"}</td>
                <td>{row.action || "—"}</td>
                <td>{row.entity_type || "—"}</td>
                <td>
                  <details className="staff-audit-details">
                    <summary>عرض التفاصيل</summary>
                    <dl>
                      <dt>رقم السجل</dt>
                      <dd>{row.id}</dd>
                      <dt>رقم العنصر</dt>
                      <dd>{row.entity_id || "—"}</dd>
                      <dt>عنوان الاتصال</dt>
                      <dd>{row.ip || "—"}</dd>
                      <dt>المتصفح</dt>
                      <dd>{row.user_agent || "—"}</dd>
                    </dl>
                    <pre dir="ltr">
                      {JSON.stringify(row.details ?? {}, null, 2)}
                    </pre>
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!valid.loading && !valid.error && !rows.length && (
        <p className="staff-api-note">لا توجد حركات مطابقة.</p>
      )}
      <div className="pricing-pagination">
        <button
          disabled={page <= 1 || resource.loading}
          onClick={() => setPage((n) => n - 1)}
        >
          السابق
        </button>
        <span>{page}</span>
        <button
          disabled={
            resource.loading ||
            page * 10 >= Number(resource.data?.meta?.total || 0)
          }
          onClick={() => setPage((n) => n + 1)}
        >
          التالي
        </button>
      </div>
    </section>
  );
}
