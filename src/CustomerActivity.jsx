import React, { useState } from "react";
import { ChevronDown, ChevronUp, ShoppingBag, FileText } from "lucide-react";
import useAdminResource from "./use-admin-resource";
import { queryString } from "./admin-api";
import { ResourceState, Money, dateText, Badge } from "./orders-ui";
import ProductPicture from "./ProductPicture";
import { PricingBadge } from "./pricing-ui";
import { pricingTypes } from "./pricing-api";
import { customerNumber } from "./customer-ui";
function Paginator({ page, total, limit = 4, onChange }) {
  const more = total == null ? false : page * limit < Number(total);
  return (
    <div className="pricing-pagination">
      <button disabled={page <= 1} onClick={() => onChange(page - 1)}>
        السابق
      </button>
      <span>{page}</span>
      <button disabled={!more} onClick={() => onChange(page + 1)}>
        التالي
      </button>
    </div>
  );
}
function OrderItems({ order, onOpen, onSessionExpired }) {
  const resource = useAdminResource(
    "/api/orders/admin/" + encodeURIComponent(order.id),
  );
  return (
    <div className="customer-order-products">
      <ResourceState resource={resource} onLogin={onSessionExpired} />
      {resource.data?.data?.items?.map((item) => (
        <div key={item.id}>
          <ProductPicture
            className="customer-product-picture"
            src={item.image_url || item.product_image || item.thumbnail}
            alt=""
          />
          <div>
            <b>{item.product_name || item.name || "—"}</b>
            <small>
              الكمية: {customerNumber(item.quantity)}
              {item.part_number ? " · رقم القطعة: " + item.part_number : ""}
            </small>
            <Money value={item.line_total ?? item.total} />
          </div>
        </div>
      ))}
      {resource.data && !resource.data.data?.items?.length && (
        <p className="customer-api-note">لا توجد بنود مسجلة.</p>
      )}
      <button className="pricing-back" onClick={() => onOpen(order.id)}>
        تفاصيل الطلب
      </button>
    </div>
  );
}
export function CustomerOrders({ id, revision, onOpen, onSessionExpired }) {
  const [page, setPage] = useState(1),
    [status, setStatus] = useState(""),
    [open, setOpen] = useState(null);
  const resource = useAdminResource(
      "/api/orders/all?" +
        queryString({
          userId: id,
          limit: 4,
          offset: (page - 1) * 4,
          status: status || undefined,
        }),
      revision,
    ),
    valid =
      resource.data && !Array.isArray(resource.data.data)
        ? { ...resource, error: new Error("رد طلبات العميل غير صالح.") }
        : resource,
    rows = Array.isArray(resource.data?.data) ? resource.data.data : [];
  return (
    <section className="customer-panel">
      <div className="customer-panel-title">
        <h2>طلبات العميل</h2>
        <select
          aria-label="نوع طلبات العميل"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
            setOpen(null);
          }}
        >
          <option value="">كل الطلبات</option>
          <option value="delivered">الطلبات المكتملة</option>
        </select>
      </div>
      <ResourceState resource={valid} onLogin={onSessionExpired} />
      {rows.map((row) => (
        <article className="customer-order" key={row.id}>
          <button
            className="customer-order-heading"
            onClick={() => setOpen(open === row.id ? null : row.id)}
          >
            <span className="meta-icon">
              <ShoppingBag size={19} />
            </span>
            <span>
              <b>{row.order_number || "—"}</b>
              <small>
                {dateText(row.created_at)} · عدد القطع:{" "}
                {customerNumber(row.items_quantity ?? row.items_count)}
              </small>
              <Badge
                status={row.display_status || row.status}
                label={row.display_status_label || row.status_label}
              />
            </span>
            {open === row.id ? (
              <ChevronUp size={15} />
            ) : (
              <ChevronDown size={15} />
            )}
          </button>
          {open === row.id && (
            <OrderItems
              order={row}
              onOpen={onOpen}
              onSessionExpired={onSessionExpired}
            />
          )}
        </article>
      ))}
      {!valid.loading && !valid.error && !rows.length && (
        <p className="customer-api-note">لا توجد طلبات مطابقة.</p>
      )}
      <Paginator
        page={page}
        total={resource.data?.meta?.total}
        onChange={setPage}
      />
    </section>
  );
}
export function CustomerPricing({ id, revision, onOpen, onSessionExpired }) {
  const [tab, setTab] = useState("all"),
    [page, setPage] = useState(1),
    params = {
      customerId: id,
      limit: 6,
      offset: (page - 1) * 6,
      ...(tab === "priced"
        ? { status: "quoted" }
        : tab === "confirmed"
          ? { hasAccepted: true }
          : {}),
    };
  const resource = useAdminResource(
      "/api/pricing-requests/admin?" + queryString(params),
      revision,
    ),
    base =
      "/api/pricing-requests/admin?" +
      queryString({ customerId: id, limit: 1, offset: 0 }),
    all = useAdminResource(base, revision),
    priced = useAdminResource(base + "&status=quoted", revision),
    confirmed = useAdminResource(base + "&hasAccepted=true", revision),
    rows = Array.isArray(resource.data?.data) ? resource.data.data : [],
    valid =
      resource.data && !Array.isArray(resource.data.data)
        ? { ...resource, error: new Error("رد تسعيرات العميل غير صالح.") }
        : resource;
  return (
    <section className="customer-panel">
      <h2>التسعيرات</h2>
      <div className="customer-quote-tabs">
        {[
          ["all", "طلبات التسعير", all],
          ["priced", "تم تسعيرها", priced],
          ["confirmed", "طلبات مؤكدة", confirmed],
        ].map(([key, label, r]) => (
          <button
            className={tab === key ? "selected" : ""}
            key={key}
            onClick={() => {
              setTab(key);
              setPage(1);
            }}
          >
            {label} <span>{customerNumber(r.data?.meta?.total)}</span>
          </button>
        ))}
      </div>
      {[all, priced, confirmed].map((r, i) => (
        <ResourceState key={i} resource={r} onLogin={onSessionExpired} />
      ))}
      <ResourceState resource={valid} onLogin={onSessionExpired} />
      <div className="customer-quotes">
        {rows.map((row) => (
          <button
            className="customer-quote"
            key={row.id}
            onClick={() => onOpen(row.id)}
            aria-label={"تفاصيل تسعير " + row.request_number}
          >
            <span className="meta-icon">
              <FileText size={20} />
            </span>
            <div>
              <b>{row.request_number || "—"}</b>
              <span className="pricing-badge blue">
                {pricingTypes[row.pricing_type] || row.pricing_type || "—"}
              </span>
              <PricingBadge status={row.status} label={row.status_label} />
              <small>
                {dateText(row.created_at)} · عدد القطع:{" "}
                {customerNumber(row.parts_count)}
              </small>
              {row.priced_parts_count != null && row.parts_count > 0 && (
                <div className="customer-quote-progress">
                  <div>
                    <i
                      style={{
                        width:
                          Math.min(
                            100,
                            (Number(row.priced_parts_count) /
                              Number(row.parts_count)) *
                              100,
                          ) + "%",
                      }}
                    />
                  </div>
                  <span>
                    {customerNumber(row.priced_parts_count)}/
                    {customerNumber(row.parts_count)} تم تسعيرها
                  </span>
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
      {!valid.loading && !valid.error && !rows.length && (
        <p className="customer-api-note">لا توجد طلبات تسعير مطابقة.</p>
      )}
      <Paginator
        page={page}
        total={resource.data?.meta?.total}
        limit={6}
        onChange={setPage}
      />
    </section>
  );
}
export function CustomerTransactions({ id, revision, onSessionExpired }) {
  const [page, setPage] = useState(1),
    resource = useAdminResource(
      "/api/wallet/admin/" +
        encodeURIComponent(id) +
        "/transactions?" +
        queryString({ page, limit: 10 }),
      revision,
    ),
    rows = Array.isArray(resource.data?.data?.items)
      ? resource.data.data.items
      : [],
    valid =
      resource.data && !Array.isArray(resource.data.data?.items)
        ? { ...resource, error: new Error("رد حركات المحفظة غير صالح.") }
        : resource;
  return (
    <section className="customer-panel">
      <h2>حركات المحفظة</h2>
      <ResourceState resource={valid} onLogin={onSessionExpired} />
      <div className="customer-table-scroll">
        <table className="customer-table customer-wallet-table">
          <thead>
            <tr>
              {["التاريخ", "النوع", "المبلغ", "الرصيد بعد الحركة", "السبب"].map(
                (h) => (
                  <th key={h}>{h}</th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{dateText(row.created_at)}</td>
                <td>
                  {{
                    admin_credit: "إضافة إدارية",
                    admin_debit: "خصم إداري",
                    cashback: "كاش باك",
                  }[row.type] ||
                    row.type ||
                    "—"}
                </td>
                <td>
                  <Money value={row.amount} />
                </td>
                <td>
                  <Money value={row.balance_after} />
                </td>
                <td>{row.reason || row.description || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!valid.loading && !valid.error && !rows.length && (
        <p className="customer-api-note">لا توجد حركات مسجلة.</p>
      )}
      <Paginator
        page={page}
        total={resource.data?.data?.pagination?.total}
        limit={10}
        onChange={setPage}
      />
    </section>
  );
}
