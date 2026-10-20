import React, { useEffect, useRef, useState } from "react";
import { Panel, Input, Tags, Toggle, Field } from "./products-ui";
import { adminRequest } from "./admin-api";
import useAdminResource from "./use-admin-resource";
import { uploadContentImage } from "./definitions-api";
import { State, Feedback, useMutation } from "./ProductExtras";
const initial = {
  name: "",
  nameEn: "",
  description: "",
  categoryId: "",
  subcategoryId: "",
  price: "",
  durationMinutes: "60",
  locationType: "both",
  homeVisitFee: "0",
  cities: [],
  aliases: [],
  images: [],
  includes: [],
  terms: "",
  warrantyInfo: "",
  workshopAddress: "",
  workshopLat: "",
  workshopLng: "",
  workingHours: {},
  isActive: true,
};
export default function ServiceEditor({ id, onBack, onSaved }) {
  const [serviceId, setServiceId] = useState(id),
    [draft, setDraft] = useState(initial),
    [loaded, setLoaded] = useState(!id);
  const uncertain = useRef(false),
    mutation = useMutation(),
    data = useAdminResource(
      id ? "/api/suppliers/admin/services/" + encodeURIComponent(id) : null,
    ),
    categories = useAdminResource("/api/categories/admin");
  useEffect(() => {
    if (data.data) {
      const row = data.data.data;
      if (row?.id !== id) return;
      setDraft({
        ...initial,
        ...row,
        price: String(row.price ?? ""),
        durationMinutes: String(row.durationMinutes ?? 60),
        homeVisitFee: String(row.homeVisitFee ?? 0),
        images: row.images || [],
        workshopLat: String(row.workshopLat ?? ""),
        workshopLng: String(row.workshopLng ?? ""),
      });
      setLoaded(true);
    }
  }, [data.data, id]);
  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
  async function save() {
    await mutation.run(async () => {
      if (uncertain.current)
        throw new Error(
          "نتيجة الإضافة غير مؤكدة. راجع كتالوج الخدمات قبل المحاولة مجددًا.",
        );
      if (
        !draft.name.trim() ||
        !draft.description.trim() ||
        !draft.aliases.length ||
        !draft.cities.length ||
        !draft.images.length
      )
        throw new Error(
          "أكمل الاسم والوصف وأضف اسمًا ثانويًا ومدينة وصورة واحدة على الأقل.",
        );
      if (
        !Number.isFinite(Number(draft.price)) ||
        draft.price === "" ||
        Number(draft.price) < 0
      )
        throw new Error("أدخل سعرًا صحيحًا.");
      if (
        !Number.isSafeInteger(Number(draft.durationMinutes)) ||
        Number(draft.durationMinutes) < 1
      )
        throw new Error("أدخل مدة الخدمة بالدقائق.");
      const images = [...draft.images];
      for (let i = 0; i < images.length; i++)
        if (images[i].startsWith("data:")) {
          images[i] = await uploadContentImage(images[i], "products");
          set("images", [...images]);
        }
      const body = {
        name: draft.name.trim(),
        nameEn: draft.nameEn || null,
        description: draft.description,
        subcategoryId: draft.subcategoryId || null,
        price: Number(draft.price),
        durationMinutes: Number(draft.durationMinutes),
        locationType: draft.locationType,
        homeVisitFee: Number(draft.homeVisitFee || 0),
        cities: draft.cities,
        aliases: draft.aliases,
        images,
        includes: draft.includes,
        terms: draft.terms || null,
        warrantyInfo: draft.warrantyInfo || null,
        workshopAddress: draft.workshopAddress || null,
        workingHours: draft.workingHours,
        ...(serviceId
          ? { isActive: draft.isActive, categoryId: draft.categoryId }
          : {}),
        ...(draft.workshopLat !== ""
          ? { workshopLat: Number(draft.workshopLat) }
          : {}),
        ...(draft.workshopLng !== ""
          ? { workshopLng: Number(draft.workshopLng) }
          : {}),
      };
      if (!serviceId)
        for (const key of Object.keys(body))
          if (body[key] === null) delete body[key];
      let nextId = serviceId;
      try {
        const response = await adminRequest(
          serviceId
            ? "/api/suppliers/admin/services/" + encodeURIComponent(serviceId)
            : "/api/suppliers/admin/platform-services",
          { method: serviceId ? "PATCH" : "POST", body },
        );
        nextId = response.data?.id;
        if (!nextId) {
          if (!serviceId) uncertain.current = true;
          throw new Error("تعذر تأكيد رقم الخدمة المحفوظة.");
        }
        setServiceId(nextId);
      } catch (e) {
        if (!serviceId && (!e.status || e.status >= 500))
          uncertain.current = true;
        throw e;
      }
      onSaved?.();
      const verified = await adminRequest(
        "/api/suppliers/admin/services/" + encodeURIComponent(nextId),
      );
      if (verified.data?.id !== nextId)
        throw new Error("حُفظت الخدمة لكن تعذر تأكيد تفاصيلها. أعد تحميلها.");
      setDraft({
        ...initial,
        ...verified.data,
        price: String(verified.data.price ?? ""),
      });
      mutation.setNotice("تم حفظ الخدمة على الخادم.");
      onSaved?.();
    });
  }
  async function files(list) {
    for (const f of list) {
      if (
        !["image/png", "image/jpeg", "image/webp"].includes(f.type) ||
        f.size > 5 * 1024 * 1024
      )
        throw new Error("اختر صورة JPG أو PNG أو WebP أصغر من 5 ميجابايت.");
      const result = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = reject;
        r.readAsDataURL(f);
      });
      setDraft((d) => ({ ...d, images: [...d.images, result] }));
    }
  }
  const cats = Array.isArray(categories.data?.data) ? categories.data.data : [];
  const root = cats.find(
    (x) => x.type === "service" && !x.parent_id && Number(x.sort_order) === 5,
  );
  const options = cats.filter(
    (x) => x.parent_id === (draft.categoryId || root?.id),
  );
  return (
    <div className="pp-editor">
      <div className="pp-editor-heading">
        <h1>{serviceId ? "تعديل الخدمة" : "إضافة خدمة"}</h1>
        <button className="pp-button" disabled={mutation.busy} onClick={onBack}>
          العودة للخدمات
        </button>
      </div>
      <State resource={data} />
      <Feedback mutation={mutation} />
      {loaded && (
        <fieldset className="pp-editor-fieldset" disabled={mutation.busy}>
          <Panel
            title="معلومات الخدمة"
            className="pp-information pp-description"
          >
            <div className="pp-form-grid">
              {[
                ["name", "الإسم الأساسي"],
                ["nameEn", "الإسم بالإنجليزي"],
                ["price", "السعر"],
                ["durationMinutes", "مدة الخدمة بالدقائق"],
                ["homeVisitFee", "رسوم الزيارة المنزلية"],
                ["workshopAddress", "عنوان مركز الصيانة"],
                ["workshopLat", "خط العرض"],
                ["workshopLng", "خط الطول"],
              ].map(([key, label]) => (
                <Input
                  key={key}
                  label={label}
                  aria-label={label}
                  value={draft[key] ?? ""}
                  onChange={(e) => set(key, e.target.value)}
                />
              ))}
              <Field label="التصنيف الفرعي">
                <select
                  aria-label="التصنيف الفرعي"
                  value={draft.subcategoryId || ""}
                  onChange={(e) => {
                    set("subcategoryId", e.target.value);
                    if (!draft.categoryId) set("categoryId", root?.id || "");
                  }}
                >
                  <option value="">اختر التصنيف الفرعي</option>
                  {options.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name_ar}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="مكان الخدمة">
                <select
                  aria-label="مكان الخدمة"
                  value={draft.locationType}
                  onChange={(e) => set("locationType", e.target.value)}
                >
                  <option value="both">المركز والمنزل</option>
                  <option value="at_workshop">في المركز</option>
                  {!["both", "at_workshop"].includes(draft.locationType) && (
                    <option value={draft.locationType}>
                      {draft.locationType}
                    </option>
                  )}
                </select>
              </Field>
            </div>
            <State resource={categories} />
            <Tags
              label="أسماء ثانوية"
              value={draft.aliases}
              onChange={(v) => set("aliases", v)}
            />
            <Tags
              label="المدن المتاحة للخدمة"
              value={draft.cities}
              onChange={(v) => set("cities", v)}
            />
            <Tags
              label="تشمل الخدمة"
              value={draft.includes}
              onChange={(v) => set("includes", v)}
            />
            {[
              ["description", "الوصف"],
              ["terms", "الشروط"],
              ["warrantyInfo", "الضمان"],
            ].map(([key, label]) => (
              <label className="pp-field" key={key}>
                <span>{label}</span>
                <textarea
                  aria-label={label}
                  value={draft[key] ?? ""}
                  onChange={(e) => set(key, e.target.value)}
                />
              </label>
            ))}
            {serviceId && (
              <Toggle
                label="الحالة"
                checked={draft.isActive}
                onChange={(v) => set("isActive", v)}
              />
            )}
          </Panel>
          <Panel title="الصور">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(e) => {
                const selected = [...e.target.files];
                e.target.value = "";
                mutation.run(() => files(selected));
              }}
            />
            <div className="pp-thumbnails">
              {draft.images.map((src, i) => (
                <div key={i}>
                  <img
                    src={src}
                    alt="صورة الخدمة"
                    style={{ height: 80, width: 80, objectFit: "contain" }}
                  />
                  <button
                    onClick={() =>
                      set(
                        "images",
                        draft.images.filter((_, n) => n !== i),
                      )
                    }
                  >
                    حذف الصورة
                  </button>
                </div>
              ))}
            </div>
          </Panel>
          <button
            className="pp-button pp-save"
            disabled={mutation.busy || uncertain.current}
            onClick={save}
          >
            {mutation.busy ? "جارٍ الحفظ…" : "حفظ الخدمة"}
          </button>
        </fieldset>
      )}
    </div>
  );
}
