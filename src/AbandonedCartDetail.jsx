import React from "react";
import { Send, Clock, ShoppingBag, Wallet, RefreshCw } from "lucide-react";
import useAdminResource from "./use-admin-resource";
import { ResourceState, Money } from "./orders-ui";
import ProductPicture from "./ProductPicture";
import {
  abandonedCartPath,
  cartNumber,
  cartDate,
  reminderLabels,
} from "./abandoned-carts-api";
function CarInfo({ car }) {
  const values = [
    [
      "الشركة",
      car.makeNameAr || car.make_name_ar || car.makeNameEn || car.make_name_en,
    ],
    [
      "السيارة",
      car.modelNameAr ||
        car.model_name_ar ||
        car.modelNameEn ||
        car.model_name_en,
    ],
    [
      "الفئة",
      car.nameAr || car.name_ar || car.nameEn || car.name_en || car.trim,
    ],
    ["السنة", car.year],
    ["من سنة", car.yearFrom ?? car.year_from],
    ["إلى سنة", car.yearTo ?? car.year_to],
    ["المحرك", car.engine],
    ["ناقل الحركة", car.transmission],
  ];
  const fields = values.filter(
    ([, v]) => v != null && v !== "" && typeof v !== "object",
  );
  return fields.length ? (
    <dl className="cart-car-info">
      {fields.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  ) : (
    <p className="cart-api-note">تفاصيل السيارة غير متاحة في الرد.</p>
  );
}
export default function AbandonedCartDetail({
  id,
  revision,
  onBack,
  onRemind,
  canManage,
  uncertain,
  onSessionExpired,
}) {
  const resource = useAdminResource(abandonedCartPath(id), revision),
    data = resource.data?.data,
    valid =
      resource.data &&
      (!data || data.userId !== id || !Array.isArray(data.cart?.items))
        ? { ...resource, error: new Error("رد تفاصيل السلة غير صالح.") }
        : resource,
    row = valid.error ? null : data,
    summary = row?.cart.orderSummary;
  return (
    <>
      <div className="pricing-heading">
        <h1>تفاصيل السلة</h1>
        <div className="cart-heading-actions">
          <button className="pricing-back" onClick={resource.reload}>
            <RefreshCw size={15} />
            تحديث
          </button>
          <button className="pricing-back" onClick={onBack}>
            رجوع للسلات المتروكة
          </button>
        </div>
      </div>
      <ResourceState resource={valid} onLogin={onSessionExpired} />
      {row && (
        <>
          <section className="cart-customer">
            <div className="request-client">
              <span className="pricing-client-avatar">
                {row.name?.[0] || "ع"}
              </span>
              <div>
                {row.name || "عميل بدون اسم"}
                <small dir="ltr">{row.phone || "—"}</small>
                {row.email && <small dir="ltr">{row.email}</small>}
              </div>
            </div>
            <div className="cart-meta">
              {[
                [
                  ShoppingBag,
                  "عدد المنتجات / إجمالي الكمية",
                  cartNumber(row.itemsCount) + " / " + cartNumber(row.quantity),
                ],
                [Wallet, "قيمة المنتجات", <Money value={row.cartValue} />],
                [Clock, "آخر إضافة للسلة", cartDate(row.lastActivityAt)],
                [
                  Clock,
                  "حالة التذكير",
                  reminderLabels[row.reminderStatus] ||
                    row.reminderStatus ||
                    "—",
                ],
              ].map(([I, label, value]) => (
                <div key={label}>
                  <span className="meta-icon">
                    <I size={19} />
                  </span>
                  <div>
                    <small>{label}</small>
                    <b>{value}</b>
                  </div>
                </div>
              ))}
            </div>
            <div className="cart-detail-extra">
              <span>أول إضافة: {cartDate(row.firstAddedAt)}</span>
              <span>التوقف بالساعات: {cartNumber(row.idleHours)}</span>
              <span>آخر تذكير: {cartDate(row.lastReminderAt)}</span>
              <span>عدد التذكيرات: {cartNumber(row.remindersCount)}</span>
            </div>
          </section>
          <section className="cart-products">
            <div className="pricing-heading">
              <h2>المنتجات في السلة ({cartNumber(row.itemsCount)})</h2>
              <button
                className="pricing-primary"
                disabled={!canManage || row.canRemind !== true || uncertain}
                onClick={() => onRemind(row)}
              >
                <Send size={15} />
                إرسال رسالة تذكير
              </button>
            </div>
            {uncertain && (
              <p className="cart-api-note">
                نتيجة الإرسال السابق غير مؤكدة؛ راجع سجل التذكير بعد تحديث
                البيانات.
              </p>
            )}
            <div className="cart-product-list">
              {row.cart.items.map((item) => (
                <article className="cart-product" key={item.id}>
                  <ProductPicture
                    className="cart-product-photo"
                    src={item.thumbnail}
                    alt={item.name || "صورة المنتج"}
                  />
                  <div className="cart-product-data">
                    {item.qualityLabel && (
                      <span className="cart-quality">{item.qualityLabel}</span>
                    )}
                    <h3>{item.name || item.nameEn || "منتج بدون اسم"}</h3>
                    {item.nameEn && <small dir="ltr">{item.nameEn}</small>}
                    <div className="cart-product-tags">
                      <span>الكمية: {cartNumber(item.quantity)}</span>
                      <span>
                        سعر الوحدة: <Money value={item.price} />
                      </span>
                      <b>
                        الإجمالي: <Money value={item.lineTotal} />
                      </b>
                      {item.condition && (
                        <span>
                          {{ new: "جديد", used: "مستعمل", refurbished: "مجدد" }[
                            item.condition
                          ] || item.condition}
                        </span>
                      )}
                      {item.isUniversal && <span>متوافق مع جميع السيارات</span>}
                      {item.vin && <span>VIN: {item.vin}</span>}
                      {item.oldPrice != null && (
                        <span>
                          السعر السابق: <Money value={item.oldPrice} />
                        </span>
                      )}
                      {item.discountPercentage > 0 && (
                        <span>خصم {cartNumber(item.discountPercentage)}%</span>
                      )}
                    </div>
                    {item.linkedCar && (
                      <p className="cart-api-note">
                        السيارة:{" "}
                        {[
                          item.linkedCar.makeNameAr ||
                            item.linkedCar.makeNameEn,
                          item.linkedCar.modelNameAr ||
                            item.linkedCar.modelNameEn,
                          item.linkedCar.year,
                        ]
                          .filter(Boolean)
                          .join(" ") || "—"}
                      </p>
                    )}
                    {item.variant && (
                      <details className="cart-item-extra">
                        <summary>بيانات الفئة</summary>
                        <CarInfo car={item.variant} />
                      </details>
                    )}
                    {item.compatibility?.length > 0 && (
                      <details className="cart-item-extra">
                        <summary>
                          السيارات المتوافقة ({item.compatibility.length})
                        </summary>
                        {item.compatibility.map((car, index) => (
                          <CarInfo key={car.id || index} car={car} />
                        ))}
                      </details>
                    )}
                  </div>
                </article>
              ))}
              {!row.cart.items.length && (
                <p className="pricing-empty">السلة فارغة حاليًا.</p>
              )}
            </div>
          </section>
          {summary && (
            <section className="cart-order-summary">
              <h2>ملخص السلة عند العميل</h2>
              <dl>
                {[
                  ["subtotal", "المجموع"],
                  ["discount", "الخصم"],
                  ["shippingFee", "الشحن"],
                  ["tax", "الضريبة"],
                  ["total", "الإجمالي"],
                ].map(([key, label]) => (
                  <div key={key}>
                    <dt>{label}</dt>
                    <dd>
                      <Money value={summary[key]} />
                    </dd>
                  </div>
                ))}
              </dl>
              {row.cart.coupon && (
                <p className="cart-api-note">
                  الكوبون:{" "}
                  {row.cart.coupon.code || row.cart.coupon.couponCode || "—"}
                </p>
              )}
              {row.cart.missingVinCount > 0 && (
                <p className="cart-api-note">
                  عدد المنتجات اللي محتاجة رقم هيكل:{" "}
                  {cartNumber(row.cart.missingVinCount)}
                </p>
              )}
            </section>
          )}
          <section className="cart-reminders">
            <h2>سجل التذكيرات</h2>
            {Array.isArray(row.reminders) && row.reminders.length > 0 ? (
              <div className="pricing-table-scroll">
                <table className="cart-table">
                  <thead>
                    <tr>
                      <th>تاريخ الإرسال</th>
                      <th>نص التذكير</th>
                      <th>استرداد السلة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {row.reminders.map((r, i) => (
                      <tr key={r.id || r.reminderId || i}>
                        <td>
                          {cartDate(r.sentAt || r.sent_at || r.created_at)}
                        </td>
                        <td>{r.message || "—"}</td>
                        <td>
                          {r.recovered === true
                            ? "تم الاسترداد"
                            : r.recovered === false
                              ? "لم تُسترد"
                              : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="cart-api-note">لا توجد تذكيرات مسجلة.</p>
            )}
          </section>
        </>
      )}
    </>
  );
}
