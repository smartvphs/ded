export const dayCodes = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const dayNames = [
  "الأحد",
  "الاثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];
export function siteRows(payload) {
  const data = payload?.data;
  if (
    !data ||
    !["contact", "workingHours", "pricingTypes"].every((k) =>
      Object.hasOwn(data, k),
    )
  )
    throw new Error("رد بيانات الموقع غير مكتمل.");
  const row = (key, label, value, type = "text") => ({
    key: "__site_" + key,
    label,
    value,
    type,
    updatedAt: data.updatedAt,
  });
  const c = data.contact || {};
  return [
    row(
      "phones",
      "أرقام التواصل",
      (c.phones || []).map((x) => x.number),
      "json",
    ),
    row(
      "emails",
      "البريد الإلكتروني",
      (c.emails || []).map((x) => x.email),
      "json",
    ),
    row("address", "العنوان", c.address || ""),
    row("warehouse", "المستودع", c.warehouse?.address || ""),
    row("location", "موقع التواصل", c.location || {}, "json"),
    row("warehouse_location", "موقع المستودع", c.warehouse || {}, "json"),
    ...Object.entries({
      instagram: "الانستجرام",
      x: "تويتر x",
      facebook: "فيس بوك",
      linkedin: "لينكد ان",
    }).map(([k, label]) => row(k, label, c.socials?.[k] || "")),
    row(
      "hours",
      "ساعات العمل",
      dayCodes.map((code, i) => {
        const d = data.workingHours?.days?.find((d) => d.day === code);
        return {
          day: dayNames[i],
          enabled: !!d?.isOpen,
          from: d?.from || "",
          to: d?.to || "",
        };
      }),
      "json",
    ),
    ...["free", "normal", "express"].map((key, i) =>
      row(
        "description_" + key,
        "نص توضيحي " + ["مجاني", "عادي", "سريع"][i],
        data.pricingTypes?.[key]?.description || "",
      ),
    ),
  ];
}
export function siteBody(data, values) {
  const result = {};
  const ensure = (k) => (result[k] ??= structuredClone(data[k] || {}));
  for (const [key, value] of Object.entries(values)) {
    const name = key.replace("__site_", "");
    if (name === "hours") {
      const current = ensure("workingHours");
      current.days = value.map((d, i) => ({
        day: dayCodes[i],
        isOpen: d.enabled,
        ...(d.enabled ? { from: d.from, to: d.to } : {}),
      }));
      current.holidays ??= [];
      delete current.isOpenNow;
      delete current.todayHoliday;
    } else if (name.startsWith("description_")) {
      const kind = name.slice(12),
        p = ensure("pricingTypes");
      p[kind] = { ...p[kind], description: value };
    } else {
      const c = ensure("contact");
      if (name === "phones" || name === "emails") {
        const field = name === "phones" ? "number" : "email";
        c[name] = value.map((v, i) => ({
          ...((data.contact?.[name] || []).find((x) => x[field] === v) ||
            data.contact?.[name]?.[i] || { label: "" }),
          [field]: v,
        }));
      } else if (name === "address") c.address = value;
      else if (name === "location") c.location = value;
      else if (name === "warehouse_location") c.warehouse = value;
      else if (name === "warehouse")
        c.warehouse = { ...c.warehouse, address: value };
      else c.socials = { ...c.socials, [name]: value };
    }
  }
  return result;
}
export function containsValues(actual, expected) {
  if (expected === null || typeof expected !== "object")
    return actual === expected;
  if (Array.isArray(expected))
    return (
      Array.isArray(actual) &&
      actual.length === expected.length &&
      expected.every((x, i) => containsValues(actual[i], x))
    );
  return (
    actual &&
    Object.entries(expected).every(([k, v]) => containsValues(actual[k], v))
  );
}
