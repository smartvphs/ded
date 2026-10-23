import React, { useEffect, useState } from "react";
import { adminRequest } from "./admin-api";
import useAdminResource from "./use-admin-resource";
import { ResourceState } from "./orders-ui";
import { PricingDialog } from "./pricing-ui";
import {
  readSettings,
  settingsTab,
  settingInput,
  settingsChanges,
  verifySettings,
} from "./settings-api";
import { settingsArtwork, settingsImageHeights } from "./settings-assets";
import ContactMessages from "./ContactMessages";
import "./settings.css";
const tabs = [
  ["pricing", "إعدادات الأرباح والتسعير"],
  ["cashback", "إعدادات كاش باك"],
  ["shipping", "إعدادات الشحن"],
  ["payments", "بوابة الدفع"],
  ["contact", "إدارة التواصل"],
  ["preparation", "وقت تجهيز الطلبات"],
  ["ai", "إعدادات الذكاء الاصطناعي"],
  ["other", "إعدادات المنصة الأخرى"],
];
function Art({ name }) {
  const item = settingsArtwork[name];
  if (!item) return null;
  const [file, x, y, w, h] = item;
  return (
    <svg className="st-art" viewBox={`${x} ${y} ${w} ${h}`} aria-hidden="true">
      <image
        href={`/settings-reference/${file}.png`}
        width="1440"
        height={settingsImageHeights[file]}
      />
    </svg>
  );
}
export default function SettingsPage({ onSessionExpired }) {
  const [tab, setTab] = useState("pricing"),
    [contactTab, setContactTab] = useState("messages"),
    [revision, setRevision] = useState(0),
    [draft, setDraft] = useState({}),
    [confirm, setConfirm] = useState(null),
    [busy, setBusy] = useState(false),
    [committed, setCommitted] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const resource = useAdminResource("/api/admin/settings", revision),
    me = useAdminResource("/api/admin/me");
  let data = null,
    shapeError = null;
  try {
    if (resource.data) data = readSettings(resource.data);
  } catch (e) {
    shapeError = e;
  }
  const canEdit =
    me.data?.data?.isSuperAdmin ||
    me.data?.data?.permissions?.includes("settings.manage");
  useEffect(() => {
    if (resource.data && !shapeError)
      setDraft(
        Object.fromEntries(
          readSettings(resource.data)
            .groups.flatMap((g) => g.settings)
            .map((r) => [r.key, settingInput(r)]),
        ),
      );
  }, [resource.data]);
  function prepare() {
    setError("");
    setNotice("");
    try {
      const body = settingsChanges(data?.groups || [], draft);
      if (!Object.keys(body).length) {
        setNotice("لا توجد تغييرات لحفظها.");
        return;
      }
      setConfirm(body);
      setCommitted(false);
    } catch (e) {
      setError(e.message);
    }
  }
  async function save() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (!committed) {
        try {
          await adminRequest("/api/admin/settings", {
            method: "PATCH",
            body: confirm,
          });
        } catch (e) {
          if (!e.status || e.status >= 500) setCommitted(true);
          throw e;
        }
        setCommitted(true);
      }
      verifySettings(await adminRequest("/api/admin/settings"), confirm);
      setConfirm(null);
      setCommitted(false);
      setRevision((n) => n + 1);
      setNotice("تم حفظ الإعدادات وتأكيدها من الخادم.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const allRows = data?.groups.flatMap((g) => g.settings) || [],
    updated = allRows
      .map((x) => x.updatedAt)
      .filter(Boolean)
      .sort()
      .at(-1);
  return (
    <div className={"st-page st-page-" + tab}>
      <div className="st-toolbar">
        <h1>الإعدادات</h1>
        <button
          className="st-button"
          disabled={!data || !canEdit || busy || !!shapeError}
          onClick={prepare}
        >
          حفظ جميع الإعدادات
        </button>
      </div>
      <div className="st-tabs" role="tablist" aria-label="الإعدادات">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            disabled={busy}
            onClick={() => setTab(key)}
          >
            <Art name={key + (tab === key ? "TabActive" : "Tab")} />
            {label}
          </button>
        ))}
      </div>
      <ResourceState
        resource={{ ...resource, error: resource.error || shapeError }}
        onLogin={onSessionExpired}
      />
      <ResourceState resource={me} onLogin={onSessionExpired} />
      {error && !confirm && (
        <p className="support-api-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="support-api-note" role="status">
          {notice}
        </p>
      )}
      {tab === "contact" && (
        <div
          className="st-contact-tabs"
          role="tablist"
          aria-label="إدارة التواصل"
        >
          <button
            role="tab"
            aria-selected={contactTab === "messages"}
            onClick={() => setContactTab("messages")}
          >
            الرسائل الواردة
          </button>
          <button
            role="tab"
            aria-selected={contactTab === "settings"}
            onClick={() => setContactTab("settings")}
          >
            إعدادات التواصل
          </button>
        </div>
      )}
      {tab === "contact" && contactTab === "messages" ? (
        <ContactMessages onSessionExpired={onSessionExpired} />
      ) : (
        <>
          {data?.groups.map((group) => {
            const rows = group.settings.filter(
              (row) => settingsTab(group.key, row.key) === tab,
            );
            return (
              rows.length > 0 && (
                <section key={group.key} className="st-panel">
                  <h2>{group.label}</h2>
                  <div className="st-grid three">
                    {rows.map((row) => (
                      <label className="st-field" key={row.key}>
                        <span>{row.label}</span>
                        <span className="st-control">
                          {row.type === "boolean" || row.type === "toggle" ? (
                            <input
                              aria-label={row.label}
                              type="checkbox"
                              checked={["1", "true"].includes(
                                String(draft[row.key]),
                              )}
                              disabled={!canEdit || row.isReadOnly || busy}
                              onChange={(e) =>
                                setDraft({
                                  ...draft,
                                  [row.key]:
                                    typeof row.value === "number" ||
                                    row.key.startsWith("home_section_")
                                      ? String(Number(e.target.checked))
                                      : String(e.target.checked),
                                })
                              }
                            />
                          ) : ["json", "textarea"].includes(row.type) ||
                            (row.value !== null &&
                              typeof row.value === "object") ? (
                            <textarea
                              aria-label={row.label}
                              value={draft[row.key] ?? ""}
                              disabled={!canEdit || row.isReadOnly || busy}
                              onChange={(e) =>
                                setDraft({
                                  ...draft,
                                  [row.key]: e.target.value,
                                })
                              }
                            />
                          ) : (
                            <input
                              aria-label={row.label}
                              type={
                                [
                                  "number",
                                  "integer",
                                  "money",
                                  "percent",
                                  "count",
                                  "hours",
                                  "days",
                                ].includes(row.type) ||
                                typeof row.value === "number"
                                  ? "number"
                                  : "text"
                              }
                              min={row.min ?? undefined}
                              max={row.max ?? undefined}
                              step={
                                row.type === "integer" || row.type === "count"
                                  ? "1"
                                  : "any"
                              }
                              value={draft[row.key] ?? ""}
                              placeholder={row.isMissing ? "لم يُضبط بعد" : ""}
                              disabled={!canEdit || row.isReadOnly || busy}
                              onChange={(e) =>
                                setDraft({
                                  ...draft,
                                  [row.key]: e.target.value,
                                })
                              }
                            />
                          )}
                        </span>
                        {row.description && <small>{row.description}</small>}
                        {row.impact && (
                          <small className="st-setting-impact">
                            {row.impact}
                          </small>
                        )}
                      </label>
                    ))}
                  </div>
                </section>
              )
            );
          })}
          {data &&
            !allRows.some((row) =>
              data.groups.some(
                (g) =>
                  g.settings.includes(row) &&
                  settingsTab(g.key, row.key) === tab,
              ),
            ) && (
              <section className="st-panel">
                <p>
                  لا توجد إعدادات قابلة للعرض في هذا القسم ضمن البيانات المتاحة
                  لحسابك.
                </p>
                {tab === "shipping" && (
                  <p>التعاقد مع شركات الشحن والتكامل معها مؤجل.</p>
                )}
              </section>
            )}
          {tab === "other" && data?.unknown?.length > 0 && (
            <section className="st-panel">
              <h2>إعدادات إضافية للعرض فقط</h2>
              {data.unknown.map((row) => (
                <label className="st-field" key={row.key}>
                  <span>{row.description || row.key}</span>
                  <span className="st-control">
                    <input
                      readOnly
                      value={
                        typeof row.value === "object"
                          ? JSON.stringify(row.value)
                          : (row.value ?? "")
                      }
                    />
                  </span>
                </label>
              ))}
            </section>
          )}
        </>
      )}
      {updated && (
        <div className="st-bottom">
          <b>
            آخر تعديل:{" "}
            {new Date(updated).toLocaleString("ar-EG", {
              timeZone: "Asia/Riyadh",
            })}
          </b>
        </div>
      )}
      {confirm && (
        <PricingDialog
          title="تأكيد حفظ الإعدادات"
          busy={busy}
          onClose={() => {
            setConfirm(null);
            setCommitted(false);
          }}
        >
          <p>
            سيتم تغيير {Object.keys(confirm).length} إعداد. راجع تأثير التغييرات
            قبل التأكيد.
          </p>
          {Object.keys(confirm).map((key) => (
            <p key={key}>
              <b>{allRows.find((x) => x.key === key)?.label}</b>:{" "}
              {String(confirm[key])}
              <small>{allRows.find((x) => x.key === key)?.impact}</small>
            </p>
          ))}
          {error && (
            <p className="support-api-error" role="alert">
              {error}
            </p>
          )}
          <button disabled={busy} className="pricing-primary" onClick={save}>
            {committed ? "إعادة التحقق" : "تأكيد الحفظ"}
          </button>
        </PricingDialog>
      )}
    </div>
  );
}
