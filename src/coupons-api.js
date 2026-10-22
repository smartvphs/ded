import { adminRequest, queryString } from "./admin-api";
export const couponPath = (id) => "/api/coupons/" + encodeURIComponent(id);
export const couponStates = {
  valid: "صالح للاستخدام",
  scheduled: "مجدول",
  expired: "منتهي",
  exhausted: "نفد عدد الاستخدامات",
  inactive: "متوقف",
};
export function couponMethods(payload) {
  const methods = payload?.data?.methods;
  if (
    !Array.isArray(methods) ||
    methods.some(
      (m) =>
        !m ||
        typeof m.code !== "string" ||
        !m.code ||
        typeof m.label !== "string",
    ) ||
    new Set(methods.map((m) => m.code)).size !== methods.length
  )
    throw new Error("رد وسائل الدفع غير صالح.");
  return methods;
}
const sameMethods = (a, b) =>
  (a == null && b == null) ||
  (Array.isArray(a) &&
    Array.isArray(b) &&
    new Set(a).size === new Set(b).size &&
    a.every((code) => b.includes(code)));
export function couponLocalTime(value) {
  if (!value || Number.isNaN(Date.parse(value))) return "";
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Riyadh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(value))
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}`;
}
function couponISO(value) {
  if (!value) return null;
  const normalized = value.length === 16 ? value + ":00" : value;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(normalized))
    throw new Error("أدخل تاريخًا ووقتًا صحيحين.");
  const d = new Date(normalized + "+03:00");
  if (
    Number.isNaN(d.getTime()) ||
    couponLocalTime(d.toISOString()) !== normalized
  )
    throw new Error("أدخل تاريخًا ووقتًا صحيحين.");
  return d.toISOString();
}
export function couponDraft(row) {
  return {
    code: row?.code || "",
    discountType: row?.discount_type || "percentage",
    value: row?.value ?? "",
    maxUses: row?.max_uses ?? "",
    minOrderValue: row?.min_order_value ?? "",
    startsAt: couponLocalTime(row?.starts_at),
    expiresAt: couponLocalTime(row?.expires_at),
    isActive: row?.is_active ?? true,
    maxDiscount: row?.max_discount ?? "",
    paymentMethods:
      row?.payment_methods == null ? null : [...row.payment_methods],
    description: row?.description ?? "",
  };
}
function amount(
  value,
  label,
  { nullable = false, integer = false, zero = false } = {},
) {
  if (value === "" || value == null) {
    if (nullable) return null;
    throw new Error("أدخل " + label + ".");
  }
  const n = Number(value);
  if (
    !Number.isFinite(n) ||
    (zero ? n < 0 : n <= 0) ||
    (integer
      ? !Number.isSafeInteger(n)
      : Math.abs(n * 100 - Math.round(n * 100)) > 0.000001)
  )
    throw new Error(
      "أدخل " +
        label +
        " صحيحة" +
        (integer ? " بدون كسور." : " بحد أقصى منزلتين عشريتين."),
    );
  return n;
}
export function couponBody(draft, original, methods) {
  const code = draft.code.trim();
  if (!code) throw new Error("أدخل كود الكوبون.");
  if (!["percentage", "fixed"].includes(draft.discountType))
    throw new Error("اختر نوع خصم صحيحًا.");
  const value = amount(draft.value, "قيمة الخصم");
  if (draft.discountType === "percentage" && value > 100)
    throw new Error("نسبة الخصم لا تتجاوز 100%.");
  const paymentMethods =
    draft.paymentMethods == null ? null : [...new Set(draft.paymentMethods)];
  if (
    paymentMethods &&
    (!paymentMethods.length ||
      paymentMethods.some(
        (code) =>
          typeof code !== "string" ||
          (methods &&
            !methods.some((m) => m.code === code) &&
            !original?.payment_methods?.includes(code)),
      ))
  )
    throw new Error("اختر وسائل دفع صحيحة من القائمة.");
  if (typeof draft.description !== "string")
    throw new Error("أدخل وصفًا صحيحًا للكوبون.");
  const body = {
    code,
    maxDiscount: amount(draft.maxDiscount, "أقصى خصم", {
      nullable: true,
      zero: true,
    }),
    paymentMethods,
    description: draft.description,
    discountType: draft.discountType,
    value,
    maxUses: amount(draft.maxUses, "حد الاستخدام", {
      nullable: true,
      integer: true,
    }),
    minOrderValue: amount(draft.minOrderValue, "الحد الأدنى للطلب", {
      nullable: true,
      zero: true,
    }),
    startsAt: couponISO(draft.startsAt),
    expiresAt: couponISO(draft.expiresAt),
    isActive: !!draft.isActive,
  };
  if (
    body.startsAt &&
    body.expiresAt &&
    Date.parse(body.startsAt) >= Date.parse(body.expiresAt)
  )
    throw new Error("بداية الكوبون لازم تكون قبل انتهائه.");
  if (!original)
    return Object.fromEntries(
      Object.entries(body).filter(([, value]) => value !== null),
    );
  const old = couponDraft(original),
    oldBody = {
      code: old.code.trim(),
      maxDiscount:
        original.max_discount == null ? null : Number(original.max_discount),
      paymentMethods: original.payment_methods ?? null,
      description: original.description ?? "",
      discountType: old.discountType,
      value: Number(old.value),
      maxUses: original.max_uses == null ? null : Number(original.max_uses),
      minOrderValue:
        original.min_order_value == null
          ? null
          : Number(original.min_order_value),
      isActive: old.isActive,
      startsAt: original.starts_at,
      expiresAt: original.expires_at,
    };
  return Object.fromEntries(
    Object.entries(body).filter(([key, value]) =>
      key === "paymentMethods"
        ? !sameMethods(value, oldBody.paymentMethods)
        : key === "startsAt" || key === "expiresAt"
          ? draft[key] !== old[key]
          : value !== oldBody[key],
    ),
  );
}
const savedFields = {
  code: "code",
  discountType: "discount_type",
  value: "value",
  maxUses: "max_uses",
  minOrderValue: "min_order_value",
  startsAt: "starts_at",
  expiresAt: "expires_at",
  isActive: "is_active",
  maxDiscount: "max_discount",
  paymentMethods: "payment_methods",
  description: "description",
};
export function verifyCoupon(row, expected) {
  if (!row)
    throw new Error("الكوبون لم يظهر في البيانات المحفوظة. حدّث القائمة.");
  for (const [key, value] of Object.entries(expected)) {
    if (
      ["maxDiscount", "paymentMethods", "description"].includes(key) &&
      !Object.hasOwn(row, savedFields[key])
    )
      throw new Error("رد الكوبون لم يرجع إعدادات الخصم والدفع للتأكيد.");
    const actual = row[savedFields[key]];
    const matches =
      key === "paymentMethods"
        ? sameMethods(actual, value)
        : key === "description"
          ? (actual ?? "") === value
          : ["startsAt", "expiresAt"].includes(key)
            ? value == null
              ? actual == null
              : Date.parse(actual) === Date.parse(value)
            : ["value", "maxUses", "minOrderValue", "maxDiscount"].includes(key)
              ? value == null
                ? actual == null
                : actual != null && Number(actual) === value
              : actual === value;
    if (!matches)
      throw new Error(
        "بعض بيانات الكوبون لم ترجع بالقيم المحفوظة. حدّث البيانات قبل المحاولة من جديد.",
      );
  }
}
export async function readCoupon(id, code) {
  const seen = new Set();
  let offset = 0;
  for (let i = 0; i < 100; i++) {
    const response = await adminRequest(
      "/api/coupons?" + queryString({ search: code, limit: 100, offset }),
    );
    if (!Array.isArray(response.data))
      throw new Error("رد قائمة الكوبونات غير صالح.");
    const row = response.data.find((r) => r.id === id);
    if (row) return row;
    for (const r of response.data) {
      if (seen.has(r.id))
        throw new Error("الخادم لم يرجع صفحات كوبونات مختلفة.");
      seen.add(r.id);
    }
    offset += response.data.length;
    if (
      response.data.length === 0 ||
      (response.meta?.total != null && offset >= Number(response.meta.total)) ||
      (response.meta?.total == null && response.data.length < 100)
    )
      return null;
  }
  throw new Error("تعذر تأكيد بيانات الكوبون بالكامل.");
}
export function couponListPath({
  search = "",
  status = "",
  validity = "",
  paymentMethod = "",
  page = 1,
} = {}) {
  return (
    "/api/coupons?" +
    queryString({
      search: search.trim(),
      status,
      validity,
      paymentMethod,
      limit: 3,
      offset: (page - 1) * 3,
    })
  );
}
