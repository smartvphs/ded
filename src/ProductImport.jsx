import React, { useEffect, useRef, useState } from "react";
import { adminRequest, queryString } from "./admin-api";
import useAdminResource from "./use-admin-resource";
import { Modal, Field, Select, ResourceState } from "./orders-ui";
import {
  importBatchSize,
  duplicateSkuRows,
  importResults,
} from "./product-import-api";
import "./product-import.css";
export default function ProductImport({
  onClose,
  onImported,
  onSessionExpired,
}) {
  const [supplier, setSupplier] = useState(null),
    [search, setSearch] = useState(""),
    [debounced, setDebounced] = useState(""),
    [book, setBook] = useState(null),
    [sheet, setSheet] = useState(""),
    [rows, setRows] = useState([]),
    [filename, setFilename] = useState(""),
    [results, setResults] = useState([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [progress, setProgress] = useState("");
  const lock = useRef(false),
    created = useRef(new Set()),
    uncertain = useRef(new Set()),
    reader = useRef(null),
    previewed = useRef(false);
  const template = useAdminResource("/api/products/admin/import/template");
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const suppliers = useAdminResource(
    "/api/suppliers/admin?" +
      queryString({
        approvalStatus: "approved",
        search: debounced || undefined,
        limit: 20,
        offset: 0,
      }),
  );
  const options = Array.isArray(suppliers.data?.data?.items)
    ? suppliers.data.data.items.filter(
        (s) => (s.approval_status ?? s.approvalStatus) === "approved",
      )
    : [];
  const choices =
    supplier && !options.some((s) => s.id === supplier.id)
      ? [supplier, ...options]
      : options;
  const columns = template.data?.data?.columns;
  const ready = Array.isArray(columns) && columns.length > 0;
  const locked = created.current.size > 0 || uncertain.current.size > 0;
  const valid = results.filter(
    (r) =>
      r.status === "valid" &&
      !created.current.has(r.row) &&
      !uncertain.current.has(r.row),
  );
  function resetResults() {
    setResults([]);
    previewed.current = false;
    setProgress("");
    setError("");
  }
  async function pick(file) {
    if (!file || lock.current || locked) return;
    lock.current = true;
    setBusy(true);
    resetResults();
    setRows([]);
    setBook(null);
    setSheet("");
    setFilename("");
    try {
      const api = await import("./spreadsheet");
      reader.current = api;
      const next = await api.readWorkbook(file);
      const first = next.SheetNames[0];
      const data = api.sheetRows(next, first);
      setBook(next);
      setSheet(first);
      setRows(data);
      setFilename(file.name);
    } catch (e) {
      setError(e.message || "تعذر قراءة الملف.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function getTemplate() {
    if (lock.current || !ready) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const api = await import("./spreadsheet");
      api.downloadTemplate(columns);
    } catch (e) {
      setError("تعذر تنزيل قالب الاستيراد.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function run(dryRun) {
    if (
      lock.current ||
      !ready ||
      !rows.length ||
      (!dryRun &&
        (!previewed.current || !valid.length || uncertain.current.size))
    )
      return;
    lock.current = true;
    setBusy(true);
    setError("");
    if (dryRun) previewed.current = false;
    const duplicates = duplicateSkuRows(rows, columns),
      current = new Map(
        results
          .filter(
            (r) => created.current.has(r.row) || uncertain.current.has(r.row),
          )
          .map((r) => [r.row, r]),
      );
    for (const [row, result] of duplicates)
      if (!created.current.has(row)) current.set(row, result);
    const eligible = rows.filter(
      (r) =>
        !duplicates.has(r.sheetRow) &&
        !created.current.has(r.sheetRow) &&
        !uncertain.current.has(r.sheetRow) &&
        (dryRun || valid.some((v) => v.row === r.sheetRow)),
    );
    const size = importBatchSize(template.data.data.maxRows);
    let completed = 0,
      added = 0;
    try {
      for (let start = 0; start < eligible.length; start += size) {
        const batch = eligible.slice(start, start + size);
        setProgress(
          `${dryRun ? "جارٍ فحص" : "جارٍ استيراد"} ${completed} من ${eligible.length}`,
        );
        try {
          const response = await adminRequest(
            "/api/products/admin/import" +
              (supplier ? "/" + encodeURIComponent(supplier.id) : ""),
            {
              method: "POST",
              body: { rows: batch.map((r) => r.values), dryRun },
            },
          );
          const mapped = importResults(response.data, batch, dryRun);
          for (const result of mapped) {
            current.set(result.row, result);
            if (result.status === "created") {
              created.current.add(result.row);
              added++;
            }
          }
        } catch (e) {
          const unknown = !dryRun && (!e.status || e.status >= 500);
          for (const row of batch) {
            if (unknown) uncertain.current.add(row.sheetRow);
            current.set(row.sheetRow, {
              row: row.sheetRow,
              status: unknown ? "unknown" : "failed",
              errors: [
                {
                  message: unknown
                    ? "تعذر تأكيد نتيجة هذا الصف. راجع قائمة المنتجات قبل إعادة استيراده."
                    : e.message,
                },
              ],
            });
          }
          throw e;
        }
        completed += batch.length;
        setResults([...current.values()].sort((a, b) => a.row - b.row));
      }
      if (dryRun) {
        previewed.current = true;
        setProgress("اكتمل فحص الملف. راجع النتائج قبل الاستيراد.");
      } else setProgress("اكتمل الاستيراد.");
    } catch (e) {
      setError(
        uncertain.current.size
          ? "تعذر تأكيد نتيجة آخر دفعة. لن تُعاد تلقائيًا؛ راجع المنتجات قبل إعادة استيراد هذه الصفوف."
          : e.message || "تعذر إتمام الاستيراد.",
      );
      setProgress("توقفت العملية؛ النتائج المؤكدة محفوظة.");
    } finally {
      setResults([...current.values()].sort((a, b) => a.row - b.row));
      if (added) onImported(added);
      lock.current = false;
      setBusy(false);
    }
  }
  const counts = results.reduce(
    (a, r) => ({ ...a, [r.status]: (a[r.status] || 0) + 1 }),
    {},
  );
  return (
    <Modal
      title="استيراد المنتجات"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <div className="product-import">
        <button
          type="button"
          className="op-outline"
          disabled={busy || !ready}
          onClick={getTemplate}
        >
          تنزيل قالب Excel
        </button>
        <ResourceState resource={template} onLogin={onSessionExpired} />
        <ResourceState resource={suppliers} onLogin={onSessionExpired} />
        {template.data && !ready && (
          <p role="alert">تعذر قراءة أعمدة قالب الاستيراد.</p>
        )}
        <fieldset
          disabled={busy || locked}
          style={{ border: 0, padding: 0, minWidth: 0 }}
        >
          <div className="op-form-grid">
            <Field label="البحث عن المورد">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="اسم المورد"
              />
            </Field>
            <Select
              label="المورد"
              value={supplier?.id || ""}
              disabled={suppliers.loading || Boolean(suppliers.error)}
              onChange={(e) => {
                setSupplier(
                  choices.find((s) => s.id === e.target.value) || null,
                );
                resetResults();
              }}
            >
              <option value="">ماي بارت (بدون مورد)</option>
              {choices.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <Field label="ملف Excel">
              <input
                type="file"
                accept=".xls,.xlsx"
                onChange={(e) => {
                  pick(e.target.files[0]);
                  e.target.value = "";
                }}
              />
            </Field>
            {book?.SheetNames.length > 1 && (
              <Select
                label="ورقة البيانات"
                value={sheet}
                onChange={(e) => {
                  resetResults();
                  setSheet(e.target.value);
                  try {
                    setRows(reader.current.sheetRows(book, e.target.value));
                  } catch (error) {
                    setRows([]);
                    setError(error.message);
                  }
                }}
              >
                {book.SheetNames.map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </Select>
            )}
          </div>
        </fieldset>
        {filename && (
          <p>
            {filename} · {rows.length} صف
          </p>
        )}
        {error && (
          <p className="op-notice" role="alert">
            {error}
          </p>
        )}
        {progress && <p role="status">{progress}</p>}
        <div className="op-modal-buttons">
          <button
            className="op-outline"
            type="button"
            disabled={
              busy || !ready || !rows.length || uncertain.current.size > 0
            }
            onClick={() => run(true)}
          >
            فحص الملف
          </button>
          <button
            className="op-primary"
            type="button"
            disabled={
              busy ||
              !previewed.current ||
              !valid.length ||
              uncertain.current.size > 0
            }
            onClick={() => run(false)}
          >
            استيراد الصفوف السليمة ({valid.length})
          </button>
        </div>
        {results.length > 0 && (
          <>
            <p>
              سليم: {counts.valid || 0} · تم استيراده: {counts.created || 0} ·
              فشل: {counts.failed || 0} · تم تخطيه: {counts.skipped || 0} · غير
              مؤكد: {counts.unknown || 0}
            </p>
            <div className="op-table-scroll import-results">
              <table className="op-table">
                <thead>
                  <tr>
                    <th>صف Excel</th>
                    <th>المنتج</th>
                    <th>النتيجة</th>
                    <th>التفاصيل</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr key={r.row}>
                      <td>{r.row}</td>
                      <td>{r.name || "—"}</td>
                      <td>
                        {
                          {
                            valid: "سليم",
                            created: "تم الاستيراد",
                            failed: "فشل",
                            skipped: "تم تخطيه",
                            unknown: "غير مؤكد",
                          }[r.status]
                        }
                      </td>
                      <td>
                        {r.errors?.map((e, i) => (
                          <p key={i}>
                            {e.field ? e.field + ": " : ""}
                            {e.message}
                          </p>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
