import React, { useEffect, useRef, useState } from "react";
import RiyalIcon from "./RiyalIcon";
import "./suppliers.css";
const files = {
  list: ["all suppliers.png", 1440, 1420],
  detail: ["Suppliers Details-3.png", 1440, 1415],
  basic: ["Suppliers Details.png", 1440, 2016],
  form: ["adding provider.png", 799, 1450],
  time: ["Statistics & analysis-1.png", 1440, 1131],
  offer: ["all suppliers-1.png", 1440, 1034],
  analytics: ["Statistics & analysis.png", 1440, 1331],
  tickets: ["Suppliers Details-2.png", 1440, 1987],
  wallet: ["adding balance.png", 540, 541],
  offerProducts: ["all suppliers-3.png", 1440, 1301],
  offerItems: ["all suppliers-2.png", 1440, 1063],
};
export const supplierGlyphs = {
  "pdf-export": ["offerProducts", 119, 141, 20, 20],
  "xls-export": ["offerProducts", 247, 141, 20, 20],
  "product-total": ["offerProducts", 1078, 225, 39, 39],
  "product-active": ["offerProducts", 713, 225, 39, 39],
  "product-cart": ["offerProducts", 347, 225, 39, 39],
  "add-product": ["offerItems", 184, 642, 18, 18],
  "quick-eye": ["offerItems", 171, 562, 20, 20],
  "upload-files": ["offer", 1110, 201, 20, 22],
  geo: ["form", 47, 376, 35, 35],
  all: ["list", 573, 742, 18, 18],
  money: ["wallet", 472, 382, 20, 24],
  send: ["tickets", 65, 1644, 50, 50],
  print: ["tickets", 56, 763, 45, 45],
  users: ["analytics", 1114, 208, 22, 22],
  "users-active": ["list", 1114, 208, 22, 22],
  "analysis-active": ["analytics", 958, 207, 22, 24],
  "time-active": ["time", 760, 207, 22, 24],
  sort: ["list", 969, 804, 14, 15],
  analysis: ["list", 958, 207, 22, 24],
  time: ["list", 760, 207, 22, 24],
  total: ["list", 1078, 290, 39, 39],
  sales: ["list", 860, 290, 39, 39],
  pricing: ["list", 642, 290, 39, 39],
  late: ["list", 425, 290, 39, 39],
  rating: ["list", 207, 290, 39, 39],
  replied: ["detail", 1078, 476, 39, 39],
  confirmed: ["detail", 895, 476, 39, 39],
  response: ["detail", 712, 476, 39, 39],
  duration: ["detail", 529, 476, 39, 39],
  amount: ["detail", 347, 476, 39, 39],
  balance: ["detail", 164, 476, 39, 39],
  eye: ["list", 193, 940, 34, 34],
  trash: ["list", 148, 940, 34, 34],
  more: ["list", 111, 944, 22, 26],
  accept: ["list", 174, 859, 36, 36],
  reject: ["list", 124, 859, 36, 36],
  edit: ["basic", 60, 750, 40, 40],
  person: ["form", 731, 183, 20, 24],
  building: ["form", 364, 183, 20, 24],
  mail: ["form", 731, 282, 20, 24],
  phone: ["form", 364, 282, 20, 24],
  location: ["form", 731, 380, 20, 24],
  image: ["form", 731, 478, 20, 24],
  car: ["form", 731, 726, 20, 24],
  clock: ["form", 731, 824, 20, 24],
  bank: ["form", 731, 1066, 20, 24],
  account: ["form", 364, 1066, 20, 24],
  card: ["form", 731, 1164, 20, 24],
  upload: ["form", 54, 479, 24, 24],
  close: ["form", 20, 20, 28, 28],
  plus: ["list", 137, 144, 15, 17],
  search: ["list", 74, 625, 24, 24],
  chevron: ["form", 57, 828, 18, 16],
  pdf: ["offer", 1087, 339, 25, 26],
  bolt: ["time", 1078, 534, 39, 39],
  fast: ["time", 805, 534, 39, 39],
  activity: ["time", 531, 534, 39, 39],
  alert: ["time", 258, 534, 39, 39],
};
export function SupplierIcon({ name, size, className = "" }) {
  const spec = supplierGlyphs[name];
  if (!spec) return null;
  const [key, x, y, w, h] = spec,
    [file, fw, fh] = files[key];
  return (
    <svg
      className={"su-icon " + className}
      aria-hidden="true"
      focusable="false"
      width={size || w}
      height={size ? (size * h) / w : h}
      viewBox={`${x} ${y} ${w} ${h}`}
    >
      <image href={"/supplier-reference/" + file} width={fw} height={fh} />
    </svg>
  );
}
export const text = (v) =>
  v === null || v === undefined || v === "" ? "—" : String(v);
export function SupplierMoney({ value }) {
  return value === undefined || value === null || value === "" ? (
    <span>—</span>
  ) : (
    <span className="su-money">
      <RiyalIcon />
      {Number.isFinite(Number(value))
        ? new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(
            Number(value),
          )
        : text(value)}
    </span>
  );
}
export function SupplierLogo({ supplier, size = 24 }) {
  return (
    <span className="su-logo" style={{ width: size, height: size }}>
      {supplier?.logo_url || supplier?.logoUrl ? (
        <img
          src={supplier.logo_url || supplier.logoUrl}
          alt=""
          onError={(e) => {
            e.currentTarget.style.visibility = "hidden";
          }}
        />
      ) : (
        <span>{supplier?.name?.slice(0, 1) || "—"}</span>
      )}
    </span>
  );
}
export function SupplierPanel({ title, action, children, className = "" }) {
  return (
    <section className={"su-panel " + className}>
      {(title || action) && (
        <div className="su-panel-heading">
          <h2>{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
export function SupplierStat({
  label,
  value,
  icon,
  tint = "blue",
  money = false,
  note,
}) {
  return (
    <div className={"su-stat " + tint}>
      <SupplierIcon name={icon} size={39} />
      <strong>{money ? <SupplierMoney value={value} /> : text(value)}</strong>
      <span>{label}</span>
      {note && <small>{note}</small>}
    </div>
  );
}
export function SupplierStats({ items, className = "" }) {
  return (
    <section
      className={"su-stats " + className}
      style={{ "--su-count": items.length }}
    >
      {items.map((x) => (
        <SupplierStat key={x.label} {...x} />
      ))}
    </section>
  );
}
export function SupplierButton({
  children,
  icon,
  onClick,
  secondary = false,
  danger = false,
  className = "",
  ...props
}) {
  return (
    <button
      {...props}
      onClick={onClick}
      className={
        "su-button" +
        (secondary ? " secondary" : "") +
        (danger ? " danger" : "") +
        " " +
        className
      }
    >
      {icon && <SupplierIcon name={icon} size={icon === "plus" ? 15 : 20} />}
      <span>{children}</span>
    </button>
  );
}
export function SupplierField({ label, icon, children, wide = false }) {
  return (
    <label className={"su-field" + (wide ? " wide" : "")}>
      <span>{label}</span>
      <div className="su-input">
        {icon && (
          <span className="su-input-icon">
            <SupplierIcon name={icon} size={21} />
          </span>
        )}
        {children}
        {React.isValidElement(children) && children.type === "select" && (
          <SupplierIcon name="chevron" className="su-select-arrow" size={15} />
        )}
      </div>
    </label>
  );
}
export function SupplierBadge({ status, label }) {
  return (
    <span className={"su-badge " + status}>
      <i />
      {label ||
        {
          approved: "نشط",
          pending: "جديد",
          rejected: "موقوف",
          inactive: "غير نشط",
          confirmed: "مؤكد",
          paid: "مؤكد",
          processing: "قيد المعالجة",
          cheaper: "أرخص",
          expensive: "أغلى",
          unmatched: "منتج جديد",
        }[status] ||
        text(status)}
    </span>
  );
}
export function SupplierTable({ head, children, className = "" }) {
  return (
    <div className={"su-table-wrap " + className}>
      <table className="su-table">
        <thead>
          <tr>
            {head.map((x, i) => (
              <th key={i}>{x}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
export function SupplierPager({ page, total, limit = 5, onChange }) {
  const pages = Number.isFinite(total)
    ? Math.max(1, Math.ceil(total / limit))
    : 1;
  const nums = [
    ...new Set([1, page, page + 1, pages].filter((n) => n > 0 && n <= pages)),
  ].sort((a, b) => a - b);
  return (
    <div className="su-pager">
      <button disabled={page === 1} onClick={() => onChange(page - 1)}>
        السابق
      </button>
      {nums.map((n, i) => (
        <React.Fragment key={n}>
          {i > 0 && n - nums[i - 1] > 1 && <span>…</span>}
          <button
            className={page === n ? "active" : ""}
            onClick={() => onChange(n)}
          >
            {n}
          </button>
        </React.Fragment>
      ))}
      <button disabled={page >= pages} onClick={() => onChange(page + 1)}>
        التالي
      </button>
    </div>
  );
}
export function SupplierModal({
  title,
  subtitle,
  children,
  onClose,
  small = false,
  busy = false,
}) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    ref.current?.focus({ preventScroll: true });
    const handler = (e) => {
      if (e.key === "Escape" && !busy) onClose();
      if (e.key === "Tab") {
        const all = [
          ...ref.current.querySelectorAll(
            "button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]",
          ),
        ];
        if (!all.length) return;
        const first = all[0],
          last = all[all.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener("keydown", handler);
      previous?.focus();
    };
  }, [busy]);
  return (
    <div
      className="su-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <section
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={"su-modal" + (small ? " small" : "")}
      >
        <button
          className="su-modal-close"
          disabled={busy}
          aria-label="إغلاق"
          onClick={onClose}
        >
          <SupplierIcon name="close" />
        </button>
        <h2>{title}</h2>
        {subtitle && <p className="su-subtitle">{subtitle}</p>}
        {children}
      </section>
    </div>
  );
}
const colors = [
  "#3d45ed",
  "#00a294",
  "#ff9824",
  "#ed5963",
  "#9754ee",
  "#1097bd",
];
export function SupplierChart({
  items = [],
  kind = "line",
  valueKey = "value",
  labelKey = "label",
  secondaryKey,
  title,
}) {
  const root = useRef(null),
    [width, setWidth] = useState(640);
  useEffect(() => {
    const node = root.current;
    const update = () => setWidth(Math.max(240, node?.clientWidth || 640));
    update();
    const observer = new ResizeObserver(update);
    if (node) observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const plotWidth = Math.max(100, width - 65);
  const rows = items.filter(
    (x) => Number.isFinite(Number(x[valueKey])) && x[valueKey] != null,
  );
  const max = Math.max(
    90,
    ...rows.flatMap((x) => [
      Number(x[valueKey]),
      secondaryKey ? Number(x[secondaryKey]) || 0 : 0,
    ]),
  );
  const x = (i) => 45 + i * (plotWidth / Math.max(1, rows.length - 1)),
    y = (v) => 260 - (Number(v) / max) * 215;
  const points = rows.map((r, i) => [x(i), y(r[valueKey])]);
  const smooth = (points) =>
    points
      .map(([px, py], i) =>
        i
          ? `C ${points[i - 1][0] + (px - points[i - 1][0]) / 2},${points[i - 1][1]} ${points[i - 1][0] + (px - points[i - 1][0]) / 2},${py} ${px},${py}`
          : `M ${px},${py}`,
      )
      .join(" ");
  return (
    <div
      ref={root}
      className="su-chart"
      role="img"
      aria-label={title || "الرسم البياني"}
    >
      <svg viewBox={`0 0 ${width} 320`} preserveAspectRatio="none">
        <defs>
          <linearGradient
            id={"su-chart-fill-" + valueKey}
            x1="0"
            x2="0"
            y1="0"
            y2="1"
          >
            <stop stopColor="#72c8ff" stopOpacity=".6" />
            <stop offset="1" stopColor="#72c8ff" stopOpacity=".05" />
          </linearGradient>
        </defs>
        {Array.from({ length: 10 }, (_, i) => (
          <g key={i}>
            <line
              x1="40"
              x2={width - 10}
              y1={45 + i * (215 / 9)}
              y2={45 + i * (215 / 9)}
              stroke="#e5ebf7"
            />
            <text x="10" y={49 + i * (215 / 9)} fill="#9baed0" fontSize="12">
              {Math.round((max * (9 - i)) / 9)}
            </text>
          </g>
        ))}
        {kind === "bar"
          ? rows.map((r, i) => (
              <rect
                key={i}
                x={50 + i * (plotWidth / Math.max(1, rows.length))}
                y={y(r[valueKey])}
                width="13"
                height={260 - y(r[valueKey])}
                rx="7"
                fill={colors[i % colors.length]}
              />
            ))
          : points.length > 0 && (
              <>
                <path
                  d={smooth(points) + `L ${x(rows.length - 1)},260 L 45,260 Z`}
                  fill={`url(#su-chart-fill-${valueKey})`}
                />
                <path
                  d={smooth(points)}
                  stroke="#195bea"
                  strokeWidth="2.5"
                  fill="none"
                />
                {points.map(([px, py], i) => (
                  <circle key={i} cx={px} cy={py} r="4" fill="#195bea" />
                ))}
                {secondaryKey && (
                  <path
                    d={smooth(
                      rows.map((r, i) => [x(i), y(r[secondaryKey] || 0)]),
                    )}
                    stroke="#33ce58"
                    strokeDasharray="6 5"
                    strokeWidth="2"
                    fill="none"
                  />
                )}
              </>
            )}
        {rows.map((r, i) => (
          <text
            key={i}
            x={kind === "bar" ? 56 + i * (plotWidth / rows.length) : x(i)}
            y="300"
            textAnchor="middle"
            fill="#91a5cb"
            fontSize="11"
          >
            {text(r[labelKey]).slice(0, 14)}
          </text>
        ))}
      </svg>
      {!rows.length && (
        <div className="su-chart-empty">لا توجد بيانات متاحة للرسم</div>
      )}
    </div>
  );
}
export function SupplierDonut({ items = [], total, label = "تسعير" }) {
  const sum = items.reduce((s, x) => s + (Number(x.value) || 0), 0);
  let start = 0;
  const stops = items.map((x, i) => {
    const from = start;
    start += ((Number(x.value) || 0) / Math.max(1, sum)) * 100;
    return `${["#195bea", "#4f9aff", "#8bbcff", "#c4ddff"][i % 4]} ${from}% ${start}%`;
  });
  return (
    <>
      <div
        className="su-donut"
        style={{
          background: sum ? `conic-gradient(${stops.join(",")})` : "#edf2fc",
        }}
      >
        <div>
          <b>{text(total ?? (items.length ? sum : null))}</b>
          <span>{label}</span>
        </div>
      </div>
      <div className="su-donut-legend">
        {items.map((x, i) => (
          <span key={i}>
            <i
              style={{
                background: ["#195bea", "#4f9aff", "#8bbcff", "#c4ddff"][i % 4],
              }}
            />
            {x.label} {text(x.value)}
          </span>
        ))}
      </div>
    </>
  );
}
