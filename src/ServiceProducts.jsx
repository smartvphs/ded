import React, { useState } from "react";
import {
  Plus,
  Search,
  ChevronDown,
  FileText,
  CheckCircle2,
  TriangleAlert,
  Shuffle,
  MoreVertical,
  Pencil,
  Eye,
} from "lucide-react";
import { adminRequest, queryString } from "./admin-api";
import useAdminResource from "./use-admin-resource";
import { Modal, Pager } from "./orders-ui";
import { Panel, Money } from "./products-ui";
import { State } from "./ProductExtras";
import ServiceEditor from "./ServiceEditor";
import { OrderDetail } from "./OrderDetail";
import "./orders-page.css";
function ServiceActions({ name, label, onSelect, order = false }) {
  const [position, setPosition] = useState(null);
  const trigger = React.useRef(null),
    menu = React.useRef(null);
  React.useEffect(() => {
    if (!position) return;
    const close = (event) => {
      if (
        !trigger.current?.contains(event.target) &&
        !menu.current?.contains(event.target)
      )
        setPosition(null);
    };
    const dismiss = () => setPosition(null);
    const keydown = (event) => {
      if (event.key === "Escape") {
        setPosition(null);
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", keydown);
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", keydown);
      window.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("resize", dismiss);
    };
  }, [position]);
  const Icon = order ? Eye : Pencil;
  return (
    <>
      <button
        ref={trigger}
        className="pp-menu-trigger"
        aria-label={"إجراءات " + name}
        aria-expanded={Boolean(position)}
        aria-haspopup="menu"
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          setPosition(
            position
              ? null
              : { top: rect.bottom - 10, left: Math.max(10, rect.left - 62) },
          );
        }}
      >
        <MoreVertical size={24} />
      </button>
      {position && (
        <div ref={menu} className="pp-menu" role="menu" style={position}>
          <button
            role="menuitem"
            onClick={() => {
              setPosition(null);
              onSelect();
            }}
          >
            <Icon size={16} />
            {label}
          </button>
        </div>
      )}
    </>
  );
}
function ServiceOrderRow({ row, onOpen }) {
  const detail = useAdminResource(
    "/api/orders/admin/" + encodeURIComponent(row.id),
  );
  const d = detail.data?.data,
    items = Array.isArray(d?.items)
      ? d.items.filter((x) => x.source === "service")
      : [],
    summary = Array.isArray(row.services) ? row.services : [],
    names = (
      summary.length
        ? summary.map((x) => x.name || x.nameEn)
        : items.map((x) => x.product_name)
    ).filter(Boolean),
    summaryCars = summary
      .map((x) => x.car?.makeNameAr ?? x.car?.makeNameEn)
      .filter(Boolean),
    cars = summaryCars.length
      ? summaryCars
      : items
          .map((x) => x.car?.makeNameAr ?? x.car?.makeNameEn)
          .filter(Boolean);
  return (
    <tr>
      <td>
        <button onClick={onOpen}>
          {row.contact_name ||
            row.customer_name ||
            d?.contact?.name ||
            d?.customer?.name ||
            "—"}
        </button>
        <small className="pp-phone">
          {row.contact_phone ||
            row.customer_phone ||
            d?.contact?.phone ||
            d?.customer?.phone ||
            ""}
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
        <ServiceActions
          name={row.order_number || row.id}
          label="التفاصيل"
          onSelect={onOpen}
          order
        />
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
                      <ServiceActions
                        name={x.name}
                        label="تعديل الخدمة"
                        onSelect={() => setEditing({ id: x.id })}
                      />
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
