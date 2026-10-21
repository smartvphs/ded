export function orderDraft(row) {
  const shipping = row.shipping || {},
    address = shipping.address || row.delivery_address || {};
  return {
    ...row,
    city: address.city ?? row.city ?? "",
    district: address.district ?? row.district ?? "",
    street: address.street ?? row.street ?? "",
    building_no: address.buildingNo ?? "",
    short_address: address.shortAddress ?? row.short_address ?? "",
    shipping_company_id: row.shipping_company_id ?? shipping.company?.id ?? "",
    tracking_no: row.tracking_no ?? shipping.trackingNo ?? "",
    tracking_url: row.tracking_url ?? shipping.trackingUrl ?? "",
    shipped_date: (row.shipped_at ?? shipping.shippedAt ?? "").slice(0, 10),
    delivery_date: (
      row.expected_delivery_at ??
      shipping.expectedDeliveryAt ??
      ""
    ).slice(0, 10),
    shipping_cost: row.shipping_cost ?? shipping.costs?.shippingCost ?? "",
    packaging: row.packaging_cost ?? shipping.costs?.packagingCost ?? "",
    extra_fees: row.extra_fees ?? shipping.costs?.extraFees ?? "",
  };
}
export function shippingBody(draft, original) {
  const body = {},
    baseline = orderDraft(original);
  const mapping = {
    shipping_company_id: "shippingCompanyId",
    tracking_no: "trackingNo",
    tracking_url: "trackingUrl",
    shipped_date: "shippedAt",
    delivery_date: "expectedDeliveryAt",
    shipping_cost: "shippingCost",
    packaging: "packagingCost",
    extra_fees: "extraFees",
  };
  for (const [key, target] of Object.entries(mapping)) {
    if (String(draft[key] ?? "") === String(baseline[key] ?? "")) continue;
    if (["shipping_cost", "packaging", "extra_fees"].includes(key)) {
      if (
        draft[key] === "" ||
        !Number.isFinite(Number(draft[key])) ||
        Number(draft[key]) < 0
      )
        throw new Error("أدخل تكلفة صحيحة غير سالبة.");
      body[target] = Number(draft[key]);
    } else body[target] = draft[key] || null;
  }
  const addressFields = {
    city: "city",
    district: "district",
    street: "street",
    building_no: "buildingNo",
    short_address: "shortAddress",
  };
  if (
    Object.keys(addressFields).some(
      (key) => (draft[key] || "") !== (baseline[key] || ""),
    )
  ) {
    body.deliveryAddress = Object.fromEntries(
      Object.entries(addressFields).map(([key, target]) => [
        target,
        draft[key] || "",
      ]),
    );
  }
  return body;
}
export function orderItemQuantity(value) {
  const quantity = Number(value);
  if (!Number.isSafeInteger(quantity) || quantity < 1)
    throw new Error("أدخل كمية صحيحة أكبر من صفر.");
  return quantity;
}
