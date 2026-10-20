// Values, rather than option IDs or translated labels, are persisted in products.
export function catalogOptions(fields, key, categoryId, currentValue = "") {
  const matching = (Array.isArray(fields) ? fields : []).filter(
    (field) => field.key === key && (!field.categoryId || field.categoryId === categoryId),
  );
  const field = matching.find((field) => field.categoryId === categoryId) || matching[0];
  if (!field || field.isActive === false) return null;
  const seen = new Set();
  const rows = [...(field.options || [])]
    .filter((option) => option.isActive !== false && option.value != null)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .flatMap((option) => {
      const value = String(option.value);
      if (!value || seen.has(value)) return [];
      seen.add(value);
      return [{ id: value, name: option.labelAr || option.labelEn || value }];
    });
  const current = String(currentValue ?? "");
  if (current && !seen.has(current)) {
    const old = (field.options || []).find((option) => String(option.value) === current);
    rows.unshift({ id: current, name: old?.labelAr || old?.labelEn || current });
  }
  return rows;
}
