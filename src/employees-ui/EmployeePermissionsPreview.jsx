import React, { Fragment, useState } from "react";
import "./employee-permissions-preview.css";

const rows = [
  ["managers", "المديرين", [true, true, true]],
  ["categories", "التصنيفات", [true, false, false]],
  ["products", "المنتجات", [false, true, true]],
  ["orders", "الطلبات", [true, true, true]],
  ["pricing", "طلبات التسعير", [true, false, false]],
  ["customers", "العملاء", [true, true, true]],
  ["suppliers", "الموردين", [true, true, true]],
  ["notifications", "الإشعارات", [true, true, true]],
];
const extras = {
  categories: {
    title: "اضافات خاصة بالتصنيفات",
    description: "صلاحية مخصصة للتحكم في عرض وتعديل احصائيات قسم التصنيفات",
    options: ["عرض الإحصائيات", "تعديل الإحصائيات"],
  },
  customers: {
    title: "اضافات خاصة بخدمة العملاء",
    description: "صلاحية مخصصة للتحكم في عرض وتعديل اضافات قسم خدمة العملاء",
    options: [
      "عرض نسبة الكاش باك",
      "تعديل نسبة الكاش باك",
      "عرض اضافة رصيد للعميل",
      "تعديل اضافة رصيد للعميل",
    ],
  },
};
const departmentCards = [
  [
    "delivery",
    "مندوبي التوصيل",
    [
      "عرض طلبات التوصيل",
      "تجهيز طلبات التوصيل",
      "تحديث حالة التوصيل",
      "استلام المرتجعات",
    ],
  ],
  [
    "department",
    "موظفي الأقسام",
    ["عرض بيانات الأقسام", "إضافة الأقسام", "تعديل الأقسام", "حذف الأقسام"],
  ],
  [
    "order-staff",
    "قسم الطلبات",
    [
      "عرض الطلبات",
      "تعديل بنود الطلب",
      "تحديث حالة الطلب",
      "تعديل بيانات التواصل",
      "تعديل الدفع والكوبون",
      "إدارة المرتجعات",
    ],
  ],
  [
    "product-staff",
    "موظفي المنتجات",
    [
      "عرض المنتجات",
      "إضافة المنتجات",
      "تعديل المنتجات",
      "حذف المنتجات",
      "إدارة الجودات والأسعار",
      "تحديث المخزون",
    ],
  ],
  [
    "customer-service",
    "خدمة العملاء",
    [
      "عرض بيانات العملاء",
      "تعديل بيانات العملاء",
      "عرض تذاكر المساعدة",
      "الرد على التذاكر",
      "تعيين التذاكر وتحديد الأولوية",
      "إضافة ملاحظات داخلية",
    ],
  ],
  [
    "supplier-staff",
    "موظفي الموردين",
    [
      "عرض بيانات الموردين",
      "إضافة الموردين",
      "تعديل بيانات الموردين",
      "إيقاف وتفعيل الموردين",
      "حذف الموردين",
      "إدارة ملفات أسعار الموردين",
    ],
  ],
  [
    "accountants",
    "المحاسبين",
    [
      "عرض تقرير الأداء والأرباح",
      "عرض التكاليف",
      "تسجيل وتعديل تكلفة القطعة",
      "عرض أرصدة الموردين",
      "عرض التسويات",
      "إدارة التسويات",
    ],
  ],
];

function Artwork({ box, expanded = false, className = "" }) {
  return (
    <svg className={className} viewBox={box.join(" ")} aria-hidden="true">
      <image
        href={`/employee-reference/${expanded ? "75" : "02"}.jpg`}
        width="1440"
        height={expanded ? 1266 : 1060}
      />
    </svg>
  );
}
function Check({ label, checked, onChange }) {
  return (
    <label className="epp-check">
      <input
        type="checkbox"
        aria-label={label}
        checked={checked}
        onChange={onChange}
      />
      <Artwork box={checked ? [179, 275, 21, 21] : [179, 355, 21, 21]} />
    </label>
  );
}
function ExtraCard({
  title,
  description,
  options,
  values,
  onToggle,
  initial = false,
}) {
  return (
    <section className="epp-extra" aria-label={title}>
      <div className="epp-extra-heading">
        <Artwork expanded box={[1062, 439, 40, 40]} />
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      <div className="epp-options">
        {options.map((option, index) => (
          <div className="epp-option" key={option}>
            <span>{option}</span>
            <Check
              label={option}
              checked={values[index] ?? initial}
              onChange={() => onToggle(index, initial)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

// Local preview state only: these controls never change server or session permissions.
export default function EmployeePermissionsPreview({ name = "محمد احمد" }) {
  const [open, setOpen] = useState({});
  const [pages, setPages] = useState({});
  const [page, setPage] = useState(1);
  const values = pages[page] || {};
  const toggle = (key, initial) =>
    setPages((previous) => ({
      ...previous,
      [page]: { ...previous[page], [key]: !(previous[page]?.[key] ?? initial) },
    }));
  return (
    <section
      className="employee-permissions-preview"
      dir="rtl"
      aria-label="صلاحيات الموظف"
    >
      <h1>صلاحيات الموظف {name}</h1>
      <div className="epp-scroll">
        <table className="epp-table">
          <thead>
            <tr>
              {["صلاحيات", "قراءة", "كتابة", "حذف"].map((label) => (
                <th key={label} scope="col">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([id, label, defaults]) => (
              <Fragment key={id}>
                <tr className="epp-main-row">
                  <th scope="row">
                    {extras[id] ? (
                      <button
                        className="epp-expand"
                        aria-expanded={!!open[id]}
                        onClick={() =>
                          setOpen((previous) => ({
                            ...previous,
                            [id]: !previous[id],
                          }))
                        }
                      >
                        <Artwork
                          box={[1023, 356, 15, 18]}
                          className={open[id] ? "is-open" : ""}
                        />
                        {label}
                      </button>
                    ) : (
                      label
                    )}
                  </th>
                  {defaults.map((initial, index) => (
                    <td key={index}>
                      <Check
                        label={`${label} ${["قراءة", "كتابة", "حذف"][index]}`}
                        checked={values[`${id}-${index}`] ?? initial}
                        onChange={() => toggle(`${id}-${index}`, initial)}
                      />
                    </td>
                  ))}
                </tr>
                {open[id] && (
                  <tr className="epp-extra-row">
                    <td colSpan="4">
                      <section className="epp-extra">
                        <div className="epp-extra-heading">
                          <Artwork expanded box={[1062, 439, 40, 40]} />
                          <div>
                            <h2>{extras[id].title}</h2>
                            <p>{extras[id].description}</p>
                          </div>
                        </div>
                        <div className="epp-options">
                          {extras[id].options.map((option, index) => (
                            <div className="epp-option" key={option}>
                              <span>{option}</span>
                              <Check
                                label={option}
                                checked={
                                  values[`${id}-extra-${index}`] ??
                                  index % 2 === 0
                                }
                                onChange={() =>
                                  toggle(
                                    `${id}-extra-${index}`,
                                    index % 2 === 0,
                                  )
                                }
                              />
                            </div>
                          ))}
                        </div>
                      </section>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <div className="epp-department-cards" aria-label="إضافات أقسام الموظفين">
        {departmentCards.map(([id, label, options]) => (
          <ExtraCard
            key={id}
            title={`إضافات خاصة ب${label}`}
            description={`صلاحيات مخصصة للتحكم في عرض وإدارة قسم ${label}`}
            options={options}
            values={options.map(
              (_, index) => values[`${id}-permission-${index}`],
            )}
            onToggle={(index, initial) =>
              toggle(`${id}-permission-${index}`, initial)
            }
          />
        ))}
      </div>
      <nav className="epp-pagination" aria-label="صفحات صلاحيات الموظفين">
        <button disabled={page === 1} onClick={() => setPage(page - 1)}>
          السابق
        </button>
        {[1, 2, 3, "…", 10].map((number) =>
          number === "…" ? (
            <span key="ellipsis">…</span>
          ) : (
            <button
              key={number}
              className={page === number ? "selected" : ""}
              aria-current={page === number ? "page" : undefined}
              onClick={() => setPage(number)}
            >
              {number}
            </button>
          ),
        )}
        {![1, 2, 3, 10].includes(page) && (
          <button className="selected" aria-current="page">
            {page}
          </button>
        )}
        <button disabled={page === 10} onClick={() => setPage(page + 1)}>
          التالي
        </button>
      </nav>
    </section>
  );
}
