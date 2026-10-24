import React, { useEffect, useRef, useState } from "react";
import { artwork, referenceHeights } from "./artwork";
import { statuses } from "./demo-data";
export function Art({ name, size = 20, className = "", label }) {
  const [file, x, y, width, height] = artwork[name];
  return (
    <svg
      className={"da-art " + className}
      width={size}
      height={size}
      viewBox={`${x} ${y} ${width} ${height}`}
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
    >
      <image
        href={`/delivery-reference/${file}.png`}
        width="1440"
        height={referenceHeights[file]}
      />
    </svg>
  );
}
export function Money({ children, className = "" }) {
  return (
    <span className={"da-money " + className} dir="ltr">
      <i aria-label="ريال سعودي" role="img" />
      {children}
    </span>
  );
}
export function Badge({ status, label }) {
  const [text, color] = statuses[status] || [status, "orange"];
  return (
    <span className={"da-badge " + color}>
      <i />
      {label || text}
    </span>
  );
}
export function Checkbox({ label, checked, onChange, mixed = false }) {
  const ref = useRef();
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = mixed;
  }, [mixed]);
  return (
    <label className="da-check">
      <input
        ref={ref}
        type="checkbox"
        aria-label={label}
        checked={checked}
        onChange={onChange}
      />
      {checked ? (
        <Art name="checked" size={22} />
      ) : (
        <span className={mixed ? "mixed" : ""} />
      )}
    </label>
  );
}
export function Field({ label, icon, children, className = "" }) {
  return (
    <label className={"da-field " + className}>
      <span className="da-field-label">{label}</span>
      <span className={"da-field-control " + (icon ? "has-icon" : "")}>
        {children}
        {icon && (
          <span className="da-field-icon">
            <Art name={icon} size={22} />
          </span>
        )}
      </span>
    </label>
  );
}
export function Select({
  label,
  options,
  value,
  onChange,
  placeholder = "اختر",
  icon,
  className = "",
}) {
  const [open, setOpen] = useState(false),
    ref = useRef();
  const selected = options.find((row) => row.value === value);
  useEffect(() => {
    if (!open) return;
    const close = (event) => {
      if (!ref.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  useEffect(() => {
    if (open)
      ref.current
        ?.querySelector(
          '[role="option"][aria-selected="true"], [role="option"]',
        )
        ?.focus();
  }, [open]);
  function keys(event) {
    if (event.key === "Escape") {
      setOpen(false);
      ref.current?.querySelector('[role="combobox"]')?.focus();
    }
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      const buttons = [...ref.current.querySelectorAll('[role="option"]')];
      const index = buttons.indexOf(document.activeElement),
        step = event.key === "ArrowUp" ? -1 : 1;
      buttons[
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? buttons.length - 1
            : (index + step + buttons.length) % buttons.length
      ]?.focus();
    }
  }
  return (
    <div className={"da-select " + className} ref={ref} onKeyDown={keys}>
      <button
        type="button"
        role="combobox"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={selected ? "" : "placeholder"}
        onClick={() => setOpen(!open)}
      >
        {icon && (
          <span className="da-field-icon">
            <Art name={icon} size={22} />
          </span>
        )}
        <span>{selected?.label || placeholder}</span>
        <Art name="chevron" size={17} className="da-select-arrow" />
      </button>
      {open && (
        <div className="da-select-menu" role="listbox" aria-label={label}>
          {options.map((row) => (
            <button
              key={row.value}
              type="button"
              role="option"
              aria-selected={row.value === value}
              onClick={() => {
                onChange(row.value);
                setOpen(false);
                ref.current?.querySelector('[role="combobox"]')?.focus();
              }}
            >
              {row.status && (
                <i
                  className={
                    "da-option-dot " + (statuses[row.status]?.[1] || "orange")
                  }
                />
              )}
              {row.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
export function Statistics({ items }) {
  return (
    <section className="da-statistics" aria-label="إحصائيات الطلبات">
      {items.map(([icon, value, label, color]) => (
        <div className={"da-stat " + color} key={icon}>
          <Art name={icon} size={39} />
          <strong>{value}</strong>
          <span>{label}</span>
        </div>
      ))}
    </section>
  );
}
export function Footer() {
  return (
    <footer className="da-footer">
      جميع الحقوق محفوظة 2026 شركة　<span dir="ltr">UR AUTO PART</span>
    </footer>
  );
}
export function Pagination({ page, onChange, pages = 10 }) {
  const initial = Array.from({ length: Math.min(3, pages) }, (_, i) => i + 1);
  return (
    <nav className="da-pagination" aria-label="صفحات النتائج">
      <button disabled={page === 1} onClick={() => onChange(page - 1)}>
        السابق
      </button>
      {initial.map((number) => (
        <button
          key={number}
          className={page === number ? "selected" : ""}
          aria-current={page === number ? "page" : undefined}
          onClick={() => onChange(number)}
        >
          {number}
        </button>
      ))}
      {page > 3 && page < pages && (
        <button className="selected" aria-current="page">
          {page}
        </button>
      )}
      {pages > 3 && (
        <>
          <span>...</span>
          <button
            className={page === pages ? "selected" : ""}
            aria-current={page === pages ? "page" : undefined}
            onClick={() => onChange(pages)}
          >
            {pages}
          </button>
        </>
      )}
      <button disabled={page === pages} onClick={() => onChange(page + 1)}>
        التالي
      </button>
    </nav>
  );
}
export function Notice({ children, onClose }) {
  if (!children) return null;
  return (
    <div className="da-notice" role="status">
      {children}
      <button onClick={onClose}>إغلاق</button>
    </div>
  );
}
