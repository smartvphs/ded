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
  customerVehicleBody,
  validateCustomerSave,
  readCustomer,
} = await import(
  "data:text/javascript;base64," + Buffer.from(source).toString("base64")
);
test("create normalizes Saudi phone and edit never sends unsupported profile fields", () => {
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
    { name: "أحمد علي", email: "a@example.com" },
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
