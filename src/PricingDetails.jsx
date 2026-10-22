import React, { useEffect, useState, lazy, Suspense } from "react";
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  ListOrdered,
  FileText,
  Car,
  CalendarDays,
  Package,
  Tags,
  Edit3,
  RefreshCw,
} from "lucide-react";
import { adminRequest } from "./admin-api";
import useAdminResource from "./use-admin-resource";
import { useMutation, Feedback } from "./ProductExtras";
import { ResourceState, dateText, Money } from "./orders-ui";
import ProductPicture from "./ProductPicture";
import {
  PricingBadge,
  PricingCountdown,
  PricingDialog,
  PricingField,
} from "./pricing-ui";
import { pricingTypes } from "./pricing-api";
import PricingQuoteModal from "./PricingQuoteModal";
import PricingLinkProduct from "./PricingLinkProduct";
const ProductEditor = lazy(() => import("./ProductEditor"));
const groups = {
  part: "parts",
  oil: "oil",
  tire: "tires",
  accessory: "accessories",
};
const display = (input) =>
  input === null || input === undefined || input === ""
    ? "—"
    : typeof input === "boolean"
      ? input
        ? "نعم"
        : "لا"
      : Array.isArray(input)
        ? input.map(display).join("، ")
        : typeof input === "object"
          ? input.name || input.label || input.code || "—"
          : String(input);
const attributeLabels = {
  oil_type: "نوع الزيت",
  oilType: "نوع الزيت",
  viscosity: "اللزوجة",
  pack_size: "حجم العبوة",
  packSize: "حجم العبوة",
  width: "العرض",
  aspectRatio: "ارتفاع الإطار",
  rimSize: "مقاس الجنط",
  preferredOrigin: "المنشأ المفضل",
  warrantyRequired: "الضمان مطلوب",
  acceptableCondition: "الحالة المطلوبة",
  productionYear: "سنة الإنتاج",
  productionWeek: "أسبوع الإنتاج",
};
export default function PricingDetails({
  id,
  onBack,
  backLabel="طلبات التسعير",
  onChanged,
  onSessionExpired,
}) {
  const resource = useAdminResource(
    "/api/pricing-requests/admin/" + encodeURIComponent(id),
  );
  const [data, setData] = useState(null),
    [expanded, setExpanded] = useState({}),
    [quote, setQuote] = useState(null),
    [link, setLink] = useState(null),
    [creatingPart, setCreatingPart] = useState(null),
    [createdLink, setCreatedLink] = useState(null),
    [cancel, setCancel] = useState(false),
    [reason, setReason] = useState(""),
    [uncertainSend, setUncertainSend] = useState(false);
  const mutation = useMutation();
  useEffect(() => {
    if (
      resource.data?.data?.id === id &&
      Array.isArray(resource.data.data.parts)
    )
      setData(resource.data.data);
  }, [resource.data, id]);
  async function refresh() {
    const result = await adminRequest(
      "/api/pricing-requests/admin/" + encodeURIComponent(id),
    );
    if (result.data?.id !== id || !Array.isArray(result.data.parts))
      throw new Error("تعذر تأكيد تفاصيل الطلب. حدّث الطلب قبل تكرار الإجراء.");
    setData(result.data);
    onChanged?.();
    return result.data;
  }
  const parts = Array.isArray(data?.parts) ? data.parts : [],
    terminal = ["cancelled", "closed", "expired"].includes(data?.status),
    linked = parts.filter((part) => part.matched_product_id).length,
    priced = data?.pricedCount ?? parts.filter((part) => part.is_priced).length,
    ready = data?.isReady ?? (parts.length > 0 && linked === parts.length);
  async function send() {
    if (uncertainSend) return;
    await mutation.run(async () => {
      if (!ready)
        throw new Error("اربط كل القطع بمنتجات قبل إرسالها للموردين.");
      try {
        await adminRequest(
          "/api/pricing-requests/admin/" +
            encodeURIComponent(id) +
            "/send-to-suppliers",
          { method: "POST" },
        );
        await refresh();
        mutation.setNotice("تم إرسال طلب التسعير للموردين.");
      } catch (e) {
        if (!e.status || e.status >= 500) {
          setUncertainSend(true);
          throw new Error(
            e.message +
              " حدّث تفاصيل الطلب للتحقق من نتيجة الإرسال قبل المحاولة مجددًا.",
          );
        }
        throw e;
      }
    });
  }
  async function cancelRequest(event) {
    event.preventDefault();
    await mutation.run(async () => {
      const text = reason.trim();
      if (text && (text.length < 3 || text.length > 500))
        throw new Error("سبب الإلغاء من 3 إلى 500 حرف.");
      const result = await adminRequest(
        "/api/pricing-requests/admin/" + encodeURIComponent(id) + "/cancel",
        { method: "POST", body: text ? { reason: text } : {} },
      );
      setCancel(false);
      await refresh();
      mutation.setNotice(
        result.data?.refundRequired
          ? "تم إلغاء الطلب. رد الرسوم مطلوب ولم يُنفّذ تلقائيًا."
          : "تم إلغاء الطلب.",
      );
    });
  }
  async function linkCreated(record) {
    await mutation.run(async () => {
      await adminRequest(
        "/api/pricing-requests/admin/" +
          encodeURIComponent(id) +
          "/parts/" +
          encodeURIComponent(record.partId) +
          "/link-product",
        { method: "PATCH", body: { productId: record.productId } },
      );
      await refresh();
      setCreatedLink(null);
      mutation.setNotice("تم إنشاء المنتج وربطه بالقطعة.");
    });
  }
  if (creatingPart)
    return (
      <Suspense fallback={<p role="status">جارٍ تحميل إضافة المنتج…</p>}>
        <ProductEditor
          group={groups[creatingPart.part_type]}
          product={{ id: creatingPart.id }}
          initialProduct={{
            name: creatingPart.part_name || "",
            description: creatingPart.description || "",
          }}
          mode="add"
          onBack={() => setCreatingPart(null)}
          onComplete={({ id: productId }) => {
            const record = { partId: creatingPart.id, productId };
            setCreatingPart(null);
            setCreatedLink(record);
            linkCreated(record);
          }}
        />
      </Suspense>
    );
  return (
    <div className="pricing-details">
      <div className="pricing-heading">
        <h1>تفاصيل الطلب</h1>
        <div className="pricing-detail-actions">
          <button
            className="pricing-back"
            disabled={mutation.busy}
            onClick={() =>
              mutation.run(async () => {
                await refresh();
                setUncertainSend(false);
                mutation.setNotice("تم تحديث بيانات الطلب.");
              })
            }
          >
            <RefreshCw size={15} />
            تحديث
          </button>
          <button
            className="pricing-back"
            disabled={mutation.busy}
            onClick={onBack}
          >
            <ArrowRight size={17} />
            {backLabel}
          </button>
        </div>
      </div>
      <ResourceState
        resource={
          resource.data &&
          (resource.data.data?.id !== id ||
            !Array.isArray(resource.data.data?.parts))
            ? {
                ...resource,
                error: new Error("رد تفاصيل طلب التسعير غير صالح."),
              }
            : resource
        }
        onLogin={onSessionExpired}
      />
      <div className="pricing-api-notice">
        <Feedback mutation={mutation} />
      </div>
      {createdLink && (
        <div className="pricing-api-notice" role="status">
          تم إنشاء المنتج؛ أكمل ربطه بالقطعة قبل إنشاء منتج آخر.
          <button
            className="pricing-primary"
            disabled={mutation.busy}
            onClick={() => linkCreated(createdLink)}
          >
            ربط المنتج الذي تم إنشاؤه
          </button>
        </div>
      )}
      {data && (
        <>
          <section className="pricing-customer-card">
            <div className="request-banner">
              <div>
                <h2 dir="ltr">{data.request_number || "—"}</h2>
                <span>{dateText(data.created_at)}</span>
              </div>
              <div className="request-banner-actions">
                {["pending_admin_review", "products_added"].includes(
                  data.status,
                ) &&
                  !data.is_internal && (
                    <button
                      className="pricing-primary"
                      disabled={mutation.busy || !ready || uncertainSend}
                      onClick={send}
                    >
                      إرسال التسعير للموردين
                    </button>
                  )}
                {data.offersViewed === true && (
                  <span className="customer-seen">
                    تمت مشاهدة التسعير من قبل العميل
                  </span>
                )}
                <span
                  className={
                    "pricing-badge " +
                    (data.pricing_type === "express" ? "red" : "blue")
                  }
                >
                  <i />
                  {pricingTypes[data.pricing_type] || data.pricing_type || "—"}
                </span>
                <PricingBadge status={data.status} label={data.status_label} />
              </div>
            </div>
            <div className="customer-content">
              <div className="request-client">
                <span className="pricing-client-avatar">
                  {data.customer_name?.[0] || "—"}
                </span>
                <div>
                  العميل {data.customer_name || "—"}
                  <small dir="ltr">{data.customer_phone || "—"}</small>
                  {data.customer_email && (
                    <small dir="ltr">{data.customer_email}</small>
                  )}
                </div>
              </div>
              <div className="request-meta">
                {[
                  [ListOrdered, "رقم الهيكل", data.vin],
                  [
                    FileText,
                    "الشركة المصنعة",
                    data.make_name_ar || data.make_name_en,
                  ],
                  [
                    Car,
                    "موديل السيارة",
                    data.model_name_ar || data.model_name_en,
                  ],
                  [CalendarDays, "سنة الصنع", data.year],
                  [Package, "عدد القطع", data.totalCount ?? parts.length],
                  [
                    Tags,
                    "الجودات المطلوبة",
                    data.requestedQualities?.length
                      ? data.requestedQualities.map(display).join("، ")
                      : null,
                  ],
                  [Car, "الفئة", data.trim],
                  [Package, "المحرك", data.engine],
                  [Car, "ناقل الحركة", data.transmission],
                  [
                    CoinsIcon,
                    "رسوم التسعير",
                    data.fees_amount != null ? (
                      <Money value={data.fees_amount} />
                    ) : null,
                  ],
                ].map(([Icon, label, input]) => (
                  <div key={label}>
                    <span className="meta-icon">
                      <Icon size={19} />
                    </span>
                    <div>
                      <span>{label}</span>
                      <b>
                        {React.isValidElement(input) ? input : display(input)}
                      </b>
                    </div>
                  </div>
                ))}
              </div>
              <PricingCountdown
                due={data.sla_due_at}
                created={data.sent_to_suppliers_at || data.created_at}
              />
            </div>
          </section>
          <section className="pricing-parts-card">
            <div className="parts-summary">
              <div>
                <h2>تسعير القطع</h2>
                <p>أسعار المورد وأسعار العميل والجودات المسجلة على الطلب.</p>
              </div>
              <div className="parts-progress">
                <div className="progress-track">
                  <i
                    style={{
                      width:
                        (parts.length
                          ? Math.min(100, (Number(priced) / parts.length) * 100)
                          : 0) + "%",
                    }}
                  />
                </div>
                <span>
                  {priced} / {parts.length} تم تسعيرها
                </span>
              </div>
            </div>
            {parts.map((part, index) => {
              const open = expanded[part.id] !== false,
                missing = !part.matched_product_id,
                offers = Array.isArray(part.offers) ? part.offers : [];
              return (
                <article
                  className={"request-part " + (missing ? "missing-part" : "")}
                  key={part.id}
                >
                  <div className="part-heading">
                    <button
                      className="part-toggle"
                      aria-expanded={open}
                      onClick={() =>
                        setExpanded((old) => ({ ...old, [part.id]: !open }))
                      }
                    >
                      <span className="part-thumb">
                        <ProductPicture
                          src={
                            typeof part.images?.[0] === "string"
                              ? part.images[0]
                              : part.images?.[0]?.image_url
                          }
                          alt=""
                        />
                      </span>
                      <span>
                        <b>
                          {part.part_name || part.matched_product_name || "—"}
                        </b>
                        {part.description && <small>{part.description}</small>}
                        <span className="part-tags">
                          <i>الكمية: {display(part.quantity)}</i>
                          {part.requested_quality_label && (
                            <i>{part.requested_quality_label}</i>
                          )}
                          {part.matched_product_name && (
                            <i>{part.matched_product_name}</i>
                          )}
                          {part.category_name_ar && (
                            <i>{part.category_name_ar}</i>
                          )}
                        </span>
                      </span>
                    </button>
                    <div className="part-status">
                      <span
                        className={
                          "pricing-badge " +
                          (missing
                            ? "red"
                            : part.is_priced
                              ? "green"
                              : "orange")
                        }
                      >
                        <i />
                        {missing
                          ? "المنتج يحتاج إضافة لقاعدة البيانات"
                          : part.is_priced
                            ? "تم التسعير"
                            : "في انتظار تسعير الموردين"}
                      </span>
                      {!terminal && (
                        <button
                          className="pricing-primary"
                          disabled={mutation.busy}
                          onClick={() => setLink(part)}
                        >
                          {missing ? "إضافة منتج" : "تغيير المنتج المرتبط"}
                        </button>
                      )}
                      <button
                        className="collapse-button"
                        aria-label={
                          (open ? "طي القطعة " : "فتح القطعة ") + (index + 1)
                        }
                        onClick={() =>
                          setExpanded((old) => ({ ...old, [part.id]: !open }))
                        }
                      >
                        {open ? (
                          <ChevronUp size={17} />
                        ) : (
                          <ChevronDown size={17} />
                        )}
                      </button>
                    </div>
                  </div>
                  {open && (
                    <div className="part-offers">
                      {part.description && <p>{part.description}</p>}
                      {(part.images?.length > 1 || part.videos?.length > 0) && (
                        <div className="pricing-part-media">
                          {(part.images || []).map((image, n) => (
                            <ProductPicture
                              src={
                                typeof image === "string"
                                  ? image
                                  : image.image_url
                              }
                              alt={"صورة القطعة " + (n + 1)}
                              key={n}
                            />
                          ))}
                          {(part.videos || []).map((video, n) => (
                            <video
                              key={n}
                              controls
                              preload="none"
                              src={
                                typeof video === "string" ? video : video.url
                              }
                            />
                          ))}
                        </div>
                      )}
                      {part.attributes &&
                        Object.keys(part.attributes).length > 0 && (
                          <dl className="pricing-part-attributes">
                            {Object.entries(part.attributes).map(
                              ([key, input]) => (
                                <div key={key}>
                                  <dt>{attributeLabels[key] || key}</dt>
                                  <dd>{display(input)}</dd>
                                </div>
                              ),
                            )}
                          </dl>
                        )}
                      {offers.map((offer) => {
                        const quotation = data.quotations?.find(
                            (row) => row.id === offer.quotationId,
                          ),
                          withdrawn =
                            !!quotation?.withdrawn_at ||
                            quotation?.state === "withdrawn";
                        return (
                          <div className="supplier-quote" key={offer.itemId}>
                            <div className="quote-supplier-head">
                              <div className="quote-supplier">
                                <span className="mini-logo violet">
                                  {offer.supplier?.logoUrl ? (
                                    <img src={offer.supplier.logoUrl} alt="" />
                                  ) : (
                                    offer.supplier?.name?.[0] || "—"
                                  )}
                                </span>
                                <div>
                                  <small>
                                    {offer.pricedByAdmin
                                      ? "تسعير بواسطة الأدمن"
                                      : "اسم المورد"}
                                  </small>
                                  <p>{offer.supplier?.name || "—"}</p>
                                  {offer.pricedByAdmin &&
                                    offer.createdByName && (
                                      <small>{offer.createdByName}</small>
                                    )}
                                </div>
                              </div>
                              {!terminal && !withdrawn && offer.itemId && (
                                <button
                                  className="quote-edit"
                                  disabled={mutation.busy}
                                  onClick={() => setQuote({ part, offer })}
                                >
                                  <Edit3 size={13} />
                                  تعديل الأسعار
                                </button>
                              )}
                            </div>
                            <div className="quote-values">
                              <div>
                                <span>الجودة</span>
                                <b className="quote-quality">
                                  {offer.qualityName ||
                                    offer.qualityTier ||
                                    "—"}
                                </b>
                              </div>
                              <div>
                                <span>سعر العميل</span>
                                <b>
                                  {offer.price != null ? (
                                    <Money value={offer.price} />
                                  ) : (
                                    "—"
                                  )}
                                </b>
                              </div>
                              <div>
                                <span>ملاحظة على المنتج</span>
                                <b>{offer.notes || "—"}</b>
                              </div>
                              <div>
                                <span>سعر المورد</span>
                                <b>
                                  {offer.supplierPrice != null ? (
                                    <Money value={offer.supplierPrice} />
                                  ) : (
                                    "—"
                                  )}
                                </b>
                              </div>
                              <div>
                                <span>الحالة</span>
                                <b>
                                  {withdrawn
                                    ? "مسحوب"
                                    : offer.isAccepted
                                      ? "مقبول من العميل"
                                      : offer.isAvailable === false
                                        ? "غير متوفر"
                                        : "عرض مسجل"}
                                </b>
                              </div>
                              {quotation?.delivery_days != null && (
                                <div>
                                  <span>مدة التوصيل بالأيام</span>
                                  <b>{quotation.delivery_days}</b>
                                </div>
                              )}
                              {offer.originalCustomerPrice != null && (
                                <div>
                                  <span>السعر الأصلي للعميل</span>
                                  <b>
                                    <Money
                                      value={offer.originalCustomerPrice}
                                    />
                                  </b>
                                </div>
                              )}
                              {offer.adminEditedByName && (
                                <div>
                                  <span>آخر تعديل بواسطة</span>
                                  <b>{offer.adminEditedByName}</b>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {!offers.length && (
                        <p className="part-waiting">
                          لا توجد عروض مسجلة لهذه القطعة.
                        </p>
                      )}
                      {!terminal && (
                        <button
                          className="pricing-primary add-price"
                          disabled={mutation.busy}
                          onClick={() => setQuote({ part })}
                        >
                          إضافة تسعير
                        </button>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
            {!parts.length && (
              <p className="pricing-empty">لا توجد قطع في الطلب.</p>
            )}
          </section>
          {data.timeline?.length > 0 && (
            <section className="pricing-parts-card pricing-timeline">
              <h2>مسار الطلب</h2>
              {data.timeline.map((step, i) => (
                <div key={i}>
                  <span>{step.label || "—"}</span>
                  <time>{dateText(step.at)}</time>
                </div>
              ))}
            </section>
          )}
          {!data.is_internal &&
            !["closed", "cancelled"].includes(data.status) && (
              <button
                className="pricing-back pricing-cancel-request"
                disabled={mutation.busy}
                onClick={() => {
                  setReason("");
                  setCancel(true);
                }}
              >
                إلغاء طلب التسعير
              </button>
            )}
        </>
      )}
      {quote && (
        <PricingQuoteModal
          requestId={id}
          part={quote.part}
          offer={quote.offer}
          onClose={() => setQuote(null)}
          onSaved={async () => {
            await refresh();
            mutation.setNotice(
              quote.offer ? "تم حفظ تعديل العرض." : "تم حفظ التسعير على الطلب.",
            );
          }}
          onSessionExpired={onSessionExpired}
        />
      )}
      {link && (
        <PricingLinkProduct
          requestId={id}
          part={link}
          onClose={() => setLink(null)}
          onSaved={async () => {
            await refresh();
            mutation.setNotice("تم ربط القطعة بالمنتج.");
          }}
          onCreate={
            groups[link.part_type]
              ? () => {
                  setCreatingPart(link);
                  setLink(null);
                }
              : null
          }
          onSessionExpired={onSessionExpired}
        />
      )}
      {cancel && (
        <PricingDialog
          title="إلغاء طلب التسعير"
          busy={mutation.busy}
          onClose={() => setCancel(false)}
        >
          <form onSubmit={cancelRequest}>
            <p>
              سيتم إلغاء الطلب دون حذف سجلاته. رد رسوم التسعير، إن لزم، لا يتم
              تلقائيًا.
            </p>
            <PricingField label="سبب الإلغاء (اختياري)">
              <textarea
                aria-label="سبب إلغاء التسعير"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
              />
            </PricingField>
            <Feedback mutation={mutation} />
            <div className="quote-modal-buttons">
              <button
                className="pricing-primary"
                type="submit"
                disabled={mutation.busy}
              >
                تأكيد الإلغاء
              </button>
              <button
                className="pricing-outline"
                type="button"
                disabled={mutation.busy}
                onClick={() => setCancel(false)}
              >
                رجوع
              </button>
            </div>
          </form>
        </PricingDialog>
      )}
    </div>
  );
}
function CoinsIcon(props) {
  return <Tags {...props} />;
}
