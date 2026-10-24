import React, { useEffect, useState } from "react";
import useAdminResource from "./use-admin-resource";
import { adminRequest, queryString } from "./admin-api";
import { ResourceState } from "./orders-ui";
import {
  SupplierIcon,
  SupplierPanel,
  SupplierStats,
  SupplierField,
  SupplierButton,
  SupplierBadge,
  SupplierLogo,
  SupplierMoney,
  SupplierTable,
  SupplierPager,
  SupplierModal,
  SupplierChart,
  SupplierDonut,
  text,
} from "./supplier-ui";
import { SupplierEditor, SupplierBalance } from "./SupplierForms";
import useSupplierActivity from "./use-supplier-activity";
import SupplierAccountAction from "./SupplierAccountAction";
import SupplierDetails from "./SupplierDetails";
const noFilter = {
  search: "",
  make: "",
  hours: "",
  balance: "",
  accountStatus: "",
};
export default function Suppliers({ onSessionExpired }) {
  const [tab, setTab] = useState("all"),
    [filters, setFilters] = useState(noFilter),
    [applied, setApplied] = useState(noFilter),
    [status, setStatus] = useState(""),
    [page, setPage] = useState(1),
    [revision, setRevision] = useState(0),
    [selected, setSelected] = useState([]),
    [detail, setDetail] = useState(null),
    [dialog, setDialog] = useState(null),
    [menu, setMenu] = useState(null),
    [review, setReview] = useState(null),
    [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const resource = useAdminResource(
      "/api/suppliers/admin?" +
        queryString({
          search: applied.search,
          approvalStatus: ["suspended", "active", "deleted"].includes(status)
            ? undefined
            : status,
          accountStatus: ["suspended", "active", "deleted"].includes(status)
            ? status
            : applied.accountStatus,
          ...(applied.hours
            ? {
                [applied.hours.startsWith("open")
                  ? "openNow"
                  : "receivingPricingNow"]: applied.hours.endsWith("yes")
                  ? "true"
                  : "false",
              }
            : {}),
          ...(applied.balance === "positive"
            ? { minBalance: 0.01 }
            : applied.balance === "negative"
              ? { maxBalance: -0.01 }
              : applied.balance === "zero"
                ? { minBalance: 0, maxBalance: 0 }
                : {}),
          limit: 5,
          offset: (page - 1) * 5,
        }),
      revision,
    ),
    global = useAdminResource(
      "/api/suppliers/admin?limit=100&offset=0",
      revision,
    ),
    makes = useAdminResource("/api/cars/admin/makes");
  const rows = resource.data?.data?.items || [],
    data = global.data?.data,
    counts = data?.countsByStatus || {},
    makeRows = Array.isArray(makes.data?.data)
      ? makes.data.data
      : makes.data?.data?.items || [];
  useEffect(() => {
    const home = () => {
      setDetail(null);
      setTab("all");
      setRevision((n) => n + 1);
    };
    window.addEventListener("mypart:suppliers-home", home);
    return () => window.removeEventListener("mypart:suppliers-home", home);
  }, []);
  useEffect(() => {
    setSelected([]);
    setMenu(null);
  }, [page, status, applied]);
  useEffect(() => {
    if (!menu) return;
    const close = (e) => {
      if (!e.target.closest(".su-menu")) setMenu(null);
    };
    const key = (e) => {
      if (e.key === "Escape") setMenu(null);
    };
    window.addEventListener("click", close);
    window.addEventListener("keydown", key);
    const closeScroll = () => {
      if (performance.now() - (menu.openedAt || 0) > 200) setMenu(null);
    };
    window.addEventListener("scroll", closeScroll, { once: true });
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("keydown", key);
      window.removeEventListener("scroll", closeScroll);
    };
  }, [menu]);
  const refresh = () => setRevision((n) => n + 1);
  async function saveReview() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await adminRequest(
        "/api/suppliers/admin/" + encodeURIComponent(review.row.id) + "/review",
        {
          method: "PATCH",
          body: {
            approvalStatus: review.status,
            ...(review.status === "rejected"
              ? { rejectionReason: reason.trim() }
              : {}),
          },
        },
      );
      const result = await adminRequest(
        "/api/suppliers/admin/" + encodeURIComponent(review.row.id),
      );
      if (result.data?.approval_status !== review.status)
        throw new Error("تعذر تأكيد حالة المورد. أعد تحميل البيانات.");
      setReview(null);
      refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (detail)
    return (
      <SupplierDetails
        id={detail}
        onBack={() => {
          setDetail(null);
          refresh();
        }}
        onSessionExpired={onSessionExpired}
      />
    );
  return (
    <div className="su-page">
      <div className="su-topline">
        <h1>إدارة الموردين</h1>
        <SupplierButton icon="plus" onClick={() => setDialog({ kind: "add" })}>
          إضافة جديد
        </SupplierButton>
      </div>
      <div className="su-tabs">
        {[
          ["all", "جميع الموردين", "users"],
          ["analytics", "الإحصائيات والتحليلات", "analysis"],
          ["times", "أوقات التسعير", "time"],
        ].map(([key, label, icon]) => (
          <button
            className={tab === key ? "active" : ""}
            key={key}
            onClick={() => setTab(key)}
          >
            <SupplierIcon
              name={tab === key ? icon + "-active" : icon}
              size={21}
            />
            {label}
          </button>
        ))}
      </div>
      {tab === "all" ? (
        <>
          <SupplierStats
            items={[
              { label: "إجمالي الموردين", value: data?.total, icon: "total" },
              {
                label: "إجمالي المبيعات",
                value: data?.metrics?.total_sales,
                icon: "sales",
                tint: "green",
                money: true,
              },
              {
                label: "طلب تسعير هذا الشهر",
                value: data?.metrics?.monthly_pricing_requests,
                icon: "pricing",
                tint: "pink",
              },
              {
                label: "موردون متأخرون",
                value: data?.metrics?.late_suppliers,
                icon: "late",
                tint: "yellow",
              },
              {
                label: "متوسط تقييم الموردين",
                value:
                  data?.items?.length === data?.total && data?.total > 0
                    ? (
                        data.items.reduce(
                          (s, x) => s + Number(x.rating || 0),
                          0,
                        ) / data.total
                      ).toFixed(1)
                    : null,
                icon: "rating",
                tint: "purple",
              },
            ]}
          />
          <SupplierPanel title="البحث والتصنيف" className="su-search-panel">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setApplied(filters);
                setPage(1);
              }}
            >
              <div className="su-fields">
                <SupplierField label="اسم المورد" icon="person">
                  <input
                    value={filters.search}
                    onChange={(e) =>
                      setFilters({ ...filters, search: e.target.value })
                    }
                    placeholder="اسم المورد هنا"
                  />
                </SupplierField>
                <SupplierField label="الشركات" icon="car">
                  <select
                    value={filters.make}
                    disabled
                    title="تصفية الشركات غير متاحة حاليًا"
                  >
                    <option value="">جميع الشركات</option>
                    {makeRows.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name_ar}
                      </option>
                    ))}
                  </select>
                </SupplierField>
                <SupplierField label="أوقات التسعير" icon="clock">
                  <select
                    value={filters.hours}
                    onChange={(e) =>
                      setFilters({ ...filters, hours: e.target.value })
                    }
                  >
                    <option value="">كل الأوقات</option>
                    <option value="pricing-yes">يستقبل التسعير الآن</option>
                    <option value="pricing-no">لا يستقبل التسعير الآن</option>
                    <option value="open-yes">مفتوح الآن</option>
                    <option value="open-no">
                      مغلق الآن أو لم تحدد مواعيده
                    </option>
                  </select>
                </SupplierField>
                <div className="su-filter-balance">
                  <SupplierField label="الرصيد" icon="clock">
                    <select
                      value={filters.balance}
                      onChange={(e) =>
                        setFilters({ ...filters, balance: e.target.value })
                      }
                    >
                      <option value="">الكل</option>
                      <option value="positive">رصيد موجب</option>
                      <option value="negative">رصيد سالب</option>
                      <option value="zero">رصيد صفر</option>
                    </select>
                  </SupplierField>
                </div>
                <div className="su-search-submit">
                  <SupplierButton icon="search" type="submit">
                    البحث والتصنيف
                  </SupplierButton>
                </div>
              </div>
            </form>
          </SupplierPanel>
          <SupplierPanel>
            <div className="su-table-title">
              <h2>الموردين</h2>
              <div className="su-status-tabs">
                {[
                  ["", "الكل", data?.total],
                  ["active", "نشط", data?.countsByAccountStatus?.active],
                  [
                    "suspended",
                    "موقوف",
                    data?.countsByAccountStatus?.suspended,
                  ],
                  ["pending", "موردين جدد", counts.pending],
                ].map(([key, label, count]) => (
                  <button
                    key={key}
                    className={status === key ? "active" : ""}
                    onClick={() => {
                      setStatus(key);
                      setPage(1);
                    }}
                  >
                    {key ? (
                      <i className={key} />
                    ) : (
                      <SupplierIcon name={status ? "users" : "all"} size={17} />
                    )}{" "}
                    {label}
                    <span>{text(count)}</span>
                  </button>
                ))}
              </div>
            </div>
            <ResourceState resource={resource} onLogin={onSessionExpired} />
            {resource.data && (
              <>
                <SupplierTable
                  head={[
                    <input
                      aria-label="تحديد كل الموردين في الصفحة"
                      type="checkbox"
                      checked={
                        rows.length > 0 &&
                        rows.every((x) => selected.includes(x.id))
                      }
                      onChange={(e) =>
                        setSelected(
                          e.target.checked ? rows.map((x) => x.id) : [],
                        )
                      }
                    />,
                    <>
                      اسم المورد <SupplierIcon name="sort" size={13} />
                    </>,
                    "ماركات السيارات",
                    <>
                      المبيعات <SupplierIcon name="sort" size={13} />
                    </>,
                    <>
                      الطلبات <SupplierIcon name="sort" size={13} />
                    </>,
                    <>
                      الرصيد <SupplierIcon name="sort" size={13} />
                    </>,
                    <>
                      نسبة الربح <SupplierIcon name="sort" size={13} />
                    </>,
                    "الحالة",
                    "الإجراءات",
                  ]}
                >
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selected.includes(row.id)}
                          aria-label={"تحديد " + row.name}
                          onChange={(e) =>
                            setSelected(
                              e.target.checked
                                ? [...selected, row.id]
                                : selected.filter((x) => x !== row.id),
                            )
                          }
                        />
                      </td>
                      <td>
                        <button
                          className="su-name"
                          onClick={() => setDetail(row.id)}
                        >
                          <SupplierLogo supplier={row} />
                          {row.name}
                        </button>
                      </td>
                      <td>
                        <div className="su-makes">
                          {(row.supported_make_ids || [])
                            .map((id) => makeRows.find((x) => x.id === id))
                            .filter(Boolean)
                            .map((x) =>
                              x.logo_url ? (
                                <img
                                  key={x.id}
                                  src={x.logo_url}
                                  onError={(e) => {
                                    e.currentTarget.style.visibility = "hidden";
                                  }}
                                  alt={x.name_ar}
                                />
                              ) : (
                                <span key={x.id}>{x.name_ar}</span>
                              ),
                            )}
                          {!row.supported_make_ids?.length && "—"}
                        </div>
                      </td>
                      <td>
                        {row.sales_total != null ? (
                          <SupplierMoney value={row.sales_total} />
                        ) : row.sales_count != null ? (
                          row.sales_count + " طلب"
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        {row.quotations_count != null
                          ? row.quotations_count + " تسعير"
                          : "—"}
                      </td>
                      <td>
                        <SupplierMoney value={row.wallet_balance} />
                      </td>
                      <td>
                        {row.profit_percent == null
                          ? "—"
                          : row.profit_percent + "%"}
                      </td>
                      <td>
                        <SupplierBadge
                          status={
                            row.account_status === "suspended"
                              ? "rejected"
                              : row.account_status === "deleted"
                                ? "inactive"
                                : row.approval_status
                          }
                          label={
                            row.account_status === "deleted"
                              ? "محذوف"
                              : undefined
                          }
                        />
                      </td>
                      <td>
                        <div className="su-row-actions">
                          {row.approval_status === "pending" ? (
                            <>
                              <button
                                aria-label={"قبول " + row.name}
                                onClick={() => {
                                  setReview({ row, status: "approved" });
                                  setReason("");
                                }}
                              >
                                <SupplierIcon name="accept" size={36} />
                              </button>
                              <button
                                aria-label={"رفض " + row.name}
                                onClick={() => {
                                  setReview({ row, status: "rejected" });
                                  setReason("");
                                }}
                              >
                                <SupplierIcon name="reject" size={36} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                aria-label={"عرض " + row.name}
                                onClick={() => setDetail(row.id)}
                              >
                                <SupplierIcon name="eye" size={34} />
                              </button>
                              <button
                                disabled={row.account_status === "deleted"}
                                title="حذف المورد"
                                aria-label={"حذف " + row.name}
                                onClick={() =>
                                  setDialog({ kind: "delete", row })
                                }
                              >
                                <SupplierIcon name="trash" size={34} />
                              </button>
                              <button
                                aria-label={"إجراءات " + row.name}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const r =
                                    e.currentTarget.getBoundingClientRect();
                                  setMenu({
                                    openedAt: performance.now(),
                                    row,
                                    x: Math.max(15, r.left - 60),
                                    y: r.bottom + 6,
                                  });
                                }}
                              >
                                <SupplierIcon name="more" size={22} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </SupplierTable>
                {!rows.length && (
                  <p className="su-empty">لا يوجد موردون يطابقون البحث.</p>
                )}
                <SupplierPager
                  page={page}
                  total={resource.data.data.total}
                  onChange={setPage}
                />
              </>
            )}
          </SupplierPanel>
        </>
      ) : tab === "analytics" ? (
        <SupplierAnalytics
          onSessionExpired={onSessionExpired}
          onOpen={setDetail}
        />
      ) : (
        <SupplierTimes />
      )}
      {menu && (
        <div
          className="su-menu"
          style={{
            position: "fixed",
            left: menu.x,
            top: Math.min(menu.y, window.innerHeight - 280),
          }}
          role="menu"
        >
          <button
            role="menuitem"
            onClick={() => {
              setDetail(menu.row.id);
              setMenu(null);
            }}
          >
            <SupplierIcon name="eye" />
            تفاصيل المورد
          </button>
          <button
            role="menuitem"
            onClick={() => {
              setDialog({ kind: "balance", row: menu.row });
              setMenu(null);
            }}
          >
            <SupplierIcon name="amount" />
            تسوية الرصيد
          </button>
          <button
            role="menuitem"
            onClick={() => {
              setDialog({ kind: "edit", row: menu.row });
              setMenu(null);
            }}
          >
            <SupplierIcon name="edit" />
            تعديل البيانات
          </button>
          <button
            role="menuitem"
            disabled={menu.row.account_status === "deleted"}
            onClick={() => {
              setDialog({ kind: "account", row: menu.row });
              setMenu(null);
            }}
          >
            <SupplierIcon name="person" />
            {menu.row.account_status === "suspended"
              ? "إعادة تفعيل"
              : "إيقاف المورد"}
          </button>
          <button
            role="menuitem"
            disabled={menu.row.account_status === "deleted"}
            className="danger"
            onClick={() => {
              setDialog({ kind: "delete", row: menu.row });
              setMenu(null);
            }}
          >
            <SupplierIcon name="trash" />
            حذف المورد
          </button>
          <button
            role="menuitem"
            disabled={menu.row.account_status === "deleted"}
            className="danger"
            onClick={() => {
              setDialog({ kind: "account", row: menu.row });
              setMenu(null);
            }}
          >
            <SupplierIcon name="reject" />
            حظر المورد
          </button>
          <button
            role="menuitem"
            onClick={() => {
              setStatus("deleted");
              setPage(1);
              setMenu(null);
            }}
          >
            <SupplierIcon name="trash" />
            عرض الموردين المحذوفين
          </button>
        </div>
      )}
      {["account", "delete"].includes(dialog?.kind) && (
        <SupplierAccountAction
          supplier={dialog.row}
          kind={dialog.kind}
          onClose={() => setDialog(null)}
          onSaved={() => {
            if (dialog.kind === "delete") setStatus("deleted");
            setDialog(null);
            refresh();
          }}
        />
      )}
      {dialog?.kind === "add" && (
        <SupplierEditor
          onClose={() => setDialog(null)}
          onSaved={(id) => {
            setDialog(null);
            refresh();
            setDetail(id);
          }}
        />
      )}
      {dialog?.kind === "edit" && (
        <SupplierEditor
          supplier={dialog.row}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            refresh();
          }}
        />
      )}
      {dialog?.kind === "balance" && (
        <SupplierBalance
          supplier={dialog.row}
          onClose={() => setDialog(null)}
          onChanged={refresh}
        />
      )}
      {review && (
        <SupplierModal
          title={review.status === "approved" ? "قبول المورد" : "رفض المورد"}
          small
          busy={busy}
          onClose={() => setReview(null)}
        >
          <SupplierPanel>
            <p>{review.row.name}</p>
            {review.status === "rejected" && (
              <SupplierField label="سبب الرفض">
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </SupplierField>
            )}
            {error && (
              <p role="alert" className="su-error">
                {error}
              </p>
            )}
            <button
              className="su-button full"
              disabled={
                busy || (review.status === "rejected" && !reason.trim())
              }
              onClick={saveReview}
            >
              تأكيد
            </button>
          </SupplierPanel>
        </SupplierModal>
      )}
    </div>
  );
}
function SupplierAnalytics({ onSessionExpired, onOpen }) {
  const [period, setPeriod] = useState("month");
  const suffix =
    period === "month"
      ? ""
      : period === "week"
        ? "&from=" +
          new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10) +
          "&to=" +
          new Date().toISOString().slice(0, 10)
        : "&from=" +
          new Date().getFullYear() +
          "-01-01&to=" +
          new Date().toISOString().slice(0, 10);
  const sales = useAdminResource(
      "/api/admin/reports/suppliers?limit=8" + suffix,
    ),
    quotes = useAdminResource(
      "/api/admin/reports/pricing-suppliers?limit=5" + suffix,
    ),
    performance = useAdminResource(
      "/api/admin/reports/performance?limit=6" + suffix,
    );
  const list = sales.data?.data?.items || [],
    top = quotes.data?.data?.items || [],
    report = performance.data?.data;
  const max = Math.max(1, ...list.map((x) => Number(x.netRevenue)));
  return (
    <>
      <div className="su-analytics-top">
        <SupplierPanel
          title="أكثر الموردين مبيعًا"
          action={
            <select
              className="su-period"
              aria-label="الفترة"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              <option value="month">الشهري</option>
              <option value="week">الأسبوعي</option>
              <option value="year">السنوي</option>
            </select>
          }
        >
          <ResourceState resource={sales} onLogin={onSessionExpired} />
          <div className="su-sales-bars">
            {list.map((row, i) => (
              <button
                key={row.supplierId}
                onClick={() => onOpen(row.supplierId)}
                className="su-sales-bar"
                style={{
                  width:
                    Math.max(20, (Number(row.netRevenue) / max) * 100) + "%",
                  background: `linear-gradient(90deg,${["#195bea", "#2d8edc", "#ff9c00", "#f05f57", "#9b55eb", "#0699bd", "#57b4a0", "#183aab"][i % 8]},#f8f8ff)`,
                }}
              >
                <span>{row.name}</span>
                <b>
                  <SupplierMoney value={row.netRevenue} />
                </b>
              </button>
            ))}
          </div>
          {sales.data && !list.length && (
            <p className="su-empty">لا توجد مبيعات خلال الفترة.</p>
          )}
        </SupplierPanel>
        <SupplierPanel title="أكثر الموردين تسعيرًا">
          <ResourceState resource={quotes} onLogin={onSessionExpired} />
          {top.map((row) => (
            <button
              className="su-ranking"
              key={row.supplierId}
              onClick={() => onOpen(row.supplierId)}
              style={{ width: "100%", textAlign: "right" }}
            >
              <SupplierLogo supplier={row} size={44} />
              <span>
                <h3>{row.name}</h3>
                <small>
                  {row.quotationsCount} طلب مكتمل{" "}
                  <span className="rating">★ {row.rating}</span>
                </small>
              </span>
              <SupplierMoney value={row.quotedTotal} />
            </button>
          ))}
          {quotes.data && !top.length && (
            <p className="su-empty">لا توجد تسعيرات خلال الفترة.</p>
          )}
        </SupplierPanel>
      </div>
      <ResourceState resource={performance} onLogin={onSessionExpired} />
      <div className="su-analytics-bottom">
        <SupplierPanel title="أكثر الموردين تسعيرًا">
          <SupplierChart
            kind="bar"
            items={top}
            valueKey="quotationsCount"
            labelKey="name"
            title="أكثر الموردين تسعيرًا"
          />
        </SupplierPanel>
        <SupplierPanel title="أكثر القطع تسعيرًا">
          <SupplierChart
            items={report?.topCategories?.items || []}
            valueKey="pricingRequests"
            labelKey="nameAr"
            title="أكثر القطع تسعيرًا"
          />
        </SupplierPanel>
        <SupplierPanel title="توزيع الجودات في التسعير">
          <SupplierDonut
            total={report?.partsQuality?.items?.reduce(
              (s, x) => s + Number(x.quotesCount || 0),
              0,
            )}
            items={(report?.partsQuality?.items || []).map((x) => ({
              label: x.label,
              value: x.quotesCount,
            }))}
          />
        </SupplierPanel>
      </div>
    </>
  );
}
function SupplierTimes() {
  const activity = useSupplierActivity(),
    hours = activity.data?.hours,
    peak = hours?.length ? hours.indexOf(Math.max(...hours)) : null;
  return (
    <>
      <SupplierPanel title="تحليل أوقات التسعير" className="su-times-panel">
        <p className="su-heat-caption">
          الأوقات الأكثر نشاطًا:{" "}
          <span>
            {activity.data?.total > 0
              ? String(peak).padStart(2, "0") + ":00 بتوقيت السعودية"
              : "—"}
          </span>
        </p>
        <div className="su-heatmap">
          {Array.from({ length: 24 }, (_, i) => (
            <div key={i}>
              <b
                style={{ background: hours?.[i] > 0 ? "#00aa7b" : "#e3e8f1" }}
                title={String(i).padStart(2, "0") + ":00"}
              >
                {hours?.[i] ?? "—"}
              </b>
              <small>
                {i % 3 === 0 ? String(i).padStart(2, "0") + ":00" : ""}
              </small>
            </div>
          ))}
        </div>
        <div className="su-heat-legend">
          <span>أقل نشاطًا</span>
          {[
            "#e3e8f1",
            "#d9efe8",
            "#a7dfcf",
            "#72cbb4",
            "#3ebd99",
            "#00aa7b",
          ].map((c) => (
            <i key={c} style={{ background: c }} />
          ))}
          <span>أكثر نشاطًا</span>
        </div>
      </SupplierPanel>
      <SupplierStats
        className="su-time-stats"
        items={[
          {
            label: "متوسط وقت الرد",
            icon: "bolt",
            value:
              activity.data?.avgMinutes == null
                ? null
                : activity.data.avgMinutes.toFixed(1) + " دقيقة",
            note: "آخر 30 يومًا",
          },
          {
            label: "معدل الرد خلال 3 ساعات",
            icon: "fast",
            tint: "yellow",
            value: null,
            note: "متوسط المنصة",
          },
          {
            label: "أكثر وقت تسعير نشاطًا",
            icon: "activity",
            tint: "green",
            value: null,
            note: "—",
          },
          {
            label: "موردين لم يردوا",
            icon: "alert",
            tint: "red",
            value: null,
            note: "منذ أكثر من 48 ساعة",
          },
        ]}
      />
      <p className="su-inline-note">
        {activity.loading
          ? "جارٍ تحميل نشاط الموردين…"
          : activity.error
            ? activity.error.message
            : "النشاط مجمع من إحصائيات الموردين لنفس الفترة؛ نسبة الرد خلال 3 ساعات وعدد من لم يردوا غير متاحين في الرد الحالي."}
      </p>
    </>
  );
}
