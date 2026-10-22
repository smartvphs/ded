import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const source = (
  await readFile(new URL("../src/financial-api.js", import.meta.url), "utf8")
).replace(
  /import\s+\{[^}]+\}\s+from\s+['"]\.\/admin-api['"];?/,
  `const adminRequest=()=>{};const queryString=v=>new URLSearchParams(Object.entries(v).filter(([,x])=>x!==undefined&&x!==null&&x!=='')).toString();`,
);
const {
  financialPeriod,
  financialPath,
  validateFinancialReport,
  partAverage,
  financialTrend,
  financialValue,
} = await import(
  "data:text/javascript;base64," + Buffer.from(source).toString("base64")
);
test("financial periods are valid inclusive dates and never exceed the report limit", () => {
  assert.deepEqual(financialPeriod("2026-10-22", "2026-10-22"), {
    from: "2026-10-22",
    to: "2026-10-22",
  });
  assert.throws(() => financialPeriod("2026-10-23", "2026-10-22"));
  assert.throws(() => financialPeriod("2026-02-30", "2026-03-01"));
  assert.throws(() => financialPeriod("2025-01-01", "2026-10-22"));
  const p = new URL(
    financialPath(
      "performance",
      { from: "2026-10-01", to: "2026-10-22" },
      "month",
    ),
    "https://test.local",
  );
  assert.equal(p.searchParams.get("groupBy"), "month");
  assert.equal(p.searchParams.get("to"), "2026-10-22");
});
test("report readback refuses mismatched periods and malformed sections", () => {
  const period = { from: "2026-10-01", to: "2026-10-22" },
    data = { period, revenue: {}, pricingFees: {}, profit: {}, suppliers: {} };
  assert.equal(validateFinancialReport({ data }, "financial", period), data);
  assert.throws(() =>
    validateFinancialReport(
      { data: { ...data, period: { ...period, from: "2026-09-01" } } },
      "financial",
      period,
    ),
  );
  assert.throws(() =>
    validateFinancialReport(
      { data: { period, series: [null] } },
      "sales",
      period,
    ),
  );
  assert.throws(() =>
    validateFinancialReport(
      { data: { period, priced: { items: [] } } },
      "pricing-parts",
      period,
    ),
  );
});
test("parts mean price uses actual pieces rather than request count and missing values are not zero", () => {
  assert.equal(
    partAverage({
      value: "300.00",
      pieces: 6,
      partsCount: 2,
      requestsCount: 1,
    }),
    50,
  );
  assert.equal(partAverage({ value: "0.00", pieces: 2 }), 0);
  assert.equal(partAverage({ value: null, pieces: 6 }), null);
  assert.equal(partAverage({ value: "300", pieces: 0 }), null);
  assert.equal(financialValue(null), null);
  assert.equal(financialValue("0"), 0);
});
test("financial chart preserves negative net revenue and gaps instead of clamping or fabricating zeros", () => {
  const rows = financialTrend([
    { period: "2026-10-03", netRevenue: "0", ordersCount: 0 },
    { period: "2026-10-01", netRevenue: "-150", ordersCount: 1 },
    { period: "2026-10-02", netRevenue: null, ordersCount: null },
  ]);
  assert.equal(rows[0].netRevenue, -150);
  assert.equal(rows[1].netRevenue, null);
  assert.equal(rows[2].netRevenue, 0);
});
