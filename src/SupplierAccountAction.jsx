import React, { useRef, useState } from "react";
import { adminRequest, queryString } from "./admin-api";
import { SupplierModal, SupplierButton, SupplierField } from "./supplier-ui";
export default function SupplierAccountAction({
  supplier,
  kind,
  onClose,
  onSaved,
}) {
  const [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [committed, setCommitted] = useState(false),
    lock = useRef(false);
  const status =
    supplier.account_status === "suspended" ? "active" : "suspended";
  async function save() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      if (!committed) {
        try {
          await adminRequest(
            "/api/suppliers/admin/" +
              encodeURIComponent(supplier.id) +
              (kind === "delete" ? "" : "/status"),
            {
              method: kind === "delete" ? "DELETE" : "PATCH",
              body: {
                ...(kind === "delete" ? {} : { status }),
                ...(reason.trim() ? { reason: reason.trim() } : {}),
              },
            },
          );
          setCommitted(true);
        } catch (e) {
          if (!e.status || e.status >= 500) setCommitted(true);
          throw e;
        }
      }
      let confirmed = false;
      if (kind === "delete") {
        const result = await adminRequest(
          "/api/suppliers/admin?" +
            queryString({
              accountStatus: "deleted",
              search: supplier.name,
              limit: 100,
              offset: 0,
            }),
        );
        confirmed = result.data?.items?.some(
          (x) => x.id === supplier.id && x.account_status === "deleted",
        );
      } else {
        const result = await adminRequest(
          "/api/suppliers/admin/" + encodeURIComponent(supplier.id),
        );
        confirmed = result.data?.account_status === status;
      }
      if (!confirmed) throw new Error("تعذر تأكيد حالة المورد؛ أعد التحقق.");
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  return (
    <SupplierModal
      title={
        kind === "delete"
          ? "حذف المورد"
          : status === "active"
            ? "إعادة تفعيل المورد"
            : "إيقاف المورد"
      }
      onClose={onClose}
      busy={busy}
      small
    >
      <p>{supplier.name}</p>
      <p>
        {kind === "delete"
          ? "الحذف نهائي للحساب، ويرفضه الخادم لو عليه رصيد أو تسوية معلقة."
          : "إيقاف الحساب يمنع أعمال المورد ويخفي منتجاته؛ إعادة التفعيل تعيد المنتجات التي أخفاها الإيقاف فقط."}
      </p>
      <SupplierField label="السبب (اختياري)">
        <textarea
          maxLength={300}
          disabled={busy || committed}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </SupplierField>
      {error && (
        <p className="su-error" role="alert">
          {error}
        </p>
      )}
      <SupplierButton disabled={busy} onClick={save}>
        {committed ? "إعادة التحقق" : "تأكيد"}
      </SupplierButton>
    </SupplierModal>
  );
}
