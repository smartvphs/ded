// Aliases are resolved only against keys actually returned by the settings API.
export const settingKeys = {
  serviceMargin: [],
  pricingMargin: ["platform_margin_percent"],
  freeCommission: ["supplier_commission_free"],
  normalCommission: ["supplier_commission_normal"],
  expressCommission: ["supplier_commission_express"],
  freeEnabled: ["pricing_free_enabled"],
  normalEnabled: ["pricing_normal_enabled"],
  expressEnabled: ["pricing_express_enabled"],
  cashbackMin: ["cashback_min_order"],
  offerMargin: ["offer_target_margin_percent"],
  normalFee: ["pricing_fee_normal"],
  expressFee: ["pricing_fee_express"],
  freePartsLimit: ["pricing_free_parts_limit"],
  cashbackMax: ["cashback_max_per_order"],
  fulfillmentHours: ["supplier_fulfillment_hours"],
  freeSla: ["sla_free_hours_max"],
  normalSla: ["sla_normal_minutes_max"],
  expressSla: ["sla_express_minutes_max"],
  cashbackPercent: ["cashback_percent"],
  tabbyFee: ["payment_fee_tabby_percent"],
  tamaraFee: ["payment_fee_tamara_percent"],
};
export function normalizeLabel(v) {
  return String(v || "")
    .normalize("NFKC")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/[\u064B-\u065Fـ*]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
export function settingsRows(payload) {
  if (
    !Array.isArray(payload?.data?.groups) ||
    payload.data.groups.some((g) => !Array.isArray(g.settings))
  )
    throw new Error("رد الإعدادات غير مكتمل.");
  const rows = payload.data.groups.flatMap((g) =>
    g.settings.map((r) => ({ ...r, group: g.key, groupLabel: g.label })),
  );
  if (
    rows.some((r) => !r.key || typeof r.label !== "string") ||
    new Set(rows.map((r) => r.key)).size !== rows.length
  )
    throw new Error("حقول الإعدادات غير صالحة.");
  return [
    ...rows,
    ...(payload.data.unknown || [])
      .filter((r) => !rows.some((x) => x.key === r.key))
      .map((r) => ({ ...r, isReadOnly: true })),
  ];
}
export function resolveSetting(rows, { binding, label, context }) {
  const matches = (settingKeys[binding] || [])
    .map((key) => rows.find((r) => r.key === key))
    .filter(Boolean);
  if (matches.length === 1) return matches[0];
  if (!label) return null;
  const names = [
    label,
    ...(context ? [context + " " + label, label + " " + context] : []),
  ].map(normalizeLabel);
  let candidates = rows.filter((r) => names.includes(normalizeLabel(r.label)));
  if (context) {
    const contextual = candidates.filter(
      (r) =>
        normalizeLabel(r.label).includes(normalizeLabel(context)) ||
        normalizeLabel(r.groupLabel).includes(normalizeLabel(context)),
    );
    candidates = contextual;
  }
  return candidates.length === 1 ? candidates[0] : null;
}
export function effectiveValue(row) {
  return row?.isMissing && row.value == null ? row.defaultValue : row?.value;
}
export function inputValue(row) {
  const value = effectiveValue(row);
  return value == null
    ? ""
    : typeof value === "object"
      ? JSON.stringify(value)
      : String(value);
}
export function typedValue(row, value) {
  if (row.isReadOnly) throw new Error("هذا الإعداد للعرض فقط.");
  if (["boolean", "toggle"].includes(row.type))
    return typeof effectiveValue(row) === "number"
      ? Number(value === true || value === "true" || value === "1")
      : value === true || value === "true" || value === "1";
  if (
    [
      "number",
      "integer",
      "count",
      "money",
      "percent",
      "hours",
      "days",
    ].includes(row.type) ||
    typeof effectiveValue(row) === "number" ||
    row.min != null ||
    row.max != null
  ) {
    const n = Number(value);
    if (
      value === "" ||
      !Number.isFinite(n) ||
      (["integer", "count"].includes(row.type) && !Number.isInteger(n)) ||
      (row.min != null && n < row.min) ||
      (row.max != null && n > row.max)
    )
      throw new Error("قيمة غير صحيحة أو خارج المدى المسموح: " + row.label);
    return n;
  }
  if (
    row.type === "json" ||
    (effectiveValue(row) != null && typeof effectiveValue(row) === "object")
  ) {
    try {
      return JSON.parse(value);
    } catch {
      throw new Error("بيانات غير صحيحة: " + row.label);
    }
  }
  return value;
}
export function settingsPatch(rows, draft, sections, section) {
  const body = {};
  for (const [key, value] of Object.entries(draft)) {
    if (section && sections[key] !== section) continue;
    const row = rows.find((r) => r.key === key);
    if (!row || row.isReadOnly || value === inputValue(row)) continue;
    body[key] = typedValue(row, value);
  }
  return body;
}
export function verifySettings(payload, body) {
  const rows = settingsRows(payload);
  for (const [key, value] of Object.entries(body))
    if (
      JSON.stringify(rows.find((r) => r.key === key)?.value) !==
      JSON.stringify(value)
    )
      throw new Error("لم يتم تأكيد حفظ الإعدادات؛ أعد التحقق.");
  return rows;
}

export function hoursInput(value, unit) {
  return value === "" ? "" : String(Number(value) / (unit === "يوم" ? 24 : 1));
}
export function storedHours(value, unit) {
  return value === "" ? "" : String(Number(value) * (unit === "يوم" ? 24 : 1));
}
