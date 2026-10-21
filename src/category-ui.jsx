import React, { useState } from "react";
import { X, Trash2, Edit3, Eye, EyeOff, Plus, ImageOff } from "lucide-react";
import { PricingDialog } from "./pricing-ui";
import { ResourceState } from "./orders-ui";
import { isActive } from "./category-api";
export function CategoryState({ resource, onSessionExpired }) {
  return <ResourceState resource={resource} onLogin={onSessionExpired} />;
}
export function CategoryActions({
  label,
  active = true,
  onView,
  onEdit,
  onDelete,
  onStatus,
  trash = false,
  disabled = false,
}) {
  return (
    <div className="cm-row-actions">
      {onView && (
        <button
          className="def-eye"
          aria-label={"عرض " + label}
          onClick={onView}
          disabled={disabled}
        >
          <Eye size={13} />
        </button>
      )}
      {onEdit && (
        <button
          className="cm-edit"
          aria-label={"تعديل " + label}
          onClick={onEdit}
          disabled={disabled}
        >
          <Edit3 size={13} />
        </button>
      )}
      {onStatus && (
        <button
          className="cm-edit"
          aria-label={(active ? "إخفاء " : "إظهار ") + label}
          onClick={onStatus}
          disabled={disabled}
        >
          {active ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>
      )}
      {onDelete && (
        <button
          className={trash ? "cm-trash" : "cm-remove"}
          aria-label={"حذف " + label}
          onClick={onDelete}
          disabled={disabled}
        >
          {trash ? <Trash2 size={13} /> : <X size={13} />}
        </button>
      )}
    </div>
  );
}
const detailLabels = {
  name_ar: "الاسم بالعربي",
  name_en: "الاسم بالإنجليزي",
  name: "الاسم",
  description: "الوصف",
  description_en: "الوصف بالإنجليزي",
  sort_order: "الترتيب",
  sortOrder: "الترتيب",
  type: "نوع القسم",
  is_active: "الحالة",
  isActive: "الحالة",
  is_coming_soon: "قريبًا",
  products_count: "المنتجات",
  active_products_count: "المنتجات النشطة",
  subcategories_count: "التصنيفات الفرعية",
  suppliers_count: "الموردون",
  cars_count: "السيارات المتوافقة",
  fields_count: "حقول المواصفات",
  models_count: "الموديلات",
  active_models_count: "الموديلات النشطة",
  variants_count: "نسخ السيارات",
  active_variants_count: "نسخ السيارات النشطة",
  user_cars_count: "سيارات العملاء",
  year_from: "من سنة",
  year_to: "إلى سنة",
  trim: "الفئة",
  engine: "المحرك",
  transmission: "ناقل الحركة",
  model_name_ar: "الموديل",
  make_name_ar: "الشركة",
  parent_name_ar: "التصنيف الرئيسي",
  category: "القسم",
  created_at: "تاريخ الإضافة",
};
export function CategoryDetails({ title, row, onClose }) {
  return (
    <PricingDialog title={title} onClose={onClose}>
      <dl className="cm-api-details">
        {Object.entries(row)
          .filter(
            ([key, v]) =>
              detailLabels[key] &&
              v !== undefined &&
              v !== null &&
              typeof v !== "object",
          )
          .map(([key, value]) => (
            <div key={key}>
              <dt>{detailLabels[key]}</dt>
              <dd>
                {typeof value === "boolean"
                  ? value
                    ? "نعم"
                    : "لا"
                  : String(value)}
              </dd>
            </div>
          ))}
      </dl>
    </PricingDialog>
  );
}
export function CategoryConfirm({ title, busy, error, onClose, onConfirm }) {
  return (
    <PricingDialog title={title} busy={busy} onClose={onClose}>
      <p>
        هيتم تنفيذ الحذف على الخادم. لو فيه بيانات مرتبطة، الخادم ممكن يرفض
        الحذف.
      </p>
      {error && <p role="alert">{error}</p>}
      <div className="quote-modal-buttons">
        <button className="pricing-primary" onClick={onConfirm} disabled={busy}>
          تأكيد الحذف
        </button>
        <button className="pricing-outline" onClick={onClose} disabled={busy}>
          إلغاء
        </button>
      </div>
    </PricingDialog>
  );
}
export function CategoryImage({ src, alt = "", className = "" }) {
  const [broken, setBroken] = useState(null);
  if (!src || broken === src)
    return (
      <span
        className={"cm-api-broken-image " + className}
        role="img"
        aria-label="الصورة غير متاحة"
        title="الصورة غير متاحة"
      >
        <ImageOff size={20} />
      </span>
    );
  return (
    <img
      className={className}
      src={src}
      alt={alt}
      onError={() => setBroken(src)}
    />
  );
}
export { isActive, Plus };
