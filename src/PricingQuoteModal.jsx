import React, { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import useAdminResource from "./use-admin-resource";
import { adminRequest } from "./admin-api";
import { useMutation, Feedback } from "./ProductExtras";
import { ResourceState } from "./orders-ui";
import { PricingDialog, PricingField } from "./pricing-ui";
import { quoteBody } from "./pricing-api";
export default function PricingQuoteModal({
  requestId,
  part,
  offer,
  onClose,
  onSaved,
  onSessionExpired,
}) {
  const [offers, setOffers] = useState(
      offer
        ? [
            {
              id: "edit",
              quality: offer.qualityTier || "",
              price: String(offer.price ?? ""),
              notes: offer.notes || "",
            },
          ]
        : [{ id: crypto.randomUUID(), quality: "", price: "", notes: "" }],
    ),
    [deliveryDays, setDeliveryDays] = useState(""),
    [uncertain, setUncertain] = useState(false);
  const mutation = useMutation(),
    tiers = useAdminResource(offer ? null : "/api/suppliers/quality-tiers");
  const update = (id, key, value) =>
    setOffers((old) =>
      old.map((row) => (row.id === id ? { ...row, [key]: value } : row)),
    );
  async function save(event) {
    event.preventDefault();
    if (uncertain) return;
    await mutation.run(async () => {
      let body;
      if (offer) {
        const price = Number(offers[0].price);
        if (offers[0].price === "" || !Number.isFinite(price) || price <= 0)
          throw new Error("أدخل سعرًا أكبر من صفر.");
        body = { price, notes: offers[0].notes.trim() };
      } else {
        if (tiers.loading || tiers.error)
          throw new Error("انتظر تحميل الجودات الصحيحة.");
        body = quoteBody(offers, deliveryDays);
        const allowed = new Set(
          (tiers.data?.data || []).map((row) => row.code),
        );
        if (body.offers.some((row) => !allowed.has(row.qualityTier)))
          throw new Error("اختر جودة من القائمة.");
      }
      let saved = false;
      try {
        await adminRequest(
          "/api/pricing-requests/admin/" +
            encodeURIComponent(requestId) +
            (offer
              ? "/offers/" + encodeURIComponent(offer.itemId)
              : "/parts/" + encodeURIComponent(part.id) + "/quotes"),
          { method: offer ? "PATCH" : "POST", body },
        );
        saved = true;
        await onSaved();
        onClose();
      } catch (e) {
        if (!offer && (saved || !e.status || e.status >= 500)) {
          setUncertain(true);
          throw new Error(
            e.message + " راجع عروض الطلب قبل إعادة الإضافة لتجنب التكرار.",
          );
        }
        throw e;
      }
    });
  }
  return (
    <PricingDialog
      title={offer ? "تعديل الأسعار" : "إرسال طلب تسعير"}
      onClose={onClose}
      busy={mutation.busy}
    >
      <form onSubmit={save}>
        <fieldset disabled={mutation.busy} className="pricing-api-fieldset">
          <ResourceState resource={tiers} onLogin={onSessionExpired} />
          <div className="quote-offers">
            {offers.map((row, index) => (
              <div className="quote-offer-row" key={row.id}>
                <PricingField label="الجودة">
                  <select
                    aria-label={"الجودة " + (index + 1)}
                    value={row.quality}
                    disabled={!!offer || tiers.loading || !!tiers.error}
                    onChange={(e) => update(row.id, "quality", e.target.value)}
                  >
                    <option value="">
                      {offer
                        ? offer.qualityName || offer.qualityTier || "—"
                        : "اختر من بين الجودات"}
                    </option>
                    {(tiers.data?.data || []).map((tier) => (
                      <option key={tier.code} value={tier.code}>
                        {tier.name || tier.name_en || tier.code}
                      </option>
                    ))}
                    {offer && row.quality && (
                      <option value={row.quality}>
                        {offer.qualityName || row.quality}
                      </option>
                    )}
                  </select>
                </PricingField>
                <PricingField label="السعر">
                  <input
                    aria-label={"السعر " + (index + 1)}
                    type="number"
                    min=".01"
                    step=".01"
                    value={row.price}
                    onChange={(e) => update(row.id, "price", e.target.value)}
                  />
                </PricingField>
                <PricingField label="ملاحظة على المنتج">
                  <input
                    aria-label={"ملاحظة " + (index + 1)}
                    value={row.notes}
                    onChange={(e) => update(row.id, "notes", e.target.value)}
                    placeholder="اكتب ملاحظاتك على المنتج"
                  />
                </PricingField>
                {!offer && (
                  <button
                    type="button"
                    className="pricing-delete"
                    aria-label={"حذف الجودة " + (index + 1)}
                    onClick={() =>
                      setOffers((old) =>
                        old.filter((item) => item.id !== row.id),
                      )
                    }
                  >
                    <Trash2 size={17} />
                  </button>
                )}
              </div>
            ))}
          </div>
          {!offer && (
            <PricingField label="مدة التوصيل بالأيام">
              <input
                aria-label="مدة التوصيل بالأيام"
                type="number"
                min="0"
                step="1"
                value={deliveryDays}
                onChange={(e) => setDeliveryDays(e.target.value)}
              />
            </PricingField>
          )}
          <Feedback mutation={mutation} />
          <div className="quote-modal-buttons">
            {!offer && (
              <button
                type="button"
                className="pricing-primary"
                onClick={() =>
                  setOffers((old) => [
                    ...old,
                    {
                      id: crypto.randomUUID(),
                      quality: "",
                      price: "",
                      notes: "",
                    },
                  ])
                }
              >
                <Plus size={19} />
                إضافة جودة أخرى
              </button>
            )}
            <button
              type="submit"
              className="pricing-outline"
              disabled={uncertain || mutation.busy}
            >
              {offer ? "حفظ التعديلات" : "إرسال"}
            </button>
          </div>
        </fieldset>
      </form>
    </PricingDialog>
  );
}
