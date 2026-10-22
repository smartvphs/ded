import { adminRequest } from "./admin-api";
export const staffPath = (id) => "/api/admin/staff/" + encodeURIComponent(id);
export const normalizeStaff = (row) => ({
  ...row,
  isActive: row.isActive ?? row.is_active,
  createdAt: row.createdAt ?? row.created_at,
});
export async function readStaff(id, { deleted = false } = {}) {
  const response = await adminRequest(
    "/api/admin/staff" + (deleted ? "?status=deleted" : ""),
  );
  if (!Array.isArray(response.data))
    throw new Error("رد قائمة الموظفين غير صالح.");
  const row = response.data.find((r) => r.id === id);
  if (!row)
    throw new Error(
      "لم يظهر الموظف في القائمة. حدّث البيانات قبل إعادة العملية.",
    );
  return normalizeStaff(row);
}
export function staffBody(draft, creating = false) {
  const name = draft.name.trim(),
    email = draft.email.trim();
  if (name.length < 2 || name.length > 150)
    throw new Error("أدخل اسم الموظف من حرفين إلى 150 حرفًا.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error("أدخل بريدًا إلكترونيًا صحيحًا.");
  const body = { name, email };
  if (creating) {
    if (draft.password.length < 8)
      throw new Error("كلمة المرور لا تقل عن 8 أحرف.");
    body.password = draft.password;
    body.permissions = [...(draft.permissions || [])];
  }
  return body;
}
export function permissionKeys(groups) {
  if (
    !Array.isArray(groups) ||
    groups.some(
      (g) =>
        !Array.isArray(g.permissions) ||
        g.permissions.some((p) => typeof p.key !== "string"),
    )
  )
    throw new Error("رد قائمة الصلاحيات غير صالح.");
  return new Set(groups.flatMap((g) => g.permissions.map((p) => p.key)));
}
export function changePermissionKeys(current, keys, enabled) {
  const next = new Set(current);
  for (const key of keys) enabled ? next.add(key) : next.delete(key);
  return [...next];
}
export const samePermissions = (a, b) =>
  Array.isArray(a) &&
  Array.isArray(b) &&
  new Set(a).size === new Set(b).size &&
  a.every((key) => b.includes(key));
export function permissionsBody(selected, groups, original = []) {
  const allowed = permissionKeys(groups),
    originalKeys = new Set(original);
  if (selected.some((key) => !allowed.has(key) && !originalKeys.has(key)))
    throw new Error("فيه صلاحية غير معروفة؛ حدّث القائمة.");
  return { permissions: [...new Set(selected)] };
}
export function verifyStaff(row, expected) {
  for (const key of ["name", "email", "isActive"])
    if (expected[key] !== undefined && row[key] !== expected[key])
      throw new Error(
        "بعض بيانات الموظف لم ترجع بالقيم المحفوظة. حدّث القائمة.",
      );
  if (
    expected.permissions &&
    !samePermissions(row.permissions, expected.permissions)
  )
    throw new Error(
      "صلاحيات الموظف لم ترجع بنفس القائمة المحفوظة. حدّث البيانات.",
    );
}
