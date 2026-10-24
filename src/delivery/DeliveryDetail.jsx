import React, { useEffect, useRef, useState } from "react";
import { Art, Badge, Field, Footer, Money, Notice, Select } from "./DeliveryUI";
import { demoItems, demoSuppliers } from "./demo-data";
const address = "الرياض 11 شارع الجلاء الرياض المملكة العربية السعودية";
const detailStatuses = [
  { value: "new", label: "جديد", status: "new" },
  { value: "shipped", label: "جاري الشحن", status: "shipped" },
  { value: "delivered", label: "تم التوصيل", status: "delivered" },
  { value: "pending", label: "معلق", status: "pending" },
  { value: "cancelled", label: "ملغي", status: "cancelled" },
];
export default function DeliveryDetail({
  row,
  returns,
  received,
  onReceive,
  saved,
  onSave,
}) {
  const [tab, setTab] = useState("details"),
    [status, setStatus] = useState(saved?.status || "delivered"),
    [costs, setCosts] = useState(
      saved?.costs ||
        Object.fromEntries(demoItems.map((item) => [item.id, item.cost])),
    ),
    [notice, setNotice] = useState("");
  const [shipping, setShipping] = useState(
    saved?.shipping || {
      city: "الرياض",
      district: "حي الزهراء",
      street: "11 شارع التسعين الجنوبي الرياض",
      shortAddress: ["ا", "س", "ص", "م", "2", "4", "3", "5"],
      detailedAddress: "",
      company: "aramex",
      tracking: "021262626262",
      shippedAt: "",
      deliveryAt: "",
      trackingUrl: "",
      shippingCost: "148",
      packagingCost: "25",
      extraFees: "0",
    },
  );
  useEffect(() => {
    onSave({ status, costs, shipping });
  }, [status, costs, shipping]);
  const openMap = () =>
    window.open(
      "https://www.google.com/maps/search/?api=1&query=" +
        encodeURIComponent(address),
      "_blank",
      "noopener,noreferrer",
    );
  if (returns)
    return (
      <>
        <main className="da-main da-return-detail">
          <h1 className="da-title">تفاصيل طلب الإرجاع {row.id}</h1>
          <section className="da-return-hero">
            <div className="da-order-banner">
              <div>
                <b>#{row.orderId}</b>
                <span>تاريخ طلب الإرجاع 02 مايو 2025</span>
              </div>
              <Badge status={received ? "received" : "approved"} />
            </div>
            <div className="da-return-location">
              <Art name="location" size={43} />
              <div>
                <span>الموقع</span>
                <p>{address}</p>
              </div>
              <button
                className="da-map-button"
                aria-label="فتح موقع استلام المرتجع"
                onClick={openMap}
              >
                <Art name="map" size={35} />
              </button>
            </div>
          </section>
          <section className="da-return-item-panel">
            <div className="da-return-item">
              <div className="da-return-item-photo">
                <Art name="wheel" size={112} />
              </div>
              <div className="da-return-item-info">
                <span className="da-quality original">قطعة أصلية</span>
                <h2>رايت ستاف قرص فرامل مثقوب ومشقق</h2>
                <div className="da-return-item-price">
                  الكمية: 1 <Money>154.89</Money>
                </div>
                <div className="da-return-car">
                  <span>مرسيدس C200 من 2015 إلى 2020</span>
                  <span>رقم الهيكل 1HGCM82</span>
                </div>
              </div>
            </div>
          </section>
          <div className="da-return-action">
            <button
              className="da-primary"
              disabled={received}
              onClick={() => {
                onReceive(row.id);
                setNotice("تم تحديث استلام المرتجع في المعاينة.");
              }}
            >
              تم الاستلام
            </button>
          </div>
          <Notice onClose={() => setNotice("")}>{notice}</Notice>
        </main>
      </>
    );
  return (
    <>
      <main className={"da-main da-detail-page da-detail-" + tab}>
        <h1 className="da-title">تفاصيل الطلب</h1>
        <div className="da-order-banner">
          <div>
            <b>#{row.id}</b>
            <span>02 مايو 2025</span>
          </div>
          <Select
            label="حالة طلب المندوب"
            value={status}
            options={detailStatuses}
            onChange={setStatus}
          />
        </div>
        <div
          className="da-detail-tabs"
          role="tablist"
          aria-label="تفاصيل طلب المندوب"
        >
          {[
            ["details", "تفاصيل الطلب", "details"],
            ["costs", "التكاليف", "costs"],
            ["shipping", "الشحن والتتبع", "shipping"],
          ].map(([key, label, icon]) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              className={tab === key ? "active" : ""}
              onClick={() => {
                setTab(key);
                setNotice("");
              }}
            >
              <Art name={icon + (tab === key ? "Active" : "")} size={21} />
              {label}
            </button>
          ))}
        </div>
        {tab === "details" ? (
          <div className="da-detail-layout">
            <div className="da-detail-primary">
              <section className="da-panel da-detail-products">
                <h2>منتجات الطلب</h2>
                <div className="da-table-scroll">
                  <table className="da-table da-items-table">
                    <thead>
                      <tr>
                        {["المنتج", "السيارة", "المصدر", "الكمية"].map(
                          (label) => (
                            <th key={label}>{label}</th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {demoItems.map((item) => (
                        <tr
                          key={item.id}
                          className={item.supplier ? "supplier-row" : ""}
                        >
                          <td>
                            <Product item={item} />
                          </td>
                          <td>
                            <span className="da-car-name">{item.car}</span>
                            <small className="da-vin">
                              رقم الهيكل {item.vin}
                            </small>
                          </td>
                          <td
                            className={
                              item.supplier ? "da-supplier-source" : ""
                            }
                          >
                            {item.source}
                          </td>
                          <td>{item.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="da-admin-notes">
                  <h2>ملاحظات الإدارة</h2>
                  <p>
                    نؤكد أن المنتج الذي طلبتموه يتمتع بجودة وفقًا للمعايير التي
                    نلتزم بها.
                  </p>
                </div>
              </section>
              <Timeline />
            </div>
            <div className="da-detail-secondary">
              {demoSuppliers.map((supplier) => (
                <Supplier
                  key={supplier.name}
                  supplier={supplier}
                  openMap={openMap}
                  onNotice={setNotice}
                />
              ))}
            </div>
          </div>
        ) : tab === "costs" ? (
          <section className="da-panel da-costs">
            <h2>تكلفة المنتجات</h2>
            <div className="da-table-scroll">
              <table className="da-table da-cost-table">
                <thead>
                  <tr>
                    {["المنتج", "المصدر", "الكمية", "التكلفة"].map((label) => (
                      <th key={label}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {demoItems.map((item) => {
                    const warning = Number(costs[item.id]) > item.salePrice;
                    return (
                      <tr key={item.id}>
                        <td className={item.supplier ? "supplier-row" : ""}>
                          <Product item={item} />
                        </td>
                        <td>{item.source}</td>
                        <td>{item.quantity}</td>
                        <td className={warning ? "da-cost-warning-cell" : ""}>
                          <label className="da-cost-input">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              aria-label={"تكلفة " + item.id}
                              value={costs[item.id]}
                              onChange={(e) =>
                                setCosts((old) => ({
                                  ...old,
                                  [item.id]: e.target.value,
                                }))
                              }
                            />
                            <Money />
                          </label>
                          {warning && (
                            <div className="da-cost-warning" role="status">
                              <img
                                src="/delivery-reference/ant-design_warning-filled.png"
                                alt="تنبيه"
                              />
                              <div>
                                سعر التكلفة أعلى من سعر المنتج للبيع
                                <small>
                                  السعر المقترح:{" "}
                                  {item.suggested || item.salePrice} ر.س
                                </small>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <Shipping
            value={shipping}
            onChange={setShipping}
            onConfirm={() =>
              setNotice("تم تحديث بيانات الشحن والتكاليف في المعاينة.")
            }
          />
        )}
        <Notice onClose={() => setNotice("")}>{notice}</Notice>
      </main>
      <Footer />
    </>
  );
}
function Product({ item }) {
  return (
    <div className="da-detail-product">
      <Art name="wheel" size={35} />
      <div>
        <span>{item.name}</span>
        <small dir="ltr">SKU: {item.sku}</small>
        <span
          className={
            "da-quality " + (item.original ? "original" : "alternative")
          }
        >
          {item.original ? "قطعة أصلية" : "قطعة بديلة"}
        </span>
      </div>
    </div>
  );
}
function Supplier({ supplier, openMap, onNotice }) {
  return (
    <section className="da-panel da-supplier-card">
      <h2>تفاصيل المورد</h2>
      <div className="da-supplier-identity">
        <Art name={supplier.image} size={61} />
        <div>
          <span>الإسم</span>
          <h3>{supplier.name}</h3>
        </div>
      </div>
      <div className="da-supplier-divider" />
      <h3 className="da-supplier-subtitle">تفاصيل</h3>
      <p className="da-supplier-company">
        اسم الشركة، المؤسسة، المحل...<span>{supplier.company}</span>
      </p>
      <div className="da-supplier-contact">
        <span>
          الجوال{" "}
          <a
            href={"tel:" + supplier.phone}
            dir="ltr"
            onClick={(event) => {
              event.preventDefault();
              onNotice(
                "أرقام التواصل أمثلة للمعاينة؛ يتاح الاتصال بعد ربط بيانات المورد.",
              );
            }}
          >
            {supplier.phone}
          </a>
          <button
            aria-label={"نسخ جوال " + supplier.name}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(supplier.phone);
                onNotice("تم نسخ رقم الجوال.");
              } catch {
                onNotice("تعذر النسخ؛ يمكنك تحديد رقم الجوال ونسخه.");
              }
            }}
          >
            <Art name="copy" size={16} />
          </button>
        </span>
        <button
          aria-label={"واتساب " + supplier.name}
          onClick={() =>
            onNotice(
              "بيانات التواصل هنا أمثلة للمعاينة؛ تتاح المحادثة بعد ربط بيانات المورد.",
            )
          }
        >
          <Art name="whatsapp" size={20} />
        </button>
      </div>
      <div className="da-supplier-address">
        <span>
          العنوان: <span>{address}</span>
        </span>
        <button
          className="da-map-button"
          aria-label={"موقع " + supplier.name}
          onClick={openMap}
        >
          <Art name="map" size={34} />
        </button>
      </div>
    </section>
  );
}
function Timeline() {
  const rows = [
    [
      "timelineReceived",
      "تم إستلام الطلب",
      "العميل محمد أحمد أنشأ الطلب",
      "10:30 ص",
    ],
    ["timelineProcessing", "قيد المعالجة", "الأدمن بدأ تجهيز الطلب", "11:00 ص"],
    [
      "timelineShipped",
      "تم الشحن",
      "أرامكس، رقم التتبع: 021262626262",
      "02:00 م",
    ],
    ["timelineDelivered", "تم التوصيل", "استلم العميل الطلب بنجاح", "05:30 م"],
  ];
  return (
    <section className="da-panel da-timeline">
      <h2>مسار الطلب</h2>
      <ol>
        {rows.map(([icon, label, description, time], i) => (
          <li key={icon} className={i === 2 ? "da-timeline-dashed" : ""}>
            <Art name={icon} size={44} />
            <div>
              <h3>{label}</h3>
              <p>{description}</p>
            </div>
            <time>12 مارس 2026 · {time}</time>
          </li>
        ))}
      </ol>
    </section>
  );
}
function Shipping({ value, onChange, onConfirm }) {
  const fileInput = useRef();
  const set = (key, next) => onChange((old) => ({ ...old, [key]: next }));
  const input = (key, label, icon, type = "text", placeholder = "") => (
    <Field
      label={label}
      icon={icon}
      key={key}
      className={
        ["detailedAddress", "trackingUrl"].includes(key) ? "da-wide" : ""
      }
    >
      <input
        aria-label={label.replaceAll("*", "")}
        value={value[key]}
        type={type}
        min={type === "number" ? 0 : undefined}
        step={type === "number" ? "0.01" : undefined}
        placeholder={placeholder}
        onChange={(e) => set(key, e.target.value)}
      />
    </Field>
  );
  return (
    <div className="da-shipping">
      <h2 className="da-shipping-title">شركات الشحن</h2>
      <div className="da-shipping-logo">
        <Art name="shippingLogo" size={104} label="SMSA Express" />
      </div>
      <section className="da-panel da-shipping-address">
        <h2>عنوان التوصيل</h2>
        <div className="da-form-grid">
          <div className="da-field">
            <span className="da-field-label">المدينة</span>
            <Select
              label="المدينة"
              icon="city"
              value={value.city}
              onChange={(next) => set("city", next)}
              options={["الرياض", "جدة", "الدمام"].map((name) => ({
                value: name,
                label: name,
              }))}
            />
          </div>
          {input("district", "الحي*", "district")}
          {input("street", "الشارع*", "street")}
          <div className="da-field">
            <span className="da-field-label">العنوان الوطني المختصر</span>
            <div
              className="da-short-address"
              onPaste={(e) => {
                const chars = e.clipboardData
                  .getData("text")
                  .replace(/\s/g, "")
                  .slice(0, 8)
                  .split("");
                if (chars.length > 1) {
                  e.preventDefault();
                  set(
                    "shortAddress",
                    Array.from({ length: 8 }, (_, i) => chars[i] || ""),
                  );
                }
              }}
            >
              {value.shortAddress.map((char, i) => (
                <input
                  key={i}
                  aria-label={"حرف العنوان المختصر " + (i + 1)}
                  maxLength={1}
                  value={char}
                  onChange={(e) =>
                    set(
                      "shortAddress",
                      value.shortAddress.map((old, n) =>
                        n === i ? e.target.value : old,
                      ),
                    )
                  }
                />
              ))}
            </div>
          </div>
          {input(
            "detailedAddress",
            "العنوان التفصيلي",
            "pin",
            "text",
            "http://aramex.com/track/ ...",
          )}
        </div>
      </section>
      <section className="da-panel da-shipping-data">
        <h2>بيانات الشحن</h2>
        <div className="da-form-grid">
          <div className="da-field">
            <span className="da-field-label">شركة الشحن</span>
            <Select
              label="شركة الشحن"
              icon="truck"
              value={value.company}
              onChange={(next) => set("company", next)}
              options={[
                { value: "aramex", label: "أرامكس Aramex" },
                { value: "smsa", label: "SMSA Express" },
              ]}
            />
          </div>
          {input("tracking", "رقم بوليصة الشحن / رمز التتبع*", "barcode")}
          {input("shippedAt", "تاريخ الشحن", "calendar", "date")}
          {input("deliveryAt", "تاريخ التوصيل المتوقع", "calendar", "date")}
          {input(
            "trackingUrl",
            "رابط التتبع المباشر",
            "link",
            "url",
            "http://aramex.com/track/ ...",
          )}
          <div className="da-field da-wide">
            <span className="da-field-label">إرفاق صورة البوليصة</span>
            <button
              type="button"
              className="da-bill-upload"
              onClick={() => fileInput.current?.click()}
            >
              <Art name="image" size={22} />
              <span>{value.billName || "تم تحميل 1 صورة"}</span>
              <Art name="upload" size={24} />
            </button>
            <input
              className="da-file-input"
              ref={fileInput}
              type="file"
              aria-label="إرفاق صورة البوليصة"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (
                  file &&
                  ["image/png", "image/jpeg", "image/webp"].includes(file.type)
                )
                  set("billName", file.name);
              }}
            />
          </div>
        </div>
      </section>
      <section className="da-panel da-shipping-costs">
        <h2>التكاليف و الشحن</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onConfirm();
          }}
        >
          <div className="da-shipping-cost-box da-form-grid">
            {[
              ["shippingCost", "تكلفة الشحن"],
              ["packagingCost", "تكلفة التعبئة والتغليف"],
              ["extraFees", "رسوم إضافية أخرى (اختياري)"],
            ].map(([key, label]) => (
              <Field
                key={key}
                label={label}
                icon="flame"
                className={key === "extraFees" ? "da-wide" : ""}
              >
                <input
                  aria-label={label}
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={value[key]}
                  onChange={(e) => set(key, e.target.value)}
                />
                <Money />
              </Field>
            ))}
          </div>
          <button className="da-primary da-confirm-costs" type="submit">
            تأكيد التكاليف <Art name="arrow" size={20} />
          </button>
        </form>
      </section>
    </div>
  );
}
