import React, { useEffect, useState } from "react";
import {
  Plus,
  Search,
  Eye,
  Trash2,
  Edit3,
  Power,
  KeyRound,
} from "lucide-react";
import useAdminResource from "./use-admin-resource";
import { queryString } from "./admin-api";
import { ResourceState } from "./orders-ui";
import { normalizeStaff, permissionKeys } from "./staff-api";
import { StaffForm, StaffAction } from "./StaffForms";
import StaffDetail from "./StaffDetail";
import "./employees.css";
export default function Employees({ onSessionExpired }) {
  const [search, setSearch] = useState(""),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState(""),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState([]),
    [detail, setDetail] = useState(null),
    [modal, setModal] = useState(null),
    [revision, setRevision] = useState(0),
    [notice, setNotice] = useState("");
  const resource = useAdminResource(
      "/api/admin/staff?" +
        queryString({
          search: query || undefined,
          status: status || undefined,
          limit: 7,
          offset: (page - 1) * 7,
        }),
      revision,
    ),
    catalog = useAdminResource("/api/admin/permissions"),
    me = useAdminResource("/api/admin/me", revision);
  let catalogError = null;
  if (catalog.data) {
    try {
      permissionKeys(catalog.data.data);
    } catch (error) {
      catalogError = error;
    }
  }
  const valid =
      resource.data && !Array.isArray(resource.data.data)
        ? { ...resource, error: new Error("رد قائمة الموظفين غير صالح.") }
        : resource,
    permissionResource = catalogError
      ? { ...catalog, error: catalogError }
      : catalog,
    canManage =
      me.data?.data?.isSuperAdmin === true &&
      !permissionResource.loading &&
      !permissionResource.error,
    rows = Array.isArray(resource.data?.data)
      ? resource.data.data.map(normalizeStaff)
      : [],
    total = resource.data?.meta?.total,
    pages = Math.max(1, Math.ceil(Number(total || 0) / 7)),
    counts = resource.data?.meta?.statusCounts || {};
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
      setSelected([]);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    if (total != null && page > pages) setPage(pages);
  }, [total, page, pages]);
  useEffect(() => {
    const home = () => {
      setDetail(null);
      setRevision((n) => n + 1);
    };
    window.addEventListener("mypart:employees-home", home);
    return () => window.removeEventListener("mypart:employees-home", home);
  }, []);
  const toggle = (id) =>
    setSelected((old) =>
      old.includes(id) ? old.filter((key) => key !== id) : [...old, id],
    );
  async function saved() {
    setRevision((n) => n + 1);
    setNotice("تم حفظ التغيير وتأكيده من الخادم.");
    if (modal?.type === "add") {
      setPage(1);
      setSearch("");
      setQuery("");
      setStatus("");
    }
    if (modal?.type === "delete")
      setSelected((old) => old.filter((id) => id !== modal.employee.id));
  }
  return (
    <div className="employees-content">
      {notice && (
        <div className="staff-api-notice" role="status">
          {notice}
          <button aria-label="إغلاق الرسالة" onClick={() => setNotice("")}>
            ×
          </button>
        </div>
      )}
      <ResourceState resource={me} onLogin={onSessionExpired} />
      <ResourceState resource={permissionResource} onLogin={onSessionExpired} />
      {detail && catalog.data && !catalogError ? (
        <StaffDetail
          employee={detail}
          catalog={catalog.data}
          me={me.data?.data}
          onBack={() => {
            setDetail(null);
            setRevision((n) => n + 1);
          }}
          onChanged={() => setRevision((n) => n + 1)}
          onSessionExpired={onSessionExpired}
        />
      ) : (
        <>
          <div className="pricing-heading">
            <h1>إدارة الموظفين</h1>
            <button
              className="pricing-primary"
              disabled={!canManage}
              onClick={() => setModal({ type: "add" })}
            >
              <Plus size={16} />
              إضافة جديد
            </button>
          </div>
          <section className="employee-list">
            <div className="staff-toolbar">
              <div className="employee-search">
                <Search size={15} />
                <input
                  aria-label="البحث باسم الموظف أو البريد الإلكتروني"
                  placeholder="البحث باسم الموظف أو البريد الإلكتروني..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                aria-label="حالة الموظفين"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                  setSelected([]);
                }}
              >
                <option value="">الكل ({counts.all ?? "—"})</option>
                <option value="active">نشط ({counts.active ?? "—"})</option>
                <option value="inactive">
                  غير نشط ({counts.inactive ?? "—"})
                </option>
                <option value="deleted">محذوف ({counts.deleted ?? "—"})</option>
              </select>
            </div>
            <ResourceState resource={valid} onLogin={onSessionExpired} />
            <div className="employee-table-scroll">
              <table className="employee-table">
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        aria-label="تحديد كل الموظفين الظاهرين"
                        checked={
                          rows.length > 0 &&
                          rows.every((row) => selected.includes(row.id))
                        }
                        onChange={(e) =>
                          setSelected((old) =>
                            e.target.checked
                              ? [...new Set([...old, ...rows.map((r) => r.id)])]
                              : old.filter(
                                  (id) => !rows.some((r) => r.id === id),
                                ),
                          )
                        }
                      />
                    </th>
                    {[
                      "اسم الموظف",
                      "البريد الإلكتروني",
                      "الحالة",
                      "الإجراءات",
                    ].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((employee) => (
                    <tr key={employee.id}>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={"تحديد الموظف " + employee.id}
                          checked={selected.includes(employee.id)}
                          onChange={() => toggle(employee.id)}
                        />
                      </td>
                      <td>
                        {employee.name || "—"}
                        {employee.isSuperAdmin && (
                          <small className="staff-super-only">أدمن رئيسي</small>
                        )}
                      </td>
                      <td className="employee-email" dir="ltr">
                        {employee.email || "—"}
                      </td>
                      <td>
                        <span
                          className={
                            "pricing-badge " +
                            (employee.deletedAt
                              ? "red"
                              : employee.isActive
                                ? "green"
                                : "orange")
                          }
                        >
                          <i />
                          {employee.deletedAt
                            ? "محذوف"
                            : employee.isActive
                              ? "نشط"
                              : "غير نشط"}
                        </span>
                      </td>
                      <td>
                        <div className="employee-actions">
                          <button
                            className="def-eye"
                            aria-label={"صلاحيات الموظف " + employee.id}
                            disabled={!catalog.data || !!catalogError}
                            onClick={() => setDetail(employee)}
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            className="cm-edit"
                            aria-label={"تعديل الموظف " + employee.id}
                            disabled={!canManage || !!employee.deletedAt}
                            onClick={() => setModal({ type: "edit", employee })}
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            className="cm-edit"
                            aria-label={
                              (employee.isActive
                                ? "إيقاف الموظف "
                                : "تنشيط الموظف ") + employee.id
                            }
                            disabled={
                              !canManage ||
                              !!employee.deletedAt ||
                              employee.id === me.data?.data?.id
                            }
                            title={
                              employee.id === me.data?.data?.id
                                ? "الحساب الحالي"
                                : undefined
                            }
                            onClick={() =>
                              setModal({ type: "status", employee })
                            }
                          >
                            <Power size={15} />
                          </button>
                          {employee.role === "staff" && (
                            <button
                              className="cm-edit"
                              aria-label={
                                "تغيير كلمة مرور الموظف " + employee.id
                              }
                              disabled={!canManage || !!employee.deletedAt}
                              onClick={() =>
                                setModal({ type: "password", employee })
                              }
                            >
                              <KeyRound size={15} />
                            </button>
                          )}
                          <button
                            className="pricing-delete"
                            aria-label={"حذف الموظف " + employee.id}
                            disabled={
                              !canManage ||
                              !!employee.deletedAt ||
                              employee.isSuperAdmin ||
                              employee.id === me.data?.data?.id
                            }
                            title={
                              employee.isSuperAdmin
                                ? "الأدمن الرئيسي لا يمكن حذفه"
                                : undefined
                            }
                            onClick={() =>
                              setModal({ type: "delete", employee })
                            }
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!valid.loading && !valid.error && !rows.length && (
                <p className="pricing-empty">لا يوجد موظفون مطابقون للبحث.</p>
              )}
            </div>
            <div className="pricing-pagination">
              <button
                disabled={page <= 1 || resource.loading}
                onClick={() => setPage((n) => n - 1)}
              >
                السابق
              </button>
              {[...new Set([1, 2, 3, page, pages])]
                .filter((n) => n <= pages)
                .sort((a, b) => a - b)
                .map((n) => (
                  <button
                    key={n}
                    className={page === n ? "selected" : ""}
                    onClick={() => setPage(n)}
                  >
                    {n}
                  </button>
                ))}
              <button
                disabled={page >= pages || resource.loading}
                onClick={() => setPage((n) => n + 1)}
              >
                التالي
              </button>
            </div>
          </section>
        </>
      )}
      {["add", "edit"].includes(modal?.type) && catalog.data && (
        <StaffForm
          employee={modal.employee}
          catalog={catalog.data}
          onClose={() => setModal(null)}
          onSaved={saved}
        />
      )}{" "}
      {["status", "password", "delete"].includes(modal?.type) && (
        <StaffAction
          type={modal.type}
          employee={modal.employee}
          onClose={() => setModal(null)}
          onSaved={saved}
        />
      )}
    </div>
  );
}
