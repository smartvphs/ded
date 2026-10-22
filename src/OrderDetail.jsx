import React, { useEffect, useState, useRef } from "react";
import {
  Plus,
  Pencil,
  FileText,
  Truck,
  ChartNoAxesCombined,
  Receipt,
  Save,
  Send,
  Download,
  Trash2,
  UserRound,
  Car,
  MapPin,
  Barcode,
  CalendarDays,
  Flame,
  Package,
  Phone,
  Mail,
  Building2,
  ArrowRight,
  X,
  CheckCircle2,
  ShoppingCart,
  Layers,
} from "lucide-react";
import { adminRequest } from "./admin-api";
import useAdminResource from "./use-admin-resource";
import { number } from "./dashboard-data";
import {
  Badge,
  Field,
  Select,
  Panel,
  Modal,
  Money,
  Empty,
  ResourceState,
  dateText,
  payments,
  ProductPhoto,
  returnStatuses,
} from "./orders-ui";
import OrderItemPicker from "./OrderItemPicker";
import OrderCosts from "./OrderCosts";
import {
  orderDraft,
  shippingBody,
  paymentUpdateBody,
  contactUpdateBody,
  orderItemQuantity,
} from "./order-detail-api";
const blank = {
  customer: { name: "", phone: "", email: "" },
  items: [],
  status: "pending",
  payment_method: "cash",
  shipping_fee: 0,
  tax: 0,
  discount: 0,
  admin_notes: "",
  city: "",
  district: "",
  street: "",
};
const qualityOptions = ["قطعة أصلية", "قطعة بديلة", "مستعمل"];
const orderStates = {
  pending: "جديد",
  confirmed: "قيد التنفيذ",
  shipped: "تم الشحن",
  delivered: "تم التوصيل",
  cancelled: "ملغي",
};
const tabs = [
  ["details", "تفاصيل الطلب", FileText],
  ["shipping", "الشحن والتتبع", Truck],
  ["costs", "التكاليف والأرباح", ChartNoAxesCombined],
  ["invoice", "الفاتورة", Receipt],
];
function Totals({ data }) {
  return (
    <dl className="op-totals">
      <div>
        <dt>إجمالي المنتجات</dt>
        <dd>
          <Money
            value={
              data.subtotal ??
              data.items?.reduce((a, i) => a + Number(i.line_total || 0), 0)
            }
          />
        </dd>
      </div>
      <div>
        <dt>شحن</dt>
        <dd>
          <Money value={data.shipping_fee} />
        </dd>
      </div>
      <div>
        <dt>ضريبة القيمة المضافة</dt>
        <dd>
          <Money value={data.tax} />
        </dd>
      </div>
      <div>
        <dt>الخصم</dt>
        <dd>
          <Money value={data.discount} />
        </dd>
      </div>
      <div className="op-total">
        <dt>الإجمالي</dt>
        <dd>
          <Money value={data.total} />
        </dd>
      </div>
    </dl>
  );
}
function ProductsTable({ items, costs, onCost }) {
  return (
    <div className="op-table-scroll">
      <table className="op-table op-items-table">
        <thead>
          <tr>
            {(costs
              ? [
                  "المنتج",
                  "المصدر",
                  "الكمية",
                  "السعر",
                  "التكلفة",
                  "الإجمالي",
                  "الربح",
                ]
              : ["المنتج", "السيارة", "المصدر", "السعر", "الكمية", "الإجمالي"]
            ).map((label) => (
              <th key={label}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>
                <div className="op-product-cell">
                  <ProductPhoto src={item.thumbnail} name={item.product_name} />
                  <span>
                    <b>{item.product_name}</b>
                    {item.part_number && <small>SKU: {item.part_number}</small>}
                    {item.quality_name && (
                      <em className="op-quality">{item.quality_name}</em>
                    )}
                  </span>
                </div>
              </td>
              {!costs && (
                <td>
                  {[
                    item.make || item.car?.makeNameAr || item.car?.makeNameEn,
                    typeof item.car === "string"
                      ? item.car
                      : item.car?.modelNameAr || item.car?.modelNameEn,
                    item.year || item.car?.year,
                  ]
                    .filter(Boolean)
                    .join(" ") || "—"}
                  {item.vin && (
                    <small className="op-vin">رقم الهيكل {item.vin}</small>
                  )}
                </td>
              )}
              <td>{item.supplier?.name || "المنصة"}</td>
              {costs && <td>{number(item.quantity)}</td>}
              <td>
                <Money value={item.unit_price} />
              </td>
              {costs ? (
                <td>
                  <input
                    className="op-cost-input"
                    type="number"
                    min="0"
                    step=".01"
                    aria-label={"تكلفة " + item.product_name}
                    value={costs[item.id] ?? ""}
                    placeholder="—"
                    onChange={(e) => onCost(item.id, e.target.value)}
                  />
                </td>
              ) : (
                <td>{number(item.quantity)}</td>
              )}
              <td>
                <Money value={item.line_total} />
              </td>
              {costs && (
                <td>
                  <Money
                    value={
                      costs[item.id] !== undefined && costs[item.id] !== ""
                        ? Number(item.line_total) -
                          Number(costs[item.id]) * Number(item.quantity)
                        : null
                    }
                  />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {!items.length && <Empty>لا توجد منتجات في الطلب.</Empty>}
    </div>
  );
}
function Shipping({ data, setData }) {
  const field = (key) => (e) => setData({ ...data, [key]: e.target.value });
  return (
    <>
      <h2 className="op-section-title">شركات الشحن</h2>
      <div className="op-carriers">
        {["SMSA Express", "aramex", "SPL سبل", "RedBox", "RedBox"].map(
          (name, i) => (
            <button
              key={i}
              className={
                "op-carrier carrier-" +
                i +
                (data.shipping_company_name === name ? " selected" : "")
              }
              disabled
              title="اختيار شركة الشحن غير متاح حتى تحميل الشركات من الخادم"
            >
              {name}
            </button>
          ),
        )}
      </div>
      <Panel title="عنوان التوصيل">
        <div className="op-form-grid">
          <Field label="المدينة" icon={Building2}>
            <input
              value={data.city || ""}
              onChange={field("city")}
              placeholder="الرياض"
            />
          </Field>
          <Field label="الحي *" icon={MapPin}>
            <input
              value={data.district || ""}
              onChange={field("district")}
              placeholder="حي الزهراء"
            />
          </Field>
          <Field label="الشارع *" icon={MapPin}>
            <input
              value={data.street || ""}
              onChange={field("street")}
              placeholder="اسم الشارع"
            />
          </Field>
          <Field label="العنوان الوطني المختصر" icon={Barcode}>
            <input
              value={data.short_address || ""}
              onChange={field("short_address")}
              placeholder="العنوان المختصر"
            />
          </Field>
          <Field label="العنوان التفصيلي" icon={MapPin} className="full">
            <input
              value={data.delivery_city || ""}
              readOnly
              onChange={field("delivery_city")}
              placeholder="العنوان التفصيلي"
            />
          </Field>
        </div>
      </Panel>
      <Panel title="بيانات الشحن">
        <div className="op-form-grid">
          <Field label="شركة الشحن" icon={Truck}>
            <input
              value={data.shipping_company_name || ""}
              readOnly
              onChange={field("shipping_company_name")}
              placeholder="أرامكس Aramex"
            />
          </Field>
          <Field label="رقم بوليصة الشحن / رمز التتبع *" icon={Barcode}>
            <input
              value={data.tracking_no || ""}
              onChange={field("tracking_no")}
              placeholder="رقم التتبع"
            />
          </Field>
          <Field label="تاريخ الشحن" icon={CalendarDays}>
            <input
              type="date"
              value={data.shipped_date || ""}
              onChange={field("shipped_date")}
            />
          </Field>
          <Field label="تاريخ التوصيل المتوقع" icon={CalendarDays}>
            <input
              type="date"
              value={data.delivery_date || ""}
              onChange={field("delivery_date")}
            />
          </Field>
          <Field label="رابط التتبع المباشر" icon={Truck} className="full">
            <input
              type="url"
              value={data.tracking_url || ""}
              onChange={field("tracking_url")}
              placeholder="https://aramex.com/track/..."
            />
          </Field>
        </div>
      </Panel>
      <Panel title="التكاليف و الشحن">
        <div className="op-shipping-costs op-form-grid">
          <Field label="تكلفة الشحن" icon={Flame}>
            <input
              type="number"
              min="0"
              step=".01"
              value={data.shipping_cost ?? ""}
              onChange={field("shipping_cost")}
            />
          </Field>
          <Field label="تكلفة التعبئة والتغليف" icon={Flame}>
            <input
              type="number"
              min="0"
              step=".01"
              value={data.packaging ?? 0}
              onChange={field("packaging")}
            />
          </Field>
          <Field
            label="رسوم إضافية أخرى (اختياري)"
            icon={Flame}
            className="full"
          >
            <input
              type="number"
              min="0"
              step=".01"
              value={data.extra_fees ?? 0}
              onChange={field("extra_fees")}
            />
          </Field>
        </div>
      </Panel>
    </>
  );
}
function Invoice({ id, data, onSessionExpired, notice }) {
  const resource = useAdminResource(
    id ? `/api/orders/admin/${encodeURIComponent(id)}/invoice` : null,
  );
  const invoice = resource.data?.data;
  const d = invoice
    ? {
        ...data,
        customer: invoice.customer,
        payment_method: invoice.paymentMethod,
        created_at: invoice.issuedAt,
        shipping_fee: invoice.totals?.shippingFee,
        subtotal: invoice.totals?.subtotal,
        tax: invoice.totals?.tax,
        discount: invoice.totals?.discount,
        total: invoice.totals?.total,
      }
    : data;
  const items =
    invoice?.items?.map((i, index) => ({
      id: index,
      product_name: i.productName,
      quantity: i.quantity,
      unit_price: i.unitPrice,
      line_total: i.lineTotal,
    })) ||
    d.items ||
    [];
  const [sending, setSending] = useState(false);
  async function share() {
    if (sending || !invoice) return;
    setSending(true);
    try {
      await adminRequest(
        `/api/orders/admin/${encodeURIComponent(id)}/invoice/send`,
        { method: "POST", body: {} },
      );
      notice("تم إرسال الفاتورة للعميل على الخادم.");
    } catch (error) {
      notice(error.message);
    } finally {
      setSending(false);
    }
  }
  return (
    <Panel
      title="فاتورة الطلب"
      className="op-invoice-panel"
      actions={
        <div className="op-heading-actions">
          <button
            className="op-outline"
            disabled={sending || !invoice}
            onClick={share}
          >
            إرسال للعميل
          </button>
          <button
            className="op-primary"
            onClick={() => {
              notice("اختر «حفظ بتنسيق PDF» من نافذة الطباعة.");
              window.print();
            }}
          >
            <Download size={18} />
            تحميل pdf
          </button>
        </div>
      }
    >
      <ResourceState resource={resource} onLogin={onSessionExpired} />
      {(invoice || !id) && (
        <article className="op-invoice" id="order-invoice">
          <div className="op-invoice-banner">
            <div>
              <h2>UR AUTO PARTS</h2>
              <span>فاتورة الطلب</span>
            </div>
            <div>
              رقم الفاتورة<b>{invoice?.invoiceNumber || "مسودة"}</b>
            </div>
          </div>
          <div className="op-invoice-meta">
            <div>
              <span>التاريخ</span>
              {dateText(d.created_at)}
            </div>
            <div>
              <span>الدفع</span>
              {payments[d.payment_method] || d.payment_method || "—"}
            </div>
          </div>
          <div className="op-invoice-customer">
            بيانات العميل:
            <p>
              {d.customer?.name || "—"} · {d.customer?.phone || "—"}
            </p>
            <p>
              شركة الشحن:{" "}
              {invoice?.shipping?.companyName || d.shipping_company_name || "—"}{" "}
              · رقم التتبع:{" "}
              {invoice?.shipping?.trackingNo || d.tracking_no || "—"}
            </p>
          </div>
          <table className="op-invoice-table">
            <thead>
              <tr>
                <th>المنتج</th>
                <th>الكمية</th>
                <th>السعر</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id}>
                  <td>{i.product_name}</td>
                  <td>{number(i.quantity)}</td>
                  <td>
                    <Money value={i.unit_price} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Totals data={d} />
        </article>
      )}
    </Panel>
  );
}
export function OrderDetail({
  id,
  create = false,
  initialTab = "details",
  onBack,
  backLabel="الطلبات",
  onSessionExpired,
}) {
  const resource = useAdminResource(
    id ? "/api/orders/admin/" + encodeURIComponent(id) : null,
  );
  const [data, setData] = useState({
      ...blank,
      items: [],
      customer: { ...blank.customer },
    }),
    [editing, setEditing] = useState(create),
    [tab, setTab] = useState(initialTab),
    [adding, setAdding] = useState(false),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (resource.data?.data) {
      setData(orderDraft(resource.data.data));
      setDirty(false);
    }
  }, [resource.data]);
  const changeData = (next) => {
    setData(next);
    setDirty(true);
  };
  const items = data.items || [];
  const preview = resource.data?.data || data;
  const canEditPayment =
    data.status === "pending" &&
    data.order_type !== "service" &&
    !Number(data.wallet_amount || 0) &&
    !["paid", "captured", "refunded"].includes(data.payment_status);
  function updateItem(id, key, value) {
    changeData({
      ...data,
      items: items.map((i) =>
        i.id === id
          ? {
              ...i,
              [key]: value,
              line_total:
                (key === "quantity" ? Number(value) : Number(i.quantity)) *
                Number(key === "unit_price" ? value : i.unit_price),
            }
          : i,
      ),
    });
  }
  const saving = useRef(false);
  async function refreshOrder() {
    const result = await adminRequest(
      "/api/orders/admin/" + encodeURIComponent(id),
    );
    if (result.data?.id !== id)
      throw new Error("تعذر تأكيد تفاصيل الطلب. أعد تحميله.");
    setData(orderDraft(result.data));
    setDirty(false);
    return result.data;
  }
  async function removeItem(itemId) {
    if (saving.current || !window.confirm("حذف القطعة من الطلب؟")) return;
    saving.current = true;
    setBusy(true);
    setNotice("");
    try {
      await adminRequest(
        `/api/orders/admin/${encodeURIComponent(id)}/items/${encodeURIComponent(itemId)}`,
        { method: "DELETE" },
      );
      await refreshOrder();
      resource.reload();
      setNotice("تم حذف القطعة من الطلب على الخادم.");
    } catch (e) {
      setNotice(e.message);
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  async function save() {
    if (saving.current) return;
    if (create) {
      setNotice("استخدم إضافة طلب جديد من قائمة الطلبات.");
      return;
    }
    setNotice("");
    const original = resource.data?.data;
    if (!original) return;
    let shipping;
    try {
      shipping = shippingBody(data, original);
      for (const item of items) orderItemQuantity(item.quantity);
    } catch (e) {
      setNotice(e.message);
      return;
    }
    saving.current = true;
    setBusy(true);
    let completed = false;
    try {
      for (const item of items) {
        const old = original.items?.find((row) => row.id === item.id);
        if (old && Number(old.quantity) !== Number(item.quantity)) {
          await adminRequest(
            `/api/orders/admin/${encodeURIComponent(id)}/items/${encodeURIComponent(item.id)}`,
            {
              method: "PATCH",
              body: { quantity: orderItemQuantity(item.quantity) },
            },
          );
          completed = true;
        }
      }
      const payment = paymentUpdateBody(data, original);
      if (Object.keys(payment).length) {
        await adminRequest(
          `/api/orders/admin/${encodeURIComponent(id)}/payment`,
          { method: "PATCH", body: payment },
        );
        completed = true;
      }
      const contact = contactUpdateBody(data, original);
      if (Object.keys(contact).length) {
        await adminRequest(
          `/api/orders/admin/${encodeURIComponent(id)}/contact`,
          { method: "PATCH", body: contact },
        );
        completed = true;
      }
      if (Object.keys(shipping).length) {
        await adminRequest(
          `/api/orders/admin/${encodeURIComponent(id)}/shipping`,
          { method: "PATCH", body: shipping },
        );
        completed = true;
      }
      if (
        data.status !== original.status ||
        (data.admin_notes || "") !== (original.admin_notes || "")
      ) {
        await adminRequest(`/api/orders/${encodeURIComponent(id)}/status`, {
          method: "PATCH",
          body: {
            status: data.status,
            adminNotes: data.admin_notes || "",
            ...(data.tracking_no ? { trackingNo: data.tracking_no } : {}),
            ...(data.shipping_company_id
              ? { shippingCompanyId: data.shipping_company_id }
              : {}),
          },
        });
        completed = true;
      }
      await refreshOrder();
      resource.reload();
      setEditing(false);
      setNotice("تم حفظ التعديلات والتحقق منها على الخادم.");
    } catch (e) {
      setNotice(
        (completed
          ? "حُفظ جزء من التعديلات. راجع الطلب قبل إعادة المحاولة. "
          : "") + e.message,
      );
      if (completed) {
        try {
          await refreshOrder();
          resource.reload();
        } catch {}
      }
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="op-content">
      <div className="op-heading">
        <h1>
          {create ? "إضافة طلب جديد" : editing ? "تعديل الطلب" : "تفاصيل الطلب"}
        </h1>
        <div className="op-heading-actions">
          {editing ? (
            <>
              <button className="op-primary" onClick={save} disabled={busy}>
                <Save size={18} />
                حفظ التعديلات
              </button>
              <button
                className="op-cancel"
                onClick={() => {
                  if (create) onBack();
                  else {
                    setData(orderDraft(resource.data?.data || blank));
                    setDirty(false);
                    setEditing(false);
                  }
                }}
              >
                <X size={18} />
                إلغاء
              </button>
            </>
          ) : (
            <>
              <button
                className="op-primary"
                onClick={() => {
                  setEditing(true);
                  setAdding(true);
                }}
              >
                <Plus size={19} />
                إضافة منتج للطلب
              </button>
              <button className="op-outline" onClick={() => setEditing(true)}>
                <Pencil size={17} />
                تعديل الطلب
              </button>
            </>
          )}
          <button className="op-text" onClick={onBack}>
            <ArrowRight size={16} />
            {backLabel}
          </button>
        </div>
      </div>
      <ResourceState resource={resource} onLogin={onSessionExpired} />
      {notice && (
        <p className="op-notice" role="status">
          {notice}
        </p>
      )}
      {(resource.data || create) && (
        <>
          <div className="op-order-banner">
            <div>
              <b>{data.order_number || "طلب جديد · مسودة"}</b>
              <span>{dateText(data.created_at)}</span>
            </div>
            <select
              aria-label="حالة الطلب"
              value={data.status}
              onChange={(e) => changeData({ ...data, status: e.target.value })}
            >
              {Object.entries(orderStates)
                .filter(
                  ([status]) =>
                    status === data.status ||
                    (Array.isArray(data.status_options)
                      ? data.status_options.some(
                          (option) => option.status === status,
                        )
                      : (
                          {
                            pending: ["confirmed", "cancelled"],
                            confirmed:
                              data.order_type === "service"
                                ? ["delivered", "cancelled"]
                                : ["shipped", "delivered", "cancelled"],
                            shipped: ["delivered", "cancelled"],
                          }[resource.data?.data?.status] || []
                        ).includes(status)),
                )
                .map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
            </select>
          </div>
          <div
            className="op-detail-tabs"
            role="tablist"
            aria-label="تفاصيل الطلب"
          >
            {tabs.map(([key, label, Icon]) => (
              <button
                role="tab"
                aria-selected={tab === key}
                key={key}
                className={tab === key ? "active" : ""}
                onClick={() => setTab(key)}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </div>
          {tab === "details" && (
            <div className={"op-detail-layout " + (editing ? "editing" : "")}>
              <div className="op-detail-body">
                {editing ? (
                  <>
                    <Panel title="منتجات الطلب">
                      {items.map((item) => (
                        <div className="op-edit-item" key={item.id}>
                          <div className="op-edit-item-title">
                            <div className="op-product-cell">
                              <ProductPhoto
                                src={item.thumbnail}
                                name={item.product_name}
                              />
                              <b>{item.product_name}</b>
                            </div>
                            <button
                              className="op-delete"
                              aria-label={"إزالة " + item.product_name}
                              disabled={busy}
                              onClick={() => removeItem(item.id)}
                            >
                              <Trash2 size={20} />
                            </button>
                          </div>
                          <div className="op-form-grid">
                            <Field label="السيارة" icon={Car}>
                              <input
                                value={
                                  typeof item.car === "string"
                                    ? item.car
                                    : [
                                        item.car?.makeNameAr,
                                        item.car?.modelNameAr,
                                        item.car?.year,
                                      ]
                                        .filter(Boolean)
                                        .join(" ")
                                }
                                readOnly
                                placeholder="السيارة"
                                onChange={(e) =>
                                  updateItem(item.id, "car", e.target.value)
                                }
                              />
                            </Field>
                            <Select
                              label="الجودة"
                              icon={Package}
                              value={item.quality_name || ""}
                              disabled
                              onChange={(e) =>
                                updateItem(
                                  item.id,
                                  "quality_name",
                                  e.target.value,
                                )
                              }
                            >
                              {qualityOptions.map((q) => (
                                <option key={q}>{q}</option>
                              ))}
                            </Select>
                            <Field
                              label="الكمية"
                              icon={Package}
                              className="full"
                            >
                              <input
                                disabled={busy}
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) =>
                                  updateItem(
                                    item.id,
                                    "quantity",
                                    Math.max(1, Number(e.target.value)),
                                  )
                                }
                              />
                            </Field>
                          </div>
                          <div className="op-item-total">
                            <b>الإجمالي</b>
                            <Money value={item.line_total} />
                          </div>
                        </div>
                      ))}
                      <button
                        className="op-primary op-wide"
                        onClick={() => setAdding(true)}
                      >
                        <Plus size={18} />
                        إضافة منتج جديد للطلب
                      </button>
                    </Panel>
                    <Panel
                      title={
                        <>
                          <Truck size={20} />
                          عنوان الشحن و التوصيل
                        </>
                      }
                    >
                      <div className="op-form-grid one">
                        <Field label="شركة الشحن" icon={Building2}>
                          <input
                            value={data.shipping_company_name || ""}
                            readOnly
                            onChange={(e) =>
                              changeData({
                                ...data,
                                shipping_company_name: e.target.value,
                              })
                            }
                          />
                        </Field>
                        <Field label="المدينة" icon={MapPin}>
                          <input
                            value={data.city || ""}
                            onChange={(e) =>
                              changeData({ ...data, city: e.target.value })
                            }
                          />
                        </Field>
                        <Field label="رقم التتبع" icon={Barcode}>
                          <input
                            value={data.tracking_no || ""}
                            onChange={(e) =>
                              changeData({
                                ...data,
                                tracking_no: e.target.value,
                              })
                            }
                          />
                        </Field>
                      </div>
                    </Panel>
                    <Panel
                      title={
                        <>
                          <UserRound size={20} />
                          معلومات التواصل
                        </>
                      }
                    >
                      <div className="op-form-grid one">
                        {[
                          ["name", "الاسم كاملًا", UserRound],
                          ["phone", "رقم الجوال", Phone],
                          ["email", "البريد الإلكتروني (اختياري)", Mail],
                        ].map(([key, label, Icon]) => (
                          <Field key={key} label={label} icon={Icon}>
                            <input
                              value={data.contact?.[key] || ""}
                              readOnly={busy || data.status === "cancelled"}
                              onChange={(e) =>
                                changeData({
                                  ...data,
                                  contact: {
                                    ...data.contact,
                                    [key]: e.target.value,
                                  },
                                })
                              }
                            />
                          </Field>
                        ))}
                      </div>
                    </Panel>
                  </>
                ) : (
                  <>
                    <Panel title="منتجات الطلب">
                      <p className="op-warning-text">
                        منتجات الموردين قد تتوفر بأسعار مختلفة وفقًا للجودة
                        والتوقيت.
                      </p>
                      <ProductsTable items={items} />
                      <Totals data={preview} />
                      <div className="op-admin-notes">
                        <h3>ملاحظات الإدارة</h3>
                        <p>{data.admin_notes || "لا توجد ملاحظات مسجلة."}</p>
                      </div>
                    </Panel>
                    <Panel title="مسار الطلب">
                      <div className="op-timeline">
                        {(data.timeline?.length
                          ? data.timeline
                          : [
                              {
                                label: "تم استلام الطلب",
                                created_at: data.created_at,
                                description: data.customer?.name,
                              },
                              {
                                label: orderStates[data.status] || data.status,
                                created_at: data.updated_at,
                              },
                            ]
                        ).map((step, i) => (
                          <div className="op-timeline-step" key={i}>
                            <span>
                              <i>
                                <CheckCircle2 size={23} />
                              </i>
                              <b>{step.label || step.title}</b>
                              <small>{step.description || ""}</small>
                            </span>
                            <time>{dateText(step.created_at || step.at)}</time>
                          </div>
                        ))}
                      </div>
                    </Panel>
                  </>
                )}
              </div>
              <aside className="op-detail-aside">
                {editing ? (
                  <>
                    <Panel
                      title={
                        <>
                          <ShoppingCart size={20} />
                          إجمالي الطلب
                        </>
                      }
                      className="op-summary"
                    >
                      <Totals data={preview} />
                      <Select
                        label="طريقة الدفع"
                        icon={FileText}
                        value={data.payment_method || "cash"}
                        disabled={busy || !canEditPayment}
                        onChange={(e) =>
                          changeData({
                            ...data,
                            payment_method: e.target.value,
                          })
                        }
                      >
                        {Object.entries({
                          ...payments,
                          visa: "Visa",
                          mastercard: "Mastercard",
                        })
                          .filter(
                            ([key]) =>
                              [
                                "cash",
                                "mada",
                                "visa",
                                "mastercard",
                                "apple_pay",
                                "tabby",
                                "tamara",
                              ].includes(key) || key === data.payment_method,
                          )
                          .map(([key, label]) => (
                            <option key={key} value={key}>
                              {label}
                            </option>
                          ))}
                      </Select>
                      <Field label="كود الخصم" icon={Flame}>
                        <input
                          aria-label="كود خصم الطلب"
                          value={data.coupon_code || ""}
                          disabled={busy || !canEditPayment}
                          onChange={(e) =>
                            changeData({ ...data, coupon_code: e.target.value })
                          }
                        />
                      </Field>
                      <p className="op-caption">
                        الخصم والإجمالي يحسبهما السيرفر بعد الحفظ. تعديل الدفع
                        والكوبون متاح قبل تأكيد الطلب والدفع فقط.
                      </p>
                      <Field label="الخصم" icon={Flame}>
                        <input
                          type="number"
                          min="0"
                          step=".01"
                          value={data.discount || 0}
                          readOnly
                          onChange={(e) =>
                            changeData({ ...data, discount: e.target.value })
                          }
                        />
                      </Field>
                      <button
                        className="op-primary op-wide"
                        onClick={save}
                        disabled={busy}
                      >
                        <Save size={18} />
                        حفظ التعديلات
                      </button>
                    </Panel>
                    <Panel title="ملاحظات الإدارة">
                      <Field label="اكتب الملاحظة *">
                        <textarea
                          value={data.admin_notes || ""}
                          onChange={(e) =>
                            changeData({ ...data, admin_notes: e.target.value })
                          }
                        />
                      </Field>
                    </Panel>
                  </>
                ) : (
                  <>
                    <Panel title="تفاصيل العميل">
                      <div className="op-customer">
                        <span className="op-avatar">
                          {data.customer?.name?.[0] || "م"}
                        </span>
                        <div>
                          <small>الاسم</small>
                          <b>
                            {data.contact?.name || data.customer?.name || "—"}
                          </b>
                        </div>
                      </div>
                      <div className="op-side-row">
                        <UserRound size={20} />
                        <div>
                          <small>تفاصيل التواصل</small>
                          <p>
                            {data.contact?.email || data.customer?.email || "—"}
                          </p>
                          <p dir="ltr">
                            {data.contact?.phone || data.customer?.phone || "—"}
                          </p>
                        </div>
                      </div>
                      <button
                        className="op-link"
                        onClick={() => setEditing(true)}
                      >
                        <Pencil size={16} />
                        تعديل
                      </button>
                    </Panel>
                    <Panel title="تفاصيل الشحن">
                      <div className="op-side-row">
                        <FileText size={20} />
                        <div>
                          <small>طريقة الدفع</small>
                          <p>
                            {payments[data.payment_method] ||
                              data.payment_method ||
                              "—"}
                          </p>
                        </div>
                      </div>
                      <div className="op-side-row">
                        <Truck size={20} />
                        <div>
                          <small>شركة الشحن</small>
                          <p>
                            {data.shipping_company_name ||
                              data.shipping?.company?.name ||
                              "—"}
                          </p>
                        </div>
                      </div>
                      <div className="op-side-row">
                        <MapPin size={20} />
                        <div>
                          <small>عنوان الشحن</small>
                          <p>
                            {[data.city, data.district, data.street]
                              .filter(Boolean)
                              .join("، ") || "—"}
                          </p>
                        </div>
                      </div>
                      <div className="op-side-row">
                        <Barcode size={20} />
                        <div>
                          <small>رابط التتبع أو رقم الشحنة</small>
                          <p>{data.tracking_no || "—"}</p>
                        </div>
                      </div>
                    </Panel>
                  </>
                )}
              </aside>
            </div>
          )}
          {tab === "shipping" && <Shipping data={data} setData={changeData} />}
          {tab === "costs" && (
            <OrderCosts
              id={id}
              onSessionExpired={onSessionExpired}
              onSaved={refreshOrder}
            />
          )}
          {tab === "invoice" && (
            <Invoice
              id={id}
              data={preview}
              onSessionExpired={onSessionExpired}
              notice={setNotice}
            />
          )}
          {tab !== "invoice" && tab !== "costs" && (
            <div className="op-bottom-actions">
              <button className="op-primary" onClick={save} disabled={busy}>
                <Save size={18} />
                {busy ? "جارٍ الحفظ…" : "حفظ التعديلات"}
              </button>
              <button
                className="op-outline"
                disabled
                title="مسار إرسال التتبع للعميل غير موثق في API"
              >
                <Send size={18} />
                إرسال تتبع
              </button>
            </div>
          )}
        </>
      )}
      {adding && (
        <OrderItemPicker
          orderId={id}
          onClose={() => setAdding(false)}
          onSaved={async () => {
            await refreshOrder();
            resource.reload();
            setNotice("تمت إضافة القطعة على الخادم.");
          }}
          onSessionExpired={onSessionExpired}
        />
      )}
    </div>
  );
}
export function ReturnDetail({ id, onBack, onSessionExpired }) {
  const resource = useAdminResource(
    "/api/returns/admin/" + encodeURIComponent(id),
  );
  const d = resource.data?.data;
  const [notes, setNotes] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  useEffect(() => {
    if (d) setNotes(d.admin_notes || "");
  }, [d]);
  async function review(status) {
    setBusy(true);
    setNotice("");
    try {
      await adminRequest("/api/returns/admin/" + encodeURIComponent(id), {
        method: "PATCH",
        body: { status, adminNotes: notes },
      });
      setNotice(
        status === "approved" ? "تم قبول طلب الإرجاع." : "تم رفض طلب الإرجاع.",
      );
      resource.reload();
    } catch (e) {
      setNotice(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="op-content">
      <div className="op-heading">
        <h1>تفاصيل طلب الإرجاع {d?.return_number || ""}</h1>
        <button className="op-text" onClick={onBack}>
          <ArrowRight size={17} />
          طلبات الإرجاع
        </button>
      </div>
      <ResourceState resource={resource} onLogin={onSessionExpired} />
      {notice && (
        <p className="op-notice" role="status">
          {notice}
        </p>
      )}
      {d && (
        <>
          <section className="op-return-customer">
            <div className="op-order-banner">
              <div>
                <b>{d.order_number}</b>
                <span>تاريخ طلب الإرجاع {dateText(d.created_at)}</span>
              </div>
              <Badge status={d.status} label={returnStatuses[d.status]} />
            </div>
            <div className="op-return-person">
              <span className="op-avatar">{d.customer_name?.[0] || "م"}</span>
              <div>
                <b>العميل {d.customer_name}</b>
                <p dir="ltr">{d.customer_phone}</p>
              </div>
            </div>
            <div className="op-return-vehicle">
              {[
                ["رقم القطعة", d.part_number, Barcode],
                ["الشركة المصنعة", d.make_name_ar, Building2],
                ["سيارة العميل", d.car_label, Car],
              ].map(([label, value, Icon]) => (
                <div key={label}>
                  <Icon size={20} />
                  <span>
                    <small>{label}</small>
                    <b>{value || "—"}</b>
                  </span>
                </div>
              ))}
            </div>
          </section>
          <Panel className="op-return-body">
            <div className="op-return-product">
              <ProductPhoto src={d.thumbnail} name={d.product_name} />
              <div>
                {d.quality_name && (
                  <em className="op-quality">{d.quality_name}</em>
                )}
                <h2>{d.product_name}</h2>
                <p>
                  الكمية: {number(d.quantity)} <Money value={d.unit_price} />
                </p>
                <span className="op-vin">{d.part_number || ""}</span>
              </div>
            </div>
            <div className="op-return-reason">
              <b>سبب الإرجاع</b>
              <p>{d.reason}</p>
            </div>
            <Field label="ملاحظات الإدارة">
              <textarea
                placeholder="أضف ملاحظاتك هنا"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
          </Panel>
          {d.status === "pending" && (
            <div className="op-return-actions">
              <button
                className="op-primary"
                disabled={busy}
                onClick={() => review("approved")}
              >
                قبول الإرجاع
              </button>
              <button
                className="op-danger"
                disabled={busy}
                onClick={() => review("rejected")}
              >
                رفض
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
