import React, { useEffect, useState } from "react";
import useAdminResource from "./use-admin-resource";
import { ResourceState } from "./orders-ui";
import { queryString } from "./admin-api";
import {
  SupplierIcon,
  SupplierPanel,
  SupplierStats,
  SupplierField,
  SupplierButton,
  SupplierBadge,
  SupplierLogo,
  SupplierMoney,
  SupplierTable,
  SupplierPager,
  SupplierModal,
  SupplierChart,
  SupplierDonut,
  text,
} from "./supplier-ui";
import {
  SupplierEditor,
  SupplierBalance,
  SupplierInvoice,
} from "./SupplierForms";
import SupplierAccountAction from "./SupplierAccountAction";
import SupplierTickets from "./SupplierTickets";
import PricingDetails from "./PricingDetails";
const date = (v) =>
  v
    ? new Intl.DateTimeFormat("ar-EG", {
        dateStyle: "medium",
        timeZone: "Asia/Riyadh",
      }).format(new Date(v))
    : "—";
export default function SupplierDetails({ id, onBack, onSessionExpired }) {
  const [tab, setTab] = useState("basic"),
    [revision, setRevision] = useState(0),
    [dialog, setDialog] = useState(null);
  const resource = useAdminResource(
      "/api/suppliers/admin/" + encodeURIComponent(id),
      revision,
    ),
    row = resource.data?.data;
  const stats = useAdminResource(
    "/api/suppliers/admin/" + encodeURIComponent(id) + "/stats",
    revision,
  );
  const metrics = stats.data?.data;
  const refresh = () => setRevision((n) => n + 1);
  return (
    <div className="su-page su-details">
      <ResourceState resource={resource} onLogin={onSessionExpired} />
      {row && (
        <>
          <ResourceState resource={stats} onLogin={onSessionExpired} />
          <SupplierPanel className="su-detail-hero">
            <svg
              viewBox="55 149 1078 151"
              className="su-detail-banner"
              preserveAspectRatio="xMidYMid slice"
              aria-hidden="true"
            >
              <image
                href="/supplier-reference/Suppliers Details-3.png"
                width="1440"
                height="1415"
              />
            </svg>
            <div className="su-detail-identity">
              <div className="su-detail-name">
                <SupplierLogo supplier={row} size={112} />
                <div>
                  <h1>{row.name}</h1>
                  <div className="su-detail-meta">
                    <span>تقييم المورد</span>
                    <span className="rating">★ {text(row.rating)}</span>
                    <span className="su-badge pending">
                      {row.open_tickets_count == null
                        ? "التذاكر"
                        : row.open_tickets_count + " تذاكر معلقة"}
                    </span>
                    <span>عضو منذ: {date(row.created_at)}</span>
                  </div>
                </div>
              </div>
              <div className="su-detail-actions">
                <button
                  onClick={() => setDialog("delete")}
                  title="حذف المورد"
                  aria-label="حذف المورد"
                >
                  <SupplierIcon name="trash" size={39} />
                </button>
                <SupplierButton
                  secondary
                  onClick={() => setDialog("account")}
                  title="إيقاف أو إعادة تفعيل المورد"
                >
                  <SupplierBadge
                    status={
                      row.account_status === "suspended"
                        ? "rejected"
                        : row.account_status === "deleted"
                          ? "inactive"
                          : row.approval_status
                    }
                    label={
                      row.account_status === "deleted" ? "محذوف" : undefined
                    }
                  />
                  <SupplierIcon name="chevron" size={13} />
                </SupplierButton>
                <SupplierButton onClick={() => setDialog("balance")}>
                  تسوية الرصيد
                </SupplierButton>
              </div>
            </div>
          </SupplierPanel>
          <SupplierStats
            items={[
              {
                label: "طلب تسعير أجاب عليه",
                value: metrics?.response?.quotations,
                icon: "replied",
              },
              {
                label: "تسعير مقبول",
                value: metrics?.response?.accepted,
                icon: "confirmed",
                tint: "purple",
              },
              {
                label: "نسبة قبول التسعيرات",
                value:
                  metrics?.response?.acceptanceRate != null
                    ? metrics.response.acceptanceRate + "%"
                    : null,
                icon: "response",
                tint: "green",
              },
              {
                label: "وقت الرد",
                value:
                  metrics?.response?.avgMinutes != null
                    ? metrics.response.avgMinutes + " دقيقة"
                    : null,
                icon: "duration",
                tint: "pink",
              },
              {
                label: "قيمة الطلبات المؤكدة",
                value: metrics?.earnings?.acceptedCustomerAmount,
                icon: "amount",
                tint: "yellow",
                money: true,
              },
              {
                label: "الرصيد المتبقي",
                value: row.wallet_balance,
                icon: "balance",
                tint: "red",
                money: true,
              },
            ]}
          />
          <div className="su-detail-tabs">
            {[
              ["basic", "البيانات الأساسية"],
              ["pricing", "طلبات التسعير"],
              ["finance", "المالية والأرصدة"],
              ["tickets", "التذاكر"],
            ].map(([key, label]) => (
              <button
                key={key}
                className={tab === key ? "active" : ""}
                onClick={() => setTab(key)}
              >
                {label}
              </button>
            ))}
          </div>
          {tab === "basic" ? (
            <SupplierBasic
              row={row}
              onEdit={() => setDialog("edit")}
              onSessionExpired={onSessionExpired}
            />
          ) : tab === "pricing" ? (
            <SupplierPricing id={id} onSessionExpired={onSessionExpired} />
          ) : tab === "finance" ? (
            <SupplierFinance
              metrics={metrics}
              id={id}
              onSessionExpired={onSessionExpired}
              onInvoice={(value) => setDialog(value)}
            />
          ) : (
            <SupplierTickets
              supplier={row}
              onSessionExpired={onSessionExpired}
            />
          )}
          {["delete", "account"].includes(dialog) && (
            <SupplierAccountAction
              supplier={row}
              kind={dialog}
              onClose={() => setDialog(null)}
              onSaved={() => {
                setDialog(null);
                if (dialog === "delete") onBack();
                else refresh();
              }}
            />
          )}
          {dialog === "balance" && (
            <SupplierBalance
              supplier={row}
              onClose={() => setDialog(null)}
              onChanged={refresh}
            />
          )}{" "}
          {dialog === "edit" && (
            <SupplierEditor
              supplier={row}
              onClose={() => setDialog(null)}
              onSaved={() => {
                setDialog(null);
                refresh();
              }}
            />
          )}
          {typeof dialog === "object" && dialog && (
            <SupplierInvoice
              id={dialog.settlementId}
              transaction={dialog.transaction}
              onClose={() => setDialog(null)}
              onSessionExpired={onSessionExpired}
            />
          )}
        </>
      )}
    </div>
  );
}
function Fact({ icon, label, value }) {
  return (
    <div className="su-fact">
      <span>
        <SupplierIcon name={icon} size={23} />
      </span>
      <div>
        <small>{label}</small>
        <p>{value ?? "—"}</p>
      </div>
    </div>
  );
}
function SupplierBasic({ row, onEdit, onSessionExpired }) {
  const [image, setImage] = useState(false);
  const makes = useAdminResource("/api/car-makes/admin"),
    quality = useAdminResource("/api/suppliers/quality-tiers");
  const m = Array.isArray(makes.data?.data)
      ? makes.data.data
      : makes.data?.data?.items || [],
    q = Array.isArray(quality.data?.data)
      ? quality.data.data
      : quality.data?.data?.items || quality.data?.data?.tiers || [];
  const edit = (
    <button aria-label="تعديل البيانات" onClick={onEdit}>
      <SupplierIcon name="edit" size={39} />
    </button>
  );
  return (
    <>
      <SupplierPanel title="البيانات الأساسية" action={edit}>
        <div className="su-facts">
          <Fact
            label="اسم المورد"
            value={text(row.contact_name || row.owner_name)}
            icon="person"
          />
          <Fact label="اسم الشركة" value={row.name} icon="building" />
          <Fact label="البريد الإلكتروني" value={row.email} icon="mail" />
          <Fact label="رقم الجوال" value={row.phone} icon="phone" />
          <Fact
            label="العنوان"
            value={[row.city, row.address].filter(Boolean).join(" — ") || null}
            icon="location"
          />
          <Fact
            label="صورة الهوية"
            value={
              row.identity_document_url ? (
                <button onClick={() => setImage(true)}>
                  تم إرفاق 1 صورة <SupplierIcon name="eye" size={25} />
                </button>
              ) : (
                "لم يتم إرفاق صورة"
              )
            }
            icon="image"
          />
        </div>
      </SupplierPanel>
      <SupplierPanel title="المعلومات البنكية" action={edit}>
        <div className="su-facts">
          <Fact label="اسم البنك" value={row.bank_name} icon="bank" />
          <Fact
            label="اسم صاحب الحساب"
            value={row.bank_account_name}
            icon="account"
          />
          <Fact label="رقم الآيبان" value={row.iban} icon="card" />
          <Fact
            label="مدة التسوية"
            value={
              row.settlement_days != null ? row.settlement_days + " يوم" : null
            }
            icon="clock"
          />
        </div>
      </SupplierPanel>
      <SupplierPanel title="الشركات والجودات">
        <div className="su-chips">
          {(row.supported_make_ids || [])
            .map((id) => m.find((x) => x.id === id))
            .filter(Boolean)
            .map((x) => (
              <span className="su-chip su-name" key={x.id}>
                {x.logo_url && (
                  <img
                    src={x.logo_url}
                    alt=""
                    width="27"
                    height="27"
                    style={{ objectFit: "contain" }}
                  />
                )}
                {x.name_ar || x.name_en}
              </span>
            ))}
          {!(row.supported_make_ids || []).length && (
            <span className="su-muted">—</span>
          )}
        </div>
        <div className="su-chips su-detail-qualities">
          {(row.supported_qualities || []).map((code, i) => (
            <span
              className={
                "su-chip " + (i === 0 ? "green" : i === 2 ? "orange" : "")
              }
              key={code}
            >
              {q.find((x) => (x.code || x.id) === code)?.nameAr ||
                q.find((x) => (x.code || x.id) === code)?.name_ar ||
                code}
            </span>
          ))}
        </div>
      </SupplierPanel>
      <div className="su-two-charts">
        <SupplierPanel
          title={
            <span className="su-chart-title">منحنى الطلبات وطلبات التسعير</span>
          }
          action={
            <select className="su-period" disabled>
              <option>الشهري</option>
            </select>
          }
        >
          <SupplierChart
            items={row.monthly_trend || []}
            valueKey="quotationsCount"
            secondaryKey="ordersCount"
            labelKey="month"
          />
          <div className="su-chart-legend">
            <span>
              <i />
              طلبات التسعير
            </span>
            <span>
              <i />
              تسعيرات مؤكدة من العملاء
            </span>
          </div>
        </SupplierPanel>
        <SupplierPanel
          title={
            <span className="su-chart-title">منحنى الطلبات وطلبات التسعير</span>
          }
          action={
            <select className="su-period" disabled>
              <option>الشهري</option>
            </select>
          }
        >
          <SupplierChart
            kind="bar"
            items={row.make_statistics || []}
            valueKey="count"
            labelKey="name"
          />
        </SupplierPanel>
      </div>
      {image && (
        <SupplierModal
          title="صورة الهوية"
          small
          onClose={() => setImage(false)}
        >
          <img
            src={row.identity_document_url}
            alt="صورة هوية المورد"
            style={{ width: "100%", maxHeight: "65vh", objectFit: "contain" }}
          />
        </SupplierModal>
      )}
    </>
  );
}
function SupplierPricing({ id, onSessionExpired }) {
  const [page, setPage] = useState(1),
    [search, setSearch] = useState(""),
    [type, setType] = useState(""),
    [status, setStatus] = useState(""),
    [selected, setSelected] = useState([]),
    [detail, setDetail] = useState(null);
  const resource = useAdminResource(
    "/api/pricing-requests/admin?" +
      queryString({
        supplierId: id,
        limit: 5,
        offset: (page - 1) * 5,
        search,
        pricingType: type,
        status,
      }),
  );
  const rows = Array.isArray(resource.data?.data) ? resource.data.data : [];
  if (detail)
    return (
      <PricingDetails
        id={detail}
        onBack={() => setDetail(null)}
        backLabel="طلبات تسعير المورد"
        onChanged={resource.reload}
        onSessionExpired={onSessionExpired}
      />
    );
  return (
    <>
      <SupplierStats
        className="su-pricing-mini"
        items={[
          {
            label: "إجمالي المبيعات",
            value: null,
            money: true,
            icon: "duration",
          },
          {
            label: "إجمالي الأرباح",
            value: null,
            money: true,
            icon: "replied",
          },
          {
            label: "مستحق للمورد",
            value: null,
            money: true,
            icon: "confirmed",
          },
          { label: "مستحق للقطع", value: null, money: true, icon: "balance" },
        ]}
      />
      <SupplierPanel>
        <div className="su-panel-heading">
          <h2>طلبات التسعير</h2>
          <div className="su-controls">
            <SupplierField label="البحث">
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="البحث برقم الطلب، اسم المورد، المركبة ..."
              />
            </SupplierField>
            <SupplierField label="نوع التسعير">
              <select
                value={type}
                onChange={(e) => {
                  setType(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">نوع التسعير</option>
                <option value="free">مجاني</option>
                <option value="normal">عادي</option>
                <option value="express">سريع</option>
              </select>
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
                <option value="open">في التسعير</option>
                <option value="quoted">تم التسعير</option>
                <option value="closed">مغلق</option>
              </select>
            </SupplierField>
          </div>
        </div>
        <ResourceState resource={resource} onLogin={onSessionExpired} />
        {resource.data && (
          <>
            <SupplierTable
              head={[
                <input
                  type="checkbox"
                  aria-label="تحديد كل طلبات التسعير"
                  checked={
                    rows.length > 0 &&
                    rows.every((x) => selected.includes(x.id))
                  }
                  onChange={(e) =>
                    setSelected(e.target.checked ? rows.map((x) => x.id) : [])
                  }
                />,
                "رقم الطلب",
                "نوع القطعة",
                "نوع التسعير",
                "ربح التسعير",
                "سعر المورد",
                "حالة التسعير",
                "حالة الطلب",
                "سعر البيع",
                "عمولة",
                "الإجراءات",
              ]}
            >
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={"تحديد " + row.request_number}
                      checked={selected.includes(row.id)}
                      onChange={(e) =>
                        setSelected(
                          e.target.checked
                            ? [...selected, row.id]
                            : selected.filter((x) => x !== row.id),
                        )
                      }
                    />
                  </td>
                  <td>
                    <button
                      className="su-blue-link"
                      onClick={() => setDetail(row.id)}
                    >
                      {row.request_number}
                    </button>
                  </td>
                  <td>
                    {row.request_type === "used"
                      ? "قطعة مستعملة"
                      : row.request_type === "new"
                        ? "قطعة أصلية"
                        : text(row.request_type)}
                  </td>
                  <td>
                    <span className={"su-pricing-type " + row.pricing_type}>
                      {{ free: "مجاني", normal: "عادي", express: "سريع" }[
                        row.pricing_type
                      ] || row.pricing_type}
                    </span>
                  </td>
                  <td>—</td>
                  <td>
                    <SupplierMoney value={row.lowest_total} />
                  </td>
                  <td>
                    <SupplierBadge
                      status={row.status}
                      label={row.status_label}
                    />
                  </td>
                  <td>
                    <SupplierBadge
                      status={
                        row.accepted_items_count > 0 ? "confirmed" : "pending"
                      }
                      label={
                        row.accepted_items_count > 0 ? "مؤكد" : "لم يتم تأكيد"
                      }
                    />
                  </td>
                  <td>
                    <SupplierMoney value={row.accepted_total} />
                  </td>
                  <td>—</td>
                  <td>
                    <button
                      aria-label={"عرض " + row.request_number}
                      onClick={() => setDetail(row.id)}
                    >
                      <SupplierIcon name="eye" size={34} />
                    </button>
                  </td>
                </tr>
              ))}
            </SupplierTable>
            {!rows.length && (
              <p className="su-empty">لا توجد طلبات تسعير للمورد.</p>
            )}
            <SupplierPager
              page={page}
              total={resource.data.meta?.total}
              onChange={setPage}
            />
          </>
        )}
      </SupplierPanel>
    </>
  );
}
function SupplierFinance({ id, metrics, onSessionExpired, onInvoice }) {
  const [page, setPage] = useState(1);
  const wallet = useAdminResource(
      "/api/suppliers/admin/" + encodeURIComponent(id) + "/wallet",
    ),
    transactions = useAdminResource(
      "/api/suppliers/admin/" +
        encodeURIComponent(id) +
        "/transactions?limit=5&offset=" +
        (page - 1) * 5,
    ),
    settlements = useAdminResource(
      "/api/suppliers/admin/settlements?" +
        queryString({ supplierId: id, limit: 5, offset: 0 }),
    );
  const data = wallet.data?.data,
    rows = Array.isArray(transactions.data?.data) ? transactions.data.data : [];
  const settlementRows = Array.isArray(settlements.data?.data)
    ? settlements.data.data
    : settlements.data?.data?.items || [];
  return (
    <>
      <SupplierPanel title="رصيد نسبة الربح" className="su-detail-finance">
        <ResourceState resource={wallet} onLogin={onSessionExpired} />
        <SupplierStats
          items={[
            {
              label: "إجمالي أرباح التسعير",
              value: metrics?.earnings?.commissionsTotal,
              icon: "replied",
              money: true,
            },
            {
              label: "عمولة من الطلبات",
              value: data?.totalEarned,
              icon: "replied",
              money: true,
            },
            {
              label: "قيمة طلبات المورد المقبولة",
              value: metrics?.earnings?.acceptedSupplierAmount,
              icon: "replied",
              money: true,
            },
          ]}
        />
      </SupplierPanel>
      <div className="su-two-charts">
        <SupplierPanel title="منحنى الإيرادات والطلبات وطلبات التسعير">
          <SupplierChart items={[]} valueKey="value" />
          <div className="su-chart-legend">
            <span>
              <i />
              تسعير مجاني
            </span>
            <span>
              <i style={{ background: "#ffa339" }} />
              تسعير عادي
            </span>
            <span>
              <i style={{ background: "#f00" }} />
              تسعير سريع
            </span>
          </div>
        </SupplierPanel>
        <SupplierPanel title="توزيع الأرباح حسب النوع">
          <SupplierDonut
            items={(metrics?.earnings?.commissions || []).map((x) => ({
              label:
                { free: "مجاني", normal: "عادي", express: "سريع" }[
                  x.pricingType
                ] || x.pricingType,
              value: Number(x.amount),
            }))}
            total={metrics?.earnings?.commissionsTotal}
            label=""
          />
          <div className="su-chart-legend">
            <span>
              <i />
              مجاني
            </span>
            <span>
              <i style={{ background: "#ffa339" }} />
              عادي
            </span>
            <span>
              <i style={{ background: "#f00" }} />
              سريع
            </span>
          </div>
        </SupplierPanel>
      </div>
      <SupplierPanel title="أرباح التسعير حسب النوع">
        <div className="su-profit-types">
          {[
            ["مجاني", "blue"],
            ["عادي", "yellow"],
            ["سريع", "red"],
          ].map(([label, color], index) => (
            <div className={"su-profit-card " + color} key={label}>
              <strong>
                <SupplierMoney
                  value={
                    metrics?.earnings?.commissions?.find(
                      (x) =>
                        x.pricingType === ["free", "normal", "express"][index],
                    )?.amount
                  }
                />
              </strong>
              <span>تسعير {label}</span>
              <p>
                أصلي <SupplierMoney value={null} />
              </p>
              <p>
                بديل <SupplierMoney value={null} />
              </p>
            </div>
          ))}
        </div>
      </SupplierPanel>
      <SupplierPanel title="سجل المعاملات المالية">
        <ResourceState resource={transactions} onLogin={onSessionExpired} />
        {transactions.data && (
          <>
            <SupplierTable
              head={[
                "التاريخ",
                "المعاملة",
                "المبلغ",
                "رقم الحساب",
                "حالة",
                "الإجراءات",
              ]}
            >
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{date(row.created_at)}</td>
                  <td>
                    {row.description ||
                      {
                        settlement: "تسوية الرصيد",
                        deduction: "خصم رصيد",
                        adjustment: "إضافة رصيد",
                        commission: "عمولة",
                      }[row.type] ||
                      row.type}
                  </td>
                  <td>
                    <SupplierMoney value={row.amount} />
                  </td>
                  <td>{text(data?.iban)}</td>
                  <td>
                    <SupplierBadge
                      status={row.status || "confirmed"}
                      label={row.status ? undefined : "مسجلة"}
                    />
                  </td>
                  <td>
                    <button
                      aria-label={"تفاصيل المعاملة " + row.id}
                      onClick={() =>
                        onInvoice({
                          transaction: row,
                          settlementId:
                            row.settlement_id ||
                            settlementRows.find(
                              (x) => x.wallet_transaction_id === row.id,
                            )?.id,
                        })
                      }
                    >
                      <SupplierIcon name="eye" size={34} />
                    </button>
                  </td>
                </tr>
              ))}
            </SupplierTable>
            {!rows.length && <p className="su-empty">لا توجد معاملات مالية.</p>}
            <SupplierPager
              page={page}
              total={transactions.data.meta?.total}
              onChange={setPage}
            />
          </>
        )}
      </SupplierPanel>
    </>
  );
}
