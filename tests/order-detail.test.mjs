import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const source = await readFile(
  new URL("../src/order-detail-api.js", import.meta.url),
  "utf8",
);
const {
  orderDraft,
  shippingBody,
  orderItemQuantity,
  paymentUpdateBody,
  contactUpdateBody,
} = await import(
  "data:text/javascript;base64," + Buffer.from(source).toString("base64")
);
test("shipping writes only changed documented fields and never shipping fee charged to customer", () => {
  const original = {
    shipping_fee: 35,
    shipping: {
      trackingNo: "OLD",
      company: { id: "carrier" },
      costs: { shippingCost: 12, packagingCost: 3, extraFees: 0 },
      address: { city: "الرياض", street: "القديم", buildingNo: "12" },
      shippedAt: "2026-10-20T12:00:00Z",
    },
  };
  const draft = orderDraft(original);
  assert.deepEqual(shippingBody(draft, original), {});
  assert.deepEqual(
    shippingBody({ ...draft, shipping_cost: "9", street: "الجديد" }, original),
    {
      shippingCost: 9,
      deliveryAddress: {
        city: "الرياض",
        district: "",
        street: "الجديد",
        buildingNo: "12",
        shortAddress: "",
      },
    },
  );
  assert.throws(() =>
    shippingBody({ ...draft, shipping_cost: "-1" }, original),
  );
  assert.throws(() => shippingBody({ ...draft, packaging: "" }, original));
  assert.equal(original.shipping_fee, 35);
});
test("order quantities reject fractional, missing and negative input", () => {
  assert.equal(orderItemQuantity("2"), 2);
  for (const value of ["", 0, -1, 1.5, "bad"])
    assert.throws(() => orderItemQuantity(value));
});

test("payment writes are partial and remove coupons with null, contact does not mutate the account", () => {
  const original = {
    payment_method: "cash",
    coupon_code: "OLD",
    customer: {
      name: "Account",
      phone: "+966500000001",
      email: "account@example.com",
    },
  };
  const draft = orderDraft(original);
  assert.deepEqual(paymentUpdateBody(draft, original), {});
  assert.deepEqual(contactUpdateBody(draft, original), {});
  assert.deepEqual(paymentUpdateBody({ ...draft, coupon_code: "" }, original), {
    couponCode: null,
  });
  assert.deepEqual(
    paymentUpdateBody({ ...draft, payment_method: "mada" }, original),
    { paymentMethod: "mada" },
  );
  assert.deepEqual(
    contactUpdateBody(
      { ...draft, contact: { ...draft.contact, name: "Recipient", email: "" } },
      original,
    ),
    { contactName: "Recipient", contactEmail: null },
  );
  assert.equal(original.customer.name, "Account");
});
