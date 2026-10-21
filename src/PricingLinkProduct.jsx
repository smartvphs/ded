import React, { useEffect, useState } from "react";
import { adminRequest, queryString } from "./admin-api";
import useAdminResource from "./use-admin-resource";
import { useMutation, Feedback } from "./ProductExtras";
import { PricingDialog, PricingField } from "./pricing-ui";
import { ResourceState } from "./orders-ui";
export default function PricingLinkProduct({
  requestId,
  part,
  onClose,
  onSaved,
  onCreate,
  onSessionExpired,
}) {
  const [search, setSearch] = useState(part.part_name || ""),
    [query, setQuery] = useState(part.part_name || ""),
    [productId, setProductId] = useState(""),
    mutation = useMutation();
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const products = useAdminResource(
    "/api/products/admin?" +
      queryString({ search: query || undefined, limit: 50, offset: 0 }),
  );
  async function save(event) {
    event.preventDefault();
    await mutation.run(async () => {
      if (!productId || products.loading || products.error)
        throw new Error("اختر منتجًا من النتائج.");
      await adminRequest(
        "/api/pricing-requests/admin/" +
          encodeURIComponent(requestId) +
          "/parts/" +
          encodeURIComponent(part.id) +
          "/link-product",
        { method: "PATCH", body: { productId } },
      );
      await onSaved();
      onClose();
    });
  }
  return (
    <PricingDialog
      title="ربط القطعة بمنتج"
      onClose={onClose}
      busy={mutation.busy}
    >
      <form onSubmit={save}>
        <fieldset disabled={mutation.busy} className="pricing-api-fieldset">
          <PricingField label="البحث عن المنتج">
            <input
              aria-label="البحث عن منتج للربط"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setProductId("");
              }}
            />
          </PricingField>
          <ResourceState resource={products} onLogin={onSessionExpired} />
          <PricingField label="المنتج">
            <select
              aria-label="المنتج المرتبط بالقطعة"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            >
              <option value="">اختر المنتج</option>
              {(products.data?.data || [])
                .filter((row) => row.status !== "deleted")
                .map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name} {row.part_number ? "· " + row.part_number : ""}
                  </option>
                ))}
            </select>
          </PricingField>
          <Feedback mutation={mutation} />
          <div className="quote-modal-buttons">
            <button type="submit" className="pricing-primary">
              ربط المنتج
            </button>
            {onCreate && (
              <button
                type="button"
                className="pricing-outline"
                onClick={onCreate}
              >
                إضافة منتج جديد
              </button>
            )}
          </div>
        </fieldset>
      </form>
    </PricingDialog>
  );
}
