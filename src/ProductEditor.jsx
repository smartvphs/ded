import React, { useEffect, useRef, useState } from "react";
import "./products.css";
import {
  FileText,
  Star,
  Link,
  Settings,
  ArrowLeft,
  Upload,
  Image as ImageIcon,
  Tag,
  Hash,
  Grid2X2,
  Plus,
  Trash2,
  Package,
  Coins,
  Flame,
  ChevronDown,
} from "lucide-react";
import {
  Panel,
  Input,
  Field,
  Tags,
  Toggle,
  Money,
  Sprite,
} from "./products-ui";
import { adminRequest } from "./admin-api";
import ProductGallery from "./ProductGallery";
import useAdminResource from "./use-admin-resource";
import useOrderSuppliers from "./use-order-suppliers";
import { uploadContentImage } from "./definitions-api";
import {
  productDraft,
  productBody,
  compatibilityBody,
} from "./product-editor-model";
import { readSpecification, writeSpecification, mainProductCategories, activeVehicleOptions } from "./product-catalog";
import { catalogOptions } from "./catalog-options";
import {
  RelatedProducts,
  ProductReviews,
  ProductPrices,
  LatestPricings,
  GenerateDescription,
} from "./ProductExtras";
function Choice({ label, rows = [], value, onChange, disabled = false, emptyLabel = "-- اختر --" }) {
  return (
    <Field label={label} icon={Grid2X2}>
      <select
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{emptyLabel}</option>
        {rows.map((x) => (
          <option key={x.id} value={x.id}>
            {x.name_ar ?? x.name ?? x.name_en ?? x.label ?? x.id}
          </option>
        ))}
      </select>
      <ChevronDown size={16} className="pp-chevron" />
    </Field>
  );
}
function CatalogChoice({ fields, fieldKey, categoryId, label, value, onChange, type = "text" }) {
  const rows = catalogOptions(fields, fieldKey, categoryId, value);
  return rows ? (
    <Choice label={label} rows={rows} value={value ?? ""} onChange={onChange} />
  ) : (
    <Input label={label} aria-label={label} type={type} value={value ?? ""}
      onChange={(event) => onChange(event.target.value)} />
  );
}
function LookupMessage({ resource }) {
  return resource.error ? (
    <p role="alert">
      {resource.error.message}{" "}
      <button onClick={resource.reload}>إعادة المحاولة</button>
    </p>
  ) : resource.loading ? (
    <p role="status">جارٍ تحميل الخيارات…</p>
  ) : null;
}
function CompatibilityRow({ row, onChange, onRemove, makes, fields }) {
  const models = useAdminResource(
    row.makeId
      ? "/api/cars/admin/makes/" + encodeURIComponent(row.makeId) + "/models"
      : null,
  );
  const set = (k, v) => onChange({ ...row, [k]: v });
  return (
    <div className="pp-quality-price">
      <div className="pp-form-grid">
        <Choice
          label="الشركة"
          value={row.makeId || ""}
          rows={activeVehicleOptions(makes, row.makeId)}
          onChange={(v) => onChange({ ...row, makeId: v, modelId: "" })}
        />
        <Choice
          label="السيارة"
          value={row.modelId || ""}
          rows={activeVehicleOptions(models.data?.data, row.modelId)}
          onChange={(v) => set("modelId", v)}
        />
        {[
          ["engine", "المحرك"],
          ["transmission", "ناقل الحركة"],
          ["trim", "فئة السيارة"],
          ["yearFrom", "من سنة"],
          ["yearTo", "إلى سنة"],
        ].map(([k, label]) => (
          <CatalogChoice key={k} fields={fields} fieldKey={k} label={label}
            type={k.startsWith("year") ? "number" : "text"}
            value={row[k]} onChange={(value) => set(k, value)} />
        ))}
      </div>
      <LookupMessage resource={models} />
      <button className="pp-remove" aria-label="حذف توافق" onClick={onRemove}>
        <Trash2 size={17} />
      </button>
    </div>
  );
}
export default function ProductEditor({
  group,
  product,
  mode,
  onSaved,
  onComplete,
  initialProduct,
  onBack,
}) {
  const [id, setId] = useState(mode === "add" ? null : product.id),
    [draft, setDraft] = useState(() => ({
      ...productDraft(mode === "add" ? initialProduct : undefined),
      isActive: mode === "add",
    })),
    [baseline, setBaseline] = useState(null),
    [tab, setTab] = useState("details"),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [error, setError] = useState("");
  const [selectedImage, setSelectedImage] = useState("");
  const lock = useRef(false),
    uncertainCreate = useRef(false),
    fileInput = useRef();
  const detail = useAdminResource(
    mode === "add"
      ? null
      : "/api/products/admin/" + encodeURIComponent(product.id),
  );
  const qualityTiers = useAdminResource("/api/suppliers/quality-tiers");
  const qualityTierOptions = (Array.isArray(qualityTiers.data?.data) ? qualityTiers.data.data : []).map((row) => ({id: row.code, name: row.name || row.name_ar || row.name_en || row.code}));
  const catalog = useAdminResource("/api/catalog-fields");
  const fields = catalog.data?.data;
  const categories = useAdminResource("/api/categories/admin"),
    brands = useAdminResource(
      "/api/brands?category=" +
        {
          parts: "parts",
          oil: "oils",
          tires: "tires",
          accessories: "accessories",
          services: "parts",
        }[group] +
        "&active=true",
    );
  const suppliers = useOrderSuppliers(!id, "approved");
  const makes = useAdminResource(
    group === "parts" ? "/api/cars/admin/makes" : null,
  );
  useEffect(() => {
    if (!detail.data) return;
    const row = detail.data.data;
    if (!row || row.id !== product.id) {
      setError("رد تفاصيل المنتج غير صالح.");
      return;
    }
    try {
      for (const key of ["images", "specifications", "compatibility"])
        if (row[key] != null && !Array.isArray(row[key]))
          throw new Error("تعذر قراءة " + key + " في رد تفاصيل المنتج.");
      const d = productDraft(row);
      setDraft(d);
      setBaseline(d);
    } catch (e) {
      setError(e.message);
    }
  }, [detail.data, product.id]);
  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
  const cats = Array.isArray(categories.data?.data) ? categories.data.data : [],
    roots = mainProductCategories(cats, id ? draft.categoryId : null),
    subs = cats.filter((x) => x.parent_id === draft.categoryId);
  const brandRows = Array.isArray(brands.data?.data) ? brands.data.data : [];
  const selectableBrands =
    draft.brandId && !brandRows.some((x) => x.id === draft.brandId)
      ? [
          { id: draft.brandId, name: draft.brandName || draft.brandId },
          ...brandRows,
        ]
      : brandRows;
  const supplierRows = Array.isArray(suppliers.data?.data)
    ? suppliers.data.data
    : suppliers.data?.data?.items || [];
  const selectableSuppliers =
    draft.supplierId && !supplierRows.some((x) => x.id === draft.supplierId)
      ? [
          {
            id: draft.supplierId,
            name: draft.supplierName || draft.supplierId,
          },
          ...supplierRows,
        ]
      : supplierRows;
  const ready = mode === "add" || Boolean(baseline),
    service = group === "services";
  async function choose(files) {
    setError("");
    for (const file of files) {
      if (
        !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
        file.size > 5 * 1024 * 1024
      ) {
        setError("اختر صور JPG أو PNG أو WebP أصغر من 5 ميجابايت.");
        continue;
      }
      const url = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      setDraft((d) => ({ ...d, images: [...d.images, url] }));
    }
  }
  async function save() {
    if (lock.current || !ready) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    let currentId = id,
      stage = "validation";
    try {
      if (uncertainCreate.current)
        throw new Error(
          "نتيجة طلب الإضافة السابق غير مؤكدة. ارجع للقائمة وتحقق من وجود المنتج قبل إضافة نسخة أخرى.",
        );
      compatibilityBody(draft.compatibility);
      // Validate all fields before uploading. Data URLs are replaced only for validation.
      productBody(
        {
          ...draft,
          images: draft.images.map((x) =>
            x.startsWith("data:") ? "https://pending.invalid/image" : x,
          ),
        },
        group,
        { create: !currentId, baseline },
      );
      let submitted = { ...draft, images: [...draft.images] };
      stage = "upload";
      for (let i = 0; i < submitted.images.length; i++)
        if (submitted.images[i].startsWith("data:")) {
          submitted.images[i] = await uploadContentImage(
            submitted.images[i],
            "products",
          );
          setDraft((d) => ({ ...d, images: [...submitted.images] }));
        }
      const body = productBody(submitted, group, {
        create: !currentId,
        baseline,
      });
      stage = currentId ? "update" : "create";
      const result = await adminRequest(
        "/api/products/admin" +
          (currentId || submitted.supplierId
            ? "/" + encodeURIComponent(currentId || submitted.supplierId)
            : ""),
        { method: currentId ? "PUT" : "POST", body },
      );
      if (!currentId) {
        currentId = result.data?.id ?? result.data?.product?.id;
        if (typeof currentId !== "string" || !currentId) {
          uncertainCreate.current = true;
          throw new Error(
            "استقبل الخادم الإضافة لكن لم يُرجع رقم المنتج. تحقق من القائمة قبل إعادة الإضافة.",
          );
        }
        setId(currentId);
        setBaseline({ ...submitted, isActive: !submitted.isActive });
      }
      onSaved?.();
      stage = "compatibility";
      // Create includes compatibility; subsequent saves replace it through its own route.
      if (
        id &&
        JSON.stringify(submitted.compatibility) !==
          JSON.stringify(baseline?.compatibility)
      )
        await adminRequest(
          "/api/products/admin/" +
            encodeURIComponent(currentId) +
            "/compatibility",
          {
            method: "PUT",
            body: { compatibility: compatibilityBody(submitted.compatibility) },
          },
        );
      stage = "publication";
      if (!id || submitted.isActive !== baseline?.isActive)
        await adminRequest(
          "/api/products/admin/" + encodeURIComponent(currentId) + "/status",
          { method: "PATCH", body: { isActive: submitted.isActive } },
        );
      stage = "verify";
      const confirmed = await adminRequest(
        "/api/products/admin/" + encodeURIComponent(currentId),
      );
      if (confirmed.data?.id !== currentId)
        throw new Error("تعذر التحقق من بيانات المنتج المحفوظة.");
      const verified = productDraft(confirmed.data);
      setDraft(verified);
      setBaseline(verified);
      const published = verified.isActive && !["unpublished", "deleted"].includes(confirmed.data.status);
      setNotice(published ? "تم نشر المنتج على المنصة." : "تم حفظ المنتج بدون نشر.");
      onSaved?.();
      onComplete?.({published, id:currentId});
    } catch (e) {
      if (stage === "create" && (!e.status || e.status >= 500))
        uncertainCreate.current = true;
      const partial =
        currentId && ["compatibility", "publication", "verify"].includes(stage);
      setError(
        (partial
          ? "تم حفظ بيانات المنتج، لكن لم يكتمل " +
            {
              compatibility: "حفظ توافق السيارات",
              publication: "تحديث النشر",
              verify: "التحقق من النتيجة",
            }[stage] +
            ". أعد المحاولة لإكمال الحفظ. "
          : "") +
          e.message +
          (e.validationErrors?.length
            ? " " +
              e.validationErrors
                .map((x) => x.message)
                .filter(Boolean)
                .join("، ")
            : ""),
      );
      onSaved?.();
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const attributes =
    {
      oil: [
        ["oil_type", "نوع الزيت"],
        ["oil_viscosity", "تصنيف اللزوجة"],
        ["oil_pack_size", "حجم العبوة"],
      ],
      tires: [
        ["tire_rim_size", "مقاس الجنط"],
        ["tire_width", "العرض"],
        ["tire_aspect_ratio", "الإرتفاع"],
        ["production_week", "إسبوع الإنتاج"],
      ],
      accessories: [["installation_type", "نوع الاكسسوار"]],
    }[group] || [];
  const setAttribute = (key, value) =>
    setDraft((d) => ({
      ...d,
      specifications: writeSpecification(d.specifications, key, value),
    }));
  const input = (k, label, type = "text", icon) => (
    <Input
      key={k}
      label={label}
      aria-label={label}
      icon={icon}
      type={type}
      step={
        type === "number" && k !== "stockQuantity" && k !== "manufactureYear"
          ? "any"
          : undefined
      }
      value={draft[k]}
      onChange={(e) => set(k, e.target.value)}
    />
  );
  return (
    <div className={"pp-editor pp-editor-" + group}>
      <div className="pp-editor-heading">
        <h1>{id ? "تعديل المنتج - " + draft.name : "إضافة منتج جديد"}</h1>
        <button
          className="pp-button pp-small-button"
          disabled={busy}
          onClick={onBack}
        >
          العودة للمنتجات
          <ArrowLeft size={17} />
        </button>
      </div>
      {error && (
        <p className="op-notice" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="op-notice" role="status">
          {notice}
        </p>
      )}
      {mode !== "add" && <LookupMessage resource={detail} />}
      <div
        className="pp-editor-tabs"
        role="tablist"
        aria-label="تبويبات المنتج"
      >
        {[
          ["details", "تفاصيل المنتج", FileText],
          ["reviews", "التقييمات", Star],
          ["related", "المنتجات المرتبطة", Link],
        ].map(([key, label, Icon]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            className={tab === key ? "active" : ""}
            onClick={() => setTab(key)}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </div>
      {ready && (
        <fieldset disabled={busy} className="pp-editor-fieldset">
          <div className="pp-editor-layout">
            <div className="pp-editor-body">
              {tab === "details" ? (
                <>
                  <Panel title="الصور" className="pp-upload-panel">
                    <div
                      className="pp-upload-zone"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (!busy) choose([...e.dataTransfer.files]);
                      }}
                    >
                      <Upload size={38} />
                      <p>اسحب الصورة هنا</p>
                      <span>سحب وإسقاط صورة هنا، أو انقر لتحديد واحد</span>
                      <button
                        className="pp-button pp-small-button"
                        onClick={() => fileInput.current.click()}
                      >
                        <ImageIcon size={15} />
                        اختر الصورة
                      </button>
                      <input
                        ref={fileInput}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        multiple
                        hidden
                        onChange={(e) => {
                          choose([...e.target.files]);
                          e.target.value = "";
                        }}
                      />
                    </div>
                    <div className="pp-thumbnails">
                      {draft.images.map((url, i) => (
                        <div key={url + i} className="pp-editor-image">
                          <button type="button" className="pp-gallery-thumb" aria-label={"معاينة صورة المنتج " + (i + 1)} onClick={() => setSelectedImage(url)}>
                            <img src={url} alt={"صورة المنتج " + (i + 1)} />
                          </button>
                          <button
                            aria-label={"حذف الصورة " + (i + 1)}
                            className="pp-remove"
                            onClick={() =>
                              set(
                                "images",
                                draft.images.filter((_, n) => n !== i),
                              )
                            }
                          >
                            <Trash2 size={16} />
                          </button>
                          {i > 0 && (
                            <button
                              aria-label={"تعيين الصورة " + (i + 1) + " رئيسية"}
                              onClick={() =>
                                set("images", [
                                  url,
                                  ...draft.images.filter((_, n) => n !== i),
                                ])
                              }
                            >
                              رئيسية
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </Panel>
                  <Panel title="بيانات المنتج" className="pp-information">
                    <div className="pp-form-grid one">
                      {input("name", "الإسم الأساسي*", "text", FileText)}
                      {input("nameEn", "الإسم بالإنجليزي", "text", FileText)}
                    </div>
                    <Tags
                      label="أسماء ثانوية"
                      icon={Tag}
                      value={draft.aliases}
                      onChange={(v) => set("aliases", v)}
                      initial={[]}
                    />
                    {!id && (
                      <>
                        <Choice
                          label="المورد (اختياري؛ الافتراضي ماي بارت)"
                          emptyLabel="ماي بارت (الافتراضي)"
                          disabled={suppliers.loading || Boolean(suppliers.error)}
                          rows={selectableSuppliers}
                          value={draft.supplierId}
                          onChange={(v) =>
                            setDraft((d) => ({
                              ...d,
                              supplierId: v,
                              supplierName:
                                selectableSuppliers.find((x) => x.id === v)
                                  ?.name || "",
                            }))
                          }
                        />
                        <LookupMessage resource={suppliers} />
                      </>
                    )}
                    <Tags
                      label="أرقام ثانوية"
                      icon={Hash}
                      value={draft.altPartNumbers}
                      onChange={(v) => set("altPartNumbers", v)}
                      initial={[]}
                    />
                    <div className="pp-form-grid">
                      {input("partNumber", "رقم القطعة", "text", Hash)}
                      {input("sku", "SKU", "text", Hash)}
                      <Choice
                        label="التصنيف الرئيسي"
                        rows={roots.filter((x) => x.type !== "service")}
                        value={draft.categoryId}
                        onChange={(v) =>
                          setDraft((d) => ({
                            ...d,
                            categoryId: v,
                            subcategoryId: "",
                          }))
                        }
                      />
                      <Choice
                        label="التصنيف الفرعي"
                        rows={subs}
                        value={draft.subcategoryId}
                        onChange={(v) => set("subcategoryId", v)}
                      />
                      <Choice
                        label="الماركة"
                        rows={selectableBrands}
                        value={draft.brandId}
                        onChange={(v) => set("brandId", v)}
                      />
                      <Choice
                        label="حالة القطعة"
                        rows={[
                          { id: "new", name: "جديد" },
                          { id: "used", name: "مستعمل" },
                          { id: "refurbished", name: "مجدد" },
                        ]}
                        value={draft.condition}
                        onChange={(v) => set("condition", v)}
                      />
                      <CatalogChoice fields={fields} fieldKey="country_of_origin" categoryId={draft.categoryId}
                        label="بلد الصنع" value={draft.countryOfOrigin} onChange={(value) => set("countryOfOrigin", value)} />
                      <CatalogChoice fields={fields} fieldKey="production_year" categoryId={draft.categoryId}
                        label="سنة الإنتاج" type="number" value={draft.manufactureYear} onChange={(value) => set("manufactureYear", value)} />
                    </div>
                    <LookupMessage resource={categories} />
                    <LookupMessage resource={brands} />
                    <LookupMessage resource={catalog} />
                    {attributes.length > 0 && (
                      <div className="pp-form-grid">
                        {attributes.map(([key, label]) => {
                          const spec = readSpecification(
                            draft.specifications,
                            key,
                          );
                          return (
                            <div key={key}>
                              <CatalogChoice fields={fields} fieldKey={key} categoryId={draft.categoryId}
                                label={label} value={spec.value} onChange={(value) => setAttribute(key, value)} />
                              {spec.conflict && (
                                <p role="alert">
                                  {label}: قيم متعارضة ({spec.values.join("، ")}
                                  ). أدخل القيمة الصحيحة لتوحيدها.
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Panel>
                  {group === "parts" && (
                    <Panel
                      title="التوافق مع السيارات"
                      subtitle="الشركة . السيارة . فئة السيارة . سنوات الصنع"
                      className="pp-compatibility"
                    >
                      <Toggle
                        label="متوافق مع جميع السيارات"
                        checked={draft.isUniversal}
                        onChange={(v) => set("isUniversal", v)}
                      />
                      <LookupMessage resource={makes} />
                      {draft.compatibility.map((row, i) => (
                        <CompatibilityRow
                          key={i}
                          row={row}
                          fields={fields}
                          makes={
                            Array.isArray(makes.data?.data)
                              ? makes.data.data
                              : []
                          }
                          onChange={(v) =>
                            set(
                              "compatibility",
                              draft.compatibility.map((x, n) =>
                                n === i ? v : x,
                              ),
                            )
                          }
                          onRemove={() =>
                            set(
                              "compatibility",
                              draft.compatibility.filter((_, n) => n !== i),
                            )
                          }
                        />
                      ))}
                      <button
                        className="pp-button pp-small-button"
                        onClick={() =>
                          set("compatibility", [
                            ...draft.compatibility,
                            {
                              makeId: "",
                              modelId: "",
                              yearFrom: "",
                              yearTo: "",
                              engine: "",
                              transmission: "",
                              trim: "",
                            },
                          ])
                        }
                      >
                        <Plus size={17} />
                        إضافة توافق
                      </button>
                    </Panel>
                  )}
                  <Panel title="الجودات والأسعار" className="pp-qualities">
                    <LookupMessage resource={qualityTiers} />
                    <div className="pp-quality-price">
                      <Choice
                        label="الجودة"
                        value={draft.qualityTier}
                        rows={
                          draft.qualityTier &&
                          !qualityTierOptions.some(
                            (x) => x.id === draft.qualityTier,
                          )
                            ? [
                                ...qualityTierOptions,
                                {
                                  id: draft.qualityTier,
                                  name: draft.qualityTier,
                                },
                              ]
                            : qualityTierOptions
                        }
                        onChange={(v) => set("qualityTier", v)}
                      />
                      <div className="pp-form-grid three">
                        {input("costPrice", "سعر التكلفة", "number", Coins)}
                        {input("price", "سعر البيع*", "number", Coins)}
                        {input(
                          "discountPrice",
                          "سعر الخصم (اختياري)",
                          "number",
                          Flame,
                        )}
                        {input(
                          "stockQuantity",
                          "كمية المخزون*",
                          "number",
                          Package,
                        )}
                      </div>
                    </div>
                  </Panel>
                  <ProductPrices
                    id={id}
                    partNumber={baseline?.partNumber}
                    variants={detail.data?.data?.variants}
                    onSaved={onSaved}
                  />
                  <Panel title="الوصف والمواصفات" className="pp-description">
                    <div className="pp-description-top">
                      <span>وصف المنتج</span>
                      <GenerateDescription
                        id={id}
                        draft={draft}
                        group={group}
                        onGenerated={(v) => set("description", v)}
                      />
                    </div>
                    <textarea
                      aria-label="وصف المنتج"
                      value={draft.description}
                      onChange={(e) => set("description", e.target.value)}
                    />
                    <Input
                      label="الوصف بالإنجليزي"
                      aria-label="الوصف بالإنجليزي"
                      value={draft.descriptionEn}
                      onChange={(e) => set("descriptionEn", e.target.value)}
                    />
                    {draft.specifications.map((s, i) => (
                      <div
                        className="pp-form-grid pp-specification-row"
                        key={i}
                      >
                        <Input
                          label="اسم المواصفة"
                          aria-label={"اسم المواصفة " + (i + 1)}
                          value={s.specName}
                          onChange={(e) =>
                            set(
                              "specifications",
                              draft.specifications.map((x, n) =>
                                n === i
                                  ? { ...x, specName: e.target.value }
                                  : x,
                              ),
                            )
                          }
                        />
                        <Input
                          label="قيمة المواصفة"
                          aria-label={"قيمة المواصفة " + (i + 1)}
                          value={s.specValue}
                          onChange={(e) =>
                            set(
                              "specifications",
                              draft.specifications.map((x, n) =>
                                n === i
                                  ? { ...x, specValue: e.target.value }
                                  : x,
                              ),
                            )
                          }
                        />
                        <button
                          className="pp-remove"
                          aria-label={"حذف المواصفة " + (i + 1)}
                          onClick={() =>
                            set(
                              "specifications",
                              draft.specifications.filter((_, n) => n !== i),
                            )
                          }
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    <button
                      className="pp-button pp-small-button"
                      onClick={() => {
                        set("specifications", [
                          ...draft.specifications,
                          { specName: "", specValue: "" },
                        ]);
                      }}
                    >
                      <Plus size={16} />
                      إضافة مواصفة
                    </button>
                  </Panel>
                  <Panel title="نوع الشحن" className="pp-shipping">
                    <div>
                      {[
                        [false, "خفيف", "أقل من 15 كجم"],
                        [true, "ثقيل", "أكثر من 15 كجم"],
                      ].map(([value, title, text]) => (
                        <button
                          key={title}
                          className={draft.isBulky === value ? "selected" : ""}
                          onClick={() => set("isBulky", value)}
                        >
                          <div>
                            <b>{title}</b>
                            <span>{text}</span>
                          </div>
                          <Sprite
                            asset={value ? "shippingTruck" : "shippingBox"}
                          />
                        </button>
                      ))}
                    </div>
                  </Panel>
                </>
              ) : tab === "reviews" ? (
                <ProductReviews id={id} onSaved={onSaved} />
              ) : (
                <RelatedProducts id={id} onSaved={onSaved} />
              )}
            </div>
            <aside className="pp-editor-aside">
              <Panel title="معاينة المنتج" className="pp-preview-panel">
                <div className="pp-preview-card">
                  <ProductGallery images={draft.images} selected={selectedImage} onSelect={setSelectedImage} />
                  <h3>{draft.name || "اسم المنتج"}</h3>
                  <div className="pp-preview-price">
                    {draft.discountPrice !== "" && <del>{draft.price}</del>}
                    <b>
                      <Money>{draft.discountPrice || draft.price || "—"}</Money>
                    </b>
                  </div>
                </div>
              </Panel>
              <Panel
                title={
                  <>
                    <Settings size={20} />
                    إعدادات النشر
                  </>
                }
                className="pp-publishing"
              >
                <Toggle
                  label="الحالة"
                  checked={draft.isActive}
                  onChange={(v) => set("isActive", v)}
                  text={draft.isActive ? "منشور" : "غير منشور"}
                />
                <Toggle
                  label="عرض خاص"
                  checked={draft.isSpecialOffer}
                  onChange={(v) => set("isSpecialOffer", v)}
                />
                <Toggle
                  label="شحن مجاني"
                  checked={draft.isFreeShipping}
                  onChange={(v) => set("isFreeShipping", v)}
                />
              </Panel>
              {tab === "details" && (
                <button
                  className="pp-button pp-save"
                  disabled={busy || uncertainCreate.current}
                  onClick={save}
                >
                  {busy ? "جارٍ الحفظ…" : "حفظ"}
                  <ArrowLeft size={17} />
                </button>
              )}
              <LatestPricings id={id} />
            </aside>
          </div>
        </fieldset>
      )}
    </div>
  );
}
