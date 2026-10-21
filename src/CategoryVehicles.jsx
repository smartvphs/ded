import React, { useState } from "react";
import { ChevronDown, ChevronUp, Search, Plus } from "lucide-react";
import CategoryIcon from "./CategoryIcon";
import { CategoryActions, CategoryState, CategoryImage } from "./category-ui";
import useCatalogRows from "./use-catalog-rows";
import { categoryName, isActive } from "./category-api";
function MakeModels({
  make,
  revision,
  onEdit,
  onDelete,
  onStatus,
  onView,
  onSessionExpired,
  fields,
  busy,
}) {
  const models = useCatalogRows(
    "/api/cars/admin/makes/" + encodeURIComponent(make.id) + "/models",
    revision,
  );
  const variants = useCatalogRows(
    "/api/cars/admin/variants?makeId=" + encodeURIComponent(make.id),
    revision,
  );
  const rows = models.data?.data || [],
    cars = variants.data?.data || [];
  return (
    <div className="cm-cars">
      <CategoryState resource={models} onSessionExpired={onSessionExpired} />
      <CategoryState resource={variants} onSessionExpired={onSessionExpired} />
      {rows.map((model) => (
        <div
          className={"cm-car " + (!isActive(model) ? "cm-hidden" : "")}
          key={model.id}
        >
          <div className="cm-car-heading">
            <div>
              <span className="cm-car-icon">
                {model.image_url ? (
                  <CategoryImage src={model.image_url} />
                ) : (
                  <CategoryIcon name="car" size={22} />
                )}
              </span>
              <span>
                <small>الموديل</small>
                <b>{categoryName(model)}</b>
              </span>
            </div>
            <CategoryActions
              label={categoryName(model)}
              trash
              active={isActive(model)}
              disabled={busy}
              onView={() => onView(categoryName(model), model)}
              onEdit={() =>
                onEdit({
                  type: "model",
                  title: "تعديل الموديل",
                  row: model,
                  path: "/api/cars/models/" + model.id,
                  method: "PUT",
                  verifyPath: "/api/cars/admin/makes/" + make.id + "/models",
                })
              }
              onDelete={() =>
                onDelete(
                  "/api/cars/models/" + model.id,
                  categoryName(model),
                  "/api/cars/admin/makes/" + make.id + "/models",
                  model.id,
                )
              }
              onStatus={() =>
                onStatus(
                  "/api/cars/models/" + model.id + "/status",
                  !isActive(model),
                )
              }
            />
          </div>
          {cars
            .filter((c) => c.model_id === model.id)
            .map((car) => (
              <div
                className={
                  "cm-api-variant " + (!isActive(car) ? "cm-hidden" : "")
                }
                key={car.id}
              >
                <div className="cm-car-meta">
                  <span>
                    <CategoryIcon name="engine" size={16} />
                    المحرك {car.engine || "—"}
                  </span>
                  <span>
                    <CategoryIcon name="transmission" size={16} />
                    ناقل الحركة {car.transmission || "—"}
                  </span>
                  <span>
                    <CategoryIcon name="car" size={16} />
                    الفئة {car.trim || "—"}
                  </span>
                  <span>
                    <CategoryIcon name="calendar" size={16} />
                    سنوات الصنع من {car.year_from ?? "—"} إلى{" "}
                    {car.year_to ?? "—"}
                  </span>
                </div>
                <CategoryActions
                  label={
                    "السيارة " +
                    categoryName(model) +
                    " " +
                    car.year_from +
                    " " +
                    car.year_to
                  }
                  trash
                  active={isActive(car)}
                  disabled={busy}
                  onView={() => onView(categoryName(model), car)}
                  onEdit={() =>
                    onEdit({
                      type: "variant",
                      title: "تعديل السيارة",
                      row: car,
                      models: rows,
                      fields,
                      path: "/api/cars/admin/variants/" + car.id,
                      method: "PUT",
                      verifyPath: "/api/cars/admin/variants?makeId=" + make.id,
                    })
                  }
                  onDelete={() =>
                    onDelete(
                      "/api/cars/admin/variants/" + car.id,
                      "السيارة",
                      "/api/cars/admin/variants?makeId=" + make.id,
                      car.id,
                    )
                  }
                  onStatus={() =>
                    onStatus(
                      "/api/cars/admin/variants/" + car.id + "/status",
                      !isActive(car),
                    )
                  }
                />
              </div>
            ))}
          {!variants.loading &&
            !variants.error &&
            !cars.some((c) => c.model_id === model.id) && (
              <p className="cm-api-muted">
                لم تتم إضافة سنوات ومواصفات لهذا الموديل.
              </p>
            )}
          <button
            className="cm-add-car"
            disabled={busy}
            onClick={() =>
              onEdit({
                type: "variant",
                title: "إضافة سيارة",
                models: [model],
                fields,
                verifyPath: "/api/cars/admin/variants?makeId=" + make.id,
              })
            }
          >
            <Plus size={14} />
            إضافة سيارة
          </button>
        </div>
      ))}
      {!models.loading && !models.error && !rows.length && (
        <p className="cm-api-muted">لا توجد موديلات مسجلة للشركة.</p>
      )}
      <button
        className="cm-add-car"
        disabled={busy || models.loading || !!models.error}
        onClick={() =>
          onEdit({
            type: "model",
            title: "إضافة موديل",
            path: "/api/cars/makes/" + make.id + "/models",
            verifyPath: "/api/cars/admin/makes/" + make.id + "/models",
          })
        }
      >
        <Plus size={14} />
        إضافة موديل
      </button>
    </div>
  );
}
export default function CategoryVehicles({
  makes,
  revision,
  onEdit,
  onDelete,
  onStatus,
  onView,
  onSessionExpired,
  fields,
  busy,
}) {
  const [open, setOpen] = useState({}),
    [search, setSearch] = useState(""),
    [query, setQuery] = useState("");
  // Backend search covers both make names and model names, including unloaded accordions.
  const filtered = useCatalogRows(
    query ? "/api/cars/admin/makes?search=" + encodeURIComponent(query) : null,
    revision,
  );
  React.useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);
  const resource = query ? filtered : makes,
    rows = resource.data?.data || [];
  return (
    <section className="cm-section cm-companies">
      <div className="cm-section-heading">
        <h2>شركات السيارات</h2>
        <button
          className="pricing-primary"
          disabled={busy}
          onClick={() =>
            onEdit({
              type: "make",
              title: "إضافة شركة جديدة",
              path: "/api/cars/makes",
              verifyPath: "/api/cars/admin/makes",
            })
          }
        >
          <Plus size={14} />
          إضافة شركة
        </button>
      </div>
      <label className="cm-company-search">
        <Search size={15} />
        <input
          aria-label="ابحث عن شركة أو سيارة"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث عن شركة أو سيارة..."
        />
      </label>
      <CategoryState resource={resource} onSessionExpired={onSessionExpired} />
      {rows.map((make, i) => {
        const expanded = open[make.id] ?? i === 0;
        return (
          <article
            className={
              "cm-company " + (!isActive(make) ? "cm-api-inactive" : "")
            }
            key={make.id}
          >
            <div className="cm-company-title">
              <button
                onClick={() =>
                  setOpen((old) => ({ ...old, [make.id]: !expanded }))
                }
              >
                <span className="cm-company-avatar">
                  {make.logo_url ? (
                    <CategoryImage src={make.logo_url} />
                  ) : (
                    <CategoryIcon name="car" size={24} />
                  )}
                </span>
                <span>
                  <b>{categoryName(make)}</b>
                  <small>
                    {make.models_count ?? "—"} موديل ·{" "}
                    {make.variants_count ?? "—"} سيارة
                    {!isActive(make) ? " · مخفية" : ""}
                    {make.is_coming_soon ? " · قريبًا" : ""}
                  </small>
                </span>
              </button>
              <div className="cm-company-actions">
                <CategoryActions
                  label={categoryName(make)}
                  trash
                  active={isActive(make)}
                  disabled={busy}
                  onView={() => onView(categoryName(make), make)}
                  onEdit={() =>
                    onEdit({
                      type: "make",
                      title: "تعديل الشركة",
                      row: make,
                      path: "/api/cars/makes/" + make.id,
                      method: "PUT",
                      verifyPath: "/api/cars/admin/makes",
                    })
                  }
                  onDelete={() =>
                    onDelete(
                      "/api/cars/makes/" + make.id,
                      categoryName(make),
                      "/api/cars/admin/makes",
                      make.id,
                    )
                  }
                  onStatus={() =>
                    onStatus(
                      "/api/cars/makes/" + make.id + "/status",
                      !isActive(make),
                    )
                  }
                />
                <button
                  aria-label={
                    (expanded ? "طي شركة " : "فتح شركة ") + categoryName(make)
                  }
                  onClick={() =>
                    setOpen((old) => ({ ...old, [make.id]: !expanded }))
                  }
                >
                  {expanded ? (
                    <ChevronUp size={15} />
                  ) : (
                    <ChevronDown size={15} />
                  )}
                </button>
              </div>
            </div>
            {expanded && (
              <MakeModels
                make={make}
                {...{
                  revision,
                  onEdit,
                  onDelete,
                  onStatus,
                  onView,
                  onSessionExpired,
                  fields,
                  busy,
                }}
              />
            )}
          </article>
        );
      })}
      {!resource.loading && !resource.error && !rows.length && (
        <p className="cm-api-muted">لا توجد شركات مطابقة.</p>
      )}
    </section>
  );
}
