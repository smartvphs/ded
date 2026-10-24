import React, { useState } from "react";
import {
  Art,
  Badge,
  Checkbox,
  Field,
  Footer,
  Money,
  Pagination,
  Select,
  Statistics,
} from "./DeliveryUI";
import {
  demoOrders,
  demoReturns,
  orderStatistics,
  returnStatistics,
} from "./demo-data";
const blankFilters = {
  company: "",
  status: "new",
  date: "",
  supplier: "",
  phone: "",
  part: "",
};
export default function DeliveryList({
  returns = false,
  onOpen,
  receivedReturns,
}) {
  const [search, setSearch] = useState(""),
    [page, setPage] = useState(1),
    [tab, setTab] = useState("all"),
    [filters, setFilters] = useState(blankFilters),
    [applied, setApplied] = useState(null),
    [selected, setSelected] = useState(
      () => new Set(returns ? ["RET-002", "RET-003"] : []),
    );
  const set = (key, value) => setFilters((old) => ({ ...old, [key]: value }));
  const source = returns
    ? demoReturns.map((row) =>
        receivedReturns.has(row.id) ? { ...row, status: "received" } : row,
      )
    : demoOrders;
  const allRows = source.filter((row) => {
    const needle = search.trim().toLowerCase();
    if (
      needle &&
      ![row.id, row.orderId, row.source, row.customer, row.product, row.phone]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle)
    )
      return false;
    if (
      tab === "new" &&
      (returns ? row.status !== "approved" : row.status !== "new")
    )
      return false;
    if (!applied || returns) return true;
    return (
      (!applied.company ||
        row.company.includes(applied.company.trim()) ||
        applied.company.includes(row.company)) &&
      (!applied.status || row.status === applied.status) &&
      (!applied.date || row.date === applied.date) &&
      (!applied.supplier || row.source === applied.supplier) &&
      (!applied.phone || row.phone.includes(applied.phone.trim())) &&
      (!applied.part || row.partNumber.includes(applied.part.trim()))
    );
  });
  const pageSize = returns ? 8 : 7,
    maxPage = Math.max(1, Math.ceil(allRows.length / pageSize));
  const currentPage = Math.min(page, maxPage),
    rows = allRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const toggle = (id) =>
    setSelected((old) => {
      const next = new Set(old);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const checkedCount = rows.filter((row) => selected.has(row.id)).length;
  return (
    <>
      <main
        className={
          "da-main da-list-page " +
          (returns ? "da-returns-list" : "da-orders-list")
        }
      >
        <h1 className="da-title">{returns ? "طلبات الإرجاع" : "الطلبات"}</h1>
        <Statistics items={returns ? returnStatistics : orderStatistics} />
        {!returns && (
          <section className="da-filter-panel da-panel">
            <h2>البحث و التصنيف</h2>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                setApplied({ ...filters });
                setPage(1);
              }}
            >
              <div className="da-filter-first">
                <Field label="الشركات" icon="car">
                  <input
                    aria-label="الشركات"
                    placeholder="تويوتا . بي ام دبليو . مرسيدس"
                    value={filters.company}
                    onChange={(e) => set("company", e.target.value)}
                  />
                </Field>
                <div className="da-field">
                  <span className="da-field-label">حالة الطلب</span>
                  <Select
                    label="حالة الطلب"
                    icon="fieldOrder"
                    options={[
                      { value: "new", label: "جديد", status: "new" },
                      {
                        value: "delivered",
                        label: "تم التوصيل",
                        status: "delivered",
                      },
                    ]}
                    value={filters.status}
                    onChange={(value) => set("status", value)}
                  />
                </div>
                <Field label="تاريخ الطلب" icon="date">
                  <input
                    type="date"
                    aria-label="تاريخ الطلب"
                    value={filters.date}
                    onChange={(e) => set("date", e.target.value)}
                  />
                </Field>
              </div>
              <div className="da-filter-second">
                <div className="da-field">
                  <span className="da-field-label">إسم المورد</span>
                  <Select
                    label="إسم المورد"
                    icon="person"
                    placeholder="المورد"
                    value={filters.supplier}
                    onChange={(value) => set("supplier", value)}
                    options={[
                      { value: "", label: "المورد" },
                      ...[
                        "شركة النيل",
                        "المنصة",
                        "حسن محمد",
                        "ليلى عبد الله",
                        "طارق نبيل",
                      ].map((name) => ({ value: name, label: name })),
                    ]}
                  />
                </div>
                <Field label="رقم الجوال" icon="phone">
                  <input
                    aria-label="رقم الجوال"
                    type="tel"
                    dir="ltr"
                    placeholder="+96656892463"
                    value={filters.phone}
                    onChange={(e) => set("phone", e.target.value)}
                  />
                </Field>
                <Field label="رقم القطعة" icon="date">
                  <input
                    aria-label="رقم القطعة"
                    placeholder="رقم القطعة"
                    value={filters.part}
                    onChange={(e) => set("part", e.target.value)}
                  />
                </Field>
              </div>
              <div className="da-filter-action">
                <button className="da-primary" type="submit">
                  <span>البحث و التصنيف</span>
                  <Art name="searchWhite" size={20} />
                </button>
              </div>
            </form>
          </section>
        )}
        <section className="da-list-panel da-panel">
          <div className="da-list-toolbar">
            <div className="da-list-tabs">
              <button
                className={tab === "all" ? "active" : ""}
                onClick={() => {
                  setTab("all");
                  setApplied(null);
                  setPage(1);
                }}
              >
                <Art name="layers" size={20} />
                الكل <span>50</span>
              </button>
              <button
                className={tab === "new" ? "active" : ""}
                onClick={() => {
                  setTab("new");
                  setPage(1);
                }}
              >
                <i />
                جديد <span>5</span>
              </button>
            </div>
            <label className="da-search">
              <input
                aria-label={
                  returns ? "البحث في طلبات الإرجاع" : "البحث في طلبات المندوب"
                }
                placeholder="البحث برقم الطلب، اسم العميل، ..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
              <Art name="search" size={22} />
            </label>
          </div>
          <div className="da-table-scroll">
            <table
              className={
                "da-table da-order-table " + (returns ? "da-return-table" : "")
              }
            >
              <thead>
                <tr>
                  <th className="da-check-column">
                    <Checkbox
                      label={
                        returns
                          ? "تحديد كل المرتجعات الظاهرة"
                          : "تحديد كل الطلبات الظاهرة"
                      }
                      checked={rows.length > 0 && checkedCount === rows.length}
                      mixed={checkedCount > 0 && checkedCount < rows.length}
                      onChange={() =>
                        setSelected((old) => {
                          const next = new Set(old);
                          for (const row of rows)
                            checkedCount === rows.length
                              ? next.delete(row.id)
                              : next.add(row.id);
                          return next;
                        })
                      }
                    />
                  </th>
                  {(returns
                    ? [
                        "رقم الإرجاع",
                        "رقم الطلب",
                        "العميل",
                        "المنتج",
                        "تاريخ الطلب",
                        "السعر",
                        "الحالة",
                        "الإجراءات",
                      ]
                    : [
                        "رقم الطلب",
                        "المصدر",
                        "طلب التسعير",
                        "تاريخ الطلب",
                        "عدد القطع",
                        "الحالة",
                        "الإجراءات",
                      ]
                  ).map((label) => (
                    <th key={label}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Checkbox
                        label={"تحديد " + row.id}
                        checked={selected.has(row.id)}
                        onChange={() => toggle(row.id)}
                      />
                    </td>
                    <td>
                      <button
                        className="da-id-link"
                        onClick={() => onOpen(row)}
                      >
                        {row.id}
                      </button>
                    </td>
                    {returns ? (
                      <>
                        <td>{row.orderId}</td>
                        <td>{row.customer}</td>
                        <td>
                          <div className="da-return-product">
                            <Art name={row.image} size={35} />
                            <div>
                              {row.product}
                              <small className={row.quality ? "quality" : ""}>
                                {row.quality
                                  ? "قطعة أصلية"
                                  : row.quantity + " قطعة"}
                              </small>
                            </div>
                          </div>
                        </td>
                        <td className="da-muted">{row.dateLabel}</td>
                        <td>
                          <Money>{row.price}</Money>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>
                          <span className="da-order-source">
                            {row.source === "شركة النيل" && (
                              <Art name="supplierLogo" size={22} />
                            )}
                            <span>{row.source}</span>
                          </span>
                        </td>
                        <td>
                          {row.pricingRequest ? (
                            <button
                              className="da-id-link"
                              onClick={() => onOpen(row)}
                            >
                              {row.pricingRequest}
                            </button>
                          ) : (
                            <span className="da-empty-pricing">—</span>
                          )}
                        </td>
                        <td className="da-muted">{row.dateLabel}</td>
                        <td>{row.quantity}</td>
                      </>
                    )}
                    <td>
                      <Badge status={row.status} />
                    </td>
                    <td>
                      <button
                        className="da-eye"
                        aria-label={"عرض " + row.id}
                        onClick={() => onOpen(row)}
                      >
                        <Art name="eye" size={36} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!rows.length && (
            <p className="da-empty">لا توجد نتائج مطابقة للبحث.</p>
          )}
          <div className="da-list-bottom">
            <Pagination page={currentPage} onChange={setPage} pages={maxPage} />
            {!returns && <Footer />}
          </div>
        </section>
      </main>
      {returns && <Footer />}
    </>
  );
}
