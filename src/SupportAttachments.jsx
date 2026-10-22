import React, { useState } from "react";
import { Image as ImageIcon, FileText, Plus, X } from "lucide-react";
import { attachmentRows } from "./support-api";
import { uploadContentImage } from "./definitions-api";
export function TicketAttachments({ items }) {
  const rows = attachmentRows(items);
  return rows.length ? (
    <div className="support-attachment-grid">
      {rows.map((a, i) => (
        <a
          className="support-attachment"
          href={a.url}
          target="_blank"
          rel="noopener noreferrer"
          key={a.url + "-" + i}
        >
          {a.image ? (
            <img src={a.url} alt={a.name} loading="lazy" />
          ) : (
            <span className="meta-icon">
              <FileText size={20} />
            </span>
          )}
          <span>
            <b>{a.name}</b>
            <small>فتح المرفق</small>
          </span>
        </a>
      ))}
    </div>
  ) : (
    <p className="support-api-note">لا توجد مرفقات.</p>
  );
}
export function TicketUpload({ items, onChange, disabled, onBusyChange }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function pick(e) {
    const files = [...e.target.files];
    e.target.value = "";
    if (!files.length) return;
    setError("");
    if (
      files.some(
        (f) =>
          !["image/jpeg", "image/png", "image/webp"].includes(f.type) ||
          f.size > 5 * 1024 * 1024,
      )
    ) {
      setError("اختار صور JPG أو PNG أو WebP، كل صورة بحد أقصى 5 ميجابايت.");
      return;
    }
    setBusy(true);
    onBusyChange(true);
    let uploaded = [...items];
    try {
      for (const file of files) {
        const data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error("تعذر قراءة الصورة."));
          reader.readAsDataURL(file);
        });
        const url = await uploadContentImage(data, "tickets");
        uploaded = [...uploaded, { url, name: file.name }];
        onChange(uploaded);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      onBusyChange(false);
    }
  }
  return (
    <div className="support-upload">
      <label className="support-upload-button">
        <ImageIcon size={15} />
        <span>إرفاق صور</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          aria-label="إرفاق صور للرد"
          disabled={disabled || busy}
          onChange={pick}
        />
      </label>
      {busy && <p role="status">جارٍ رفع الصور…</p>}
      {error && <p role="alert">{error}</p>}
      <div className="support-uploaded">
        {items.map((item, i) => (
          <div key={item.url + "-" + i}>
            <span>{item.name || "صورة مرفقة"}</span>
            <button
              type="button"
              aria-label={"إزالة مرفق الرد " + (i + 1)}
              disabled={disabled || busy}
              onClick={() => onChange(items.filter((_, j) => j !== i))}
            >
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
