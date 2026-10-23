import React, { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Plus,
  Save,
  Trash2,
  UserRound,
  MapPin,
  Package,
  FileText,
} from "lucide-react";
import useAdminResource from "./use-admin-resource";
import { adminRequest, queryString } from "./admin-api";
import { addressBody } from "./customer-address";
import {
  createOrderBody,
  availableOrderPaymentMethods,
} from "./order-list-api";
import {
  Panel,
  Field,
  Select,
  ResourceState,
  ProductPhoto,
  Money,
  Modal,
} from "./orders-ui";
function useSearch(value) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), 300);
    return () => clearTimeout(timer);
  }, [value]);
  return debounced;
}
export default function CreateOrder({ onBack, onCreated, onSessionExpired }) {
  const [customerSearch, setCustomerSearch] = useState(""),
    [productSearch, setProductSearch] = useState(""),
    [userId, setUserId] = useState(""),
    [addressId, setAddressId] = useState(""),
    [productId, setProductId] = useState(""),
    [variantId, setVariantId] = useState(""),
    [quantity, setQuantity] = useState("1"),
    [items, setItems] = useState([]),
    [couponCode, setCouponCode] = useState(""),
    [paymentMethod, setPaymentMethod] = useState(""),
    [adminNotes, setAdminNotes] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [newAddress, setNewAddress] = useState(null),
    [addressBusy, setAddressBusy] = useState(false),
    [addressError, setAddressError] = useState(""),
    [addressOverride, setAddressOverride] = useState(null);
  const uncertainCreate = useRef(false);
  const lock = useRef(false),
    addressLock = useRef(false);
  const customerQuery = useSearch(customerSearch),
    productQuery = useSearch(productSearch);
  const customers = useAdminResource(
    "/api/admin/customers?" +
      queryString({
        search: customerQuery || undefined,
        status: "active",
        limit: 20,
        offset: 0,
      }),
  );
  const customer = useAdminResource(
    userId ? "/api/admin/customers/" + encodeURIComponent(userId) : null,
  );
  const products = useAdminResource(
    "/api/products/admin?" +
      queryString({
        search: productQuery || undefined,
        status: "published",
        limit: 20,
        offset: 0,
      }),
  );
  const product = useAdminResource(
    productId ? "/api/products/admin/" + encodeURIComponent(productId) : null,
  );
  const paymentResource = useAdminResource("/api/payments/methods");
  let paymentOptions = [],
    paymentError = null;
  if (paymentResource.data) {
    try {
      paymentOptions = availableOrderPaymentMethods(paymentResource.data);
    } catch (error) {
      paymentError = error;
    }
  }
  const paymentState = paymentError
    ? { ...paymentResource, error: paymentError }
    : paymentResource;
  useEffect(() => {
    if (!paymentOptions.some((method) => method.code === paymentMethod))
      setPaymentMethod(paymentOptions[0]?.code || "");
  }, [paymentResource.data, paymentMethod]);
  const customerRows = Array.isArray(customers.data?.data)
      ? customers.data.data
      : [],
    productRows = Array.isArray(products.data?.data) ? products.data.data : [];
  const addressData =
    addressOverride?.userId === userId
      ? addressOverride.addresses
      : customer.data?.data?.addresses;
  const addresses = Array.isArray(addressData) ? addressData : [];
  const addressReady =
    Boolean(userId) &&
    !customer.loading &&
    !customer.error &&
    Array.isArray(addressData);
  useEffect(() => {
    setNewAddress(null);
    setAddressError("");
    setAddressOverride(null);
  }, [userId]);
  const variants = (product.data?.data?.variants || []).filter(
    (v) => v.is_active !== false && v.isActive !== false,
  );
  const selected = product.data?.data;
  const add = () => {
    if (!selected || product.loading || product.error) return;
    if (variants.length && !variantId)
      return setNotice("اختر نوع المنتج أولًا.");
    const count = Number(quantity);
    if (!Number.isSafeInteger(count) || count < 1)
      return setNotice("أدخل كمية صحيحة أكبر من صفر.");
    const v = variants.find((v) => v.id === variantId);
    const existing = items.find(
      (i) => i.productId === productId && (i.variantId || "") === variantId,
    );
    setItems(
      existing
        ? items.map((i) =>
            i === existing ? { ...i, quantity: Number(i.quantity) + count } : i,
          )
        : [
            ...items,
            {
              key: crypto.randomUUID(),
              productId,
              ...(variantId ? { variantId } : {}),
              quantity: count,
              name: selected.name,
              variantName:
                v?.variant_label ||
                v?.variantLabel ||
                v?.name ||
                v?.label ||
                "",
              price: v?.price ?? selected.discount_price ?? selected.price,
              thumbnail:
                typeof selected.images?.[0] === "string"
                  ? selected.images[0]
                  : selected.images?.[0]?.image_url,
            },
          ],
    );
    setNotice("");
    setProductId("");
    setVariantId("");
    setQuantity("1");
  };
  async function save(e) {
    e.preventDefault();
    if (lock.current) return;
    if (uncertainCreate.current)
      return setNotice(
        "نتيجة الإضافة السابقة غير مؤكدة. راجع قائمة الطلبات قبل إعادة الإنشاء.",
      );
    setNotice("");
    if (!addressReady || !addresses.length)
      return setNotice("أضف عنوان توصيل للعميل أولًا.");
    if (addressId && !addresses.some((a) => a.id === addressId))
      return setNotice("اختر عنوانًا من عناوين العميل الحالي.");
    if (
      paymentState.loading ||
      paymentState.error ||
      !paymentOptions.some((method) => method.code === paymentMethod)
    )
      return setNotice("اختر وسيلة دفع متاحة من الخادم أولًا.");
    let body;
    try {
      body = createOrderBody({
        userId,
        addressId,
        items,
        paymentMethod,
        couponCode,
        adminNotes,
      });
    } catch (error) {
      setNotice(error.message);
      return;
    }
    lock.current = true;
    setBusy(true);
    try {
      const result = await adminRequest("/api/orders/admin", {
        method: "POST",
        body,
      });
      const createdId = result.data?.id || result.data?.order?.id;
      if (!createdId) {
        uncertainCreate.current = true;
        throw new Error(
          "استجاب الخادم لكن لم يُرجع رقم الطلب. راجع القائمة قبل إعادة الإنشاء.",
        );
      }
      onCreated(createdId);
    } catch (error) {
      if (!error.status || error.status >= 500) uncertainCreate.current = true;
      setNotice(
        (error.validationErrors?.length
          ? error.validationErrors.map((item) => item.message).join("، ")
          : error.message) +
          (uncertainCreate.current
            ? " راجع قائمة الطلبات قبل إعادة الإنشاء لتجنب التكرار."
            : ""),
      );
      lock.current = false;
      setBusy(false);
    }
  }
  async function saveAddress(e) {
    e.preventDefault();
    if (addressLock.current || !userId) return;
    setAddressError("");
    let body;
    try {
      body = addressBody(newAddress);
    } catch (error) {
      setAddressError(error.message);
      return;
    }
    addressLock.current = true;
    setAddressBusy(true);
    const target = userId;
    try {
      const result = await adminRequest(
        "/api/admin/customers/" + encodeURIComponent(target) + "/addresses",
        { method: "POST", body },
      );
      const updated = result.data?.addresses;
      if (!Array.isArray(updated)) {
        customer.reload();
        setNewAddress(null);
        setNotice(
          "استجاب الخادم لحفظ العنوان. حدّث بيانات العميل للتحقق منه قبل إضافة عنوان آخر.",
        );
        return;
      }
      const added = updated.find(
        (a) => !addresses.some((old) => old.id === a.id),
      );
      setAddressOverride({ userId: target, addresses: updated });
      setAddressId(added?.id || "");
      setNewAddress(null);
      setNotice("تم حفظ العنوان.");
      customer.reload();
    } catch (error) {
      setAddressError(error.message);
    } finally {
      addressLock.current = false;
      setAddressBusy(false);
    }
  }
  return (
    <div className="op-content">
      <div className="op-heading">
        <h1>إضافة طلب جديد</h1>
        <button
          className="op-text"
          disabled={busy || addressBusy}
          onClick={onBack}
        >
          <ArrowRight size={16} />
          الطلبات
        </button>
      </div>
      {notice && (
        <p className="op-notice" role="alert">
          {notice}
        </p>
      )}
      <form onSubmit={save}>
        <fieldset
          disabled={busy || addressBusy}
          style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
        >
          <Panel title="بيانات العميل">
            <div className="op-form-grid">
              <Field label="البحث عن العميل" icon={UserRound}>
                <input
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="اسم العميل أو رقم الهاتف"
                />
              </Field>
              <Select
                label="العميل"
                value={userId}
                onChange={(e) => {
                  setUserId(e.target.value);
                  setAddressId("");
                  setNotice("");
                }}
                disabled={customers.loading || Boolean(customers.error)}
              >
                <option value="">اختر العميل</option>
                {customerRows.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || c.phone || c.email}{" "}
                    {c.name && c.phone ? "· " + c.phone : ""}
                  </option>
                ))}
              </Select>
              <Select
                label="عنوان التوصيل"
                icon={MapPin}
                value={addressId}
                onChange={(e) => setAddressId(e.target.value)}
                disabled={!addressReady || !addresses.length}
              >
                <option value="">العنوان الافتراضي للعميل</option>
                {addresses.map((a) => (
                  <option key={a.id} value={a.id}>
                    {[
                      a.label,
                      a.city,
                      a.district,
                      a.street,
                      a.shortAddress || a.short_address,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </option>
                ))}
              </Select>
              <Select
                label="وسيلة الدفع"
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value)}
                disabled={
                  paymentState.loading ||
                  !!paymentState.error ||
                  !paymentOptions.length
                }
              >
                <option value="">اختر وسيلة الدفع</option>
                {paymentOptions.map((method) => (
                  <option key={method.code} value={method.code}>
                    {method.label}
                  </option>
                ))}
              </Select>
            </div>
            <ResourceState resource={customers} onLogin={onSessionExpired} />
            <ResourceState resource={customer} onLogin={onSessionExpired} />
            <ResourceState resource={paymentState} onLogin={onSessionExpired} />
            {paymentResource.data &&
              !paymentState.error &&
              !paymentOptions.length && (
                <p className="op-notice" role="alert">
                  لا توجد وسيلة دفع مفعّلة لإنشاء الطلب حاليًا.
                </p>
              )}
            {addressReady && !addresses.length && (
              <p className="op-notice" role="status">
                العميل ليس لديه عنوان توصيل. أضف عنوانًا لإكمال الطلب.
              </p>
            )}
            {userId && customer.data && !Array.isArray(addressData) && (
              <p className="op-notice" role="alert">
                تعذر قراءة عناوين العميل. أعد تحميل بياناته.
              </p>
            )}
            {userId && (
              <button
                className="op-outline"
                type="button"
                onClick={() => {
                  setAddressError("");
                  setNewAddress({
                    city: "",
                    district: "",
                    street: "",
                    buildingNo: "",
                    shortAddress: "",
                    phone: "",
                    label: "المنزل",
                    isDefault: !addresses.length,
                  });
                }}
              >
                <Plus size={16} />
                إضافة عنوان
              </button>
            )}
          </Panel>
          <Panel title="منتجات الطلب">
            <div className="op-form-grid">
              <Field label="البحث عن المنتج" icon={Package}>
                <input
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="اسم المنتج أو رقم القطعة"
                />
              </Field>
              <Select
                label="المنتج"
                value={productId}
                onChange={(e) => {
                  setProductId(e.target.value);
                  setVariantId("");
                }}
                disabled={products.loading || Boolean(products.error)}
              >
                <option value="">اختر منتجًا</option>
                {productRows.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.part_number ? "· " + p.part_number : ""}
                  </option>
                ))}
              </Select>
              {variants.length > 0 && (
                <Select
                  label="نوع المنتج"
                  value={variantId}
                  onChange={(e) => setVariantId(e.target.value)}
                >
                  <option value="">اختر النوع</option>
                  {variants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.variant_label ||
                        v.variantLabel ||
                        v.name ||
                        v.label ||
                        v.sku}
                    </option>
                  ))}
                </Select>
              )}
              <Field label="الكمية">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </Field>
            </div>
            <ResourceState resource={products} onLogin={onSessionExpired} />
            <ResourceState resource={product} onLogin={onSessionExpired} />
            <button
              type="button"
              className="op-primary"
              disabled={!selected || product.loading || Boolean(product.error)}
              onClick={add}
            >
              <Plus size={18} />
              إضافة منتج للطلب
            </button>
            <div className="op-table-scroll">
              <table className="op-table op-items-table">
                <thead>
                  <tr>
                    <th>المنتج</th>
                    <th>سعر الكتالوج</th>
                    <th>الكمية</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((i) => (
                    <tr key={i.key}>
                      <td>
                        <div className="op-product-cell">
                          <ProductPhoto src={i.thumbnail} name={i.name} />
                          <span>
                            {i.name}
                            <small>{i.variantName}</small>
                          </span>
                        </div>
                      </td>
                      <td>
                        <Money value={i.price} />
                      </td>
                      <td>
                        <input
                          aria-label={"كمية " + i.name}
                          type="number"
                          min="1"
                          step="1"
                          value={i.quantity}
                          onChange={(e) =>
                            setItems(
                              items.map((row) =>
                                row.key === i.key
                                  ? { ...row, quantity: e.target.value }
                                  : row,
                              ),
                            )
                          }
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="op-delete"
                          aria-label={"إزالة " + i.name}
                          onClick={() =>
                            setItems(items.filter((row) => row.key !== i.key))
                          }
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
          <Panel title="ملاحظات الطلب">
            <div className="op-form-grid">
              <Field label="كود الخصم" icon={FileText}>
                <input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                />
              </Field>
              <Field label="ملاحظات الإدارة">
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                />
              </Field>
            </div>
            <p className="op-caption">
              يحسب السيرفر الإجمالي والخصم والشحن والضريبة عند إنشاء الطلب.
            </p>
          </Panel>
          <div className="op-bottom-actions">
            <button
              className="op-primary"
              disabled={
                busy ||
                addressBusy ||
                !items.length ||
                paymentState.loading ||
                !!paymentState.error ||
                !paymentMethod ||
                !addressReady ||
                !addresses.length
              }
              type="submit"
            >
              <Save size={18} />
              {busy ? "جارٍ إنشاء الطلب…" : "حفظ الطلب"}
            </button>
            <button
              className="op-outline"
              type="button"
              disabled={busy || addressBusy}
              onClick={onBack}
            >
              إلغاء
            </button>
          </div>
        </fieldset>
      </form>
      {newAddress && (
        <Modal
          title="إضافة عنوان"
          onClose={() => {
            if (!addressBusy) setNewAddress(null);
          }}
        >
          <form onSubmit={saveAddress}>
            <fieldset
              disabled={addressBusy}
              style={{ border: 0, padding: 0, minWidth: 0 }}
            >
              <div className="op-form-grid">
                {[
                  ["city", "المدينة", true],
                  ["district", "الحي"],
                  ["street", "الشارع"],
                  ["buildingNo", "رقم المبنى"],
                  ["shortAddress", "العنوان المختصر"],
                  ["phone", "رقم الهاتف"],
                  ["label", "اسم العنوان"],
                ].map(([key, label, required]) => (
                  <Field label={label} key={key}>
                    <input
                      aria-label={label}
                      value={newAddress[key]}
                      required={required}
                      onChange={(e) =>
                        setNewAddress({ ...newAddress, [key]: e.target.value })
                      }
                    />
                  </Field>
                ))}
              </div>
              <label>
                <input
                  type="checkbox"
                  checked={newAddress.isDefault}
                  onChange={(e) =>
                    setNewAddress({
                      ...newAddress,
                      isDefault: e.target.checked,
                    })
                  }
                />
                تعيين عنوان افتراضي
              </label>
              {addressError && (
                <p role="alert" className="op-notice">
                  {addressError}
                </p>
              )}
              <div className="op-modal-buttons">
                <button className="op-primary" type="submit">
                  {addressBusy ? "جارٍ الحفظ…" : "حفظ العنوان"}
                </button>
                <button
                  className="op-outline"
                  type="button"
                  onClick={() => setNewAddress(null)}
                >
                  إلغاء
                </button>
              </div>
            </fieldset>
          </form>
        </Modal>
      )}
    </div>
  );
}
