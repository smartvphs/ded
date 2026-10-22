import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const source = (
  await readFile(new URL("../src/customer-api.js", import.meta.url), "utf8")
).replace(
  /import\s+\{[^}]+\}\s+from\s+['"]\.\/admin-api['"];?/,
  `const adminRequest=(...args)=>globalThis.customerRequest(...args);`,
);
const {
  customerBody,
  creditBody,
  cashbackBody,
  verifyCashback,
  customerNextStatus,
  customerVehicleBody,
  validateCustomerSave,
  readCustomer,
} = await import(
  "data:text/javascript;base64," + Buffer.from(source).toString("base64")
);
test("create normalizes Saudi phone; edit uses documented keys and excludes phone", () => {
  assert.deepEqual(
    customerBody({ name: " أحمد علي ", phone: "055 123 4567", email: "" }),
    { name: "أحمد علي", phone: "+966551234567", email: null },
  );
  assert.deepEqual(
    customerBody(
      {
        name: "أحمد علي",
        phone: "changed",
        email: "a@example.com",
        address: "bad",
        notes: "bad",
        image: "bad",
      },
      true,
    ),
    { name: "أحمد علي", email: "a@example.com", notes: "bad" },
  );
  assert.throws(() =>
    customerBody({ name: "أ", phone: "0551234567", email: "" }),
  );
  assert.throws(() =>
    customerBody({ name: "أحمد علي", phone: "01012345678", email: "" }),
  );
});
test("wallet credit is positive money with a reason; cashback zero is valid", () => {
  assert.deepEqual(creditBody("10.25", " تعويض "), {
    amount: 10.25,
    reason: "تعويض",
  });
  for (const amount of ["", "0", "-5", "1.001", "Infinity"])
    assert.throws(() => creditBody(amount, "سبب"));
  assert.throws(() => creditBody("5", " "));
  assert.deepEqual(cashbackBody("0"), { cashbackPercent: 0 });
  for (const value of ["", " ", "-1", "101"])
    assert.throws(() => cashbackBody(value));
});
test("vehicle writes actual make/model identifiers with explicit year and optional fields", () => {
  assert.deepEqual(
    customerVehicleBody({
      makeId: "make",
      modelId: "model",
      year: "1980",
      vin: " VIN ",
      isDefault: true,
    }),
    {
      makeId: "make",
      modelId: "model",
      year: 1980,
      vin: "VIN",
      isDefault: true,
    },
  );
  assert.throws(() =>
    customerVehicleBody({ makeId: "make", modelId: "", year: "2026" }),
  );
  assert.throws(() =>
    customerVehicleBody({ makeId: "make", modelId: "model", year: "2026.5" }),
  );
});
test("read-back confirms identity and values rather than returning a fake saved profile", async () => {
  globalThis.customerRequest = async () => ({
    data: { id: "one", name: "أحمد", phone: "+966551234567" },
  });
  const row = await readCustomer("one");
  validateCustomerSave(row, { name: "أحمد", phone: "+966551234567" });
  assert.throws(() => validateCustomerSave(row, { name: "اسم تجاهله الخادم" }));
  await assert.rejects(() => readCustomer("other"));
});

test("admin photo/notes use documented fields, clearing and readback aliases", () => {
  const draft = {
    name: "أحمد علي",
    email: "",
    avatarUrl: "https://res.cloudinary.com/test/image/upload/avatar.png",
    notes: "ملاحظات",
  };
  const body = customerBody(draft, true);
  assert.equal(body.avatarUrl, draft.avatarUrl);
  assert.equal(body.notes, "ملاحظات");
  validateCustomerSave(
    {
      name: "أحمد علي",
      email: null,
      avatar_url: draft.avatarUrl,
      admin_notes: "ملاحظات",
    },
    body,
  );
  const cleared = customerBody({ ...draft, avatarUrl: null, notes: "" }, true);
  assert.equal(cleared.avatarUrl, null);
  assert.equal(cleared.notes, null);
  validateCustomerSave(
    { name: "أحمد علي", email: null, avatar_url: null, admin_notes: "" },
    cleared,
  );
  assert.throws(() =>
    customerBody({ ...draft, avatarUrl: "data:image/png;base64,test" }, true),
  );
  assert.throws(() =>
    customerBody({ ...draft, notes: "س".repeat(1001) }, true),
  );
  assert.throws(() =>
    validateCustomerSave({ avatar_url: null }, { avatarUrl: draft.avatarUrl }),
  );
  assert.deepEqual(
    customerBody(draft, true, {
      avatar_url: draft.avatarUrl,
      admin_notes: draft.notes,
    }),
    { name: "أحمد علي", email: null },
  );
});
test("cashback saves official limits, null defaults and zero distinctly; inactive stays a read filter", () => {
  const body = cashbackBody("5", { minOrderValue: "200", maxCashback: "50" });
  assert.deepEqual(body, {
    cashbackPercent: 5,
    minOrderValue: 200,
    maxCashback: 50,
  });
  verifyCashback(
    {
      cashback_percent: "5.00",
      cashback_min_order: "200.00",
      cashback_max_amount: "50.00",
    },
    body,
  );
  assert.deepEqual(
    cashbackBody(null, { minOrderValue: "", maxCashback: null }),
    { cashbackPercent: null, minOrderValue: null, maxCashback: null },
  );
  assert.deepEqual(
    cashbackBody("0", { minOrderValue: "0", maxCashback: "0" }),
    { cashbackPercent: 0, minOrderValue: 0, maxCashback: 0 },
  );
  assert.throws(() => cashbackBody("5", { maxCashback: "-1" }));
  assert.throws(() => cashbackBody("5", { minOrderValue: "1.001" }));
  assert.throws(() =>
    verifyCashback({ cashback_percent: null }, { cashbackPercent: 0 }),
  );
  assert.throws(() =>
    verifyCashback({ cashback_percent: 5, cashback_min_order: null }, body),
  );
  assert.equal(customerNextStatus({ status: "blocked" }), "active");
  assert.equal(customerNextStatus({ status: "active" }), "blocked");
  assert.notEqual(customerNextStatus({ status: "inactive" }), "inactive");
});
