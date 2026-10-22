import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, ChartNoAxesCombined } from "lucide-react";
import { changePermissionKeys, permissionKeys } from "./staff-api";
function Check({ checked, partial, disabled, onChange, label, title }) {
  const ref = useRef();
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!partial;
  }, [partial]);
  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label={label}
      title={title}
      checked={checked}
      disabled={disabled}
      onChange={onChange}
    />
  );
}
export default function StaffPermissions({
  catalog,
  value,
  onChange,
  disabled = false,
}) {
  const [expanded, setExpanded] = useState({}),
    groups = Array.isArray(catalog?.data) ? catalog.data : [],
    matrix = Array.isArray(catalog?.meta?.matrix) ? catalog.meta.matrix : [],
    keys = permissionKeys(groups),
    selected = new Set(value),
    unknown = value.filter((key) => !keys.has(key));
  const cell = (row, mode, label) => {
    const grants = Array.isArray(row[mode]) ? row[mode] : [],
      supported =
        grants.length > 0 &&
        grants.every((key) => keys.has(key)) &&
        !row.superAdminOnly,
      any = grants.some((k) => selected.has(k)),
      all = grants.length > 0 && grants.every((k) => selected.has(k));
    return (
      <Check
        label={label + " " + row.label}
        checked={supported && all}
        partial={supported && any && !all}
        disabled={disabled || !supported}
        title={
          row.superAdminOnly
            ? "للأدمن الرئيسي فقط"
            : !supported
              ? "لا توجد صلاحية مستقلة لهذا الاختيار في تعريف الخادم"
              : grants.join("، ")
        }
        onChange={(e) =>
          onChange(changePermissionKeys(value, grants, e.target.checked))
        }
      />
    );
  };
  return (
    <>
      <div className="employee-table-scroll">
        <table className="permission-table">
          <thead>
            <tr>
              {["صلاحيات", "قراءة", "كتابة", "حذف"].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row) => (
              <tr key={row.key}>
                <td>
                  {row.label}
                  {row.superAdminOnly && (
                    <small className="staff-super-only">
                      للأدمن الرئيسي فقط
                    </small>
                  )}
                </td>
                {[
                  ["read", "قراءة"],
                  ["write", "كتابة"],
                  ["delete", "حذف"],
                ].map(([mode, label]) => (
                  <td key={mode}>{cell(row, mode, label)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="permission-demo-note">
        بعض الاختيارات بتستخدم نفس الصلاحية؛ تغييرها بيغيّر كل الاختيارات
        المرتبطة بها. الاختيارات غير المتاحة معطّلة حسب تعريف الخادم.
      </p>
      <div className="staff-permission-groups">
        {groups.map((group) => (
          <section className="permission-extra" key={group.key}>
            <button
              className="permission-extra-heading staff-group-toggle"
              type="button"
              aria-expanded={!!expanded[group.key]}
              onClick={() =>
                setExpanded((old) => ({ ...old, [group.key]: !old[group.key] }))
              }
            >
              <span className="meta-icon">
                <ChartNoAxesCombined size={18} />
              </span>
              <span>
                <b>{group.label}</b>
                <small>
                  {group.permissions.filter((p) => selected.has(p.key)).length}{" "}
                  / {group.permissions.length} صلاحية
                </small>
              </span>
              {expanded[group.key] ? (
                <ChevronUp size={14} />
              ) : (
                <ChevronDown size={14} />
              )}
            </button>
            {expanded[group.key] && (
              <div className="permission-extra-grid">
                {group.permissions.map((permission) => (
                  <label key={permission.key}>
                    <span>
                      {permission.label}
                      {permission.sensitive && (
                        <small className="staff-sensitive">صلاحية مالية</small>
                      )}
                    </span>
                    <input
                      type="checkbox"
                      aria-label={permission.label}
                      checked={selected.has(permission.key)}
                      disabled={disabled}
                      onChange={(e) =>
                        onChange(
                          changePermissionKeys(
                            value,
                            [permission.key],
                            e.target.checked,
                          ),
                        )
                      }
                    />
                  </label>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
      {unknown.length > 0 && (
        <p className="staff-api-note">
          فيه صلاحيات محفوظة مش موجودة في القائمة الحالية؛ هتفضل محفوظة بدون
          تغيير: {unknown.join("، ")}
        </p>
      )}
    </>
  );
}
