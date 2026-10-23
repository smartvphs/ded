import React, { useState } from "react";
import { adminRequest } from "./admin-api";
import { PricingDialog } from "./pricing-ui";
export default function ManualItemCost({
  orderId,
  itemId,
  unitCost,
  productName,
  onClose,
  onSaved,
}) {
  const [value, setValue] = useState(unitCost == null ? "" : String(unitCost)),
    [clear, setClear] = useState(false),
    [note, setNote] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [committed, setCommitted] = useState(false);
  async function save(e) {
    e.preventDefault();
    if (busy) return;
    const cost = clear ? null : Number(value);
    if (!clear && (value === "" || !Number.isFinite(cost) || cost < 0)) {
      setError("أدخل تكلفة الوحدة بقيمة صفر أو أكثر.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (!committed) {
        try {
          await adminRequest(
            "/api/orders/admin/" +
              encodeURIComponent(orderId) +
              "/items/" +
              encodeURIComponent(itemId) +
              "/cost",
            {
              method: "PATCH",
              body: {
                unitCost: cost,
                ...(note.trim() ? { note: note.trim() } : {}),
              },
            },
          );
        } catch (e) {
          if (!e.status || e.status >= 500) setCommitted(true);
          throw e;
        }
        setCommitted(true);
      }
      const result = await adminRequest(
        "/api/orders/admin/" + encodeURIComponent(orderId) + "/costs",
      );
      const row = result.data?.items?.find((x) => x.id === itemId);
      if (
        !row ||
        (!clear &&
          (Number(row.unitCost) !== cost || row.costSource !== "manual")) ||
        (clear && row.costSource === "manual")
      )
        throw new Error("تعذر تأكيد تكلفة القطعة. أعد التحقق.");
      await onSaved(result.data);
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <PricingDialog title="تسجيل تكلفة الوحدة" busy={busy} onClose={onClose}>
      <form onSubmit={save}>
        <p>{productName}</p>
        <p className="support-api-note">
          للتقرير المحاسبي فقط؛ لا يتغير المبلغ المدفوع على الطلب. تكلفة الخدمة
          تتحدد عند إسنادها لمركز الصيانة.
        </p>
        <label>
          تكلفة الوحدة بالريال
          <input
            type="number"
            step="0.01"
            min="0"
            required={!clear}
            aria-label="تكلفة الوحدة"
            value={value}
            disabled={clear || busy || committed}
            onChange={(e) => setValue(e.target.value)}
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={clear}
            disabled={busy || committed}
            onChange={(e) => setClear(e.target.checked)}
          />
          إزالة التكلفة اليدوية واستخدام مصدر التكلفة المتاح
        </label>
        <label>
          ملاحظة محاسبية
          <input
            maxLength={300}
            value={note}
            disabled={busy || committed}
            onChange={(e) => setNote(e.target.value)}
            placeholder="رقم فاتورة المورد — اختياري"
          />
        </label>
        {error && (
          <p className="support-api-error" role="alert">
            {error}
          </p>
        )}
        <button className="pricing-primary" disabled={busy}>
          {committed ? "إعادة التحقق" : "حفظ التكلفة"}
        </button>
      </form>
    </PricingDialog>
  );
}
