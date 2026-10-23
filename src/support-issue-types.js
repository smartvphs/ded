export function issueTypeRows(payload, admin = false) {
  const rows = admin ? payload?.data?.items : payload?.data;
  if (
    !Array.isArray(rows) ||
    rows.some(
      (row) =>
        !row ||
        typeof row.id !== "string" ||
        typeof row.code !== "string" ||
        typeof row.name !== "string",
    ) ||
    new Set(rows.map((row) => row.code)).size !== rows.length
  )
    throw new Error("رد أنواع المشكلات غير صالح.");
  return rows;
}
export function issueTypeDraft(row) {
  return {
    name: row?.name || "",
    nameEn: row?.name_en || "",
    code: row?.code || "issue_" + crypto.randomUUID().replaceAll("-", ""),
    isActive: row?.is_active ?? true,
    sortOrder: row?.sort_order ?? "",
  };
}
export function issueTypeBody(draft, original) {
  if (!draft.name.trim()) throw new Error("أدخل اسم نوع المشكلة.");
  const body = {
    name: draft.name.trim(),
    nameEn: draft.nameEn.trim() || null,
    isActive: !!draft.isActive,
  };
  if (!original) {
    if (!/^[a-z0-9_]+$/.test(draft.code))
      throw new Error(
        "كود النوع يقبل حروفًا إنجليزية صغيرة وأرقامًا وشرطة سفلية فقط.",
      );
    body.code = draft.code;
    if (!body.nameEn) delete body.nameEn;
  }
  if (draft.sortOrder !== "") {
    const n = Number(draft.sortOrder);
    if (!Number.isSafeInteger(n) || n < 0)
      throw new Error("ترتيب النوع رقم صحيح من صفر أو أكثر.");
    body.sortOrder = n;
  }
  if (original) {
    if ((original.is_protected || original.code === "other") && !body.isActive)
      throw new Error("لا يمكن إيقاف النوع الافتراضي.");
    for (const [key, field] of Object.entries({
      name: "name",
      nameEn: "name_en",
      isActive: "is_active",
      sortOrder: "sort_order",
    }))
      if ((original[field] ?? null) === (body[key] ?? null)) delete body[key];
  }
  return body;
}
export function verifyIssueType(row, body) {
  if (!row) throw new Error("لم يظهر نوع المشكلة بعد الحفظ. أعد التحقق.");
  for (const [key, value] of Object.entries(body)) {
    const field =
      { nameEn: "name_en", isActive: "is_active", sortOrder: "sort_order" }[
        key
      ] || key;
    if ((row[field] ?? null) !== value)
      throw new Error("نوع المشكلة لم يرجع بالقيم المحفوظة. أعد التحقق.");
  }
}
