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
    me = useAdminResource("/api/admin/me");
  const [draft, setDraft] = useState({}),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [writeError, setWriteError] = useState(null),
    [verified, setVerified] = useState(null);
  useEffect(() => {
    setVerified(null);
  }, [resource.data]);
  const sections = useRef({}),
    pending = useRef(null),
    lock = useRef(false);
  let rows = [],
    error = resource.error;
  try {
    if (verified) rows = verified;
    else if (resource.data) rows = settingsRows(resource.data);
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
    if (error || !resource.data || !canEdit) {
      setWriteError(
        error || new Error("تعذر حفظ الإعدادات أو لا توجد صلاحية للتعديل."),
      );
      return;
    }
    let body;
    try {
      body =
        pending.current ||
        settingsPatch(rows, draft, sections.current, section);
    } catch (e) {
      setWriteError(e);
      return;
    }
    if (!Object.keys(body).length) {
      setMessage("لا توجد تغييرات قابلة للحفظ.");
      return;
    }
    lock.current = true;
    setBusy(true);
    try {
      if (!pending.current) {
        try {
          await adminRequest("/api/admin/settings", { method: "PATCH", body });
          pending.current = body;
        } catch (e) {
          if (!e.status || e.status >= 500) pending.current = body;
          throw e;
        }
      }
      const fresh = await adminRequest("/api/admin/settings"),
        next = verifySettings(fresh, body);
      setVerified(next);
      setDraft((old) =>
        Object.fromEntries(
          Object.entries(old).filter(([key]) => !Object.hasOwn(body, key)),
        ),
      );
      pending.current = null;
      setMessage("تم حفظ الإعدادات.");
    } catch (e) {
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
    loading: resource.loading,
    error: error || me.error,
    writeError,
    message,
    pending: !!pending.current,
    save,
    reload: resource.reload,
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
