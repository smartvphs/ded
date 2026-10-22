import React, { useEffect, useState } from "react";
import useAdminResource from "./use-admin-resource";
import { adminRequest, queryString } from "./admin-api";
import { ResourceState } from "./orders-ui";
import ProductPreview from "./ProductPreview";
import ProductPicture from "./ProductPicture";
import {
  SupplierIcon,
  SupplierPanel,
  SupplierStats,
  SupplierField,
  SupplierButton,
  SupplierBadge,
  SupplierMoney,
  SupplierTable,
  SupplierPager,
  SupplierModal,
  text,
} from "./supplier-ui";
const date = (value) =>
  value
    ? new Intl.DateTimeFormat("ar-EG", {
        dateStyle: "medium",
        timeZone: "Asia/Riyadh",
      }).format(new Date(value))
    : "—";
export default function SupplierOffers({ onSessionExpired }) {
  const [tab, setTab] = useState("files"),
    [detail, setDetail] = useState(null),
    [page, setPage] = useState(1),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [upload, setUpload] = useState(false),
    [preview, setPreview] = useState(null),
    [cancel, setCancel] = useState(null),
    [revision, setRevision] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const resource = useAdminResource(
    (tab === "files"
      ? "/api/suppliers/admin/price-lists?"
      : "/api/offers/admin?") +
      queryString({
        limit: tab === "files" ? 6 : 7,
        offset: (page - 1) * (tab === "files" ? 6 : 7),
        search,
        status,
      }),
    revision,
  );
  const product = useAdminResource(
    preview ? "/api/products/admin/" + encodeURIComponent(preview) : null,
  );
  useEffect(() => {
    const home = () => {
      setDetail(null);
      setPage(1);
      setTab("files");
      setStatus("");
      setSearch("");
    };
    const choose = (e) => {
      if (["files", "products"].includes(e.detail)) {
        setDetail(null);
        setPage(1);
        setTab(e.detail);
        setStatus("");
        setSearch("");
      }
    };
    window.addEventListener("mypart:offers-home", home);
    window.addEventListener("mypart:offers-tab", choose);
    return () => {
      window.removeEventListener("mypart:offers-home", home);
      window.removeEventListener("mypart:offers-tab", choose);
    };
  }, []);
  const rows = Array.isArray(resource.data?.data) ? resource.data.data : [];
  async function cancelOffer() {
    setBusy(true);
    setError("");
    try {
      const result = await adminRequest(
        "/api/offers/admin/" + encodeURIComponent(cancel.id) + "/cancel",
        { method: "PATCH" },
      );
      if (result.data?.id !== cancel.id || result.data?.status !== "cancelled")
        throw new Error("تعذر تأكيد إلغاء العرض. أعد تحميل القائمة.");
      setCancel(null);
      setRevision((n) => n + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (detail)
    return (
      <SupplierOfferDetail
        id={detail}
        onBack={() => {
          setDetail(null);
          setRevision((n) => n + 1);
        }}
        onSessionExpired={onSessionExpired}
      />
    );
  return (
    <div className="su-page">
      <div className="su-topline">
        <h1>{tab === "files" ? "عروض الأسعار" : "إدارة المنتجات"}</h1>
        {tab === "products" && (
          <div className="su-controls su-export-tools">
            <SupplierButton
              className="su-pdf"
              icon="pdf-export"
              onClick={() => window.print()}
            >
              تصدير PDF
            </SupplierButton>
            <SupplierButton
              secondary
              onClick={() => setUpload(true)}
              className="su-xls"
              icon="xls-export"
              title="استيراد المنتجات غير متاح حاليًا"
            >
              استيراد XLS
            </SupplierButton>
          </div>
        )}
      </div>
      {tab === "files" ? (
        <>
          <div className="su-offer-upload">
            <div>
              <h3>
                <SupplierIcon name="upload-files" size={20} /> رفع نموذج عروض
                الأسعار الجاهز
              </h3>
              <p>استخدم النموذج الرسمي لضمان قبول ملفك بشكل صحيح</p>
            </div>
            <SupplierButton icon="xls-export" onClick={() => setUpload(true)}>
              رفع ملف عروض أسعار
            </SupplierButton>
          </div>
          <SupplierPanel>
            <ResourceState resource={resource} onLogin={onSessionExpired} />
            {rows.map((row) => (
              <article className="su-offer-file" key={row.id}>
                <div className="su-offer-file-name">
                  <SupplierIcon name="pdf" size={25} />
                  <div>
                    <button onClick={() => setDetail(row.id)}>
                      <h3>{row.file_name}</h3>
                    </button>
                    <small>
                      {row.supplier_name}　 {date(row.created_at)}　{" "}
                      {row.total_rows} قطعة
                    </small>
                    <div className="su-chips">
                      <SupplierBadge
                        status="unmatched"
                        label={row.unmatched_rows + " منتج جديد"}
                      />
                      <SupplierBadge
                        status="expensive"
                        label={row.expensive_rows + " منتج أغلى"}
                      />
                      <SupplierBadge
                        status="cheaper"
                        label={row.cheaper_rows + " منتج أرخص"}
                      />
                    </div>
                  </div>
                </div>
                <div className="su-row-actions">
                  <button
                    aria-label={"عرض " + row.file_name}
                    onClick={() => setDetail(row.id)}
                  >
                    <SupplierIcon name="eye" size={34} />
                  </button>
                  <button disabled title="حذف ملفات العروض غير متاح حاليًا">
                    <SupplierIcon name="trash" size={34} />
                  </button>
                </div>
              </article>
            ))}
            {resource.data && !rows.length && (
              <p className="su-empty">لا توجد ملفات عروض أسعار.</p>
            )}
            <SupplierPager
              page={page}
              limit={6}
              total={resource.data?.meta?.total}
              onChange={setPage}
            />
          </SupplierPanel>
        </>
      ) : (
        <>
          <SupplierStats
            items={[
              {
                label: "إجمالي الطلبات",
                value: resource.data?.meta?.ordersCount,
                icon: "product-total",
              },
              {
                label: "منشور ونشط",
                value: status === "active" ? resource.data?.meta?.total : null,
                icon: "product-active",
                tint: "green",
              },
              {
                label: "منتجات في السلة",
                value: null,
                icon: "product-cart",
                tint: "yellow",
              },
            ]}
          />
          <SupplierPanel className="su-offer-products-panel">
            <div className="su-panel-heading">
              <div className="su-controls">
                <SupplierField label="البحث">
                  <input
                    value={search}
                    placeholder="ابحث باسم المنتج أو رقم القطعة..."
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                  />
                </SupplierField>
                <SupplierField label="الحالة">
                  <select
                    value={status}
                    onChange={(e) => {
                      setStatus(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">الحالة</option>
                    <option value="active">منشور</option>
                    <option value="expired">منتهي</option>
                  </select>
                </SupplierField>
              </div>
            </div>
            <ResourceState resource={resource} onLogin={onSessionExpired} />
            <SupplierTable
              head={[
                <input
                  type="checkbox"
                  aria-label="تحديد منتجات العروض"
                  disabled
                />,
                "المنتج",
                "رقم SKU",
                "المورد",
                "عدد الطلبات",
                "الحالة",
                "سعر Excel",
                "سعر المنصة",
                "الفرق",
                "الإجراءات",
              ]}
            >
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={"تحديد " + row.product_name}
                    />
                  </td>
                  <td>
                    <button
                      className="su-name"
                      onClick={() => setPreview(row.product_id)}
                    >
                      <ProductPicture
                        src={row.thumbnail}
                        alt=""
                        style={{ width: 35, height: 35, objectFit: "contain" }}
                      />
                      <span>{row.product_name}</span>
                    </button>
                  </td>
                  <td className="su-part-number">{row.part_number || "—"}</td>
                  <td>{row.supplier_name}</td>
                  <td>{row.orders_count} طلب</td>
                  <td>
                    <SupplierBadge
                      status={row.status === "active" ? "approved" : "inactive"}
                      label={
                        row.status === "active"
                          ? "منشور"
                          : row.status === "expired"
                            ? "منتهي"
                            : row.status
                      }
                    />
                  </td>
                  <td>
                    <SupplierMoney value={row.supplier_price} />
                  </td>
                  <td>
                    <SupplierMoney value={row.offer_price} />
                  </td>
                  <td>
                    <SupplierMoney
                      value={
                        row.original_price != null && row.offer_price != null
                          ? Number(row.original_price) - Number(row.offer_price)
                          : null
                      }
                    />
                  </td>
                  <td>
                    <div className="su-row-actions">
                      <button
                        aria-label={"معاينة " + row.product_name}
                        onClick={() => setPreview(row.product_id)}
                      >
                        <SupplierIcon name="eye" size={34} />
                      </button>
                      <button
                        disabled={row.status !== "active"}
                        aria-label={"إلغاء عرض " + row.product_name}
                        onClick={() => setCancel(row)}
                      >
                        <SupplierIcon name="trash" size={34} />
                      </button>
                      <button disabled aria-label="إجراءات العرض">
                        <SupplierIcon name="more" size={22} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </SupplierTable>
            {resource.data && !rows.length && (
              <p className="su-empty">لا توجد منتجات عروض.</p>
            )}
            <SupplierPager
              page={page}
              limit={7}
              total={resource.data?.meta?.total}
              onChange={setPage}
            />
          </SupplierPanel>
        </>
      )}
      {upload && (
        <SupplierModal
          title="رفع ملف عروض أسعار"
          small
          onClose={() => setUpload(false)}
        >
          <SupplierPanel>
            <SupplierField label="ملف عروض الأسعار" icon="upload">
              <input type="file" accept=".xlsx,.xls,.csv" disabled />
            </SupplierField>
            <p className="su-bank-note">
              رفع ملف عروض أسعار بواسطة الإدارة غير متاح حاليًا.
            </p>
          </SupplierPanel>
        </SupplierModal>
      )}
      {preview && (
        <SupplierModal title="معاينة المنتج" onClose={() => setPreview(null)}>
          <ResourceState resource={product} onLogin={onSessionExpired} />
          {product.data?.data && <ProductPreview product={product.data.data} />}
        </SupplierModal>
      )}
      {cancel && (
        <SupplierModal
          title="إلغاء العرض"
          small
          onClose={() => setCancel(null)}
          busy={busy}
        >
          <SupplierPanel>
            <p>إلغاء عرض {cancel.product_name}؟</p>
            {error && <p className="su-error">{error}</p>}
            <button
              className="su-button full"
              disabled={busy}
              onClick={cancelOffer}
            >
              تأكيد الإلغاء
            </button>
          </SupplierPanel>
        </SupplierModal>
      )}
    </div>
  );
}
function SupplierOfferDetail({ id, onBack, onSessionExpired }) {
  const [page, setPage] = useState(1),
    [comparison, setComparison] = useState(""),
    [selected, setSelected] = useState({}),
    [apply, setApply] = useState(false),
    [preview, setPreview] = useState(null),
    [revision, setRevision] = useState(0),
    [notice, setNotice] = useState("");
  const resource = useAdminResource(
      "/api/suppliers/admin/price-lists/" +
        encodeURIComponent(id) +
        "?" +
        queryString({ limit: 5, offset: (page - 1) * 5, comparison }),
      revision,
    ),
    product = useAdminResource(
      preview ? "/api/products/admin/" + encodeURIComponent(preview) : null,
    );
  const rows = resource.data?.data?.items || [],
    file = resource.data?.data?.priceList;
  return (
    <div className="su-page">
      <h1>عروض الأسعار</h1>
      {notice && (
        <p className="su-success" role="status">
          {notice}
        </p>
      )}
      {file && (
        <div className="su-offer-summary">
          <div className="su-offer-file-name">
            <SupplierIcon name="pdf" size={25} />
            <div>
              <h3>{file.fileName}</h3>
              <small className="su-muted">
                {file.supplierName}　{date(file.createdAt)}　
                {file.summary?.total} قطعة
              </small>
              <div className="su-chips">
                <SupplierBadge
                  status="unmatched"
                  label={file.summary?.unmatched + " منتج جديد"}
                />
                <SupplierBadge
                  status="expensive"
                  label={file.summary?.expensive + " منتج أغلى"}
                />
                <SupplierBadge
                  status="cheaper"
                  label={file.summary?.cheaper + " منتج أرخص"}
                />
              </div>
            </div>
          </div>
          <SupplierButton
            disabled={!Object.keys(selected).length}
            onClick={() => setApply(true)}
          >
            تطبيق العرض على المنتجات
          </SupplierButton>
        </div>
      )}
      <SupplierPanel>
        <div className="su-panel-heading">
          <h2>المنتجات</h2>
          <div className="su-controls">
            <SupplierField label="نوع المقارنة">
              <select
                value={comparison}
                onChange={(e) => {
                  setComparison(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">كل القطع</option>
                <option value="cheaper">الأرخص</option>
                <option value="expensive">الأغلى</option>
                <option value="unmatched">جديد</option>
              </select>
            </SupplierField>
            <SupplierButton
              secondary
              danger
              onClick={() => {
                const next = { ...selected };
                rows
                  .filter((x) => x.comparison === "cheaper" && x.product_id)
                  .forEach((x) => {
                    next[x.id] = x;
                  });
                setSelected(next);
              }}
            >
              تحديد الأرخص
            </SupplierButton>
          </div>
        </div>
        <ResourceState resource={resource} onLogin={onSessionExpired} />
        <SupplierTable
          head={[
            <input
              type="checkbox"
              aria-label="تحديد قطع الصفحة"
              checked={rows.length > 0 && rows.every((x) => !!selected[x.id])}
              onChange={(e) => {
                const next = { ...selected };
                rows.forEach((x) => {
                  if (e.target.checked && x.product_id) next[x.id] = x;
                  else delete next[x.id];
                });
                setSelected(next);
              }}
            />,
            "المنتج",
            "رقم SKU",
            "سعر Excel",
            "سعر المنصة",
            "الفرق",
            "نسبة الربح",
            "الإجراءات",
          ]}
        >
          {rows.map((row) => (
            <tr key={row.id} className={"su-comparison-" + row.comparison}>
              <td>
                <input
                  type="checkbox"
                  aria-label={"تحديد " + row.part_name}
                  disabled={!row.product_id}
                  checked={!!selected[row.id]}
                  onChange={(e) => {
                    const next = { ...selected };
                    if (e.target.checked) next[row.id] = row;
                    else delete next[row.id];
                    setSelected(next);
                  }}
                />
              </td>
              <td>{row.part_name}</td>
              <td>
                <code className="su-sku">{row.part_number}</code>
              </td>
              <td>
                <SupplierMoney value={row.supplier_price} />
              </td>
              <td>
                <SupplierMoney value={row.platform_price} />
              </td>
              <td>
                <SupplierMoney value={row.price_diff} />
              </td>
              <td>
                <SupplierBadge status={row.comparison} />
              </td>
              <td>
                {row.product_id ? (
                  <SupplierButton
                    secondary
                    onClick={() => setPreview(row.product_id)}
                    icon="quick-eye"
                  >
                    عرض سريع
                  </SupplierButton>
                ) : (
                  <SupplierButton secondary disabled icon="add-product">
                    إضافة للمنتجات
                  </SupplierButton>
                )}
              </td>
            </tr>
          ))}
        </SupplierTable>
        {resource.data && !rows.length && (
          <p className="su-empty">لا توجد قطع تطابق الفلتر.</p>
        )}
        <SupplierPager
          page={page}
          total={resource.data?.meta?.total}
          onChange={setPage}
        />
      </SupplierPanel>
      {apply && (
        <ApplyOffer
          id={id}
          rows={Object.values(selected)}
          onClose={() => setApply(false)}
          onApplied={(result) => {
            setNotice(
              `تم تطبيق ${result.applied} عرض وتخطي ${result.skipped} قطعة.`,
            );
            setApply(false);
            setSelected({});
            setRevision((n) => n + 1);
          }}
        />
      )}
      {preview && (
        <SupplierModal title="معاينة المنتج" onClose={() => setPreview(null)}>
          <ResourceState resource={product} onLogin={onSessionExpired} />
          {product.data?.data && <ProductPreview product={product.data.data} />}
        </SupplierModal>
      )}
    </div>
  );
}
const offerOutcomes = new Set();
function ApplyOffer({ id, rows, onClose, onApplied }) {
  const [days, setDays] = useState(14),
    [custom, setCustom] = useState(false),
    [end, setEnd] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [unknown, setUnknown] = useState(offerOutcomes.has(id));
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Riyadh",
  });
  async function submit(e) {
    e.preventDefault();
    if (busy || unknown) return;
    const validDays = custom
      ? Math.ceil((Date.parse(end) - Date.parse(today)) / 86400000)
      : days;
    if (!Number.isInteger(validDays) || validDays < 1 || validDays > 365) {
      setError("اختر مدة بين يوم و365 يومًا.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      offerOutcomes.add(id);
      const result = await adminRequest(
        "/api/offers/admin/price-lists/" + encodeURIComponent(id) + "/apply",
        { method: "POST", body: { itemIds: rows.map((x) => x.id), validDays } },
      );
      if (
        !Number.isInteger(result.data?.applied) ||
        !Array.isArray(result.data?.offers) ||
        result.data.offers.length !== result.data.applied ||
        result.data.offers.some(
          (x) => !x.id || !rows.some((row) => row.product_id === x.product_id),
        ) ||
        result.data.applied + Number(result.data.skipped) !== rows.length
      ) {
        setUnknown(true);
        throw new Error("تعذر التأكد من تطبيق العرض. راجع منتجات العروض.");
      }
      offerOutcomes.delete(id);
      if (result.data.applied === 0) {
        setError("لم يتم تطبيق أي عرض. راجع القطع المختارة.");
        return;
      }
      onApplied(result.data);
    } catch (e) {
      if (!e.status || e.status >= 500) setUnknown(true);
      else offerOutcomes.delete(id);
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <SupplierModal title="تطبيق عرض مؤقت" onClose={onClose} busy={busy}>
      <form onSubmit={submit}>
        <SupplierPanel title="القطع المحددة للعرض">
          <SupplierTable
            head={[
              "المنتج",
              "رقم القطعة",
              "سعر المنصة",
              "سعر العرض",
              "نسبة الربح",
            ]}
          >
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.part_name}</td>
                <td>{row.part_number}</td>
                <td>
                  <SupplierMoney value={row.platform_price} />
                </td>
                <td>
                  <SupplierMoney value={row.offer_price} />
                </td>
                <td>{text(row.current_margin_percent)}%</td>
              </tr>
            ))}
          </SupplierTable>
        </SupplierPanel>
        <SupplierPanel title="مدة العرض">
          <div className="su-selected-dates">
            {[
              [1, "يوم واحد"],
              [3, "3 أيام"],
              [7, "أسبوع"],
              [14, "أسبوعين"],
              [30, "شهر"],
            ].map(([n, label]) => (
              <button
                key={n}
                type="button"
                className={!custom && days === n ? "active" : ""}
                onClick={() => {
                  setDays(n);
                  setCustom(false);
                }}
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              className={custom ? "active" : ""}
              onClick={() => setCustom(true)}
            >
              مخصص
            </button>
          </div>
          <div className="su-fields">
            <SupplierField label="تاريخ البداية" icon="mail">
              <input type="date" disabled value={today} />
            </SupplierField>
            <SupplierField label="تاريخ الانتهاء" icon="phone">
              <input
                type="date"
                min={today}
                disabled={!custom}
                required={custom}
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </SupplierField>
          </div>
        </SupplierPanel>
        {error && (
          <p className="su-error" role="alert">
            {error}
          </p>
        )}
        <button
          className="su-button"
          type="submit"
          style={{ minWidth: 270, minHeight: 62, margin: "10px 0" }}
          disabled={busy || unknown}
        >
          تطبيق العرض
        </button>
      </form>
    </SupplierModal>
  );
}
