import { adminRequest } from "./admin-api";
export const customerStatuses = {
  active: ["نشط", "green"],
  inactive: ["غير نشط", "red"],
  blocked: ["محظور", "red"],
  deleted: ["محذوف", "red"],
};
export const customerPath = (id) =>
  "/api/admin/customers/" + encodeURIComponent(id);
export function customerBody(draft, editing = false, original) {
  const name = draft.name.trim(),
    email = draft.email.trim();
  if (name.length < 2 || name.length > 150)
    throw new Error("اسم العميل من حرفين إلى 150 حرفًا.");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error("أدخل بريدًا إلكترونيًا صحيحًا.");
  const body = { name, email: email || null };
  if (!editing) {
    const phone = draft.phone.replace(/[\s()-]/g, "");
    if (!/^(05\d{8}|\+9665\d{8})$/.test(phone))
      throw new Error("أدخل جوالًا سعوديًا مثل 05XXXXXXXX أو +9665XXXXXXXX.");
    body.phone = phone.startsWith("05") ? "+966" + phone.slice(1) : phone;
  }
  if (editing) {
    if (
      Object.hasOwn(draft, "avatarUrl") &&
      (!original || (draft.avatarUrl || null) !== (original.avatar_url || null))
    ) {
      const avatar = draft.avatarUrl || null;
      if (avatar) {
        let url;
        try {
          url = new URL(avatar);
        } catch {
          throw new Error("رابط صورة العميل غير صالح.");
        }
        if (url.protocol !== "https:" || url.hostname !== "res.cloudinary.com")
          throw new Error("اختر صورة مرفوعة على المنصة.");
      }
      body.avatarUrl = avatar;
    }
    if (
      Object.hasOwn(draft, "notes") &&
      (!original || (draft.notes || "") !== (original.admin_notes || ""))
    ) {
      if (draft.notes != null && draft.notes.length > 1000)
        throw new Error("ملاحظات الإدارة بحد أقصى 1000 حرف.");
      body.notes = draft.notes?.trim() ? draft.notes : null;
    }
  }
  return body;
}
export function creditBody(amount, reason) {
  const n = Number(amount);
  if (
    amount === "" ||
    !Number.isFinite(n) ||
    n <= 0 ||
    Math.abs(n * 100 - Math.round(n * 100)) > 1e-6
  )
    throw new Error("أدخل مبلغًا أكبر من صفر بحد أقصى منزلتين عشريتين.");
  if (!reason.trim()) throw new Error("أدخل سبب إضافة الرصيد.");
  return { amount: n, reason: reason.trim() };
}
export function cashbackBody(value, limits = {}) {
  const n = value === null ? null : Number(value);
  if (
    value !== null &&
    (String(value).trim() === "" || !Number.isFinite(n) || n < 0 || n > 100)
  )
    throw new Error("أدخل نسبة كاش باك من 0 إلى 100.");
  const body = { cashbackPercent: n };
  for (const key of ["minOrderValue", "maxCashback"])
    if (Object.hasOwn(limits, key)) {
      const v = limits[key];
      if (v == null || String(v).trim() === "") {
        body[key] = null;
        continue;
      }
      const amount = Number(v);
      if (
        !Number.isFinite(amount) ||
        amount < 0 ||
        Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-6
      )
        throw new Error(
          "حدود الكاش باك لازم تكون صفر أو أكبر وبحد أقصى منزلتين عشريتين.",
        );
      body[key] = amount;
    }
  return body;
}
export function verifyCashback(row, body) {
  for (const [key, field] of [
    ["cashbackPercent", "cashback_percent"],
    ["minOrderValue", "cashback_min_order"],
    ["maxCashback", "cashback_max_amount"],
  ])
    if (Object.hasOwn(body, key)) {
      const expected = body[key],
        actual = row[field];
      if (
        expected === null
          ? actual !== null
          : actual == null || Number(actual) !== expected
      )
        throw new Error(
          "بعض إعدادات الكاش باك لم ترجع بالقيم المحفوظة. حدّث البيانات.",
        );
    }
}
export const customerNextStatus = (client) =>
  client.status === "blocked" ? "active" : "blocked";
export function customerVehicleBody(draft) {
  const year = Number(draft.year);
  if (!draft.makeId || !draft.modelId)
    throw new Error("اختر شركة العربية والموديل.");
  if (!draft.year || !Number.isInteger(year) || year < 1950 || year > 2100)
    throw new Error("أدخل سنة صحيحة من 1950 إلى 2100.");
  return {
    makeId: draft.makeId,
    modelId: draft.modelId,
    year,
    ...Object.fromEntries(
      ["vin", "plateNo", "trim", "engine", "transmission"]
        .filter((k) => draft[k]?.trim())
        .map((k) => [k, draft[k].trim()]),
    ),
    isDefault: Boolean(draft.isDefault),
  };
}
export async function readCustomer(id) {
  const result = await adminRequest(customerPath(id));
  if (result.data?.id !== id) throw new Error("رد تفاصيل العميل غير صالح.");
  return result.data;
}
export function validateCustomerSave(row, body) {
  for (const [key, value] of Object.entries(body)) {
    const field = { avatarUrl: "avatar_url", notes: "admin_notes" }[key] || key;
    if (["avatarUrl", "notes"].includes(key) && !Object.hasOwn(row, field))
      throw new Error("رد العميل لم يرجع الصورة أو ملاحظات الإدارة للتأكيد.");
    const actual = row[field];
    if (
      (key === "notes" ? actual || null : (actual ?? null)) !== (value ?? null)
    )
      throw new Error(
        "لم يرجع العميل بنفس البيانات المحفوظة. حدّث التفاصيل قبل إعادة الحفظ.",
      );
  }
}

export async function exportCustomers(params) {
  const blob = await adminRequest(
    "/api/admin/customers/export?" +
      new URLSearchParams(
        Object.entries(params).filter(
          ([, v]) => v !== undefined && v !== null && v !== "",
        ),
      ),
    { responseType: "csv" },
  );
  if (!blob.size) throw new Error("ملف التصدير فارغ.");
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = "customers.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
