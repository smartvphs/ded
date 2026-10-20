import React, { useEffect, useRef, useState } from "react";
import {
  FileText,
  Star,
  Upload,
  Image as ImageIcon,
  Settings,
  ArrowLeft,
  ExternalLink,
  Tag,
  MapPin,
  Car,
  Grid2X2,
  Flame,
  Receipt,
  Trash2,
  Plus,
  Package,
} from "lucide-react";
import { ProductReviews } from "./ProductExtras";
import { Panel, Input, Tags, Toggle, Field, Money } from "./products-ui";
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
    [loaded, setLoaded] = useState(!id),
    [tab, setTab] = useState("details"),
    [selectedImage, setSelectedImage] = useState(0);
  const fileInput = useRef(null);
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
        ...(serviceId
          ? { isActive: draft.isActive, categoryId: draft.categoryId }
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
        if (!serviceId && !draft.isActive) {
          try {
            await adminRequest(
              "/api/suppliers/admin/services/" + encodeURIComponent(nextId),
              { method: "PATCH", body: { isActive: false } },
            );
          } catch (e) {
            throw new Error(
              "تم إنشاء الخدمة لكن لم يكتمل تحديث حالتها. أعد الحفظ لإكماله. " +
                e.message,
            );
          }
        }
      } catch (e) {
        if (!serviceId && !nextId && (!e.status || e.status >= 500))
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
  const roots = cats.filter((x) => x.type === "service" && !x.parent_id);
  const root = roots.find((x) => Number(x.sort_order) === 5);
  const options = cats.filter(
    (x) => x.parent_id === (draft.categoryId || root?.id),
  );
  const select = (
    label,
    value,
    choices,
    change,
    icon = Grid2X2,
    disabled = false,
  ) => (
    <Field label={label} icon={icon}>
      <select
        aria-label={label}
        value={value || ""}
        disabled={disabled}
        onChange={(e) => change(e.target.value)}
      >
        <option value="">-- اختر --</option>
        {choices.map((x) => (
          <option value={x.id} key={x.id}>
            {x.name_ar ?? x.name}
          </option>
        ))}
      </select>
    </Field>
  );
  const choose = () => fileInput.current?.click();
  const upload = (list) => mutation.run(() => files(list));
  const image = draft.images[selectedImage] || draft.images[0];
  return (
    <div className="pp-editor pp-editor-services">
      <div className="pp-editor-heading">
        <h1>{draft.name || (serviceId ? "تعديل الخدمة" : "إضافة خدمة")}</h1>
        <button
          className="pp-copy-link"
          disabled={mutation.busy}
          onClick={onBack}
        >
          العودة للخدمات
          <ArrowLeft size={16} />
        </button>
      </div>
      <State resource={data} />
      <Feedback mutation={mutation} />
      <div
        className="pp-editor-tabs"
        role="tablist"
        aria-label="تبويبات الخدمة"
      >
        {[
          ["details", "تفاصيل المنتج", FileText],
          ["reviews", "التقييمات", Star],
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
      {loaded && (
        <fieldset className="pp-editor-fieldset" disabled={mutation.busy}>
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
                        if (!mutation.busy) upload([...e.dataTransfer.files]);
                      }}
                    >
                      <Upload size={38} />
                      <p>اسحب الصورة هنا</p>
                      <span>سحب وإسقاط صورة هنا، أو انقر لتحديد واحد</span>
                      <button
                        className="pp-button pp-small-button"
                        onClick={choose}
                      >
                        <ImageIcon size={15} />
                        اختر الصورة
                      </button>
                      <input
                        ref={fileInput}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        hidden
                        onChange={(e) => {
                          const list = [...e.target.files];
                          e.target.value = "";
                          upload(list);
                        }}
                      />
                    </div>
                    <div className="pp-thumbnails">
                      {draft.images.map((src, i) => (
                        <div className="pp-editor-image" key={i}>
                          <button
                            className="pp-thumb"
                            aria-label={"معاينة صورة الخدمة " + (i + 1)}
                            onClick={() => setSelectedImage(i)}
                          >
                            <img src={src} alt="صورة الخدمة" />
                          </button>
                          <button
                            className="pp-remove"
                            aria-label={"حذف صورة الخدمة " + (i + 1)}
                            onClick={() => {
                              set(
                                "images",
                                draft.images.filter((_, n) => n !== i),
                              );
                              setSelectedImage(0);
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                      {Array.from(
                        { length: Math.max(0, 3 - draft.images.length) },
                        (_, i) => (
                          <button
                            key={"empty" + i}
                            className="pp-thumb"
                            aria-label="إضافة صورة خدمة"
                            onClick={choose}
                          >
                            <ImageIcon size={25} />
                          </button>
                        ),
                      )}
                    </div>
                  </Panel>
                  <Panel title="معلومات الخدمة" className="pp-information">
                    <div className="pp-form-grid">
                      <Input
                        label="الإسم بالإنجليزي*"
                        aria-label="الإسم بالإنجليزي"
                        icon={Receipt}
                        value={draft.nameEn || ""}
                        onChange={(e) => set("nameEn", e.target.value)}
                      />
                      <Input
                        label="الإسم الأساسي*"
                        aria-label="الإسم الأساسي"
                        icon={Receipt}
                        value={draft.name}
                        onChange={(e) => set("name", e.target.value)}
                      />
                    </div>
                    <Tags
                      label="أسماء ثانوية"
                      icon={Tag}
                      value={draft.aliases}
                      onChange={(v) => set("aliases", v)}
                    />
                    <div className="pp-form-grid">
                      {select(
                        "التصنيف الرئيسي",
                        draft.categoryId || root?.id,
                        roots,
                        (v) =>
                          setDraft((d) => ({
                            ...d,
                            categoryId: v,
                            subcategoryId: "",
                          })),
                      )}
                      {select(
                        "التصنيف الفرعي",
                        draft.subcategoryId,
                        options,
                        (v) => {
                          set("subcategoryId", v);
                          if (!draft.categoryId)
                            set("categoryId", root?.id || "");
                        },
                      )}
                    </div>
                    <State resource={categories} />
                    <Input
                      label="اسم مركز الصيانة"
                      icon={Settings}
                      value={
                        draft.centerName ||
                        draft.supplierName ||
                        (serviceId ? "" : "ماي بارت")
                      }
                      readOnly
                    />
                    <div className="pp-form-grid pp-service-price-cities">
                      <Input
                        label="السعر"
                        aria-label="السعر"
                        icon={Flame}
                        type="number"
                        step="any"
                        min="0"
                        value={draft.price}
                        onChange={(e) => set("price", e.target.value)}
                      />
                      <Tags
                        label="المدن المتاحة للخدمة"
                        icon={MapPin}
                        value={draft.cities}
                        onChange={(v) => set("cities", v)}
                      />
                    </div>
                    <div className="pp-form-grid">
                      {select("السيارة", "", [], () => {}, Car, true)}
                      {select("الشركة", "", [], () => {}, Car, true)}
                    </div>
                  </Panel>
                  <Panel title="الوصف والمواصفات" className="pp-description">
                    <div className="pp-description-top">
                      <span>وصف المنتج*</span>
                    </div>
                    <textarea
                      aria-label="الوصف"
                      value={draft.description}
                      onChange={(e) => set("description", e.target.value)}
                    />
                  </Panel>
                </>
              ) : (
                <ProductReviews id={serviceId} onSaved={onSaved} />
              )}
            </div>
            <aside className="pp-editor-aside">
              <Panel
                title="معاينة الخدمة"
                className="pp-preview-panel"
                extra={
                  <button
                    className="pp-copy-link"
                    disabled={!draft.url}
                    onClick={() => {
                      if (draft.url) navigator.clipboard?.writeText(draft.url);
                    }}
                  >
                    <ExternalLink size={17} />
                    نسخ رابط الخدمة
                  </button>
                }
              >
                <div className="pp-preview-card">
                  <div className="pp-preview-image">
                    {image ? (
                      <img src={image} alt="معاينة الخدمة" />
                    ) : (
                      <ImageIcon size={64} />
                    )}
                  </div>
                  <h3>{draft.name || "اسم الخدمة"}</h3>
                  <p className="pp-preview-subtitle">
                    {draft.aliases[0] || ""}
                  </p>
                  <div className="pp-preview-price">
                    <b>
                      <Money>{draft.price || "—"}</Money>
                    </b>
                  </div>
                </div>
              </Panel>
              <Panel
                title={
                  <>
                    <span className="pp-title-icon">
                      <Settings size={20} />
                    </span>
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
                <div title="غير متاح لهذه الخدمة">
                  <Toggle label="عرض خاص" checked={false} disabled />
                  <Toggle label="شحن مجاني" checked={false} disabled />
                </div>
              </Panel>
              {tab === "details" && (
                <button
                  className="pp-button pp-save"
                  aria-label="حفظ الخدمة"
                  disabled={mutation.busy || uncertain.current}
                  onClick={save}
                >
                  {mutation.busy ? "جارٍ الحفظ…" : "حفظ"}
                  <ArrowLeft size={17} />
                </button>
              )}
            </aside>
          </div>
        </fieldset>
      )}
    </div>
  );
}
