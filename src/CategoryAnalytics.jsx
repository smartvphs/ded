import { CategoryTrend, CategoryMonthly } from "./CategoryCharts";
import React, { useState } from "react";
import { Package, Car, CalendarDays, Coins, TriangleAlert } from "lucide-react";
import useAdminResource from "./use-admin-resource";
import { ResourceState, Money } from "./orders-ui";
import { queryString } from "./admin-api";
import "./category-analytics.css";
const colors = [
  "#195bea",
  "#813cf3",
  "#07a673",
  "#f4ab18",
  "#df1677",
  "#cc6918",
];
const count = (n) =>
  n == null
    ? "—"
    : Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 });
const rows = (value) => (Array.isArray(value) ? value : []);
function Card({ title, children }) {
  return (
    <section className="ca-card">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
function Empty() {
  return (
    <p className="cm-api-muted">لا توجد بيانات متاحة خلال الفترة المحددة.</p>
  );
}
function Table({ heads, rows: items }) {
  return !items.length ? (
    <Empty />
  ) : (
    <div className="ca-table-scroll">
      <table className="ca-table">
        <thead>
          <tr>
            {heads.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>{cell ?? "—"}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function Ring({ items, label }) {
  const total = items.reduce((s, r) => s + (Number(r.value) || 0), 0);
  let start = 0;
  return total > 0 ? (
    <>
      <div className="ca-ring">
        <svg viewBox="0 0 240 240" role="img" aria-label={label}>
          <g transform="rotate(-90 120 120)">
            {items.map((item, i) => {
              const size = (Number(item.value) / total) * 100,
                offset = start;
              start += size;
              return (
                <circle
                  key={i}
                  cx="120"
                  cy="120"
                  r="83"
                  fill="none"
                  stroke={colors[i % colors.length]}
                  strokeWidth="37"
                  pathLength="100"
                  strokeDasharray={`${size} ${100 - size}`}
                  strokeDashoffset={-offset}
                />
              );
            })}
          </g>
        </svg>
        <div>
          <b>{count(total)}</b>
          <span>{label}</span>
        </div>
      </div>
      <div className="ca-legend">
        {items.map((item, i) => (
          <span key={i}>
            <i style={{ background: colors[i % colors.length] }} />
            {item.label} {count(item.value)}
          </span>
        ))}
      </div>
    </>
  ) : (
    <Empty />
  );
}
function Bars({ items, label }) {
  const max = Math.max(1, ...items.map((r) => Number(r.value) || 0));
  return items.length ? (
    <div className="ca-api-bars" aria-label={label}>
      {items.map((row, i) => (
        <div key={i}>
          <span>{row.label}</span>
          <i
            style={{
              width: (Math.max(0, Number(row.value) || 0) / max) * 100 + "%",
              background: colors[i % colors.length],
            }}
          />
          <b>{count(row.value)}</b>
        </div>
      ))}
    </div>
  ) : (
    <Empty />
  );
}
export default function CategoryAnalytics({ onSessionExpired }) {
  const [period, setPeriod] = useState("30"),
    [page, setPage] = useState(1),
    [search, setSearch] = useState(""),
    [sort, setSort] = useState("revenue");
  const to = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Riyadh",
    }),
    fromDate = new Date(to + "T00:00:00Z");
  fromDate.setUTCDate(fromDate.getUTCDate() - (Number(period) - 1));
  const from = fromDate.toISOString().slice(0, 10);
  const resource = useAdminResource(
    "/api/admin/reports/performance?" +
      queryString({
        from,
        to,
        groupBy: period === "365" ? "month" : "day",
        limit: 10,
        page,
        suppliersSort: sort,
      }),
  );
  const invalid =
    resource.data &&
    (!resource.data.data?.kpis || Array.isArray(resource.data.data.kpis));
  const data = invalid ? null : resource.data?.data,
    k = data?.kpis || {},
    cars = rows(data?.topCars?.items),
    categories = rows(data?.topCategories?.items),
    quality = rows(data?.partsQuality?.items),
    suppliers = rows(data?.suppliersPerformance?.items),
    pricing = rows(data?.insights?.metrics?.pricingByMake),
    years = rows(data?.topYears?.items);
  const makes = new Map();
  for (const car of cars) {
    const old = makes.get(car.makeId) || {
      label: car.makeNameAr || car.makeNameEn || "—",
      value: 0,
    };
    old.value += Number(car.pricingRequests) || 0;
    makes.set(car.makeId, old);
  }
  return (
    <div className="category-analytics">
      <div className="ca-period">
        <span className="cm-api-period">
          التقرير يشمل أداء المنصة بكل أقسامها
        </span>
        <select
          aria-label="فترة إحصائيات قطع الغيار"
          value={period}
          onChange={(e) => {
            setPeriod(e.target.value);
            setPage(1);
          }}
        >
          <option value="7">7 أيام</option>
          <option value="30">30 يومًا</option>
          <option value="365">سنة</option>
        </select>
      </div>
      <ResourceState
        resource={
          invalid
            ? { ...resource, error: new Error("رد تقرير الإحصائيات غير صالح.") }
            : resource
        }
        onLogin={onSessionExpired}
      />
      {data && (
        <>
          <p className="cm-api-period">
            من {data.period?.from || from} إلى {data.period?.to || to} — بتوقيت
            السعودية
          </p>
          <div className="ca-stats">
            {[
              [k.sales?.netRevenue, "صافي المبيعات", "blue", Coins, true],
              [k.orders?.total, "إجمالي الطلبات", "purple", Package],
              [
                k.pricingRequests?.total,
                "طلبات التسعير",
                "yellow",
                CalendarDays,
              ],
              [k.activeCompanies?.count, "الموردون المعتمدون", "pink", Car],
              [k.profit?.amount, "الأرباح المعروفة", "green", Coins, true],
            ].map(([v, label, color, Icon, money]) => (
              <div className={"ca-stat " + color} key={label}>
                <span className="stat-icon">
                  <Icon size={19} />
                </span>
                <b>
                  {v == null ? "—" : money ? <Money value={v} /> : count(v)}
                </b>
                <span>{label}</span>
              </div>
            ))}
          </div>
          {k.profit?.isPartial && (
            <p className="cm-api-notice">
              الأرباح جزئية؛ بعض المنتجات ليس لها تكلفة محفوظة.
            </p>
          )}
          <div className="ca-top-grid">
            <Card title="مسار الطلبات والإيرادات">
              <CategoryTrend series={rows(data.ordersRevenueTrend?.series)} />
            </Card>
            <Card title="الشركات الأكثر طلبًا للتسعير">
              <Ring items={[...makes.values()]} label="طلب تسعير" />
            </Card>
          </div>
          <div className="ca-three-grid">
            <Card title="السيارات الأكثر طلبًا">
              <div className="ca-top-cars">
                {cars.map((r, i) => (
                  <div key={i}>
                    <span>
                      <b>
                        {[
                          r.makeNameAr || r.makeNameEn,
                          r.modelNameAr || r.modelNameEn,
                        ]
                          .filter(Boolean)
                          .join(" ") || "—"}
                      </b>
                      <small>{count(r.ordersCount)} طلب شراء</small>
                    </span>
                    <strong>
                      {count(r.pricingRequests)}
                      <br />
                      تسعير
                    </strong>
                  </div>
                ))}
                {!cars.length && <Empty />}
              </div>
            </Card>
            <Card title="أكثر فئات القطع طلبًا">
              <Bars
                label="طلبات الشراء حسب الفئة"
                items={categories.map((r) => ({
                  label: r.nameAr || r.nameEn || "—",
                  value: r.ordersCount,
                }))}
              />
            </Card>
            <Card title="إحصائيات التسعير">
              <Ring
                label="طلب تسعير"
                items={[
                  {
                    label: "بانتظار تسعير",
                    value: k.pricingRequests?.awaitingQuote,
                  },
                  { label: "تم تسعيرها", value: k.pricingRequests?.quoted },
                  { label: "مؤكدة", value: k.pricingRequests?.confirmed },
                  { label: "حالات أخرى", value: k.pricingRequests?.other },
                ]}
              />
            </Card>
          </div>
          <div className="ca-pair-grid">
            <Card title="أداء الموردين">
              <div className="ca-api-tools">
                <input
                  className="ca-search"
                  aria-label="ابحث في أداء الموردين"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="بحث في الصفحة الحالية..."
                />
                <select
                  aria-label="ترتيب أداء الموردين"
                  value={sort}
                  onChange={(e) => {
                    setSort(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="revenue">الإيراد</option>
                  <option value="orders">الطلبات</option>
                  <option value="quotations">العروض</option>
                  <option value="products">المنتجات</option>
                </select>
              </div>
              <Table
                heads={[
                  "المورد",
                  "الطلبات",
                  "العروض",
                  "المنتجات النشطة",
                  "صافي الإيراد",
                ]}
                rows={suppliers
                  .filter((r) => (r.name || "").includes(search))
                  .map((r) => [
                    r.name,
                    count(r.ordersCount),
                    count(r.quotationsCount),
                    count(r.activeProducts),
                    r.netRevenue == null ? "—" : <Money value={r.netRevenue} />,
                  ])}
              />
              <div className="pricing-pagination">
                <button
                  disabled={page <= 1 || resource.loading}
                  onClick={() => setPage((n) => n - 1)}
                >
                  السابق
                </button>
                <span>{page}</span>
                <button
                  disabled={
                    resource.loading ||
                    (data.suppliersPerformance?.total != null
                      ? page * 10 >= Number(data.suppliersPerformance.total)
                      : suppliers.length < 10)
                  }
                  onClick={() => setPage((n) => n + 1)}
                >
                  التالي
                </button>
              </div>
            </Card>
            <Card title="تنبيهات ذكية">
              <div className="ca-alerts">
                {rows(data.insights?.items).map((r, i) => (
                  <div key={i}>
                    <TriangleAlert size={22} />
                    <div>
                      <b>{r.title || "تنبيه"}</b>
                      <p>{r.message || "—"}</p>
                    </div>
                  </div>
                ))}
                {!rows(data.insights?.items).length && <Empty />}
              </div>
              {rows(data.insights?.unavailable).map((r, i) => (
                <p className="cm-api-muted" key={i}>
                  {r.reason}
                </p>
              ))}
            </Card>
          </div>
          <div className="ca-pair-grid">
            <Card title="مقارنة شهرية">
              <CategoryMonthly series={rows(data.monthlyComparison?.series)} />
            </Card>
            <Card title="توزيع أنواع القطع">
              <Ring
                label="قطعة مطلوبة"
                items={rows(data.partsShare?.items).map((r) => ({
                  label: r.label || r.partType,
                  value: r.parts,
                }))}
              />
            </Card>
          </div>
          <div className="ca-pair-grid">
            <Card title="توزيع جودة القطع المطلوبة">
              <Ring
                label="طلب تسعير"
                items={quality.map((r) => ({
                  label: r.label || r.group,
                  value: r.pricingRequests,
                }))}
              />
              <Table
                heads={["الجودة", "الطلبات", "العروض", "وسيط السعر"]}
                rows={quality.map((r) => [
                  r.label || r.group,
                  count(r.ordersCount),
                  count(r.quotesCount),
                  r.medianPrice == null ? "—" : <Money value={r.medianPrice} />,
                ])}
              />
            </Card>
            <Card title="تفاصيل فئات القطع">
              <Table
                heads={[
                  "الفئة",
                  "الطلبات",
                  "التسعيرات",
                  "متوسط السعر",
                  "صافي الإيراد",
                ]}
                rows={categories.map((r) => [
                  r.nameAr || r.nameEn,
                  count(r.ordersCount),
                  count(r.pricingRequests),
                  r.averagePrice == null ? (
                    "—"
                  ) : (
                    <Money value={r.averagePrice} />
                  ),
                  r.netRevenue == null ? "—" : <Money value={r.netRevenue} />,
                ])}
              />
            </Card>
          </div>
          <div className="ca-pair-grid">
            <Card title="وقت الاستجابة للتسعير">
              <Table
                heads={["الشركة", "طلبات", "ردود", "متأخرة", "وسيط ساعات الرد"]}
                rows={pricing.map((r) => [
                  r.makeNameAr || r.makeNameEn,
                  count(r.requests),
                  count(r.responded),
                  count(r.late),
                  count(r.medianHoursToFirstResponse),
                ])}
              />
            </Card>
            <Card title="أكثر سنوات الصنع طلبًا">
              <Bars
                label="سنوات الصنع"
                items={years.map((r) => ({
                  label: r.year,
                  value: r.pricingRequests,
                }))}
              />
            </Card>
          </div>
          {data.dataQuality?.testData?.filtered === false && (
            <p className="cm-api-muted">
              التقرير قد يشمل بيانات الاختبار؛ الخادم لا يستبعدها.
            </p>
          )}
        </>
      )}
    </div>
  );
}
