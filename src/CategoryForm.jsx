import React, { useState } from "react";
import { PricingDialog } from "./pricing-ui";
import { useMutation, Feedback } from "./ProductExtras";
import { adminRequest } from "./admin-api";
import { uploadContentImage } from "./definitions-api";
import { variantBody, optionBody, sortValue } from "./category-api";
const readImage = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("تعذر قراءة الصورة."));
    reader.readAsDataURL(file);
  });
export default function CategoryForm({ config, onClose, onSaved }) {
  const {
    type,
    row = {},
    path,
    method = "POST",
    parentId,
    brandCategory,
    field,
    models = [],
    fields = [],
  } = config;
  const [draft, setDraft] = useState({
    nameAr: row.name_ar ?? row.name ?? "",
    nameEn: row.name_en ?? "",
    description: row.description ?? "",
    descriptionEn: row.description_en ?? "",
    image: row.icon_url ?? row.logo_url ?? row.imageUrl ?? "",
    sortOrder: row.sort_order ?? row.sortOrder ?? 0,
    modelId: row.model_id ?? models[0]?.id ?? "",
    yearFrom: row.year_from ?? "",
    yearTo: row.year_to ?? "",
    trim: row.trim ?? "",
    engine: row.engine ?? "",
    transmission: row.transmission ?? "",
    value: row.value ?? "",
    labelAr: row.labelAr ?? "",
    labelEn: row.labelEn ?? "",
    isComingSoon: row.is_coming_soon ?? false,
  });
  const [file, setFile] = useState(null),
    [fileError, setFileError] = useState(""),
    [savedId, setSavedId] = useState(null),
    [savedBody, setSavedBody] = useState(null),
    [uncertain, setUncertain] = useState(false),
    mutation = useMutation();
  const set = (key, value) => setDraft((old) => ({ ...old, [key]: value }));
  const input = (key, label, options = {}) => (
    <label className="cm-field">
      <span>{label}</span>
      <input
        aria-label={label}
        value={draft[key]}
        disabled={!!savedId}
        onChange={(e) => set(key, e.target.value)}
        {...options}
      />
    </label>
  );
  async function save(e) {
    e.preventDefault();
    if (uncertain) return;
    await mutation.run(async () => {
      if (savedId) {
        await onSaved(savedId, savedBody);
        onClose();
        return;
      }
      let body;
      if (type === "variant") {
        if (!draft.modelId && !row.id) throw new Error("اختر موديل السيارة.");
        body = variantBody(draft);
      } else if (type === "option") body = optionBody(draft, field);
      else if (type === "field") {
        if (!draft.labelAr.trim()) throw new Error("أدخل اسم الحقل.");
        body = {
          labelAr: draft.labelAr.trim(),
          labelEn: draft.labelEn.trim() || null,
          sortOrder: sortValue(draft.sortOrder),
        };
      } else {
        if (!draft.nameAr.trim()) throw new Error("أدخل الاسم.");
        body =
          type === "brand"
            ? {
                name: draft.nameAr.trim(),
                nameEn: draft.nameEn.trim() || null,
                category: brandCategory,
              }
            : {
                nameAr: draft.nameAr.trim(),
                nameEn: draft.nameEn.trim() || null,
              };
        if (type === "category")
          Object.assign(body, {
            description: draft.description.trim() || null,
            descriptionEn: draft.descriptionEn.trim() || null,
            sortOrder: sortValue(draft.sortOrder),
            ...(method === "POST" ? { parentId } : {}),
          });
        if (type === "make") body.isComingSoon = draft.isComingSoon;
      }
      let imageUrl = draft.image;
      if (file) {
        const image = await uploadContentImage(
          await readImage(file),
          type === "make" ? "cars" : type === "brand" ? "brands" : "categories",
        );
        set("image", image);
        setFile(null);
        imageUrl = image;
      }
      if (type === "category") body.iconUrl = imageUrl || null;
      if (type === "make" || type === "brand") body.logoUrl = imageUrl || null;
      if (type === "option") body.imageUrl = imageUrl || null;
      const target =
        type === "variant" && method === "POST"
          ? "/api/cars/admin/models/" +
            encodeURIComponent(draft.modelId) +
            "/variants"
          : path;
      let result;
      try {
        result = await adminRequest(target, { method, body });
      } catch (error) {
        if (method === "POST" && (!error.status || error.status >= 500))
          setUncertain(true);
        throw error;
      }
      const id = result.data?.id ?? row.id;
      if (method === "POST" && !id) {
        setUncertain(true);
        throw new Error(
          "الخادم لم يُرجع رقم العنصر. راجع القائمة قبل إضافة نفس العنصر مرة أخرى.",
        );
      }
      setSavedId(id || true);
      setSavedBody(body);
      await onSaved(id, body);
      onClose();
    });
  }
  return (
    <PricingDialog title={config.title} onClose={onClose} busy={mutation.busy}>
      <form onSubmit={save}>
        <fieldset className="cm-api-fieldset" disabled={mutation.busy}>
          {type === "variant" ? (
            <>
              <label className="cm-field">
                <span>الموديل</span>
                <select
                  aria-label="موديل السيارة"
                  value={draft.modelId}
                  disabled={method === "PUT" || !!savedId}
                  onChange={(e) => set("modelId", e.target.value)}
                >
                  <option value="">اختر الموديل</option>
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name_ar || m.name_en}
                    </option>
                  ))}
                </select>
              </label>
              <div className="cm-modal-grid">
                {input("yearFrom", "من سنة", {
                  type: "number",
                  min: 1950,
                  max: 2100,
                  required: true,
                })}
                {input("yearTo", "إلى سنة", {
                  type: "number",
                  min: 1950,
                  max: 2100,
                  required: true,
                })}
                {input("trim", "الفئة")}
                {["engine", "transmission"].map((key) => (
                  <label className="cm-field" key={key}>
                    <span>{key === "engine" ? "المحرك" : "ناقل الحركة"}</span>
                    <input
                      aria-label={key === "engine" ? "المحرك" : "ناقل الحركة"}
                      value={draft[key]}
                      onChange={(e) => set(key, e.target.value)}
                      list={"cm-" + key}
                    />
                    <datalist id={"cm-" + key}>
                      {fields
                        .find((f) => f.key === key)
                        ?.options?.filter((o) => o.isActive !== false)
                        .map((o) => (
                          <option key={o.id} value={o.value}>
                            {o.labelAr || o.value}
                          </option>
                        ))}
                    </datalist>
                  </label>
                ))}
              </div>
            </>
          ) : type === "option" ? (
            <>
              {input("value", "القيمة المحفوظة", { required: true })}
              {input("labelAr", "الاسم بالعربي")}
              {input("labelEn", "الاسم بالإنجليزي")}
              {input("sortOrder", "الترتيب", { type: "number", min: 0 })}
            </>
          ) : type === "field" ? (
            <>
              {input("labelAr", "اسم الحقل بالعربي", { required: true })}
              {input("labelEn", "اسم الحقل بالإنجليزي")}
              {input("sortOrder", "الترتيب", { type: "number", min: 0 })}
            </>
          ) : (
            <>
              {input(
                "nameAr",
                type === "model"
                  ? "اسم الموديل"
                  : type === "make"
                    ? "اسم الشركة"
                    : type === "brand"
                      ? "اسم الماركة"
                      : "اسم التصنيف",
                { required: true },
              )}
              {input("nameEn", "الاسم بالإنجليزي")}
              {type === "category" && (
                <>
                  {input("description", "الوصف")}
                  {input("descriptionEn", "الوصف بالإنجليزي")}
                  {input("sortOrder", "الترتيب", { type: "number", min: 0 })}
                </>
              )}
              {type === "make" && (
                <label className="cm-api-checkbox">
                  <input
                    type="checkbox"
                    checked={draft.isComingSoon}
                    onChange={(e) => set("isComingSoon", e.target.checked)}
                  />
                  قريبًا
                </label>
              )}
            </>
          )}
          {["category", "make", "brand", "option"].includes(type) && (
            <label className="cm-field">
              <span>الصورة</span>
              {draft.image && (
                <img
                  className="cm-upload-preview"
                  src={draft.image}
                  alt="الصورة الحالية"
                />
              )}
              <input
                type="file"
                disabled={!!savedId}
                aria-label="رفع صورة"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => {
                  const next = e.target.files?.[0];
                  e.target.value = "";
                  if (!next) return;
                  if (
                    !["image/png", "image/jpeg", "image/webp"].includes(
                      next.type,
                    ) ||
                    next.size > 5 * 1024 * 1024
                  ) {
                    setFileError("اختر JPG أو PNG أو WebP أصغر من 5 ميجابايت.");
                    return;
                  }
                  setFileError("");
                  setFile(next);
                }}
              />
              {file && <small>{file.name}</small>}
              {(file || fileError) && (
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setFileError("");
                  }}
                >
                  إلغاء اختيار الصورة
                </button>
              )}
              {draft.image && (
                <button
                  type="button"
                  onClick={() => {
                    set("image", "");
                    setFile(null);
                  }}
                >
                  إزالة الصورة
                </button>
              )}
            </label>
          )}
          {fileError && <p role="alert">{fileError}</p>}
          <Feedback mutation={mutation} />
          {savedId && (
            <p role="status">
              تم الحفظ؛ اضغط لتحديث القائمة بدون إعادة الإضافة.
            </p>
          )}
          {uncertain && (
            <p role="alert">
              نتيجة الإضافة غير مؤكدة. اقفل النافذة وحدّث القائمة قبل إعادة
              الإضافة لتجنب التكرار.
            </p>
          )}
          <button
            className="cm-submit"
            disabled={mutation.busy || uncertain || !!fileError}
          >
            {savedId
              ? "تحديث القائمة"
              : method === "POST"
                ? "إضافة"
                : "حفظ التعديل"}
          </button>
        </fieldset>
      </form>
    </PricingDialog>
  );
}
