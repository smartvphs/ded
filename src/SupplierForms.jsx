import React, { useRef, useState } from "react";
import { adminRequest } from "./admin-api";
import { uploadContentImage } from "./definitions-api";
import { ResourceState } from "./orders-ui";
import SupplierHours from "./SupplierHours";
import { containsValues } from "./site-info-bindings";
import useAdminResource from "./use-admin-resource";
import {
  SupplierIcon,
  SupplierPanel,
  SupplierField,
  SupplierButton,
  SupplierLogo,
  SupplierMoney,
  SupplierModal,
  text,
} from "./supplier-ui";
export function SupplierEditor(props) {
  const resource = useAdminResource(
    props.supplier
      ? "/api/suppliers/admin/" + encodeURIComponent(props.supplier.id)
      : null,
  );
  if (props.supplier && !resource.data)
    return (
      <SupplierModal title="تعديل بيانات المورد" onClose={props.onClose}>
        <ResourceState resource={resource} />
      </SupplierModal>
    );
  return (
    <SupplierEditorForm
      {...props}
      supplier={props.supplier ? resource.data.data : undefined}
    />
  );
}
function SupplierEditorForm({ supplier, onClose, onSaved }) {
  const editing = !!supplier;
  const [hoursOpen, setHoursOpen] = useState(false),
    [hours, setHours] = useState(null);
  const committed = useRef(null);
  const [form, setForm] = useState({
      name: supplier?.name || "",
      contactName: supplier?.contact_name || "",
      email: supplier?.email || "",
      phone: supplier?.phone || "",
      address: supplier?.address || "",
      logoUrl: supplier?.logo_url || "",
      identityDocumentUrl: supplier?.identity_document_url || "",
      city: supplier?.city || "",
      supportedMakeIds:
        supplier?.supported_make_ids || supplier?.supported_brands || [],
      supportedQualities: supplier?.supported_qualities || [],
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [unknown, setUnknown] = useState(false);
  const makes = useAdminResource("/api/car-makes/admin"),
    quality = useAdminResource("/api/suppliers/quality-tiers");
  const makeItems = Array.isArray(makes.data?.data)
    ? makes.data.data
    : makes.data?.data?.items || [];
  const qData = quality.data?.data,
    qItems = Array.isArray(qData) ? qData : qData?.items || qData?.tiers || [];
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  async function upload(event, key) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 1024 * 1024
    ) {
      setError("اختر صورة JPG أو PNG أو WebP لا تتجاوز 1 ميجابايت.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const value = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = () => reject(new Error("تعذر قراءة الصورة"));
        r.readAsDataURL(file);
      });
      set(key, await uploadContentImage(value, "suppliers"));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function submit(e) {
    e.preventDefault();
    if (busy || unknown) return;
    setBusy(true);
    setError("");
    try {
      if (editing) {
        let body = committed.current;
        if (!body) {
          const original = {
            workingHours: supplier.working_hours ?? null,
            pricingHours: supplier.pricing_hours ?? null,
            name: supplier.name || "",
            contactName: supplier.contact_name || "",
            email: supplier.email || "",
            address: supplier.address || "",
            city: supplier.city || "",
            logoUrl: supplier.logo_url || "",
            identityDocumentUrl: supplier.identity_document_url || "",
            supportedQualities: supplier.supported_qualities || [],
            supportedBrands:
              supplier.supported_make_ids || supplier.supported_brands || [],
          };
          const current = {
            name: form.name.trim(),
            contactName: form.contactName.trim(),
            email: form.email.trim(),
            address: form.address.trim(),
            city: form.city.trim(),
            logoUrl: form.logoUrl,
            identityDocumentUrl: form.identityDocumentUrl,
            supportedQualities: form.supportedQualities,
            supportedBrands: form.supportedMakeIds,
            ...hours,
          };
          body = Object.fromEntries(
            Object.entries(current).filter(
              ([key, value]) =>
                JSON.stringify(value) !== JSON.stringify(original[key]),
            ),
          );
          if (!Object.keys(body).length) {
            onClose();
            return;
          }
          try {
            await adminRequest(
              "/api/suppliers/admin/" + encodeURIComponent(supplier.id),
              { method: "PATCH", body },
            );
            committed.current = body;
          } catch (e) {
            if (!e.status || e.status >= 500) committed.current = body;
            throw e;
          }
        }
        const result = await adminRequest(
          "/api/suppliers/admin/" + encodeURIComponent(supplier.id),
        );
        const fieldMap = {
          contactName: "contact_name",
          logoUrl: "logo_url",
          identityDocumentUrl: "identity_document_url",
          supportedQualities: "supported_qualities",
          supportedBrands: "supported_brands",
          workingHours: "working_hours",
          pricingHours: "pricing_hours",
        };
        for (const [key, value] of Object.entries(body)) {
          const actual =
            result.data?.[fieldMap[key] || key] ??
            (key === "supportedBrands"
              ? result.data?.supported_make_ids
              : undefined);
          if (!containsValues(actual, value))
            throw new Error("تعذر تأكيد بيانات المورد؛ أعد التحقق.");
        }
        onSaved(supplier.id);
        return;
      }
      const result = await adminRequest("/api/suppliers/admin", {
        method: "POST",
        body: {
          name: form.name.trim(),
          contactName: form.contactName.trim(),
          ownerName: form.contactName.trim(),
          phone: form.phone.trim(),
          email: form.email.trim() || undefined,
          address: form.address.trim() || undefined,
          city: form.city.trim() || undefined,
          logoUrl: form.logoUrl || undefined,
          identityDocumentUrl: form.identityDocumentUrl || undefined,
          supportedMakeIds: form.supportedMakeIds,
          supportedQualities: form.supportedQualities,
          supplierTypes: ["parts"],
        },
      });
      if (!result.data?.id) {
        setUnknown(true);
        throw new Error(
          "تعذر التأكد من إضافة المورد. راجع القائمة قبل المحاولة مرة أخرى.",
        );
      }
      onSaved(result.data.id);
    } catch (e) {
      if (!editing && (!e.status || e.status >= 500)) setUnknown(true);
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <SupplierModal
      title={editing ? "تعديل بيانات المورد" : "إضافة مورد جديد"}
      onClose={onClose}
      busy={busy}
    >
      {hoursOpen && (
        <SupplierHours
          workingHours={hours?.workingHours ?? supplier?.working_hours}
          pricingHours={hours?.pricingHours ?? supplier?.pricing_hours}
          onClose={() => setHoursOpen(false)}
          onSave={(value) => {
            setHours(value);
            setHoursOpen(false);
          }}
        />
      )}
      <form onSubmit={submit}>
        <SupplierPanel title="المعلومات الشخصية">
          <fieldset
            disabled={busy || !!committed.current || unknown}
            className="su-form-fieldset"
          >
            <div className="su-fields">
              <SupplierField label="اسم المورد *" icon="person">
                <input
                  required
                  value={form.contactName}
                  onChange={(e) => set("contactName", e.target.value)}
                  placeholder="اسم المورد هنا"
                />
              </SupplierField>
              <SupplierField label="اسم الشركة *" icon="building">
                <input
                  required
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="اسم الشركة"
                />
              </SupplierField>
              <SupplierField label="البريد الإلكتروني *" icon="mail">
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="البريد الإلكتروني"
                />
              </SupplierField>
              <SupplierField label="رقم الجوال *" icon="phone">
                <input
                  type="tel"
                  disabled={editing}
                  title={
                    editing
                      ? "المورد يغير رقم دخوله باستخدام OTP من التطبيق."
                      : undefined
                  }
                  required
                  dir="ltr"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="+9665xxxxxxxx"
                />
              </SupplierField>
              <SupplierField label="العنوان *" icon="location" wide>
                <div className="su-address-control">
                  <input
                    value={form.address}
                    onChange={(e) => set("address", e.target.value)}
                    placeholder="اكتب العنوان هنا"
                  />
                  <a
                    href={
                      "https://maps.google.com/?q=" +
                      encodeURIComponent(
                        form.address || form.city || "السعودية",
                      )
                    }
                    target="_blank"
                    rel="noreferrer"
                    aria-label="فتح العنوان على الخريطة"
                  >
                    <SupplierIcon name="geo" size={35} />
                  </a>
                </div>
              </SupplierField>
              <SupplierField
                label={
                  <span>
                    الصورة الشخصية{" "}
                    <small className="su-upload-note">
                      يجب أن تكون الصورة بحجم لا يتجاوز 1 ميجابايت
                    </small>
                  </span>
                }
                icon="image"
                wide
              >
                <span className="su-upload">
                  <span>
                    {form.logoUrl
                      ? "تم إرفاق الصورة الشخصية"
                      : "إرفاق الصورة الشخصية"}
                  </span>
                  <SupplierIcon name="upload" size={21} />
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    aria-label="الصورة الشخصية"
                    onChange={(e) => upload(e, "logoUrl")}
                  />
                </span>
              </SupplierField>
              <SupplierField label="صورة الهوية *" icon="image" wide>
                <span className="su-upload">
                  <span>
                    {form.identityDocumentUrl
                      ? "تم إرفاق صورة الهوية"
                      : "إرفاق صورة الهوية"}
                  </span>
                  <SupplierIcon name="upload" size={21} />
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    aria-label="صورة الهوية"
                    onChange={(e) => upload(e, "identityDocumentUrl")}
                  />
                </span>
              </SupplierField>
            </div>
            <h3 className="su-form-section-title">معلومات الشركة</h3>
            <div className="su-fields">
              <SupplierField
                label="الشركات (اختر الشركات التي يمكنك إرسال وتلقي تسعيرات لها)"
                icon="car"
                wide
              >
                <SupplierMakePicker
                  items={makeItems.filter((x) => x.is_active !== false)}
                  value={form.supportedMakeIds}
                  onChange={(value) => set("supportedMakeIds", value)}
                />
              </SupplierField>
              <SupplierField label="أوقات التسعير" icon="clock" wide>
                <select
                  disabled={!editing}
                  value=""
                  onChange={() => setHoursOpen(true)}
                >
                  <option value="">مواعيد العمل واستقبال التسعير</option>
                  <option value="edit">تعديل المواعيد</option>
                </select>
              </SupplierField>
            </div>
            <p className="su-bank-note">
              المواعيد بتوقيت السعودية؛ تُحفظ مع زر حفظ التعديلات.
            </p>
            <p className="su-muted" style={{ margin: "20px 0 8px" }}>
              الجودات المتاحة
            </p>
            <div className="su-chips">
              {qItems.map((q, i) => {
                const code = q.code || q.id;
                return (
                  <button
                    type="button"
                    key={code}
                    className={
                      "su-chip " +
                      (i === 0 ? "green" : i === 2 ? "orange" : "") +
                      (form.supportedQualities.includes(code)
                        ? " selected"
                        : "")
                    }
                    onClick={() =>
                      set(
                        "supportedQualities",
                        form.supportedQualities.includes(code)
                          ? form.supportedQualities.filter((x) => x !== code)
                          : [...form.supportedQualities, code],
                      )
                    }
                  >
                    {q.nameAr || q.name_ar || q.name || q.label || code}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <h3 className="su-form-section-title">المعلومات البنكية</h3>
          <div className="su-fields">
            <SupplierField label="اسم البنك" icon="bank">
              <select disabled value={supplier?.bank_name || ""}>
                <option value={supplier?.bank_name || ""}>
                  {supplier?.bank_name || "اختر البنك"}
                </option>
              </select>
            </SupplierField>
            <SupplierField label="اسم صاحب الحساب" icon="account">
              <input
                disabled
                defaultValue={supplier?.bank_account_name || ""}
                placeholder="اسم صاحب الحساب"
              />
            </SupplierField>
            <SupplierField label="رقم الآيبان" icon="card" wide>
              <input
                disabled
                defaultValue={supplier?.iban || ""}
                placeholder="الرقم هنا"
                dir="ltr"
              />
            </SupplierField>
            <SupplierField label="ملاحظات" wide>
              <textarea
                disabled
                placeholder="ملاحظات إضافية عن المورد، شروط خاصة، أي معلومات مهمة..."
              />
            </SupplierField>
          </div>
          <p className="su-bank-note">
            المورد يضيف بياناته البنكية من حسابه في التطبيق.
          </p>

          {error && (
            <p className="su-error" role="alert">
              {error}
            </p>
          )}
          {busy && (
            <p className="su-inline-note" role="status">
              جارٍ حفظ البيانات…
            </p>
          )}
          <button
            className="su-button full"
            disabled={busy || unknown}
            type="submit"
          >
            <SupplierIcon name="plus" size={20} />
            {committed.current
              ? "إعادة التحقق"
              : editing
                ? "حفظ التعديلات"
                : "إضافة مورد جديد"}
          </button>
        </SupplierPanel>
      </form>
    </SupplierModal>
  );
}
const balanceOutcomes = new Map();
export function SupplierBalance({ supplier, onClose, onChanged }) {
  const previous = balanceOutcomes.get(supplier.id);
  const [kind, setKind] = useState(previous?.kind || "credit"),
    [amount, setAmount] = useState(previous?.amount || ""),
    [reason, setReason] = useState(previous?.reason || ""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(previous?.saved || null),
    [unknown, setUnknown] = useState(!!previous);
  const wallet = useAdminResource(
    "/api/suppliers/admin/" + encodeURIComponent(supplier.id) + "/wallet",
  );
  async function submit(e) {
    e.preventDefault();
    if (busy || (unknown && !saved)) return;
    setBusy(true);
    setError("");
    try {
      if (!saved) {
        balanceOutcomes.set(supplier.id, { kind, amount, reason });
        const r = await adminRequest(
          "/api/suppliers/admin/" +
            encodeURIComponent(supplier.id) +
            "/" +
            kind,
          {
            method: "POST",
            body: {
              amount: Number(amount),
              reason: reason.trim() || "إضافة رصيد بواسطة الإدارة",
            },
          },
        );
        if (!r.data?.id) {
          setUnknown(true);
          throw new Error("تعذر تأكيد تسجيل العملية. راجع سجل المعاملات.");
        }
        balanceOutcomes.set(supplier.id, {
          kind,
          amount,
          reason,
          saved: r.data,
        });
        setSaved(r.data);
        await confirm(r.data);
      } else await confirm(saved);
    } catch (e) {
      if (!e.status || e.status >= 500) setUnknown(true);
      else if (!saved && !balanceOutcomes.get(supplier.id)?.saved)
        balanceOutcomes.delete(supplier.id);
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function confirm(row) {
    const result = await adminRequest(
      "/api/suppliers/admin/" +
        encodeURIComponent(supplier.id) +
        "/transactions?limit=100&offset=0",
    );
    if (
      !Array.isArray(result.data) ||
      !result.data.some((x) => x.id === row.id)
    )
      throw new Error("تم إرسال العملية، وتعذر تأكيدها. أعد التحقق من السجل.");
    balanceOutcomes.delete(supplier.id);
    onChanged();
    onClose();
  }
  return (
    <SupplierModal
      title="تسوية رصيد الموردين"
      subtitle="هل أنت متأكد من أنك تريد تصفية رصيد المورد"
      small
      busy={busy}
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <SupplierPanel>
          <div className="su-balance-intro">
            <SupplierLogo supplier={supplier} size={50} />
            <h3>{supplier.name}</h3>
            <p>
              إجمالي الرصيد المستحق{" "}
              <strong>
                <SupplierMoney
                  value={wallet.data?.data?.balance ?? supplier.wallet_balance}
                />
              </strong>
            </p>
          </div>
          <p>نوع العملية</p>
          <div className="su-balance-toggle">
            <button
              type="button"
              className={kind === "deduction" ? "active" : ""}
              disabled={busy || !!saved || unknown}
              onClick={() => setKind("deduction")}
            >
              خصم رصيد
            </button>
            <button
              type="button"
              className={kind === "credit" ? "active" : ""}
              disabled={busy || !!saved || unknown}
              onClick={() => setKind("credit")}
            >
              إضافة رصيد
            </button>
          </div>
          <SupplierField label="المبلغ" icon="money">
            <input
              required
              min="0.01"
              step="0.01"
              type="number"
              value={amount}
              disabled={busy || !!saved || unknown}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="المبلغ"
            />
          </SupplierField>
          {kind === "deduction" && (
            <div style={{ marginTop: 20 }}>
              <SupplierField label="سبب خصم الرصيد">
                <textarea
                  required
                  value={reason}
                  disabled={busy || !!saved || unknown}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="ادخل سبب واضح لخصم الرصيد من المورد"
                />
              </SupplierField>
            </div>
          )}
          {error && (
            <p role="alert" className="su-error">
              {error}
            </p>
          )}
          {unknown && !saved && (
            <p className="su-inline-note">
              راجع سجل المعاملات قبل إرسال عملية جديدة.
            </p>
          )}
          <button
            className="su-button full"
            disabled={busy || (unknown && !saved)}
          >
            {saved
              ? "إعادة التحقق"
              : kind === "deduction"
                ? "خصم من الرصيد"
                : "تسوية الرصيد"}
          </button>
        </SupplierPanel>
      </form>
    </SupplierModal>
  );
}
export function SupplierInvoice({
  id,
  transaction,
  onClose,
  onSessionExpired,
}) {
  const resource = useAdminResource(
    id ? "/api/suppliers/admin/settlements/" + encodeURIComponent(id) : null,
  );
  const row = resource.data?.data;
  const [printing, setPrinting] = useState(false);
  function print() {
    setPrinting(true);
    window.print();
    setPrinting(false);
  }
  const item = (label, value) => (
    <div className="su-invoice-row">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
  return (
    <SupplierModal
      title={<SupplierMoney value={row?.netAmount ?? transaction?.amount} />}
      small
      onClose={onClose}
    >
      <p className="su-subtitle">تفاصيل العملية</p>
      {resource.loading && (
        <p className="su-inline-note">جارٍ تحميل التفاصيل…</p>
      )}
      {resource.error && (
        <p className="su-error">
          {resource.error.message}
          <button
            onClick={
              resource.error.status === 401 ? onSessionExpired : resource.reload
            }
          >
            إعادة المحاولة
          </button>
        </p>
      )}
      <SupplierPanel title="المعلومات الأساسية">
        {item("رقم التسوية", text(row?.settlementNumber ?? transaction?.id))}
        {item("التسوية", text(transaction?.description || row?.supplierName))}
        {item(
          "المبلغ",
          <SupplierMoney value={transaction?.amount ?? row?.netAmount} />,
        )}
        {item("رقم الحساب", text(row?.iban))}
        {item("حالة", text(row?.status || transaction?.type))}
      </SupplierPanel>
      <SupplierPanel title="تفاصيل الأرباح والاستحقاقات">
        <div className="su-invoice-group">
          {item(
            "قيمة الطلبات المؤكدة",
            <SupplierMoney value={row?.confirmedOrdersTotal} />,
          )}
          {item(
            "قيمة ربح من الطلبات",
            <SupplierMoney value={row?.ordersProfit} />,
          )}
        </div>
        <div className="su-invoice-group">
          {row?.breakdown?.profitByRate?.length
            ? row.breakdown.profitByRate.map((x, i) => (
                <React.Fragment key={i}>
                  {item(
                    "نسبة ربح " + x.percent + "%",
                    <SupplierMoney value={x.amount} />,
                  )}
                </React.Fragment>
              ))
            : item("نسب الأرباح", "—")}
        </div>
        <div className="su-invoice-group">
          {row?.breakdown?.pricingFees?.length
            ? row.breakdown.pricingFees.map((x, i) => (
                <React.Fragment key={i}>
                  {item(
                    text(x.pricingType || x.type),
                    <SupplierMoney value={x.amount} />,
                  )}
                </React.Fragment>
              ))
            : item("أرباح التسعير", "—")}
        </div>
      </SupplierPanel>
      <SupplierPanel title="الخصومات والرسوم">
        {row?.breakdown?.deductions?.length
          ? row.breakdown.deductions.map((x, i) => (
              <React.Fragment key={i}>
                {item(
                  text(x.reason || x.description),
                  <SupplierMoney value={x.amount} />,
                )}
              </React.Fragment>
            ))
          : item(
              "إجمالي الخصومات",
              <SupplierMoney value={row?.totalDeductions} />,
            )}
      </SupplierPanel>
      <div className="su-net">
        <span>صافي المستحق للتحويل</span>
        <SupplierMoney value={row?.netAmount} />
      </div>
      <button
        className="su-button full"
        disabled={!row || printing}
        onClick={print}
      >
        <SupplierIcon name="upload" size={22} />
        تحميل فاتورة التسوية
      </button>
    </SupplierModal>
  );
}

function SupplierMakePicker({ items, value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="su-make-picker">
      <button
        type="button"
        aria-label="الشركات"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {value.length
          ? items
              .filter((x) => value.includes(x.id))
              .map((x) => x.name_ar || x.name)
              .join(" . ")
          : "اختر الشركات"}
        <SupplierIcon name="chevron" size={15} />
      </button>
      {open && (
        <div
          className="su-make-options"
          role="listbox"
          aria-label="الشركات المتاحة"
          aria-multiselectable="true"
        >
          {items.map((x) => (
            <button
              role="option"
              aria-selected={value.includes(x.id)}
              key={x.id}
              type="button"
              onClick={() =>
                onChange(
                  value.includes(x.id)
                    ? value.filter((id) => id !== x.id)
                    : [...value, x.id],
                )
              }
            >
              <input
                tabIndex={-1}
                type="checkbox"
                checked={value.includes(x.id)}
                readOnly
              />
              {x.name_ar || x.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
