import React, { useEffect, useState } from "react";
import {
  Coins,
  CheckCircle2,
  Clock,
  TriangleAlert,
  Search,
  Download,
  Eye,
  MoreVertical,
  ArrowRight,
} from "lucide-react";
import { queryString } from "./admin-api";
import useAdminResource from "./use-admin-resource";
import { ResourceState, dateText, Money } from "./orders-ui";
import { number } from "./dashboard-data";
import {
  pricingParams,
  pricingStatuses,
  pricingTypes,
  allPricingRows,
} from "./pricing-api";
import PricingDetails from "./PricingDetails";
import "./pricing.css";
import { PricingBadge, PricingField } from "./pricing-ui";
const emptyFilters = { company: "", date: "", type: "", status: "" };
export default function Pricing({ onSessionExpired }) {
  const [detail, setDetail] = useState(null),
    [selected, setSelected] = useState([]),
    [page, setPage] = useState(1),
    [search, setSearch] = useState(""),
    [query, setQuery] = useState(""),
    [filters, setFilters] = useState(emptyFilters),
    [applied, setApplied] = useState(emptyFilters),
    [menu, setMenu] = useState(null),
    [revision, setRevision] = useState(0),
    [exporting, setExporting] = useState(false),
    [notice, setNotice] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search);
      setPage(1);
      setSelected([]);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    const close = (e) => {
      if (!e.target.closest(".pricing-row-actions")) setMenu(null);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  const resource = useAdminResource(
    "/api/pricing-requests/admin?" +
      queryString(pricingParams({ filters: applied, search: query, page })),
    revision,
  );
  const summary = useAdminResource(
      "/api/pricing-requests/admin?limit=1&offset=0",
      revision,
    ),
    accepted = useAdminResource(
      "/api/pricing-requests/admin?hasAccepted=true&limit=1&offset=0",
      revision,
    ),
    pending = useAdminResource(
      "/api/pricing-requests/admin/pending-review",
      revision,
    ),
    makes = useAdminResource("/api/cars/admin/makes");
  const listResource =
    resource.data && !Array.isArray(resource.data.data)
      ? { ...resource, error: new Error("رد قائمة طلبات التسعير غير صالح.") }
      : resource;
  const rows = Array.isArray(resource.data?.data) ? resource.data.data : [],
    counts = summary.data?.meta?.statusCounts || {},
    total = resource.data?.meta?.total;
  const missing = Array.isArray(pending.data?.data)
    ? pending.data.data.filter((row) => Number(row.missing_products_count) > 0)
        .length
    : null;
  const change = (key, value) =>
    setFilters((old) => ({ ...old, [key]: value }));
  async function exportFile() {
    if (exporting) return;
    setExporting(true);
    setNotice("");
    try {
      const all = await allPricingRows(
        pricingParams({ filters: applied, search: query }),
      );
      const list = selected.length
        ? all.filter((row) => selected.includes(row.id))
        : all;
      const { exportPricingWorkbook } = await import("./spreadsheet");
      exportPricingWorkbook(
        list.map((row) => [
          row.request_number || "—",
          row.customer_name || "—",
          [
            row.make_name_ar || row.make_name_en,
            row.model_name_ar || row.model_name_en,
            row.year,
          ]
            .filter(Boolean)
            .join(" "),
          dateText(row.created_at),
          pricingTypes[row.pricing_type] || row.pricing_type || "—",
          row.parts_count ?? "",
          row.status_label || pricingStatuses[row.status]?.[0] || row.status,
        ]),
      );
      setNotice(`تم تصدير ${list.length} طلب من البيانات الفعلية.`);
    } catch (e) {
      setNotice(e.message);
    } finally {
      setExporting(false);
    }
  }
  if (detail)
    return (
      <PricingDetails
        id={detail}
        onBack={() => {
          setDetail(null);
          setRevision((n) => n + 1);
        }}
        onChanged={() => setRevision((n) => n + 1)}
        onSessionExpired={onSessionExpired}
      />
    );
  return (
    <div className="pricing-content">
      <div className="pricing-heading">
        <div>
          <h1>طلبات التسعير</h1>
          {summary.data?.meta?.paidFeesTotal != null && (
            <span className="fast-label">
              رسوم التسعير المحصلة{" "}
              <Money value={summary.data.meta.paidFeesTotal} />
            </span>
          )}
        </div>
        <button
          className="pricing-export"
          disabled={exporting || resource.loading || !!resource.error}
          onClick={exportFile}
        >
          <Download size={16} />
          {exporting ? "جارٍ التصدير…" : "تصدير Excel"}
        </button>
      </div>
      <section className="pricing-statistics">
        {[
          [summary.data?.meta?.total, "إجمالي طلبات التسعير", "blue", Coins],
          [accepted.data?.meta?.total, "تسعيرات مؤكدة", "green", CheckCircle2],
          [counts.open, "قيد التسعير", "purple", Clock],
          [missing, "تحتاج إضافة منتجات", "yellow", TriangleAlert],
        ].map(([v, label, color, Icon]) => (
          <div className={"pricing-stat " + color} key={label}>
            <span className="stat-icon">
              <Icon size={18} />
            </span>
            <b>{v == null ? "—" : number(v)}</b>
            <span>{label}</span>
          </div>
        ))}
      </section>
      <ResourceState resource={summary} onLogin={onSessionExpired} />
      <ResourceState resource={accepted} onLogin={onSessionExpired} />
      <ResourceState
        resource={
          pending.data && !Array.isArray(pending.data.data)
            ? {
                ...pending,
                error: new Error("رد الطلبات المحتاجة مراجعة غير صالح."),
              }
            : pending
        }
        onLogin={onSessionExpired}
      />
      {missing > 0 && (
        <button
          className="pricing-warning"
          onClick={() => {
            const next = { ...emptyFilters, status: "pending_admin_review" };
            setFilters(next);
            setApplied(next);
            setSearch("");
            setQuery("");
            setPage(1);
            setSelected([]);
          }}
        >
          <TriangleAlert size={24} />
          <div>
            <b>
              {number(missing)} طلبات تحتوي على منتجات غير متواجدة في قاعدة
              البيانات
            </b>
            <small>اربط القطع بمنتجات قبل إرسال الطلب للموردين</small>
          </div>
          <ArrowRight size={22} />
        </button>
      )}
      <section className="pricing-filter-card">
        <h2>البحث والتصفية</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setApplied({ ...filters });
            setPage(1);
            setSelected([]);
            setMenu(null);
          }}
        >
          <div className="pricing-filter-grid">
            <PricingField label="السيارات">
              <select
                aria-label="شركة السيارة"
                value={filters.company}
                disabled={makes.loading || !!makes.error}
                onChange={(e) => change("company", e.target.value)}
              >
                <option value="">جميع شركات السيارات</option>
                {(Array.isArray(makes.data?.data) ? makes.data.data : []).map(
                  (make) => (
                    <option key={make.id} value={make.id}>
                      {make.name_ar || make.name_en}
                    </option>
                  ),
                )}
              </select>
            </PricingField>
            <PricingField label="أوقات التسعير">
              <select
                aria-label="أوقات التسعير"
                disabled
                title="فلتر الساعة غير موثق في مسار طلبات التسعير"
              >
                <option>جميع الأوقات</option>
              </select>
            </PricingField>
            <PricingField label="تاريخ الطلب">
              <input
                aria-label="تاريخ طلب التسعير"
                type="date"
                value={filters.date}
                onChange={(e) => change("date", e.target.value)}
              />
            </PricingField>
            <PricingField label="نوع التسعير">
              <select
                aria-label="نوع التسعير"
                value={filters.type}
                onChange={(e) => change("type", e.target.value)}
              >
                <option value="">كل الأنواع</option>
                {Object.entries(pricingTypes).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </PricingField>
            <PricingField label="حالة الطلب">
              <select
                aria-label="حالة طلب التسعير"
                value={filters.status}
                onChange={(e) => change("status", e.target.value)}
              >
                <option value="">كل الحالات</option>
                {Object.entries(pricingStatuses).map(([key, [label]]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </PricingField>
            <button className="pricing-primary filter-submit">
              <Search size={15} />
              البحث والتصفية
            </button>
          </div>
          <ResourceState resource={makes} onLogin={onSessionExpired} />
        </form>
      </section>
      {notice && (
        <p className="pricing-api-notice" role="status">
          {notice}
        </p>
      )}
      <section className="pricing-table-card">
        <div className="pricing-table-head">
          <h2>طلبات التسعير</h2>
          <label className="pricing-search">
            <Search size={16} />
            <input
              aria-label="ابحث برقم الطلب أو اسم العميل"
              placeholder="ابحث برقم الطلب، اسم العميل، الشركة ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>
        <ResourceState resource={listResource} onLogin={onSessionExpired} />
        <div className="pricing-table-scroll">
          <table className="pricing-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    aria-label="تحديد كل الطلبات الظاهرة"
                    checked={
                      rows.length > 0 &&
                      rows.every((row) => selected.includes(row.id))
                    }
                    onChange={(e) =>
                      setSelected(
                        e.target.checked
                          ? [
                              ...new Set([
                                ...selected,
                                ...rows.map((row) => row.id),
                              ]),
                            ]
                          : selected.filter(
                              (id) => !rows.some((row) => row.id === id),
                            ),
                      )
                    }
                  />
                </th>
                {[
                  "رقم الطلب",
                  "العميل",
                  "الشركة",
                  "تاريخ الطلب",
                  "نوع التسعير",
                  "عدد القطع",
                  "الحالة",
                  "الإجراءات",
                ].map((label) => (
                  <th key={label}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={"تحديد " + row.request_number}
                      checked={selected.includes(row.id)}
                      onChange={() =>
                        setSelected((old) =>
                          old.includes(row.id)
                            ? old.filter((id) => id !== row.id)
                            : [...old, row.id],
                        )
                      }
                    />
                  </td>
                  <td>
                    <button
                      className="pricing-request-id"
                      onClick={() => setDetail(row.id)}
                    >
                      {row.request_number || "—"}
                    </button>
                  </td>
                  <td>{row.customer_name || "—"}</td>
                  <td>
                    <span className="pricing-company">
                      {row.make_logo_url && (
                        <img src={row.make_logo_url} alt="" />
                      )}
                      {[
                        row.make_name_ar || row.make_name_en,
                        row.model_name_ar || row.model_name_en,
                        row.year,
                      ]
                        .filter(Boolean)
                        .join(" ") || "—"}
                    </span>
                  </td>
                  <td className="muted">{dateText(row.created_at)}</td>
                  <td>
                    <span
                      className={
                        "pricing-badge " +
                        (row.pricing_type === "express" ? "red" : "blue")
                      }
                    >
                      <i />
                      {pricingTypes[row.pricing_type] ||
                        row.pricing_type ||
                        "—"}
                    </span>
                  </td>
                  <td>
                    {row.parts_count == null ? "—" : number(row.parts_count)}
                  </td>
                  <td>
                    <PricingBadge
                      status={row.status}
                      label={row.status_label}
                    />
                  </td>
                  <td>
                    <div className="pricing-row-actions">
                      <button
                        className="def-eye"
                        aria-label={"عرض " + row.request_number}
                        onClick={() => setDetail(row.id)}
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        aria-label={"خيارات " + row.request_number}
                        onClick={() => setMenu(menu === row.id ? null : row.id)}
                      >
                        <MoreVertical size={17} />
                      </button>
                      {menu === row.id && (
                        <div className="pricing-row-menu">
                          <button
                            onClick={() => {
                              setDetail(row.id);
                              setMenu(null);
                            }}
                          >
                            عرض التفاصيل
                          </button>
                          <button
                            onClick={() => {
                              setDetail(row.id);
                              setMenu(null);
                            }}
                          >
                            إجراءات الطلب
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!resource.loading && !listResource.error && !rows.length && (
            <p className="pricing-empty">لا توجد طلبات تطابق البحث.</p>
          )}
        </div>
        <div className="pricing-pagination">
          <button
            disabled={page === 1 || resource.loading}
            onClick={() => {
              setPage(page - 1);
              setMenu(null);
            }}
          >
            السابق
          </button>
          <span>
            صفحة {number(page)}
            {total != null
              ? ` من ${number(Math.max(1, Math.ceil(total / 8)))}`
              : ""}
          </span>
          <button
            disabled={
              resource.loading || total == null || page * 8 >= Number(total)
            }
            onClick={() => {
              setPage(page + 1);
              setMenu(null);
            }}
          >
            التالي
          </button>
          {selected.length > 0 && (
            <span>{number(selected.length)} طلب محدد</span>
          )}
        </div>
      </section>
    </div>
  );
}
