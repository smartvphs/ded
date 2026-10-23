export function readSettings(payload) {
  const data = payload?.data;
  if (
    !Array.isArray(data?.groups) ||
    data.groups.some((g) => !Array.isArray(g.settings))
  )
    throw new Error("رد الإعدادات غير مكتمل.");
  return data;
}
export function settingsTab(group, key) {
  const v = (group + " " + key).toLowerCase();
  if (/cashback/.test(v)) return "cashback";
  if (/payment|moyasar|tabby|tamara/.test(v)) return "payments";
  if (
    /contact|social|instagram|facebook|twitter|linkedin|support_phone|support_email|whatsapp/.test(
      v,
    )
  )
    return "contact";
  if (/prepar|working|business_hour|work_day/.test(v)) return "preparation";
  if (/shipping|delivery|courier/.test(v)) return "shipping";
  if (/ai_|anthropic|openai|claude|artificial/.test(v) || group === "ai")
    return "ai";
  if (/margin|commission|pricing|fee_free|fee_normal|fee_express/.test(v))
    return "pricing";
  return "other";
}
export function settingInput(row) {
  row = {
    ...row,
    value: row.isMissing && row.value == null ? row.defaultValue : row.value,
  };
  return typeof row.value === "object" && row.value !== null
    ? JSON.stringify(row.value, null, 2)
    : row.value == null
      ? ""
      : String(row.value);
}
export function settingValue(row, value) {
  if (row.isReadOnly) throw new Error("هذا الإعداد للعرض فقط.");
  if (row.type === "boolean" || row.type === "toggle") {
    return typeof row.value === "number" || row.key.startsWith("home_section_")
      ? Number(value === true || value === "1" || value === "true")
      : value === true || value === "1" || value === "true";
  }
  if (
    [
      "number",
      "integer",
      "money",
      "percent",
      "hours",
      "days",
      "count",
    ].includes(row.type) ||
    typeof row.value === "number" ||
    row.min != null ||
    row.max != null
  ) {
    if (value === "" || !Number.isFinite(Number(value)))
      throw new Error("أدخل قيمة رقمية صحيحة: " + row.label);
    const n = Number(value);
    if (
      (row.type === "integer" || row.type === "count") &&
      !Number.isInteger(n)
    )
      throw new Error("أدخل عددًا صحيحًا: " + row.label);
    if ((row.min != null && n < row.min) || (row.max != null && n > row.max))
      throw new Error("القيمة خارج المدى المسموح: " + row.label);
    return n;
  }
  if (
    row.type === "json" ||
    (typeof row.value === "object" && row.value !== null)
  ) {
    try {
      return JSON.parse(value);
    } catch {
      throw new Error("قيمة غير صحيحة: " + row.label);
    }
  }
  return value;
}
export function settingsChanges(groups, draft) {
  const changes = {};
  for (const g of groups)
    for (const row of g.settings) {
      if (row.isReadOnly || !Object.hasOwn(draft, row.key)) continue;
      if (draft[row.key] === settingInput(row)) continue;
      const value = settingValue(row, draft[row.key]);
      if (JSON.stringify(value) !== JSON.stringify(row.value))
        changes[row.key] = value;
    }
  return changes;
}
export function verifySettings(payload, body) {
  const data = readSettings(payload),
    rows = data.groups.flatMap((g) => g.settings);
  for (const [key, value] of Object.entries(body)) {
    const row = rows.find((x) => x.key === key);
    if (!row || JSON.stringify(row.value) !== JSON.stringify(value))
      throw new Error("لم يتم تأكيد الإعداد المحفوظ: " + (row?.label || key));
  }
  return data;
}
