import React, { useEffect, useState } from "react";
import useAdminResource from "./use-admin-resource";
import { queryString } from "./admin-api";
import { PricingDialog } from "./pricing-ui";
import { ResourceState, Money } from "./orders-ui";
import ManualItemCost from "./ManualItemCost";
export default function MissingCostsDialog({
  period,
  account,
  onClose,
  onChanged,
  onSessionExpired,
}) {
  const [page, setPage] = useState(1),
    [revision, setRevision] = useState(0),
    [editing, setEditing] = useState(null);
  const resource = useAdminResource(
      "/api/admin/reports/missing-costs?" +
        queryString({ ...period, limit: 10, offset: (page - 1) * 10 }),
      revision,
    ),
    data = resource.data?.data;
  const valid =
      !data ||
      (Array.isArray(data.items) &&
        Number.isFinite(data.pagination?.total) &&
        data.pagination.total >= 0),
    total = valid ? data?.pagination.total : 0,
    canEdit = !!(
      account?.isSuperAdmin || account?.permissions?.includes("orders.manage")
    );
  useEffect(() => {
    if (valid && data && page > Math.max(1, Math.ceil(total / 10)))
      setPage(Math.max(1, Math.ceil(total / 10)));
  }, [total, page, data, valid]);
  if (editing)
    return (
      <ManualItemCost
        orderId={editing.orderId}
        itemId={editing.orderItemId}
        productName={editing.productName}
        onClose={() => setEditing(null)}
        onSaved={async () => {
          setRevision((n) => n + 1);
          await onChanged();
        }}
      />
    );
  return (
    <PricingDialog title="المبيعات ذات التكلفة الناقصة" onClose={onClose}>
      <p className="finance-api-note">
        نفس الفترة المختارة في التقرير: {period.from} — {period.to}، بتوقيت
        السعودية.
      </p>
      <ResourceState
        resource={
          valid
            ? resource
            : {
                ...resource,
                error: new Error("رد التكاليف الناقصة غير مكتمل."),
              }
        }
        onLogin={onSessionExpired}
      />
      {data && valid && (
        <>
          <p className="finance-api-note">
            إجمالي المبيعات غير المعروفة التكلفة:{" "}
            <Money value={data.totalSales} />
          </p>
          <div className="finance-table-scroll">
            <table className="finance-table">
              <thead>
                <tr>
                  {[
                    "الطلب",
                    "المنتج",
                    "المورد",
                    "الكمية",
                    "سعر الوحدة",
                    "الإجمالي",
                    "التكلفة",
                  ].map((t) => (
                    <th key={t}>{t}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.items.map((row) => (
                  <tr key={row.orderItemId}>
                    <td>{row.orderNumber}</td>
                    <td>
                      {row.productName}
                      <small>
                        {row.partNumber ? " — " + row.partNumber : ""}
                      </small>
                    </td>
                    <td>{row.supplierName || "—"}</td>
                    <td>{row.quantity}</td>
                    <td>
                      <Money value={row.unitPrice} />
                    </td>
                    <td>
                      <Money value={row.lineTotal} />
                    </td>
                    <td>
                      <button
                        className="pricing-back"
                        disabled={!canEdit}
                        title={
                          !canEdit
                            ? "تحتاج صلاحية إدارة الطلبات لتسجيل التكلفة."
                            : undefined
                        }
                        onClick={() => setEditing(row)}
                      >
                        تسجيل التكلفة
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!data.items.length && (
            <p className="finance-api-note">
              لا توجد مبيعات بتكاليف ناقصة خلال الفترة.
            </p>
          )}
          <div className="pricing-pagination">
            <button
              disabled={page === 1 || resource.loading}
              onClick={() => setPage((n) => n - 1)}
            >
              السابق
            </button>
            <span>
              {page} / {Math.max(1, Math.ceil(total / 10))}
            </span>
            <button
              disabled={resource.loading || page * 10 >= total}
              onClick={() => setPage((n) => n + 1)}
            >
              التالي
            </button>
          </div>
        </>
      )}
    </PricingDialog>
  );
}
