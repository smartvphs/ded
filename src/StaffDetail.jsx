import React, { useEffect, useState } from "react";
import { ArrowRight, RefreshCw, Save } from "lucide-react";
import { adminRequest } from "./admin-api";
import { ResourceState, dateText } from "./orders-ui";
import { useMutation, Feedback } from "./ProductExtras";
import {
  readStaff,
  staffPath,
  permissionsBody,
  samePermissions,
  verifyStaff,
} from "./staff-api";
import StaffPermissions from "./StaffPermissions";
import StaffAudit from "./StaffAudit";
export default function StaffDetail({
  employee,
  catalog,
  me,
  onBack,
  onChanged,
  onSessionExpired,
}) {
  const [resource, setResource] = useState({
      loading: true,
      data: null,
      error: null,
    }),
    [draft, setDraft] = useState([]),
    [revision, setRevision] = useState(0),
    [committed, setCommitted] = useState(null),
    [audit, setAudit] = useState(false),
    mutation = useMutation();
  useEffect(() => {
    let cancelled = false;
    setResource({ loading: true, data: null, error: null });
    readStaff(employee.id, { deleted: !!employee.deletedAt })
      .then((row) => {
        if (!cancelled) {
          if (!Array.isArray(row.permissions))
            throw new Error("رد صلاحيات الموظف غير صالح.");
          setResource({ loading: false, data: row, error: null });
          setDraft(row.permissions);
          setCommitted(null);
        }
      })
      .catch((error) => {
        if (!cancelled) setResource({ loading: false, data: null, error });
      });
    return () => {
      cancelled = true;
    };
  }, [employee.id, employee.deletedAt, revision]);
  const row = resource.data,
    disabled =
      !row ||
      row.isSuperAdmin ||
      !!row.deletedAt ||
      me?.isSuperAdmin !== true ||
      mutation.busy ||
      !!committed,
    dirty = !!row && !samePermissions(draft, row.permissions);
  async function save() {
    await mutation.run(async () => {
      const body =
        committed || permissionsBody(draft, catalog.data, row.permissions);
      if (!committed) {
        await adminRequest(staffPath(employee.id) + "/permissions", {
          method: "PATCH",
          body,
        });
        setCommitted(body);
      }
      const fresh = await readStaff(employee.id);
      verifyStaff(fresh, { permissions: body.permissions });
      setResource({ loading: false, data: fresh, error: null });
      setDraft(fresh.permissions);
      setCommitted(null);
      onChanged();
      mutation.setNotice("تم حفظ الصلاحيات وتأكيدها من الخادم.");
    });
  }
  return (
    <section className="employee-permissions">
      <div className="employee-permission-title">
        <h1>صلاحيات الموظف {row?.name || employee.name}</h1>
        <div className="staff-heading-actions">
          <button
            disabled={mutation.busy || !!committed}
            onClick={() => setRevision((n) => n + 1)}
          >
            <RefreshCw size={15} />
            تحديث
          </button>
          <button onClick={onBack} disabled={mutation.busy}>
            <ArrowRight size={15} />
            {dirty && !committed ? "تجاهل التغييرات والرجوع" : "إدارة الموظفين"}
          </button>
        </div>
      </div>
      <ResourceState
        resource={{ ...resource, reload: () => setRevision((n) => n + 1) }}
        onLogin={onSessionExpired}
      />
      {row && (
        <>
          <div className="staff-detail-meta">
            <span>{row.email || "—"}</span>
            <span>
              {row.isSuperAdmin
                ? "أدمن رئيسي"
                : row.role === "staff"
                  ? "موظف"
                  : row.role === "admin"
                    ? "أدمن"
                    : row.role || "—"}
            </span>
            <span>
              {row.deletedAt ? "محذوف" : row.isActive ? "نشط" : "غير نشط"}
            </span>
            <span>آخر دخول: {dateText(row.lastLoginAt)}</span>
            <span>تاريخ الإضافة: {dateText(row.createdAt)}</span>
            {row.createdByName && <span>أضافه: {row.createdByName}</span>}
          </div>
          {row.isSuperAdmin && (
            <p className="staff-api-note">
              الأدمن الرئيسي عنده كل الصلاحيات، ومش بيتعامل كموظف بصلاحيات
              محددة.
            </p>
          )}
          <StaffPermissions
            catalog={catalog}
            value={draft}
            onChange={setDraft}
            disabled={disabled}
          />
          <Feedback mutation={mutation} />
          {committed && (
            <p className="staff-api-note">
              تم إرسال الصلاحيات؛ اضغط لتأكيد البيانات بدون إرسال التغيير مرة
              أخرى.
            </p>
          )}
          <div className="staff-save-row">
            <button
              className="pricing-primary"
              disabled={
                mutation.busy ||
                !row ||
                row.isSuperAdmin ||
                !!row.deletedAt ||
                me?.isSuperAdmin !== true ||
                (!dirty && !committed)
              }
              onClick={save}
            >
              <Save size={15} />
              {committed ? "تأكيد البيانات" : "حفظ الصلاحيات"}
            </button>
            <button
              className="pricing-back"
              onClick={() => setAudit((v) => !v)}
            >
              {audit ? "إخفاء سجل النشاط" : "سجل النشاط"}
            </button>
          </div>
          <p className="staff-api-note">
            التعديلات بتتحفظ عند الضغط على «حفظ الصلاحيات»، وبتنهي جلسات دخول
            الموظف الحالية.
          </p>
          {audit && (
            <StaffAudit employee={row} onSessionExpired={onSessionExpired} />
          )}
        </>
      )}
    </section>
  );
}
