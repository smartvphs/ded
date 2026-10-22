import React, { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, Trash2, RefreshCw, ArrowRight } from "lucide-react";
import { adminRequest, queryString } from "./admin-api";
import useAdminResource from "./use-admin-resource";
import { ResourceState } from "./orders-ui";
import {
  notificationTypes,
  readNotifications,
  notificationTarget,
  notificationTime,
} from "./notifications-api";
import NotificationDestination from "./NotificationDestination";
import "./notifications.css";
const notify = () =>
  window.dispatchEvent(new Event("mypart:notifications-changed"));
export function NotificationBell({ onOpen, onSessionExpired }) {
  const [revision, setRevision] = useState(0);
  const resource = useAdminResource(
    "/api/admin/notifications?limit=1&offset=0",
    revision,
  );
  useEffect(() => {
    const refresh = () => setRevision((n) => n + 1);
    window.addEventListener("mypart:notifications-changed", refresh);
    window.addEventListener("focus", refresh);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 60000);
    return () => {
      window.removeEventListener("mypart:notifications-changed", refresh);
      window.removeEventListener("focus", refresh);
      window.clearInterval(timer);
    };
  }, []);
  const count = resource.data?.data?.unreadCount;
  return (
    <button
      className="notifications-bell"
      aria-label="الإشعارات"
      title={
        resource.error
          ? "تعذر تحديث عدد الإشعارات"
          : Number.isInteger(count)
            ? `${count} إشعار غير مقروء`
            : "الإشعارات"
      }
      onClick={resource.error?.status === 401 ? onSessionExpired : onOpen}
    >
      <Bell size={19} strokeWidth={1.65} />
      {Number.isInteger(count) && count > 0 && (
        <span>{count > 99 ? "99+" : count}</span>
      )}
    </button>
  );
}
export default function Notifications({ onSessionExpired }) {
  const [page, setPage] = useState(0),
    [type, setType] = useState(""),
    [unread, setUnread] = useState(false),
    [revision, setRevision] = useState(0),
    [target, setTarget] = useState(null),
    [confirm, setConfirm] = useState(null),
    [busy, setBusy] = useState(false),
    [pending, setPending] = useState(null),
    [error, setError] = useState(null),
    [message, setMessage] = useState("");
  const lock = useRef(false);
  const path =
    "/api/admin/notifications?" +
    queryString({
      limit: 30,
      offset: page * 30,
      type,
      unread: unread ? true : undefined,
    });
  const resource = useAdminResource(path, revision);
  let rows = null,
    shapeError = null;
  try {
    if (resource.data) rows = readNotifications(resource.data);
  } catch (e) {
    shapeError = e;
  }
  useEffect(() => {
    if (rows && page > 0 && !rows.items.length) setPage((n) => n - 1);
  }, [resource.data]);
  useEffect(() => {
    const reset = () => {
      setTarget(null);
      setRevision((n) => n + 1);
    };
    const refresh = () => setRevision((n) => n + 1);
    window.addEventListener("focus", refresh);
    window.addEventListener("mypart:notifications-home", reset);
    return () => {
      window.removeEventListener("mypart:notifications-home", reset);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  async function verify(action) {
    const first = readNotifications(
      await adminRequest("/api/admin/notifications?limit=100&offset=0"),
    );
    if (action.kind === "read-all") {
      if (first.unread !== 0)
        throw new Error("لم يؤكد الخادم قراءة كل الإشعارات. أعد التحقق.");
      return;
    }
    if (action.kind === "delete-all") {
      if (first.total !== 0)
        throw new Error("ما زالت هناك إشعارات على الخادم. أعد التحقق.");
      return;
    }
    let items = first.items;
    for (let offset = items.length; offset < first.total;) {
      const next = readNotifications(
        await adminRequest(
          "/api/admin/notifications?" + queryString({ limit: 100, offset }),
        ),
      );
      if (!next.items.length)
        throw new Error("تعذر استكمال التحقق من الإشعارات.");
      items = [...items, ...next.items];
      offset += next.items.length;
    }
    const item = items.find((x) => x.id === action.id);
    if (action.kind === "read" && (!item || !item.is_read))
      throw new Error("تعذر تأكيد قراءة الإشعار. أعد التحقق.");
    if (action.kind === "delete" && item)
      throw new Error("الإشعار ما زال موجودًا. أعد التحقق.");
  }
  async function perform(action, recheck = false) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    setMessage("");
    let committed = recheck;
    try {
      if (!recheck) {
        const endpoint =
          action.kind === "read-all"
            ? "read-all"
            : action.kind === "delete-all"
              ? "all"
              : encodeURIComponent(action.id) +
                (action.kind === "read" ? "/read" : "");
        try {
          await adminRequest("/api/notifications/" + endpoint, {
            method: action.kind.startsWith("read") ? "PATCH" : "DELETE",
          });
          committed = true;
        } catch (e) {
          if (!e.status || e.status >= 500) committed = true;
          throw e;
        }
      }
      await verify(action);
      setPending(null);
      setConfirm(null);
      setRevision((n) => n + 1);
      notify();
      setMessage(
        action.kind.startsWith("read")
          ? "تم تحديث حالة القراءة."
          : "تم حذف الإشعارات المحددة.",
      );
    } catch (e) {
      setError(e);
      if (committed) setPending(action);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  if (target)
    return (
      <NotificationDestination
        target={target}
        onBack={() => setTarget(null)}
        onSessionExpired={onSessionExpired}
      />
    );
  return (
    <div className="admin-page notifications-page">
      <div className="notification-heading">
        <div>
          <h1>الإشعارات</h1>
          <p>{rows ? rows.unread : "—"} إشعار غير مقروء</p>
        </div>
        <div className="nt-actions">
          <button
            disabled={busy || !!pending || !rows?.unread}
            onClick={() => perform({ kind: "read-all" })}
          >
            <CheckCheck size={16} />
            قراءة الكل
          </button>
          <button
            disabled={busy || !!pending || !rows?.total}
            onClick={() => setConfirm({ kind: "delete-all" })}
          >
            <Trash2 size={16} />
            حذف الكل
          </button>
        </div>
      </div>
      <div className="nt-toolbar">
        <label>
          نوع الإشعار{" "}
          <select
            value={type}
            disabled={busy}
            onChange={(e) => {
              setType(e.target.value);
              setPage(0);
            }}
          >
            <option value="">كل الأنواع</option>
            {Object.entries(notificationTypes).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={unread}
            disabled={busy}
            onChange={(e) => {
              setUnread(e.target.checked);
              setPage(0);
            }}
          />{" "}
          غير المقروء فقط
        </label>
        <button disabled={busy} onClick={() => setRevision((n) => n + 1)}>
          <RefreshCw size={15} />
          تحديث
        </button>
      </div>
      <ResourceState
        resource={{ ...resource, error: resource.error || shapeError }}
        onLogin={onSessionExpired}
      />
      {error && (
        <div role="alert" className="nt-error">
          {error.message}
          {error.status === 401 && (
            <button onClick={onSessionExpired}>تسجيل الدخول من جديد</button>
          )}
        </div>
      )}
      {pending && (
        <p className="nt-error">
          لم يتم تأكيد النتيجة. لن نكرر العملية.
          <button disabled={busy} onClick={() => perform(pending, true)}>
            إعادة التحقق
          </button>
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {confirm && (
        <div
          className="nt-confirm"
          role="alertdialog"
          aria-label="تأكيد حذف الإشعارات"
        >
          <p>
            {confirm.kind === "delete-all"
              ? "حذف كل إشعارات حسابك، بما فيها غير الظاهرة في الفلتر؟"
              : "حذف هذا الإشعار؟"}
          </p>
          <button disabled={busy || !!pending} onClick={() => perform(confirm)}>
            تأكيد الحذف
          </button>
          <button disabled={busy} onClick={() => setConfirm(null)}>
            إلغاء
          </button>
        </div>
      )}
      {rows && !shapeError && (
        <>
          {!rows.items.length && (
            <p className="dashboard-empty">لا توجد إشعارات تطابق الاختيارات.</p>
          )}
          {[
            ["today", "اليوم"],
            ["yesterday", "أمس"],
            ["earlier", "سابقًا"],
          ].map(([key, label]) => {
            const items = rows.items.filter(
              (x) =>
                (["today", "yesterday"].includes(x.group)
                  ? x.group
                  : "earlier") === key,
            );
            return (
              items.length > 0 && (
                <section className="notification-group" key={key}>
                  <h2>{label}</h2>
                  {items.map((item) => (
                    <article
                      key={item.id}
                      className={
                        "notification-item order-notification" +
                        (!item.is_read ? " unread" : "")
                      }
                    >
                      <div className="notification-body">
                        <span className="notification-symbol">
                          <Bell size={25} />
                        </span>
                        <div>
                          <b>{item.title || "إشعار"}</b>
                          <p>{item.body}</p>
                          <small>
                            {notificationTime(item.created_at)} ·{" "}
                            {notificationTypes[item.type] || item.type} ·{" "}
                            {item.is_read ? "مقروء" : "غير مقروء"}
                          </small>
                          <div className="nt-actions">
                            {notificationTarget(item) && (
                              <button
                                onClick={() =>
                                  setTarget(notificationTarget(item))
                                }
                              >
                                <ArrowRight size={15} />
                                عرض التفاصيل
                              </button>
                            )}
                            {!item.is_read && (
                              <button
                                disabled={busy || !!pending}
                                onClick={() =>
                                  perform({ kind: "read", id: item.id })
                                }
                              >
                                تحديد كمقروء
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        disabled={busy || !!pending}
                        className="notification-remove"
                        aria-label={"حذف الإشعار " + item.id}
                        onClick={() =>
                          setConfirm({ kind: "delete", id: item.id })
                        }
                      >
                        <Trash2 size={17} />
                      </button>
                    </article>
                  ))}
                </section>
              )
            );
          })}
          <div className="nt-pagination">
            <button
              disabled={!page || busy}
              onClick={() => setPage((n) => n - 1)}
            >
              السابق
            </button>
            <span>
              صفحة {page + 1} · {rows.total} إشعار
            </span>
            <button
              disabled={(page + 1) * 30 >= rows.total || busy}
              onClick={() => setPage((n) => n + 1)}
            >
              التالي
            </button>
          </div>
        </>
      )}
    </div>
  );
}
