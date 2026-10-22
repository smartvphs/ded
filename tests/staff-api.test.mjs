import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const source = (
  await readFile(new URL("../src/staff-api.js", import.meta.url), "utf8")
).replace(
  /import\s+\{[^}]+\}\s+from\s+['"]\.\/admin-api['"];?/,
  `const adminRequest=(...args)=>globalThis.staffRequest(...args);`,
);
const {
  staffBody,
  permissionsBody,
  changePermissionKeys,
  samePermissions,
  readStaff,
  verifyStaff,
  normalizeStaff,
} = await import(
  "data:text/javascript;base64," + Buffer.from(source).toString("base64")
);
const groups = [
  {
    key: "catalog",
    permissions: [{ key: "catalog.manage" }, { key: "orders.read" }],
  },
];
test("staff creation sends only documented fields, edit excludes password and permissions", () => {
  const draft = {
    name: " أحمد علي ",
    email: " a@example.com ",
    password: "12345678",
    permissions: ["orders.read"],
    isActive: false,
  };
  assert.deepEqual(staffBody(draft, true), {
    name: "أحمد علي",
    email: "a@example.com",
    password: "12345678",
    permissions: ["orders.read"],
  });
  assert.deepEqual(staffBody(draft), {
    name: "أحمد علي",
    email: "a@example.com",
  });
  assert.throws(() => staffBody({ ...draft, password: "123" }, true));
  assert.throws(() => staffBody({ ...draft, email: "bad" }, true));
});
test("shared grants preserve unrelated and previously saved unknown permissions", () => {
  const saved = ["legacy.read", "orders.read"];
  assert.deepEqual(changePermissionKeys(saved, ["catalog.manage"], true), [
    "legacy.read",
    "orders.read",
    "catalog.manage",
  ]);
  assert.deepEqual(permissionsBody(saved, groups, saved), {
    permissions: saved,
  });
  assert.throws(() => permissionsBody(["invented.key"], groups));
  assert.equal(samePermissions(["a", "b"], ["b", "a"]), true);
  assert.equal(samePermissions(["a"], ["b"]), false);
});
test("readback uses documented list and deleted filter, verifies persisted values", async () => {
  const paths = [];
  globalThis.staffRequest = async (path) => {
    paths.push(path);
    return {
      data: [
        {
          id: "s1",
          name: "أحمد",
          is_active: false,
          permissions: ["orders.read"],
          deletedAt: "2026-10-22",
        },
      ],
    };
  };
  const row = await readStaff("s1");
  verifyStaff(row, { isActive: false, permissions: ["orders.read"] });
  await readStaff("s1", { deleted: true });
  assert.deepEqual(paths, [
    "/api/admin/staff",
    "/api/admin/staff?status=deleted",
  ]);
  assert.throws(() => verifyStaff(row, { isActive: true }));
  assert.throws(() => verifyStaff(row, { permissions: ["catalog.manage"] }));
  await assert.rejects(readStaff("missing"));
  assert.equal(normalizeStaff({ is_active: true }).isActive, true);
});
