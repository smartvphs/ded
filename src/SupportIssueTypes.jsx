import React, { useState } from "react";
import { X } from "lucide-react";
import useAdminResource from "./use-admin-resource";
import { adminRequest } from "./admin-api";
import { ResourceState } from "./orders-ui";
import { PricingDialog, PricingField } from "./pricing-ui";
import {
  issueTypeRows,
  issueTypeDraft,
  issueTypeBody,
  verifyIssueType,
} from "./support-issue-types";
const path = "/api/support-tickets/admin/categories";
const outcomes = new Map();
export default function SupportIssueTypes({
  publicResource,
  revision,
  onChanged,
  onSessionExpired,
}) {
  const me = useAdminResource("/api/admin/me"),
    account = me.data?.data;
  const canManage = !!(
    account?.isSuperAdmin || account?.permissions?.includes("support.manage")
  );
  const resource = useAdminResource(canManage ? path : null, revision);
  const [action, setAction] = useState(null);
  let rows = [],
    error = null;
  const current = canManage ? resource : publicResource;
  if (current.data) {
    try {
      rows = issueTypeRows(current.data, canManage);
    } catch (e) {
      error = e;
    }
  }
  return (
    <section className="support-types">
      <h2>أنواع مشكلات تذاكر المساعدة</h2>
      <p className="support-api-note">
        {canManage
          ? "اضغط على اسم النوع لتعديله. النوع المستخدم في تذاكر يمكن إيقافه بدل حذفه."
          : "الأنواع المتاحة من الخادم."}
      </p>
      <ResourceState resource={me} onLogin={onSessionExpired} />
      <ResourceState
        resource={error ? { ...current, error } : current}
        onLogin={onSessionExpired}
      />
      <div className="support-type-chips">
        {rows.map((row) => (
          <span
            key={row.id}
            style={row.is_active === false ? { opacity: 0.55 } : undefined}
          >
            <b
              role={canManage ? "button" : undefined}
              tabIndex={canManage ? 0 : undefined}
              aria-label={
                canManage ? "تعديل نوع المشكلة " + row.name : undefined
              }
              onClick={
                canManage ? () => setAction({ kind: "edit", row }) : undefined
              }
              onKeyDown={
                canManage
                  ? (event) => {
                      if (["Enter", " "].includes(event.key)) {
                        event.preventDefault();
                        setAction({ kind: "edit", row });
                      }
                    }
                  : undefined
              }
            >
              {row.name}
            </b>
            {canManage && (
              <button
                type="button"
                aria-label={"حذف نوع المشكلة " + row.name}
                disabled={
                  row.is_protected ||
                  row.code === "other" ||
                  Number(row.tickets_count) > 0
                }
                title={
                  row.is_protected || row.code === "other"
                    ? "النوع الافتراضي لا يمكن حذفه"
                    : Number(row.tickets_count) > 0
                      ? "النوع مستخدم؛ يمكنك إيقافه بدل الحذف"
                      : "حذف النوع"
                }
                onClick={() => setAction({ kind: "delete", row })}
              >
                <X size={13} />
              </button>
            )}
          </span>
        ))}
      </div>
      {!current.loading && !current.error && !error && !rows.length && (
        <p className="support-api-note">لا توجد أنواع محمّلة.</p>
      )}
      <button
        className="pricing-primary"
        disabled={!canManage || resource.loading || !!resource.error || !!error}
        onClick={() => setAction({ kind: "add" })}
      >
        إضافة نوع مشكلة
      </button>
      {action && (
        <TypeDialog
          key={action.kind + (action.row?.id || "")}
          action={action}
          accountId={account.id}
          rows={rows}
          onClose={() => setAction(null)}
          onSaved={() => {
            setAction(null);
            onChanged();
          }}
        />
      )}
    </section>
  );
}
function TypeDialog({ action, accountId, rows, onClose, onSaved }) {
  const key = accountId + ":" + action.kind + ":" + (action.row?.id || "new");
  const previous = outcomes.get(key),
    deleting = action.kind === "delete";
  const [draft, setDraft] = useState(
    () => previous?.draft || issueTypeDraft(action.row),
  );
  const [pending, setPending] = useState(previous || null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const set = (field, value) => setDraft((old) => ({ ...old, [field]: value }));
  async function save(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      let saved = pending;
      if (!saved) {
        const body = deleting ? null : issueTypeBody(draft, action.row);
        if (body && !Object.keys(body).length)
          throw new Error("لا توجد تغييرات للحفظ.");
        if (!action.row && rows.some((row) => row.code === body.code))
          throw new Error("كود النوع مستخدم بالفعل.");
        saved = {
          id: action.row?.id || null,
          body,
          draft,
          oldIds: rows.map((row) => row.id),
        };
        outcomes.set(key, saved);
        setPending(saved);
        try {
          const response = await adminRequest(
            path + (action.row ? "/" + encodeURIComponent(action.row.id) : ""),
            {
              method: deleting ? "DELETE" : action.row ? "PATCH" : "POST",
              ...(body ? { body } : {}),
            },
          );
          if (!action.row) {
            saved = { ...saved, id: response.data?.id || null };
            outcomes.set(key, saved);
            setPending(saved);
          }
        } catch (e) {
          if (e.status && e.status < 500) {
            outcomes.delete(key);
            setPending(null);
          }
          throw e;
        }
      }
      const all = issueTypeRows(await adminRequest(path), true);
      const row = saved.id
        ? all.find((row) => row.id === saved.id)
        : all.find(
            (row) =>
              row.code === saved.body.code && !saved.oldIds.includes(row.id),
          );
      if (deleting) {
        if (row) throw new Error("النوع ما زال موجودًا. أعد التحقق.");
      } else verifyIssueType(row, saved.body);
      outcomes.delete(key);
      onSaved();
    } catch (e) {
      setError(
        e.validationErrors?.map((item) => item.message).join("، ") || e.message,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <PricingDialog
      title={
        deleting
          ? "حذف نوع المشكلة"
          : action.row
            ? "تعديل نوع المشكلة"
            : "إضافة نوع مشكلة"
      }
      onClose={onClose}
      busy={busy}
    >
      <form onSubmit={save}>
        {deleting ? (
          <p>حذف «{action.row.name}»؟</p>
        ) : (
          <fieldset
            disabled={busy || !!pending}
            style={{ border: 0, padding: 0, margin: 0 }}
          >
            <PricingField label="اسم نوع المشكلة">
              <input
                aria-label="اسم نوع المشكلة"
                required
                value={draft.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </PricingField>
            <PricingField label="الاسم بالإنجليزي">
              <input
                aria-label="اسم نوع المشكلة بالإنجليزي"
                value={draft.nameEn}
                onChange={(e) => set("nameEn", e.target.value)}
              />
            </PricingField>
            <PricingField label="كود النوع">
              <input
                aria-label="كود نوع المشكلة"
                required
                readOnly={!!action.row}
                dir="ltr"
                value={draft.code}
                onChange={(e) => set("code", e.target.value)}
              />
            </PricingField>
            <PricingField label="الترتيب">
              <input
                aria-label="ترتيب نوع المشكلة"
                type="number"
                min="0"
                step="1"
                value={draft.sortOrder}
                onChange={(e) => set("sortOrder", e.target.value)}
              />
            </PricingField>
            <label>
              <input
                type="checkbox"
                aria-label="نوع مشكلة مفعّل"
                checked={draft.isActive}
                disabled={
                  action.row?.is_protected || action.row?.code === "other"
                }
                onChange={(e) => set("isActive", e.target.checked)}
              />{" "}
              مفعّل
            </label>
          </fieldset>
        )}
        {error && <p role="alert">{error}</p>}
        {pending && (
          <p className="support-api-note">
            تم إرسال العملية؛ إعادة التحقق تقرأ القائمة بدون تكرار الحفظ.
          </p>
        )}
        <button className="pricing-primary" disabled={busy}>
          {pending
            ? "إعادة التحقق"
            : deleting
              ? "تأكيد الحذف"
              : "حفظ نوع المشكلة"}
        </button>
      </form>
    </PricingDialog>
  );
}
