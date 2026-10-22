import React, { useState } from "react";
import { PricingDialog } from "./pricing-ui";
import { useMutation, Feedback } from "./ProductExtras";
import { adminRequest } from "./admin-api";
import StaffPermissions from "./StaffPermissions";
import {
  staffBody,
  staffPath,
  readStaff,
  verifyStaff,
  permissionsBody,
} from "./staff-api";
function Field({ label, value, onChange, type = "text", disabled = false }) {
  return (
    <label className="cm-field">
      <span>{label}</span>
      <input
        aria-label={label}
        type={type}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        required
        autoComplete={type === "password" ? "new-password" : undefined}
      />
    </label>
  );
}
export function StaffForm({ employee, catalog, onClose, onSaved }) {
  const [draft, setDraft] = useState({
      name: employee?.name || "",
      email: employee?.email || "",
      password: "",
      permissions: [],
    }),
    [active, setActive] = useState(true),
    [record, setRecord] = useState(null),
    [uncertain, setUncertain] = useState(false),
    mutation = useMutation();
  const set = (key, value) => setDraft((old) => ({ ...old, [key]: value }));
  async function save(e) {
    e.preventDefault();
    if (uncertain) return;
    await mutation.run(async () => {
      let saved = record;
      if (!saved) {
        const body = staffBody(draft, !employee);
        if (!employee)
          body.permissions = permissionsBody(
            draft.permissions,
            catalog.data,
          ).permissions;
        let result;
        try {
          result = await adminRequest(
            employee ? staffPath(employee.id) : "/api/admin/staff",
            { method: employee ? "PATCH" : "POST", body },
          );
        } catch (error) {
          if (!employee && (!error.status || error.status >= 500))
            setUncertain(true);
          throw error;
        }
        const id = result.data?.id ?? employee?.id;
        if (!id) {
          setUncertain(true);
          throw new Error(
            "الخادم لم يرجع رقم الموظف. راجع القائمة قبل إعادة الإضافة.",
          );
        }
        saved = {
          id,
          expected: {
            name: body.name,
            email: body.email,
            ...(!employee
              ? { permissions: body.permissions, isActive: active }
              : {}),
          },
          statusDone: !!employee || active,
        };
        setRecord(saved);
        set("password", "");
      }
      if (!saved.statusDone) {
        await adminRequest(staffPath(saved.id) + "/status", {
          method: "PATCH",
          body: { isActive: false },
        });
        saved = {
          ...saved,
          statusDone: true,
          expected: { ...saved.expected, isActive: false },
        };
        setRecord(saved);
      }
      const row = await readStaff(saved.id);
      verifyStaff(row, saved.expected);
      await onSaved(row);
      onClose();
    });
  }
  return (
    <PricingDialog
      title={employee ? "تعديل الموظف" : "إضافة موظف جديد"}
      onClose={onClose}
      busy={mutation.busy}
    >
      <form className="staff-api-form" onSubmit={save}>
        <fieldset
          className="staff-fieldset"
          disabled={mutation.busy || !!record}
        >
          <Field
            label="اسم الموظف"
            value={draft.name}
            onChange={(v) => set("name", v)}
          />
          <Field
            label="البريد الإلكتروني"
            type="email"
            value={draft.email}
            onChange={(v) => set("email", v)}
          />
          {!employee && (
            <>
              <Field
                label="كلمة المرور"
                type="password"
                value={draft.password}
                onChange={(v) => set("password", v)}
              />
              <label className="employee-active">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                />
                موظف نشط
              </label>
              <h3 className="staff-permissions-heading">الصلاحيات</h3>
              <StaffPermissions
                catalog={catalog}
                value={draft.permissions}
                onChange={(v) => set("permissions", v)}
                disabled={mutation.busy || !!record}
              />
            </>
          )}
        </fieldset>
        <Feedback mutation={mutation} />
        {uncertain && (
          <p role="alert">
            نتيجة الإضافة غير مؤكدة؛ راجع القائمة قبل إعادة الإضافة لتجنب
            التكرار.
          </p>
        )}
        {record && (
          <p className="staff-api-note">
            تم حفظ الموظف؛ إعادة المحاولة هتكمّل التأكيد بدون إنشاء موظف تاني.
          </p>
        )}
        <button className="cm-submit" disabled={mutation.busy || uncertain}>
          {record
            ? "تأكيد البيانات"
            : employee
              ? "حفظ التعديلات"
              : "إضافة الموظف"}
        </button>
      </form>
    </PricingDialog>
  );
}
export function StaffAction({ type, employee, onClose, onSaved }) {
  const [password, setPassword] = useState(""),
    [committed, setCommitted] = useState(false),
    [uncertain, setUncertain] = useState(false),
    mutation = useMutation(),
    deleting = type === "delete",
    reset = type === "password",
    title = deleting
      ? "حذف الموظف"
      : reset
        ? "تغيير كلمة مرور الموظف"
        : employee.isActive
          ? "إيقاف الموظف"
          : "تنشيط الموظف";
  async function submit(e) {
    e.preventDefault();
    if (uncertain) return;
    await mutation.run(async () => {
      if (!committed) {
        if (reset && password.length < 8)
          throw new Error("كلمة المرور لا تقل عن 8 أحرف.");
        let result;
        try {
          result = await adminRequest(
            staffPath(employee.id) +
              (reset ? "/reset-password" : deleting ? "" : "/status"),
            {
              method: reset ? "POST" : deleting ? "DELETE" : "PATCH",
              ...(!deleting
                ? {
                    body: reset
                      ? { newPassword: password }
                      : { isActive: !employee.isActive },
                  }
                : {}),
            },
          );
        } catch (error) {
          if (reset && (!error.status || error.status >= 500))
            setUncertain(true);
          throw error;
        }
        if (reset && result.data?.changed !== true) {
          setUncertain(true);
          throw new Error("لم يؤكد الخادم تغيير كلمة المرور.");
        }
        if (deleting && result.data?.deleted !== true)
          throw new Error("لم يؤكد الخادم حذف الموظف.");
        setCommitted(true);
        setPassword("");
      }
      if (deleting) {
        const row = await readStaff(employee.id, { deleted: true });
        if (!row.deletedAt) throw new Error("لم يتم تأكيد حذف الموظف.");
      } else if (!reset) {
        const row = await readStaff(employee.id);
        verifyStaff(row, { isActive: !employee.isActive });
      }
      await onSaved();
      onClose();
    });
  }
  return (
    <PricingDialog title={title} onClose={onClose} busy={mutation.busy}>
      <form className="staff-api-form" onSubmit={submit}>
        <p>{employee.name || employee.email}</p>
        {deleting && (
          <p className="staff-api-note">
            الحساب هيتوقف نهائيًا، وبياناته هتفضل محفوظة في سجل النشاط.
          </p>
        )}
        {reset ? (
          <>
            <p className="staff-api-note">
              تغيير كلمة المرور بينهي جلسات دخول الموظف.
            </p>
            {!committed && (
              <Field
                label="كلمة المرور الجديدة"
                type="password"
                value={password}
                onChange={setPassword}
                disabled={mutation.busy}
              />
            )}
          </>
        ) : (
          !deleting && (
            <p className="staff-api-note">
              هيتم {employee.isActive ? "إيقاف" : "تنشيط"} الحساب على الخادم.
            </p>
          )
        )}
        <Feedback mutation={mutation} />
        {uncertain && (
          <p role="alert">
            نتيجة تغيير كلمة المرور غير مؤكدة؛ راجعها قبل تكرار العملية.
          </p>
        )}
        {committed && (
          <p className="staff-api-note">
            تم إرسال العملية؛ إعادة المحاولة هتحدّث البيانات فقط.
          </p>
        )}
        <div className="quote-modal-buttons">
          <button
            className={deleting ? "primary danger" : "pricing-primary"}
            disabled={mutation.busy || uncertain}
          >
            {committed ? "تحديث البيانات" : "تأكيد"}
          </button>
          <button
            className="pricing-back"
            type="button"
            onClick={onClose}
            disabled={mutation.busy}
          >
            إلغاء
          </button>
        </div>
      </form>
    </PricingDialog>
  );
}
