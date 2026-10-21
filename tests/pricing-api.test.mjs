import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const source = (
  await readFile(new URL("../src/pricing-api.js", import.meta.url), "utf8")
).replace(
  /import\s+\{[^}]+\}\s+from\s+['"]\.\/admin-api['"];?/,
  `const adminRequest=(...args)=>globalThis.pricingRequest(...args);const queryString=obj=>new URLSearchParams(Object.entries(obj).filter(([,v])=>v!==undefined)).toString();`,
);
const { pricingParams, quoteBody, allPricingRows } = await import(
  "data:text/javascript;base64," + Buffer.from(source).toString("base64")
);
test("pricing filters are backend parameters applied before pagination", () => {
  const q = pricingParams({
    page: 3,
    search: " PRQ-9 ",
    filters: {
      company: "make-id",
      date: "2026-10-21",
      status: "quoted",
      type: "express",
    },
  });
  assert.equal(q.offset, 16);
  assert.equal(q.makeId, "make-id");
  assert.equal(q.search, "PRQ-9");
  assert.equal(q.from, "2026-10-21");
  assert.equal(q.to, q.from);
  assert.equal(q.pricingType, "express");
  assert.equal(q.status, "quoted");
});
test("admin quotes send quality codes and actual numeric prices without fake defaults", () => {
  assert.deepEqual(
    quoteBody(
      [
        { quality: "japanese", price: "120.5", notes: " ضمان " },
        { quality: "", price: "", notes: "" },
      ],
      "2",
    ),
    {
      offers: [{ qualityTier: "japanese", price: 120.5, notes: "ضمان" }],
      deliveryDays: 2,
    },
  );
  for (const row of [
    { quality: "", price: "5" },
    { quality: "original", price: "-1" },
    { quality: "original", price: "bad" },
  ])
    assert.throws(() => quoteBody([row], "1"));
  assert.throws(() => quoteBody([{ quality: "original", price: "5" }], ""));
  assert.throws(() => quoteBody([{ quality: "original", price: "5" }], "1.5"));
});
test("pricing export loads all filtered pages, validates responses and refuses partial duplicates", async () => {
  const calls = [];
  globalThis.pricingRequest = async (path) => {
    const q = new URL(path, "https://test.local").searchParams;
    calls.push(q);
    const offset = Number(q.get("offset"));
    return {
      data: Array.from({ length: offset ? 2 : 100 }, (_, i) => ({
        id: "id" + (i + offset),
      })),
      meta: { total: 102 },
    };
  };
  assert.equal(
    (await allPricingRows({ search: "hello", limit: 8, offset: 8 })).length,
    102,
  );
  assert.deepEqual(
    calls.map((q) => q.get("offset")),
    ["0", "100"],
  );
  assert.ok(
    calls.every((q) => q.get("search") === "hello" && q.get("limit") === "100"),
  );
  globalThis.pricingRequest = async () => ({
    data: [{ id: "same" }],
    meta: { total: 2 },
  });
  await assert.rejects(() => allPricingRows({}));
  globalThis.pricingRequest = async () => ({ data: {}, meta: { total: 0 } });
  await assert.rejects(() => allPricingRows({}));
});
