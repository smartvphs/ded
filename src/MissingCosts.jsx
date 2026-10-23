import React, { useState } from "react";
import useAdminResource from "./use-admin-resource";
import { queryString } from "./admin-api";
import { ResourceState, Money, dateText } from "./orders-ui";
import ManualItemCost from "./ManualItemCost";
export default function MissingCosts({
  period,
  account,
  onSessionExpired,
  onChanged,
}) {
  const [page, setPage] = useState(1),
    [revision, setRevision] = useState(0),
    [editor, setEditor] = useState(null);
  const resource = useAdminResource(
      "/api/admin/reports/missing-costs?" +
        queryString({ ...period, limit: 20, offset: (page - 1) * 20 }),
      revision,
    ),
    rawData = resource.data?.data,
    valid =
      rawData == null ||
      (Array.isArray(rawData.items) &&
        Number.isFinite(rawData.pagination?.total)),
    data = valid ? rawData : null,
    canEdit =
      account?.isSuperAdmin || account?.permissions?.includes("orders.manage");
  return (
    <section className="finance-table-card">
      <h2>مبيعات بتكلفة غير مسجلة</h2>
      <p className="support-api-note">
        إجمالي المبيعات غير المعروفة التكلفة في الفترة:{" "}
        <Money value={data?.totalSales} />
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
      {data && (
        <>
          <div className="finance-table-scroll">
            <table className="finance-table">
              <thead>
                <tr>
                  {[
                    "الطلب",
                    "المنتج",
                    "رقم القطعة",
                    "المورد",
                    "الكمية",
                    "سعر الوحدة",
                    "الإجمالي",
                    "الإجراء",
                  ].map((x) => (
                    <th key={x}>{x}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data.items || []).map((row) => (
                  <tr key={row.orderItemId}>
                    <td>{row.orderNumber}</td>
                    <td>{row.productName}</td>
                    <td>{row.partNumber || "—"}</td>
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
                        disabled={!canEdit}
                        className="pricing-primary"
                        onClick={() => setEditor(row)}
                      >
                        تسجيل التكلفة
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!data.items?.length && (
            <p className="pricing-empty">
              لا توجد بنود بتكلفة ناقصة خلال هذه الفترة.
            </p>
          )}
          <div className="pricing-pagination">
            <button disabled={page === 1} onClick={() => setPage((n) => n - 1)}>
              السابق
            </button>
            <span>{page}</span>
            <button
              disabled={
                !Number.isFinite(data.pagination?.total) ||
                page * 20 >= data.pagination.total
              }
              onClick={() => setPage((n) => n + 1)}
            >
              التالي
            </button>
          </div>
        </>
      )}
      {editor && (
        <ManualItemCost
          orderId={editor.orderId}
          itemId={editor.orderItemId}
          productName={editor.productName}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setRevision((n) => n + 1);
            onChanged();
          }}
        />
      )}
    </section>
  );
}
