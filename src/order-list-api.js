import {adminRequest, queryString, ApiError} from './admin-api';
export function orderListParams({filters = {}, search = '', page = 1, tab = 'all', returns = false}) {
  const status = tab === 'new' ? 'pending' : filters.status;
  return {limit: returns ? 8 : 7, offset: (page - 1) * (returns ? 8 : 7), search: search || undefined,
    ...(status && !['partial', 'full'].includes(status) ? {status} : {}),
    ...(['partial', 'full'].includes(status) ? {returnStatus: status} : {}),
    ...(filters.date ? {from: filters.date, to: filters.date} : {}),
    ...(!returns ? {timezone: 'Asia/Riyadh', supplierId: filters.supplier || undefined, makeId: filters.makeId || undefined,
      paymentMethod: filters.payment || undefined, source: filters.source || undefined} : {})};
}
export async function supplierOptions(signal) {
  const rows = []; const seen = new Set(); let offset = 0;
  while (true) {
    const payload = await adminRequest('/api/suppliers/admin?' + queryString({limit: 100, offset}), {signal});
    const items = payload.data?.items;
    if (!Array.isArray(items)) throw new ApiError('تعذر قراءة قائمة الموردين من الخادم.', 0);
    for (const row of items) if (!seen.has(row.id)) {seen.add(row.id); rows.push(row);}
    offset += items.length;
    const total = payload.data.total ?? payload.meta?.total;
    if (total != null ? offset >= Number(total) : items.length < 100) return {success: true, data: rows};
    if (!items.length || rows.length < offset) throw new ApiError('تعذر تحميل باقي الموردين. أعد المحاولة.', 0);
  }
}
export function createOrderBody({userId, addressId, items, paymentMethod, couponCode, adminNotes}) {
  if (!userId || !addressId) throw new ApiError('اختر العميل وعنوان التوصيل أولًا.', 0);
  if (!items.length || items.some(i => !i.productId || !Number.isSafeInteger(Number(i.quantity)) || Number(i.quantity) < 1)) throw new ApiError('أضف منتجًا وحدد كمية صحيحة لكل منتج.', 0);
  return {userId, addressId, items: items.map(i => ({productId: i.productId, ...(i.variantId ? {variantId: i.variantId} : {}), quantity: Number(i.quantity)})),
    paymentMethod, ...(couponCode?.trim() ? {couponCode: couponCode.trim()} : {}), adminNotes: adminNotes?.trim() || ''};
}
