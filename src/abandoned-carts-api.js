import { queryString } from "./admin-api";
export const abandonedCartPath = (id) =>
  "/api/admin/abandoned-carts/" + encodeURIComponent(id);
export const cartNumber = (value) =>
  value == null || value === "" || !Number.isFinite(Number(value))
    ? "—"
    : Number(value).toLocaleString("en-US", { maximumFractionDigits: 2 });
export function cartDate(value) {
  return value && !Number.isNaN(Date.parse(value))
    ? new Date(value).toLocaleString("ar-EG", {
        timeZone: "Asia/Riyadh",
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";
}
export const reminderLabels = {
  ready: "جاهزة للتذكير",
  not_abandoned: "لم تتجاوز ٢٤ ساعة",
  already_reminded: "تم التذكير",
};
export const skipLabels = {
  not_found: "السلة غير موجودة",
  not_abandoned: "السلة لم تتجاوز ٢٤ ساعة",
  already_reminded: "سبق إرسال تذكير بدون إضافة جديدة",
};
export function cartsListPath({
  search = "",
  idleHours = 24,
  sort = "last_activity",
  order = "desc",
  page = 1,
} = {}) {
  return (
    "/api/admin/abandoned-carts?" +
    queryString({
      search: search.trim() || undefined,
      idleHours,
      sort,
      order,
      limit: 7,
      offset: (page - 1) * 7,
    })
  );
}
export function cartReminderBody({ ids, message = "", bulk = false }) {
  const userIds = [...new Set(ids)];
  if (
    !userIds.length ||
    userIds.length > 100 ||
    userIds.some((id) => typeof id !== "string" || !id)
  )
    throw new Error("حدد من سلة واحدة إلى 100 سلة.");
  if (bulk) return { userIds };
  if (userIds.length !== 1) throw new Error("التذكير الفردي محتاج سلة واحدة.");
  const text = message.trim();
  if (text && (text.length < 5 || text.length > 300))
    throw new Error("نص التذكير من 5 إلى 300 حرف.");
  return text ? { message: text } : {};
}
export function validateReminderResult(data, ids, bulk = false) {
  if (!bulk) {
    if (!data?.reminderId || data.userId !== ids[0] || !data.sentAt)
      throw new Error(
        "الخادم لم يرجع تأكيد إرسال صالحًا. حدّث السلة قبل تكرار الإرسال.",
      );
    return { sent: [data], skipped: [] };
  }
  if (!Array.isArray(data?.sent) || !Array.isArray(data?.skipped))
    throw new Error(
      "رد الإرسال الجماعي غير مكتمل. حدّث السلات قبل تكرار الإرسال.",
    );
  const rows = [...data.sent, ...data.skipped],
    seen = new Set(rows.map((r) => r.userId));
  if (
    seen.size !== ids.length ||
    rows.length !== ids.length ||
    ids.some((id) => !seen.has(id)) ||
    data.sent.some((r) => !r.reminderId || !r.sentAt) ||
    data.skipped.some((r) => !r.reason) ||
    data.sentCount !== data.sent.length ||
    data.skippedCount !== data.skipped.length
  )
    throw new Error(
      "لم يرجع الخادم نتيجة واضحة لكل السلات المحددة. حدّث البيانات قبل تكرار الإرسال.",
    );
  return { sent: data.sent, skipped: data.skipped };
}
