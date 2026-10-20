import React, { useState } from "react";
import {
  Plus,
  Search,
  ChevronDown,
  FileText,
  CheckCircle2,
  TriangleAlert,
  Shuffle,
} from "lucide-react";
import { adminRequest, queryString } from "./admin-api";
import useAdminResource from "./use-admin-resource";
import { Modal, Pager } from "./orders-ui";
import { Panel, Money } from "./products-ui";
import { State } from "./ProductExtras";
import ServiceEditor from "./ServiceEditor";
import { OrderDetail } from "./OrderDetail";
import "./orders-page.css";
function ServiceOrderRow({ row, onOpen }) {
  const detail = useAdminResource(
    "/api/orders/admin/" + encodeURIComponent(row.id),
  );
  const d = detail.data?.data,
    items = Array.isArray(d?.items)
      ? d.items.filter((x) => x.source === "service")
      : [],
    names = items.map((x) => x.product_name).filter(Boolean),
    cars = items
      .map((x) => x.car?.makeNameAr ?? x.car?.makeNameEn)
      .filter(Boolean);
  return (
    <tr>
      <td>
        <button onClick={onOpen}>
          {row.customer_name || d?.customer?.name || "—"}
        </button>
        <small className="pp-phone">
          {row.customer_phone || d?.customer?.phone || ""}
        </small>
      </td>
      <td>
        {cars.length
          ? [...new Set(cars)].join("، ")
          : detail.loading
            ? "جارٍ التحميل…"
            : "—"}
      </td>
      <td>
        {names.length
          ? names.join("، ")
          : detail.loading
            ? "جارٍ التحميل…"
            : "—"}
        {detail.error && <State resource={detail} />}
      </td>
      <td>
        <Money>
          {items.length
            ? items.reduce((sum, x) => sum + Number(x.line_total || 0), 0)
            : row.total}
        </Money>
      </td>
      <td>
        {row.suppliers
          ?.map((x) => x.name)
          .filter(Boolean)
          .join("، ") ||
          d?.items
            ?.filter((x) => x.source === "service")
            .map((x) => x.supplier?.name)
            .filter(Boolean)
            .join("، ") ||
          "لم يتم إسناد مركز"}
      </td>
      <td>
        {row.display_status_label ||
          {
            pending: "جديد",
            confirmed: "قيد التنفيذ",
            delivered: "تم التوصيل",
            cancelled: "ملغي",
          }[row.status] ||
          row.status}
      </td>
      <td>
        <button className="pp-button pp-small-button" onClick={onOpen}>
          التفاصيل
        </button>
      </td>
    </tr>
  );
}
export default function ServiceProducts({ navigation, onSessionExpired }) {
  const [tab, setTab] = useState("orders"),
    [search, setSearch] = useState(""),
    [query, setQuery] = useState(""),
    [page, setPage] = useState(1),
    [status, setStatus] = useState(""),
    [revision, setRevision] = useState(0),
    [editing, setEditing] = useState(null),
    [order, setOrder] = useState(null);
  React.useEffect(() => {
    const reset = () => {
      setEditing(null);
      setOrder(null);
      setRevision((v) => v + 1);
    };
    window.addEventListener("mypart:products-home", reset);
    return () => window.removeEventListener("mypart:products-home", reset);
  }, []);
  React.useEffect(() => {
    const t = setTimeout(() => {
      setQuery(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);
  const orders = useAdminResource(
    "/api/orders/all?" +
      queryString({
        source: "service",
        limit: 7,
        offset: (page - 1) * 7,
        search: query || undefined,
        status: status || undefined,
      }),
    revision,
  );
  const catalog = useAdminResource(
    tab === "catalog"
      ? "/api/suppliers/admin/services?" +
          queryString({
            limit: 7,
            offset: (page - 1) * 7,
            search: query || undefined,
          })
      : null,
    revision,
  );
  const data = tab === "orders" ? orders : catalog,
    rows = Array.isArray(data.data?.data) ? data.data.data : [];
  const counts = orders.data?.meta?.statusCounts || {};
  if (editing)
    return (
      <ServiceEditor
        key={editing.id || "new"}
        id={editing.id}
        onBack={() => {
          setEditing(null);
          setRevision((x) => x + 1);
        }}
        onSaved={() => setRevision((x) => x + 1)}
      />
    );
  if (order)
    return (
      <OrderDetail
        id={order}
        onBack={() => {
          setOrder(null);
          setRevision((x) => x + 1);
        }}
        onSessionExpired={onSessionExpired}
      />
    );
  return (
    <div className="pp-page">
      <div className="pp-page-heading">
        <h1>خدمات ماي بارت</h1>
      </div>
      <section className="pp-stat-panel">
        {[
          [orders.data?.meta?.total, "إجمالي طلبات الخدمات", "blue", FileText],
          [counts.pending, "طلبات جديدة", "green", CheckCircle2],
          [counts.confirmed, "قيد التنفيذ", "amber", TriangleAlert],
          [counts.delivered, "مكتملة", "red", Shuffle],
        ].map(([n, label, color, Icon]) => (
          <div key={label} className={"pp-stat " + color}>
            <span className="pp-stat-icon">
              <Icon size={21} />
            </span>
            <b>{n ?? "—"}</b>
            <span>{label}</span>
          </div>
        ))}
      </section>
      {navigation}
      <div className="pp-editor-tabs" role="tablist">
        {[
          ["orders", "طلبات الخدمات"],
          ["catalog", "كتالوج الخدمات"],
        ].map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? "active" : ""}
            onClick={() => {
              setTab(id);
              setPage(1);
              setSearch("");
              setQuery("");
              setStatus("");
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <section className="pp-list-panel">
        <div className="pp-list-tools">
          <div className="pp-search-status">
            <label className="pp-search">
              <input
                aria-label="البحث في الخدمات"
                value={search}
                placeholder={
                  tab === "orders" ? "اسم العميل أو رقم الطلب" : "اسم الخدمة"
                }
                onChange={(e) => setSearch(e.target.value)}
              />
              <Search size={19} />
            </label>{" "}
            {tab === "orders" && (
              <label className="pp-status">
                <select
                  aria-label="حالة طلب الخدمة"
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">كل الحالات</option>
                  {[
                    ["pending", "جديد"],
                    ["confirmed", "قيد التنفيذ"],
                    ["shipped", "قيد الشحن"],
                    ["delivered", "مكتمل"],
                    ["cancelled", "ملغي"],
                  ].map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={15} />
              </label>
            )}
          </div>
          <button className="pp-button" onClick={() => setEditing({})}>
            <Plus size={19} />
            إضافة خدمة
          </button>
        </div>
        <State resource={data} />
        <div className="pp-table-scroll">
          <table className="pp-table">
            <thead>
              <tr>
                {(tab === "orders"
                  ? [
                      "العميل",
                      "الشركة",
                      "الخدمة المطلوبة",
                      "السعر",
                      "مركز الصيانة",
                      "الحالة",
                      "الإجراءات",
                    ]
                  : [
                      "الخدمة",
                      "مقدم الخدمة",
                      "السعر",
                      "حالة المراجعة",
                      "الحالة",
                      "الإجراءات",
                    ]
                ).map((x) => (
                  <th key={x}>{x}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((x) =>
                tab === "orders" ? (
                  <ServiceOrderRow
                    key={x.id}
                    row={x}
                    onOpen={() => setOrder(x.id)}
                  />
                ) : (
                  <tr key={x.id}>
                    <td>{x.name}</td>
                    <td>{x.supplierName || x.centerName || "—"}</td>
                    <td>
                      <Money>{x.price}</Money>
                    </td>
                    <td>
                      {{
                        approved: "مقبول",
                        pending: "قيد المراجعة",
                        rejected: "مرفوض",
                      }[x.approvalStatus] || x.approvalStatus}
                    </td>
                    <td>{x.isActive ? "نشط" : "غير نشط"}</td>
                    <td>
                      <button
                        className="pp-button pp-small-button"
                        onClick={() => setEditing({ id: x.id })}
                      >
                        تعديل الخدمة
                      </button>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
        {!data.loading && !rows.length && <p>لا توجد نتائج.</p>}
        <Pager
          page={page}
          total={
            data.data?.meta?.total ??
            (rows.length === 7 ? page * 7 + 1 : (page - 1) * 7 + rows.length)
          }
          pageSize={7}
          onChange={setPage}
        />
      </section>
    </div>
  );
}
