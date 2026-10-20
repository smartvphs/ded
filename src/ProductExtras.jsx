import React, { useEffect, useRef, useState } from "react";
import { Plus, Trash2, Star, Sparkles } from "lucide-react";
import { Panel, Input, Money, Toggle } from "./products-ui";
import { adminRequest, queryString } from "./admin-api";
import { qualityTierOptions } from "./product-editor-model";
import useAdminResource from "./use-admin-resource";
export function State({ resource }) {
  return resource.error ? (
    <p role="alert">
      {resource.error.message}{" "}
      <button onClick={resource.reload}>إعادة المحاولة</button>
    </p>
  ) : resource.loading ? (
    <p role="status">جارٍ التحميل…</p>
  ) : null;
}
export function useMutation() {
  const lock = useRef(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  async function run(fn) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
      return true;
    } catch (e) {
      setError(
        e.message +
          (e.validationErrors?.length
            ? " " + e.validationErrors.map((x) => x.message).join("، ")
            : ""),
      );
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return { busy, error, notice, setNotice, run };
}
export function Feedback({ mutation }) {
  return (
    <>
      {mutation.error && <p role="alert">{mutation.error}</p>}
      {mutation.notice && <p role="status">{mutation.notice}</p>}
    </>
  );
}
export function RelatedProducts({ id, onSaved }) {
  const data = useAdminResource(
      id ? "/api/products/admin/" + encodeURIComponent(id) + "/related" : null,
    ),
    [items, setItems] = useState([]),
    [search, setSearch] = useState(""),
    [query, setQuery] = useState("");
  const mutation = useMutation();
  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => {
    if (data.data) {
      if (!Array.isArray(data.data.data?.items)) return;
      setItems(data.data.data.items);
    }
  }, [data.data]);
  const results = useAdminResource(
    id && query
      ? "/api/products/admin?" +
          queryString({
            search: query,
            status: "published",
            limit: 20,
            offset: 0,
          })
      : null,
  );
  const suggestions = Array.isArray(data.data?.data?.suggestions)
    ? data.data.data.suggestions
    : [];
  const add = (row) => {
    if (
      row.id !== id &&
      !items.some((x) => x.id === row.id) &&
      items.length < 50
    )
      setItems([...items, row]);
  };
  async function save() {
    await mutation.run(async () => {
      const response = await adminRequest(
        "/api/products/admin/" + encodeURIComponent(id) + "/related",
        { method: "PUT", body: { productIds: items.map((x) => x.id) } },
      );
      if (!Array.isArray(response.data?.items))
        throw new Error(
          "تعذر تأكيد قائمة المنتجات المرتبطة. أعد تحميلها للتحقق.",
        );
      setItems(response.data.items);
      data.reload();
      mutation.setNotice("تم حفظ المنتجات المرتبطة على الخادم.");
      onSaved?.();
    });
  }
  const row = (x, remove) => (
    <div key={x.id} className="pp-compatible-car">
      {x.thumbnail && <img src={x.thumbnail} alt="" width="44" height="44" />}
      <b>{x.name}</b>
      <Money>{x.discountPrice ?? x.discount_price ?? x.price}</Money>
      <button
        className={remove ? "pp-remove" : "pp-button pp-small-button"}
        disabled={mutation.busy}
        aria-label={(remove ? "إزالة ارتباط " : "ربط ") + x.name}
        onClick={() =>
          remove ? setItems(items.filter((p) => p.id !== x.id)) : add(x)
        }
      >
        {remove ? <Trash2 size={16} /> : <Plus size={16} />}
      </button>
    </div>
  );
  if (!id)
    return (
      <Panel title="المنتجات المرتبطة">
        <p>احفظ المنتج أولًا لإضافة المنتجات المرتبطة.</p>
      </Panel>
    );
  return (
    <>
      <Panel title="المنتجات المرتبطة" className="pp-related">
        <State resource={data} />
        <Feedback mutation={mutation} />
        {items.map((x) => row(x, true))}
        {!data.loading && !items.length && <p>لا توجد منتجات مرتبطة.</p>}
        <Input
          label="البحث عن منتج مرتبط"
          aria-label="البحث عن منتج مرتبط"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <State resource={results} />
        {(Array.isArray(results.data?.data) ? results.data.data : [])
          .filter((x) => x.id !== id && !items.some((p) => p.id === x.id))
          .map((x) => row(x, false))}
        <button
          className="pp-button"
          disabled={mutation.busy || data.loading || Boolean(data.error)}
          onClick={save}
        >
          حفظ المنتجات المرتبطة
        </button>
      </Panel>
      <Panel title="مقترحات من نفس الفئة" className="pp-suggestions">
        {suggestions
          .filter((x) => !items.some((p) => p.id === x.id))
          .map((x) => row(x, false))}
      </Panel>
    </>
  );
}
export function ProductReviews({ id, onSaved }) {
  const [page, setPage] = useState(0),
    [order, setOrder] = useState(""),
    [rating, setRating] = useState(5),
    [comment, setComment] = useState("");
  const mutation = useMutation();
  const data = useAdminResource(
    id
      ? "/api/reviews/admin?" +
          queryString({ productId: id, limit: 20, offset: page * 20 })
      : null,
  );
  const rows = Array.isArray(data.data?.data) ? data.data.data : [],
    meta = data.data?.meta || {};
  async function create(e) {
    e.preventDefault();
    if (!id) return;
    const ok = await mutation.run(async () => {
      if (!order.trim() || !comment.trim())
        throw new Error("أدخل رقم طلب شراء المنتج والتعليق.");
      await adminRequest("/api/reviews/admin", {
        method: "POST",
        body: {
          productId: id,
          orderNumber: order.trim(),
          rating: Number(rating),
          comment: comment.trim(),
        },
      });
      mutation.setNotice("تم حفظ التقييم للعميل صاحب الطلب.");
      setPage(0);
      data.reload();
      onSaved?.();
    });
    if (ok) {
      setOrder("");
      setComment("");
    }
  }
  async function change(row, remove) {
    if (remove && !window.confirm("حذف التقييم نهائيًا؟")) return;
    await mutation.run(async () => {
      await adminRequest(
        "/api/reviews/admin/" +
          encodeURIComponent(row.id) +
          (remove ? "" : "/status"),
        {
          method: remove ? "DELETE" : "PATCH",
          ...(!remove
            ? {
                body: {
                  status: row.status === "hidden" ? "published" : "hidden",
                },
              }
            : {}),
        },
      );
      data.reload();
      onSaved?.();
    });
  }
  return (
    <>
      <Panel title="إحصائيات التقييمات" className="pp-review-stats">
        <div className="pp-review-counts">
          <div>
            <b>{meta.averageRating ?? "—"}</b>
            <span>متوسط التقييم</span>
          </div>
          <div>
            <b>{meta.total ?? "—"}</b>
            <span>إجمالي التقييمات</span>
          </div>
        </div>
        {[5, 4, 3, 2, 1].map((n) => (
          <div className="pp-rating-bars" key={n}>
            {n} ★ · {meta.ratingCounts?.[n] ?? "—"}
          </div>
        ))}
      </Panel>
      <Panel title="إضافة تقييم جديد" className="pp-add-review">
        <Feedback mutation={mutation} />
        {!id ? (
          <p>احفظ المنتج أولًا.</p>
        ) : (
          <form onSubmit={create}>
            <Input
              label="رقم الطلب*"
              aria-label="رقم الطلب*"
              value={order}
              onChange={(e) => setOrder(e.target.value)}
              required
            />
            <p>اسم العميل يؤخذ من طلب شراء يحتوي على هذا المنتج.</p>
            <label className="pp-field">
              <span>التقييم*</span>
              <select
                aria-label="التقييم*"
                value={rating}
                onChange={(e) => setRating(e.target.value)}
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} ★
                  </option>
                ))}
              </select>
            </label>
            <label className="pp-review-text">
              <span>نص التقييم*</span>
              <textarea
                aria-label="نص التقييم*"
                maxLength={1000}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                required
              />
            </label>
            <button className="pp-button" disabled={mutation.busy}>
              إضافة التقييم
            </button>
          </form>
        )}
      </Panel>
      <Panel title="التقييمات" className="pp-reviews">
        <State resource={data} />
        {rows.map((x) => (
          <article key={x.id}>
            <div className="pp-review-head">
              <b>{x.reviewer_name}</b>
              <span>{x.rating} ★</span>
              <button disabled={mutation.busy} onClick={() => change(x, false)}>
                {x.status === "hidden" ? "إظهار" : "إخفاء"}
              </button>
              <button
                className="pp-remove"
                disabled={mutation.busy}
                aria-label={"حذف تقييم " + x.reviewer_name}
                onClick={() => change(x, true)}
              >
                <Trash2 size={18} />
              </button>
            </div>
            <p>{x.comment}</p>
          </article>
        ))}
        {!data.loading && !rows.length && (
          <p>لا توجد تقييمات مسجلة لهذا المنتج.</p>
        )}
        <button
          disabled={!page || mutation.busy}
          onClick={() => setPage(page - 1)}
        >
          السابق
        </button>
        <button
          disabled={
            mutation.busy ||
            (meta.total != null
              ? (page + 1) * 20 >= meta.total
              : rows.length < 20)
          }
          onClick={() => setPage(page + 1)}
        >
          التالي
        </button>
      </Panel>
    </>
  );
}
export function GenerateDescription({ id, draft, group, onGenerated }) {
  const mutation = useMutation();
  async function generate() {
    await mutation.run(async () => {
      const result = await adminRequest(
        "/api/products/admin/generate-description",
        {
          method: "POST",
          body: {
            ...(id ? { productId: id } : {}),
            name: draft.name,
            nameEn: draft.nameEn,
            partType: {
              parts: "part",
              oil: "oil",
              tires: "tire",
              accessories: "accessory",
            }[group],
            partNumber: draft.partNumber,
            condition: draft.condition,
            countryOfOrigin: draft.countryOfOrigin,
            specifications: draft.specifications.map(
              (s) => s.specName + ": " + s.specValue,
            ),
          },
        },
      );
      if (typeof result.data?.description !== "string")
        throw new Error("لم يُرجع الخادم وصفًا صالحًا.");
      onGenerated(result.data.description);
      mutation.setNotice("تم توليد الوصف؛ راجعه قبل حفظ المنتج.");
    });
  }
  return (
    <div>
      <button
        className="pp-button pp-small-button"
        disabled={mutation.busy || !draft.name.trim()}
        onClick={generate}
      >
        <Sparkles size={14} />
        {mutation.busy ? "جارٍ التوليد…" : "توليد"}
      </button>
      <Feedback mutation={mutation} />
    </div>
  );
}
function numberValue(value, label, optional = false) {
  if (optional && value === "") return null;
  const n = Number(value);
  if (value === "" || !Number.isFinite(n) || n < 0)
    throw new Error("أدخل " + label + " صحيحًا.");
  return n;
}
function PriceForm({
  row = {},
  quality = false,
  onSubmit,
  onDelete,
  tiers = [],
  busy,
}) {
  const [d, setD] = useState(() => ({
    label: row.variant_label ?? row.variantLabel ?? "",
    tier: row.qualityTier ?? row.quality_tier ?? "",
    price: String(row.price ?? ""),
    cost: String(row.costPrice ?? row.cost_price ?? ""),
    discount: String(row.discountPrice ?? row.discount_price ?? ""),
    stock: String(row.stockQuantity ?? row.stock_quantity ?? 0),
    active: row.isActive ?? row.is_active ?? true,
    sku: row.sku || "",
    sortOrder: row.sortOrder ?? row.sort_order ?? 0,
  }));
  const set = (k, v) => setD((x) => ({ ...x, [k]: v }));
  return (
    <form
      className="pp-quality-price"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(d);
      }}
    >
      {quality ? (
        <label className="pp-field">
          <span>الجودة</span>
          <select
            aria-label="جودة إضافية"
            value={d.tier}
            onChange={(e) => set("tier", e.target.value)}
            required
          >
            <option value="">اختر الجودة</option>
            {tiers.map((x) => (
              <option key={x.code ?? x.id} value={x.code ?? x.id}>
                {x.nameAr ?? x.name_ar ?? x.name ?? x.code ?? x.id}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <Input
          label="حجم العبوة"
          aria-label="حجم العبوة"
          value={d.label}
          required
          onChange={(e) => set("label", e.target.value)}
        />
      )}
      <div className="pp-form-grid three">
        {[
          ["price", "سعر البيع"],
          ...(quality ? [["cost", "سعر التكلفة"]] : []),
          ["discount", "سعر الخصم"],
          ["stock", "كمية المخزون"],
        ].map(([k, label]) => (
          <Input
            key={k}
            label={label}
            aria-label={label}
            type="number"
            step={k === "stock" ? "1" : "any"}
            min="0"
            value={d[k]}
            onChange={(e) => set(k, e.target.value)}
            required={k === "price" || k === "stock"}
          />
        ))}
        {!quality && (
          <>
            <Input
              label="SKU العبوة"
              value={d.sku}
              onChange={(e) => set("sku", e.target.value)}
            />
            <Input
              label="ترتيب العرض"
              type="number"
              value={d.sortOrder}
              onChange={(e) => set("sortOrder", e.target.value)}
            />
          </>
        )}
      </div>
      <Toggle
        label="متاح للبيع"
        checked={d.active}
        onChange={(v) => set("active", v)}
      />
      <button
        className="pp-button pp-small-button"
        disabled={busy}
        type="submit"
      >
        {row.id ? "حفظ التعديلات" : quality ? "إضافة جودة" : "إضافة عبوة"}
      </button>
      {onDelete && (
        <button
          type="button"
          className="pp-remove"
          disabled={busy}
          aria-label={quality ? "حذف الجودة" : "حذف العبوة"}
          onClick={onDelete}
        >
          <Trash2 size={16} />
        </button>
      )}
    </form>
  );
}
const EMPTY_VARIANTS = [];
export function ProductPrices({
  id,
  partNumber,
  variants = EMPTY_VARIANTS,
  onSaved,
}) {
  const [version, setVersion] = useState(0),
    [newBlocked, setNewBlocked] = useState(false);
  const qualities = useAdminResource(
    id ? "/api/products/admin/" + encodeURIComponent(id) + "/qualities" : null,
    version,
  );
  const mutation = useMutation();
  useEffect(() => {
    setVersion((v) => v + 1);
  }, [partNumber]);
  const tiers = qualityTierOptions.map((x) => ({ code: x.id, name: x.name }));
  const qrows = Array.isArray(qualities.data?.data) ? qualities.data.data : [];
  const [packs, setPacks] = useState(variants);
  useEffect(() => setPacks(variants), [variants]);
  async function refresh() {
    const result = await adminRequest(
      "/api/products/admin/" + encodeURIComponent(id),
    );
    if (result.data?.id !== id || !Array.isArray(result.data.variants))
      throw new Error("تعذر تأكيد بيانات الأسعار المحفوظة. أعد تحميلها.");
    setPacks(result.data.variants);
    setVersion((v) => v + 1);
    setNewBlocked(false);
    onSaved?.();
  }
  async function persist(d, row, quality) {
    await mutation.run(async () => {
      if (!row && newBlocked)
        throw new Error("أعد تحميل الأسعار لتأكيد نتيجة الإضافة السابقة.");
      const price = numberValue(d.price, "السعر"),
        discountPrice = numberValue(d.discount, "الخصم", true),
        stockQuantity = numberValue(d.stock, "المخزون");
      if (!Number.isSafeInteger(stockQuantity))
        throw new Error("أدخل كمية مخزون صحيحة.");
      if (discountPrice !== null && discountPrice > price)
        throw new Error("الخصم أكبر من سعر البيع.");
      const body = {
        price,
        discountPrice,
        stockQuantity,
        ...(quality
          ? {
              qualityTier: d.tier,
              costPrice: numberValue(d.cost, "التكلفة", true),
            }
          : {
              variantLabel: d.label.trim(),
              sku: d.sku || null,
              sortOrder: Number(d.sortOrder),
              isActive: d.active,
            }),
      };
      if (quality && !row) body.isActive = d.active;
      if (!row)
        for (const key of ["discountPrice", "costPrice", "sku"])
          if (body[key] === null) delete body[key];
      const path = quality
        ? row
          ? "/api/products/admin/" + encodeURIComponent(row.id)
          : "/api/products/admin/" + encodeURIComponent(id) + "/qualities"
        : "/api/products/admin/" +
          encodeURIComponent(id) +
          "/variants" +
          (row ? "/" + encodeURIComponent(row.id) : "");
      let result;
      try {
        result = await adminRequest(path, {
          method: row ? "PUT" : "POST",
          body,
        });
        if (!row) setNewBlocked(true);
      } catch (e) {
        if (!row && (!e.status || e.status >= 500)) setNewBlocked(true);
        throw e;
      }
      if (quality && row) {
        try {
          await adminRequest(
            "/api/products/admin/" + encodeURIComponent(row.id) + "/status",
            { method: "PATCH", body: { isActive: d.active } },
          );
        } catch (e) {
          throw new Error(
            "تم حفظ أسعار الجودة لكن لم يكتمل تحديث إتاحتها للبيع. أعد المحاولة. " +
              e.message,
          );
        }
      }
      if (!row && !result.data?.id)
        throw new Error(
          "تعذر تأكيد الإضافة. أعد تحميل القائمة قبل المحاولة مجددًا.",
        );
      await refresh();
      mutation.setNotice("تم حفظ الأسعار على الخادم.");
    });
  }
  if (!id)
    return (
      <Panel title="الجودات والعبوات">
        <p>احفظ المنتج أولًا لإضافة الجودات والعبوات.</p>
      </Panel>
    );
  return (
    <>
      <Panel title="الجودات الأخرى" className="pp-qualities">
        <State resource={qualities} />
        <Feedback mutation={mutation} />
        {newBlocked && (
          <p role="alert">
            تحقق من القائمة قبل إضافة أخرى.{" "}
            <button
              disabled={mutation.busy}
              onClick={() => mutation.run(refresh)}
            >
              إعادة تحميل الأسعار
            </button>
          </p>
        )}
        {qrows
          .filter((x) => !(x.isCurrent ?? x.is_current) && x.id !== id)
          .map((x) => (
            <PriceForm
              key={x.id + version}
              row={x}
              quality
              tiers={
                tiers.some(
                  (t) => (t.code ?? t.id) === (x.qualityTier ?? x.quality_tier),
                )
                  ? tiers
                  : [
                      ...tiers,
                      {
                        code: x.qualityTier ?? x.quality_tier,
                        name: x.qualityName ?? x.quality_name,
                      },
                    ]
              }
              busy={mutation.busy}
              onSubmit={(d) => persist(d, x, true)}
              onDelete={() => {
                if (window.confirm("حذف هذه الجودة من الكتالوج؟"))
                  mutation.run(async () => {
                    await adminRequest(
                      "/api/products/admin/" + encodeURIComponent(x.id),
                      { method: "DELETE" },
                    );
                    await refresh();
                  });
              }}
            />
          ))}
        {partNumber ? (
          <>
            <PriceForm
              key={"new-quality" + version}
              quality
              tiers={tiers}
              busy={mutation.busy || newBlocked}
              onSubmit={(d) => persist(d, null, true)}
            />
          </>
        ) : (
          <p>احفظ رقم القطعة أولًا لإضافة جودة أخرى.</p>
        )}
      </Panel>
      <Panel title="أحجام العبوات وأسعارها">
        {packs.map((x) => (
          <PriceForm
            key={x.id + version}
            row={x}
            busy={mutation.busy}
            onSubmit={(d) => persist(d, x, false)}
            onDelete={() => {
              if (window.confirm("حذف هذه العبوة؟"))
                mutation.run(async () => {
                  await adminRequest(
                    "/api/products/admin/" +
                      encodeURIComponent(id) +
                      "/variants/" +
                      encodeURIComponent(x.id),
                    { method: "DELETE" },
                  );
                  await refresh();
                });
            }}
          />
        ))}
        <PriceForm
          key={"new-pack" + version}
          busy={mutation.busy || newBlocked}
          onSubmit={(d) => persist(d, null, false)}
        />
      </Panel>
    </>
  );
}
export function LatestPricings({ id }) {
  const data = useAdminResource(
    id ? "/api/products/admin/" + encodeURIComponent(id) + "/pricings" : null,
  );
  return (
    <Panel title="آخر التسعيرات" className="pp-quotes">
      <State resource={data} />
      {(Array.isArray(data.data?.data) ? data.data.data : []).map((x, i) => (
        <div className="pp-quote" key={i}>
          <b>{x.supplierName}</b>
          <Money>{x.price}</Money>
          <small>
            {x.pricedAt ? new Date(x.pricedAt).toLocaleDateString("ar-EG") : ""}
          </small>
          <span>{x.qualityName}</span>
        </div>
      ))}
      {!data.loading && !data.error && !data.data?.data?.length && (
        <p>لا توجد تسعيرات مسجلة.</p>
      )}
    </Panel>
  );
}
