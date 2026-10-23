import { useRef, useState } from "react";
import useAdminResource from "./use-admin-resource";
import { adminRequest } from "./admin-api";
import { readTicket, ticketPath } from "./support-api";
const noteOutcomes = new Map(),
  operations = new Map();
export default function useTicketAdministration({ row, onUpdated, onDeleted }) {
  const me = useAdminResource("/api/admin/me"),
    assignees = useAdminResource(
      row ? "/api/support-tickets/admin/assignees" : null,
    );
  const [action, setAction] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [note, setNote] = useState("");
  const lock = useRef(false),
    account = me.data?.data,
    key = account?.id + ":" + row?.id,
    canManage = !!(
      account?.isSuperAdmin || account?.permissions?.includes("support.manage")
    );
  const pending = noteOutcomes.get(key);
  function open(kind, values = {}) {
    if (busy || !row) return;
    setError("");
    setNote(noteOutcomes.get(key)?.body || "");
    const operationKey = key + ":" + kind + ":" + JSON.stringify(values);
    setAction({
      kind,
      ...values,
      operationKey,
      sent: !!operations.get(operationKey),
    });
  }
  function close() {
    if (!busy) {
      setAction(null);
      setError("");
    }
  }
  async function save() {
    if (lock.current || !row || !action || !canManage) return;
    if (action.kind !== "notes") {
      const values =
        action.kind === "assign"
          ? { staffId: action.staffId }
          : action.kind === "priority"
            ? { priority: action.priority }
            : action.kind === "deleteNote"
              ? { noteId: action.noteId }
              : {};
      action.operationKey =
        key + ":" + action.kind + ":" + JSON.stringify(values);
      action.sent = !!operations.get(action.operationKey);
    }
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      if (action.kind === "notes") {
        let record = noteOutcomes.get(key);
        if (!record) {
          if (!note.trim() || note.trim().length > 2000)
            throw new Error("اكتب ملاحظة من 1 إلى 2000 حرف.");
          record = {
            body: note.trim(),
            previous: (row.internal_notes || []).map((n) => n.id),
          };
          noteOutcomes.set(key, record);
          try {
            const result = await adminRequest(ticketPath(row.id) + "/notes", {
              method: "POST",
              body: { body: record.body },
            });
            if (!result.data?.id) throw new Error("تعذر تأكيد رقم الملاحظة.");
            record.id = result.data.id;
          } catch (e) {
            if (e.status && e.status < 500) noteOutcomes.delete(key);
            throw e;
          }
        }
        const fresh = await readTicket(row.id);
        const matches = Array.isArray(fresh.internal_notes)
          ? fresh.internal_notes.filter((n) =>
              record.id
                ? n.id === record.id && n.body === record.body
                : !record.previous.includes(n.id) &&
                  n.body === record.body &&
                  n.author_id === account.id,
            )
          : [];
        if (matches.length !== 1)
          throw new Error(
            "لم يتم تأكيد الملاحظة؛ أعد التحقق بدون إعادة الإرسال.",
          );
        noteOutcomes.delete(key);
        setNote("");
        await onUpdated(fresh);
        setAction(null);
      } else if (action.kind === "delete") {
        if (!action.sent) {
          try {
            await adminRequest(ticketPath(row.id), { method: "DELETE" });
            action.sent = true;
            operations.set(action.operationKey, true);
          } catch (e) {
            if (!e.status || e.status >= 500) {
              action.sent = true;
              operations.set(action.operationKey, true);
            }
            throw e;
          }
        }
        let absent = false;
        try {
          await adminRequest(ticketPath(row.id));
        } catch (e) {
          if (e.status === 404) absent = true;
          else throw e;
        }
        if (!absent) throw new Error("التذكرة ما زالت موجودة؛ أعد التحقق.");
        operations.delete(action.operationKey);
        setAction(null);
        await onDeleted();
      } else {
        const suffix =
          action.kind === "assign"
            ? "assign"
            : action.kind === "priority"
              ? "priority"
              : "notes/" + encodeURIComponent(action.noteId);
        if (!action.sent) {
          try {
            await adminRequest(ticketPath(row.id) + "/" + suffix, {
              method: action.kind === "deleteNote" ? "DELETE" : "PATCH",
              ...(action.kind === "assign"
                ? { body: { staffId: action.staffId || null } }
                : action.kind === "priority"
                  ? { body: { priority: action.priority } }
                  : {}),
            });
            action.sent = true;
            operations.set(action.operationKey, true);
          } catch (e) {
            if (!e.status || e.status >= 500) {
              action.sent = true;
              operations.set(action.operationKey, true);
            }
            throw e;
          }
        }
        const fresh = await readTicket(row.id);
        if (
          (action.kind === "assign" &&
            (fresh.assigned_to || null) !== (action.staffId || null)) ||
          (action.kind === "priority" && fresh.priority !== action.priority) ||
          (action.kind === "deleteNote" &&
            (!Array.isArray(fresh.internal_notes) ||
              fresh.internal_notes.some((n) => n.id === action.noteId)))
        )
          throw new Error("لم يتم تأكيد التغيير؛ أعد التحقق.");
        await onUpdated(fresh);
        operations.delete(action.operationKey);
        setAction(action.kind === "deleteNote" ? { kind: "notes" } : null);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  return {
    row,
    account,
    canManage,
    assignees,
    action,
    setAction,
    busy,
    error,
    note,
    setNote,
    pending,
    open,
    close,
    save,
  };
}
