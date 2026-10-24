// Preview relationships only; these are not backend permission codes.
export const departmentPermissionLinks = {
  delivery: [["orders-0"], ["orders-1"], ["orders-1"], ["orders-1"]],
  department: [
    ["departments-0"],
    ["departments-1"],
    ["departments-1"],
    ["departments-2"],
  ],
  "order-staff": [
    ["orders-0"],
    ["orders-1"],
    ["orders-1"],
    ["orders-1"],
    ["orders-1"],
    ["orders-1"],
  ],
  "product-staff": [
    ["products-0"],
    ["products-1"],
    ["products-1"],
    ["products-2"],
    ["products-1"],
    ["products-1"],
  ],
  "customer-service": [
    ["customers-0"],
    ["customers-1"],
    ["support-0"],
    ["support-1"],
    ["support-1"],
    ["support-1"],
  ],
  "supplier-staff": [
    ["suppliers-0"],
    ["suppliers-1"],
    ["suppliers-1"],
    ["suppliers-1"],
    ["suppliers-2"],
    ["suppliers-1"],
  ],
  accountants: [
    ["finance-0"],
    ["finance-0"],
    ["orders-1", "finance-1"],
    ["suppliers-0"],
    ["finance-0"],
    ["finance-1"],
  ],
};
export function linkedOptions(parent) {
  return Object.entries(departmentPermissionLinks).flatMap(([id, options]) =>
    options.flatMap((parents, index) =>
      parents.includes(parent) ? [`${id}-permission-${index}`] : [],
    ),
  );
}
export function parentChecked(values, parent, initial) {
  return (
    (values[parent] ?? initial) ||
    linkedOptions(parent).some((key) => values[key] === true)
  );
}
export function toggleParent(values, parent, initial) {
  const checked = !parentChecked(values, parent, initial);
  const next = { ...values, [parent]: checked };
  if (!checked) for (const key of linkedOptions(parent)) next[key] = false;
  return next;
}
