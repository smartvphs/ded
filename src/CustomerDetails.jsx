import React, { useState } from "react";
import {
  Plus,
  Edit3,
  ArrowRight,
  Car,
  Home,
  Wallet,
  FileText,
  Coins,
  RefreshCw,
} from "lucide-react";
import useAdminResource from "./use-admin-resource";
import { adminRequest } from "./admin-api";
import { useMutation, Feedback } from "./ProductExtras";
import { ResourceState, Money, dateText } from "./orders-ui";
import {
  CustomerAvatar,
  CustomerBadge,
  customerNumber,
  CustomerModal,
  CustomerInput,
} from "./customer-ui";
import { customerPath } from "./customer-api";
import {
  CustomerOrders,
  CustomerPricing,
  CustomerTransactions,
} from "./CustomerActivity";
import ProductPicture from "./ProductPicture";
import { OrderDetail } from "./OrderDetail";
import PricingDetails from "./PricingDetails";
function CustomerCart({ id, revision, onChanged, onSessionExpired, readOnly }) {
  const resource = useAdminResource(
      "/api/admin/abandoned-carts/" + encodeURIComponent(id),
      revision,
    ),
    [confirm, setConfirm] = useState(false),
    [message, setMessage] = useState(""),
    [sent, setSent] = useState(false),
    [uncertain, setUncertain] = useState(false),
    mutation = useMutation(),
    cart = resource.data?.data;
  async function remind(e) {
    e.preventDefault();
    if (uncertain) return;
    await mutation.run(async () => {
      if (!sent) {
        const text = message.trim();
        if (text && (text.length < 5 || text.length > 300))
          throw new Error("رسالة التنبيه من 5 إلى 300 حرف.");
        try {
          const result = await adminRequest(
            "/api/admin/abandoned-carts/" + encodeURIComponent(id) + "/remind",
            { method: "POST", body: text ? { message: text } : {} },
          );
          if (!result.data?.reminderId)
            throw new Error("لم يؤكد الخادم إرسال التذكير.");
        } catch (error) {
          if (!error.status || error.status >= 500) setUncertain(true);
          throw error;
        }
        setSent(true);
      }
      await onChanged("تم إرسال إشعار داخل الموقع وPush للعميل.");
      resource.reload();
      setConfirm(false);
      mutation.setNotice("تم إرسال إشعار داخل الموقع وPush للعميل.");
    });
  }
  return (
    <section className="customer-panel customer-carts">
      <div className="customer-panel-title">
        <h2>
          السلة {cart?.isAbandoned ? "المتروكة" : ""}:{" "}
          <span>{customerNumber(cart?.itemsCount)}</span>
        </h2>
        <button
          disabled={readOnly || !cart?.canRemind || mutation.busy || uncertain}
          onClick={() => {
            setMessage("");
            setConfirm(true);
          }}
        >
          إرسال تنبيه
        </button>
      </div>
      {resource.error?.status === 404 ? (
        <p className="customer-api-note">العميل ليس لديه سلة.</p>
      ) : (
        <ResourceState resource={resource} onLogin={onSessionExpired} />
      )}
      <Feedback mutation={mutation} />
      {cart && (
        <>
          <p className="customer-api-note">
            قيمة السلة: <Money value={cart.cartValue} /> · آخر إضافة:{" "}
            {dateText(cart.lastActivityAt)}
          </p>
          {cart.cart?.items?.map((item) => (
            <div className="customer-cart-item" key={item.id}>
              <ProductPicture
                className="customer-product-picture"
                src={item.thumbnail}
                alt=""
              />
              <b>{item.name || item.nameEn || "—"}</b>
              <span>
                الكمية: {customerNumber(item.quantity)}
                {item.qualityLabel ? " · " + item.qualityLabel : ""}
              </span>
              <strong>
                <Money value={item.lineTotal} />
              </strong>
            </div>
          ))}
          {!cart.cart?.items?.length && (
            <p className="customer-api-note">السلة فارغة.</p>
          )}
          {!cart.canRemind && (
            <p className="customer-api-note">
              {cart.reminderStatus === "already_reminded"
                ? "اترسل تنبيه للسلة دي، ومفيش منتجات جديدة اتضافت بعدها."
                : "التنبيه متاح بعد 24 ساعة بدون إضافة منتجات جديدة للسلة."}
            </p>
          )}
        </>
      )}
      {confirm && (
        <CustomerModal
          title="إرسال تنبيه السلة"
          onClose={() => setConfirm(false)}
          busy={mutation.busy}
        >
          <form onSubmit={remind}>
            <p className="customer-api-note">
              هيتبعت إشعار داخل الموقع وPush للعميل.
            </p>
            <CustomerInput
              label="نص التنبيه (اختياري)"
              value={message}
              onChange={setMessage}
              maxLength={300}
              disabled={sent}
            />
            <Feedback mutation={mutation} />
            {uncertain && (
              <p role="alert">
                نتيجة الإرسال غير مؤكدة. راجع حالة السلة قبل أي محاولة جديدة.
              </p>
            )}
            <button className="cm-submit" disabled={mutation.busy || uncertain}>
              {sent ? "تحديث حالة الإرسال" : "إرسال التنبيه"}
            </button>
          </form>
        </CustomerModal>
      )}
    </section>
  );
}
export default function CustomerDetails({
  id,
  revision,
  onBack,
  onModal,
  onChanged,
  onSessionExpired,
}) {
  const [localRevision, setLocalRevision] = useState(0),
    [nested, setNested] = useState(null),
    [showWallet, setShowWallet] = useState(false),
    version = revision + localRevision,
    resource = useAdminResource(customerPath(id), version),
    client = resource.data?.data,
    valid =
      resource.data &&
      (client?.id !== id ||
        !Array.isArray(client.addresses) ||
        !Array.isArray(client.vehicles))
        ? { ...resource, error: new Error("رد تفاصيل العميل غير صالح.") }
        : resource;
  if (nested?.type === "order")
    return (
      <OrderDetail
        id={nested.id}
        backLabel="تفاصيل العميل"
        onBack={() => {
          setNested(null);
          setLocalRevision((n) => n + 1);
        }}
        onSessionExpired={onSessionExpired}
      />
    );
  if (nested?.type === "pricing")
    return (
      <PricingDetails
        id={nested.id}
        backLabel="تفاصيل العميل"
        onBack={() => {
          setNested(null);
          setLocalRevision((n) => n + 1);
        }}
        onChanged={() => setLocalRevision((n) => n + 1)}
        onSessionExpired={onSessionExpired}
      />
    );
  const deleted = client?.status === "deleted";
  return (
    <div className="customer-details">
      <div className="pricing-heading">
        <h1>تفاصيل العميل</h1>
        <div className="customer-header-actions">
          <button
            className="pricing-back"
            onClick={() => setLocalRevision((n) => n + 1)}
          >
            <RefreshCw size={15} />
            تحديث
          </button>
          <button className="pricing-back" onClick={onBack}>
            <ArrowRight size={16} />
            إدارة العملاء
          </button>
        </div>
      </div>
      <ResourceState resource={valid} onLogin={onSessionExpired} />
      {!valid.error && client && (
        <>
          <section className="customer-profile-card">
            <div className="customer-profile-top">
              <div className="customer-profile-person">
                <CustomerAvatar client={client} />
                <div>
                  <b>{client.name || "—"}</b>
                  <CustomerBadge customer={client} />
                  <small dir="ltr">{client.phone || "—"}</small>
                  <small>{client.email || "—"}</small>
                </div>
              </div>
              <div className="customer-profile-buttons">
                <button
                  className="pricing-primary"
                  disabled={deleted}
                  onClick={() => onModal("balance", client)}
                >
                  <Plus size={14} />
                  إضافة رصيد للعميل
                </button>
                <button
                  className="pricing-primary"
                  disabled={deleted}
                  onClick={() => onModal("cashback", client)}
                >
                  <Plus size={14} />
                  نسبة كاش باك
                </button>
                <button
                  className="customer-edit-button"
                  disabled={deleted}
                  onClick={() => onModal("edit", client)}
                >
                  <Edit3 size={13} />
                  تعديل
                </button>
              </div>
            </div>
            <div className="customer-detail-stats">
              {[
                [
                  client.total_purchases,
                  "إجمالي المشتريات",
                  "blue",
                  Wallet,
                  true,
                ],
                [client.orders_count, "إجمالي الطلبات", "purple", FileText],
                [
                  client.pricing_requests_summary?.total,
                  "طلبات تسعير",
                  "red",
                  Coins,
                ],
                [
                  client.pricing_requests_summary?.confirmed,
                  "تسعيرات مؤكدة",
                  "green",
                  Coins,
                ],
              ].map(([v, label, color, Icon, money]) => (
                <div className={color} key={label}>
                  <span className="stat-icon">
                    <Icon size={18} />
                  </span>
                  <span>
                    <small>{label}</small>
                    <b>{money ? <Money value={v} /> : customerNumber(v)}</b>
                  </span>
                </div>
              ))}
            </div>
            <div className="customer-account-meta">
              <p>
                رصيد العميل:{" "}
                <Money
                  value={client.wallet?.balance ?? client.wallet_balance}
                />
              </p>
              <p>
                الكاش باك:{" "}
                {client.cashback_percent == null
                  ? "إعدادات المنصة"
                  : customerNumber(client.cashback_percent) + "%"}
              </p>
              <p>
                توثيق الجوال: {client.is_phone_verified ? "موثّق" : "غير موثّق"}
              </p>
              <p>تاريخ التسجيل: {dateText(client.created_at)}</p>
              <button
                className="pricing-back"
                onClick={() => setShowWallet((v) => !v)}
              >
                {showWallet ? "إخفاء حركات المحفظة" : "حركات المحفظة"}
              </button>
            </div>
            {client.admin_notes && (
              <p className="customer-api-note">
                ملاحظات الإدارة: {client.admin_notes}
              </p>
            )}
          </section>
          {showWallet && (
            <CustomerTransactions
              id={id}
              revision={version}
              onSessionExpired={onSessionExpired}
            />
          )}
          <div className="customer-orders-layout">
            <CustomerOrders
              id={id}
              revision={version}
              onOpen={(orderId) => setNested({ type: "order", id: orderId })}
              onSessionExpired={onSessionExpired}
            />
            <CustomerCart
              id={id}
              revision={version}
              onChanged={async () => {
                setLocalRevision((n) => n + 1);
                onChanged("تم إرسال إشعار داخل الموقع وPush للعميل.");
              }}
              onSessionExpired={onSessionExpired}
              readOnly={deleted}
            />
          </div>
          <CustomerPricing
            id={id}
            revision={version}
            onOpen={(requestId) =>
              setNested({ type: "pricing", id: requestId })
            }
            onSessionExpired={onSessionExpired}
          />
          <div className="customer-bottom-grid">
            <section className="customer-panel">
              <div className="customer-panel-title">
                <h2>المركبات ({customerNumber(client.vehicles_count)})</h2>
                <button
                  className="pricing-primary"
                  disabled={deleted}
                  onClick={() => onModal("vehicle", client)}
                >
                  <Plus size={13} />
                  إضافة مركبة جديدة
                </button>
              </div>
              {(client.vehicles || []).map((car) => (
                <div className="customer-info-row" key={car.id}>
                  <span className="meta-icon">
                    {car.make_logo_url ? (
                      <img src={car.make_logo_url} alt="" />
                    ) : (
                      <Car size={20} />
                    )}
                  </span>
                  <div>
                    <b>
                      {[
                        car.make_name_ar || car.make_name_en,
                        car.model_name_ar || car.model_name_en,
                        car.year,
                      ]
                        .filter(Boolean)
                        .join(" ") || "—"}
                    </b>
                    {car.is_default && <span>الافتراضية</span>}
                    <small>
                      رقم الهيكل: {car.vin || "—"} · اللوحة:{" "}
                      {car.plate_no || "—"}
                    </small>
                    {(car.trim || car.engine || car.transmission) && (
                      <small>
                        {[car.trim, car.engine, car.transmission]
                          .filter(Boolean)
                          .join(" · ")}
                      </small>
                    )}
                    <small>تاريخ الإضافة: {dateText(car.created_at)}</small>
                  </div>
                </div>
              ))}
              {!client.vehicles?.length && (
                <p className="customer-api-note">لا توجد مركبات مسجلة.</p>
              )}
            </section>
            <section className="customer-panel">
              <div className="customer-panel-title">
                <h2>العناوين ({customerNumber(client.addresses_count)})</h2>
                <button
                  className="pricing-primary"
                  disabled={deleted}
                  onClick={() => onModal("address", client)}
                >
                  <Plus size={13} />
                  إضافة عنوان
                </button>
              </div>
              {(client.addresses || []).map((address) => (
                <div className="customer-info-row" key={address.id}>
                  <span className="meta-icon">
                    <Home size={20} />
                  </span>
                  <div>
                    <b>{address.label || "عنوان"}</b>
                    {address.is_default && <span>العنوان الافتراضي</span>}
                    <small>
                      {[
                        address.city,
                        address.district,
                        address.street,
                        address.building_no,
                        address.short_address,
                      ]
                        .filter(Boolean)
                        .join("، ") || "—"}
                    </small>
                    <small>رقم الجوال: {address.phone || "—"}</small>
                    <small>تاريخ الإضافة: {dateText(address.created_at)}</small>
                  </div>
                </div>
              ))}
              {!client.addresses?.length && (
                <p className="customer-api-note">لا توجد عناوين مسجلة.</p>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
