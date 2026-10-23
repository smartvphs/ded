import React, { lazy, Suspense, useState } from "react";
import useAdminResource from "./use-admin-resource";
import { adminRequest, queryString } from "./admin-api";
import { SupplierModal, SupplierField, SupplierButton } from "./supplier-ui";
const ProductEditor = lazy(() => import("./ProductEditor"));
export default function PriceListLink({ listId, row, onClose, onSaved }) {
  const [search, setSearch] = useState(row.part_number || row.part_name || ""),
    [productId, setProductId] = useState(""),
    [creating, setCreating] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [committed, setCommitted] = useState(false);
  const resource = useAdminResource(
    "/api/products/admin?" + queryString({ search, limit: 50, offset: 0 }),
  );
  const products = Array.isArray(resource.data?.data)
    ? resource.data.data
    : resource.data?.data?.items || [];
  async function link(id = productId) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (!id) throw new Error("اختر منتجًا.");
      if (!committed) {
        try {
          await adminRequest(
            "/api/suppliers/admin/price-lists/" +
              encodeURIComponent(listId) +
              "/items/" +
              encodeURIComponent(row.id),
            { method: "PATCH", body: { productId: id } },
          );
          setCommitted(true);
        } catch (e) {
          if (!e.status || e.status >= 500) setCommitted(true);
          throw e;
        }
      }
      const fresh = await adminRequest(
        "/api/suppliers/admin/price-lists/" +
          encodeURIComponent(listId) +
          "?" +
          queryString({
            search: row.part_number || row.part_name,
            limit: 100,
            offset: 0,
          }),
      );
      if (
        !fresh.data?.items?.some((x) => x.id === row.id && x.product_id === id)
      )
        throw new Error("لم يتم تأكيد ربط البند؛ أعد التحقق.");
      onSaved();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (creating)
    return (
      <Suspense fallback={<p>جارٍ تحميل إضافة المنتج…</p>}>
        <ProductEditor
          group="parts"
          mode="add"
          initialProduct={{
            name: row.part_name || row.name || "",
            partNumber: row.part_number || "",
          }}
          product={{ id: row.id }}
          onBack={() => setCreating(false)}
          onComplete={({ id }) => {
            setProductId(id);
            setCreating(false);
            link(id);
          }}
        />
      </Suspense>
    );
  return (
    <SupplierModal title="ربط بند الملف بمنتج" onClose={onClose} busy={busy}>
      <SupplierField label="البحث عن المنتج">
        <input
          disabled={busy || committed}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </SupplierField>
      <SupplierField label="المنتج">
        <select
          aria-label="منتج بند الملف"
          disabled={busy || committed || resource.loading}
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
        >
          <option value="">اختر المنتج</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </SupplierField>
      {resource.error && <p role="alert">{resource.error.message}</p>}
      {error && (
        <p className="su-error" role="alert">
          {error}
        </p>
      )}
      <SupplierButton disabled={busy || !productId} onClick={() => link()}>
        {committed ? "إعادة التحقق" : "ربط المنتج"}
      </SupplierButton>
      <SupplierButton
        secondary
        disabled={busy || committed || !!productId}
        onClick={() => setCreating(true)}
      >
        إضافة منتج جديد
      </SupplierButton>
    </SupplierModal>
  );
}
