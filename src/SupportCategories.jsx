import React, { useState } from "react";
import useAdminResource from "./use-admin-resource";
import { adminRequest } from "./admin-api";
import { ResourceState } from "./orders-ui";
import { PricingDialog } from "./pricing-ui";
export default function SupportCategories({ onSessionExpired, onChanged }) {
  const [revision, setRevision] = useState(0),
    [editor, setEditor] = useState(null),
    [draft, setDraft] = useState({}),
    [remove, setRemove] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(null),
    [uncertain, setUncertain] = useState(false);
  const resource = useAdminResource(
      "/api/support-tickets/admin/categories",
      revision,
    ),
    rows = resource.data?.data?.items || [];
  function edit(row = {}) {
    setEditor(row);
    setDraft({
      name: row.name || "",
      nameEn: row.name_en || "",
      code: row.code || "",
      isActive: row.is_active !== false,
      sortOrder: row.sort_order ?? "",
    });
    setSaved(null);
    setError("");
  }
  async function save(e) {
    e.preventDefault();
    if (busy || uncertain) return;
    setBusy(true);
    setError("");
    try {
      let record = saved;
      if (!record) {
        const body = editor.id
          ? Object.fromEntries(
              [
                ["name", draft.name.trim(), editor.name],
                ["nameEn", draft.nameEn.trim() || null, editor.name_en || null],
                ["isActive", draft.isActive, editor.is_active],
                ["sortOrder", Number(draft.sortOrder), editor.sort_order],
              ]
                .filter(([, v, old]) => v !== old)
                .map(([key, value]) => [key, value]),
            )
          : {
              name: draft.name.trim(),
              ...(draft.nameEn.trim() ? { nameEn: draft.nameEn.trim() } : {}),
              ...(draft.code.trim() ? { code: draft.code.trim() } : {}),
              isActive: draft.isActive,
              ...(draft.sortOrder !== ""
                ? { sortOrder: Number(draft.sortOrder) }
                : {}),
            };
        if (editor.id && !Object.keys(body).length) {
          setEditor(null);
          return;
        }
        let result;
        try {
          result = await adminRequest(
            "/api/support-tickets/admin/categories" +
              (editor.id ? "/" + encodeURIComponent(editor.id) : ""),
            { method: editor.id ? "PATCH" : "POST", body },
          );
        } catch (e) {
          if (!editor.id && (!e.status || e.status >= 500)) setUncertain(true);
          throw e;
        }
        if (!result.data?.id) {
          setUncertain(true);
          throw new Error("تعذر تأكيد رقم نوع المشكلة. راجع القائمة.");
        }
        record = { id: result.data.id, body };
        setSaved(record);
      }
      const fresh = await adminRequest("/api/support-tickets/admin/categories");
      if (
        !Array.isArray(fresh.data?.items) ||
        !fresh.data.items.some(
          (x) =>
            x.id === record.id &&
            Object.entries(record.body).every(
              ([k, v]) =>
                JSON.stringify(
                  x[
                    {
                      nameEn: "name_en",
                      isActive: "is_active",
                      sortOrder: "sort_order",
                    }[k] || k
                  ] ?? null,
                ) === JSON.stringify(v ?? null),
            ),
        )
      )
        throw new Error("تعذر تأكيد نوع المشكلة المحفوظ. أعد التحقق.");
      setEditor(null);
      setSaved(null);
      setRevision((n) => n + 1);
      onChanged?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function del() {
    setBusy(true);
    setError("");
    try {
      if (!saved) {
        try {
          await adminRequest(
            "/api/support-tickets/admin/categories/" +
              encodeURIComponent(remove.id),
            { method: "DELETE" },
          );
        } catch (e) {
          if (e.status !== 404) {
            if (!e.status || e.status >= 500) setSaved({ id: remove.id });
            throw e;
          }
        }
        setSaved({ id: remove.id });
      }
      const fresh = await adminRequest("/api/support-tickets/admin/categories");
      if (
        !Array.isArray(fresh.data?.items) ||
        fresh.data.items.some((x) => x.id === remove.id)
      )
        throw new Error("النوع ما زال موجودًا.");
      setRemove(null);
      setSaved(null);
      setRevision((n) => n + 1);
      onChanged?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="support-types">
      <h2>أنواع المشكلة</h2>
      <ResourceState resource={resource} onLogin={onSessionExpired} />
      {uncertain && (
        <p role="alert" className="support-api-error">
          نتيجة الإضافة غير مؤكدة. راجع القائمة قبل إضافة نوع جديد.
        </p>
      )}
      <button
        className="pricing-primary"
        disabled={busy || uncertain}
        onClick={() => edit()}
      >
        إضافة نوع مشكلة
      </button>
      <div className="support-category-list">
        {rows.map((row) => (
          <article key={row.id}>
            <div>
              <b>{row.name}</b>
              <small>
                {row.code} · {row.tickets_count} تذكرة ·{" "}
                {row.is_active ? "مفعّل" : "موقوف"}
              </small>
            </div>
            <button disabled={busy} onClick={() => edit(row)}>
              تعديل النوع
            </button>
            <button
              disabled={
                busy || row.is_protected || Number(row.tickets_count) > 0
              }
              title={
                row.is_protected
                  ? "نوع افتراضي محمي"
                  : Number(row.tickets_count) > 0
                    ? "أوقف النوع المستخدم بدل حذفه"
                    : undefined
              }
              onClick={() => {
                setRemove(row);
                setSaved(null);
                setError("");
              }}
            >
              حذف النوع
            </button>
          </article>
        ))}
      </div>
      {editor && (
        <PricingDialog
          title={editor.id ? "تعديل نوع المشكلة" : "إضافة نوع مشكلة"}
          busy={busy}
          onClose={() => setEditor(null)}
        >
          <form onSubmit={save}>
            <label>
              الاسم
              <input
                required
                aria-label="اسم نوع المشكلة"
                value={draft.name}
                disabled={busy || !!saved}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </label>
            <label>
              الاسم بالإنجليزية
              <input
                aria-label="اسم نوع المشكلة بالإنجليزية"
                value={draft.nameEn}
                disabled={busy || !!saved}
                onChange={(e) => setDraft({ ...draft, nameEn: e.target.value })}
              />
            </label>
            <label>
              الكود
              <input
                aria-label="كود نوع المشكلة"
                pattern="[a-z0-9_]+"
                value={draft.code}
                disabled={!!editor.id || busy || !!saved}
                onChange={(e) => setDraft({ ...draft, code: e.target.value })}
              />
            </label>
            <label>
              الترتيب
              <input
                type="number"
                min="0"
                aria-label="ترتيب نوع المشكلة"
                value={draft.sortOrder}
                disabled={busy || !!saved}
                onChange={(e) =>
                  setDraft({ ...draft, sortOrder: e.target.value })
                }
              />
            </label>
            <label>
              <input
                type="checkbox"
                checked={draft.isActive}
                disabled={busy || !!saved || editor.is_protected}
                onChange={(e) =>
                  setDraft({ ...draft, isActive: e.target.checked })
                }
              />
              مفعّل
            </label>
            {error && (
              <p role="alert" className="support-api-error">
                {error}
              </p>
            )}
            <button className="pricing-primary" disabled={busy || uncertain}>
              {saved ? "إعادة التحقق" : "حفظ النوع"}
            </button>
          </form>
        </PricingDialog>
      )}
      {remove && (
        <PricingDialog
          title="حذف نوع المشكلة"
          busy={busy}
          onClose={() => setRemove(null)}
        >
          <p>حذف {remove.name}؟</p>
          {error && (
            <p role="alert" className="support-api-error">
              {error}
            </p>
          )}
          <button disabled={busy} className="pricing-primary" onClick={del}>
            {saved ? "إعادة التحقق" : "تأكيد الحذف"}
          </button>
        </PricingDialog>
      )}
    </section>
  );
}
