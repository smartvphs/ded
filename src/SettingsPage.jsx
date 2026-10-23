import RiyalIcon from "./RiyalIcon";
import React, { useContext, useRef, useState } from "react";
import {
  History,
  Upload,
  Image as ImageIcon,
  Trash2,
  ChevronDown,
  X,
  Settings,
  MessageSquare,
  Search,
  MoreVertical,
  Eye,
  CircleCheck,
  Circle,
  ArchiveRestore,
  BrainCircuit,
  CircleDollarSign,
  Save,
  ChevronsUpDown,
} from "lucide-react";
import { settingsArtwork, settingsImageHeights } from "./settings-assets";
import "./settings.css";
import {
  SettingsContext,
  SettingsScope,
  useSetting,
  useSettingsController,
} from "./settings-context";
import { adminRequest } from "./admin-api";
import SiteLocationDialog from "./SiteLocationDialog";
import SettingsMessages from "./SettingsMessages";
import { hoursInput, storedHours } from "./settings-bindings";

function Art({ name, className = "", label }) {
  const [file, x, y, w, h] = settingsArtwork[name];
  return (
    <svg
      className={"st-art " + className}
      viewBox={`${x} ${y} ${w} ${h}`}
      preserveAspectRatio="xMidYMid meet"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <image
        href={`/settings-reference/${file}.png`}
        x="0"
        y="0"
        width="1440"
        height={settingsImageHeights[file]}
      />
    </svg>
  );
}
function Field({
  label,
  icon,
  placeholder = "",
  suffix,
  className = "",
  type = "text",
  trailing,
  binding,
  context,
  local,
}) {
  const setting = useSetting(label, binding, context),
    control = local || setting;
  return (
    <label className={"st-field " + className} title={control.title}>
      <span>{label}</span>
      <span className="st-control">
        {icon && (
          <span className="st-field-icon">
            <Art name={icon} />
          </span>
        )}
        <input
          aria-label={label}
          type={type}
          value={control.value ?? ""}
          disabled={control.disabled}
          onChange={(e) => control.change(e.target.value)}
          placeholder={placeholder}
        />
        {suffix && (
          <span className="st-suffix">
            {suffix === "riyal" ? <RiyalIcon /> : suffix}
          </span>
        )}
        {trailing}
      </span>
    </label>
  );
}
function Switch({ label, binding, context }) {
  const setting = useSetting(label, binding, context),
    on = ["true", "1"].includes(String(setting.value));
  return (
    <div className="st-switch-wrap" title={setting.title}>
      <button
        type="button"
        role="switch"
        aria-label={label}
        aria-checked={on}
        disabled={setting.disabled}
        onClick={() => setting.change(String(Number(!on)))}
        className={"st-switch " + (on ? "on" : "")}
      >
        <i />
        <b />
      </button>
      <span>{setting.row ? (on ? "مفعل" : "غير مفعل") : "غير متاح"}</span>
    </div>
  );
}
function BoundTextarea({ label, binding, context, ...props }) {
  const setting = useSetting(label, binding, context);
  return (
    <textarea
      {...props}
      aria-label={label}
      value={setting.value}
      disabled={setting.disabled}
      title={setting.title}
      onChange={(e) => setting.change(e.target.value)}
    />
  );
}
function Panel({ children, title, className = "" }) {
  return (
    <section className={"st-panel " + className}>
      {title && <h2>{title}</h2>}
      {children}
    </section>
  );
}
function UploadArea({ label }) {
  return (
    <div className="st-upload" title="رفع الصور لهذا الإعداد غير موثق حاليًا.">
      <Upload size={55} strokeWidth={1.7} />
      <p>اسحب الصورة هنا</p>
      <p>سحب وإسقاط صورة هنا ، أو انقر لتحديد واحد</p>
      <button disabled type="button" className="st-button st-upload-button">
        <ImageIcon size={20} />
        اختر الصورة
      </button>
      <input hidden disabled type="file" accept="image/*" aria-label={label} />
    </div>
  );
}
function PricingSettings() {
  const normal = useSetting("رسوم التسعير العادي", "normalFee"),
    express = useSetting("رسوم التسعير السريع", "expressFee"),
    freeLimit = useSetting("عدد القطع المجانية", "freePartsLimit"),
    freeSla = useSetting("مهلة التسعير المجاني بالساعات", "freeSla"),
    normalSla = useSetting("مهلة التسعير العادي بالدقائق", "normalSla"),
    expressSla = useSetting("مهلة التسعير السريع بالدقائق", "expressSla");
  return (
    <div className="st-pricing">
      {[0, 1, 2].map((index) => (
        <Panel
          key={index}
          className={"st-percentages st-price-section-" + index}
        >
          {index === 0 && (
            <div className="st-grid three">
              {[
                "نسبة ربح المنصة على التسعيرات",
                "نسبة ربح المنصة على العروض",
                "نسبة ربح المنصة على الخدمات",
              ].map((label) => (
                <Field
                  key={label}
                  label={label}
                  binding={
                    ["pricingMargin", "offerMargin", "serviceMargin"][
                      [
                        "نسبة ربح المنصة على التسعيرات",
                        "نسبة ربح المنصة على العروض",
                        "نسبة ربح المنصة على الخدمات",
                      ].indexOf(label)
                    ]
                  }
                  icon="rate"
                  suffix="%"
                />
              ))}
            </div>
          )}
          <div className="st-pricing-heading">
            <div>
              <h3>{["تسعير مجاني", "تسعير عادي", "تسعير سريع"][index]}</h3>
              <p>
                {
                  [
                    "مجاني بدون رسوم ثابتة على القطع الأولى",
                    "رسوم التسعير: " + (normal.value || "—") + " ريال",
                    "رسوم التسعير: " + (express.value || "—") + " ريال",
                  ][index]
                }
              </p>
              <span>
                <History size={16} />
                {
                  [
                    freeSla.value ? "حتى " + freeSla.value + " ساعة" : "—",
                    normalSla.value ? "حتى " + normalSla.value + " دقيقة" : "—",
                    expressSla.value
                      ? "حتى " + expressSla.value + " دقيقة"
                      : "—",
                  ][index]
                }
              </span>
            </div>
            <Switch
              binding={
                ["freeEnabled", "normalEnabled", "expressEnabled"][index]
              }
              label={
                [
                  "تفعيل التسعير المجاني",
                  "تفعيل التسعير العادي",
                  "تفعيل التسعير السريع",
                ][index]
              }
            />
          </div>
          <label className="st-field st-description">
            <span>نص توضيحي للعميل*</span>
            <BoundTextarea
              label={"نص توضيحي " + ["مجاني", "عادي", "سريع"][index]}
            />
          </label>
          {index !== 0 && (
            <Field
              label="نسبة ربح المورد"
              binding={index === 1 ? "normalCommission" : "expressCommission"}
              icon="supplier"
              suffix="%"
            />
          )}
          <h3 className="st-tier-title">
            شرائح الأسعار — ما يحتسبه النظام على العميل
          </h3>
          {index === 0 && (
            <Field
              label="نسبة ربح المورد"
              binding="freeCommission"
              icon="supplier"
              suffix="%"
            />
          )}
          <div className="st-grid two st-tiers">
            <Field
              label="حد الشريحة الأولى (قطع)"
              binding={index === 0 ? "freePartsLimit" : undefined}
              context={["تسعير مجاني", "تسعير عادي", "تسعير سريع"][index]}
              suffix="قطعة"
              className="st-piece-field"
              trailing={<span className="st-range">من 1 إلى</span>}
            />
            <Field
              label="رسوم الشريحة الأولى (ريال/قطعة)"
              context={["تسعير مجاني", "تسعير عادي", "تسعير سريع"][index]}
              icon="rate"
              suffix="riyal"
            />
            <Field
              label="كل قطعة إضافية"
              context={["تسعير مجاني", "تسعير عادي", "تسعير سريع"][index]}
              suffix="قطعة"
              className="st-piece-field"
              trailing={
                <span className="st-range">
                  من{" "}
                  {index
                    ? "—"
                    : freeLimit.value !== ""
                      ? Number(freeLimit.value) + 1
                      : "—"}{" "}
                  إلى
                </span>
              }
            />
            <Field
              label="رسوم القطع الإضافية (1ريال/قطعة)"
              context={["تسعير مجاني", "تسعير عادي", "تسعير سريع"][index]}
              icon="rate"
              suffix="riyal"
            />
          </div>
        </Panel>
      ))}
      <p className="st-pricing-note">
        هذه الأسعار والنصوص ستظهر للعميل بالضبط عند اختيار نوع التسعير —
        التغييرات تُطبّق فورًا بعد الحفظ.
      </p>
    </div>
  );
}
function Cities({ label, context }) {
  const state = useSetting(label, undefined, context);
  const options = Array.isArray(state.row?.options)
    ? state.row.options.filter((x) => typeof x === "string")
    : [];
  return (
    <label className="st-field" title={state.title}>
      <span>{label}</span>
      <span className="st-control">
        <span className="st-field-icon">
          <Art name="location" />
        </span>
        <select
          aria-label={label}
          value={state.value}
          disabled={state.disabled || !options.length}
          onChange={(e) => state.change(e.target.value)}
        >
          <option value="">اختر المدينة</option>
          {[...new Set([state.value, ...options])]
            .filter(Boolean)
            .map((city) => (
              <option key={city}>{city}</option>
            ))}
        </select>
        <ChevronDown size={19} className="st-select-arrow" />
      </span>
    </label>
  );
}
function ShippingSettings() {
  const [companies, setCompanies] = useState(
    ["smsa", "aramex", "spl", "redbox", "redbox"].map((name, id) => ({
      name,
      id,
    })),
  );
  return (
    <div className="st-shipping">
      <Panel title="شركات الشحن" className="st-shipping-companies">
        <div className="st-shippers">
          {companies.map((company) => (
            <div key={company.id} className="st-shipper">
              {company.url ? (
                <img src={company.url} alt={company.label} />
              ) : (
                <Art name={company.name} label={company.name} />
              )}
              <button
                disabled
                title="تكامل شركات الشحن مؤجل."
                aria-label={"حذف شركة الشحن " + company.id}
                className="st-delete-image"
                onClick={() =>
                  setCompanies(
                    companies.filter((item) => item.id !== company.id),
                  )
                }
              >
                <Trash2 size={19} />
              </button>
            </div>
          ))}
        </div>
        <UploadArea
          label="صورة شركة الشحن"
          onFile={(file) =>
            setCompanies([
              ...companies,
              { id: Date.now(), url: file.url, label: file.name },
            ])
          }
        />
      </Panel>
      <Panel className="st-shipping-rates">
        <h2>الشحن الخفيف</h2>
        <Field
          label="سعر الشحن"
          context="الشحن الخفيف"
          icon="rate"
          suffix="riyal"
        />
        <h2>الشحن الثقيل</h2>
        <div className="st-grid two">
          <Cities label="المدينة *" context="الشحن الثقيل" />
          <Field
            label="سعر الشحن"
            context="الشحن الثقيل"
            icon="rate"
            suffix="riyal"
          />
        </div>
      </Panel>
      <Panel>
        <Field
          label="الحد الأدنى للسلة للشحن المجاني"
          icon="rate"
          suffix="riyal"
        />
      </Panel>
      <Panel className="st-fast-shipping">
        <div className="st-section-heading">
          <h2>الشحن السريع</h2>
          <Switch label="تفعيل الشحن السريع" />
        </div>
        <Cities label="المدينة *" context="الشحن السريع" />
      </Panel>
    </div>
  );
}
const gateways = [
  ["mada", "مدى", false],
  ["mastercard", "ماستر كارد", true],
  ["visa", "فيزا", true],
  ["apple", "ابل باي", false],
  ["amex", "أمريكان إكسبريس", true],
  ["samsung", "سامسونج باي", true],
  ["stc", "بنك إس تي سي", false],
];
const installments = [
  ["tabby", "تابي", true],
  ["tamara", "تمارا", false],
  ["mis", "ميس باي", true],
  ["madfoo", "مدفوع", true],
];
function PaymentSettings() {
  const [uploads, setUploads] = useState([]);
  return (
    <div className="st-payments">
      <Panel title="بوابات الدفع">
        <UploadArea
          label="صورة بوابة الدفع"
          onFile={(file) => setUploads([...uploads, file])}
        />
        {uploads.length > 0 && (
          <div className="st-added-payment-images">
            {uploads.map((file, index) => (
              <div key={index}>
                <img src={file.url} alt={file.name} />
                <button
                  className="st-delete-image"
                  aria-label={"حذف صورة بوابة الدفع " + index}
                  onClick={() =>
                    setUploads(uploads.filter((_, i) => i !== index))
                  }
                >
                  <Trash2 size={19} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="st-grid two st-gateways">
          {gateways.map(([logo, title, on]) => (
            <section
              className={"st-payment-card " + (logo === "stc" ? "st-wide" : "")}
              key={logo}
            >
              <div className="st-section-heading">
                <h3>
                  <Art name={logo} label={title} />
                  {title}
                </h3>
                <Switch label={"تفعيل " + title} />
              </div>
              <Field
                label="API Key"
                context={title}
                icon="key"
                placeholder="أدخل مفتاح الـ API"
              />
            </section>
          ))}
        </div>
      </Panel>
      <Panel title="شركات التقسيط" className="st-installments">
        {installments.map(([logo, title, on]) => (
          <section className="st-payment-card" key={logo}>
            <div className="st-section-heading">
              <h3>
                <Art name={logo} label={title} />
                {title}
              </h3>
              <Switch label={"تفعيل " + title} />
            </div>
            <div className="st-grid two">
              <Field
                label="رسوم البوابة"
                context={title}
                binding={
                  logo === "tabby"
                    ? "tabbyFee"
                    : logo === "tamara"
                      ? "tamaraFee"
                      : undefined
                }
                icon="rate"
                suffix="%"
              />
              <Field
                label="API Key"
                context={title}
                icon="key"
                placeholder="ادخل هنا"
              />
              <Field
                label="App Code"
                context={title}
                icon="folder"
                placeholder="ادخل هنا"
              />
              <Field
                label="Authorization"
                context={title}
                icon="authorization"
                placeholder="ادخل هنا"
              />
            </div>
          </section>
        ))}
      </Panel>
    </div>
  );
}
function ContactSettings() {
  const [location, setLocation] = useState(null),
    contactLocation = useSetting("موقع التواصل"),
    warehouseLocation = useSetting("موقع المستودع");
  const phoneSetting = useSetting("أرقام التواصل"),
    emailSetting = useSetting("البريد الإلكتروني");
  const readList = (state) => {
    try {
      const list = JSON.parse(state.value);
      return Array.isArray(list) && list.every((v) => typeof v === "string")
        ? list
        : null;
    } catch {
      return null;
    }
  };
  const phones = readList(phoneSetting),
    emails = readList(emailSetting);
  const local = (state, list, index) => ({
    value: list?.[index] || "",
    disabled: state.disabled || !list,
    title: state.title,
    change: (value) =>
      state.change(
        JSON.stringify(list.map((old, i) => (i === index ? value : old))),
      ),
  });
  return (
    <div className="st-contact-fields">
      {location && (
        <SiteLocationDialog
          value={JSON.parse(location.value)}
          onClose={() => setLocation(null)}
          onSave={(value) => location.change(JSON.stringify(value))}
        />
      )}
      <section className="st-contact-card">
        <h2>أرقام التواصل</h2>
        {(phones || ["", ""]).map((phone, id) => (
          <div className="st-removable-field" key={id}>
            <Field
              label="رقم الجوال*"
              icon="phone"
              placeholder="50 000 0000"
              suffix="+966"
              local={local(phoneSetting, phones, id)}
            />
            <button
              disabled={phoneSetting.disabled || !phones}
              className="st-remove"
              aria-label={"حذف رقم الجوال " + id}
              onClick={() =>
                phoneSetting.change(
                  JSON.stringify(phones.filter((_, i) => i !== id)),
                )
              }
            >
              <X size={24} />
            </button>
          </div>
        ))}
        <button
          className="st-add-link"
          disabled={phoneSetting.disabled || !phones}
          onClick={() => phoneSetting.change(JSON.stringify([...phones, ""]))}
        >
          + إضافة رقم آخر
        </button>
      </section>
      <section className="st-contact-card">
        <h2>البريد الإلكتروني</h2>
        {(emails || ["", ""]).map((email, id) => (
          <div className="st-removable-field" key={id}>
            <Field
              label="البريد الإلكتروني *"
              icon="mail"
              local={local(emailSetting, emails, id)}
            />
            <button
              disabled={emailSetting.disabled || !emails}
              className="st-remove"
              aria-label={"حذف البريد الإلكتروني " + id}
              onClick={() =>
                emailSetting.change(
                  JSON.stringify(emails.filter((_, i) => i !== id)),
                )
              }
            >
              <X size={24} />
            </button>
          </div>
        ))}
        <button
          className="st-add-link"
          disabled={emailSetting.disabled || !emails}
          onClick={() => emailSetting.change(JSON.stringify([...emails, ""]))}
        >
          + إضافة ايميل آخر
        </button>
      </section>
      <section className="st-contact-card st-address">
        <h2>العنوان والموقع</h2>
        {["العنوان *", "المستودع *"].map((label) => (
          <Field
            key={label}
            label={label}
            icon="location"
            trailing={
              <button
                disabled={
                  (label === "المستودع *" ? warehouseLocation : contactLocation)
                    .disabled
                }
                onClick={() =>
                  setLocation(
                    label === "المستودع *"
                      ? warehouseLocation
                      : contactLocation,
                  )
                }
                type="button"
                className="st-location-button"
                aria-label={"تحديد " + label}
              >
                <Art name="locationButton" />
              </button>
            }
          />
        ))}
      </section>
      <section className="st-contact-card">
        <h2>مواقع التواصل الاجتماعي</h2>
        <div className="st-grid two">
          {[
            ["الانستجرام *", "instagram"],
            ["تويتر x *", "twitter"],
            ["فيس بوك *", "facebook"],
            ["لينكد ان*", "linkedin"],
          ].map(([label, icon]) => (
            <Field key={icon} label={label} icon={icon} />
          ))}
        </div>
      </section>
    </div>
  );
}
function CashbackSettings() {
  return (
    <Panel className="st-cashback">
      <div className="st-grid three">
        <Field
          label="حد أدنى للطلب"
          binding="cashbackMin"
          icon="rate"
          suffix="ريال"
        />
        <Field
          label="نسبة الكاش باك"
          binding="cashbackPercent"
          icon="rate"
          suffix="%"
        />
        <Field
          label="حد أعلى الكاش باك"
          binding="cashbackMax"
          icon="rate"
          suffix="ريال"
        />
      </div>
    </Panel>
  );
}
const workDays = [
  "الأحد",
  "الاثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];
function PreparationSettings() {
  const setting = useSetting("ساعات العمل"),
    fulfillment = useSetting("مهلة تجهيز الطلب بالساعات", "fulfillmentHours");
  const [unit, setUnit] = useState("ساعة");
  let days = null;
  try {
    const value = JSON.parse(setting.value);
    if (
      Array.isArray(value) &&
      value.length === 7 &&
      value.every(
        (d, i) =>
          d &&
          d.day === workDays[i] &&
          typeof d.enabled === "boolean" &&
          typeof d.from === "string" &&
          typeof d.to === "string",
      )
    )
      days = value;
  } catch {}
  const disabled = setting.disabled || !days;
  const changeDay = (index, key, value) => {
    if (!disabled)
      setting.change(
        JSON.stringify(
          days.map((day, i) => (i === index ? { ...day, [key]: value } : day)),
        ),
      );
  };
  const workDay = (index) => {
    const day = days?.[index],
      layoutWorking = day ? day.enabled : index < 5;
    return (
      <div
        key={workDays[index]}
        className={
          "st-workday " + (layoutWorking ? "st-working" : "st-holiday")
        }
      >
        <button
          type="button"
          className={"st-day-switch " + (day?.enabled ? "on" : "")}
          role="switch"
          aria-label={"يوم " + workDays[index]}
          aria-checked={!!day?.enabled}
          title={setting.title}
          disabled={disabled}
          onClick={() => changeDay(index, "enabled", !day.enabled)}
        >
          <i />
        </button>
        <span className="st-day-name">{workDays[index]}</span>
        {layoutWorking ? (
          <>
            <span>من</span>
            <label className="st-work-time">
              <input
                aria-label={"بداية عمل " + workDays[index]}
                value={day?.from || ""}
                disabled={disabled}
                onChange={(e) => changeDay(index, "from", e.target.value)}
              />
              <Art name="workClock" />
            </label>
            <span>إلى</span>
            <label className="st-work-time">
              <input
                aria-label={"نهاية عمل " + workDays[index]}
                value={day?.to || ""}
                disabled={disabled}
                onChange={(e) => changeDay(index, "to", e.target.value)}
              />
              <Art name="workClock" />
            </label>
          </>
        ) : (
          <span className="st-holiday-label">{day ? "إجازة" : "—"}</span>
        )}
      </div>
    );
  };
  const activeDays = days?.filter((d) => d.enabled) || [],
    holidays = days?.filter((d) => !d.enabled).map((d) => d.day) || [];
  return (
    <Panel className="st-preparation">
      <section className="st-preparation-card">
        <h2>وقت تجهيز الطلب للمورد</h2>
        <p>حدد عدد الساعات أو الأيام التي سيحتاجها المورد لتجهيز الطلب</p>
        <div className="st-preparation-fields">
          <Field
            label={unit === "ساعة" ? "عدد الساعات *" : "عدد الأيام *"}
            icon="preparationClock"
            placeholder="مثال:24"
            type="number"
            local={{
              value: hoursInput(fulfillment.value, unit),
              disabled: fulfillment.disabled,
              title: fulfillment.title,
              change: (value) => fulfillment.change(storedHours(value, unit)),
            }}
          />
          <ChevronsUpDown className="st-time-step" size={30} />
          <div className="st-unit">
            <span>الوحدة</span>
            <div role="group" aria-label="وحدة وقت التجهيز">
              {["ساعة", "يوم"].map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={unit === value}
                  disabled={fulfillment.disabled}
                  title={fulfillment.title}
                  className={unit === value ? "active" : ""}
                  onClick={() => setUnit(value)}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section className="st-preparation-card st-working-hours">
        <h2>ساعات العمل</h2>
        <p>حدد أيام وساعات العمل الرسمية</p>
        <div className="st-working-days">
          {[0, 1, 2, 3, 4].map(workDay)}
          <div
            className={
              "st-weekend " +
              (days?.[5].enabled || days?.[6].enabled
                ? "st-weekend-working"
                : "")
            }
          >
            {workDay(5)}
            {workDay(6)}
          </div>
        </div>
        <p className="st-work-summary">
          {days
            ? activeDays.length +
              " أيام عمل في الأسبوع" +
              (holidays.length ? " - " + holidays.join("، ") + " إجازة" : "")
            : "—"}
        </p>
      </section>
    </Panel>
  );
}
const aiPermissions = [
  ["إنشاء طلب جديد", "يسمح للذكاء الاصطناعي بإنشاء طلبات جديدة", "aiOrder"],
  ["الاستعلام عن حالة الطلب", "الاستفسار عن حالة الطلب", "aiSearch"],
  [
    "متابعة تذاكر الدعم",
    "يسمح للذكاء الاصطناعي بإنشاء طلبات جديدة",
    "aiSupport",
  ],
  ["توليد وصف المنتجات", "الاستفسار عن حالة الطلب", "aiDescription"],
  [
    "إرسال تذكير للموردين",
    "يسمح للذكاء الاصطناعي بإنشاء طلبات جديدة",
    "aiSupplier",
  ],
  ["إنشاء طلب تسعير", "الاستفسار عن حالة الطلب", "aiPricing"],
];
function AiSettings() {
  const api = useContext(SettingsContext),
    [form, setForm] = useState({}),
    [description, setDescription] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const training = useSetting("تعليمات تدريب الذكاء الاصطناعي");
  async function generate() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (!form.name?.trim()) throw new Error("أدخل اسم المنتج.");
      const body = {
        name: form.name.trim(),
        ...(form.partNumber ? { partNumber: form.partNumber } : {}),
        ...(form.category ? { category: form.category } : {}),
        ...(form.car ? { compatibility: [form.car] } : {}),
        ...(form.details ? { specifications: [form.details] } : {}),
      };
      const reply = await adminRequest(
        "/api/products/admin/generate-description",
        { method: "POST", body },
      );
      if (
        typeof reply.data?.description !== "string" ||
        !reply.data.description.trim()
      )
        throw new Error("لم يرجع الخادم وصفًا صالحًا.");
      setDescription(reply.data.description);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const local = (key) => ({
    value: form[key] || "",
    disabled: busy || !api.canGenerate,
    change: (value) => setForm((old) => ({ ...old, [key]: value })),
  });
  return (
    <div className="st-ai">
      <Panel title="تدريب الذكاء الاصطناعي" className="st-ai-training">
        <div>
          <textarea
            aria-label="تعليمات تدريب الذكاء الاصطناعي"
            value={training.value}
            disabled={training.disabled}
            title={training.title}
            onChange={(e) => training.change(e.target.value)}
          />
          <button
            type="button"
            className="st-button"
            disabled={training.disabled}
            onClick={() => api.save("ai")}
          >
            <Save size={18} />
            حفظ التعليمات
          </button>
        </div>
      </Panel>
      <Panel className="st-ai-product">
        <section className="st-ai-product-fields">
          <h2>وصف منتج</h2>
          <div className="st-grid two">
            <Field
              label="اسم منتج"
              icon="aiProduct"
              placeholder="مثال: فلتر زيت"
              local={local("name")}
            />
            <Field
              label="رقم القطعة"
              icon="aiPart"
              placeholder="مثال:1253"
              local={local("partNumber")}
            />
            <Field
              label="التصنيف"
              icon="aiCategory"
              placeholder="التصنيف"
              local={local("category")}
            />
            <Field
              label="السيارة"
              icon="aiCar"
              placeholder="مثال: تويوتا 2018"
              local={local("car")}
            />
            <Field
              label="تفاصيل إضافية"
              icon="aiDetails"
              placeholder="التصنيف"
              className="st-wide"
              local={local("details")}
            />
          </div>
        </section>
        <button
          type="button"
          className="st-button st-ai-generate"
          disabled={busy || !api.canGenerate}
          onClick={generate}
        >
          توليد الوصف
        </button>
        {error && <p role="alert">{error}</p>}
        <label className="st-ai-result">
          <b>الوصف المقترح</b>
          <textarea
            aria-label="الوصف المقترح"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
      </Panel>
      <Panel className="st-ai-permissions">
        <h2>صلاحيات الذكاء الاصطناعي</h2>
        <p className="st-ai-policy">
          تفعيل الصلاحية يسمح للذكاء الاصطناعي بتنفيذ المهمة وفق سياسة المنصة
        </p>
        <div className="st-grid two">
          {aiPermissions.map(([title, description, icon]) => (
            <section className="st-ai-permission" key={icon}>
              <Art name={icon} />
              <div>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
              <Switch label={title} />
            </section>
          ))}
        </div>
      </Panel>
      <Panel className="st-ai-messages">
        <h2>إعدادات الرسائل</h2>
        <p className="st-ai-policy">
          تفعيل الصلاحية يسمح للذكاء الاصطناعي بتنفيذ المهمة وفق سياسة المنصة
        </p>
        <div className="st-grid two">
          {["رسائل العملاء", "رسائل الموردين", "التنبيهات التلقائية"].map(
            (title) => (
              <section className="st-ai-permission" key={title}>
                <div>
                  <h3>{title}</h3>
                  <p>يسمح للذكاء الاصطناعي بإنشاء طلبات جديدة</p>
                </div>
                <Switch label={title} />
              </section>
            ),
          )}
        </div>
      </Panel>
    </div>
  );
}
const tabs = [
  ["pricing", "إعدادات التسعير"],
  ["cashback", "إعدادات كاش باك"],
  ["shipping", "إعدادات الشحن"],
  ["payments", "بوابة الدفع"],
  ["contact", "إدارة التواصل"],
  ["preparation", "وقت تجهيز الطلبات"],
  ["ai", "إعدادات الذكاء الاصطناعي"],
];
export default function SettingsPage({ onSessionExpired }) {
  const api = useSettingsController(),
    [unread, setUnread] = useState(null);
  const [tab, setTab] = useState("pricing"),
    [contactTab, setContactTab] = useState("messages");
  const tabLabel =
    tab === "pricing" || tab === "cashback"
      ? "التسعير"
      : tab === "ai"
        ? "الذكاء الاصطناعي"
        : tab === "shipping"
          ? "الشحن"
          : "الدفع";
  const save = () => api.save();
  return (
    <SettingsContext.Provider value={api}>
      <div className={"st-page st-page-" + tab}>
        <div className="st-toolbar">
          <h1>الإعدادات</h1>
          <button
            className="st-button"
            disabled={api.busy || api.loading || (!api.canEdit && !api.pending)}
            onClick={save}
          >
            {api.pending ? "إعادة التحقق" : "حفظ جميع الإعدادات"}
          </button>
        </div>
        {api.loading && <p role="status">جارٍ تحميل الإعدادات…</p>}
        {(api.error || api.writeError) && (
          <p role="alert">
            {(api.error || api.writeError).message}{" "}
            <button onClick={() => (api.pending ? api.save() : api.reload())}>
              إعادة المحاولة
            </button>
            {(api.error || api.writeError).status === 401 && (
              <button onClick={onSessionExpired}>تسجيل الدخول</button>
            )}
          </p>
        )}
        {api.message && <p role="status">{api.message}</p>}
        <div className="st-tabs" role="tablist" aria-label="الإعدادات">
          {tabs.map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={(event) => {
                setTab(id);
                event.currentTarget.scrollIntoView({
                  block: "nearest",
                  inline: "nearest",
                });
              }}
            >
              {tab !== id && ["ai", "cashback"].includes(id) ? (
                id === "ai" ? (
                  <BrainCircuit size={23} strokeWidth={1.6} />
                ) : (
                  <CircleDollarSign size={23} strokeWidth={1.6} />
                )
              ) : (
                <Art name={id + (tab === id ? "TabActive" : "Tab")} />
              )}
              {["pricing", "cashback"].includes(tab) && id === "pricing"
                ? "إعدادات الأرباح"
                : label}
            </button>
          ))}
        </div>
        <div hidden={tab !== "pricing"}>
          <SettingsScope.Provider value="pricing">
            <PricingSettings />
          </SettingsScope.Provider>
        </div>
        <div hidden={tab !== "cashback"}>
          <SettingsScope.Provider value="cashback">
            <CashbackSettings />
          </SettingsScope.Provider>
        </div>
        <div hidden={tab !== "preparation"}>
          <SettingsScope.Provider value="preparation">
            <PreparationSettings />
          </SettingsScope.Provider>
        </div>
        <div hidden={tab !== "ai"}>
          <SettingsScope.Provider value="ai">
            <AiSettings />
          </SettingsScope.Provider>
        </div>
        <div hidden={tab !== "shipping"}>
          <SettingsScope.Provider value="shipping">
            <ShippingSettings />
          </SettingsScope.Provider>
        </div>
        <div hidden={tab !== "payments"}>
          <SettingsScope.Provider value="payments">
            <PaymentSettings />
          </SettingsScope.Provider>
        </div>
        <div hidden={tab !== "contact"}>
          <Panel className={"st-contact st-contact-" + contactTab}>
            <div
              className="st-contact-tabs"
              role="tablist"
              aria-label="إدارة التواصل"
            >
              <button
                role="tab"
                aria-selected={contactTab === "messages"}
                onClick={() => setContactTab("messages")}
              >
                <MessageSquare size={23} />
                الرسائل الواردة <b>{unread ?? "—"}</b>
              </button>
              <button
                role="tab"
                aria-selected={contactTab === "settings"}
                onClick={() => setContactTab("settings")}
              >
                <Settings size={23} />
                إعدادات التواصل
              </button>
            </div>
            <div hidden={contactTab !== "messages"}>
              <SettingsMessages
                active={tab === "contact" && contactTab === "messages"}
                onCount={setUnread}
                onSessionExpired={onSessionExpired}
              />
            </div>
            <div hidden={contactTab !== "settings"}>
              <SettingsScope.Provider value="contact">
                <ContactSettings />
              </SettingsScope.Provider>
            </div>
          </Panel>
        </div>
        <div className="st-bottom">
          <b>
            آخر تعديل:{" "}
            {api.updated
              ? new Date(api.updated).toLocaleString("ar-EG", {
                  timeZone: "Asia/Riyadh",
                })
              : "—"}
          </b>
          <button
            className="st-button"
            disabled={api.busy || api.loading || (!api.canEdit && !api.pending)}
            onClick={() => api.save(tab)}
          >
            {api.pending ? "إعادة التحقق" : "حفظ إعدادات " + tabLabel}
          </button>
        </div>
      </div>
    </SettingsContext.Provider>
  );
}
