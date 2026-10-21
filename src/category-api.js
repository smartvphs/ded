import { adminRequest, queryString } from "./admin-api";
export const categoryKinds = {
  1: "parts",
  2: "oil",
  3: "tires",
  4: "used",
  5: "services",
  6: "accessories",
};
export const brandKinds = {
  parts: "parts",
  used: "parts",
  oil: "oils",
  tires: "tires",
  accessories: "accessories",
};
export const categoryName = (row) =>
  row?.name_ar || row?.name_en || row?.name || "—";
export const isActive = (row) => (row?.is_active ?? row?.isActive) !== false;
export function arrayData(payload) {
  if (!Array.isArray(payload?.data))
    throw new Error("رد القائمة من الخادم غير صالح.");
  return payload.data;
}
export async function catalogRows(path, signal) {
  const rows = [],
    seen = new Set();
  let offset = 0,
    first;
  const paginated =
    /^\/api\/(categories\/admin|cars\/admin\/(makes|variants))(\?|$)/.test(
      path,
    );
  while (true) {
    const response = await adminRequest(
      paginated
        ? path +
            (path.includes("?") ? "&" : "?") +
            queryString({ limit: 100, offset })
        : path,
      { signal },
    );
    if (!first) first = response;
    const page = arrayData(response);
    if (
      path.startsWith("/api/catalog-fields") &&
      page.some((field) => !Array.isArray(field.options))
    )
      throw new Error("رد حقول المواصفات غير صالح.");
    for (const row of page) {
      if (!row?.id || seen.has(row.id))
        throw new Error("تعذر التأكد من اكتمال القائمة. أعد التحميل.");
      seen.add(row.id);
      rows.push(row);
    }
    offset += page.length;
    const total = response.meta?.total;
    if (
      !paginated ||
      (total != null ? offset >= Number(total) : page.length < 100)
    )
      return { ...first, data: rows };
    if (!page.length || offset >= 20000)
      throw new Error("تعذر تحميل القائمة كاملة.");
  }
}
export function variantBody(draft) {
  const yearFrom = Number(draft.yearFrom),
    yearTo = Number(draft.yearTo);
  if (
    !draft.yearFrom ||
    !draft.yearTo ||
    !Number.isInteger(yearFrom) ||
    !Number.isInteger(yearTo) ||
    yearFrom < 1950 ||
    yearTo > 2100 ||
    yearFrom > yearTo
  )
    throw new Error(
      "اختر سنوات صحيحة من 1950 إلى 2100، وسنة البداية لا تتجاوز النهاية.",
    );
  return {
    yearFrom,
    yearTo,
    trim: draft.trim?.trim() || null,
    engine: draft.engine?.trim() || null,
    transmission: draft.transmission?.trim() || null,
  };
}
export function optionBody(draft, field) {
  const value = draft.value?.trim();
  if (!value) throw new Error("أدخل قيمة الاختيار.");
  if (field.valueType === "number" && !Number.isFinite(Number(value)))
    throw new Error("هذا الحقل يقبل أرقامًا فقط.");
  return {
    value,
    labelAr: draft.labelAr?.trim() || value,
    labelEn: draft.labelEn?.trim() || null,
    imageUrl: draft.image || null,
    sortOrder: sortValue(draft.sortOrder),
  };
}
export function sortValue(value) {
  if (value === "" || value == null) return 0;
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 0)
    throw new Error("الترتيب لازم يكون عددًا صحيحًا موجبًا أو صفرًا.");
  return n;
}
export function linkedYears(rows) {
  const keys = new Set();
  for (const r of rows) {
    const a = Number(r.year_from),
      b = Number(r.year_to);
    if (
      !r.model_id ||
      !Number.isInteger(a) ||
      !Number.isInteger(b) ||
      a < 1950 ||
      b > 2100 ||
      a > b
    )
      continue;
    for (let y = a; y <= b; y++) keys.add(r.model_id + ":" + y);
  }
  return keys.size;
}

export function confirmCatalogSave(type, row, body) {
  if (!row) throw new Error("لم يظهر العنصر المحفوظ في القائمة.");
  const keys =
    type === "option" || type === "field"
      ? {}
      : {
          nameAr: "name_ar",
          nameEn: "name_en",
          iconUrl: "icon_url",
          logoUrl: "logo_url",
          descriptionEn: "description_en",
          sortOrder: "sort_order",
          parentId: "parent_id",
          isComingSoon: "is_coming_soon",
          yearFrom: "year_from",
          yearTo: "year_to",
        };
  for (const [key, expected] of Object.entries(body || {})) {
    const actual = row[keys[key] || key];
    const matches =
      expected == null
        ? actual == null
        : typeof expected === "number"
          ? actual != null && Number(actual) === expected
          : actual === expected;
    if (!matches)
      throw new Error(
        "تم إرسال الحفظ، لكن بعض البيانات لم ترجع بنفس القيم. حدّث القائمة وراجعها قبل إعادة الإضافة.",
      );
  }
}
