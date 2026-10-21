import React, { useState } from "react";
import { Package, Tag, Layers, Truck, Star, Info } from "lucide-react";
import ProductGallery from "./ProductGallery";
import ProductPicture from "./ProductPicture";
import { Money } from "./products-ui";
import { number } from "./dashboard-data";
const value = (input) =>
  input === null || input === undefined || input === "" ? "—" : String(input);
const yes = (input) => (input === true ? "نعم" : input === false ? "لا" : "—");
const date = (input) =>
  input && !Number.isNaN(Date.parse(input))
    ? new Intl.DateTimeFormat("ar-EG", {
        dateStyle: "medium",
        timeZone: "Asia/Riyadh",
      }).format(new Date(input))
    : "—";
const amount = (input) =>
  input === null ||
  input === undefined ||
  input === "" ||
  !Number.isFinite(Number(input)) ? (
    "—"
  ) : (
    <Money>{number(Number(input))}</Money>
  );
function Section({ title, icon: Icon = Info, children }) {
  return (
    <section className="pv-section">
      <h3>
        <Icon size={17} />
        {title}
      </h3>
      {children}
    </section>
  );
}
function Facts({ rows }) {
  return (
    <dl className="pv-facts">
      {rows.map(([label, input]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{input ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
export default function ProductPreview({ product: row }) {
  const [selected, setSelected] = useState("");
  const images = (row.images || [])
    .map((image) =>
      typeof image === "string" ? image : image.image_url || image.imageUrl,
    )
    .filter(Boolean);
  const specs = row.specifications || [],
    compatibility = row.compatibility || [],
    variants = row.variants || [],
    qualities = row.qualities || [];
  if (!images.length && row.thumbnail) images.push(row.thumbnail);
  const status =
    row.status === "deleted"
      ? "محذوف"
      : row.status === "published" || row.is_active === true
        ? "منشور"
        : "غير منشور";
  const tags = [...(row.aliases || [])],
    alternative = row.alt_part_numbers || [];
  const types = {
    part: "قطع غيار",
    oil: "زيوت",
    tire: "إطارات",
    accessory: "العناية والإكسسوارات",
    service: "خدمة",
    used_part: "قطع مستعملة",
  };
  const specLabels = {
    oil_type: "نوع الزيت",
    oil_viscosity: "اللزوجة",
    oil_pack_size: "حجم العبوة",
    tire_rim_size: "مقاس الجنط",
    tire_width: "عرض الإطار",
    tire_aspect_ratio: "ارتفاع الإطار",
    production_week: "أسبوع الإنتاج",
    production_year: "سنة الإنتاج",
    country_of_origin: "بلد الصنع",
    installation_type: "نوع التركيب",
    body_type: "نوع الهيكل",
    engine: "المحرك",
    transmission: "ناقل الحركة",
  };
  const conditions = { new: "جديد", used: "مستعمل", refurbished: "مجدد" };
  return (
    <div className="pv">
      <div className="pv-heading">
        <div>
          <span className="pv-eyebrow">
            {types[row.part_type] || "بيانات المنتج"}
          </span>
          <h2>{value(row.name)}</h2>
          {row.name_en && <p dir="auto">{row.name_en}</p>}
        </div>
        <span className={"pv-status " + (status === "منشور" ? "active" : "")}>
          {status}
        </span>
      </div>
      <div className="pv-top">
        <div className="pv-gallery">
          <ProductGallery
            images={images}
            selected={selected}
            onSelect={setSelected}
          />
          {images.length > 1 && (
            <div className="pv-thumbs">
              {images.map((src, i) => (
                <button
                  type="button"
                  key={src + i}
                  aria-label={`معاينة صورة المنتج ${i + 1}`}
                  aria-pressed={(selected || images[0]) === src}
                  onClick={() => setSelected(src)}
                >
                  <ProductPicture src={src} alt={`صورة المنتج ${i + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="pv-overview">
          <div className="pv-price">
            <span>سعر البيع</span>
            <strong>{amount(row.discount_price ?? row.price)}</strong>
            {row.discount_price != null && <del>{amount(row.price)}</del>}
          </div>
          <div className="pv-metrics">
            {[
              ["المخزون", value(row.stock_quantity)],
              [
                "التقييم",
                row.rating != null ? `${value(row.rating)} / 5` : "—",
              ],
              ["عدد التقييمات", value(row.reviews_count)],
            ].map(([label, v]) => (
              <div key={label}>
                <b>{v}</b>
                <span>{label}</span>
              </div>
            ))}
          </div>
          <Facts
            rows={[
              ["رقم القطعة", value(row.part_number)],
              ["SKU", value(row.sku)],
              [
                "التصنيف الرئيسي",
                value(row.category_name_ar || row.category_name),
              ],
              [
                "التصنيف الفرعي",
                value(row.subcategory_name_ar || row.subcategory_name),
              ],
              ["الماركة", value(row.brand_name)],
              ["المورد", value(row.supplier_name)],
              [
                "الجودة",
                value(
                  row.quality_name ||
                    row.qualities?.find((q) => q.isCurrent || q.is_current)
                      ?.qualityName ||
                    row.quality_tier,
                ),
              ],
              [
                "حالة القطعة",
                conditions[row.condition] || value(row.condition),
              ],
            ]}
          />
        </div>
      </div>
      <div className="pv-section-grid">
        <Section title="الوصف والمعلومات" icon={Package}>
          <p className="pv-description" dir="auto">
            {value(row.description)}
          </p>
          {row.description_en && (
            <p className="pv-description" dir="auto">
              {row.description_en}
            </p>
          )}
          <Facts
            rows={[
              ["بلد الصنع", value(row.country_of_origin)],
              ["سنة الإنتاج", value(row.manufacture_year)],
            ]}
          />
          <div className="pv-tag-group">
            <span>أسماء ثانوية</span>
            <div>
              {tags.length
                ? tags.map((tag, i) => (
                    <span className="pv-chip" key={i}>
                      {tag}
                    </span>
                  ))
                : "—"}
            </div>
          </div>
          <div className="pv-tag-group">
            <span>أرقام القطع البديلة</span>
            <div>
              {alternative.length
                ? alternative.map((tag, i) => (
                    <span className="pv-chip" key={i}>
                      {tag}
                    </span>
                  ))
                : "—"}
            </div>
          </div>
        </Section>
        <Section title="الأسعار والشحن" icon={Truck}>
          <Facts
            rows={[
              ["سعر البيع الأساسي", amount(row.price)],
              [
                "سعر البيع بعد الخصم",
                row.discount_price != null ? amount(row.discount_price) : "—",
              ],
              ["سعر التكلفة", amount(row.cost_price)],
              ["عرض خاص", yes(row.is_special_offer)],
              ["شحن مجاني", yes(row.is_free_shipping)],
              [
                "نوع الشحن",
                row.is_bulky === true
                  ? "ثقيل"
                  : row.is_bulky === false
                    ? "خفيف"
                    : "—",
              ],
              ["انتهاء العرض", date(row.offer_ends_at)],
              ["تاريخ الإضافة", date(row.created_at)],
              ["آخر تحديث", date(row.updated_at)],
            ]}
          />
        </Section>
      </div>
      <Section title="المواصفات" icon={Tag}>
        {specs.length ? (
          <Facts
            rows={specs.map((s, i) => [
              (specLabels[s.spec_name ?? s.specName] ||
                value(s.spec_name ?? s.specName)) +
                " " +
                (specs.some(
                  (v, n) =>
                    n < i &&
                    (v.spec_name ?? v.specName) === (s.spec_name ?? s.specName),
                )
                  ? `(${i + 1})`
                  : ""),
              value(s.spec_value ?? s.specValue),
            ])}
          />
        ) : (
          <p className="pv-empty">لا توجد مواصفات مسجلة.</p>
        )}
      </Section>
      <Section title="التوافق مع السيارات" icon={Layers}>
        {row.is_universal ? (
          <p className="pv-empty">متوافق مع جميع السيارات.</p>
        ) : compatibility.length ? (
          <div className="pv-table-scroll">
            <table>
              <thead>
                <tr>
                  {[
                    "الشركة",
                    "السيارة",
                    "من سنة",
                    "إلى سنة",
                    "الفئة",
                    "المحرك",
                    "ناقل الحركة",
                  ].map((x) => (
                    <th key={x}>{x}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {compatibility.map((car, i) => (
                  <tr key={i}>
                    {[
                      car.make_name_ar ||
                        car.makeNameAr ||
                        car.make_name_en ||
                        car.makeNameEn,
                      car.model_name_ar ||
                        car.modelNameAr ||
                        car.model_name_en ||
                        car.modelNameEn,
                      car.year_from ?? car.yearFrom,
                      car.year_to ?? car.yearTo,
                      car.trim,
                      car.engine,
                      car.transmission,
                    ].map((cell, n) => (
                      <td key={n}>{value(cell)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="pv-empty">لا توجد سيارات متوافقة مسجلة.</p>
        )}
      </Section>
      <Section title="الجودات والأسعار" icon={Star}>
        {qualities.length ? (
          <div className="pv-table-scroll">
            <table>
              <thead>
                <tr>
                  {[
                    "الجودة",
                    "المورد",
                    "السعر",
                    "سعر الخصم",
                    "التكلفة",
                    "المخزون",
                    "الحالة",
                  ].map((x) => (
                    <th key={x}>{x}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {qualities.map((q, i) => (
                  <tr key={q.id || i}>
                    <td>
                      {value(
                        q.qualityName ||
                          q.quality_name ||
                          q.qualityTier ||
                          q.quality_tier,
                      )}
                      {(q.isCurrent || q.is_current) && (
                        <small className="pv-current">الحالية</small>
                      )}
                    </td>
                    <td>{value(q.supplierName || q.supplier_name)}</td>
                    <td>{amount(q.price)}</td>
                    <td>{amount(q.discountPrice ?? q.discount_price)}</td>
                    <td>{amount(q.costPrice ?? q.cost_price)}</td>
                    <td>{value(q.stockQuantity ?? q.stock_quantity)}</td>
                    <td>
                      {(q.isActive ?? q.is_active) == null
                        ? "—"
                        : (q.isActive ?? q.is_active)
                          ? "نشط"
                          : "غير نشط"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="pv-empty">لا توجد جودات إضافية مسجلة.</p>
        )}
      </Section>
      <Section title="العبوات والخيارات" icon={Package}>
        {variants.length ? (
          <div className="pv-table-scroll">
            <table>
              <thead>
                <tr>
                  {[
                    "العبوة",
                    "SKU",
                    "السعر",
                    "سعر الخصم",
                    "المخزون",
                    "الحالة",
                  ].map((x) => (
                    <th key={x}>{x}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {variants.map((v, i) => (
                  <tr key={v.id || i}>
                    <td>{value(v.variant_label || v.variantLabel)}</td>
                    <td>{value(v.sku)}</td>
                    <td>{amount(v.price)}</td>
                    <td>{amount(v.discount_price ?? v.discountPrice)}</td>
                    <td>{value(v.stock_quantity ?? v.stockQuantity)}</td>
                    <td>
                      {(v.is_active ?? v.isActive) == null
                        ? "—"
                        : (v.is_active ?? v.isActive)
                          ? "نشط"
                          : "غير نشط"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="pv-empty">لا توجد عبوات إضافية مسجلة.</p>
        )}
      </Section>
    </div>
  );
}
