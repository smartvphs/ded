import React, { useEffect, useState } from "react";
import { adminRequest } from "./admin-api";
import useAdminResource from "./use-admin-resource";
import { Panel, Money, ResourceState } from "./orders-ui";
export default function OrderCosts({ id, onSessionExpired, onSaved }) {
  const resource = useAdminResource(
    "/api/orders/admin/" + encodeURIComponent(id) + "/costs",
  );
  const [draft, setDraft] = useState({}),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const summary = resource.data?.data?.summary,
    items = resource.data?.data?.items || [];
  useEffect(() => {
    if (summary)
      setDraft({
        shippingCost: String(summary.shippingCost ?? ""),
        packagingCost: String(summary.packagingCost ?? ""),
        extraFees: String(summary.extraFees ?? ""),
      });
  }, [resource.data]);
  async function save() {
    if (busy) return;
    setNotice("");
    const body = {};
    for (const key of Object.keys(draft))
      if (draft[key] !== String(summary?.[key] ?? "")) {
        if (
          draft[key] === "" ||
          !Number.isFinite(Number(draft[key])) ||
          Number(draft[key]) < 0
        ) {
          setNotice("أدخل تكلفة صحيحة غير سالبة.");
          return;
        }
        body[key] = Number(draft[key]);
      }
    setBusy(true);
    try {
      if (Object.keys(body).length)
        await adminRequest(
          "/api/orders/admin/" + encodeURIComponent(id) + "/shipping",
          { method: "PATCH", body },
        );
      const fresh = await adminRequest(
        "/api/orders/admin/" + encodeURIComponent(id) + "/costs",
      );
      if (Object.entries(body).some(([key, value]) => Number(fresh.data?.summary?.[key]) !== value))
        throw new Error("تعذر تأكيد التكاليف المحفوظة.");
      resource.reload();
      await onSaved?.();
      setNotice("تم تحديث تقرير التكاليف من الخادم.");
    } catch (e) {
      setNotice(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <ResourceState resource={resource} onLogin={onSessionExpired} />
      {notice && (
        <p role="status" className="op-notice">
          {notice}
        </p>
      )}
      {summary && (
        <div className="op-detail-layout op-cost-layout">
          <Panel title="تكلفة المنتجات">
            <div className="op-table-scroll">
              <table className="op-table op-items-table">
                <thead>
                  <tr>
                    {[
                      "المنتج",
                      "المصدر",
                      "الكمية",
                      "السعر",
                      "التكلفة",
                      "الإجمالي",
                      "الربح",
                    ].map((x) => (
                      <th key={x}>{x}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row.id}>
                      <td>{row.productName}</td>
                      <td>{row.supplierName || "المنصة"}</td>
                      <td>{row.quantity}</td>
                      <td>
                        <Money value={row.unitPrice} />
                      </td>
                      <td>
                        <Money value={row.unitCost} />
                      </td>
                      <td>
                        <Money value={row.lineTotal} />
                      </td>
                      <td>
                        <Money value={row.profit} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
          <Panel className="op-cost-summary">
            <div className="op-profit">
              <span>صافي الربح</span>
              <b>
                <Money value={summary.netProfit} />
              </b>
              <small>
                {summary.netMarginPercent != null
                  ? `هامش الربح ${summary.netMarginPercent}%`
                  : ""}
              </small>
            </div>
            {summary.isPartial && (
              <p role="status">
                التقرير جزئي؛ بعض المنتجات ليس لها تكلفة مسجلة.
              </p>
            )}
            <dl className="op-totals">
              {[
                ["totalSales", "إجمالي المبيعات"],
                ["productsCost", "تكلفة المنتجات"],
                ["shippingCost", "تكلفة الشحن"],
                ["packagingCost", "التغليف"],
                ["extraFees", "رسوم إضافية أخرى"],
                ["supplierCommissions", "نسبة المورد"],
                ["paymentFees", "رسوم بوابة الدفع"],
                ["totalCosts", "إجمالي التكاليف"],
              ].map(([key, label]) => (
                <div key={key}>
                  <dt>{label}</dt>
                  <dd>
                    {["shippingCost", "packagingCost", "extraFees"].includes(
                      key,
                    ) ? (
                      <input
                        aria-label={label}
                        disabled={busy}
                        type="number"
                        min="0"
                        step=".01"
                        value={draft[key] ?? ""}
                        onChange={(e) =>
                          setDraft({ ...draft, [key]: e.target.value })
                        }
                      />
                    ) : (
                      <Money
                        value={
                          key === "paymentFees"
                            ? summary.paymentFees?.amount
                            : summary[key]
                        }
                      />
                    )}
                  </dd>
                </div>
              ))}
            </dl>
            <button
              className="op-primary op-wide"
              disabled={busy}
              onClick={save}
            >
              حفظ و تحديث التقرير
            </button>
          </Panel>
        </div>
      )}
    </>
  );
}
