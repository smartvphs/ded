import React, { useEffect, useState } from "react";
import { X, Clock } from "lucide-react";
import { pricingStatuses } from "./pricing-api";
export function PricingBadge({ status, label }) {
  const pair = pricingStatuses[status] || [status || "—", "blue"];
  return (
    <span className={"pricing-badge " + pair[1]}>
      <i />
      {label || pair[0]}
    </span>
  );
}
export function PricingField({ label, children }) {
  return (
    <label className="pricing-field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export function PricingDialog({ title, onClose, busy, children }) {
  useEffect(() => {
    const listener = (e) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", listener);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", listener);
    };
  }, [onClose, busy]);
  return (
    <div
      className="modal-backdrop"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <div
        className="pricing-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="pricing-modal-close"
          aria-label="إغلاق"
          disabled={busy}
          onClick={onClose}
        >
          <X size={20} />
        </button>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}
export function PricingCountdown({ due, created }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!due) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [due]);
  const end = Date.parse(due),
    start = Date.parse(created);
  if (!Number.isFinite(end)) return null;
  const seconds = Math.max(0, Math.ceil((end - now) / 1000)),
    h = Math.floor(seconds / 3600),
    m = Math.floor((seconds % 3600) / 60),
    s = seconds % 60;
  const remaining =
    Number.isFinite(start) && end > start
      ? Math.max(0, Math.min(100, ((end - now) / (end - start)) * 100))
      : null;
  return (
    <div className="detail-urgency">
      <span>
        <Clock size={15} />
        {seconds ? "الوقت المتبقي لإرسال التسعير" : "انتهت مهلة التسعير"}
      </span>
      <div className="detail-time">
        <span dir="ltr">
          {[...(h ? [h] : []), m, s]
            .map((v) => String(v).padStart(2, "0"))
            .join(":")}
        </span>
        {remaining != null && (
          <div>
            <i style={{ width: remaining + "%" }} />
          </div>
        )}
      </div>
    </div>
  );
}
