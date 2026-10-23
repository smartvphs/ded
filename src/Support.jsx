import SupportIssueTypes from "./SupportIssueTypes";
import { issueTypeRows } from "./support-issue-types";
import SupportAvatar from "./SupportAvatar";
import React, { useEffect, useState } from "react";
import { Search, Plus, ArrowRight, RefreshCw } from "lucide-react";
import useAdminResource from "./use-admin-resource";
import { ResourceState } from "./orders-ui";
import {
  ticketsPath,
  ticketStatuses,
  ticketPriorities,
  supportDate,
  supportNumber,
} from "./support-api";
import SupportTicket, { TicketBadge } from "./SupportTicket";
import "./support.css";
export default function Support({ onSessionExpired }) {
  const [search, setSearch] = useState(""),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState(""),
    [source, setSource] = useState(""),
    [priority, setPriority] = useState(""),
    [category, setCategory] = useState(""),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState(null),
    [revision, setRevision] = useState(0),
    [busy, setBusy] = useState(false),
    [uncertain, setUncertain] = useState([]),
    [types, setTypes] = useState(false),
    [categories, setCategories] = useState({}),
    [period, setPeriod] = useState({}),
    [dates, setDates] = useState({ from: "", to: "" }),
    [dateError, setDateError] = useState("");
  const publicTypes = useAdminResource(
    "/api/support-tickets/categories",
    revision,
  );
  let publicRows = [],
    publicError = null;
  if (publicTypes.data) {
    try {
      publicRows = issueTypeRows(publicTypes.data);
    } catch (error) {
      publicError = error;
    }
  }
  const typeNames = {
    ...categories,
    ...Object.fromEntries(publicRows.map((row) => [row.code, row.name])),
  };
  const resource = useAdminResource(
      ticketsPath({
        search: query,
        status,
        source,
        priority,
        category,
        ...period,
        page,
      }),
      revision,
    ),
    valid =
      resource.data && !Array.isArray(resource.data.data?.items)
        ? { ...resource, error: new Error("رد قائمة التذاكر غير صالح.") }
        : resource,
    rows = Array.isArray(resource.data?.data?.items)
      ? resource.data.data.items
      : [],
    total = resource.data?.data?.total,
    pages = Math.max(1, Math.ceil(Number(total || 0) / 7)),
    counts = resource.data?.data?.countsByStatus,
    allCount = counts
      ? Object.values(counts).reduce(
          (sum, value) => sum + Number(value || 0),
          0,
        )
      : null;
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    if (total != null && page > pages) setPage(pages);
  }, [total, page, pages]);
  useEffect(() => {
    if (!resource.data || valid.error) return;
    setCategories((old) => ({
      ...old,
      ...Object.fromEntries(
        rows
          .filter((row) => row.category)
          .map((row) => [
            row.category,
            row.category_name || row.category_name_en || row.category,
          ]),
      ),
    }));
    if (!rows.some((row) => row.id === selected) && !busy)
      setSelected(rows[0]?.id || null);
  }, [resource.data, busy]);
  useEffect(() => {
    const home = () => {
      if (!busy) {
        setTypes(false);
        setRevision((n) => n + 1);
      }
    };
    window.addEventListener("mypart:support-home", home);
    return () => window.removeEventListener("mypart:support-home", home);
  }, [busy]);
  function filter(setter, value) {
    setter(value);
    setPage(1);
  }
  function applyDates(e) {
    e.preventDefault();
    if (dates.from && dates.to && dates.from > dates.to) {
      setDateError("بداية الفترة لازم تكون قبل نهايتها.");
      return;
    }
    setDateError("");
    setPeriod(dates);
    setPage(1);
  }
  return (
    <div className="support-content">
      <div className="pricing-heading">
        <h1>
          {types ? "أنواع مشكلات تذاكر المساعدة" : "إدارة تذاكر المساعدة"}
        </h1>
        <div className="support-heading-actions">
          <button
            className="pricing-back"
            disabled={busy}
            onClick={() => setRevision((n) => n + 1)}
          >
            <RefreshCw size={15} />
            تحديث
          </button>
          <button
            className="pricing-primary"
            disabled={busy}
            onClick={() => setTypes((v) => !v)}
          >
            {types ? <ArrowRight size={15} /> : <Plus size={15} />}{" "}
            {types ? "تذاكر المساعدة" : "أنواع المشكلة"}
          </button>
        </div>
      </div>
      {types ? (
        <SupportIssueTypes
          publicResource={
            publicError ? { ...publicTypes, error: publicError } : publicTypes
          }
          revision={revision}
          onChanged={() => setRevision((n) => n + 1)}
          onSessionExpired={onSessionExpired}
        />
      ) : (
        <>
          <ResourceState
            resource={
              publicError ? { ...publicTypes, error: publicError } : publicTypes
            }
            onLogin={onSessionExpired}
          />
          <div className="support-list-filters">
            <label>
              مصدر التذكرة
              <select
                aria-label="مصدر التذكرة"
                disabled={busy}
                value={source}
                onChange={(e) => filter(setSource, e.target.value)}
              >
                <option value="">العملاء والموردون</option>
                <option value="customer">العملاء</option>
                <option value="supplier">الموردون</option>
              </select>
            </label>
            <label>
              الأولوية
              <select
                aria-label="تصفية أولوية التذاكر"
                disabled={busy}
                value={priority}
                onChange={(e) => filter(setPriority, e.target.value)}
              >
                <option value="">كل الأولويات</option>
                {Object.entries(ticketPriorities).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              نوع المشكلة
              <select
                aria-label="نوع مشكلة التذكرة"
                disabled={busy}
                value={category}
                onChange={(e) => filter(setCategory, e.target.value)}
              >
                <option value="">كل الأنواع</option>
                {Object.entries(typeNames).map(([code, name]) => (
                  <option key={code} value={code}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <form onSubmit={applyDates}>
              <label>
                من تاريخ
                <input
                  type="date"
                  aria-label="التذاكر من تاريخ"
                  disabled={busy}
                  value={dates.from}
                  onChange={(e) =>
                    setDates((old) => ({ ...old, from: e.target.value }))
                  }
                />
              </label>
              <label>
                إلى تاريخ
                <input
                  type="date"
                  aria-label="التذاكر إلى تاريخ"
                  disabled={busy}
                  value={dates.to}
                  onChange={(e) =>
                    setDates((old) => ({ ...old, to: e.target.value }))
                  }
                />
              </label>
              <button className="pricing-primary" disabled={busy}>
                تطبيق الفترة
              </button>
            </form>
          </div>
          {dateError && (
            <p className="support-api-error" role="alert">
              {dateError}
            </p>
          )}
          <div className="support-layout">
            <aside className="support-ticket-list">
              <h2>
                جميع التذاكر <span>{supportNumber(total)} تذكرة</span>
              </h2>
              <label className="support-search">
                <Search size={16} />
                <input
                  aria-label="بحث التذاكر"
                  disabled={busy}
                  placeholder="ابحث برقم التذكرة أو الاسم أو الجوال..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <div className="support-filters">
                {[
                  ["", "الكل"],
                  ...Object.entries(ticketStatuses).map(([key, [label]]) => [
                    key,
                    label,
                  ]),
                ].map(([key, label]) => (
                  <button
                    disabled={busy}
                    className={status === key ? "selected" : ""}
                    onClick={() => filter(setStatus, key)}
                    key={key}
                  >
                    {label}
                    <span>
                      {key === ""
                        ? supportNumber(allCount)
                        : counts
                          ? supportNumber(counts[key] || 0)
                          : "—"}
                    </span>
                  </button>
                ))}
              </div>
              {category && (
                <p className="support-api-note">
                  أعداد الحالات لا تتأثر بفلتر نوع المشكلة.
                </p>
              )}
              <ResourceState resource={valid} onLogin={onSessionExpired} />
              <div className="support-tickets">
                {rows.map((row) => {
                  const name =
                    row.source === "supplier"
                      ? row.supplier_name || row.customer_name
                      : row.customer_name;
                  return (
                    <button
                      disabled={busy}
                      className={
                        "support-ticket " +
                        (selected === row.id ? "selected" : "")
                      }
                      aria-label={"عرض التذكرة " + row.ticket_number}
                      key={row.id}
                      onClick={() => setSelected(row.id)}
                    >
                      <div className="ticket-list-top">
                        <b>{row.ticket_number || "—"}</b>
                        <TicketBadge status={row.status} />
                      </div>
                      <div className="ticket-list-person">
                        <SupportAvatar row={row} name={name} />
                        <span>{name || "—"}</span>
                        <small
                          className={
                            row.source === "supplier" ? "supplier-role" : ""
                          }
                        >
                          ·{" "}
                          {row.source === "supplier"
                            ? "مورد"
                            : row.source === "customer"
                              ? "عميل"
                              : "—"}
                        </small>
                      </div>
                      <small className="ticket-list-meta">
                        {supportDate(row.created_at)} ·{" "}
                        {row.category_name ||
                          row.category_name_en ||
                          row.category ||
                          "—"}
                      </small>
                      <p>{row.subject || "—"}</p>
                      <small className="ticket-list-meta">
                        عدد الرسائل: {supportNumber(row.messages_count)}
                      </small>
                    </button>
                  );
                })}
                {!valid.loading && !valid.error && !rows.length && (
                  <p className="pricing-empty">لا توجد تذاكر تطابق البحث.</p>
                )}
              </div>
              <div className="pricing-pagination">
                <button
                  disabled={busy || page <= 1 || resource.loading}
                  onClick={() => setPage((n) => n - 1)}
                >
                  السابق
                </button>
                <span>
                  {page} / {pages}
                </span>
                <button
                  disabled={busy || page >= pages || resource.loading}
                  onClick={() => setPage((n) => n + 1)}
                >
                  التالي
                </button>
              </div>
            </aside>
            {selected ? (
              <SupportTicket
                key={selected}
                id={selected}
                listRow={rows.find((row) => row.id === selected)}
                onChanged={() => setRevision((n) => n + 1)}
                onBusyChange={setBusy}
                uncertain={uncertain.includes(selected)}
                onUncertain={(id) =>
                  setUncertain((old) => [...new Set([...old, id])])
                }
                onSessionExpired={onSessionExpired}
              />
            ) : (
              <section className="support-empty">
                اختر تذكرة لعرض تفاصيلها.
              </section>
            )}
          </div>
        </>
      )}
    </div>
  );
}
