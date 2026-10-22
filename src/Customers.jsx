import React, { useEffect, useState } from "react";
import {
  Plus,
  Search,
  MoreVertical,
  Eye,
  Edit3,
  Trash2,
  ShieldX,
  Users,
  Wallet,
  FileText,
  ShoppingBag,
} from "lucide-react";
import useAdminResource from "./use-admin-resource";
import { adminRequest, queryString } from "./admin-api";
import { Money, ResourceState, dateText, payments } from "./orders-ui";
import {
  CustomerAvatar,
  CustomerBadge,
  CustomerModal,
  CustomerInput,
  customerNumber,
} from "./customer-ui";
import {
  CustomerForm,
  CustomerMoneyForm,
  CustomerLocationForm,
} from "./CustomerForms";
import CustomerDetails from "./CustomerDetails";
import {
  customerPath,
  readCustomer,
  exportCustomers,
  customerNextStatus,
} from "./customer-api";
import { useMutation, Feedback } from "./ProductExtras";
import "./customers.css";
function CustomerAccountAction({ action, onClose, onSaved }) {
  const [reason, setReason] = useState(""),
    [committed, setCommitted] = useState(false),
    mutation = useMutation(),
    client = action.client,
    deleting = action.type === "delete",
    status = customerNextStatus(client);
  async function save(e) {
    e.preventDefault();
    await mutation.run(async () => {
      if (!committed) {
        if (reason.length > 300) throw new Error("سبب الحظر بحد أقصى 300 حرف.");
        await adminRequest(
          customerPath(client.id) + (deleting ? "" : "/status"),
          {
            method: deleting ? "DELETE" : "PATCH",
            ...(!deleting
              ? {
                  body: {
                    status,
                    ...(status === "blocked" && reason.trim()
                      ? { reason: reason.trim() }
                      : {}),
                  },
                }
              : {}),
          },
        );
        setCommitted(true);
      }
      let row;
      try {
        row = await readCustomer(client.id);
      } catch (error) {
        if (!deleting || error.status !== 404) throw error;
      }
      if (deleting ? row && row.status !== "deleted" : row?.status !== status)
        throw new Error("لم يتم تأكيد حالة العميل. أعد تحديث البيانات.");
      await onSaved(row || { id: client.id, status: "deleted" });
      onClose();
    });
  }
  return (
    <CustomerModal
      title={
        deleting
          ? "حذف العميل؟"
          : status === "blocked"
            ? "حظر العميل"
            : "تنشيط العميل"
      }
      onClose={onClose}
      busy={mutation.busy}
    >
      <form onSubmit={save}>
        <p>{client.name || "—"}</p>
        {deleting ? (
          <p className="customer-api-note">
            هيتم حذف الحساب وتعطيل الدخول ومسح بيانات التواصل المرتبطة به.
            الطلبات السابقة بتفضل محفوظة.
          </p>
        ) : (
          status === "blocked" && (
            <CustomerInput
              label="سبب الحظر"
              maxLength={300}
              value={reason}
              onChange={setReason}
              disabled={committed}
            />
          )
        )}
        <Feedback mutation={mutation} />
        {committed && (
          <p className="customer-api-note">
            تم إرسال العملية؛ إعادة المحاولة هتحدّث البيانات بدون تنفيذها تاني.
          </p>
        )}
        <div className="quote-modal-buttons">
          <button
            className={deleting ? "primary danger" : "pricing-primary"}
            disabled={mutation.busy}
          >
            {committed
              ? "تحديث البيانات"
              : deleting
                ? "تأكيد حذف العميل"
                : status === "blocked"
                  ? "تأكيد الحظر"
                  : "تأكيد التنشيط"}
          </button>
          <button
            className="pricing-back"
            type="button"
            disabled={mutation.busy}
            onClick={onClose}
          >
            إلغاء
          </button>
        </div>
      </form>
    </CustomerModal>
  );
}
export default function Customers({ onSessionExpired }) {
  const [search, setSearch] = useState(""),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState([]),
    [detailId, setDetailId] = useState(null),
    [menu, setMenu] = useState(null),
    [modal, setModal] = useState(null),
    [revision, setRevision] = useState(0),
    [notice, setNotice] = useState(""),
    [noticeError, setNoticeError] = useState(false),
    [exporting, setExporting] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
      setSelected([]);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    const close = (e) => {
      if (e.type === "keydown" && e.key !== "Escape") return;
      if (e.type === "keydown" || !e.target.closest(".customer-row-menu"))
        setMenu(null);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, []);
  useEffect(() => {
    const home = () => {
      setDetailId(null);
      setRevision((n) => n + 1);
    };
    window.addEventListener("mypart:customers-home", home);
    return () => window.removeEventListener("mypart:customers-home", home);
  }, []);
  const resource = useAdminResource(
      "/api/admin/customers?" +
        queryString({
          limit: 6,
          offset: (page - 1) * 6,
          search: query || undefined,
          status: filter === "all" ? undefined : filter,
          newDays: 30,
          sort: "created_at",
          order: "desc",
        }),
      revision,
    ),
    summary = useAdminResource("/api/admin/customers/summary", revision);
  const valid =
      resource.data && !Array.isArray(resource.data.data)
        ? { ...resource, error: new Error("رد قائمة العملاء غير صالح.") }
        : resource,
    rows = Array.isArray(resource.data?.data) ? resource.data.data : [],
    metrics = resource.data?.meta?.metrics || {},
    cards = summary.data?.data,
    total = resource.data?.meta?.total,
    pages = Math.max(1, Math.ceil(Number(total || 0) / 6));
  useEffect(() => {
    if (total != null && page > pages) setPage(pages);
  }, [total, page, pages]);
  const open = (type, client) => {
      setMenu(null);
      setModal({ type, client });
    },
    toggle = (id) =>
      setSelected((old) =>
        old.includes(id) ? old.filter((x) => x !== id) : [...old, id],
      );
  async function saved(row, created = false) {
    setNoticeError(false);
    setRevision((n) => n + 1);
    setNotice(
      created
        ? "تمت إضافة العميل. توثيق الجوال بيتم من حسابه."
        : "تم حفظ البيانات وتحديثها من الخادم.",
    );
    if (created) {
      setPage(1);
      setSearch("");
      setQuery("");
      setFilter("all");
    }
    if (row?.status === "deleted") {
      if (detailId === row.id) setDetailId(null);
      setSelected((old) => old.filter((id) => id !== row.id));
      setNotice("تم حذف حساب العميل.");
    }
  }
  async function exportFile() {
    if (exporting) return;
    setExporting(true);
    try {
      await exportCustomers({
        search: query || undefined,
        status: filter === "all" ? undefined : filter,
        newDays: 30,
        sort: "created_at",
        order: "desc",
      });
      setNoticeError(false);
      setNotice("تم تصدير نتائج البحث من الخادم.");
    } catch (error) {
      setNoticeError(true);
      setNotice(error.message);
    } finally {
      setExporting(false);
    }
  }
  return (
    <div className="customers-content">
      {notice && (
        <div
          className={
            "customer-api-notice" + (noticeError ? " customer-api-error" : "")
          }
          role={noticeError ? "alert" : "status"}
        >
          {notice}
          <button aria-label="إغلاق الرسالة" onClick={() => setNotice("")}>
            ×
          </button>
        </div>
      )}
      {detailId ? (
        <CustomerDetails
          key={detailId}
          id={detailId}
          revision={revision}
          onBack={() => {
            setDetailId(null);
            setRevision((n) => n + 1);
          }}
          onModal={open}
          onChanged={(message) => {
            setRevision((n) => n + 1);
            if (message) {
              setNoticeError(false);
              setNotice(message);
            }
          }}
          onSessionExpired={onSessionExpired}
        />
      ) : (
        <>
          <div className="pricing-heading">
            <h1>إدارة العملاء</h1>
            <div className="customer-header-actions">
              <button
                className="pricing-export"
                disabled={exporting}
                onClick={exportFile}
              >
                {exporting ? "جارٍ التصدير…" : "تصدير النتائج CSV"}
              </button>
              <button className="pricing-primary" onClick={() => open("add")}>
                <Plus size={16} />
                إضافة جديد
              </button>
            </div>
          </div>
          <ResourceState resource={summary} onLogin={onSessionExpired} />
          <section className="customer-list-stats">
            {[
              [cards?.customers?.total, "إجمالي العملاء", "blue", Users],
              [
                cards?.purchases?.amount,
                "مشتريات الفترة",
                "green",
                Wallet,
                true,
              ],
              [cards?.orders?.count, "طلبات الفترة", "pink", FileText],
              [
                cards?.abandonedCarts?.count,
                "سلة متروكة",
                "yellow",
                ShoppingBag,
              ],
            ].map(([v, label, color, Icon, money]) => (
              <div className={color} key={label}>
                <span className="stat-icon">
                  <Icon size={20} />
                </span>
                <b>{money ? <Money value={v} /> : customerNumber(v)}</b>
                <span>{label}</span>
              </div>
            ))}
          </section>
          {cards?.period && (
            <p className="customer-api-note">
              فترة المشتريات والطلبات: من {cards.period.from} إلى{" "}
              {cards.period.to} بتوقيت السعودية.
            </p>
          )}
          <section className="customer-panel">
            <div className="customer-toolbar">
              <div className="customer-filters">
                {[
                  ["all", "الكل", "total_customers"],
                  ["active", "نشط", "active_customers"],
                  ["new", "جديد", "new_customers"],
                  ["inactive", "غير نشط", "inactive_customers"],
                  ["blocked", "محظور", "blocked_customers"],
                  ["deleted", "محذوف", "deleted_customers"],
                ].map(([key, label, count]) => (
                  <button
                    key={key}
                    className={filter === key ? "selected" : ""}
                    title={
                      key === "new" ? "مسجلون خلال آخر 30 يومًا" : undefined
                    }
                    onClick={() => {
                      setFilter(key);
                      setPage(1);
                      setSelected([]);
                      setMenu(null);
                    }}
                  >
                    {label}
                    <span>{customerNumber(metrics[count])}</span>
                  </button>
                ))}
              </div>
              <label className="customer-search">
                <Search size={16} />
                <input
                  aria-label="البحث باسم العميل أو رقم الجوال"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="البحث بالاسم أو الإيميل أو رقم الجوال..."
                />
              </label>
            </div>
            <ResourceState resource={valid} onLogin={onSessionExpired} />
            <div className="customer-table-scroll">
              <table className="customer-table">
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        aria-label="تحديد كل العملاء الظاهرين"
                        checked={
                          rows.length > 0 &&
                          rows.every((c) => selected.includes(c.id))
                        }
                        onChange={(e) =>
                          setSelected((old) =>
                            e.target.checked
                              ? [...new Set([...old, ...rows.map((c) => c.id)])]
                              : old.filter(
                                  (id) => !rows.some((c) => c.id === id),
                                ),
                          )
                        }
                      />
                    </th>
                    {[
                      "العميل",
                      "إجمالي الطلبات",
                      "بنود السلة المتروكة",
                      "وسيلة الدفع",
                      "التسعيرات",
                      "آخر طلب",
                      "الحالة",
                      "الإجراءات",
                    ].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((client) => (
                    <tr key={client.id}>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={"تحديد العميل " + client.id}
                          checked={selected.includes(client.id)}
                          onChange={() => toggle(client.id)}
                        />
                      </td>
                      <td>
                        <button
                          className="customer-name"
                          onClick={() => setDetailId(client.id)}
                        >
                          <CustomerAvatar client={client} />
                          <span>
                            {client.name || "—"}
                            <small dir="ltr">
                              {client.phone || client.email || "—"}
                            </small>
                          </span>
                        </button>
                      </td>
                      <td>
                        <span
                          className={
                            Number(client.orders_count) > 25
                              ? "customer-high-orders"
                              : ""
                          }
                        >
                          {customerNumber(client.orders_count)}
                        </span>
                      </td>
                      <td>{customerNumber(client.abandoned_cart_items)} بند</td>
                      <td>
                        <span className="customer-payment">
                          {payments[
                            client.top_payment_method ||
                              client.last_payment_method
                          ] ||
                            client.top_payment_method ||
                            client.last_payment_method ||
                            "—"}
                        </span>
                      </td>
                      <td>
                        {customerNumber(client.pricing_requests_count)} تسعير
                      </td>
                      <td>{dateText(client.last_order_at)}</td>
                      <td>
                        <CustomerBadge customer={client} />
                      </td>
                      <td>
                        <div className="customer-row-menu">
                          <button
                            aria-label={"خيارات العميل " + client.id}
                            onClick={() =>
                              setMenu(menu === client.id ? null : client.id)
                            }
                          >
                            <MoreVertical size={18} />
                          </button>
                          {menu === client.id && (
                            <div className="customer-context">
                              <button
                                onClick={() => {
                                  setDetailId(client.id);
                                  setMenu(null);
                                }}
                              >
                                <Eye size={13} />
                                تفاصيل العميل
                              </button>
                              <button
                                disabled={client.status === "deleted"}
                                onClick={() => open("edit", client)}
                              >
                                <Edit3 size={13} />
                                تعديل العميل
                              </button>
                              <button
                                className="danger-text"
                                disabled={client.status === "deleted"}
                                onClick={() => open("status", client)}
                              >
                                <ShieldX size={13} />
                                {client.status === "blocked"
                                  ? "تنشيط العميل"
                                  : "حظر العميل"}
                              </button>
                              <button
                                className="danger-text"
                                disabled={client.status === "deleted"}
                                onClick={() => open("delete", client)}
                              >
                                <Trash2 size={13} />
                                حذف العميل
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!valid.loading && !valid.error && !rows.length && (
                <p className="pricing-empty">لا يوجد عملاء مطابقون للبحث.</p>
              )}
            </div>
            <div className="pricing-pagination">
              <button
                disabled={page <= 1 || resource.loading}
                onClick={() => setPage((n) => n - 1)}
              >
                السابق
              </button>
              {[...new Set([1, 2, 3, page, pages])]
                .filter((n) => n <= pages)
                .sort((a, b) => a - b)
                .map((n) => (
                  <button
                    key={n}
                    className={page === n ? "selected" : ""}
                    onClick={() => setPage(n)}
                  >
                    {n}
                  </button>
                ))}
              <button
                disabled={page >= pages || resource.loading}
                onClick={() => setPage((n) => n + 1)}
              >
                التالي
              </button>
            </div>
          </section>
        </>
      )}
      {["add", "edit"].includes(modal?.type) && (
        <CustomerForm
          id={modal.client?.id}
          onClose={() => setModal(null)}
          onSaved={saved}
          onSessionExpired={onSessionExpired}
        />
      )}
      {["balance", "cashback"].includes(modal?.type) && (
        <CustomerMoneyForm
          client={modal.client}
          mode={modal.type}
          onClose={() => setModal(null)}
          onSaved={saved}
          onSessionExpired={onSessionExpired}
        />
      )}{" "}
      {["vehicle", "address"].includes(modal?.type) && (
        <CustomerLocationForm
          client={modal.client}
          type={modal.type}
          onClose={() => setModal(null)}
          onSaved={saved}
          onSessionExpired={onSessionExpired}
        />
      )}{" "}
      {["status", "delete"].includes(modal?.type) && (
        <CustomerAccountAction
          action={modal}
          onClose={() => setModal(null)}
          onSaved={saved}
        />
      )}
    </div>
  );
}
