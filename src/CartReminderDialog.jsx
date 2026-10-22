import React, { useState } from "react";
import { adminRequest } from "./admin-api";
import { PricingDialog } from "./pricing-ui";
import { useMutation, Feedback } from "./ProductExtras";
import {
  cartReminderBody,
  abandonedCartPath,
  validateReminderResult,
  skipLabels,
  cartDate,
} from "./abandoned-carts-api";
export default function CartReminderDialog({
  targets,
  bulk,
  onClose,
  onDone,
  onUncertain,
}) {
  const [message, setMessage] = useState(""),
    [result, setResult] = useState(null),
    [uncertain, setUncertain] = useState(false),
    mutation = useMutation();
  const names = new Map(
    targets.map((t) => [t.userId, t.name || t.phone || t.userId]),
  );
  async function send(e) {
    e.preventDefault();
    if (result || uncertain) return;
    await mutation.run(async () => {
      const ids = targets.map((t) => t.userId),
        body = cartReminderBody({ ids, message, bulk });
      let response;
      try {
        response = await adminRequest(
          bulk
            ? "/api/admin/abandoned-carts/remind"
            : abandonedCartPath(ids[0]) + "/remind",
          { method: "POST", body },
        );
      } catch (error) {
        if (!error.status || error.status >= 500) {
          setUncertain(true);
          onUncertain(ids);
        }
        if (error.status === 409) onDone();
        throw error;
      }
      let confirmed;
      try {
        confirmed = validateReminderResult(response.data, ids, bulk);
      } catch (error) {
        setUncertain(true);
        onUncertain(ids);
        throw error;
      }
      setResult(confirmed);
      onDone(ids);
    });
  }
  return (
    <PricingDialog
      title={bulk ? "إرسال تذكير للسلات المحددة" : "إرسال رسالة تذكير"}
      busy={mutation.busy}
      onClose={onClose}
    >
      <form className="cart-reminder-form" onSubmit={send}>
        <p>عدد السلات: {targets.length}</p>
        <p className="cart-api-note">
          التذكير هيوصل للعميل كإشعار داخل الموقع وإشعار Push يفتح السلة.
        </p>
        <ul className="cart-reminder-targets">
          {targets.map((t) => (
            <li key={t.userId}>
              {t.name || "عميل بدون اسم"}{" "}
              <span dir="ltr">{t.phone || t.email || ""}</span>
            </li>
          ))}
        </ul>
        {!bulk && !result && (
          <label className="coupon-field">
            <span>نص التذكير (اختياري)</span>
            <textarea
              aria-label="نص التذكير"
              placeholder="اتركه فارغًا لاستخدام رسالة المنصة"
              value={message}
              maxLength={300}
              disabled={mutation.busy || uncertain}
              onChange={(e) => setMessage(e.target.value)}
            />
          </label>
        )}
        <Feedback mutation={mutation} />
        {uncertain && (
          <p role="alert">
            نتيجة الإرسال غير مؤكدة. حدّث بيانات السلات وراجع سجل التذكير قبل أي
            محاولة جديدة.
          </p>
        )}
        {result && (
          <div className="cart-reminder-result" role="status">
            <p>
              أكد الخادم إرسال {result.sent.length} تذكير، وتخطي{" "}
              {result.skipped.length} سلة.
            </p>
            <ul>
              {result.sent.map((row) => (
                <li key={row.userId}>
                  {names.get(row.userId)}: تم الإرسال — {cartDate(row.sentAt)}
                </li>
              ))}
              {result.skipped.map((row) => (
                <li key={row.userId}>
                  {names.get(row.userId)}:{" "}
                  {skipLabels[row.reason] || row.reason}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="quote-modal-buttons">
          {!result && (
            <button
              className="pricing-primary"
              disabled={mutation.busy || uncertain}
            >
              تأكيد الإرسال
            </button>
          )}
          <button
            type="button"
            className="pricing-back"
            onClick={onClose}
            disabled={mutation.busy}
          >
            {result || uncertain ? "إغلاق" : "إلغاء"}
          </button>
        </div>
      </form>
    </PricingDialog>
  );
}
