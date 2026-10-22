import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const source = (
  await readFile(new URL("../src/coupons-api.js", import.meta.url), "utf8")
).replace(
  /import\s+\{[^}]+\}\s+from\s+['"]\.\/admin-api['"];?/,
  `const adminRequest=(...a)=>globalThis.couponRequest(...a);const queryString=v=>new URLSearchParams(Object.entries(v).filter(([,x])=>x!==undefined&&x!==null&&x!=='')).toString();`,
);
const {
  couponDraft,
  couponBody,
  couponLocalTime,
  verifyCoupon,
  readCoupon,
  couponListPath,
} = await import(
  "data:text/javascript;base64," + Buffer.from(source).toString("base64")
);
const row = {
  id: "c1",
  code: "SAVE10",
  discount_type: "percentage",
  value: "10.00",
  max_uses: 100,
  min_order_value: "200.00",
  starts_at: "2026-11-01T00:00:00.123Z",
  expires_at: "2026-12-31T21:00:00.000Z",
  is_active: true,
  max_discount: "50.00",
  description: "saved",
  payment_methods: ["mada"],
};
test("coupon edit sends changed documented fields only and preserves precise original dates", () => {
  const draft = couponDraft(row);
  assert.deepEqual(couponBody(draft, row), {});
  assert.deepEqual(
    couponBody(
      {
        ...draft,
        value: "15",
        description: "unsupported",
        maxDiscount: 99,
        paymentMethods: ["visa"],
      },
      row,
    ),
    { value: 15 },
  );
  assert.deepEqual(
    couponBody(
      { ...draft, maxUses: "", minOrderValue: "", startsAt: "", expiresAt: "" },
      row,
    ),
    { maxUses: null, minOrderValue: null, startsAt: null, expiresAt: null },
  );
});
test("coupon dates use Saudi time and validate start/end, percentage and integer limits", () => {
  const draft = {
    ...couponDraft(),
    code: " NEW ",
    value: "100",
    startsAt: "2026-11-01T00:00",
    expiresAt: "2026-12-31T23:59",
    minOrderValue: "0",
  };
  const body = couponBody(draft);
  assert.equal(body.code, "NEW");
  assert.equal(body.startsAt, "2026-10-31T21:00:00.000Z");
  assert.equal(body.expiresAt, "2026-12-31T20:59:00.000Z");
  assert.equal(body.minOrderValue, 0);
  assert.equal(couponLocalTime(body.startsAt), "2026-11-01T00:00:00");
  assert.throws(() => couponBody({ ...draft, value: "101" }));
  assert.throws(() => couponBody({ ...draft, maxUses: "1.5" }));
  assert.throws(() => couponBody({ ...draft, startsAt: "2026-12-31T23:59" }));
  assert.throws(() => couponBody({ ...draft, startsAt: "2026-02-30T12:00" }));
});
test("readback rejects ignored values and distinguishes zero from null", () => {
  verifyCoupon(row, {
    code: "SAVE10",
    value: 10,
    isActive: true,
    startsAt: row.starts_at,
  });
  assert.throws(() => verifyCoupon(row, { value: 15 }));
  assert.throws(() =>
    verifyCoupon({ ...row, min_order_value: null }, { minOrderValue: 0 }),
  );
  assert.throws(() => verifyCoupon(null, {}));
});
test("coupon list sends backend filters and readback follows pages instead of a nonexistent detail endpoint", async () => {
  const path = couponListPath({
    search: " SAVE ",
    status: "active",
    validity: "valid",
    paymentMethod: "mada",
    page: 2,
  });
  const q = new URL(path, "https://test.local").searchParams;
  assert.equal(q.get("search"), "SAVE");
  assert.equal(q.get("offset"), "3");
  assert.equal(q.get("paymentMethod"), "mada");
  const paths = [];
  globalThis.couponRequest = async (p) => {
    paths.push(p);
    return {
      data: paths.length === 1 ? [{ id: "other" }] : [row],
      meta: { total: 2 },
    };
  };
  assert.equal((await readCoupon("c1", "SAVE")).id, "c1");
  assert(paths[1].includes("offset=1"));
  assert(paths.every((p) => p.startsWith("/api/coupons?")));
  globalThis.couponRequest = async () => ({ data: [], meta: { total: 0 } });
  assert.equal(await readCoupon("missing", "MISSING"), null);
});
