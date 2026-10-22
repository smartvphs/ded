import React from "react";
import { Money } from "./orders-ui";
import { number } from "./dashboard-data";
import { financialTrend } from "./financial-api";
function segments(rows, key, x, y) {
  const groups = [];
  let current = [];
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][key] === null) {
      if (current.length) groups.push(current.join(" "));
      current = [];
    } else current.push(x(i) + "," + y(rows[i][key]));
  }
  if (current.length) groups.push(current.join(" "));
  return groups;
}
export default function FinancialTrend({ series }) {
  const rows = financialTrend(series);
  if (!rows.length)
    return (
      <p className="finance-api-note">لا توجد بيانات للرسم خلال الفترة.</p>
    );
  const revenues = rows.map((r) => r.netRevenue).filter((v) => v !== null),
    min = Math.min(0, ...revenues),
    max = Math.max(0, ...revenues),
    range = max - min || 1,
    countMax = Math.max(1, ...rows.map((r) => r.ordersCount ?? 0)),
    x = (i) => 60 + (i * 500) / Math.max(1, rows.length - 1),
    moneyY = (v) => 260 - ((v - min) / range) * 210,
    countY = (v) => 260 - (v / countMax) * 210;
  return (
    <>
      <svg
        className="finance-trend"
        viewBox="0 0 640 330"
        role="img"
        aria-label="اتجاه صافي الإيرادات والطلبات"
      >
        <text x="55" y="20" fontSize="10" fill="#195bea">
          الطلبات
        </text>
        <text x="550" y="20" textAnchor="end" fontSize="10" fill="#e69b16">
          صافي الإيرادات (ريال)
        </text>
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line
              x1="60"
              x2="560"
              y1={260 - f * 210}
              y2={260 - f * 210}
              stroke="#e7edf8"
            />
            <text
              x="50"
              y={264 - f * 210}
              textAnchor="end"
              fontSize="9"
              fill="#195bea"
            >
              {number(f * countMax)}
            </text>
            <text x="570" y={264 - f * 210} fontSize="9" fill="#b88720">
              {number(min + range * f)}
            </text>
          </g>
        ))}
        <line
          x1="60"
          x2="560"
          y1={moneyY(0)}
          y2={moneyY(0)}
          stroke="#cbd7ed"
          strokeDasharray="4 4"
        />
        {[
          ["ordersCount", "#195bea", countY],
          ["netRevenue", "#e69b16", moneyY],
        ].map(([key, color, y]) => (
          <g key={key}>
            {segments(rows, key, x, y).map((points, i) => (
              <polyline
                key={i}
                points={points}
                fill="none"
                stroke={color}
                strokeWidth="2.5"
              />
            ))}
            {rows.map((row, i) =>
              row[key] === null ? null : (
                <circle
                  key={row.period}
                  cx={x(i)}
                  cy={y(row[key])}
                  r="3"
                  fill={color}
                >
                  <title>
                    {row.period} ·{" "}
                    {key === "netRevenue" ? "صافي الإيرادات" : "الطلبات"}:{" "}
                    {number(row[key])}
                  </title>
                </circle>
              ),
            )}
          </g>
        ))}
        {rows.map(
          (row, i) =>
            (i % Math.max(1, Math.ceil(rows.length / 7)) === 0 ||
              i === rows.length - 1) && (
              <text
                key={row.period}
                x={x(i)}
                y="300"
                textAnchor="middle"
                fontSize="9"
                fill="#8ba1c6"
              >
                {row.period}
              </text>
            ),
        )}
      </svg>
      <details className="finance-trend-details">
        <summary>عرض أرقام الرسم</summary>
        <div className="finance-table-scroll">
          <table className="finance-table">
            <thead>
              <tr>
                <th>الفترة</th>
                <th>الطلبات</th>
                <th>صافي الإيرادات</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.period}>
                  <td>{row.period}</td>
                  <td>{number(row.ordersCount)}</td>
                  <td>
                    <Money value={row.netRevenue} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}
