import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const source = (
  await readFile(new URL("../src/category-api.js", import.meta.url), "utf8")
).replace(
  /import\s+\{[^}]+\}\s+from\s+['"]\.\/admin-api['"];?/,
  `const adminRequest=(...args)=>globalThis.categoryRequest(...args);const queryString=o=>new URLSearchParams(o).toString();`,
);
const {
  variantBody,
  optionBody,
  catalogRows,
  linkedYears,
  confirmCatalogSave,
} = await import(
  "data:text/javascript;base64," + Buffer.from(source).toString("base64")
);
test("car years and optional specs use the documented variant contract", () => {
  assert.deepEqual(
    variantBody({
      yearFrom: "2015",
      yearTo: "2020",
      engine: " 4 سلندر ",
      trim: "",
      transmission: "",
    }),
    {
      yearFrom: 2015,
      yearTo: 2020,
      engine: "4 سلندر",
      trim: null,
      transmission: null,
    },
  );
  for (const [a, b] of [
    ["", "2020"],
    ["1949", "2020"],
    ["2025", "2024"],
    ["2020", "2101"],
    ["2020.5", "2021"],
  ])
    assert.throws(() => variantBody({ yearFrom: a, yearTo: b }));
});
test("lookup options preserve stored values separately from translated labels", () => {
  assert.deepEqual(
    optionBody(
      {
        value: "synthetic",
        labelAr: "صناعي",
        labelEn: "Synthetic",
        sortOrder: "3",
        image: "",
      },
      { valueType: "text" },
    ),
    {
      value: "synthetic",
      labelAr: "صناعي",
      labelEn: "Synthetic",
      sortOrder: 3,
      imageUrl: null,
    },
  );
  assert.throws(() => optionBody({ value: "205 mm" }, { valueType: "number" }));
  assert.throws(() => optionBody({ value: " " }, { valueType: "text" }));
});
test("paged category and variant lists retrieve every row but nonpaged brands load once", async () => {
  const calls = [];
  globalThis.categoryRequest = async (path) => {
    calls.push(path);
    const q = new URL(path, "https://test").searchParams,
      o = Number(q.get("offset"));
    return {
      data: Array.from({ length: o ? 2 : 100 }, (_, i) => ({
        id: String(o + i),
      })),
      meta: { total: 102 },
    };
  };
  assert.equal(
    (await catalogRows("/api/cars/admin/variants?makeId=make")).data.length,
    102,
  );
  assert.ok(calls.every((p) => p.includes("makeId=make")));
  calls.length = 0;
  globalThis.categoryRequest = async (p) => {
    calls.push(p);
    return { data: Array.from({ length: 105 }, (_, i) => ({ id: String(i) })) };
  };
  assert.equal(
    (await catalogRows("/api/brands?category=oils")).data.length,
    105,
  );
  assert.equal(calls.length, 1);
  globalThis.categoryRequest = async () => ({
    data: [{ id: "same" }],
    meta: { total: 2 },
  });
  await assert.rejects(() => catalogRows("/api/categories/admin"));
});
test("linked model years deduplicate overlapping variants instead of inventing totals", () =>
  assert.equal(
    linkedYears([
      { model_id: "a", year_from: 2015, year_to: 2018 },
      { model_id: "a", year_from: 2017, year_to: 2020 },
      { model_id: "b", year_from: 2020, year_to: 2020 },
    ]),
    7,
  ));

test("save confirmation rejects a server that ignores name or image changes", () => {
  confirmCatalogSave(
    "category",
    { name_ar: "قسم", icon_url: "https://images/new.png", sort_order: 1 },
    { nameAr: "قسم", iconUrl: "https://images/new.png", sortOrder: 1 },
  );
  assert.throws(() =>
    confirmCatalogSave(
      "category",
      { name_ar: "قسم", icon_url: "old" },
      { nameAr: "قسم", iconUrl: "new" },
    ),
  );
  confirmCatalogSave(
    "option",
    { value: "205", labelAr: "205", imageUrl: null },
    { value: "205", labelAr: "205", imageUrl: null },
  );
});
test("car model image readback verifies image_url against imageUrl including removal", () => {
  assert.doesNotThrow(() =>
    confirmCatalogSave(
      "model",
      { name_ar: "كامري", image_url: "https://example.com/model.png" },
      { nameAr: "كامري", imageUrl: "https://example.com/model.png" },
    ),
  );
  assert.throws(() =>
    confirmCatalogSave("model", { image_url: "old" }, { imageUrl: "new" }),
  );
  assert.doesNotThrow(() =>
    confirmCatalogSave("model", { image_url: null }, { imageUrl: null }),
  );
});
