import React, { useState } from "react";
import { CustomerAvatar } from "./customer-ui";
import { uploadContentImage } from "./definitions-api";
export default function CustomerAvatarEditor({
  value,
  name,
  onChange,
  onBusyChange,
  disabled,
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function pick(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setError("اختر صورة JPG أو PNG أو WebP بحد أقصى 5 ميجابايت.");
      return;
    }
    setBusy(true);
    onBusyChange(true);
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("تعذر قراءة الصورة."));
        reader.readAsDataURL(file);
      });
      const url = await uploadContentImage(dataUrl, "avatars");
      onChange(url);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
      onBusyChange(false);
    }
  }
  return (
    <div className="customer-avatar-editor">
      <CustomerAvatar client={{ name, avatar_url: value }} />
      <div>
        <label className="customer-avatar-upload">
          اختيار صورة
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-label="صورة العميل"
            onChange={pick}
            disabled={disabled || busy}
          />
        </label>
        <button
          type="button"
          className="pricing-back"
          disabled={disabled || busy || !value}
          onClick={() => onChange(null)}
        >
          إزالة الصورة
        </button>
        <p className="customer-api-note">
          JPG أو PNG أو WebP، بحد أقصى 5 ميجابايت. الصورة بتتحفظ مع بيانات
          العميل عند الضغط على حفظ.
        </p>
        {busy && <p role="status">جارٍ رفع الصورة…</p>}
        {error && <p role="alert">{error}</p>}
      </div>
    </div>
  );
}
