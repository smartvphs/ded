import React, { useState } from "react";
import useAdminResource from "./use-admin-resource";
import { queryString } from "./admin-api";
import { ResourceState, Money, dateText } from "./orders-ui";
import { number } from "./dashboard-data";
export default function CouponUsage({ onBack, onSessionExpired }) {
  const [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [period, setPeriod] = useState({}),
    [error, setError] = useState(""),
    resource = useAdminResource(
      "/api/admin/reports/coupons?" + queryString(period),
    ),
    data = resource.data?.data,
    valid =
      data && !Array.isArray(data.items)
        ? {
            ...resource,
            error: new Error("رد تقرير استخدام الكوبونات غير صالح."),
          }
        : resource;
  function apply(e) {
    e.preventDefault();
    if (!!from !== !!to) {
      setError("حدد بداية الفترة ونهايتها مع بعض.");
      return;
    }
    if (from && to && from > to) {
      setError("بداية الفترة لازم تكون قبل نهايتها.");
      return;
    }
    if (from && (Date.parse(to) - Date.parse(from)) / 86400000 > 366) {
      setError("أقصى فترة للتقرير سنة واحدة.");
      return;
    }
    setError("");
    setPeriod({ from: from || undefined, to: to || undefined });
  }
  return (
    <section className="coupon-usage">
      <div className="pricing-heading">
        <h1>تقرير استخدام الكوبونات</h1>
        <button className="pricing-back" onClick={onBack}>
          رجوع للكوبونات
        </button>
      </div>
      <form className="coupon-report-filters" onSubmit={apply}>
        <label className="coupon-field">
          <span>من تاريخ (السعودية)</span>
          <input
            type="date"
            aria-label="تقرير الكوبونات من تاريخ"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label className="coupon-field">
          <span>إلى تاريخ (السعودية)</span>
          <input
            type="date"
            aria-label="تقرير الكوبونات إلى تاريخ"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <button className="pricing-primary">عرض التقرير</button>
      </form>
      {error && (
        <p role="alert" className="coupon-api-error">
          {error}
        </p>
      )}
      <ResourceState resource={valid} onLogin={onSessionExpired} />
      {data && !valid.error && (
        <>
          <p className="coupon-api-note">
            الفترة: {dateText(data.period?.from)} — {dateText(data.period?.to)}
          </p>
          <div className="coupon-usage-totals">
            <span>كوبونات مستخدمة: {number(data.totals?.couponsUsed)}</span>
            <span>الطلبات: {number(data.totals?.ordersCount)}</span>
            <span>
              إجمالي الخصم: <Money value={data.totals?.discountTotal} />
            </span>
            <span>
              المبيعات: <Money value={data.totals?.grossSales} />
            </span>
          </div>
          <div className="pricing-table-scroll">
            <table className="coupon-report-table">
              <thead>
                <tr>
                  {[
                    "الكود",
                    "نوع الخصم",
                    "الطلبات",
                    "العملاء",
                    "إجمالي الخصم",
                    "المبيعات",
                  ].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.items.map((row) => (
                  <tr key={row.couponId}>
                    <td dir="ltr">{row.code}</td>
                    <td>
                      {row.discountType === "percentage"
                        ? "نسبة مئوية"
                        : row.discountType === "fixed"
                          ? "قيمة ثابتة"
                          : row.discountType || "—"}
                    </td>
                    <td>{number(row.ordersCount)}</td>
                    <td>{number(row.customersCount)}</td>
                    <td>
                      <Money value={row.discountTotal} />
                    </td>
                    <td>
                      <Money value={row.grossSales} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data.items.length && (
              <p className="pricing-empty">
                لا توجد استخدامات كوبونات خلال الفترة.
              </p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
