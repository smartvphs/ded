import React, { useEffect, useState } from "react";
import {
  Plus,
  Search,
  Edit3,
  Copy,
  CopyPlus,
  Trash2,
  Ticket,
  Users,
  FileText,
  Coins,
  RefreshCw,
  ChartNoAxesCombined,
} from "lucide-react";
import useAdminResource from "./use-admin-resource";
import { ResourceState, Money } from "./orders-ui";
import { number } from "./dashboard-data";
import { couponListPath, couponStates, couponMethods } from "./coupons-api";
import { cartDate } from "./abandoned-carts-api";
import { CouponForm, CouponAction } from "./CouponForms";
import CouponUsage from "./CouponUsage";
import "./coupons.css";
export default function Coupons({ onSessionExpired }) {
  const [search, setSearch] = useState(""),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState(""),
    [validity, setValidity] = useState(""),
    [paymentMethod, setPaymentMethod] = useState(""),
    [page, setPage] = useState(1),
    [revision, setRevision] = useState(0),
    [modal, setModal] = useState(null),
    [notice, setNotice] = useState(""),
    [report, setReport] = useState(false);
  const resource = useAdminResource(
      couponListPath({ search: query, status, validity, paymentMethod, page }),
      revision,
    ),
    me = useAdminResource("/api/admin/me"),
    paymentResource = useAdminResource("/api/payments/methods"),
    account = me.data?.data,
    canManage =
      account?.isSuperAdmin === true ||
      account?.permissions?.some((p) =>
        ["catalog.manage", "coupons.manage"].includes(p),
      ),
    canReport =
      account?.isSuperAdmin === true ||
      account?.permissions?.some((p) =>
        ["reports.view", "accounting.view"].includes(p),
      ),
    valid =
      resource.data && !Array.isArray(resource.data.data)
        ? { ...resource, error: new Error("رد قائمة الكوبونات غير صالح.") }
        : resource,
    rows = Array.isArray(resource.data?.data) ? resource.data.data : [],
    metrics = resource.data?.meta?.metrics,
    total = resource.data?.meta?.total,
    pages = Math.max(1, Math.ceil(Number(total || 0) / 3));
  let methods = [],
    methodError = null;
  if (paymentResource.data) {
    try {
      methods = couponMethods(paymentResource.data);
    } catch (e) {
      methodError = e;
    }
  }
  const methodsResource = methodError
      ? { ...paymentResource, error: methodError }
      : paymentResource,
    paymentLabels = Object.fromEntries(methods.map((m) => [m.code, m.label]));
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    if (total != null && page > pages) setPage(pages);
  }, [total, page, pages]);
  useEffect(() => {
    const home = () => {
      setReport(false);
      setRevision((n) => n + 1);
    };
    window.addEventListener("mypart:coupons-home", home);
    return () => window.removeEventListener("mypart:coupons-home", home);
  }, []);
  function saved() {
    setRevision((n) => n + 1);
    setNotice(
      modal?.type === "delete"
        ? "تم حذف الكوبون وتأكيده من الخادم."
        : "تم حفظ الكوبون وتأكيده من الخادم.",
    );
    if (["add", "duplicate"].includes(modal?.type)) {
      setSearch("");
      setQuery("");
      setStatus("");
      setValidity("");
      setPaymentMethod("");
      setPage(1);
    }
  }
  async function copy(code) {
    try {
      await navigator.clipboard.writeText(code);
      setNotice("تم نسخ كود الكوبون.");
    } catch {
      setNotice("تعذر النسخ؛ الكود: " + code);
    }
  }
  return (
    <div className="admin-page coupons-page">
      {notice && (
        <div className="coupon-api-notice" role="status">
          {notice}
          <button aria-label="إغلاق الرسالة" onClick={() => setNotice("")}>
            ×
          </button>
        </div>
      )}
      <ResourceState resource={me} onLogin={onSessionExpired} />
      <ResourceState resource={methodsResource} onLogin={onSessionExpired} />
      {report ? (
        <CouponUsage
          onBack={() => setReport(false)}
          onSessionExpired={onSessionExpired}
        />
      ) : (
        <>
          <div className="pricing-heading">
            <h1>كوبونات الخصم</h1>
            <div className="coupon-heading-actions">
              <button className="pricing-back" onClick={resource.reload}>
                <RefreshCw size={15} />
                تحديث
              </button>
              <button
                className="pricing-back"
                disabled={!canReport}
                onClick={() => setReport(true)}
              >
                <ChartNoAxesCombined size={15} />
                تقرير الاستخدام
              </button>
              <button
                className="pricing-primary"
                disabled={!canManage}
                onClick={() => setModal({ type: "add" })}
              >
                <Plus size={16} />
                إضافة كوبون
              </button>
            </div>
          </div>
          <section className="coupon-statistics">
            {[
              [metrics?.total_coupons, "إجمالي الكوبونات", "blue", Ticket],
              [metrics?.total_uses, "إجمالي الاستخدامات", "purple", Users],
              [
                metrics?.total_discount_value,
                "إجمالي الخصوم",
                "pink",
                FileText,
                true,
              ],
              [
                metrics?.average_discount_per_use,
                "متوسط الخصم لكل استخدام",
                "yellow",
                Coins,
                true,
              ],
            ].map(([v, label, color, I, money]) => (
              <div className={"coupon-stat " + color} key={label}>
                <span className="stat-icon">
                  <I size={19} />
                </span>
                <b>{money ? <Money value={v} /> : number(v)}</b>
                <span>{label}</span>
              </div>
            ))}
          </section>
          {metrics && (
            <div className="coupon-overview">
              <span>كوبونات مفعلة: {number(metrics.active_coupons)}</span>
              <span>صالحة للاستخدام: {number(metrics.valid_coupons)}</span>
              <span>
                طلبات استخدمت كوبون: {number(metrics.orders_with_coupon)}
              </span>
            </div>
          )}
          <section className="coupon-list-card">
            <div className="coupon-list-toolbar">
              <label className="admin-search">
                <Search size={17} />
                <input
                  aria-label="البحث في الكوبونات"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="البحث بالكود أو وصف الكوبون..."
                />
              </label>
              <select
                aria-label="حالة تفعيل الكوبونات"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">كل حالات التفعيل</option>
                <option value="active">مفعل</option>
                <option value="inactive">متوقف</option>
              </select>
              <select
                aria-label="صلاحية الكوبونات"
                value={validity}
                onChange={(e) => {
                  setValidity(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">كل حالات الصلاحية</option>
                <option value="valid">الصالحة للاستخدام</option>
              </select>
              <select
                aria-label="وسيلة دفع الكوبونات"
                disabled={methodsResource.loading || !!methodsResource.error}
                value={paymentMethod}
                onChange={(e) => {
                  setPaymentMethod(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">جميع وسائل الدفع</option>
                {methods.map(({ code: value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <ResourceState resource={valid} onLogin={onSessionExpired} />
            {rows.map((c) => {
              const uses = c.used_count == null ? null : Number(c.used_count),
                max = c.max_uses == null ? null : Number(c.max_uses),
                remaining =
                  max != null && uses != null ? Math.max(0, max - uses) : null,
                progress =
                  max > 0 && uses != null
                    ? Math.max(0, Math.min(100, (uses / max) * 100))
                    : null,
                used = uses > 0 || Number(c.orders_count) > 0;
              return (
                <article className="coupon-card" key={c.id}>
                  <div className="coupon-card-top">
                    <div className="coupon-code">
                      <b>{c.code}</b>
                      <small>
                        خصم{" "}
                        {c.discount_type === "percentage" ? (
                          number(c.value) + "%"
                        ) : (
                          <Money value={c.value} />
                        )}
                      </small>
                    </div>
                    <div className="coupon-info">
                      <div className="coupon-tags">
                        <span className={c.is_active ? "enabled" : "disabled"}>
                          {c.is_active ? "مفعل" : "متوقف"}
                        </span>
                        <span>{couponStates[c.state] || c.state || "—"}</span>
                        {Array.isArray(c.payment_methods) &&
                        c.payment_methods.length ? (
                          c.payment_methods.map((method) => (
                            <span key={method}>
                              {paymentLabels[method] || method}
                            </span>
                          ))
                        ) : (
                          <span>جميع وسائل الدفع</span>
                        )}
                      </div>
                      <h3>{c.description || "بدون وصف"}</h3>
                      <div className="coupon-meta">
                        <span>
                          أقصى خصم:{" "}
                          {c.max_discount == null ? (
                            "بدون حد"
                          ) : (
                            <Money value={c.max_discount} />
                          )}
                        </span>
                        <span>
                          الحد الأدنى:{" "}
                          {c.min_order_value == null ? (
                            "بدون حد"
                          ) : (
                            <Money value={c.min_order_value} />
                          )}
                        </span>
                        <span>
                          يبدأ:{" "}
                          {c.starts_at
                            ? cartDate(c.starts_at)
                            : "بدون تاريخ بداية"}
                        </span>
                        <span>
                          ينتهي:{" "}
                          {c.expires_at
                            ? cartDate(c.expires_at)
                            : "بدون انتهاء"}
                        </span>
                      </div>
                    </div>
                    <div className="coupon-actions">
                      <label className="coupon-card-switch">
                        <input
                          type="checkbox"
                          aria-label={"تفعيل " + c.code}
                          checked={c.is_active === true}
                          disabled={!canManage}
                          onChange={() =>
                            setModal({ type: "status", coupon: c })
                          }
                        />
                        <span className="toggle-track">
                          <i />
                        </span>
                      </label>
                      <button
                        aria-label={"نسخ كود " + c.code}
                        title="نسخ الكود"
                        onClick={() => copy(c.code)}
                      >
                        <Copy size={15} />
                      </button>
                      <button
                        className="coupon-edit"
                        aria-label={"تكرار كوبون " + c.code}
                        title="إنشاء نسخة بكود جديد"
                        disabled={!canManage}
                        onClick={() =>
                          setModal({ type: "duplicate", coupon: c })
                        }
                      >
                        <CopyPlus size={15} />
                      </button>
                      <button
                        className="coupon-edit"
                        aria-label={"تعديل " + c.code}
                        disabled={!canManage}
                        onClick={() => setModal({ type: "edit", coupon: c })}
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        className="pricing-delete"
                        aria-label={"حذف " + c.code}
                        disabled={!canManage || used}
                        title={
                          used
                            ? "الكوبون مستخدم؛ يمكن إيقافه بدل الحذف"
                            : "حذف الكوبون"
                        }
                        onClick={() => setModal({ type: "delete", coupon: c })}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                  <div className="coupon-card-bottom">
                    <span>
                      <Users size={15} /> {number(c.used_count)} استخدام
                    </span>
                    <span className="coupon-saved">
                      <Coins size={15} /> <Money value={c.total_discount} />{" "}
                      خصومات
                    </span>
                    <span>الطلبات: {number(c.orders_count)}</span>
                    <span>
                      {max == null
                        ? "استخدامات غير محدودة"
                        : remaining == null
                          ? "المتبقي غير متاح"
                          : number(remaining) + " متبقي"}
                    </span>
                    {progress != null && (
                      <div className="coupon-progress">
                        <div>
                          <i style={{ width: progress + "%" }} />
                        </div>
                        <span>{number(progress)}%</span>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
            {!valid.loading && !valid.error && !rows.length && (
              <p className="pricing-empty">لا توجد كوبونات تطابق البحث.</p>
            )}
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
              <span>الإجمالي: {number(total)}</span>
            </div>
          </section>
        </>
      )}
      {["add", "edit", "duplicate"].includes(modal?.type) && (
        <CouponForm
          coupon={modal.coupon}
          duplicate={modal.type === "duplicate"}
          methods={methods}
          methodsResource={methodsResource}
          onSessionExpired={onSessionExpired}
          onClose={() => setModal(null)}
          onSaved={saved}
        />
      )}{" "}
      {["status", "delete"].includes(modal?.type) && (
        <CouponAction
          type={modal.type}
          coupon={modal.coupon}
          onClose={() => setModal(null)}
          onSaved={saved}
        />
      )}
    </div>
  );
}
