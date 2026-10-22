import React, { useState } from "react";
import { PricingDialog } from "./pricing-ui";
import { customerStatuses } from "./customer-api";
export function CustomerModal({ title, onClose, busy, children }) {
  return (
    <PricingDialog title={title} onClose={onClose} busy={busy}>
      <div className="customer-modal-content">{children}</div>
    </PricingDialog>
  );
}
export function CustomerInput({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  disabled = false,
  ...props
}) {
  return (
    <label className="customer-field">
      <span>
        {label}
        {required ? " *" : ""}
      </span>
      <input
        aria-label={label}
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange?.(e.target.value)}
        required={required}
        disabled={disabled}
        {...props}
      />
    </label>
  );
}
export function CustomerAvatar({ client }) {
  const [broken, setBroken] = useState(null);
  return client.avatar_url && broken !== client.avatar_url ? (
    <img
      className="customer-avatar"
      src={client.avatar_url}
      alt={client.name || ""}
      onError={() => setBroken(client.avatar_url)}
    />
  ) : (
    <span className="customer-avatar">{client.name?.[0] || "—"}</span>
  );
}
export function CustomerBadge({ customer }) {
  const pair = customerStatuses[customer.status] || [
    customer.status || "—",
    "blue",
  ];
  return (
    <span className={"pricing-badge " + pair[1]}>
      <i />
      {pair[0]}
    </span>
  );
}
export const customerNumber = (value) =>
  value == null
    ? "—"
    : Number(value).toLocaleString("en-US", { maximumFractionDigits: 2 });
