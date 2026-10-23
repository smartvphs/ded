import React, { useState } from "react";
import { PricingDialog } from "./pricing-ui";
export default function SiteLocationDialog({ value, onClose, onSave }) {
  const [draft, setDraft] = useState({
      mapUrl: value?.mapUrl || "",
      lat: value?.lat ?? "",
      lng: value?.lng ?? "",
    }),
    [error, setError] = useState("");
  return (
    <PricingDialog title="تحديد الموقع" onClose={onClose}>
      <div className="st-grid two">
        {[
          ["mapUrl", "رابط الخريطة"],
          ["lat", "خط العرض"],
          ["lng", "خط الطول"],
        ].map(([key, label]) => (
          <label className="st-field" key={key}>
            <span>{label}</span>
            <span className="st-control">
              <input
                aria-label={label}
                value={draft[key]}
                type={key === "mapUrl" ? "url" : "number"}
                step="any"
                onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
              />
            </span>
          </label>
        ))}
      </div>
      {error && <p role="alert">{error}</p>}
      <button
        className="st-button"
        onClick={() => {
          try {
            if (draft.mapUrl && new URL(draft.mapUrl).protocol !== "https:")
              throw new Error("رابط الخريطة يجب أن يبدأ بـ https.");
            const next = { ...value };
            for (const key of ["mapUrl", "lat", "lng"]) {
              if (draft[key] === "") {
                delete next[key];
                continue;
              }
              next[key] = key === "mapUrl" ? draft[key] : Number(draft[key]);
            }
            if (
              (next.lat != null &&
                (!Number.isFinite(next.lat) || Math.abs(next.lat) > 90)) ||
              (next.lng != null &&
                (!Number.isFinite(next.lng) || Math.abs(next.lng) > 180))
            )
              throw new Error("الإحداثيات غير صحيحة.");
            onSave(next);
            onClose();
          } catch (e) {
            setError(e.message);
          }
        }}
      >
        اعتماد الموقع
      </button>
    </PricingDialog>
  );
}
