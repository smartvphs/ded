// The delivery staff profile supplied for this workspace. Administrative roles
// and staff with broader permissions keep the existing admin application.
const deliveryPermissions = new Set([
  "orders.view",
  "orders.manage",
  "orders.dispatch",
  "returns.manage",
]);
export function isDeliveryAgentAccount(account) {
  if (
    account?.role !== "staff" ||
    account.isSuperAdmin !== false ||
    !Array.isArray(account.permissions)
  )
    return false;
  const permissions = new Set(account.permissions);
  return (
    permissions.size === deliveryPermissions.size &&
    [...deliveryPermissions].every((permission) => permissions.has(permission))
  );
}
