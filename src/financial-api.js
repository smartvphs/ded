import { adminRequest, queryString } from "./admin-api";
export function financialPeriod(from, to) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(from) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(to) ||
    !Number.isFinite(Date.parse(from)) ||
    !Number.isFinite(Date.parse(to)) ||
    new Date(from).toISOString().slice(0, 10) !== from ||
    new Date(to).toISOString().slice(0, 10) !== to
  )
    throw new Error("حدد بداية الفترة ونهايتها بتواريخ صحيحة.");
  const days = (Date.parse(to) - Date.parse(from)) / 86400000 + 1;
  if (days < 1) throw new Error("بداية الفترة لازم تكون قبل نهايتها.");
  if (days > 366) throw new Error("أقصى فترة للتقرير سنة واحدة.");
  return { from, to };
}
export const financialPath = (report, period, groupBy) =>
  "/api/admin/reports/" +
  report +
  "?" +
  queryString({ ...period, ...(groupBy ? { groupBy } : {}) });
export function validateFinancialReport(response, kind, period) {
  const data = response?.data;
  if (!data || typeof data !== "object" || Array.isArray(data))
    throw new Error("رد التقرير غير صالح.");
  if (data.period?.from !== period.from || data.period?.to !== period.to)
    throw new Error(
      "التقرير رجع بفترة مختلفة عن الفترة المطلوبة. حدّث البيانات.",
    );
  const obj = (x) => x && typeof x === "object" && !Array.isArray(x);
  if (
    kind === "financial" &&
    !["revenue", "pricingFees", "suppliers", "profit"].every((key) =>
      obj(data[key]),
    )
  )
    throw new Error("تفاصيل التقرير المالي غير مكتملة.");
  if (kind === "performance" && !obj(data.kpis))
    throw new Error("مؤشرات الأداء غير مكتملة.");
  if (
    kind === "pricing-parts" &&
    !["priced", "unpriced", "confirmed"].every(
      (key) =>
        obj(data[key]?.totals) &&
        Array.isArray(data[key]?.items) &&
        data[key].items.every(obj),
    )
  )
    throw new Error("جداول القطع غير مكتملة.");
  if (
    kind === "sales" &&
    (!Array.isArray(data.series) ||
      !data.series.every((row) => obj(row) && typeof row.period === "string"))
  )
    throw new Error("بيانات اتجاه المبيعات غير صالحة.");
  return data;
}
export const financialValue = (v) =>
  v == null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v);
export function partAverage(row) {
  const value = financialValue(row.value),
    pieces = financialValue(row.pieces);
  return value !== null && pieces > 0 ? value / pieces : null;
}
export function financialTrend(series) {
  return series
    .map((row) => ({
      ...row,
      netRevenue: financialValue(row.netRevenue),
      ordersCount: financialValue(row.ordersCount),
    }))
    .sort((a, b) => a.period.localeCompare(b.period));
}
export async function exportFinancial(period) {
  const blob = await adminRequest(
    "/api/admin/reports/financial/export?" + queryString(period),
    { responseType: "csv" },
  );
  if (!blob.size) throw new Error("ملف التقرير فارغ.");
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = "financial-" + period.from + "-" + period.to + ".csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
