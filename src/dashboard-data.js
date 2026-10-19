export const number = value => value === null || value === undefined || value === '' || !Number.isFinite(Number(value)) ? '—' : Number(value).toLocaleString('en-US', {maximumFractionDigits: 2});
export const asNumber = value => Number.isFinite(Number(value)) ? Number(value) : 0;
export function periodQuery(period, now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {timeZone: 'Asia/Riyadh', year: 'numeric', month: '2-digit', day: '2-digit'}).formatToParts(now).map(p => [p.type, p.value]));
  const end = new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00Z`);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - ({week: 6, month: 29, year: 364}[period] ?? 29));
  return {from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10), groupBy: period === 'year' ? 'month' : 'day'};
}
export function chartRows(data) {
  const rows = new Map();
  for (const row of data.salesTrend?.series || []) rows.set(row.period, {...row});
  for (const row of data.pricingTrend?.series || []) rows.set(row.period, {...rows.get(row.period), ...row});
  return [...rows.values()].sort((a, b) => a.period.localeCompare(b.period));
}
export function monthlyPricing(series = []) {
  const buckets = new Map();
  for (const row of series) {
    const period = row.period.slice(0, 7) + '-01';
    const bucket = buckets.get(period) || {period, newRequests: 0, quotedRequests: 0, confirmedRequests: 0};
    for (const key of ['newRequests', 'quotedRequests', 'confirmedRequests']) bucket[key] += asNumber(row[key]);
    buckets.set(period, bucket);
  }
  return [...buckets.values()].sort((a, b) => a.period.localeCompare(b.period));
}
export const orderStatuses = {pending: 'جديد', confirmed: 'مؤكد', shipped: 'تم الشحن', delivered: 'مكتمل', cancelled: 'ملغي'};
export const pricingStatuses = {pending_payment: 'بانتظار الدفع', pending_admin_review: 'تحتاج إضافة', products_added: 'تمت إضافة المنتجات', open: 'في التسعير', quoted: 'تم التسعير', closed: 'مغلق', cancelled: 'ملغي', expired: 'منتهي'};
export function ordersQuery(view, partType, offset = 0) {
  return {
    path: view === 'latest' ? '/api/orders/all' : '/api/pricing-requests/admin',
    params: {limit: 5, offset, ...(partType ? {partType} : {}),
      ...(view === 'missing' ? {statuses: 'pending_admin_review,products_added'} : {}),
      ...(view === 'suppliers' ? {statuses: 'open,quoted'} : {}),
      ...(view === 'confirmed' ? {hasAccepted: true} : {})},
  };
}
