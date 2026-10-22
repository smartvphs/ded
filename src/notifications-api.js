export const notificationTypes = {
  order: "الطلبات",
  pricing: "طلبات التسعير",
  offer: "العروض",
  promo: "العروض الترويجية",
  system: "النظام",
};
export function readNotifications(payload) {
  const data = payload?.data,
    meta = payload?.meta;
  if (
    !Array.isArray(data?.items) ||
    !Number.isInteger(data.unreadCount) ||
    data.unreadCount < 0 ||
    !Number.isInteger(meta?.total) ||
    meta.total < 0 ||
    data.items.some((x) => !x?.id || typeof x.is_read !== "boolean")
  )
    throw new Error("رد الإشعارات غير مكتمل. أعد تحميل الصفحة.");
  return { items: data.items, unread: data.unreadCount, total: meta.total };
}
export function notificationTarget(item) {
  const link = item?.link;
  if (
    link?.entity === "products" &&
    Array.isArray(link.ids) &&
    link.ids.some((x) => typeof x === "string" && x)
  )
    return {
      entity: "products",
      ids: [...new Set(link.ids.filter((x) => typeof x === "string" && x))],
    };
  if (
    [
      "order",
      "return",
      "pricing_request",
      "contact_message",
      "ticket",
      "price_list",
      "service",
      "supplier",
    ].includes(link?.entity) &&
    typeof link.id === "string" &&
    link.id
  )
    return { entity: link.entity, id: link.id };
  return null;
}
export function notificationTime(input) {
  const date = new Date(input);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("ar-EG", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Riyadh",
      }).format(date);
}
