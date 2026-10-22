import { adminRequest, queryString } from "./admin-api";
export const ticketPath = (id) =>
  "/api/support-tickets/admin/" + encodeURIComponent(id);
export const ticketStatuses = {
  open: ["جديد", "orange"],
  in_progress: ["تحت المعالجة", "blue"],
  resolved: ["تم الحل", "green"],
  closed: ["مغلق", "green"],
};
export const ticketPriorities = {
  low: "منخفضة",
  normal: "عادية",
  high: "عالية",
  urgent: "عاجلة",
};
export const supportNumber = (value) =>
  value == null || value === "" ? "—" : Number(value).toLocaleString("en-US");
export const supportDate = (value) =>
  value && !Number.isNaN(Date.parse(value))
    ? new Date(value).toLocaleString("ar-EG", {
        timeZone: "Asia/Riyadh",
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";
export function ticketsPath({
  search = "",
  status = "",
  priority = "",
  source = "",
  category = "",
  from = "",
  to = "",
  page = 1,
} = {}) {
  return (
    "/api/support-tickets/admin?" +
    queryString({
      search: search.trim(),
      status,
      priority,
      source,
      category,
      from,
      to,
      limit: 7,
      offset: (page - 1) * 7,
    })
  );
}
export function ticketReplyBody(text, attachments = []) {
  const body = text.trim();
  if (!body) throw new Error("اكتب نص الرد.");
  const urls = attachments.map((item) =>
    typeof item === "string" ? item : item.url,
  );
  if (
    urls.some((url) => {
      try {
        const parsed = new URL(url);
        return (
          parsed.protocol !== "https:" ||
          parsed.hostname !== "res.cloudinary.com"
        );
      } catch {
        return true;
      }
    })
  )
    throw new Error("ارفع صور المرفقات على المنصة قبل الإرسال.");
  return { body, attachments: urls };
}
export function ticketStatusBody(status) {
  if (!Object.hasOwn(ticketStatuses, status))
    throw new Error("اختر حالة تذكرة صحيحة.");
  return { status };
}
export async function readTicket(id) {
  const response = await adminRequest(ticketPath(id));
  if (response.data?.id !== id || !Array.isArray(response.data.messages))
    throw new Error("رد تفاصيل التذكرة غير صالح.");
  return response.data;
}
export function attachmentRows(items = []) {
  if (!Array.isArray(items)) return [];
  return items.flatMap((item, i) => {
    const url = typeof item === "string" ? item : item?.url || item?.secure_url;
    if (typeof url !== "string") return [];
    try {
      if (new URL(url).protocol !== "https:") return [];
    } catch {
      return [];
    }
    return [
      {
        url,
        name:
          (typeof item === "object" &&
            (item.name || item.fileName || item.original_filename)) ||
          "مرفق " + (i + 1),
        image:
          /\.(jpe?g|png|webp|gif|avif)(?:[?#]|$)/i.test(url) ||
          item?.type?.startsWith("image/"),
      },
    ];
  });
}
export function verifyTicketReply(row, id, expected) {
  const message = row.messages.find((m) => m.id === id);
  if (!message || message.is_staff !== true || message.body !== expected.body)
    throw new Error(
      "الرد لم يظهر بنفس البيانات في المحادثة. حدّث التذكرة للتأكيد.",
    );
  const actual = attachmentRows(message.attachments).map((a) => a.url);
  if (
    actual.length !== expected.attachments.length ||
    expected.attachments.some((url) => !actual.includes(url))
  )
    throw new Error("مرفقات الرد لم تظهر كاملة. حدّث التذكرة للتأكيد.");
}
