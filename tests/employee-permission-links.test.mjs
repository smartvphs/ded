import test from "node:test";
import assert from "node:assert/strict";
import {
  parentChecked,
  toggleParent,
  departmentPermissionLinks,
} from "../src/employees-ui/permission-links.mjs";
test("each department checkbox enables all its mapped table permissions", () => {
  for (const [id, options] of Object.entries(departmentPermissionLinks))
    options.forEach((parents, index) => {
      const values = { [`${id}-permission-${index}`]: true };
      for (const parent of parents)
        assert.equal(parentChecked(values, parent, false), true);
    });
});
test("shared parent remains checked until its final child is unchecked", () => {
  const values = {
    "orders-1": false,
    "delivery-permission-1": true,
    "order-staff-permission-1": true,
  };
  values["delivery-permission-1"] = false;
  assert.equal(parentChecked(values, "orders-1", false), true);
  values["order-staff-permission-1"] = false;
  assert.equal(parentChecked(values, "orders-1", false), false);
});
test("clearing a parent clears its children without changing unrelated selections", () => {
  const values = {
    "delivery-permission-0": true,
    "order-staff-permission-0": true,
    "product-staff-permission-0": true,
  };
  const next = toggleParent(values, "orders-0", false);
  assert.equal(parentChecked(next, "orders-0", false), false);
  assert.equal(next["delivery-permission-0"], false);
  assert.equal(next["order-staff-permission-0"], false);
  assert.equal(next["product-staff-permission-0"], true);
  assert.equal(values["delivery-permission-0"], true);
});
test("manually granted parent survives removing a child", () =>
  assert.equal(
    parentChecked(
      { "orders-0": true, "delivery-permission-0": false },
      "orders-0",
      false,
    ),
    true,
  ));
