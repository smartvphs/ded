import React, { useEffect, useState } from "react";
import { Art } from "./DeliveryUI";
import DeliveryList from "./DeliveryList";
import DeliveryDetail from "./DeliveryDetail";
import "./delivery.css";
export default function DeliveryWorkspace({ account, onLogout }) {
  const [screen, setScreen] = useState(() =>
      location.hash === "#returns" ? "returns" : "orders",
    ),
    [detail, setDetail] = useState(null),
    [menu, setMenu] = useState(false),
    [popup, setPopup] = useState(null),
    [night, setNight] = useState(false),
    [savedDetails, setSavedDetails] = useState({}),
    [received, setReceived] = useState(new Set());
  useEffect(() => {
    const sync = () => {
      const value = location.hash.slice(1);
      setScreen(value === "returns" ? "returns" : "orders");
      setDetail(null);
      if (!["orders", "returns"].includes(value))
        history.replaceState(
          null,
          "",
          location.pathname + location.search + "#orders",
        );
    };
    if (!["#orders", "#returns"].includes(location.hash))
      history.replaceState(
        null,
        "",
        location.pathname + location.search + "#orders",
      );
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  useEffect(() => {
    const close = (event) => {
      if (!event.target.closest(".da-tools")) setPopup(null);
    };
    const escape = (event) => {
      if (event.key === "Escape") {
        setPopup(null);
        setMenu(false);
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  const navigate = (next) => {
    setScreen(next);
    setDetail(null);
    setMenu(false);
    setPopup(null);
    history.replaceState(
      null,
      "",
      location.pathname + location.search + "#" + next,
    );
    window.scrollTo({ top: 0 });
  };
  const togglePopup = (name) => setPopup((old) => (old === name ? null : name));
  const returns = screen === "returns";
  return (
    <div
      className="delivery-workspace"
      dir="rtl"
      data-theme={night ? "dark" : "light"}
    >
      <div className="da-header" role="banner">
        <button className="da-breadcrumb" onClick={() => navigate(screen)}>
          <Art name="orders" size={21} />
          <span>الطلبات</span>
        </button>
        <button
          className="da-mobile-menu"
          aria-label="قائمة مندوب التوصيل"
          aria-expanded={menu}
          onClick={() => setMenu(!menu)}
        >
          <span />
          <span />
          <span />
        </button>
        <div className="da-tools">
          <button
            className="da-profile"
            aria-label="حساب مندوب التوصيل"
            aria-expanded={popup === "profile"}
            onClick={() => togglePopup("profile")}
          >
            {account.avatarUrl ? (
              <img
                className="da-profile-avatar"
                src={account.avatarUrl}
                alt=""
              />
            ) : (
              <span className="da-profile-avatar">
                {account.name?.[0] || "م"}
              </span>
            )}
            <span>
              {account.name}
              <small>مندوب توصيل</small>
            </span>
          </button>
          <button
            aria-label="اللغة العربية"
            onClick={() => togglePopup("language")}
          >
            <Art name="globe" size={41} />
          </button>
          <button
            aria-label="إشعارات المندوب"
            aria-expanded={popup === "notifications"}
            onClick={() => togglePopup("notifications")}
          >
            <Art name="bell" size={41} />
          </button>
          <button
            aria-label="تبديل مظهر واجهة المندوب"
            aria-pressed={night}
            onClick={() => setNight(!night)}
          >
            <Art name="sun" size={41} />
          </button>
          {popup && (
            <div className="da-header-popup">
              {popup === "profile" ? (
                <>
                  <b>{account.name}</b>
                  <button onClick={onLogout}>تسجيل الخروج</button>
                </>
              ) : popup === "language" ? (
                "العربية"
              ) : (
                "لا توجد إشعارات جديدة في المعاينة."
              )}
            </div>
          )}
        </div>
      </div>
      {menu && (
        <button
          className="da-menu-backdrop"
          aria-label="إغلاق قائمة المندوب"
          onClick={() => setMenu(false)}
        />
      )}
      <aside
        className={"da-sidebar " + (menu ? "open" : "")}
        aria-label="تنقل مندوب التوصيل"
      >
        <img
          className="da-brand"
          src="/images/brand/logo.png"
          alt="MY PART — ماي بارت"
        />
        <nav>
          <button
            className="da-sidebar-parent"
            onClick={() => navigate("orders")}
          >
            <Art name="sidebarOrders" size={21} />
            الطلبات<span>−</span>
          </button>
          <button
            className={!returns ? "active" : ""}
            aria-current={!returns ? "page" : undefined}
            onClick={() => navigate("orders")}
          >
            الطلبات
          </button>
          <button
            className={returns ? "active" : ""}
            aria-current={returns ? "page" : undefined}
            onClick={() => navigate("returns")}
          >
            طلبات الإرجاع
          </button>
        </nav>
      </aside>
      {detail ? (
        <DeliveryDetail
          key={screen + detail.id}
          row={detail}
          returns={returns}
          received={received.has(detail.id)}
          onReceive={(id) => setReceived((old) => new Set([...old, id]))}
          saved={savedDetails[detail.id]}
          onSave={(value) =>
            setSavedDetails((old) => ({ ...old, [detail.id]: value }))
          }
        />
      ) : (
        <DeliveryList
          key={screen}
          returns={returns}
          receivedReturns={received}
          onOpen={(row) => {
            setDetail(row);
            window.scrollTo({ top: 0 });
          }}
        />
      )}
    </div>
  );
}
