import React, { useState } from "react";
import { SupplierModal, SupplierField, SupplierButton } from "./supplier-ui";
const codes = ["sat", "sun", "mon", "tue", "wed", "thu", "fri"],
  names = [
    "السبت",
    "الأحد",
    "الاثنين",
    "الثلاثاء",
    "الأربعاء",
    "الخميس",
    "الجمعة",
  ];
export function validHours(value) {
  if (value === null) return null;
  const days = value?.days;
  if (
    !Array.isArray(days) ||
    days.length !== 7 ||
    new Set(days.map((d) => d.day)).size !== 7
  )
    throw new Error("حدد أيام الأسبوع السبعة.");
  return {
    days: codes.map((code) => {
      const d = days.find((x) => x.day === code);
      if (!d || typeof d.isOpen !== "boolean")
        throw new Error("بيانات اليوم غير صحيحة.");
      if (!d.isOpen) return { day: code, isOpen: false };
      if (
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(d.from) ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(d.to)
      )
        throw new Error("أدخل البداية والنهاية بصيغة ساعة ودقيقة.");
      return { day: code, isOpen: true, from: d.from, to: d.to };
    }),
  };
}
export default function SupplierHours({
  workingHours,
  pricingHours,
  onClose,
  onSave,
}) {
  const [section, setSection] = useState("workingHours"),
    [error, setError] = useState(""),
    [changed, setChanged] = useState({}),
    [hours, setHours] = useState({
      workingHours: workingHours ?? {
        days: codes.map((day) => ({ day, isOpen: false })),
      },
      pricingHours: pricingHours ?? {
        days: codes.map((day) => ({ day, isOpen: false })),
      },
    });
  const value = hours[section],
    change = (code, key, v) => {
      setChanged({ ...changed, [section]: true });
      setHours({
        ...hours,
        [section]: {
          days: value.days.map((d) =>
            d.day === code ? { ...d, [key]: v } : d,
          ),
        },
      });
    };
  return (
    <SupplierModal title="مواعيد المورد بتوقيت السعودية" onClose={onClose}>
      <SupplierField label="المواعيد">
        <select value={section} onChange={(e) => setSection(e.target.value)}>
          <option value="workingHours">مواعيد العمل</option>
          <option value="pricingHours">استقبال التسعير</option>
        </select>
      </SupplierField>
      {codes.map((code, i) => {
        const d = value?.days?.find((d) => d.day === code);
        return (
          <SupplierField key={code} label={names[i]}>
            <label>
              <input
                type="checkbox"
                checked={!!d?.isOpen}
                onChange={(e) => change(code, "isOpen", e.target.checked)}
              />
              مفتوح
            </label>
            <input
              type="time"
              aria-label={"بداية " + names[i]}
              disabled={!d?.isOpen}
              value={d?.from || ""}
              onChange={(e) => change(code, "from", e.target.value)}
            />
            <input
              type="time"
              aria-label={"نهاية " + names[i]}
              disabled={!d?.isOpen}
              value={d?.to || ""}
              onChange={(e) => change(code, "to", e.target.value)}
            />
          </SupplierField>
        );
      })}
      <p>
        وقت نهاية أسبق من البداية يعني العمل بعد منتصف الليل. المواعيد تُحفظ
        حاليًا ولا تتحكم في توزيع التسعير بعد.
      </p>
      {error && (
        <p className="su-error" role="alert">
          {error}
        </p>
      )}
      <SupplierButton
        onClick={() => {
          try {
            onSave({
              workingHours: changed.workingHours
                ? validHours(hours.workingHours)
                : (workingHours ?? null),
              pricingHours: changed.pricingHours
                ? validHours(hours.pricingHours)
                : (pricingHours ?? null),
            });
          } catch (e) {
            setError(e.message);
          }
        }}
      >
        اعتماد المواعيد
      </SupplierButton>
    </SupplierModal>
  );
}
