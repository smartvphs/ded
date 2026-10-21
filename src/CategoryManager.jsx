import React, { useState } from "react";
import { ArrowRight, Plus, Edit3 } from "lucide-react";
import CategoryIcon from "./CategoryIcon";
import CategoryAnalytics from "./CategoryAnalytics";
import CategoryVehicles from "./CategoryVehicles";
import { CategoryBrands, CategoryFields } from "./CategoryCatalog";
import CategoryForm from "./CategoryForm";
import {
  CategoryActions,
  CategoryState,
  CategoryDetails,
  CategoryConfirm,
} from "./category-ui";
import { useMutation, Feedback } from "./ProductExtras";
import useCatalogRows from "./use-catalog-rows";
import { adminRequest } from "./admin-api";
import {
  brandKinds,
  categoryName,
  isActive,
  catalogRows,
  linkedYears,
  confirmCatalogSave,
} from "./category-api";
import "./category-manager.css";
const value = (n) => (n == null ? "—" : Number(n).toLocaleString("en-US"));
function containsId(rows, id, fieldId) {
  return fieldId
    ? rows.find((r) => r.id === fieldId)?.options?.some((r) => r.id === id)
    : rows.some((r) => r.id === id);
}
export default function CategoryManager({
  category,
  kind,
  onBack,
  onChanged,
  onSessionExpired,
}) {
  const [revision, setRevision] = useState(0),
    [tab, setTab] = useState("manage"),
    [config, setConfig] = useState(null),
    [confirm, setConfirm] = useState(null),
    [view, setView] = useState(null),
    [name, setName] = useState(""),
    [root, setRoot] = useState(category);
  const mutation = useMutation(),
    vehicle = kind === "parts" || kind === "used",
    brandCategory = brandKinds[kind];
  const subsPath =
    "/api/categories/admin?parentId=" + encodeURIComponent(category.id);
  const subs = useCatalogRows(subsPath, revision),
    allCategories = useCatalogRows("/api/categories/admin", revision),
    fieldsResource = useCatalogRows("/api/catalog-fields", revision),
    brands = useCatalogRows(
      brandCategory ? "/api/brands?category=" + brandCategory : null,
      revision,
    ),
    makes = useCatalogRows(vehicle ? "/api/cars/admin/makes" : null, revision),
    variants = useCatalogRows(
      vehicle ? "/api/cars/admin/variants" : null,
      revision,
    );
  const rows = subs.data?.data || [],
    fields = fieldsResource.data?.data || [],
    ownFields = fields.filter((f) => f.categoryId === category.id),
    current =
      allCategories.data?.data?.find((row) => row.id === category.id) || root;
  async function refresh() {
    const response = await adminRequest("/api/categories/admin");
    if (!Array.isArray(response.data))
      throw new Error("تعذر تحديث بيانات التصنيفات.");
    const next = response.data.find((r) => r.id === category.id);
    if (next) setRoot(next);
    setRevision((n) => n + 1);
    onChanged?.();
  }
  async function saved(id, body) {
    const response = await catalogRows(config.verifyPath || subsPath);
    if (
      id &&
      !containsId(
        response.data,
        id,
        config.type === "option" ? config.field.id : undefined,
      )
    )
      throw new Error(
        "تم الحفظ، لكن تعذر تأكيد ظهور العنصر. حدّث القائمة قبل إعادة الإضافة.",
      );
    const item =
      config.type === "option"
        ? response.data
            .find((f) => f.id === config.field.id)
            ?.options?.find((r) => r.id === id)
        : response.data.find((r) => r.id === id);
    confirmCatalogSave(config.type, item, body);
    await refresh();
    setName("");
    mutation.setNotice("تم حفظ البيانات وتأكيدها من الخادم.");
  }
  const status = (path, active, method = "PATCH") =>
    mutation.run(async () => {
      await adminRequest(path, { method, body: { isActive: active } });
      await refresh();
      mutation.setNotice(active ? "تم إظهار العنصر." : "تم إخفاء العنصر.");
    });
  const askDelete = (path, label, verifyPath, id, fieldId) =>
    setConfirm({ path, label, verifyPath, id, fieldId, done: false });
  async function remove() {
    await mutation.run(async () => {
      if (!confirm.done) {
        await adminRequest(confirm.path, { method: "DELETE" });
        setConfirm((old) => ({ ...old, done: true }));
      }
      const response = await catalogRows(confirm.verifyPath);
      if (containsId(response.data, confirm.id, confirm.fieldId))
        throw new Error("لم يتم تأكيد الحذف من الخادم. حدّث القائمة.");
      await refresh();
      setConfirm(null);
      mutation.setNotice("تم حذف العنصر وتحديث القائمة.");
    });
  }
  const actions = {
    onEdit: setConfig,
    onDelete: askDelete,
    onStatus: status,
    onView: (title, row) => setView({ title, row }),
    busy: mutation.busy,
  };
  const totalModels = makes.data?.data?.every((m) => m.models_count != null)
    ? makes.data.data.reduce((sum, m) => sum + Number(m.models_count), 0)
    : null;
  const stats = vehicle
    ? [
        [makes.data?.data?.length, "شركة سيارات", "blue", "car"],
        [totalModels, "موديل سيارة", "green", "car"],
        [
          variants.data ? linkedYears(variants.data.data) : null,
          "سنة صنع مرتبطة",
          "pink",
          "calendar",
        ],
        [current.products_count, "منتج مرتبط", "yellow", "package"],
        [subs.data?.data?.length, "تصنيف فرعي", "purple", "categories"],
      ]
    : [
        [
          current.products_count,
          current.type === "service" ? "خدمة" : "منتج مرتبط",
          "blue",
          "package",
        ],
        [current.suppliers_count, "مورد مرتبط", "green", "categories"],
        [current.cars_count, "سيارة متوافقة", "pink", "car"],
        [subs.data?.data?.length, "تصنيف فرعي", "purple", "categories"],
        [
          fieldsResource.data ? ownFields.length : null,
          "حقل مواصفات",
          "yellow",
          "categories",
        ],
      ];
  const renderRows = () => (
    <section className="cm-section">
      <h2>{vehicle ? "تصنيفات القطع" : "التصنيفات الفرعية"}</h2>
      <CategoryState resource={subs} onSessionExpired={onSessionExpired} />
      <div className="cm-row-list">
        {rows.map((row) => (
          <div
            className={"cm-row-wrapper " + (!isActive(row) ? "cm-hidden" : "")}
            key={row.id}
          >
            <div className="cm-list-row">
              <button
                className="cm-row-label"
                onClick={() => setView({ title: categoryName(row), row })}
              >
                <b>{categoryName(row)}</b>
                <small>
                  {value(row.products_count)}{" "}
                  {current.type === "service" ? "خدمة" : "منتج"}
                  {!isActive(row) ? " · مخفي" : ""}
                </small>
              </button>
              <CategoryActions
                label={categoryName(row)}
                active={isActive(row)}
                disabled={mutation.busy}
                onView={() => setView({ title: categoryName(row), row })}
                onEdit={() =>
                  setConfig({
                    type: "category",
                    title: "تعديل التصنيف",
                    row,
                    path: "/api/categories/" + row.id,
                    method: "PUT",
                    verifyPath: subsPath,
                  })
                }
                onDelete={() =>
                  askDelete(
                    "/api/categories/" + row.id,
                    categoryName(row),
                    subsPath,
                    row.id,
                  )
                }
                onStatus={() =>
                  status(
                    "/api/categories/" + row.id + "/status",
                    !isActive(row),
                  )
                }
              />
            </div>
          </div>
        ))}
      </div>
      {!subs.loading && !subs.error && !rows.length && (
        <p className="cm-api-muted">لا توجد تصنيفات فرعية مسجلة.</p>
      )}
      <form
        className="cm-inline-form"
        onSubmit={(e) => {
          e.preventDefault();
          setConfig({
            type: "category",
            title: "إضافة تصنيف فرعي",
            row: { name_ar: name },
            parentId: category.id,
            path: "/api/categories",
            verifyPath: subsPath,
          });
        }}
      >
        <label>
          <span>إضافة التصنيف*</span>
          <div className="cm-inline-input">
            <input
              aria-label="اسم التصنيف الجديد"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="اسم التصنيف"
            />
            <button
              aria-label="إضافة التصنيف"
              disabled={mutation.busy || subs.loading || !!subs.error}
            >
              <Plus size={20} />
            </button>
          </div>
        </label>
      </form>
    </section>
  );
  return (
    <div
      className={
        "category-management " +
        (vehicle ? "cm-vehicle-management " : "") +
        (kind === "used" ? "cm-used-management" : "")
      }
    >
      <div className="cm-page-heading">
        <h1>{categoryName(current)}</h1>
        <div className="cm-api-heading-actions">
          <button
            className="cm-edit-root"
            onClick={() =>
              setConfig({
                type: "category",
                title: "تعديل بيانات القسم",
                row: current,
                path: "/api/categories/" + category.id,
                method: "PUT",
                verifyPath: "/api/categories/admin",
              })
            }
          >
            <Edit3 size={14} />
            تعديل بيانات القسم
          </button>
          <button onClick={onBack}>
            <ArrowRight size={16} />
            التصنيفات الرئيسية
          </button>
        </div>
      </div>
      {kind === "parts" && (
        <div className="cm-tabs">
          <button
            className={tab === "manage" ? "selected" : ""}
            onClick={() => setTab("manage")}
          >
            <CategoryIcon name="link" size={15} />
            سوق قطع الغيار
          </button>
          <button
            className={tab === "analytics" ? "selected" : ""}
            onClick={() => setTab("analytics")}
          >
            <CategoryIcon name="chart" size={15} />
            الإحصائيات والتحليلات
          </button>
        </div>
      )}
      {tab === "analytics" ? (
        <CategoryAnalytics onSessionExpired={onSessionExpired} />
      ) : (
        <>
          <div className="cm-stats">
            {stats.map(([n, label, color, icon]) => (
              <div className={"cm-stat " + color} key={label}>
                <span className="stat-icon">
                  <CategoryIcon name={icon} size={20} />
                </span>
                <b>{value(n)}</b>
                <span>{label}</span>
              </div>
            ))}
          </div>
          <div className="cm-api-feedback">
            <Feedback mutation={mutation} />
          </div>
          <CategoryState
            resource={allCategories}
            onSessionExpired={onSessionExpired}
          />
          {vehicle ? (
            <>
              <CategoryState
                resource={variants}
                onSessionExpired={onSessionExpired}
              />
              <div className="cm-parts-layout">
                <CategoryVehicles
                  {...actions}
                  makes={makes}
                  revision={revision}
                  fields={fields}
                  onSessionExpired={onSessionExpired}
                />
                <aside className="cm-parts-sidebar">
                  {renderRows()}
                  <div className="cm-tip">
                    <b>كيفية الإدارة</b>
                    <ul>
                      <li>اضغط على شركة لعرض موديلاتها وسياراتها</li>
                      <li>أضف الموديل، وبعدها السيارة بسنواتها ومواصفاتها</li>
                      <li>شركات وموديلات السيارات مشتركة بين أقسام المنصة</li>
                      <li>تصنيفات القطع مرتبطة بالقسم الحالي</li>
                    </ul>
                  </div>
                </aside>
              </div>
            </>
          ) : (
            renderRows()
          )}
          {brandCategory && (
            <>
              <CategoryState
                resource={brands}
                onSessionExpired={onSessionExpired}
              />
              {brands.data && (
                <CategoryBrands
                  rows={brands.data.data}
                  kind={brandCategory}
                  {...actions}
                />
              )}
            </>
          )}
          <CategoryState
            resource={fieldsResource}
            onSessionExpired={onSessionExpired}
          />
          {fieldsResource.data && (
            <CategoryFields fields={ownFields} {...actions} />
          )}{" "}
          {vehicle && fieldsResource.data && (
            <CategoryFields
              fields={fields.filter(
                (f) =>
                  f.categoryId == null &&
                  ["engine", "transmission"].includes(f.key),
              )}
              {...actions}
            />
          )}
        </>
      )}
      {config && (
        <CategoryForm
          key={config.type + ":" + (config.row?.id || "new")}
          config={config}
          onClose={() => setConfig(null)}
          onSaved={saved}
        />
      )}
      {confirm && (
        <CategoryConfirm
          title={"حذف " + confirm.label + "؟"}
          busy={mutation.busy}
          error={mutation.error}
          onClose={() => setConfirm(null)}
          onConfirm={remove}
        />
      )}{" "}
      {view && <CategoryDetails {...view} onClose={() => setView(null)} />}
    </div>
  );
}
