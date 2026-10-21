import { adminRequest, queryString } from "./admin-api";
export const pricingStatuses = {
  pending_payment: ["بانتظار الدفع", "orange"],
  pending_admin_review: ["تحتاج إضافة", "orange"],
  products_added: ["جاهز للإرسال", "blue"],
  open: ["في التسعير", "purple"],
  quoted: ["تم التسعير", "green"],
  closed: ["مغلق", "green"],
  cancelled: ["ملغي", "red"],
  expired: ["منتهي", "orange"],
};
export const pricingTypes = { free: "مجاني", normal: "عادي", express: "سريع" };
export function pricingParams({
  filters = {},
  search = "",
  page = 1,
  limit = 8,
} = {}) {
  return {
    limit,
    offset: (page - 1) * limit,
    search: search.trim() || undefined,
    makeId: filters.company || undefined,
    status: filters.status || undefined,
    pricingType: filters.type || undefined,
    ...(filters.date ? { from: filters.date, to: filters.date } : {}),
  };
}
export function quoteBody(offers, deliveryDays) {
  const rows = offers.filter(
    (o) => o.quality || o.price !== "" || o.notes?.trim(),
  );
  if (
    !rows.length ||
    rows.some(
      (o) =>
        !o.quality ||
        o.price === "" ||
        !Number.isFinite(Number(o.price)) ||
        Number(o.price) <= 0,
    )
  )
    throw new Error(
      "حدد الجودة وسعرًا أكبر من صفر لكل عرض، أو احذف الصف الفارغ.",
    );
  const days = Number(deliveryDays);
  if (deliveryDays === "" || !Number.isSafeInteger(days) || days < 0)
    throw new Error("أدخل مدة توصيل صحيحة بالأيام.");
  return {
    offers: rows.map((o) => ({
      qualityTier: o.quality,
      price: Number(o.price),
      notes: o.notes?.trim() || "",
    })),
    deliveryDays: days,
  };
}
export async function allPricingRows(params) {
  const result = [],
    seen = new Set();
  let offset = 0;
  while (true) {
    const response = await adminRequest(
      "/api/pricing-requests/admin?" +
        queryString({ ...params, limit: 100, offset }),
    );
    if (!Array.isArray(response.data))
      throw new Error("رد قائمة طلبات التسعير غير صالح.");
    const total = response.meta?.total;
    if (total != null && Number(total) > 10000)
      throw new Error("النتائج أكثر من 10,000 طلب؛ حدّد الفلاتر قبل التصدير.");
    for (const row of response.data) {
      if (!row?.id || seen.has(row.id))
        throw new Error("تعذر تأكيد باقي صفحات التصدير. أعد المحاولة.");
      seen.add(row.id);
      result.push(row);
    }
    offset += response.data.length;
    if (total != null ? offset >= Number(total) : response.data.length < 100)
      return result;
    if (!response.data.length || result.length >= 10000)
      throw new Error("تعذر تحميل كل النتائج. حدّد الفلاتر وأعد المحاولة.");
  }
}
