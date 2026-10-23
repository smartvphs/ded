import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const source = await readFile(
  new URL("../src/settings-bindings.js", import.meta.url),
  "utf8",
);
const {
  settingsRows,
  resolveSetting,
  inputValue,
  typedValue,
  settingsPatch,
  verifySettings,
} = await import(
  "data:text/javascript;base64," + Buffer.from(source).toString("base64")
);
const payload = {
  data: {
    groups: [
      {
        key: "margins",
        label: "الهوامش",
        settings: [
          {
            key: "platform_margin_percent",
            label: "هامش المنصة على الخدمات",
            value: 20,
            type: "percent",
            min: 0,
            max: 100,
          },
          {
            key: "cashback_percent",
            label: "نسبة الكاش باك العامة",
            value: 2,
            type: "percent",
            min: 0,
            max: 100,
          },
        ],
      },
    ],
    unknown: [
      { key: "offer_target_margin_percent", value: "20", isReadOnly: true },
    ],
  },
};
test("official keys only, unknown read-only and unique label resolution", () => {
  const rows = settingsRows(payload);
  assert.equal(
    resolveSetting(rows, { binding: "pricingMargin" }).key,
    "platform_margin_percent",
  );
  assert.equal(
    resolveSetting(rows, { binding: "offerMargin" }).isReadOnly,
    true,
  );
  assert.equal(resolveSetting(rows, { label: "اختيار غير موثق" }), null);
  assert.equal(
    resolveSetting([...rows, { key: "copy", label: "نسبة الكاش باك العامة" }], {
      label: "نسبة الكاش باك العامة",
    }),
    null,
  );
  assert.throws(() => settingsRows({ data: { groups: [], unknown: {} } }));
});
test("sparse section saves, zero, range checks and defaults do not save themselves", () => {
  const rows = settingsRows(payload);
  assert.deepEqual(
    settingsPatch(
      rows,
      {
        platform_margin_percent: "0",
        cashback_percent: "5",
        offer_target_margin_percent: "9",
      },
      { platform_margin_percent: "pricing", cashback_percent: "cashback" },
      "cashback",
    ),
    { cashback_percent: 5 },
  );
  assert.deepEqual(
    settingsPatch(rows, { platform_margin_percent: "0" }, {}, null),
    { platform_margin_percent: 0 },
  );
  assert.throws(() => typedValue(rows[0], "-1"));
  assert.throws(() => typedValue(rows[0], ""));
  assert.equal(
    inputValue({ value: null, isMissing: true, defaultValue: 1 }),
    "1",
  );
  assert.deepEqual(
    settingsPatch(
      [
        {
          key: "missing",
          value: null,
          isMissing: true,
          defaultValue: 1,
          type: "integer",
        },
      ],
      { missing: "1" },
      {},
      null,
    ),
    {},
  );
});
test("readback must contain actual saved values, not merely a success flag", () => {
  assert.doesNotThrow(() =>
    verifySettings(payload, { platform_margin_percent: 20 }),
  );
  assert.throws(() => verifySettings(payload, { platform_margin_percent: 0 }));
  assert.throws(() => verifySettings({ success: true, data: {} }, {}));
});
test("context prevents crossing repeated fields or payment providers", () => {
  const rows = [
    { key: "a", label: "سعر الشحن", groupLabel: "الشحن الخفيف" },
    { key: "b", label: "سعر الشحن", groupLabel: "الشحن الثقيل" },
  ];
  assert.equal(resolveSetting(rows, { label: "سعر الشحن" }), null);
  assert.equal(
    resolveSetting(rows, { label: "سعر الشحن", context: "الشحن الثقيل" }).key,
    "b",
  );
  assert.equal(
    resolveSetting(rows, { label: "سعر الشحن", context: "الشحن السريع" }),
    null,
  );
});

test("confirmed full-response fields and hour/day conversion retain backend units", async () => {
  const { hoursInput, storedHours } = await import(
    "data:text/javascript;base64," + Buffer.from(source).toString("base64")
  );
  const fixture = JSON.parse(
    await readFile(
      new URL("./fixtures/settings-response-2026-10-23.json", import.meta.url),
      "utf8",
    ),
  );
  const rows = settingsRows(fixture);
  assert.equal(
    resolveSetting(rows, { binding: "cashbackMax" }).key,
    "cashback_max_per_order",
  );
  assert.equal(
    inputValue(resolveSetting(rows, { binding: "cashbackMax" })),
    "0",
  );
  assert.equal(resolveSetting(rows, { binding: "freePartsLimit" }).value, 3);
  assert.equal(resolveSetting(rows, { binding: "fulfillmentHours" }).value, 24);
  assert.equal(
    resolveSetting(rows, {
      label: "نسبة ربح المورد",
      context: "التسعير المجاني",
    }),
    null,
  );
  assert.equal(hoursInput("24", "يوم"), "1");
  assert.equal(storedHours("2", "يوم"), "48");
  assert.equal(storedHours("", "يوم"), "");
  assert.equal(hoursInput("0", "يوم"), "0");
  assert.throws(() =>
    typedValue(
      resolveSetting(rows, { binding: "fulfillmentHours" }),
      storedHours("0.01", "يوم"),
    ),
  );
});
