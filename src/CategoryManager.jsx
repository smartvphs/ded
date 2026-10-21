import CategoryIcon from "./CategoryIcon";
import { Sprite } from "./products-ui";
import React, { useState } from "react";
import {
  Plus,
  X,
  Trash2,
  Edit3,
  Eye,
  EyeOff,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Search,
  Car,
  Package,
  Grid2X2,
  CalendarDays,
  Coins,
  Settings,
  ChartNoAxesCombined,
} from "lucide-react";
import CategoryAnalytics from "./CategoryAnalytics";
import "./category-manager.css";
const uid = () => Date.now().toString() + Math.random().toString(36).slice(2);
const names = {
  parts: "سوق قطع الغيار",
  used: "سوق قطع الغيار للسيارات المستعمل",
  oil: "الزيوت",
  tires: "إطارات",
  services: "خدمات ماي بارت",
  accessories: "الإكسسوارات",
};
const initialBrands = {
  oil: ["موبيل", "أكسون", "ولما", "موبيل", "أكسون", "ولما"],
  tires: Array(6).fill("بريدجستون"),
};
const partsNames = [
  "فرامل وتعليق",
  "كهربائيات",
  "عفشة وهيكل",
  "تبريد المحرك",
  "زيوت وشحوم",
  "قطع غيار إلكترونية",
];
const accessoryNames = [
  "كاميرات السيارة",
  "سماعات وصوتيات",
  "إضاءة LED",
  "كاميرات خلفية",
  "حاملات الجوال",
  "شواحن السيارة",
  "شاشات ومسجلات",
  "إكسسوارات الديكور",
];
const initialServices = [
  "صيانة وفحص",
  "فحص الإطارات",
  "فحص الفرامل",
  "تغيير الزيت",
  "فحص السوائل",
  "صيانة وفحص",
  "فحص الإطارات",
  "فحص الفرامل",
];
const initialLists = {
  oil: {
    "نوع الزيت": ["تخليقي بالكامل", "نصف تخليقي", "معدني"],
    "لزوجة الزيت": ["SAE 5W-30", "SAE 5W-40", "SAE 15W-40", "SAE 20W-50"],
  },
  tires: {
    العرض: ["155", "165", "175", "185", "195", "205"],
    الإرتفاع: ["50", "55", "60", "65", "70", "75"],
    "مقاس الجنط": ["R13", "R14", "R15", "R16", "R17", "R18"],
    "سنة الإنتاج": ["2015", "2016", "2017", "2018", "2019", "2020"],
    "أسبوع الإنتاج": ["1824", "2524", "4023", "1125", "3524", "0725"],
    "بلد الصنع": [
      "السعودية",
      "الصين",
      "اليابان",
      "كوريا",
      "تايلاند",
      "ألمانيا",
      "تركيا",
      "إندونيسيا",
    ],
  },
  accessories: {
    "توافق المركبة": [
      "سيدان",
      "هاتشباك",
      "SUV",
      "كروس أوفر",
      "كوبيه",
      "رودستر",
      "متعدد",
    ],
    "نوع التركيب": [
      "خارجي",
      "داخلي",
      "OBD2",
      "USB",
      "Bluetooth",
      "رودستر",
      "متعدد",
    ],
  },
};
function UploadField({ value, onChange, label = "إرفاق صورة" }) {
  const [error, setError] = useState("");
  return (
    <label className="cm-field">
      <span>{label}</span>
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(e) => {
          const file = e.target.files[0];
          e.target.value = "";
          if (!file) return;
          if (
            !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
            file.size > 3 * 1024 * 1024
          )
            return setError("اختر صورة JPG أو PNG أو WebP أصغر من 3 ميجابايت");
          setError("");
          const reader = new FileReader();
          reader.onload = () => onChange(reader.result);
          reader.readAsDataURL(file);
        }}
      />
      {value && (
        <img className="cm-upload-preview" src={value} alt="معاينة الصورة" />
      )}
      {error && <small className="form-error">{error}</small>}
    </label>
  );
}
function Stats({ items }) {
  return (
    <div className="cm-stats">
      {items.map(([n, label, color, I]) => (
        <div className={"cm-stat " + color} key={label}>
          <span className="stat-icon">
            <CategoryIcon
              name={
                label.includes("شركة") || label.includes("سيارة")
                  ? "car"
                  : label.includes("سنة")
                    ? "calendar"
                    : label.includes("منتج")
                      ? "package"
                      : "categories"
              }
              size={20}
            />
          </span>
          <b>{n}</b>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}
function Remove({ label, onClick }) {
  return (
    <button className="cm-remove" aria-label={label} onClick={onClick}>
      <X size={13} />
    </button>
  );
}
function ListEditor({ title, values, onAdd, onRemove }) {
  const [input, setInput] = useState(""),
    [error, setError] = useState("");
  return (
    <section className="cm-section">
      <h2>{title}</h2>
      <div className="cm-chips">
        {values.map((v, i) => (
          <span className="cm-chip" key={i}>
            <b>{v}</b>
            <Remove label={"حذف " + v} onClick={() => onRemove(i)} />
          </span>
        ))}
      </div>
      <form
        className="cm-inline-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!input.trim()) return;
          if (values.includes(input.trim()))
            return setError("القيمة مضافة بالفعل");
          onAdd(input.trim());
          setInput("");
          setError("");
        }}
      >
        <label>
          <span>إضافة {title}*</span>
          <div className="cm-inline-input">
            <input
              aria-label={"إضافة " + title}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={title}
            />
            <button type="submit" aria-label={"إضافة قيمة " + title}>
              <Plus size={20} />
            </button>
          </div>
        </label>
        {error && <small className="form-error">{error}</small>}
      </form>
    </section>
  );
}
function RowActions({ onEdit, onDelete, onView, trash = false }) {
  return (
    <div className="cm-row-actions">
      <button className="def-eye" aria-label="عرض التصنيف" onClick={onView}>
        <Eye size={13} />
      </button>
      <button className="cm-edit" aria-label="تعديل التصنيف" onClick={onEdit}>
        <Edit3 size={13} />
      </button>
      <button
        className={trash ? "cm-trash" : "cm-remove"}
        aria-label="حذف التصنيف"
        onClick={onDelete}
      >
        {trash ? <Trash2 size={13} /> : <X size={13} />}
      </button>
    </div>
  );
}
function DataModal({ title, type, initial, onSave, onClose }) {
  const [name, setName] = useState(initial?.name || ""),
    [image, setImage] = useState(initial?.image || null),
    [years, setYears] = useState(initial?.years || "2015 - 2018"),
    [body, setBody] = useState(initial?.body || "سيدان"),
    [cylinders, setCylinders] = useState(initial?.cylinders || "4 سلندر"),
    [transmission, setTransmission] = useState(
      initial?.transmission || "أوتوماتيك",
    );
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="cm-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="pricing-modal-close"
          aria-label="إغلاق"
          onClick={onClose}
        >
          <X size={18} />
        </button>
        <h2>{title}</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim())
              onSave({
                name: name.trim(),
                image,
                years,
                body,
                cylinders,
                transmission,
              });
          }}
        >
          <div className={type === "car" ? "cm-modal-grid" : ""}>
            <label className="cm-field">
              <span>
                {type === "car"
                  ? "اسم السيارة"
                  : type === "company"
                    ? "اسم الشركة"
                    : "اسم التصنيف"}
                *
              </span>
              <input
                aria-label={
                  type === "car"
                    ? "اسم السيارة"
                    : type === "company"
                      ? "اسم الشركة"
                      : "اسم التصنيف"
                }
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={type === "car" ? "مثال: هيونداي" : "اكتب الاسم"}
              />
            </label>
            {["company", "car"].includes(type) && (
              <UploadField
                value={image}
                onChange={setImage}
                label={type === "car" ? "صورة السيارة" : "إرفاق صورة"}
              />
            )}{" "}
            {type === "car" && (
              <>
                <label className="cm-field">
                  <span>سنة الصنع من إلى</span>
                  <input
                    value={years}
                    onChange={(e) => setYears(e.target.value)}
                  />
                </label>
                <label className="cm-field">
                  <span>فئة السيارة</span>
                  <input
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                  />
                </label>
                <label className="cm-field">
                  <span>المحرك</span>
                  <select
                    value={cylinders}
                    onChange={(e) => setCylinders(e.target.value)}
                  >
                    {["4 سلندر", "6 سلندر", "8 سلندر"].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
                <label className="cm-field">
                  <span>ناقل الحركة</span>
                  <select
                    value={transmission}
                    onChange={(e) => setTransmission(e.target.value)}
                  >
                    <option>أوتوماتيك</option>
                    <option>يدوي</option>
                  </select>
                </label>
              </>
            )}
          </div>
          <button className="cm-submit" type="submit">
            <Plus size={16} />
            {initial ? "حفظ التعديل" : "إضافة"}
          </button>
        </form>
      </div>
    </div>
  );
}
export default function CategoryManager({ category, onBack }) {
  const [tab, setTab] = useState("manage"),
    [brands, setBrands] = useState(
      (initialBrands[category] || []).map((name, i) => ({
        id: "brand" + i,
        name,
        image: null,
      })),
    ),
    [brandName, setBrandName] = useState(""),
    [brandImage, setBrandImage] = useState(null),
    [lists, setLists] = useState(initialLists[category] || {}),
    [rows, setRows] = useState(
      (category === "services"
        ? initialServices
        : category === "accessories"
          ? accessoryNames
          : partsNames
      ).map((name, i) => ({
        id: "row" + i,
        name,
        count: [186, 214, 186, 132, 120, 98, 132, 120][i % 8],
        hidden: false,
        children: [],
      })),
    ),
    [companies, setCompanies] = useState(
      ["بي ام دبليو", "بي ام دبليو", "بي ام دبليو"].map((name, i) => ({
        id: "company" + i,
        name,
        image: null,
        open: i === 0,
        cars: [
          {
            id: "car" + i + "a",
            name: "بي ام 116",
            years: "2011 إلى 2020",
            body: "هاتشباك",
            cylinders: "4 سلندر",
            transmission: "أوتوماتيك",
          },
          {
            id: "car" + i + "b",
            name: "بي ام X5",
            years: "2011 إلى 2020",
            body: "سيدان",
            cylinders: "4 سلندر",
            transmission: "أوتوماتيك",
          },
          {
            id: "car" + i + "c",
            name: "بي ام m320",
            years: "2011 إلى 2020",
            body: "سيدان",
            cylinders: "4 سلندر",
            transmission: "أوتوماتيك",
            hidden: true,
          },
        ],
      })),
    ),
    [search, setSearch] = useState(""),
    [rowName, setRowName] = useState(""),
    [menu, setMenu] = useState(null),
    [expanded, setExpanded] = useState(null),
    [childName, setChildName] = useState(""),
    [modal, setModal] = useState(null),
    [confirm, setConfirm] = useState(null),
    [toast, setToast] = useState(""),
    [view, setView] = useState(null);
  const notify = (m) => {
    setToast(m);
    setTimeout(() => setToast(""), 3000);
  };
  const ask = (action) => setConfirm(() => action);
  const stats = ["parts", "used"].includes(category)
    ? [
        ["147", "شركة سيارات", "blue", Car],
        ["147", "سيارة مضافة", "green", Car],
        ["2,340", "سنة صنع مرتبطة", "pink", CalendarDays],
        ["1,240", "منتج مرتبط", "yellow", Package],
        ["9", "تصنيف فرعي", "purple", Grid2X2],
      ]
    : category === "oil"
      ? [
          ["147", "شركة زيت", "blue", Grid2X2],
          ["147", "أنواع الجودة", "green", Settings],
          ["1,240", "منتج", "yellow", Package],
        ]
      : category === "tires"
        ? [
            ["200", "ماركة إطار", "blue", Settings],
            ["34", "إرتفاع متاح", "green", Settings],
            ["15", "عرض إطار", "pink", Settings],
            ["10", "مقاس الجنط", "purple", Settings],
            ["1,240", "منتج", "yellow", Package],
          ]
        : category === "services"
          ? [
              ["8", "تصنيف رئيسي", "blue", Grid2X2],
              ["9", "تصنيف فرعي", "purple", Grid2X2],
              ["1,842", "إجمالي الطلبات", "green", Package],
            ]
          : [
              ["8", "تصنيف فرعي", "blue", Grid2X2],
              ["34", "ماركة منتجات", "green", Package],
              ["12", "نوع الخدمة", "pink", Settings],
              ["1,240", "منتج", "yellow", Package],
            ];
  const editRow = (row) =>
    setModal({
      type: "row",
      title: "تعديل التصنيف",
      initial: row,
      onSave: (data) => {
        setRows(
          rows.map((r) => (r.id === row.id ? { ...r, name: data.name } : r)),
        );
        setModal(null);
      },
    });
  const addRow = (e) => {
    e.preventDefault();
    if (!rowName.trim()) return;
    setRows([
      ...rows,
      {
        id: uid(),
        name: rowName.trim(),
        count: 0,
        hidden: false,
        children: [],
      },
    ]);
    setRowName("");
    notify("تمت إضافة التصنيف في المعاينة");
  };
  const renderRows = () => (
    <section className="cm-section">
      <h2>
        {["parts", "used"].includes(category)
          ? "تصنيفات القطع"
          : category === "accessories"
            ? "التصنيفات الفرعية"
            : "التصنيفات"}
      </h2>
      <div className="cm-row-list">
        {rows.map((row) => (
          <div
            className={"cm-row-wrapper " + (row.hidden ? "cm-hidden" : "")}
            key={row.id}
          >
            <div className="cm-list-row">
              <button
                className="cm-row-label"
                onClick={() => {
                  if (category === "services")
                    setExpanded(expanded === row.id ? null : row.id);
                  else setView(row);
                }}
              >
                <b>{row.name}</b>
                <small>
                  {category === "services"
                    ? (row.children.length ||
                        [7, 7, 5, 10, 5, 7, 7, 5][rows.indexOf(row) % 8]) +
                      " تصنيف فرعي"
                    : row.count + " منتج"}
                </small>
              </button>
              {category === "services" ? (
                <div className="cm-service-menu">
                  <button
                    aria-label={"خيارات " + row.name + " " + row.id}
                    onClick={() => setMenu(menu === row.id ? null : row.id)}
                  >
                    <MoreVertical size={18} />
                  </button>
                  {menu === row.id && (
                    <div className="cm-context-menu">
                      <button
                        onClick={() => {
                          setExpanded(row.id);
                          setMenu(null);
                        }}
                      >
                        <Plus size={13} />
                        إضافة تصنيف فرعي
                      </button>
                      <button
                        onClick={() => {
                          setRows(
                            rows.map((r) =>
                              r.id === row.id ? { ...r, hidden: !r.hidden } : r,
                            ),
                          );
                          setMenu(null);
                        }}
                      >
                        <EyeOff size={13} />
                        {row.hidden ? "إظهار التصنيف" : "إخفاء التصنيف"}
                      </button>
                      <button
                        onClick={() => {
                          editRow(row);
                          setMenu(null);
                        }}
                      >
                        <Edit3 size={13} />
                        تعديل التصنيف
                      </button>
                      <button
                        className="danger-text"
                        onClick={() => {
                          ask(() =>
                            setRows(rows.filter((r) => r.id !== row.id)),
                          );
                          setMenu(null);
                        }}
                      >
                        <Trash2 size={13} />
                        حذف التصنيف
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <RowActions
                  onEdit={() => editRow(row)}
                  onDelete={() =>
                    ask(() => setRows(rows.filter((r) => r.id !== row.id)))
                  }
                  onView={() => setView(row)}
                />
              )}
            </div>
            {expanded === row.id && category === "services" && (
              <div className="cm-children">
                {row.children.map((child, i) => (
                  <div className="cm-child" key={child}>
                    <span>{child}</span>
                    <Remove
                      label={"حذف " + child}
                      onClick={() =>
                        ask(() =>
                          setRows(
                            rows.map((r) =>
                              r.id === row.id
                                ? {
                                    ...r,
                                    children: r.children.filter(
                                      (_, j) => i !== j,
                                    ),
                                  }
                                : r,
                            ),
                          ),
                        )
                      }
                    />
                  </div>
                ))}
                <form
                  className="cm-inline-input"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!childName.trim()) return;
                    setRows(
                      rows.map((r) =>
                        r.id === row.id
                          ? {
                              ...r,
                              children: [...r.children, childName.trim()],
                            }
                          : r,
                      ),
                    );
                    setChildName("");
                  }}
                >
                  <input
                    aria-label={"اسم التصنيف الفرعي " + row.id}
                    value={childName}
                    onChange={(e) => setChildName(e.target.value)}
                    placeholder="اسم التصنيف الفرعي"
                  />
                  <button aria-label="إضافة تصنيف فرعي">
                    <Plus size={19} />
                  </button>
                </form>
              </div>
            )}
          </div>
        ))}
      </div>
      <form className="cm-inline-form" onSubmit={addRow}>
        <label>
          <span>إضافة التصنيف*</span>
          <div className="cm-inline-input">
            <input
              aria-label="اسم التصنيف الجديد"
              value={rowName}
              onChange={(e) => setRowName(e.target.value)}
              placeholder="اسم التصنيف (مثال: فرامل)"
            />
            <button aria-label="إضافة التصنيف">
              <Plus size={20} />
            </button>
          </div>
        </label>
      </form>
    </section>
  );
  return (
    <div
      className={
        "category-management " +
        (["parts", "used"].includes(category) ? "cm-vehicle-management" : "")
      }
    >
      <div className="cm-page-heading">
        <h1>{names[category]}</h1>
        <button onClick={onBack}>
          <ArrowRight size={16} />
          التصنيفات الرئيسية
        </button>
      </div>
      {["parts", "used"].includes(category) && (
        <div className="cm-tabs">
          <button
            className={tab === "manage" ? "selected" : ""}
            onClick={() => setTab("manage")}
          >
            <CategoryIcon name="link" size={15} />
            سوق قطع الغيار
          </button>
          <button
            className={tab === "analytics" ? "selected" : ""}
            onClick={() => setTab("analytics")}
          >
            <CategoryIcon name="chart" size={15} />
            الإحصائيات والتحليلات
          </button>
        </div>
      )}
      {tab === "analytics" ? (
        <CategoryAnalytics />
      ) : (
        <>
          <Stats items={stats} />
          {["parts", "used"].includes(category) ? (
            <div className="cm-parts-layout">
              <section className="cm-section cm-companies">
                <div className="cm-section-heading">
                  <h2>شركات السيارات</h2>
                  <button
                    className="pricing-primary"
                    onClick={() =>
                      setModal({
                        type: "company",
                        title: "إضافة شركة جديدة",
                        onSave: (data) => {
                          setCompanies([
                            ...companies,
                            { ...data, id: uid(), open: true, cars: [] },
                          ]);
                          setModal(null);
                        },
                      })
                    }
                  >
                    <Plus size={14} />
                    إضافة شركة
                  </button>
                </div>
                <label className="cm-company-search">
                  <Search size={15} />
                  <input
                    aria-label="ابحث عن شركة سيارات"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="ابحث عن شركة أو سيارة..."
                  />
                </label>
                {companies
                  .filter(
                    (c) =>
                      c.name.includes(search) ||
                      c.cars.some((car) => car.name.includes(search)),
                  )
                  .map((company) => (
                    <article className="cm-company" key={company.id}>
                      <div className="cm-company-title">
                        <button
                          onClick={() =>
                            setCompanies(
                              companies.map((c) =>
                                c.id === company.id
                                  ? { ...c, open: !c.open }
                                  : c,
                              ),
                            )
                          }
                        >
                          <span className="cm-company-avatar">
                            {company.image ? (
                              <img src={company.image} alt="" />
                            ) : (
                              <Sprite asset="bmw" />
                            )}
                          </span>
                          <span>
                            <b>{company.name}</b>
                            <small>{company.cars.length} سيارات · 2 محرك</small>
                          </span>
                        </button>
                        <div className="cm-company-actions">
                          <RowActions
                            trash
                            onView={() =>
                              setView({
                                name: company.name,
                                count: company.cars.length,
                              })
                            }
                            onEdit={() =>
                              setModal({
                                type: "company",
                                title: "تعديل الشركة",
                                initial: company,
                                onSave: (data) => {
                                  setCompanies(
                                    companies.map((c) =>
                                      c.id === company.id
                                        ? { ...c, ...data }
                                        : c,
                                    ),
                                  );
                                  setModal(null);
                                },
                              })
                            }
                            onDelete={() =>
                              ask(() =>
                                setCompanies(
                                  companies.filter((c) => c.id !== company.id),
                                ),
                              )
                            }
                          />
                          <button
                            aria-label={
                              company.open
                                ? "طي شركة " + company.id
                                : "فتح شركة " + company.id
                            }
                            onClick={() =>
                              setCompanies(
                                companies.map((c) =>
                                  c.id === company.id
                                    ? { ...c, open: !c.open }
                                    : c,
                                ),
                              )
                            }
                          >
                            {company.open ? (
                              <ChevronUp size={15} />
                            ) : (
                              <ChevronDown size={15} />
                            )}
                          </button>
                        </div>
                      </div>
                      {company.open && (
                        <div className="cm-cars">
                          {company.cars.map((car) => (
                            <div
                              className={
                                "cm-car " + (car.hidden ? "cm-hidden" : "")
                              }
                              key={car.id}
                            >
                              <div className="cm-car-heading">
                                <div>
                                  <span className="cm-car-icon">
                                    {car.image ? (
                                      <img src={car.image} alt="" />
                                    ) : (
                                      <CategoryIcon name="car" size={22} />
                                    )}
                                  </span>
                                  <span>
                                    <small>الموديل</small>
                                    <b>{car.name}</b>
                                  </span>
                                </div>
                                <RowActions
                                  trash
                                  onView={() =>
                                    setView({
                                      name: car.name,
                                      description: `${car.body} · ${car.cylinders} · ${car.transmission} · ${car.years}`,
                                    })
                                  }
                                  onEdit={() =>
                                    setModal({
                                      type: "car",
                                      title: "تعديل السيارة",
                                      initial: car,
                                      onSave: (data) => {
                                        setCompanies(
                                          companies.map((c) =>
                                            c.id === company.id
                                              ? {
                                                  ...c,
                                                  cars: c.cars.map((x) =>
                                                    x.id === car.id
                                                      ? { ...x, ...data }
                                                      : x,
                                                  ),
                                                }
                                              : c,
                                          ),
                                        );
                                        setModal(null);
                                      },
                                    })
                                  }
                                  onDelete={() =>
                                    ask(() =>
                                      setCompanies(
                                        companies.map((c) =>
                                          c.id === company.id
                                            ? {
                                                ...c,
                                                cars: c.cars.filter(
                                                  (x) => x.id !== car.id,
                                                ),
                                              }
                                            : c,
                                        ),
                                      ),
                                    )
                                  }
                                />
                              </div>
                              <div className="cm-car-meta">
                                <span>
                                  <CategoryIcon name="engine" size={16} />
                                  المحرك {car.cylinders}
                                </span>
                                <span>
                                  <CategoryIcon name="transmission" size={16} />
                                  ناقل الحركة {car.transmission}
                                </span>
                                <span>
                                  <CategoryIcon name="car" size={16} />
                                  الفئة {car.body}
                                </span>
                                <span>
                                  <CategoryIcon name="calendar" size={16} />
                                  سنوات الصنع من {car.years}
                                </span>
                              </div>
                            </div>
                          ))}
                          <button
                            className="cm-add-car"
                            onClick={() =>
                              setModal({
                                type: "car",
                                title: "إضافة سيارة جديدة",
                                onSave: (data) => {
                                  setCompanies(
                                    companies.map((c) =>
                                      c.id === company.id
                                        ? {
                                            ...c,
                                            cars: [
                                              ...c.cars,
                                              { ...data, id: uid() },
                                            ],
                                          }
                                        : c,
                                    ),
                                  );
                                  setModal(null);
                                },
                              })
                            }
                          >
                            <Plus size={14} />
                            إضافة سيارة
                          </button>
                        </div>
                      )}
                    </article>
                  ))}
              </section>
              <aside className="cm-parts-sidebar">
                {renderRows()}
                <div className="cm-tip">
                  <b>كيفية الإدارة</b>
                  <ul>
                    <li>اضغط على شركة لعرض سياراتها</li>
                    <li>اضغط + لإضافة موديل جديد</li>
                    <li>عدّل سنوات الصنع بالضغط على الـ dropdown</li>
                    <li>تصنيفات القطع على اليمين تنطبق على كل الشركات</li>
                  </ul>
                </div>
              </aside>
            </div>
          ) : (
            <>
              {["oil", "tires"].includes(category) && (
                <section className="cm-section">
                  <h2>
                    {category === "oil"
                      ? "شركة الزيت (العلامة التجارية)"
                      : "شركات الإطارات"}
                  </h2>
                  <div className="cm-brands">
                    {brands.map((brand) => (
                      <div className="cm-brand" key={brand.id}>
                        <Remove
                          label={"حذف ماركة " + brand.id}
                          onClick={() =>
                            ask(() =>
                              setBrands(
                                brands.filter((b) => b.id !== brand.id),
                              ),
                            )
                          }
                        />
                        {brand.image ? (
                          <img src={brand.image} alt={brand.name} />
                        ) : (
                          <span className="cm-brand-placeholder">
                            {brand.name}
                          </span>
                        )}
                        <b>{brand.name}</b>
                      </div>
                    ))}
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!brandName.trim()) return;
                      setBrands([
                        ...brands,
                        {
                          id: uid(),
                          name: brandName.trim(),
                          image: brandImage,
                        },
                      ]);
                      setBrandName("");
                      setBrandImage(null);
                      notify("تمت إضافة الماركة في المعاينة");
                    }}
                  >
                    <div className="cm-brand-fields">
                      <label className="cm-field">
                        <span>
                          {category === "oil"
                            ? "إضافة شركة زيت جديدة"
                            : "إضافة ماركة إطار جديدة"}
                          *
                        </span>
                        <input
                          aria-label="اسم الماركة"
                          required
                          value={brandName}
                          onChange={(e) => setBrandName(e.target.value)}
                          placeholder="اسم الماركة"
                        />
                      </label>
                      <UploadField
                        value={brandImage}
                        onChange={setBrandImage}
                        label="إرفاق صورة القطعة"
                      />
                    </div>
                    <button
                      className="pricing-primary cm-brand-add"
                      type="submit"
                    >
                      <Plus size={15} />
                      إضافة
                    </button>
                  </form>
                </section>
              )}
              {["services", "accessories"].includes(category) && renderRows()}
              {Object.entries(lists).map(([title, values]) => (
                <ListEditor
                  key={title}
                  title={title}
                  values={values}
                  onAdd={(value) =>
                    setLists({ ...lists, [title]: [...values, value] })
                  }
                  onRemove={(index) =>
                    ask(() =>
                      setLists({
                        ...lists,
                        [title]: values.filter((_, i) => i !== index),
                      }),
                    )
                  }
                />
              ))}
            </>
          )}
        </>
      )}
      {modal && <DataModal {...modal} onClose={() => setModal(null)} />}{" "}
      {confirm && (
        <div className="modal-backdrop" onClick={() => setConfirm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>حذف هذا العنصر؟</h2>
            <div className="delete-options">
              <button
                className="primary danger"
                onClick={() => {
                  confirm();
                  setConfirm(null);
                  notify("تم حذف العنصر");
                }}
              >
                حذف
              </button>
              <button onClick={() => setConfirm(null)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
      {view && (
        <div className="modal-backdrop" onClick={() => setView(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="close"
              aria-label="إغلاق"
              onClick={() => setView(null)}
            >
              <X />
            </button>
            <h2>{view.name}</h2>
            <p>{view.description || "عدد المنتجات المرتبطة: " + view.count}</p>
          </div>
        </div>
      )}
      {toast && (
        <div className="definition-toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
