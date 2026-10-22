import React, { useState } from "react";
import { OrderDetail, ReturnDetail } from "./OrderDetail";
import PricingDetails from "./PricingDetails";
import ProductPreview from "./ProductPreview";
import SupportTicket from "./SupportTicket";
import useAdminResource from "./use-admin-resource";
import { ResourceState, Money } from "./orders-ui";
import { notificationTime } from "./notifications-api";
import "./orders-page.css";
import "./products.css";
import "./support.css";
const noop = () => {};
const definitions = {
  service: {
    title: "تفاصيل الخدمة",
    path: "/api/suppliers/admin/services/",
    fields: [
      ["اسم الخدمة", "name"],
      ["الاسم بالإنجليزية", "nameEn"],
      ["الوصف", "description"],
      ["مقدم الخدمة", "supplierName"],
      ["مركز الصيانة", "centerName"],
      ["التصنيف", "categoryName"],
      ["التصنيف الفرعي", "subcategoryName"],
      ["السعر", "price", "money"],
      ["سعر العميل", "customerPrice", "money"],
      ["المدن", "cities"],
      ["مدة الخدمة بالدقائق", "durationMinutes"],
      ["نوع الموقع", "locationType"],
      ["العنوان", "workshopAddress"],
      ["ما تشمله الخدمة", "includes"],
      ["الشروط", "terms"],
      ["الضمان", "warrantyInfo"],
      ["حالة المراجعة", "approvalStatus"],
      ["نشط", "isActive"],
      ["تاريخ الإضافة", "createdAt", "date"],
    ],
  },
  supplier: {
    title: "تفاصيل المورد",
    path: "/api/suppliers/admin/",
    fields: [
      ["الاسم", "name"],
      ["الاسم بالإنجليزية", "name_en"],
      ["مسؤول التواصل", "contact_name"],
      ["الهاتف", "phone"],
      ["البريد الإلكتروني", "email"],
      ["المدينة", "city"],
      ["العنوان", "address"],
      ["نوع المورد", "supplier_type"],
      ["حالة المراجعة", "approval_status"],
      ["موثق", "is_verified"],
      ["عدد المنتجات", "products_count"],
      ["المنتجات النشطة", "active_products_count"],
      ["تاريخ الإضافة", "created_at", "date"],
    ],
  },
  contact_message: {
    title: "تفاصيل رسالة التواصل",
    path: "/api/contact/admin/",
    fields: [
      ["الاسم", "name"],
      ["البريد الإلكتروني", "email"],
      ["الهاتف", "phone"],
      ["الموضوع", "subject"],
      ["الرسالة", "message"],
      ["الحالة", "status"],
      ["ملاحظات الإدارة", "admin_notes"],
      ["تاريخ الإرسال", "created_at", "date"],
    ],
  },
};
function display(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "نعم" : "لا";
  if (Array.isArray(value))
    return (
      value
        .map((x) =>
          typeof x === "string" ? x : x?.name || x?.nameAr || x?.name_ar || "—",
        )
        .join("، ") || "—"
    );
  return typeof value === "object" ? "—" : String(value);
}
function Record({ target, onSessionExpired }) {
  const config = definitions[target.entity];
  const resource = useAdminResource(
    config.path + encodeURIComponent(target.id),
  );
  const row = resource.data?.data;
  return (
    <>
      <h2>{config.title}</h2>
      <ResourceState resource={resource} onLogin={onSessionExpired} />
      {row && (
        <dl className="nt-facts">
          {config.fields.map(([label, key, type]) => (
            <div key={key}>
              <dt>{label}</dt>
              <dd>
                {row[key] === null || row[key] === undefined ? (
                  "—"
                ) : type === "money" ? (
                  <Money value={row[key]} />
                ) : type === "date" ? (
                  notificationTime(row[key])
                ) : (
                  display(row[key])
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </>
  );
}
function Products({ ids, onSessionExpired }) {
  const [selected, setSelected] = useState(ids[0] || "");
  const resource = useAdminResource(
    selected ? "/api/products/admin/" + encodeURIComponent(selected) : null,
  );
  return (
    <>
      <h2>المنتجات المرتبطة بالإشعار</h2>
      {ids.length > 1 && (
        <label>
          المنتج{" "}
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            {ids.map((id, i) => (
              <option key={id} value={id}>
                المنتج {i + 1}
              </option>
            ))}
          </select>
        </label>
      )}
      <ResourceState resource={resource} onLogin={onSessionExpired} />
      {resource.data?.data && (
        <ProductPreview key={selected} product={resource.data.data} />
      )}
    </>
  );
}
function PriceList({ id, onSessionExpired }) {
  const [page, setPage] = useState(0);
  const resource = useAdminResource(
    "/api/suppliers/admin/price-lists/" +
      encodeURIComponent(id) +
      "?limit=30&offset=" +
      page * 30,
  );
  const data = resource.data?.data,
    list = data?.priceList;
  return (
    <>
      <h2>تفاصيل قائمة الأسعار</h2>
      <ResourceState resource={resource} onLogin={onSessionExpired} />
      {list && (
        <>
          <dl className="nt-facts">
            {[
              ["الملف", list.fileName],
              ["المورد", list.supplierName],
              ["الحالة", list.status],
              ["تاريخ الإضافة", notificationTime(list.createdAt)],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{display(value)}</dd>
              </div>
            ))}
          </dl>
          <div className="nt-table">
            <table>
              <thead>
                <tr>
                  <th>رقم القطعة</th>
                  <th>اسم القطعة</th>
                  <th>سعر المورد</th>
                  <th>سعر المنصة</th>
                  <th>المقارنة</th>
                </tr>
              </thead>
              <tbody>
                {(data.items || []).map((row) => (
                  <tr key={row.id}>
                    <td>{display(row.part_number)}</td>
                    <td>{display(row.part_name)}</td>
                    <td>
                      {row.supplier_price == null ? (
                        "—"
                      ) : (
                        <Money value={row.supplier_price} />
                      )}
                    </td>
                    <td>
                      {row.platform_price == null ? (
                        "—"
                      ) : (
                        <Money value={row.platform_price} />
                      )}
                    </td>
                    <td>{display(row.comparison)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="nt-pagination">
            <button disabled={!page} onClick={() => setPage((n) => n - 1)}>
              السابق
            </button>
            <span>{page + 1}</span>
            <button
              disabled={
                !Number.isInteger(resource.data.meta?.total) ||
                (page + 1) * 30 >= resource.data.meta.total
              }
              onClick={() => setPage((n) => n + 1)}
            >
              التالي
            </button>
          </div>
        </>
      )}
    </>
  );
}
export default function NotificationDestination({
  target,
  onBack,
  onSessionExpired,
}) {
  const [busy, setBusy] = useState(false),
    [uncertain, setUncertain] = useState(false);
  if (target.entity === "order")
    return (
      <OrderDetail
        id={target.id}
        onBack={onBack}
        backLabel="الإشعارات"
        onSessionExpired={onSessionExpired}
      />
    );
  if (target.entity === "return")
    return (
      <ReturnDetail
        id={target.id}
        onBack={onBack}
        onSessionExpired={onSessionExpired}
      />
    );
  if (target.entity === "pricing_request")
    return (
      <PricingDetails
        id={target.id}
        onBack={onBack}
        backLabel="الإشعارات"
        onChanged={noop}
        onSessionExpired={onSessionExpired}
      />
    );
  return (
    <section className="nt-destination">
      <button disabled={busy} onClick={onBack}>
        العودة للإشعارات
      </button>
      {target.entity === "ticket" ? (
        <SupportTicket
          id={target.id}
          onChanged={noop}
          onBusyChange={setBusy}
          uncertain={uncertain}
          onUncertain={() => setUncertain(true)}
          onSessionExpired={onSessionExpired}
        />
      ) : target.entity === "products" ? (
        <Products ids={target.ids} onSessionExpired={onSessionExpired} />
      ) : target.entity === "price_list" ? (
        <PriceList id={target.id} onSessionExpired={onSessionExpired} />
      ) : definitions[target.entity] ? (
        <Record target={target} onSessionExpired={onSessionExpired} />
      ) : (
        <p>لا يتوفر رابط تفاصيل لهذا الإشعار.</p>
      )}
    </section>
  );
}
