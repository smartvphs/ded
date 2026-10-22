import React, { useEffect, useState } from "react";
import {
  Send,
  Search,
  Eye,
  Bell,
  ShoppingBag,
  Wallet,
  Users,
  Clock,
  RefreshCw,
} from "lucide-react";
import useAdminResource from "./use-admin-resource";
import { ResourceState, Money } from "./orders-ui";
import AbandonedCartDetail from "./AbandonedCartDetail";
import CartReminderDialog from "./CartReminderDialog";
import {
  cartsListPath,
  cartNumber,
  cartDate,
  reminderLabels,
} from "./abandoned-carts-api";
import "./abandoned-carts.css";
export default function AbandonedCarts({ onSessionExpired }) {
  const [search, setSearch] = useState(""),
    [query, setQuery] = useState(""),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState([]),
    [idleHours, setIdleHours] = useState(24),
    [order, setOrder] = useState("desc"),
    [detail, setDetail] = useState(null),
    [pending, setPending] = useState(null),
    [revision, setRevision] = useState(0),
    [uncertain, setUncertain] = useState([]),
    [notice, setNotice] = useState("");
  const resource = useAdminResource(
      cartsListPath({ search: query, idleHours, order, page }),
      revision,
    ),
    me = useAdminResource("/api/admin/me"),
    canManage =
      me.data?.data?.isSuperAdmin === true ||
      me.data?.data?.permissions?.includes("customers.manage") === true,
    valid =
      resource.data && !Array.isArray(resource.data.data)
        ? { ...resource, error: new Error("رد قائمة السلات غير صالح.") }
        : resource,
    rows = Array.isArray(resource.data?.data) ? resource.data.data : [],
    metrics = resource.data?.meta?.metrics,
    total = resource.data?.meta?.total,
    pages = Math.max(1, Math.ceil(Number(total || 0) / 7)),
    eligible = rows.filter(
      (row) => row.canRemind === true && !uncertain.includes(row.userId),
    ),
    selectedIds = selected.map((row) => row.userId);
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
    window.addEventListener("mypart:carts-home", home);
    return () => window.removeEventListener("mypart:carts-home", home);
  }, []);
  useEffect(() => {
    if (!resource.data) return;
    setSelected((old) =>
      old.filter(
        (s) =>
          !rows.some(
            (row) =>
              row.userId === s.userId &&
              (row.canRemind !== true || uncertain.includes(row.userId)),
          ),
      ),
    );
  }, [resource.data, uncertain]);
  function toggle(row) {
    setSelected((old) =>
      old.some((r) => r.userId === row.userId)
        ? old.filter((r) => r.userId !== row.userId)
        : [...old, row],
    );
  }
  function remind(targets, bulk = false) {
    if (!canManage) return;
    if (!targets.length) {
      setNotice("حدد سلة جاهزة للتذكير على الأقل.");
      return;
    }
    if (targets.length > 100) {
      setNotice("الحد الأقصى للإرسال الجماعي 100 سلة.");
      return;
    }
    setPending({ targets, bulk });
  }
  function refreshed(ids = []) {
    setRevision((n) => n + 1);
    setSelected((old) => old.filter((row) => !ids.includes(row.userId)));
  }
  return (
    <div className="admin-page carts-page">
      {notice && (
        <div className="cart-api-notice" role="status">
          {notice}
          <button aria-label="إغلاق الرسالة" onClick={() => setNotice("")}>
            ×
          </button>
        </div>
      )}
      <ResourceState resource={me} onLogin={onSessionExpired} />
      {detail ? (
        <AbandonedCartDetail
          id={detail}
          revision={revision}
          onBack={() => setDetail(null)}
          onRemind={(row) => remind([row])}
          canManage={canManage}
          uncertain={uncertain.includes(detail)}
          onSessionExpired={onSessionExpired}
        />
      ) : (
        <>
          <div className="pricing-heading">
            <h1>إدارة السلات المتروكة</h1>
            <div className="cart-heading-actions">
              <button className="pricing-back" onClick={resource.reload}>
                <RefreshCw size={15} />
                تحديث
              </button>
              <button
                className="pricing-primary"
                disabled={!canManage || !selected.length}
                onClick={() => remind(selected, true)}
              >
                <Send size={15} />
                إرسال رسائل استرداد للسلات{" "}
                {selected.length ? "(" + selected.length + ")" : ""}
              </button>
            </div>
          </div>
          <section className="coupon-statistics cart-statistics">
            {[
              [metrics?.abandonedCarts, "السلات المتروكة", "blue", ShoppingBag],
              [metrics?.abandonedValue, "قيمة السلات", "purple", Wallet, true],
              [metrics?.readyToRemind, "جاهزة للتذكير", "pink", Bell],
              [metrics?.guestCarts, "سلات الزوار", "yellow", Users],
            ].map(([value, label, color, I, money]) => (
              <div className={"coupon-stat " + color} key={label}>
                <span className="stat-icon">
                  <I size={19} />
                </span>
                <b>{money ? <Money value={value} /> : cartNumber(value)}</b>
                <span>{label}</span>
              </div>
            ))}
          </section>
          {metrics && (
            <div className="cart-overview">
              <span>
                إجمالي الكمية: {cartNumber(metrics.abandonedQuantity)}
              </span>
              <span>
                قيمة سلات الزوار: <Money value={metrics.guestValue} />
              </span>
              <span>
                آخر ٣٠ يوم: {cartNumber(metrics.last30Days?.remindersSent)}{" "}
                تذكير · {cartNumber(metrics.last30Days?.recovered)} سلة مستردة ·
                نسبة الاسترداد{" "}
                {metrics.last30Days?.recoveryRate == null
                  ? "—"
                  : cartNumber(metrics.last30Days.recoveryRate) + "%"}
              </span>
            </div>
          )}
          <section className="cart-table-card">
            <div className="cart-toolbar">
              <label className="admin-search">
                <Search size={17} />
                <input
                  aria-label="البحث في السلات"
                  placeholder="البحث بالاسم أو رقم الجوال أو البريد..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <label className="cart-filter">
                التوقف عن إضافة منتجات
                <select
                  aria-label="مدة توقف السلة"
                  value={idleHours}
                  onChange={(e) => {
                    setIdleHours(Number(e.target.value));
                    setPage(1);
                    setSelected([]);
                  }}
                >
                  {[
                    [1, "ساعة"],
                    [24, "٢٤ ساعة"],
                    [72, "٣ أيام"],
                    [168, "٧ أيام"],
                    [720, "٣٠ يوم"],
                  ].map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="cart-filter">
                ترتيب آخر إضافة
                <select
                  aria-label="ترتيب السلات"
                  value={order}
                  onChange={(e) => {
                    setOrder(e.target.value);
                    setPage(1);
                    setSelected([]);
                  }}
                >
                  <option value="desc">الأحدث أولًا</option>
                  <option value="asc">الأقدم أولًا</option>
                </select>
              </label>
            </div>
            <p className="cart-api-note">
              التذكير متاح بعد ٢٤ ساعة من آخر إضافة. سلات الزوار إحصائيات فقط،
              ومفيش بيانات للتواصل معاهم.
            </p>
            {uncertain.length > 0 && (
              <p className="cart-api-note" role="alert">
                فيه إرسال نتيجته غير مؤكدة؛ حدّث السلات وراجع سجل التذكير قبل
                تكراره.
              </p>
            )}
            <ResourceState resource={valid} onLogin={onSessionExpired} />
            <div className="pricing-table-scroll">
              <table className="cart-table">
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        aria-label="تحديد كل السلات الجاهزة الظاهرة"
                        disabled={!canManage || !eligible.length}
                        checked={
                          eligible.length > 0 &&
                          eligible.every((row) =>
                            selectedIds.includes(row.userId),
                          )
                        }
                        onChange={(e) =>
                          setSelected((old) =>
                            e.target.checked
                              ? [
                                  ...old.filter(
                                    (row) =>
                                      !eligible.some(
                                        (r) => r.userId === row.userId,
                                      ),
                                  ),
                                  ...eligible,
                                ]
                              : old.filter(
                                  (row) =>
                                    !eligible.some(
                                      (r) => r.userId === row.userId,
                                    ),
                                ),
                          )
                        }
                      />
                    </th>
                    {[
                      "العميل",
                      "التوقف بالساعات",
                      "آخر إضافة للسلة",
                      "المنتجات / الكمية",
                      "قيمة السلة",
                      "حالة التذكير",
                      "الإجراءات",
                    ].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.userId}>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={"تحديد السلة " + row.userId}
                          checked={selectedIds.includes(row.userId)}
                          disabled={
                            !canManage ||
                            row.canRemind !== true ||
                            uncertain.includes(row.userId)
                          }
                          onChange={() => toggle(row)}
                        />
                      </td>
                      <td>
                        <span className="cart-table-client">
                          <span className="cart-client-avatar">
                            {row.name?.[0] || "ع"}
                          </span>
                          <span>
                            {row.name || "عميل بدون اسم"}
                            <small dir="ltr">
                              {row.phone || row.email || "—"}
                            </small>
                          </span>
                        </span>
                      </td>
                      <td>{cartNumber(row.idleHours)}</td>
                      <td>{cartDate(row.lastActivityAt)}</td>
                      <td>
                        {cartNumber(row.itemsCount)} /{" "}
                        {cartNumber(row.quantity)}
                      </td>
                      <td>
                        <Money value={row.cartValue} />
                      </td>
                      <td>
                        <span
                          className={
                            "pricing-badge " +
                            (row.reminderStatus === "already_reminded"
                              ? "green"
                              : row.reminderStatus === "ready"
                                ? "blue"
                                : "orange")
                          }
                        >
                          <i />
                          {reminderLabels[row.reminderStatus] ||
                            row.reminderStatus ||
                            "—"}
                        </span>
                        {row.lastReminderAt && (
                          <small className="cart-reminder-date">
                            {cartDate(row.lastReminderAt)}
                          </small>
                        )}
                      </td>
                      <td>
                        <div className="cart-actions">
                          <button
                            className="def-eye"
                            aria-label={"عرض السلة " + row.userId}
                            onClick={() => setDetail(row.userId)}
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            className="cart-remind"
                            aria-label={"تذكير السلة " + row.userId}
                            disabled={
                              !canManage ||
                              row.canRemind !== true ||
                              uncertain.includes(row.userId)
                            }
                            onClick={() => remind([row])}
                          >
                            <Bell size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!valid.loading && !valid.error && !rows.length && (
                <p className="pricing-empty">لا توجد سلات تطابق البحث.</p>
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
                    className={n === page ? "selected" : ""}
                    onClick={() => setPage(n)}
                    disabled={resource.loading}
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
              <span>الإجمالي: {cartNumber(total)}</span>
            </div>
          </section>
        </>
      )}
      {pending && (
        <CartReminderDialog
          {...pending}
          onClose={() => setPending(null)}
          onDone={refreshed}
          onUncertain={(ids) => {
            setUncertain((old) => [...new Set([...old, ...ids])]);
            setRevision((n) => n + 1);
          }}
        />
      )}
    </div>
  );
}
