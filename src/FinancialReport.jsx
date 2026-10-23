import MissingCosts from "./MissingCosts";
import React, { useState } from "react";
import {
  Coins,
  TrendingUp,
  FileText,
  ShieldCheck,
  Clock,
  Wallet,
  CheckCircle2,
  RefreshCw,
  Download,
} from "lucide-react";
import useAdminResource from "./use-admin-resource";
import { ResourceState, Money, dateText } from "./orders-ui";
import { number, periodQuery } from "./dashboard-data";
import { useMutation, Feedback } from "./ProductExtras";
import {
  financialPeriod,
  financialPath,
  validateFinancialReport,
  partAverage,
  exportFinancial,
} from "./financial-api";
import FinancialTrend from "./FinancialTrend";
import "./financial-report.css";
function checked(resource, kind, period) {
  if (!resource.data) return { ...resource, report: null };
  try {
    return {
      ...resource,
      report: validateFinancialReport(resource.data, kind, period),
    };
  } catch (error) {
    return { ...resource, error, report: null };
  }
}
function PartsTable({ title, data, resource, onSessionExpired, Icon, color }) {
  return (
    <section className="finance-table-card">
      <div className="finance-table-title">
        <span style={{ color }}>
          <Icon size={25} />
        </span>
        <div>
          <h2>{title}</h2>
          <p>
            إجمالي {number(data?.totals?.pieces)} قطعة ·{" "}
            {number(data?.totals?.partsCount)} بند ·{" "}
            <Money value={data?.totals?.value} />
          </p>
        </div>
      </div>
      <ResourceState resource={resource} onLogin={onSessionExpired} />
      {data && (
        <div className="finance-table-scroll">
          <table className="finance-table">
            <thead>
              <tr>
                {["عدد القطع", "التفاصيل", "القيمة", "الجودة"].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.items.map((row, i) => (
                <tr key={(row.quality || "unspecified") + "-" + i}>
                  <td>{number(row.pieces)} قطعة</td>
                  <td className="finance-average">
                    <span>
                      {number(row.partsCount)} بند · {number(row.requestsCount)}{" "}
                      طلب
                    </span>
                    <span>
                      متوسط سعر القطعة <Money value={partAverage(row)} />
                    </span>
                  </td>
                  <td>
                    <Money value={row.value} />
                  </td>
                  <td>
                    <span
                      className={
                        "finance-quality " +
                        ["green", "purple", "blue", "yellow"][i % 4]
                      }
                    >
                      {row.qualityLabel || row.quality || "غير محدد"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.items.length && (
            <p className="finance-api-note">لا توجد قطع خلال الفترة.</p>
          )}
        </div>
      )}
    </section>
  );
}
function Breakdown({ title, data, fields, extra }) {
  return (
    <section className="finance-breakdown">
      <h2>{title}</h2>
      <dl>
        {fields.map(([key, label, count]) => (
          <div key={key}>
            <dt>{label}</dt>
            <dd>
              {count ? number(data?.[key]) : <Money value={data?.[key]} />}
            </dd>
          </div>
        ))}
        {extra}
      </dl>
    </section>
  );
}
export default function FinancialReport({ onSessionExpired }) {
  const [period, setPeriod] = useState(() => {
      const { from, to } = periodQuery("month");
      return { from, to };
    }),
    [draft, setDraft] = useState(period),
    [preset, setPreset] = useState("month"),
    [groupBy, setGroupBy] = useState("day"),
    [revision, setRevision] = useState(0),
    [error, setError] = useState(""),
    exporting = useMutation();
  const financial = checked(
      useAdminResource(financialPath("financial", period), revision),
      "financial",
      period,
    ),
    performance = checked(
      useAdminResource(financialPath("performance", period, groupBy), revision),
      "performance",
      period,
    ),
    parts = checked(
      useAdminResource(financialPath("pricing-parts", period), revision),
      "pricing-parts",
      period,
    ),
    sales = checked(
      useAdminResource(financialPath("sales", period, groupBy), revision),
      "sales",
      period,
    ),
    me = useAdminResource("/api/admin/me"),
    f = financial.report,
    k = performance.report?.kpis,
    priced = parts.report,
    account = me.data?.data,
    canExport =
      account?.isSuperAdmin === true ||
      (account?.permissions?.includes("data.export") &&
        account.permissions.some((p) =>
          ["reports.view", "accounting.view"].includes(p),
        )),
    partial =
      k?.profit?.isPartial === true ||
      Number(f?.profit?.unknownMarginSales) > 0;
  function apply(e) {
    e.preventDefault();
    try {
      const next = financialPeriod(draft.from, draft.to);
      setPeriod(next);
      setPreset("custom");
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }
  function choose(value) {
    setPreset(value);
    if (value === "custom") return;
    const next = periodQuery(value);
    setPeriod({ from: next.from, to: next.to });
    setDraft({ from: next.from, to: next.to });
    setGroupBy(next.groupBy);
    setError("");
  }
  return (
    <div className="finance-content">
      <div className="finance-heading">
        <h1>تقرير الأداء والأرباح</h1>
        <div>
          <button
            className="pricing-back"
            onClick={() => setRevision((n) => n + 1)}
          >
            <RefreshCw size={15} />
            تحديث
          </button>
          <button
            className="pricing-export"
            disabled={
              !canExport ||
              exporting.busy ||
              financial.loading ||
              !!financial.error ||
              !f
            }
            onClick={() => exporting.run(() => exportFinancial(period))}
          >
            <Download size={15} />
            تصدير التقرير CSV
          </button>
        </div>
      </div>
      <section className="finance-filters">
        <label>
          الفترة
          <select
            aria-label="فترة التقرير المالي"
            value={preset}
            onChange={(e) => choose(e.target.value)}
          >
            <option value="week">آخر ٧ أيام</option>
            <option value="month">آخر ٣٠ يومًا</option>
            <option value="year">آخر سنة</option>
            <option value="custom">فترة مخصصة</option>
          </select>
        </label>
        <form onSubmit={apply}>
          <label>
            من تاريخ
            <input
              type="date"
              aria-label="التقرير المالي من تاريخ"
              value={draft.from}
              onChange={(e) => {
                setPreset("custom");
                setDraft((old) => ({ ...old, from: e.target.value }));
              }}
              required
            />
          </label>
          <label>
            إلى تاريخ
            <input
              type="date"
              aria-label="التقرير المالي إلى تاريخ"
              value={draft.to}
              onChange={(e) => {
                setPreset("custom");
                setDraft((old) => ({ ...old, to: e.target.value }));
              }}
              required
            />
          </label>
          <button className="pricing-primary">تطبيق الفترة</button>
        </form>
        <label>
          تجميع الرسم
          <select
            aria-label="تجميع التقرير المالي"
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
          >
            <option value="day">يومي</option>
            <option value="week">أسبوعي</option>
            <option value="month">شهري</option>
          </select>
        </label>
      </section>
      {error && (
        <p className="finance-api-error" role="alert">
          {error}
        </p>
      )}
      <p className="finance-api-note">
        الفترة المعروضة: {dateText(period.from)} — {dateText(period.to)}، بتوقيت
        السعودية. التواريخ المعدّلة بتتطبق بعد الضغط على «تطبيق الفترة».
      </p>
      <ResourceState resource={me} onLogin={onSessionExpired} />
      <Feedback mutation={exporting} />
      <ResourceState resource={financial} onLogin={onSessionExpired} />
      <ResourceState resource={performance} onLogin={onSessionExpired} />
      {partial && (
        <div className="finance-partial" role="note">
          <b>الربح المعروض جزئي.</b> محسوب للمبيعات اللي تكلفتها مسجلة؛ المبيعات
          اللي تكلفتها غير معروفة بقيمة{" "}
          <Money
            value={
              f?.profit?.unknownMarginSales ?? k?.profit?.unknownMarginSales
            }
          />{" "}
          مش داخلة في الربح.
        </div>
      )}
      <MissingCosts
        key={period.from + period.to}
        period={period}
        account={account}
        onSessionExpired={onSessionExpired}
        onChanged={() => setRevision((n) => n + 1)}
      />
      <section className="finance-balances">
        {[
          [f?.revenue?.grossSales, "إجمالي المبيعات", "blue", Coins],
          [f?.revenue?.netRevenue, "صافي الإيرادات", "green", TrendingUp],
          [k?.profit?.amount, "صافي الربح المحسوب", "teal", TrendingUp],
          [f?.suppliers?.commissions, "عمولات الموردين", "yellow", Wallet],
          [f?.pricingFees?.paid, "رسوم التسعير المحصلة", "purple", FileText],
        ].map(([value, label, color, I]) => (
          <div className={"finance-balance " + color} key={label}>
            <span className="stat-icon">
              <I size={18} />
            </span>
            <b>
              <Money value={value} />
            </b>
            <span>{label}</span>
          </div>
        ))}
      </section>
      {k && (
        <p className="finance-api-note">
          الطلبات: {number(k.orders?.total)} · النشطة:{" "}
          {number(k.orders?.active)} · المكتملة: {number(k.orders?.completed)} ·
          التسعيرات المؤكدة: {number(k.pricingRequests?.confirmed)} · الموردون
          المعتمدون حاليًا: {number(k.activeCompanies?.count)}
        </p>
      )}
      <h2 className="finance-section-title">إحصائيات التسعيرات</h2>
      <section className="finance-pricing-stats">
        {[
          [
            k?.pricingRequests?.total,
            "إجمالي طلبات التسعير",
            f?.pricingFees?.paid,
            "رسوم محصلة",
            "blue",
            FileText,
          ],
          [
            k?.pricingRequests?.quoted,
            "طلبات لها تسعيرات",
            priced?.priced?.totals?.value,
            "قيمة القطع المسعّرة",
            "green",
            ShieldCheck,
          ],
          [
            k?.pricingRequests?.awaitingQuote,
            "طلبات تحتاج تسعير",
            priced?.unpriced?.totals?.value,
            "قيمة القطع غير المسعّرة",
            "yellow",
            Clock,
          ],
        ].map(([count, label, value, caption, color, I]) => (
          <div className={"finance-pricing-stat " + color} key={label}>
            <span className="stat-icon">
              <I size={20} />
            </span>
            <b>{number(count)}</b>
            <span>{label}</span>
            <small>
              {caption} <Money value={value} />
            </small>
          </div>
        ))}
      </section>
      <div className="finance-table-grid">
        <PartsTable
          title="القطع المسعّرة"
          data={priced?.priced}
          resource={parts}
          onSessionExpired={onSessionExpired}
          Icon={Wallet}
          color="#16b655"
        />
        <PartsTable
          title="القطع غير المسعّرة"
          data={priced?.unpriced}
          resource={parts}
          onSessionExpired={onSessionExpired}
          Icon={Clock}
          color="#ff5b60"
        />
      </div>
      <PartsTable
        title="القطع المؤكدة"
        data={priced?.confirmed}
        resource={parts}
        onSessionExpired={onSessionExpired}
        Icon={CheckCircle2}
        color="#40a35a"
      />
      <section className="finance-sales">
        <h2>اتجاه الطلبات وصافي الإيرادات</h2>
        <ResourceState resource={sales} onLogin={onSessionExpired} />
        {sales.report && <FinancialTrend series={sales.report.series} />}
      </section>
      {f && (
        <div className="finance-breakdowns">
          <Breakdown
            title="تفاصيل المبيعات"
            data={f.revenue}
            fields={[
              ["ordersCount", "عدد الطلبات", true],
              ["grossSales", "إجمالي المبيعات"],
              ["itemsSubtotal", "قيمة المنتجات"],
              ["discounts", "الخصومات"],
              ["tax", "الضريبة"],
              ["shipping", "الشحن"],
              ["walletPaid", "المدفوع بالمحفظة"],
              ["cashbackGranted", "الكاش باك الممنوح"],
              ["refunds", "المبالغ المرتجعة"],
              ["refundsCount", "عدد المرتجعات", true],
              ["netRevenue", "صافي الإيرادات"],
              ["averageOrderValue", "متوسط قيمة الطلب"],
            ]}
          />
          <Breakdown
            title="تفاصيل الأرباح"
            data={f.profit}
            fields={[
              ["productMargin", "هامش المنتجات"],
              ["serviceMargin", "هامش الخدمات"],
              ["knownMarginSales", "مبيعات بتكلفة معروفة"],
              ["unknownMarginSales", "مبيعات بتكلفة غير معروفة"],
              ["allocatedDiscounts", "خصومات موزّعة على المبيعات المعروفة"],
              ["allocatedCashback", "كاش باك موزّع على المبيعات المعروفة"],
              ["returnedMargin", "هامش المرتجعات"],
              ["pricingFeesPaid", "رسوم التسعير"],
              ["supplierCommissions", "عمولات الموردين"],
              ["supplierPricingFees", "رسوم تسعير الموردين"],
              ["knownProfit", "الربح المعروف قبل رسوم الدفع"],
            ]}
            extra={
              <>
                <div>
                  <dt>رسوم الدفع المخصومة من الربح</dt>
                  <dd>
                    <Money value={k?.profit?.paymentFees} />
                  </dd>
                </div>
                <div>
                  <dt>صافي الربح المحسوب</dt>
                  <dd>
                    <Money value={k?.profit?.amount} />
                  </dd>
                </div>
              </>
            }
          />
          <Breakdown
            title="رسوم التسعير"
            data={f.pricingFees}
            fields={[
              ["paidCount", "عدد الرسوم المحصلة", true],
              ["paid", "الرسوم المحصلة"],
              ["refundedCount", "عدد الرسوم المستردة", true],
              ["refunded", "الرسوم المستردة"],
            ]}
          />
          <Breakdown
            title="مستحقات وعمولات الموردين"
            data={f.suppliers}
            fields={[
              ["commissions", "العمولات"],
              ["pricingFees", "رسوم التسعير"],
              ["deductions", "الخصومات"],
              ["adjustments", "التعديلات"],
              ["settlementsPaidCount", "عدد التسويات المدفوعة", true],
              ["settlementsPaid", "التسويات المدفوعة"],
            ]}
          />
        </div>
      )}
    </div>
  );
}
