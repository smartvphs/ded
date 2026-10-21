import React, { useEffect, useRef, useState, lazy, Suspense } from "react";
import {
  FileSpreadsheet,
  FileText,
  Plus,
  Search,
  Layers,
  MoreVertical,
  Eye,
  Pencil,
  Trash2,
  CheckCircle2,
  TriangleAlert,
  Shuffle,
  Star,
  ChevronDown,
} from "lucide-react";
import ProductEditor from "./ProductEditor";
import ProductPicture from "./ProductPicture";
import ServiceProducts from "./ServiceProducts";
import { exportProductPdf } from "./product-export";
import { sections, filters } from "./products-data";
import { adminRequest, queryString } from "./admin-api";
import useAdminResource from "./use-admin-resource";
import { ResourceState, Empty } from "./dashboard-ui";
import { number } from "./dashboard-data";
import useProductInventory from "./use-product-inventory";
import useProductDetails from "./use-product-details";
import {
  inventorySummary,
  categoryFilters,
  brandFilters,
  mergeProductDetails,
  makeSprite,
} from "./product-catalog";
import { productTypes, productRow } from "./products-api";
import { Modal, Pager } from "./orders-ui";
import { Sprite, Money, Quality, HiddenFile } from "./products-ui";

import "./products.css";
const ProductImport = lazy(() => import("./ProductImport"));
export default function ProductsPage({ onSessionExpired }) {
  const [group, setGroup] = useState("parts"),
    [filter, setFilter] = useState(""),
    [filterKey, setFilterKey] = useState("categoryId"),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [page, setPage] = useState(1),
    [checked, setChecked] = useState([]),
    [menu, setMenu] = useState(null),
    [editor, setEditor] = useState(null),
    [revision, setRevision] = useState(0),
    [notice, setNotice] = useState(""),
    [deleting, setDeleting] = useState(null),
    [busy, setBusy] = useState(false),
    [debounced, setDebounced] = useState(""),
    [importing, setImporting] = useState(false);
  const root = useRef(null),
    deleteLock = useRef(false);
  useEffect(() => {
    const reset = () => {
      setEditor(null);
      setMenu(null);
    };
    window.addEventListener("mypart:products-home", reset);
    return () => window.removeEventListener("mypart:products-home", reset);
  }, []);
  useEffect(() => {
    if (!menu) return;
    const close = (e) => {
      if (
        !e.target.closest(".pp-menu") &&
        !e.target.closest(".pp-menu-trigger")
      )
        setMenu(null);
    };
    const scroll = () => setMenu(null);
    document.addEventListener("pointerdown", close);
    window.addEventListener("scroll", scroll, true);
    return () => {
      document.removeEventListener("pointerdown", close);
      window.removeEventListener("scroll", scroll, true);
    };
  }, [menu]);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  const inventory = useProductInventory(
    group === "services" ? null : productTypes[group],
    revision,
  );
  const lookup = useAdminResource(
    group === "parts"
      ? "/api/categories/admin"
      : ["oil", "tires"].includes(group)
        ? `/api/brands?category=${group === "oil" ? "oils" : "tires"}&active=true`
        : null,
  );
  const invalidLookup = lookup.data && !Array.isArray(lookup.data.data);
  const lookupState = invalidLookup
    ? { ...lookup, error: new Error("تعذر قراءة تصنيفات المنتجات.") }
    : lookup;
  const lookupRows = Array.isArray(lookup.data?.data) ? lookup.data.data : [];
  const inventoryRows = inventory.data?.data || [];
  const filterRows =
    group === "parts"
      ? categoryFilters(lookupRows, inventoryRows, group)
      : brandFilters(lookupRows, inventoryRows);
  const query = {
    partType: productTypes[group],
    limit: 7,
    offset: (page - 1) * 7,
    search: debounced || undefined,
    status:
      { منشور: "published", "غير منشور": "unpublished", محذوف: "deleted" }[
        status
      ] || undefined,
    ...(filter ? { [filterKey]: filter } : {}),
  };
  const resource = useAdminResource(
    group === "services" ? null : "/api/products/admin?" + queryString(query),
    revision,
  );
  const invalid =
    resource.data &&
    (!Array.isArray(resource.data.data) ||
      resource.data.data.some((p) => !p || typeof p.id !== "string" || !p.id));
  const state = invalid
    ? {
        ...resource,
        error: new Error("رد الخادم لا يحتوي قائمة منتجات صالحة."),
      }
    : resource;
  const listRows = Array.isArray(resource.data?.data)
    ? resource.data.data.filter((p) => p && typeof p.id === "string" && p.id)
    : [];
  const pageDetails = useProductDetails(
    listRows.map((p) => p.id),
    revision,
  );
  const rows = listRows.map((row) => ({
    ...productRow(mergeProductDetails(row, pageDetails.data[row.id])),
    detailsPending: !pageDetails.settled?.[row.id] && pageDetails.loading,
  }));
  const total = resource.data?.meta?.total;
  const summary = inventory.data
    ? inventorySummary(inventoryRows, inventory.data.meta, group)
    : {};
  const lowStock = useAdminResource(
    group === "services"
      ? null
      : "/api/products/admin?" +
          queryString({
            partType: productTypes[group],
            limit: 1,
            offset: 0,
            lowStock: true,
          }),
    revision,
  );
  const partCount = useAdminResource(
    "/api/products/admin?partType=part&limit=1&offset=0",
    revision,
  );
  const oilCount = useAdminResource(
    "/api/products/admin?partType=oil&limit=1&offset=0",
    revision,
  );
  const tireCount = useAdminResource(
    "/api/products/admin?partType=tire&limit=1&offset=0",
    revision,
  );
  const serviceCount = useAdminResource(
    "/api/products/admin?partType=service&limit=1&offset=0",
    revision,
  );
  const accessoryCount = useAdminResource(
    "/api/products/admin?partType=accessory&limit=1&offset=0",
    revision,
  );
  const groupTotals = {
    parts: partCount.data?.meta?.total,
    oil: oilCount.data?.meta?.total,
    tires: tireCount.data?.meta?.total,
    services: serviceCount.data?.meta?.total,
    accessories: accessoryCount.data?.meta?.total,
  };
  const detail = useAdminResource(
    editor?.mode === "preview"
      ? "/api/products/admin/" + encodeURIComponent(editor.row.id)
      : null,
  );
  useEffect(() => {
    setChecked([]);
    setMenu(null);
  }, [group, page, debounced, status, filter]);
  function open(row, mode = "preview") {
    setMenu(null);
    setEditor({ row, mode, group });
    setNotice("");
  }
  async function deleteProduct() {
    if (!deleting || deleteLock.current) return;
    deleteLock.current = true;
    setBusy(true);
    setNotice("");
    try {
      await adminRequest(
        "/api/products/admin/" + encodeURIComponent(deleting.id),
        { method: "DELETE" },
      );
      setDeleting(null);
      setChecked([]);
      setNotice("تم حذف المنتج من العرض العام.");
      setRevision((n) => n + 1);
      if (rows.length === 1 && page > 1) setPage((n) => n - 1);
    } catch (error) {
      setNotice(error.message);
    } finally {
      deleteLock.current = false;
      setBusy(false);
    }
  }
  if (group === "services")
    return (
      <ServiceProducts
        navigation={
          <section className="pp-categories" aria-label="أقسام المنتجات">
            {sections.map((section) => (
              <button
                key={section.id}
                className={
                  "pp-category " + (group === section.id ? "selected" : "")
                }
                style={{ background: section.color }}
                onClick={() => {
                  setGroup(section.id);
                  setFilter("");
                  setSearch("");
                  setDebounced("");
                  setStatus("");
                  setPage(1);
                }}
              >
                <div>
                  <span>{section.name}</span>
                  <b>
                    {number(groupTotals[section.id])}{" "}
                    {section.id === "services" ? "خدمة" : "منتج"}
                  </b>
                </div>
                <Sprite asset={section.asset} />
              </button>
            ))}
          </section>
        }
        onSessionExpired={onSessionExpired}
      />
    );
  if (editor && editor.mode !== "preview")
    return (
      <ProductEditor
        key={editor.group + editor.row.id}
        group={editor.group}
        product={editor.row}
        mode={editor.mode}
        onSaved={() => setRevision((n) => n + 1)}
        onBack={() => {
          setEditor(null);
          setRevision((n) => n + 1);
        }}
      />
    );
  const isParts = group === "parts",
    isService = group === "services",
    isAccessory = group === "accessories";
  const columns = isParts
    ? [
        "المنتج",
        "الشركة",
        "أعلى جودة",
        "أقل جودة",
        "التقييم",
        "الحالة",
        "الإجراءات",
      ]
    : group === "oil"
      ? [
          "المنتج",
          "شركة الزيت",
          "نوع اللزوجة",
          "التقييم",
          "الحالة",
          "الإجراءات",
        ]
      : group === "tires"
        ? [
            "المنتج",
            "شركة الإطار",
            "مقاس الجنط",
            "التقييم",
            "الحالة",
            "الإجراءات",
          ]
        : isService
          ? [
              "العميل",
              "الشركة",
              "الخدمة المطلوبة",
              "السعر",
              "مركز الصيانة",
              "الحالة",
              "الإجراءات",
            ]
          : [
              "المنتج",
              "الشركة",
              "نوع التركيب",
              "السعر",
              "التقييم",
              "الحالة",
              "الإجراءات",
            ];
  return (
    <div className="pp-page" ref={root}>
      <div className="pp-page-heading">
        <h1>{isService ? "خدمات ماي بارت" : "إدارة المنتجات"}</h1>
        <div className="pp-import-export">
          <button className="pp-import" onClick={() => setImporting(true)}>
            <FileSpreadsheet size={18} />
            استيراد XLS
          </button>
          <button
            className="pp-export"
            disabled={busy}
            onClick={async () => {
              if (busy) return;
              setBusy(true);
              setNotice("");
              try {
                const n = await exportProductPdf(query);
                setNotice(
                  `تم تجهيز ${n} منتج للتصدير. اختر حفظ PDF من نافذة الطباعة.`,
                );
              } catch (e) {
                setNotice(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <FileText size={18} />
            تصدير PDF
          </button>
        </div>
      </div>
      <section className="pp-stat-panel">
        {[
          [summary.all, "إجمالي المنتجات", "blue", FileText],
          [summary.published, "منشور ونشط", "green", CheckCircle2],
          [
            group === "services" ? null : lowStock.data?.meta?.total,
            "مخزون منخفض",
            "amber",
            TriangleAlert,
          ],
          [summary.outOfStock, "نفذ من المخزون", "red", Shuffle],
        ].map(([n, label, color, Icon]) => (
          <div className={"pp-stat " + color} key={label}>
            <span className="pp-stat-icon">
              <Icon size={21} />
            </span>
            <b>{number(n)}</b>
            <span>{label}</span>
          </div>
        ))}
      </section>
      <section className="pp-categories" aria-label="أقسام المنتجات">
        {sections.map((section) => (
          <button
            key={section.id}
            className={
              "pp-category " + (group === section.id ? "selected" : "")
            }
            style={{ background: section.color }}
            onClick={() => {
              setGroup(section.id);
              setFilter("");
              setSearch("");
              setDebounced("");
              setStatus("");
              setPage(1);
              setChecked([]);
              setMenu(null);
            }}
          >
            <div>
              <span>{section.name}</span>
              <b>
                {number(groupTotals[section.id])}{" "}
                {section.id === "services" ? "خدمة" : "منتج"}
              </b>
            </div>
            <Sprite asset={section.asset} />
          </button>
        ))}
      </section>
      {filters[group] && (
        <div className="pp-filters" aria-label="تصنيفات المنتجات">
          <button
            className={!filter ? "active" : ""}
            onClick={() => {
              setFilter("");
              setPage(1);
            }}
          >
            <Layers size={18} />
            <span>الكل</span>
            <small>{number(summary.all)}</small>
          </button>
          {filterRows.map((row) => (
            <button
              key={row.id}
              className={filter === row.id ? "active" : ""}
              disabled={inventory.loading || Boolean(inventory.error)}
              onClick={() => {
                setFilter(row.id);
                setFilterKey(row.key);
                setPage(1);
                setChecked([]);
              }}
            >
              <span>{row.name}</span>
              <small>{!inventory.data ? "—" : number(row.count)}</small>
            </button>
          ))}
        </div>
      )}
      <ResourceState resource={state} onLogin={onSessionExpired} />
      <ResourceState resource={lookupState} onLogin={onSessionExpired} />
      <ResourceState resource={inventory} onLogin={onSessionExpired} />
      {lowStock.error && (
        <ResourceState resource={lowStock} onLogin={onSessionExpired} />
      )}
      {pageDetails.error && (
        <div className="op-notice" role="alert">
          تعذر تحميل بعض تفاصيل المنتجات.{" "}
          <button
            type="button"
            onClick={
              pageDetails.error.status === 401
                ? onSessionExpired
                : pageDetails.reload
            }
          >
            إعادة المحاولة
          </button>
        </div>
      )}
      {notice && (
        <p className="op-notice" role="status">
          {notice}
        </p>
      )}
      <section className="pp-list-panel">
        <div className="pp-list-tools">
          <div className="pp-search-status">
            <label className="pp-search">
              <input
                aria-label="البحث في المنتجات"
                placeholder={
                  isService
                    ? "إبحث بإسم الخدمة أو العميل ..."
                    : isParts || isAccessory
                      ? "إبحث بإسم المنتج أو رقم القطعة..."
                      : "إبحث بإسم المنتج أو الشركة..."
                }
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
              <Search size={19} />
            </label>
            <label className="pp-status">
              <select
                aria-label="حالة المنتجات"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">الحالة</option>
                <option>منشور</option>
                <option>غير منشور</option>
                <option>محذوف</option>
              </select>
              <ChevronDown size={15} />
            </label>
          </div>
          <button
            className="pp-button"
            onClick={() =>
              open(
                { id: crypto.randomUUID(), name: "", published: true },
                "add",
              )
            }
          >
            <Plus size={19} />
            {isService ? "إضافة خدمة" : "إضافة منتج"}
          </button>
        </div>
        <div className="pp-table-scroll">
          <table className={"pp-table " + (isParts ? "pp-parts-table" : "")}>
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    aria-label="تحديد كل المنتجات"
                    checked={
                      rows.length > 0 &&
                      rows.every((p) => checked.includes(p.id))
                    }
                    onChange={(e) =>
                      setChecked(e.target.checked ? rows.map((p) => p.id) : [])
                    }
                  />
                </th>
                {columns.map((c) => (
                  <th key={c}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={"تحديد " + row.name}
                      checked={checked.includes(row.id)}
                      onChange={(e) =>
                        setChecked(
                          e.target.checked
                            ? [...checked, row.id]
                            : checked.filter((id) => id !== row.id),
                        )
                      }
                    />
                  </td>
                  <td>
                    <button
                      className="pp-product-name"
                      onClick={() => open(row, "preview")}
                    >
                      {!isService && (
                        <ProductImage
                          key={row.thumbnail || row.id}
                          src={row.thumbnail}
                          name={row.name}
                        />
                      )}
                      <span>
                        {isService ? row.customer : row.name}
                        {isParts && <small>{row.subtitle}</small>}
                        {isService && (
                          <small className="pp-phone">{row.phone}</small>
                        )}
                      </span>
                    </button>
                  </td>
                  {isParts ? (
                    <>
                      <td>
                        <ProductMakes row={row} />
                      </td>
                      <td>
                        {row.quality === "—" ? (
                          <span>—</span>
                        ) : (
                          <Quality normal={row.quality === "قطعة عادية"}>
                            {row.quality}
                          </Quality>
                        )}
                        <p className="pp-price-cell">
                          <Money>
                            {number(row.highQualityPrice ?? row.price)}
                          </Money>
                        </p>
                      </td>
                      <td>
                        {row.lowQuality ? (
                          <>
                            <Quality normal={row.lowQuality === "قطعة عادية"}>
                              {row.lowQuality}
                            </Quality>
                            <p className="pp-price-cell">
                              <Money>
                                {number(row.lowQualityPrice ?? row.price)}
                              </Money>
                            </p>
                          </>
                        ) : (
                          "---"
                        )}
                      </td>
                    </>
                  ) : group === "oil" ? (
                    <>
                      <td>{row.company}</td>
                      <td dir="ltr" title={row.viscosityWarning}>
                        {row.detailsPending ? "جارٍ التحميل…" : row.viscosity}
                      </td>
                    </>
                  ) : group === "tires" ? (
                    <>
                      <td>{row.company}</td>
                      <td title={row.sizeWarning}>
                        {row.detailsPending ? "جارٍ التحميل…" : row.size}
                      </td>
                    </>
                  ) : isService ? (
                    <>
                      <td>
                        <ProductMakes row={row} />
                      </td>
                      <td>{row.name}</td>
                      <td>
                        <Money>{number(row.price)}</Money>
                      </td>
                      <td>{row.supplier_name || "—"}</td>
                    </>
                  ) : (
                    <>
                      <td>
                        <ProductMakes row={row} />
                      </td>
                      <td>{row.installation}</td>
                      <td>
                        <Money>{number(row.price)}</Money>
                      </td>
                    </>
                  )}
                  {!isService && (
                    <td>
                      <span
                        className="pp-rating"
                        title={
                          row.averageRating != null
                            ? "متوسط التقييم: " + number(row.averageRating)
                            : undefined
                        }
                      >
                        <Star size={14} fill="#ffd600" color="#ffd600" />
                        {row.detailsPending
                          ? "جارٍ التحميل…"
                          : number(row.rating) + " تقييم"}
                      </span>
                    </td>
                  )}
                  <td>
                    <span
                      className={
                        "pp-published " + (!row.published ? "inactive" : "")
                      }
                    >
                      <i />
                      {row.deleted
                        ? "محذوف"
                        : row.published
                          ? "منشور"
                          : row.status === "pending"
                            ? "قيد المراجعة"
                            : row.status === "rejected"
                              ? "مرفوض"
                              : "غير منشور"}
                    </span>
                  </td>
                  <td>
                    <button
                      className="pp-menu-trigger"
                      aria-label={"إجراءات " + row.name}
                      onClick={(e) => {
                        const r = e.currentTarget.getBoundingClientRect();
                        setMenu(
                          menu?.id === row.id
                            ? null
                            : {
                                id: row.id,
                                row,
                                top: r.bottom - 10,
                                left: Math.max(10, r.left - 62),
                              },
                        );
                      }}
                    >
                      <MoreVertical size={24} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!resource.loading && !state.error && !rows.length && (
          <Empty>لا توجد منتجات مطابقة للبحث.</Empty>
        )}
        <Pager page={page} total={total || 0} pageSize={7} onChange={setPage} />
      </section>
      {menu && (
        <div className="pp-menu" style={{ top: menu.top, left: menu.left }}>
          <button onClick={() => open(menu.row, "preview")}>
            <Eye size={16} />
            معاينة المنتج
          </button>
          <button onClick={() => open(menu.row, "edit")}>
            <Pencil size={16} />
            تعديل البيانات
          </button>
          <button
            className="pp-delete-action"
            disabled={isService || menu.row.deleted}
            onClick={() => {
              setDeleting(menu.row);
              setMenu(null);
              setNotice("");
            }}
          >
            <Trash2 size={16} />
            حذف المنتج
          </button>
        </div>
      )}
      {importing && (
        <Suspense fallback={<p role="status">جارٍ فتح الاستيراد…</p>}>
          <ProductImport
            onClose={() => setImporting(false)}
            onImported={(n) => {
              setRevision((r) => r + 1);
              setNotice(`تم استيراد ${n} منتج.`);
            }}
            onSessionExpired={onSessionExpired}
          />
        </Suspense>
      )}
      {editor?.mode === "preview" && (
        <Modal title="معاينة المنتج" onClose={() => setEditor(null)}>
          <ResourceState resource={detail} onLogin={onSessionExpired} />
          {detail.data && (
            <>
              <h3>{detail.data.data.name}</h3>
              <ProductPicture src={typeof detail.data.data.images?.[0] === "string" ? detail.data.data.images[0] : detail.data.data.images?.[0]?.image_url} alt="" style={{maxWidth:"100%",maxHeight:260,objectFit:"contain"}} />
              <p>{detail.data.data.description || ""}</p>
              <p>{detail.data.data.part_number || ""}</p>
              <Money>
                {number(
                  detail.data.data.discount_price ?? detail.data.data.price,
                )}
              </Money>
            </>
          )}
        </Modal>
      )}
      {deleting && (
        <Modal
          title="حذف المنتج"
          onClose={() => {
            if (!busy) setDeleting(null);
          }}
        >
          <p>
            حذف «{deleting.name}» من الموقع؟ سيظل مرتبطًا بالطلبات السابقة، ولن
            يمكن إعادة نشره.
          </p>
          <div className="delete-options">
            <button
              className="primary danger"
              disabled={busy}
              onClick={deleteProduct}
            >
              {busy ? "جارٍ الحذف…" : "تأكيد الحذف"}
            </button>
            <button disabled={busy} onClick={() => setDeleting(null)}>
              إلغاء
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ProductImage({src}) {
  return <ProductPicture src={src} alt="" style={{width:39,height:39,objectFit:"contain"}} />;
}
function ProductMakes({ row }) {
  return (
    <div className="pp-brands">
      {row.carMakes?.length
        ? row.carMakes.map((make) =>
            make.logo ? (
              <img
                key={make.id}
                src={make.logo}
                alt={make.name}
                style={{ width: 32, height: 32, objectFit: "contain" }}
              />
            ) : makeSprite(make) ? (
              <Sprite
                key={make.id}
                asset={makeSprite(make)}
                label={make.name}
              />
            ) : (
              <span key={make.id}>{make.name}</span>
            ),
          )
        : row.brand_name || "—"}
    </div>
  );
}
