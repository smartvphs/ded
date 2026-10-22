import { adminRequest } from "./admin-api";
export const customerStatuses = {
  active: ["نشط", "green"],
  inactive: ["غير نشط", "red"],
  blocked: ["محظور", "red"],
  deleted: ["محذوف", "red"],
};
export const customerPath = (id) =>
  "/api/admin/customers/" + encodeURIComponent(id);
export function customerBody(draft, editing = false) {
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
export function cashbackBody(value) {
  const n = Number(value);
  if (String(value).trim() === "" || !Number.isFinite(n) || n < 0 || n > 100)
    throw new Error("أدخل نسبة كاش باك من 0 إلى 100.");
  return { cashbackPercent: n };
}
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
    if ((row[key] ?? null) !== (value ?? null))
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
