import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import useAdminResource from "./use-admin-resource";
import { adminRequest } from "./admin-api";
import {
  settingsRows,
  resolveSetting,
  inputValue,
  settingsPatch,
  verifySettings,
} from "./settings-bindings";
import { siteRows, siteBody, containsValues } from "./site-info-bindings";
export const SettingsContext = createContext(null);
export const SettingsScope = createContext("");
export function useSetting(label, binding, context) {
  const api = useContext(SettingsContext),
    section = useContext(SettingsScope),
    row = resolveSetting(api?.rows || [], { label, binding, context });
  const disabled =
    !row ||
    row.isReadOnly ||
    !api?.canEdit ||
    api.busy ||
    api.loading ||
    !!api.error;
  return {
    row,
    value: row ? (api.draft[row.key] ?? inputValue(row)) : "",
    disabled,
    title: !row
      ? "حقل الحفظ غير متاح في بيانات الإعدادات الحالية."
      : row.isReadOnly
        ? "هذا الإعداد للعرض فقط حسب الباك اند."
        : !api.canEdit
          ? "ليس لديك صلاحية تعديل الإعدادات."
          : row.impact || row.description || "",
    change: (value) => {
      if (!disabled) api.change(row.key, value, section);
    },
  };
}
export function useSettingsController() {
  const resource = useAdminResource("/api/admin/settings"),
    me = useAdminResource("/api/admin/me"),
    site = useAdminResource("/api/admin/site-info");
  const [draft, setDraft] = useState({}),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [writeError, setWriteError] = useState(null),
    [verified, setVerified] = useState(null),
    [siteVerified, setSiteVerified] = useState(null);
  useEffect(() => {
    setVerified(null);
    setSiteVerified(null);
  }, [resource.data]);
  const sections = useRef({}),
    pending = useRef(null),
    lock = useRef(false);
  let rows = [],
    error = resource.error || site.error;
  try {
    if (verified) rows = verified;
    else if (resource.data) rows = settingsRows(resource.data);
    if (site.data && !verified) rows = [...rows, ...siteRows(site.data)];
  } catch (e) {
    error = e;
  }
  const account = me.data?.data,
    canEdit = !!(
      account?.isSuperAdmin || account?.permissions?.includes("settings.manage")
    );
  async function save(section) {
    if (lock.current) return;
    setWriteError(null);
    setMessage("");
    if (error || !resource.data || !site.data || !canEdit) {
      setWriteError(
        error || new Error("تعذر حفظ الإعدادات أو لا توجد صلاحية للتعديل."),
      );
      return;
    }
    let plan;
    try {
      if (pending.current) plan = pending.current;
      else {
        const changed = settingsPatch(rows, draft, sections.current, section),
          numeric = Object.fromEntries(
            Object.entries(changed).filter(
              ([key]) => !key.startsWith("__site_"),
            ),
          ),
          siteValues = Object.fromEntries(
            Object.entries(changed).filter(([key]) =>
              key.startsWith("__site_"),
            ),
          );
        plan = { ops: [], keys: Object.keys(changed) };
        if (Object.keys(numeric).length)
          plan.ops.push({ path: "/api/admin/settings", body: numeric });
        if (Object.keys(siteValues).length)
          plan.ops.push({
            path: "/api/admin/site-info",
            body: siteBody(siteVerified || site.data.data, siteValues),
          });
      }
    } catch (e) {
      setWriteError(e);
      return;
    }
    if (!plan.ops.length) {
      setMessage("لا توجد تغييرات قابلة للحفظ.");
      return;
    }
    lock.current = true;
    setBusy(true);
    pending.current = plan;
    try {
      for (const op of plan.ops) {
        if (op.done) continue;
        if (!op.sent) {
          try {
            await adminRequest(op.path, { method: "PATCH", body: op.body });
            op.sent = true;
          } catch (e) {
            if (!e.status || e.status >= 500) op.sent = true;
            throw e;
          }
        }
        const fresh = await adminRequest(op.path);
        if (op.path.endsWith("site-info")) {
          if (!containsValues(fresh.data, op.body))
            throw new Error("لم يتم تأكيد بيانات الموقع؛ أعد التحقق.");
        } else verifySettings(fresh, op.body);
        op.done = true;
      }
      const [settingsResult, siteResult] = await Promise.all([
        adminRequest("/api/admin/settings"),
        adminRequest("/api/admin/site-info"),
      ]);
      setVerified([...settingsRows(settingsResult), ...siteRows(siteResult)]);
      setSiteVerified(siteResult.data);
      setDraft((old) =>
        Object.fromEntries(
          Object.entries(old).filter(([key]) => !plan.keys.includes(key)),
        ),
      );
      pending.current = null;
      setMessage("تم حفظ الإعدادات.");
    } catch (e) {
      if ((e.status && e.status < 500) || plan.ops.every((x) => !x.sent))
        pending.current = null;
      setWriteError(e);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return {
    canGenerate: !!(
      account?.isSuperAdmin || account?.permissions?.includes("catalog.manage")
    ),
    rows,
    draft,
    busy,
    canEdit: canEdit && !pending.current,
    loading: resource.loading || site.loading,
    error: error || me.error,
    writeError,
    message,
    pending: !!pending.current,
    save,
    reload: () => {
      resource.reload();
      site.reload();
    },
    change: (key, value, section) => {
      sections.current[key] = section;
      setDraft((old) => ({ ...old, [key]: value }));
      setMessage("");
    },
    updated: rows
      .map((r) => r.updatedAt)
      .filter(Boolean)
      .sort()
      .at(-1),
  };
}
