import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const source = await readFile(
  new URL("../src/delivery/workspace-role.js", import.meta.url),
  "utf8",
);
const { isDeliveryAgentAccount } = await import(
  "data:text/javascript;base64," + Buffer.from(source).toString("base64")
);
const permissions = [
  "orders.view",
  "orders.manage",
  "orders.dispatch",
  "returns.manage",
];
test("the supplied delivery staff permission profile selects its own workspace independent of identity", () => {
  const account = {
    id: "any-staff-id",
    name: "جيمي",
    role: "staff",
    isSuperAdmin: false,
    permissions,
  };
  assert.equal(isDeliveryAgentAccount(account), true);
  assert.equal(
    isDeliveryAgentAccount({
      ...account,
      id: "another-id",
      name: "another name",
      permissions: [...permissions].reverse(),
    }),
    true,
  );
  assert.deepEqual(account.permissions, permissions);
});
test("admin and superadmin keep their original workspace even with the delivery permissions", () => {
  assert.equal(
    isDeliveryAgentAccount({ role: "admin", isSuperAdmin: false, permissions }),
    false,
  );
  assert.equal(
    isDeliveryAgentAccount({ role: "admin", isSuperAdmin: true, permissions }),
    false,
  );
  assert.equal(
    isDeliveryAgentAccount({ role: "staff", isSuperAdmin: true, permissions }),
    false,
  );
});
test("partial, broader and malformed staff profiles do not accidentally become delivery accounts", () => {
  for (const account of [
    null,
    {},
    { role: "staff", permissions },
    { role: "staff", isSuperAdmin: false, permissions: ["orders.view"] },
    {
      role: "staff",
      isSuperAdmin: false,
      permissions: [...permissions, "settings.manage"],
    },
    { role: "staff", isSuperAdmin: false, permissions: "orders.dispatch" },
  ])
    assert.equal(isDeliveryAgentAccount(account), false);
});
