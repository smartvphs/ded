import React, { useRef, useState } from "react";
import { adminRequest } from "./admin-api";
import useOrderSuppliers from "./use-order-suppliers";
import { priceSheet, uploadPriceFile } from "./price-list-api";
import {
  SupplierModal,
  SupplierPanel,
  SupplierField,
  SupplierButton,
} from "./supplier-ui";
const outcomes = new Map();
export default function SupplierPriceUpload({ onClose, onSaved }) {
  const suppliers = useOrderSuppliers(true),
    [supplier, setSupplier] = useState(""),
    [file, setFile] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [record, setRecord] = useState(null),
    lock = useRef(false);
  async function save() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      if (!supplier || !file) throw new Error("اختر المورد والملف.");
      const key = [supplier, file.name, file.size, file.lastModified].join(":");
      let current = outcomes.get(key) || {};
      if (current.unknown)
        throw new Error(
          "نتيجة الإضافة غير مؤكدة؛ راجع الملفات قبل رفع نفس الملف مرة أخرى.",
        );
      if (!current.rows) {
        current.rows = await priceSheet(file);
        outcomes.set(key, current);
      }
      if (!current.url) {
        current.url = await uploadPriceFile(file);
        outcomes.set(key, current);
      }
      if (!current.id) {
        try {
          const result = await adminRequest(
            "/api/suppliers/admin/" +
              encodeURIComponent(supplier) +
              "/price-lists",
            {
              method: "POST",
              body: {
                fileName: file.name,
                fileUrl: current.url,
                fileSize: file.size,
              },
            },
          );
          if (!result.data?.id) throw new Error("تعذر تأكيد رقم الملف.");
          current.id = result.data.id;
        } catch (e) {
          if (!e.status || e.status >= 500) current.unknown = true;
          throw e;
        } finally {
          outcomes.set(key, current);
          setRecord({ ...current });
        }
      }
      if (!current.processed) {
        try {
          await adminRequest(
            "/api/suppliers/admin/price-lists/" +
              encodeURIComponent(current.id) +
              "/process",
            { method: "POST", body: { rows: current.rows } },
          );
          current.processed = true;
        } catch (e) {
          if (!e.status || e.status >= 500) current.processed = true;
          throw e;
        } finally {
          outcomes.set(key, current);
          setRecord({ ...current });
        }
      }
      const fresh = await adminRequest(
        "/api/suppliers/admin/price-lists/" +
          encodeURIComponent(current.id) +
          "?limit=1&offset=0",
      );
      if (!fresh.data?.priceList || fresh.data.priceList.status === "pending")
        throw new Error("لم تتأكد معالجة الملف بعد؛ أعد التحقق.");
      outcomes.delete(key);
      onSaved(current.id);
    } catch (e) {
      setError(e.message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <SupplierModal
      title="رفع ملف عروض أسعار"
      onClose={onClose}
      busy={busy}
      small
    >
      <SupplierPanel>
        <SupplierField label="المورد">
          <select
            aria-label="مورد ملف الأسعار"
            disabled={busy || !!record?.id || suppliers.loading}
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
          >
            <option value="">اختر المورد</option>
            {(suppliers.data?.data || []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </SupplierField>
        <SupplierField label="ملف عروض الأسعار" icon="upload">
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            disabled={busy || !!record?.id}
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
              setRecord(null);
            }}
          />
        </SupplierField>
        {suppliers.error && <p role="alert">{suppliers.error.message}</p>}
        {error && (
          <p className="su-error" role="alert">
            {error}
          </p>
        )}
        <SupplierButton disabled={busy || !!record?.unknown} onClick={save}>
          {record?.processed
            ? "إعادة التحقق"
            : record?.id
              ? "معالجة الملف"
              : "رفع ومعالجة"}
        </SupplierButton>
      </SupplierPanel>
    </SupplierModal>
  );
}
