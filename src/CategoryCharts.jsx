import React from "react";
const n = (value) =>
  Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
const format = (value) =>
  Number(value).toLocaleString("en-US", { maximumFractionDigits: 1 });
export function CategoryTrend({ series }) {
  if (!series.length)
    return (
      <p className="cm-api-muted">لا توجد بيانات للرسم خلال الفترة المحددة.</p>
    );
  const maxOrders = Math.max(1, ...series.map((r) => n(r.ordersCount))),
    maxRevenue = Math.max(1, ...series.map((r) => n(r.netRevenue))),
    x = (i) => 55 + (i * 490) / Math.max(1, series.length - 1),
    y = (v, max) => 265 - (n(v) / max) * 215;
  return (
    <>
      <svg
        className="ca-trend"
        viewBox="0 0 600 330"
        role="img"
        aria-label="اتجاه الطلبات وصافي الإيراد من الخادم"
      >
        <text x="55" y="20" fontSize="11" fill="#195bea">
          الطلبات
        </text>
        <text x="545" y="20" textAnchor="end" fontSize="11" fill="#ed9d22">
          صافي الإيراد (ريال)
        </text>
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line
              x1="55"
              x2="545"
              y1={265 - f * 215}
              y2={265 - f * 215}
              stroke="#e8effb"
            />
            <text
              x="44"
              y={269 - f * 215}
              textAnchor="end"
              fontSize="10"
              fill="#195bea"
            >
              {format(f * maxOrders)}
            </text>
            <text x="552" y={269 - f * 215} fontSize="10" fill="#ed9d22">
              {format(f * maxRevenue)}
            </text>
          </g>
        ))}
        <polyline
          points={series
            .map((r, i) => `${x(i)},${y(r.ordersCount, maxOrders)}`)
            .join(" ")}
          fill="none"
          stroke="#195bea"
          strokeWidth="3"
        />
        <polyline
          points={series
            .map((r, i) => `${x(i)},${y(r.netRevenue, maxRevenue)}`)
            .join(" ")}
          fill="none"
          stroke="#ed9d22"
          strokeWidth="3"
        />
        {series.map((r, i) => (
          <g key={i}>
            <circle
              cx={x(i)}
              cy={y(r.ordersCount, maxOrders)}
              r="3"
              fill="#195bea"
            >
              <title>
                {r.period}: {format(n(r.ordersCount))} طلب
              </title>
            </circle>
            <circle
              cx={x(i)}
              cy={y(r.netRevenue, maxRevenue)}
              r="3"
              fill="#ed9d22"
            >
              <title>
                {r.period}: {format(n(r.netRevenue))} ريال
              </title>
            </circle>
            {(series.length <= 8 || i % Math.ceil(series.length / 8) === 0) && (
              <text
                x={x(i)}
                y="295"
                textAnchor="middle"
                fontSize="9"
                fill="#91a4c7"
              >
                {r.period}
              </text>
            )}
          </g>
        ))}
      </svg>
      <div className="ca-legend">
        <span>
          <i />
          الطلبات — المحور الأيسر
        </span>
        <span>
          <i style={{ background: "#ed9d22" }} />
          صافي الإيراد — المحور الأيمن
        </span>
      </div>
    </>
  );
}
export function CategoryMonthly({ series }) {
  if (!series.length)
    return <p className="cm-api-muted">لا توجد بيانات شهرية متاحة.</p>;
  const max = Math.max(
      1,
      ...series.flatMap((r) => [n(r.ordersCount), n(r.pricingRequests)]),
    ),
    step = 500 / series.length,
    w = Math.min(18, step * 0.25);
  return (
    <>
      <svg
        className="ca-trend"
        viewBox="0 0 600 330"
        role="img"
        aria-label="مقارنة الطلبات والتسعيرات الشهرية"
      >
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line
              x1="50"
              x2="550"
              y1={270 - f * 220}
              y2={270 - f * 220}
              stroke="#e8effb"
            />
            <text
              x="40"
              y={274 - f * 220}
              fontSize="10"
              textAnchor="end"
              fill="#91a4c7"
            >
              {format(max * f)}
            </text>
          </g>
        ))}
        {series.map((r, i) => (
          <g key={i}>
            <rect
              x={50 + i * step + step / 2 - w - 2}
              y={270 - (n(r.ordersCount) / max) * 220}
              width={w}
              height={(n(r.ordersCount) / max) * 220}
              fill="#195bea"
              rx="2"
            >
              <title>
                {r.month}: {format(n(r.ordersCount))} طلب
              </title>
            </rect>
            <rect
              x={50 + i * step + step / 2 + 2}
              y={270 - (n(r.pricingRequests) / max) * 220}
              width={w}
              height={(n(r.pricingRequests) / max) * 220}
              fill="#fbc018"
              rx="2"
            >
              <title>
                {r.month}: {format(n(r.pricingRequests))} تسعير
              </title>
            </rect>
            <text
              x={50 + i * step + step / 2}
              y="300"
              textAnchor="middle"
              fontSize="9"
              fill="#91a4c7"
            >
              {r.month}
            </text>
          </g>
        ))}
      </svg>
      <div className="ca-legend">
        <span>
          <i />
          طلبات
        </span>
        <span>
          <i style={{ background: "#fbc018" }} />
          تسعيرات
        </span>
      </div>
    </>
  );
}
