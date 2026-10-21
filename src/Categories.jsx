import React, { useEffect, useState } from "react";
import CategoryManager from "./CategoryManager";
import useAdminResource from "./use-admin-resource";
import { ResourceState } from "./orders-ui";
import { categoryKinds, categoryName } from "./category-api";
import ProductPicture from "./ProductPicture";
import "./categories.css";
const shown = (value) =>
  value == null ? "—" : Number(value).toLocaleString("en-US");
export default function Categories({ onSessionExpired }) {
  const [selected, setSelected] = useState(null),
    [revision, setRevision] = useState(0);
  const main = useAdminResource("/api/categories/admin/main", revision),
    report = useAdminResource("/api/admin/reports/categories", revision);
  const resource =
    main.data && !Array.isArray(main.data.data)
      ? { ...main, error: new Error("رد التصنيفات الرئيسية غير صالح.") }
      : main;
  useEffect(() => {
    const home = () => {
      setSelected(null);
      setRevision((n) => n + 1);
    };
    window.addEventListener("mypart:categories-home", home);
    return () => window.removeEventListener("mypart:categories-home", home);
  }, []);
  const rows = Array.isArray(main.data?.data) ? main.data.data : [];
  if (selected)
    return (
      <CategoryManager
        key={selected.id}
        category={selected}
        kind={categoryKinds[selected.sort_order]}
        onBack={() => {
          setSelected(null);
          setRevision((n) => n + 1);
        }}
        onChanged={() => setRevision((n) => n + 1)}
        onSessionExpired={onSessionExpired}
      />
    );
  return (
    <section className="categories-content">
      <h1>التصنيفات الرئيسية</h1>
      <ResourceState resource={resource} onLogin={onSessionExpired} />
      <ResourceState
        resource={
          report.data && !Array.isArray(report.data.data?.items)
            ? { ...report, error: new Error("رد إحصائيات الأقسام غير صالح.") }
            : report
        }
        onLogin={onSessionExpired}
      />
      {main.data?.meta?.warnings?.map((warning, i) => (
        <p className="cm-api-notice" role="alert" key={i}>
          {warning.type === "duplicate_sort_order"
            ? "فيه أقسام بنفس ترتيب الظهور. راجع ترتيب الأقسام."
            : warning.type === "missing_sort_order"
              ? "بعض أماكن الأقسام الستة فاضية أو مخفية."
              : "راجع إعدادات ترتيب الأقسام."}
        </p>
      ))}
      <div className="categories-panel">
        <div className="categories-grid">
          {rows.map((row) => {
            const kind = categoryKinds[row.sort_order],
              sales = report.data?.data?.items?.find(
                (item) => item.categoryId === row.id,
              );
            return (
              <button
                key={row.id}
                className={
                  "category-card category-card-button " + kind + "-category"
                }
                onClick={() => setSelected(row)}
                aria-label={"فتح تصنيف " + categoryName(row)}
              >
                <div className="category-info">
                  <h2>{categoryName(row)}</h2>
                  <p>
                    {row.description ||
                      `${shown(row.suppliers_count)} مورد، ${shown(row.cars_count)} سيارة، ${shown(row.fields_count)} مواصفة`}
                  </p>
                  <dl className="category-metrics">
                    {[
                      [
                        row.products_count,
                        row.type === "service" ? "خدمة" : "منتج",
                      ],
                      [sales?.ordersCount, "طلب خلال الفترة"],
                      [row.subcategories_count, "تصنيف فرعي"],
                    ].map(([value, label]) => (
                      <div key={label}>
                        <dt>{shown(value)}</dt>
                        <dd>{label}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
                <div className="category-image">
                  <ProductPicture src={row.icon_url} alt={categoryName(row)} />
                </div>
              </button>
            );
          })}
        </div>
        {!resource.loading && !resource.error && !rows.length && (
          <p className="pricing-empty">لا توجد أقسام رئيسية مفعلة.</p>
        )}
      </div>
      {report.data?.data?.period && (
        <p className="cm-api-period">
          أعداد الطلبات من {report.data.data.period.from} إلى{" "}
          {report.data.data.period.to} بتوقيت السعودية.
        </p>
      )}
    </section>
  );
}
