import React, { useState } from "react";
import { PricingDialog } from "./pricing-ui";
import { adminRequest } from "./admin-api";
import { useMutation, Feedback } from "./ProductExtras";
import {
  couponDraft,
  couponBody,
  couponPath,
  readCoupon,
  verifyCoupon,
  couponPaymentMethods,
} from "./coupons-api";
function Field({ label, value, onChange, type = "text", ...props }) {
  return (
    <label className="coupon-field">
      <span>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        {...props}
      />
    </label>
  );
}
export function CouponForm({ coupon, duplicate = false, onClose, onSaved }) {
  const [draft, setDraft] = useState(() => ({
      ...couponDraft(coupon),
      ...(duplicate ? { code: "" } : {}),
    })),
    [record, setRecord] = useState(null),
    [uncertain, setUncertain] = useState(false),
    mutation = useMutation(),
    creating = !coupon || duplicate;
  const set = (key, value) => setDraft((old) => ({ ...old, [key]: value }));
  async function save(e) {
    e.preventDefault();
    if (uncertain) return;
    await mutation.run(async () => {
      let saved = record;
      if (!saved) {
        let body;
        if (duplicate) {
          if (!draft.code.trim()) throw new Error("أدخل كودًا جديدًا للنسخة.");
          if (draft.code.trim() === coupon.code)
            throw new Error("كود النسخة لازم يختلف عن الكوبون الأصلي.");
          body = { code: draft.code.trim(), isActive: !!draft.isActive };
        } else body = couponBody(draft, coupon);
        if (!Object.keys(body).length) throw new Error("مفيش تغييرات للحفظ.");
        let response;
        try {
          response = await adminRequest(
            duplicate
              ? couponPath(coupon.id) + "/duplicate"
              : coupon
                ? couponPath(coupon.id)
                : "/api/coupons",
            { method: creating ? "POST" : "PATCH", body },
          );
        } catch (error) {
          if (creating && (!error.status || error.status >= 500))
            setUncertain(true);
          throw error;
        }
        const id = response.data?.id ?? coupon?.id;
        if (!id || (duplicate && id === coupon.id)) {
          setUncertain(true);
          throw new Error(
            "الخادم لم يرجع رقم كوبون جديد. راجع القائمة قبل إعادة الإضافة.",
          );
        }
        saved = { id, code: body.code || coupon.code, expected: body };
        setRecord(saved);
      }
      const row = await readCoupon(saved.id, saved.code);
      verifyCoupon(row, saved.expected);
      if (duplicate) {
        verifyCoupon(row, {
          discountType: coupon.discount_type,
          value: Number(coupon.value),
          maxUses: coupon.max_uses == null ? null : Number(coupon.max_uses),
          minOrderValue:
            coupon.min_order_value == null
              ? null
              : Number(coupon.min_order_value),
          startsAt: coupon.starts_at ?? null,
          expiresAt: coupon.expires_at ?? null,
        });
        if (Number(row.used_count) !== 0)
          throw new Error("عداد استخدام النسخة الجديدة لم يرجع بصفر.");
      }
      onSaved();
      onClose();
    });
  }
  return (
    <PricingDialog
      title={
        duplicate
          ? "إنشاء نسخة من الكوبون"
          : coupon
            ? "تعديل الكوبون"
            : "إضافة كوبون جديد"
      }
      onClose={onClose}
      busy={mutation.busy}
    >
      <form className="coupon-connected-form" onSubmit={save}>
        <fieldset disabled={mutation.busy || !!record || uncertain}>
          <Field
            label="كود الكوبون *"
            aria-label="كود الكوبون"
            value={draft.code}
            onChange={(v) => set("code", v)}
            required
          />
          {duplicate ? (
            <p className="coupon-api-note">
              النسخة هتحتفظ بإعدادات الكوبون الأصلي، بكود جديد وعداد استخدام
              جديد.
            </p>
          ) : (
            <div className="coupon-form-grid">
              <label className="coupon-field">
                <span>نوع الخصم *</span>
                <select
                  aria-label="نوع الخصم"
                  value={draft.discountType}
                  onChange={(e) => set("discountType", e.target.value)}
                >
                  <option value="percentage">نسبة مئوية</option>
                  <option value="fixed">قيمة ثابتة</option>
                </select>
              </label>
              <Field
                label="قيمة الخصم *"
                aria-label="قيمة الخصم"
                type="number"
                min="0.01"
                step="0.01"
                max={draft.discountType === "percentage" ? 100 : undefined}
                value={draft.value}
                onChange={(v) => set("value", v)}
                required
              />
              <Field
                label="الحد الأدنى للطلب (اختياري)"
                aria-label="الحد الأدنى للطلب"
                type="number"
                min="0"
                step="0.01"
                value={draft.minOrderValue}
                onChange={(v) => set("minOrderValue", v)}
                placeholder="بدون حد أدنى"
              />
              <Field
                label="حد الاستخدام (اختياري)"
                aria-label="حد الاستخدام"
                type="number"
                min="1"
                step="1"
                value={draft.maxUses}
                onChange={(v) => set("maxUses", v)}
                placeholder="بدون حد"
              />
              <Field
                label="بداية الصلاحية (بتوقيت السعودية)"
                aria-label="بداية الصلاحية"
                type="datetime-local"
                step="1"
                value={draft.startsAt}
                onChange={(v) => set("startsAt", v)}
              />
              <Field
                label="نهاية الصلاحية (بتوقيت السعودية)"
                aria-label="نهاية الصلاحية"
                type="datetime-local"
                step="1"
                value={draft.expiresAt}
                onChange={(v) => set("expiresAt", v)}
              />
            </div>
          )}
          {!duplicate && (
            <div className="coupon-unconfirmed-fields">
              <p className="coupon-api-note">
                الوصف وأقصى خصم ووسائل الدفع للعرض فقط حاليًا.
              </p>
              <label className="coupon-field">
                <span>الوصف</span>
                <textarea
                  aria-label="الوصف"
                  value={coupon?.description || ""}
                  readOnly
                  placeholder="غير متاح حاليًا"
                />
              </label>
              <div className="coupon-form-grid">
                <Field
                  label="أقصى خصم"
                  value={coupon?.max_discount ?? ""}
                  readOnly
                  placeholder="غير محدد"
                />
                <Field
                  label="وسائل الدفع المسموحة"
                  value={
                    coupon?.payment_methods
                      ?.map((m) => couponPaymentMethods[m] || m)
                      .join("، ") || "جميع الوسائل"
                  }
                  readOnly
                />
              </div>
            </div>
          )}
          <label className="coupon-enable">
            <input
              type="checkbox"
              aria-label="تفعيل الكوبون"
              checked={draft.isActive}
              onChange={(e) => set("isActive", e.target.checked)}
            />
            <span className="toggle-track">
              <i />
            </span>
            <span>
              تفعيل الكوبون
              <small>استخدام الكوبون بيتحدد كمان بالتاريخ وحد الاستخدام</small>
            </span>
          </label>
        </fieldset>
        <Feedback mutation={mutation} />
        {uncertain && (
          <p className="coupon-api-error" role="alert">
            نتيجة الإضافة غير مؤكدة؛ راجع القائمة قبل المحاولة عشان الكوبون ما
            يتكررش.
          </p>
        )}
        {record && (
          <p className="coupon-api-note">
            تم إرسال الحفظ؛ إعادة المحاولة هتأكد البيانات بدون إنشاء نسخة تانية.
          </p>
        )}
        <button className="coupon-save" disabled={mutation.busy || uncertain}>
          {record ? "تأكيد البيانات" : "حفظ الكوبون"}
        </button>
      </form>
    </PricingDialog>
  );
}
export function CouponAction({ type, coupon, onClose, onSaved }) {
  const deleting = type === "delete",
    mutation = useMutation(),
    [committed, setCommitted] = useState(false);
  async function save() {
    await mutation.run(async () => {
      if (!committed) {
        let response;
        try {
          response = await adminRequest(couponPath(coupon.id), {
            method: deleting ? "DELETE" : "PATCH",
            ...(!deleting ? { body: { isActive: !coupon.is_active } } : {}),
          });
        } catch (error) {
          if (deleting && (!error.status || error.status >= 500))
            setCommitted(true);
          throw error;
        }
        setCommitted(true);
        if (deleting && response.data?.deleted !== true)
          throw new Error("الخادم لم يؤكد حذف الكوبون. حدّث البيانات للتأكد.");
      }
      const row = await readCoupon(coupon.id, coupon.code);
      if (deleting) {
        if (row) throw new Error("الكوبون لسه ظاهر بعد الحذف. حدّث البيانات.");
      } else verifyCoupon(row, { isActive: !coupon.is_active });
      onSaved();
      onClose();
    });
  }
  return (
    <PricingDialog
      title={
        deleting
          ? "حذف الكوبون"
          : coupon.is_active
            ? "إيقاف الكوبون"
            : "تفعيل الكوبون"
      }
      onClose={onClose}
      busy={mutation.busy}
    >
      <p className="coupon-action-code" dir="ltr">
        {coupon.code}
      </p>
      <p className="coupon-api-note">
        {deleting
          ? "الكوبون المستخدم مينفعش يتحذف؛ تقدر توقفه بدل الحذف."
          : "التغيير هيتحفظ على المنصة."}
      </p>
      <Feedback mutation={mutation} />
      {committed && (
        <p className="coupon-api-note">
          تم إرسال العملية؛ إعادة المحاولة هتحدّث البيانات فقط.
        </p>
      )}
      <div className="quote-modal-buttons">
        <button
          className={deleting ? "primary danger" : "pricing-primary"}
          onClick={save}
          disabled={mutation.busy}
        >
          {committed ? "تأكيد البيانات" : "تأكيد"}
        </button>
        <button
          className="pricing-back"
          onClick={onClose}
          disabled={mutation.busy}
        >
          إلغاء
        </button>
      </div>
    </PricingDialog>
  );
}
