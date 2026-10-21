import React, { useEffect, useState } from "react";
import { adminRequest, queryString } from "./admin-api";
import useAdminResource from "./use-admin-resource";
import { Modal, Field, Select, ResourceState } from "./orders-ui";
import { orderItemQuantity } from "./order-detail-api";
export default function OrderItemPicker({
  orderId,
  onClose,
  onSaved,
  onSessionExpired,
}) {
  const [search, setSearch] = useState(""),
    [query, setQuery] = useState(""),
    [productId, setProductId] = useState(""),
    [variantId, setVariantId] = useState(""),
    [quantity, setQuantity] = useState("1"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [uncertain, setUncertain] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const products = useAdminResource(
    "/api/products/admin?" +
      queryString({
        search: query || undefined,
        status: "published",
        limit: 20,
        offset: 0,
      }),
  );
  const detail = useAdminResource(
    productId ? "/api/products/admin/" + encodeURIComponent(productId) : null,
  );
  const variants = (detail.data?.data?.variants || []).filter(
    (row) => (row.isActive ?? row.is_active) !== false,
  );
  async function add(event) {
    event.preventDefault();
    if (busy || uncertain) return;
    setError("");
    let count;
    try {
      count = orderItemQuantity(quantity);
      if (!productId || detail.loading || detail.error)
        throw new Error("اختر منتجًا وانتظر تحميل بياناته.");
      if (variants.length && !variantId) throw new Error("اختر نوع المنتج.");
    } catch (e) {
      setError(e.message);
      return;
    }
    setBusy(true);
    try {
      await adminRequest(
        "/api/orders/admin/" + encodeURIComponent(orderId) + "/items",
        {
          method: "POST",
          body: {
            productId,
            ...(variantId ? { variantId } : {}),
            quantity: count,
          },
        },
      );
      await onSaved();
      onClose();
    } catch (e) {
      if (!e.status || e.status >= 500) setUncertain(true);
      setError(
        e.message +
          (!e.status || e.status >= 500
            ? " راجع قائمة القطع قبل إعادة الإضافة لتجنب التكرار."
            : ""),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="إضافة منتج للطلب"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form onSubmit={add}>
        <fieldset
          disabled={busy}
          style={{ border: 0, padding: 0, minWidth: 0 }}
        >
          <Field label="البحث عن المنتج">
            <input
              aria-label="البحث عن منتج للطلب"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Field>
          <Select
            label="المنتج"
            value={productId}
            onChange={(e) => {
              setProductId(e.target.value);
              setVariantId("");
            }}
          >
            <option value="">اختر منتج</option>
            {(products.data?.data || []).map((row) => (
              <option key={row.id} value={row.id}>
                {row.name} {row.part_number || ""}
              </option>
            ))}
          </Select>
          <ResourceState resource={products} onLogin={onSessionExpired} />
          <ResourceState resource={detail} onLogin={onSessionExpired} />
          {variants.length > 0 && (
            <Select
              label="نوع المنتج"
              value={variantId}
              onChange={(e) => setVariantId(e.target.value)}
            >
              <option value="">اختر النوع</option>
              {variants.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.variant_label ||
                    row.variantLabel ||
                    row.name ||
                    row.label ||
                    row.sku}
                </option>
              ))}
            </Select>
          )}
          <Field label="الكمية">
            <input
              aria-label="كمية المنتج المضاف"
              type="number"
              min="1"
              step="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </Field>
          {error && <p role="alert">{error}</p>}
          <div className="op-modal-buttons">
            <button
              className="op-primary"
              disabled={busy || uncertain}
              type="submit"
            >
              تأكيد
            </button>
            <button className="op-outline" type="button" onClick={onClose}>
              إلغاء
            </button>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
