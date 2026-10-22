import React, { useEffect, useState } from "react";
import { CustomerModal, CustomerInput, CustomerAvatar } from "./customer-ui";
import { useMutation, Feedback } from "./ProductExtras";
import useAdminResource from "./use-admin-resource";
import useCatalogRows from "./use-catalog-rows";
import { ResourceState, Money } from "./orders-ui";
import { adminRequest } from "./admin-api";
import {
  customerBody,
  creditBody,
  cashbackBody,
  customerVehicleBody,
  customerPath,
  readCustomer,
  validateCustomerSave,
} from "./customer-api";
import { addressBody } from "./customer-address";
export function CustomerForm({ id, onClose, onSaved, onSessionExpired }) {
  const resource = useAdminResource(id ? customerPath(id) : null),
    [draft, setDraft] = useState({ name: "", email: "", phone: "" }),
    [ready, setReady] = useState(!id),
    [saved, setSaved] = useState(null),
    [uncertain, setUncertain] = useState(false),
    mutation = useMutation();
  useEffect(() => {
    if (resource.data?.data?.id === id && !ready) {
      const row = resource.data.data;
      setDraft({
        name: row.name || "",
        email: row.email || "",
        phone: row.phone || "",
      });
      setReady(true);
    }
  }, [resource.data, id, ready]);
  const set = (key, value) => setDraft((old) => ({ ...old, [key]: value }));
  async function save(e) {
    e.preventDefault();
    if (uncertain || !ready) return;
    await mutation.run(async () => {
      let record = saved;
      if (!record) {
        const body = customerBody(draft, !!id);
        let result;
        try {
          result = await adminRequest(
            id ? customerPath(id) : "/api/admin/customers",
            { method: id ? "PATCH" : "POST", body },
          );
        } catch (error) {
          if (!id && (!error.status || error.status >= 500)) setUncertain(true);
          throw error;
        }
        const userId = result.data?.id ?? id;
        if (!userId) {
          setUncertain(true);
          throw new Error(
            "لم يُرجع الخادم رقم العميل. راجع القائمة قبل إعادة الإضافة.",
          );
        }
        record = { id: userId, body };
        setSaved(record);
      }
      const row = await readCustomer(record.id);
      validateCustomerSave(row, record.body);
      await onSaved(row, !id);
      onClose();
    });
  }
  const deleted = resource.data?.data?.status === "deleted";
  return (
    <CustomerModal
      title={id ? "تعديل العميل" : "إضافة عميل جديد"}
      onClose={onClose}
      busy={mutation.busy}
    >
      <form onSubmit={save}>
        <ResourceState resource={resource} onLogin={onSessionExpired} />
        <fieldset
          className="customer-fieldset"
          disabled={mutation.busy || !ready || deleted || !!saved}
        >
          <CustomerInput
            label="الاسم الكامل"
            value={draft.name}
            onChange={(v) => set("name", v)}
            required
            maxLength={150}
          />
          <div className="customer-form-grid">
            <CustomerInput
              label="البريد الإلكتروني"
              type="email"
              value={draft.email}
              onChange={(v) => set("email", v)}
            />
            <CustomerInput
              label="رقم الجوال"
              type="tel"
              value={draft.phone}
              onChange={(v) => set("phone", v)}
              required={!id}
              disabled={!!id}
            />
          </div>
          {id ? (
            <>
              <p className="customer-api-note">
                تغيير الجوال يتم من حساب العميل بالتحقق برمز OTP.
              </p>
              <label className="customer-field">
                <span>الصورة الشخصية الحالية</span>
                <CustomerAvatar client={resource.data?.data || {}} />
              </label>
              <label className="customer-field">
                <span>ملاحظات الإدارة (عرض فقط)</span>
                <textarea
                  value={resource.data?.data?.admin_notes || ""}
                  readOnly
                  disabled
                  placeholder="لا توجد ملاحظات"
                />
              </label>
              <p className="customer-api-note">
                حفظ الصورة والملاحظات من الإدارة غير موثق حاليًا.
              </p>
            </>
          ) : (
            <p className="customer-api-note">
              الجوال بيتسجل غير موثّق؛ العميل يوثّقه من التطبيق. تقدر تضيف
              عنوانه وعربيته بعد إنشاء حسابه.
            </p>
          )}
        </fieldset>
        <Feedback mutation={mutation} />
        {saved && (
          <p className="customer-api-note">
            تم إرسال الحفظ؛ إعادة المحاولة هتحدّث البيانات بدون إضافة عميل تاني.
          </p>
        )}
        {uncertain && (
          <p role="alert">
            نتيجة الإضافة غير مؤكدة. راجع القائمة قبل إعادة الإضافة لتجنب
            التكرار.
          </p>
        )}
        <button
          className="cm-submit"
          disabled={mutation.busy || !ready || deleted || uncertain}
        >
          {saved ? "تحديث البيانات" : id ? "حفظ التعديلات" : "إضافة عميل جديد"}
        </button>
      </form>
    </CustomerModal>
  );
}
export function CustomerMoneyForm({
  client,
  mode,
  onClose,
  onSaved,
  onSessionExpired,
}) {
  const resource = useAdminResource(
      "/api/wallet/admin/" + encodeURIComponent(client.id),
    ),
    mutation = useMutation(),
    [amount, setAmount] = useState(""),
    [reason, setReason] = useState(""),
    [percent, setPercent] = useState(
      client.cashback_percent == null ? "" : String(client.cashback_percent),
    ),
    [committed, setCommitted] = useState(false),
    [uncertain, setUncertain] = useState(false);
  async function save(e) {
    e.preventDefault();
    if (uncertain) return;
    await mutation.run(async () => {
      if (!committed) {
        const body =
          mode === "balance"
            ? creditBody(amount, reason)
            : cashbackBody(percent);
        try {
          await adminRequest(
            "/api/wallet/admin/" +
              encodeURIComponent(client.id) +
              (mode === "balance" ? "/adjust" : "/cashback"),
            { method: mode === "balance" ? "POST" : "PATCH", body },
          );
        } catch (error) {
          if (mode === "balance" && (!error.status || error.status >= 500))
            setUncertain(true);
          throw error;
        }
        setCommitted(true);
      }
      const wallet = await adminRequest(
        "/api/wallet/admin/" + encodeURIComponent(client.id),
      );
      if (wallet.data?.balance == null)
        throw new Error("تعذر تأكيد رصيد المحفظة.");
      if (
        mode === "cashback" &&
        (wallet.data.cashbackPercent == null ||
          Number(wallet.data.cashbackPercent) !== Number(percent))
      )
        throw new Error("لم ترجع نسبة الكاش باك بالقيمة المحفوظة.");
      await onSaved();
      onClose();
    });
  }
  return (
    <CustomerModal
      title={mode === "balance" ? "إضافة رصيد للعميل" : "نسبة كاش باك"}
      onClose={onClose}
      busy={mutation.busy}
    >
      <form onSubmit={save}>
        <ResourceState resource={resource} onLogin={onSessionExpired} />
        {resource.data?.data?.balance != null && (
          <p className="customer-balance">
            الرصيد الحالي: <Money value={resource.data.data.balance} />
          </p>
        )}
        <fieldset
          className="customer-fieldset"
          disabled={mutation.busy || committed}
        >
          {mode === "balance" ? (
            <>
              <CustomerInput
                label="قيمة الرصيد"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={setAmount}
                required
              />
              <CustomerInput
                label="سبب إضافة الرصيد"
                value={reason}
                onChange={setReason}
                required
              />
            </>
          ) : (
            <>
              <div className="customer-form-grid">
                <CustomerInput
                  label="حد أدنى الطلب (عرض فقط)"
                  value={client.cashback_min_order}
                  disabled
                />
                <CustomerInput
                  label="نسبة الكاش باك"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={percent}
                  onChange={setPercent}
                  required
                />
              </div>
              <CustomerInput
                label="حد أعلى الكاش باك (عرض فقط)"
                value={client.cashback_max_amount}
                disabled
              />
              <p className="customer-api-note">
                المتاح حفظ النسبة؛ تعديل الحد الأدنى والأقصى غير موثق.
              </p>
            </>
          )}
        </fieldset>
        <Feedback mutation={mutation} />
        {uncertain && (
          <p role="alert">
            نتيجة إضافة الرصيد غير مؤكدة. راجع المحفظة وحركاتها قبل أي إضافة
            جديدة.
          </p>
        )}
        {committed && (
          <p className="customer-api-note">
            تم تنفيذ العملية؛ الزر هيحدّث البيانات بدون تكرار العملية.
          </p>
        )}
        <button
          className="cm-submit"
          disabled={
            mutation.busy || resource.loading || !!resource.error || uncertain
          }
        >
          {committed
            ? "تحديث البيانات"
            : mode === "balance"
              ? "إضافة الرصيد"
              : "تأكيد"}
        </button>
      </form>
    </CustomerModal>
  );
}
export function CustomerLocationForm({
  client,
  type,
  onClose,
  onSaved,
  onSessionExpired,
}) {
  const [form, setForm] = useState(
      type === "vehicle"
        ? {
            makeId: "",
            modelId: "",
            year: "",
            vin: "",
            plateNo: "",
            trim: "",
            engine: "",
            transmission: "",
            isDefault: false,
          }
        : {
            city: "",
            district: "",
            street: "",
            buildingNo: "",
            shortAddress: "",
            phone: client.phone || "",
            label: "",
            isDefault: false,
          },
    ),
    [committed, setCommitted] = useState(null),
    [uncertain, setUncertain] = useState(false),
    mutation = useMutation();
  const makes = useCatalogRows(
      type === "vehicle" ? "/api/cars/admin/makes" : null,
    ),
    models = useCatalogRows(
      type === "vehicle" && form.makeId
        ? "/api/cars/admin/makes/" + encodeURIComponent(form.makeId) + "/models"
        : null,
    );
  const set = (key, value) => setForm((old) => ({ ...old, [key]: value }));
  const input = (key, label, options = {}) => (
    <CustomerInput
      key={key}
      label={label}
      value={form[key]}
      onChange={(value) => set(key, value)}
      {...options}
    />
  );
  async function save(e) {
    e.preventDefault();
    if (uncertain) return;
    await mutation.run(async () => {
      let record = committed;
      if (!record) {
        const body =
          type === "vehicle" ? customerVehicleBody(form) : addressBody(form);
        if (
          type === "vehicle" &&
          (models.loading ||
            models.error ||
            !models.data?.data?.some((m) => m.id === body.modelId))
        )
          throw new Error("اختار موديل من القائمة وانتظر تحميل البيانات.");
        let result;
        try {
          result = await adminRequest(
            customerPath(client.id) +
              (type === "vehicle" ? "/vehicles" : "/addresses"),
            { method: "POST", body },
          );
        } catch (error) {
          if (!error.status || error.status >= 500) setUncertain(true);
          throw error;
        }
        if (result.data?.id !== client.id) {
          setUncertain(true);
          throw new Error("رد إضافة البيانات غير متوقع؛ راجع تفاصيل العميل.");
        }
        const collection = type === "vehicle" ? "vehicles" : "addresses";
        const oldIds = new Set((client[collection] || []).map((r) => r.id));
        record = {
          collection,
          ids: (result.data[collection] || [])
            .filter((r) => !oldIds.has(r.id))
            .map((r) => r.id),
        };
        setCommitted(record);
      }
      const verified = await readCustomer(client.id);
      if (
        !record.ids.length ||
        !record.ids.every((id) =>
          verified[record.collection]?.some((r) => r.id === id),
        )
      )
        throw new Error(
          "تم إرسال الإضافة، لكن تعذر تأكيد ظهورها. حدّث التفاصيل بدون إعادة الإضافة.",
        );
      await onSaved();
      onClose();
    });
  }
  return (
    <CustomerModal
      title={type === "vehicle" ? "إضافة مركبة جديدة" : "إضافة عنوان"}
      onClose={onClose}
      busy={mutation.busy}
    >
      <form onSubmit={save}>
        <fieldset
          className="customer-fieldset"
          disabled={mutation.busy || !!committed}
        >
          {type === "vehicle" ? (
            <>
              <ResourceState resource={makes} onLogin={onSessionExpired} />
              <ResourceState resource={models} onLogin={onSessionExpired} />
              <div className="customer-form-grid">
                <label className="customer-field">
                  <span>شركة العربية</span>
                  <select
                    aria-label="شركة العربية"
                    value={form.makeId}
                    onChange={(e) =>
                      setForm((old) => ({
                        ...old,
                        makeId: e.target.value,
                        modelId: "",
                      }))
                    }
                  >
                    <option value="">اختر الشركة</option>
                    {(makes.data?.data || [])
                      .filter((m) => m.is_active !== false)
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name_ar || m.name_en}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="customer-field">
                  <span>موديل العربية</span>
                  <select
                    aria-label="موديل العربية"
                    value={form.modelId}
                    disabled={!form.makeId || models.loading || !!models.error}
                    onChange={(e) => set("modelId", e.target.value)}
                  >
                    <option value="">اختر الموديل</option>
                    {(models.data?.data || [])
                      .filter((m) => m.is_active !== false)
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name_ar || m.name_en}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
              {input("year", "سنة الصنع", {
                type: "number",
                min: 1950,
                max: 2100,
                required: true,
              })}
              {input("vin", "رقم الهيكل")}
              {input("plateNo", "رقم اللوحة")}
              <div className="customer-form-grid">
                {input("trim", "الفئة")}
                {input("engine", "المحرك")}
                {input("transmission", "ناقل الحركة")}
              </div>
            </>
          ) : (
            <>
              {input("city", "المدينة", { required: true })}
              <div className="customer-form-grid">
                {input("district", "الحي")}
                {input("street", "الشارع")}
                {input("buildingNo", "رقم المبنى")}
                {input("shortAddress", "العنوان المختصر")}
              </div>
              {input("phone", "جوال العنوان", { type: "tel" })}
              {input("label", "اسم العنوان")}
            </>
          )}
          <label className="customer-default">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => set("isDefault", e.target.checked)}
            />
            افتراضي
          </label>
        </fieldset>
        <Feedback mutation={mutation} />
        {uncertain && (
          <p role="alert">
            نتيجة الإضافة غير مؤكدة. راجع تفاصيل العميل قبل إعادة الإضافة.
          </p>
        )}
        <button className="cm-submit" disabled={mutation.busy || uncertain}>
          {committed
            ? "تحديث البيانات"
            : type === "vehicle"
              ? "إضافة المركبة"
              : "إضافة العنوان"}
        </button>
      </form>
    </CustomerModal>
  );
}
