import React from "react";
import { Plus, Edit3, Eye, EyeOff } from "lucide-react";
import { CategoryActions, CategoryImage, isActive } from "./category-ui";
export function CategoryBrands({
  rows,
  kind,
  onEdit,
  onDelete,
  onStatus,
  onView,
  busy,
}) {
  return (
    <section className="cm-section">
      <div className="cm-section-heading">
        <h2>العلامات التجارية</h2>
        <button
          className="pricing-primary"
          disabled={busy}
          onClick={() =>
            onEdit({
              type: "brand",
              title: "إضافة ماركة",
              brandCategory: kind,
              path: "/api/brands",
              verifyPath: "/api/brands?category=" + kind,
            })
          }
        >
          <Plus size={14} />
          إضافة ماركة
        </button>
      </div>
      <div className="cm-brands">
        {rows.map((row) => (
          <div
            className={"cm-brand " + (!isActive(row) ? "cm-hidden" : "")}
            key={row.id}
          >
            {row.logo_url && (
              <CategoryImage src={row.logo_url} alt={row.name} />
            )}
            <b>{row.name || row.name_en || "—"}</b>
            <CategoryActions
              label={row.name || row.name_en}
              active={isActive(row)}
              disabled={busy}
              onView={() => onView(row.name || row.name_en, row)}
              onEdit={() =>
                onEdit({
                  type: "brand",
                  title: "تعديل الماركة",
                  row,
                  brandCategory: kind,
                  path: "/api/brands/" + row.id,
                  method: "PUT",
                  verifyPath: "/api/brands?category=" + kind,
                })
              }
              onDelete={() =>
                onDelete(
                  "/api/brands/" + row.id,
                  row.name,
                  "/api/brands?category=" + kind,
                  row.id,
                )
              }
              onStatus={() =>
                onStatus("/api/brands/" + row.id, !isActive(row), "PUT")
              }
            />
          </div>
        ))}
      </div>
      {!rows.length && (
        <p className="cm-api-muted">لا توجد ماركات مسجلة لهذا القسم.</p>
      )}
    </section>
  );
}
export function CategoryFields({ fields, onEdit, onDelete, onStatus, busy }) {
  return fields.map((field) => (
    <section
      className={
        "cm-section " + (field.isActive === false ? "cm-api-inactive" : "")
      }
      key={field.id}
    >
      <div className="cm-section-heading">
        <h2>{field.labelAr || field.labelEn || field.key}</h2>
        <div className="cm-row-actions">
          <button
            className="cm-edit"
            aria-label={"تعديل حقل " + field.labelAr}
            disabled={busy}
            onClick={() =>
              onEdit({
                type: "field",
                title: "تعديل الحقل",
                row: field,
                path: "/api/catalog-fields/" + field.id,
                method: "PUT",
                verifyPath: "/api/catalog-fields",
              })
            }
          >
            <Edit3 size={13} />
          </button>
          <button
            className="cm-edit"
            aria-label={
              (field.isActive === false ? "إظهار حقل " : "إخفاء حقل ") +
              field.labelAr
            }
            disabled={busy}
            onClick={() =>
              onStatus(
                "/api/catalog-fields/" + field.id,
                field.isActive === false,
                "PUT",
              )
            }
          >
            {field.isActive === false ? (
              <Eye size={13} />
            ) : (
              <EyeOff size={13} />
            )}
          </button>
        </div>
      </div>
      <div className="cm-chips">
        {(field.options || []).map((row) => (
          <span
            className={
              "cm-chip cm-api-option " +
              (row.isActive === false ? "cm-hidden" : "")
            }
            key={row.id}
          >
            {row.imageUrl && <CategoryImage src={row.imageUrl} />}
            <b>{row.labelAr || row.labelEn || row.value}</b>
            <CategoryActions
              label={
                (field.labelAr || field.key) + " " + (row.labelAr || row.value)
              }
              active={row.isActive !== false}
              disabled={busy}
              onEdit={() =>
                onEdit({
                  type: "option",
                  title: "تعديل الاختيار",
                  row,
                  field,
                  path:
                    "/api/catalog-fields/" + field.id + "/options/" + row.id,
                  method: "PUT",
                  verifyPath: "/api/catalog-fields",
                })
              }
              onDelete={() =>
                onDelete(
                  "/api/catalog-fields/" + field.id + "/options/" + row.id,
                  row.labelAr || row.value,
                  "/api/catalog-fields",
                  row.id,
                  field.id,
                )
              }
              onStatus={() =>
                onStatus(
                  "/api/catalog-fields/" +
                    field.id +
                    "/options/" +
                    row.id +
                    "/status",
                  row.isActive === false,
                )
              }
            />
          </span>
        ))}
      </div>
      {!field.options?.length && (
        <p className="cm-api-muted">لا توجد اختيارات مسجلة.</p>
      )}
      <button
        className="cm-add-car"
        disabled={busy || field.isActive === false}
        onClick={() =>
          onEdit({
            type: "option",
            title: "إضافة " + (field.labelAr || field.key),
            field,
            path: "/api/catalog-fields/" + field.id + "/options",
            verifyPath: "/api/catalog-fields",
          })
        }
      >
        <Plus size={14} />
        إضافة اختيار
      </button>
    </section>
  ));
}
