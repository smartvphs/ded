import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const source = await readFile(
  new URL("../src/settings-api.js", import.meta.url),
  "utf8",
);
const {
  readSettings,
  settingsTab,
  settingInput,
  settingValue,
  settingsChanges,
  verifySettings,
} = await import(
  "data:text/javascript;base64," + Buffer.from(source).toString("base64")
);
const groups = [
  {
    key: "pricing",
    settings: [
      {
        key: "fee",
        label: "الرسوم",
        type: "money",
        value: 3,
        min: 0,
        max: 100,
      },
      { key: "text", label: "الوصف", type: "text", value: "قديم" },
      { key: "flag", label: "إظهار", type: "boolean", value: 0 },
      { key: "locked", value: 5, isReadOnly: true },
    ],
  },
];
test("settings sparse patch preserves zero, validates ranges, and never writes readonly fields", () => {
  assert.deepEqual(
    settingsChanges(groups, { fee: "3", text: "", flag: "1", locked: "99" }),
    { text: "", flag: 1 },
  );
  assert.equal(settingValue(groups[0].settings[0], "0"), 0);
  assert.throws(() => settingValue(groups[0].settings[0], "-1"));
  assert.throws(() => settingValue(groups[0].settings[0], "101"));
  assert.throws(() => settingValue(groups[0].settings[0], ""));
});
test("settings readback rejects ignored writes and malformed schemas", () => {
  assert.throws(() => readSettings({ data: { groups: {} } }));
  assert.throws(() => verifySettings({ data: { groups } }, { fee: 4 }));
  assert.equal(
    verifySettings({ data: { groups } }, { fee: 3 }).groups.length,
    1,
  );
});
test("settings use server schema and distinguish payment fees from pricing and cashback", () => {
  assert.equal(
    settingsTab("margins", "payment_fee_moyasar_percent"),
    "payments",
  );
  assert.equal(settingsTab("margins", "supplier_commission_free"), "pricing");
  assert.equal(settingsTab("cashback", "min_order"), "cashback");
  assert.equal(settingsTab("inventory", "low_stock_threshold"), "other");
  assert.equal(settingInput({ value: 0 }), "0");
  assert.equal(settingInput({ value: null }), "");
});

test("missing setting displays server default without writing it", () => {
 const row={key:"home_section_parts",type:"boolean",value:null,isMissing:true,defaultValue:1};
 assert.equal(settingInput(row),"1");
 assert.deepEqual(settingsChanges([{settings:[row]}],{home_section_parts:"1"}),{});
 assert.deepEqual(settingsChanges([{settings:[row]}],{home_section_parts:"0"}),{home_section_parts:0});
});
