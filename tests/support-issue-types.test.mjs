import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const source = await readFile(
  new URL("../src/support-issue-types.js", import.meta.url),
  "utf8",
);
const { issueTypeRows, issueTypeDraft, issueTypeBody, verifyIssueType } =
  await import(
    "data:text/javascript;base64," + Buffer.from(source).toString("base64")
  );
const row = {
  id: "type1",
  code: "technical",
  name: "تقنية",
  name_en: "Technical",
  is_active: true,
  sort_order: 2,
};
test("public and admin issue catalogs use their actual distinct response shapes", () => {
  assert.deepEqual(issueTypeRows({ data: [row] }), [row]);
  assert.deepEqual(issueTypeRows({ data: { items: [row] } }, true), [row]);
  assert.throws(() => issueTypeRows({ data: { items: [row] } }), /غير صالح/);
  assert.throws(() => issueTypeRows({ data: [row, row] }), /غير صالح/);
});
test("issue edits are sparse, preserve immutable code, and support clearing English and zero order", () => {
  const draft = issueTypeDraft(row);
  assert.deepEqual(issueTypeBody(draft, row), {});
  assert.deepEqual(
    issueTypeBody(
      {
        ...draft,
        code: "changed",
        nameEn: "",
        sortOrder: "0",
        isActive: false,
      },
      row,
    ),
    { nameEn: null, sortOrder: 0, isActive: false },
  );
  assert.throws(
    () =>
      issueTypeBody(
        { ...draft, isActive: false },
        { ...row, code: "other", is_protected: true },
      ),
    /لا يمكن/,
  );
});
test("create codes are validated and readback requires each saved value", () => {
  const draft = issueTypeDraft(row);
  assert.throws(
    () => issueTypeBody({ ...draft, code: "Invalid code" }),
    /كود النوع/,
  );
  assert.throws(() => issueTypeBody({ ...draft, name: " " }), /اسم/);
  assert.throws(() => issueTypeBody({ ...draft, sortOrder: 0.5 }), /رقم صحيح/);
  verifyIssueType(row, {
    name: row.name,
    nameEn: row.name_en,
    isActive: true,
    sortOrder: 2,
  });
  assert.throws(
    () => verifyIssueType({ ...row, name_en: "old" }, { nameEn: null }),
    /القيم/,
  );
  assert.throws(() => verifyIssueType(null, { name: "new" }), /لم يظهر/);
});
