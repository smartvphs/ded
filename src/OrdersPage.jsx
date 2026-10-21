import React, { useEffect, useState } from "react";
import {
  Plus,
  Search,
  UserRound,
  Car,
  CalendarDays,
  FileText,
  Layers,
  MoreVertical,
  PackageCheck,
  Truck,
  Clock,
  TriangleAlert,
  Ban,
  RotateCcw,
  CheckCircle2,
  ArrowDownToLine,
  Eye,
} from "lucide-react";
import useAdminResource from "./use-admin-resource";
import { orderListParams } from "./order-list-api";
import useOrderSuppliers from "./use-order-suppliers";
import CreateOrder from "./CreateOrder";
import { queryString } from "./admin-api";
import { number } from "./dashboard-data";
import {
  Badge,
  Field,
  Select,
  Panel,
  Pager,
  SearchBox,
  Stats,
  Money,
  ResourceState,
  Empty,
  dateText,
  payments,
  ProductPhoto,
  returnStatuses,
  statusOptions,
  StatusFilter,
} from "./orders-ui";
import { OrderDetail, ReturnDetail } from "./OrderDetail";
import "./orders-page.css";
const initialFilters = {
  supplier: "",
  car: "",
  date: "",
  payment: "",
  status: "",
  source: "",
  makeId: "",
};
export default function OrdersPage({ returns = false, onSessionExpired }) {
  const [detailTab, setDetailTab] = useState("details");
  const openDetail = (id, tab = "details") => {
    setDetailTab(tab);
    setDetail(id);
  };
  const [detail, setDetail] = useState(null),
    [create, setCreate] = useState(false),
    [filters, setFilters] = useState(initialFilters),
    [applied, setApplied] = useState(initialFilters),
    [search, setSearch] = useState(""),
    [debounced, setDebounced] = useState(""),
    [page, setPage] = useState(1),
    [tab, setTab] = useState("all"),
    [selected, setSelected] = useState([]),
    [menu, setMenu] = useState(null),
    [revision, setRevision] = useState(0),
    [notice, setNotice] = useState("");
  useEffect(() => {
    setDetail(null);
    setCreate(false);
    setPage(1);
    setTab("all");
    setSelected([]);
    setSearch("");
    setDebounced("");
    setApplied(initialFilters);
    setFilters(initialFilters);
  }, [returns]);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  const params = orderListParams({
    filters: applied,
    search: debounced,
    page,
    tab,
    returns,
  });
  const suppliers = useOrderSuppliers(!returns && !create && !detail);
  const makes = useAdminResource(
    !returns && !create && !detail ? "/api/cars/admin/makes" : null,
  );
  const makeResource =
    makes.data && !Array.isArray(makes.data.data)
      ? {
          ...makes,
          error: new Error("تعذر قراءة قائمة شركات السيارات من الخادم."),
        }
      : makes;
  const makeRows = Array.isArray(makes.data?.data) ? makes.data.data : [];
  useEffect(() => {
    setSelected([]);
    setMenu(null);
  }, [applied, debounced, page, tab, returns]);
  const resource = useAdminResource(
    (returns ? "/api/returns/admin" : "/api/orders/all") +
      "?" +
      queryString(params),
    revision,
  );
  const data = resource.data?.data;
  const rows = returns ? data?.items || [] : Array.isArray(data) ? data : [];
  const counts = returns
    ? data?.countsByStatus || {}
    : resource.data?.meta?.statusCounts || {};
  const total = returns ? data?.total : resource.data?.meta?.total;
  const invalid =
    resource.data &&
    (returns ? !Array.isArray(data?.items) : !Array.isArray(data));
  const listResource = invalid
    ? { ...resource, error: new Error("رد الخادم لا يحتوي قائمة طلبات صالحة.") }
    : resource;
  const visible = rows;
  const change = (key) => (e) =>
    setFilters({ ...filters, [key]: e.target.value });
  const stats = returns
    ? [
        {
          label: "إجمالي طلبات الإرجاع",
          value: Object.values(counts).reduce((a, b) => a + Number(b || 0), 0),
          color: "blue",
          icon: RotateCcw,
        },
        {
          label: "قيد المراجعة",
          value: counts.pending || 0,
          color: "amber",
          icon: TriangleAlert,
        },
        {
          label: "موافق عليه",
          value: counts.approved || 0,
          color: "green",
          icon: CheckCircle2,
        },
        {
          label: "تم الاسترداد",
          value: counts.completed || 0,
          color: "purple",
          icon: Clock,
        },
      ]
    : [
        {
          label: "إجمالي الطلبات",
          value: counts.all,
          color: "blue",
          icon: FileText,
        },
        {
          label: "طلب جديد",
          value: counts.pending,
          color: "green",
          icon: CheckCircle2,
        },
        {
          label: "تم الشحن",
          value: counts.shipped,
          color: "purple",
          icon: Truck,
        },
        {
          label: "تم التوصيل",
          value: counts.delivered,
          color: "pink",
          icon: PackageCheck,
        },
        {
          label: "قيد التنفيذ",
          value: counts.confirmed,
          color: "amber",
          icon: TriangleAlert,
        },
        {
          label: "طلبات ملغية",
          value: counts.cancelled,
          color: "red",
          icon: Ban,
        },
      ];
  if (create)
    return (
      <CreateOrder
        onBack={() => setCreate(false)}
        onCreated={(id) => {
          setCreate(false);
          openDetail(id || null);
          setRevision((n) => n + 1);
          setNotice("تم إنشاء الطلب على الخادم.");
        }}
        onSessionExpired={onSessionExpired}
      />
    );
  if (detail)
    return returns ? (
      <ReturnDetail
        id={detail}
        onBack={() => {
          setDetail(null);
          setRevision((n) => n + 1);
        }}
        onSessionExpired={onSessionExpired}
      />
    ) : (
      <OrderDetail
        id={detail}
        initialTab={detailTab}
        onBack={() => {
          setDetail(null);
          setRevision((n) => n + 1);
        }}
        onSessionExpired={onSessionExpired}
      />
    );
  return (
    <div className="op-content">
      <div className="op-heading">
        <h1>{returns ? "طلبات الإرجاع" : "إدارة الطلبات"}</h1>
        {!returns && (
          <div className="op-heading-actions">
            <button className="op-primary" onClick={() => setCreate(true)}>
              <Plus size={19} />
              إضافة جديد
            </button>
          </div>
        )}
      </div>
      <ResourceState resource={listResource} onLogin={onSessionExpired} />
      {notice && (
        <p className="op-notice" role="status">
          {notice}
        </p>
      )}
      {resource.data && !invalid && <Stats items={stats} />}
      {!returns && (
        <Panel title="البحث و التصنيف" className="op-filters">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const typed = filters.car.trim();
              const match = makeRows.find((m) =>
                [m.name_ar, m.nameAr, m.name_en, m.nameEn, m.name]
                  .filter(Boolean)
                  .some(
                    (n) => n.toLocaleLowerCase() === typed.toLocaleLowerCase(),
                  ),
              );
              if (typed && !match) {
                setNotice("اختر شركة من القائمة المقترحة لتطبيق الفلتر.");
                return;
              }
              setNotice("");
              setApplied({ ...filters, makeId: match?.id || "" });
              setPage(1);
              setTab("all");
            }}
          >
            <div className="op-filter-grid">
              <Select
                label="إسم المورد"
                icon={UserRound}
                disabled={suppliers.loading || Boolean(suppliers.error)}
                value={filters.supplier}
                onChange={change("supplier")}
              >
                <option value="">المورد</option>
                {(suppliers.data?.data || []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
              <Field label="الشركات" icon={Car}>
                <input
                  aria-label="الشركات"
                  list="order-car-makes"
                  disabled={makes.loading || Boolean(makeResource.error)}
                  placeholder="تويوتا . بي ام دبليو . مرسيدس"
                  value={filters.car}
                  onChange={change("car")}
                />
                <datalist id="order-car-makes">
                  {makeRows.map((m) => (
                    <option
                      key={m.id}
                      value={m.name_ar || m.nameAr || m.name || m.name_en}
                    >
                      {m.name_en || m.nameEn || ""}
                    </option>
                  ))}
                </datalist>
              </Field>
              <Field label="تاريخ الطلب" icon={CalendarDays}>
                <input
                  type="date"
                  value={filters.date}
                  onChange={change("date")}
                />
              </Field>
              <Select
                label="وسيلة الدفع"
                icon={FileText}
                value={filters.payment}
                onChange={change("payment")}
              >
                <option value="">كل وسائل الدفع</option>
                {Object.entries(payments).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </Select>
              <StatusFilter
                value={filters.status}
                onChange={change("status")}
              />
              <Select
                label="إظهار الطلبات"
                icon={FileText}
                value={filters.source}
                onChange={change("source")}
              >
                <option value="">جميع الطلبات</option>
                <option value="quotation">من طلبات التسعير فقط</option>
                <option value="catalog">طلبات مباشرة</option>
                <option value="offer">طلبات العروض</option>
                <option value="service">طلبات الخدمات</option>
              </Select>
            </div>
            <div className="op-filter-actions">
              <button className="op-primary" type="submit">
                <Search size={19} />
                البحث و التصنيف
              </button>
              <button
                className="op-text"
                type="button"
                onClick={() => {
                  setFilters(initialFilters);
                  setApplied(initialFilters);
                  setPage(1);
                  setSearch("");
                  setDebounced("");
                  setNotice("");
                  setTab("all");
                }}
              >
                مسح الفلاتر
              </button>
            </div>
            <ResourceState resource={suppliers} onLogin={onSessionExpired} />
            <ResourceState resource={makeResource} onLogin={onSessionExpired} />
          </form>
        </Panel>
      )}
      <Panel className="op-list">
        <div className="op-list-toolbar">
          <div className="op-list-tabs">
            <button
              className={tab === "all" ? "active" : ""}
              onClick={() => {
                setTab("all");
                setPage(1);
              }}
            >
              <Layers size={18} />
              الكل{" "}
              <small>
                {number(
                  counts.all ??
                    Object.values(counts).reduce(
                      (a, b) => a + Number(b || 0),
                      0,
                    ),
                )}
              </small>
            </button>
            <button
              className={tab === "new" ? "active" : ""}
              onClick={() => {
                setTab("new");
                setPage(1);
              }}
            >
              <i />
              جديد <small>{number(counts.pending || 0)}</small>
            </button>
          </div>
          <SearchBox value={search} onChange={setSearch} />
        </div>
        {selected.length > 0 && (
          <p className="op-caption">تم تحديد {selected.length} طلب</p>
        )}
        <div className="op-table-scroll">
          <table className={"op-table " + (returns ? "op-returns-table" : "")}>
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    aria-label="تحديد جميع الطلبات"
                    checked={
                      visible.length > 0 &&
                      visible.every((r) => selected.includes(r.id))
                    }
                    onChange={(e) =>
                      setSelected(
                        e.target.checked ? visible.map((r) => r.id) : [],
                      )
                    }
                  />
                </th>
                {(returns
                  ? [
                      "رقم الإرجاع",
                      "رقم الطلب",
                      "العميل",
                      "المنتج",
                      "تاريخ الطلب",
                      "السعر",
                      "الحالة",
                      "الإجراءات",
                    ]
                  : [
                      "رقم الطلب",
                      "العميل",
                      "المصدر",
                      "طلب التسعير",
                      "تاريخ الطلب",
                      "عدد القطع",
                      "وسيلة الدفع",
                      "المبلغ",
                      "الحالة",
                      "الإجراءات",
                    ]
                ).map((label) => (
                  <th key={label}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.id}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={
                        "تحديد " + (row.return_number || row.order_number)
                      }
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
                    <button
                      className="op-link"
                      onClick={() => openDetail(row.id)}
                    >
                      {row.return_number || row.order_number}
                    </button>
                  </td>
                  {returns ? (
                    <>
                      <td>{row.order_number}</td>
                      <td>{row.customer_name}</td>
                      <td>
                        <div className="op-product-cell">
                          <ProductPhoto
                            src={row.thumbnail}
                            name={row.product_name}
                          />
                          <span>
                            {row.product_name}
                            <small>{number(row.quantity)} قطعة</small>
                          </span>
                        </div>
                      </td>
                      <td className="op-muted">{dateText(row.created_at)}</td>
                      <td>
                        <Money
                          value={
                            row.refund_amount ??
                            Number(row.unit_price) * Number(row.quantity)
                          }
                        />
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{row.contact_name || row.customer_name || "—"}</td>
                      <td>
                        {row.suppliers?.map((s) => s.name).join("، ") ||
                          "المنصة"}
                      </td>
                      <td>
                        {row.pricing_requests?.length
                          ? row.pricing_requests.map((p) => (
                              <span className="op-link" key={p.id}>
                                {p.requestNumber}
                              </span>
                            ))
                          : "—"}
                      </td>
                      <td className="op-muted">{dateText(row.created_at)}</td>
                      <td>{number(row.items_quantity ?? row.items_count)}</td>
                      <td>
                        <span className={"op-payment " + row.payment_method}>
                          {payments[row.payment_method] ||
                            row.payment_method ||
                            "—"}
                        </span>
                      </td>
                      <td>
                        <Money value={row.total} />
                      </td>
                    </>
                  )}
                  <td>
                    <Badge
                      status={
                        returns
                          ? row.status
                          : row.return_status && row.return_status !== "none"
                            ? row.return_status
                            : row.status
                      }
                      label={returns ? returnStatuses[row.status] : undefined}
                    />
                  </td>
                  <td className="op-actions-cell">
                    <button
                      className="op-dots"
                      aria-label={
                        "إجراءات " + (row.return_number || row.order_number)
                      }
                      onClick={() => setMenu(menu === row.id ? null : row.id)}
                    >
                      <MoreVertical size={22} />
                    </button>
                    {menu === row.id && (
                      <div className="op-row-menu">
                        <button
                          onClick={() => {
                            openDetail(row.id);
                            setMenu(null);
                          }}
                        >
                          <Eye size={15} />
                          عرض التفاصيل
                        </button>
                        {!returns && (
                          <button
                            onClick={() => {
                              openDetail(row.id, "invoice");
                              setMenu(null);
                            }}
                          >
                            <FileText size={15} />
                            الفاتورة والشحن
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!resource.loading && !visible.length && !listResource.error && (
          <Empty>لا توجد طلبات مطابقة للبحث.</Empty>
        )}
        <Pager
          page={page}
          total={total || 0}
          pageSize={returns ? 8 : 7}
          onChange={(n) => {
            setPage(n);
            setSelected([]);
            setMenu(null);
          }}
        />
      </Panel>
    </div>
  );
}
