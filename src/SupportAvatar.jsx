import React, { useEffect, useState } from "react";
import { adminRequest } from "./admin-api";
import { getAuthSession } from "./auth-api";

// Share profile reads between the list and selected ticket, within one session.
const profiles = new Map();
let profileSession;
function profilePhoto(source, id) {
  const session = getAuthSession()?.accessToken;
  if (profileSession !== session) {
    profiles.clear();
    profileSession = session;
  }
  const key = `${source}:${id}`;
  const cached = profiles.get(key);
  if (cached && cached.until > Date.now()) return cached.promise;
  const path =
    source === "supplier" ? "/api/suppliers/admin/" : "/api/admin/customers/";
  const promise = adminRequest(path + encodeURIComponent(id))
    .then(({ data }) =>
      data?.id === id
        ? source === "supplier"
          ? data.logo_url
          : data.avatar_url
        : null,
    )
    .catch(() => null);
  if (profiles.size >= 100) profiles.delete(profiles.keys().next().value);
  profiles.set(key, { promise, until: Date.now() + 60000 });
  return promise;
}
export default function SupportAvatar({ row, fallbackRow, name }) {
  const person = { ...fallbackRow, ...row };
  const source =
    person.source || (person.supplier_id ? "supplier" : "customer");
  const id =
    source === "supplier"
      ? person.supplier_id
      : person.customer_id || person.user_id;
  const direct =
    source === "supplier"
      ? person.supplier_logo_url || person.supplier?.logo_url
      : person.customer_avatar_url ||
        person.avatar_url ||
        person.customer?.avatar_url;
  const identity = `${source}:${id || ""}`;
  const [photo, setPhoto] = useState(null);
  const [failed, setFailed] = useState(null);
  useEffect(() => {
    let active = true;
    if (!direct && id)
      profilePhoto(source, id).then((url) => {
        if (active) setPhoto({ identity, url });
      });
    return () => {
      active = false;
    };
  }, [source, id, direct, identity]);
  const url = direct || (photo?.identity === identity ? photo.url : null);
  return (
    <span className="support-avatar">
      {url && failed !== url ? (
        <img
          src={url}
          alt={name || "صورة صاحب التذكرة"}
          onError={() => setFailed(url)}
        />
      ) : (
        name?.[0] || "—"
      )}
    </span>
  );
}
