import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const source = (
  await readFile(
    new URL("../src/abandoned-carts-api.js", import.meta.url),
    "utf8",
  )
).replace(
  /import\s+\{[^}]+\}\s+from\s+['"]\.\/admin-api['"];?/,
  `const queryString=v=>new URLSearchParams(Object.entries(v).filter(([,x])=>x!==undefined&&x!==null&&x!=='')).toString();`,
);
const { cartReminderBody, validateReminderResult, cartsListPath, cartNumber } =
  await import(
    "data:text/javascript;base64," + Buffer.from(source).toString("base64")
  );
test("cart filters and pagination are applied on backend, missing metrics differ from zero", () => {
  const u = new URL(
    cartsListPath({ search: " أحمد ", idleHours: 1, order: "asc", page: 2 }),
    "https://test.local",
  );
  assert.equal(u.searchParams.get("search"), "أحمد");
  assert.equal(u.searchParams.get("offset"), "7");
  assert.equal(u.searchParams.get("idleHours"), "1");
  assert.equal(u.searchParams.get("sort"), "last_activity");
  assert.equal(u.searchParams.get("order"), "asc");
  assert.equal(cartNumber(null), "—");
  assert.equal(cartNumber(0), "0");
});
test("single reminder validates optional text, bulk sends unique ids only with a 100 customer limit", () => {
  assert.deepEqual(cartReminderBody({ ids: ["u1"] }), {});
  assert.deepEqual(
    cartReminderBody({ ids: ["u1"], message: "  رسالة تذكير  " }),
    { message: "رسالة تذكير" },
  );
  assert.throws(() => cartReminderBody({ ids: ["u1"], message: "قص" }));
  assert.throws(() =>
    cartReminderBody({ ids: ["u1"], message: "س".repeat(301) }),
  );
  assert.deepEqual(
    cartReminderBody({
      ids: ["u1", "u1", "u2"],
      message: "ignored",
      bulk: true,
    }),
    { userIds: ["u1", "u2"] },
  );
  assert.throws(() =>
    cartReminderBody({
      ids: Array.from({ length: 101 }, (_, i) => "u" + i),
      bulk: true,
    }),
  );
});
test("200 bulk response must account for every customer and preserve skipped reasons", () => {
  const sent = {
      userId: "u1",
      reminderId: "r1",
      sentAt: "2026-10-22T12:00:00Z",
    },
    skipped = { userId: "u2", reason: "already_reminded" };
  const data = {
    sent: [sent],
    skipped: [skipped],
    sentCount: 1,
    skippedCount: 1,
  };
  assert.deepEqual(validateReminderResult(data, ["u1", "u2"], true), {
    sent: [sent],
    skipped: [skipped],
  });
  assert.throws(() =>
    validateReminderResult(
      { ...data, skipped: [], skippedCount: 0 },
      ["u1", "u2"],
      true,
    ),
  );
  assert.throws(() =>
    validateReminderResult(
      { ...data, sent: [{ ...sent, userId: "other" }] },
      ["u1", "u2"],
      true,
    ),
  );
  assert.throws(() =>
    validateReminderResult({ ...data, sentCount: 2 }, ["u1", "u2"], true),
  );
  assert.throws(() => validateReminderResult({ userId: "u1" }, ["u1"]));
  assert.deepEqual(validateReminderResult(sent, ["u1"]), {
    sent: [sent],
    skipped: [],
  });
});
