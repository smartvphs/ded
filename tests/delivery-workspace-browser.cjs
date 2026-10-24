const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE || "playwright-core",
);
const assert = require("node:assert/strict");
const fs = require("fs");
(async () => {
  const b = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  try {
    const c = await b.newContext({ viewport: { width: 1440, height: 1475 } }),
      base = process.env.TEST_BASE_URL || "http://127.0.0.1:5189";
    const permissions = [
      "orders.view",
      "orders.manage",
      "orders.dispatch",
      "returns.manage",
    ];
    const driver = {
      id: "delivery-test",
      name: "جيمي",
      role: "staff",
      isSuperAdmin: false,
      permissions,
    };
    await c.addInitScript((account) => {
      localStorage.setItem(
        "mypart.admin.session.v1",
        JSON.stringify({
          verified: true,
          accessToken: "delivery-ui-test",
          refreshToken: "delivery-refresh-test",
          admin: account,
        }),
      );
      sessionStorage.setItem("mypart.screen", "settings");
    }, driver);
    const p = await c.newPage(),
      errors = [],
      calls = [];
    let loginProfile = driver;
    p.on("pageerror", (e) => errors.push(e.message));
    await c.route("https://car-parts-backend.vercel.app/**", async (r) => {
      const req = r.request(),
        url = new URL(req.url()),
        path = url.pathname;
      calls.push({ method: req.method(), path });
      const send = (data, meta) =>
        r.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data, meta }),
        });
      if (path === "/api/admin/notifications")
        return send({ items: [], unreadCount: 0 }, { total: 0 });
      if (path === "/api/orders/all")
        return send([], {
          total: 0,
          statusCounts: {
            all: 0,
            pending: 0,
            confirmed: 0,
            shipped: 0,
            delivered: 0,
            cancelled: 0,
          },
        });
      if (path === "/api/cars/admin/makes") return send([], { total: 0 });
      if (path === "/api/suppliers/admin") return send({ items: [], total: 0 });
      if (path === "/api/returns/admin")
        return send({ items: [], total: 0, countsByStatus: {} });
      if (path === "/api/admin/login")
        return send({ challengeId: "delivery-login-challenge" });
      if (path === "/api/admin/login/verify")
        return send({
          user: loginProfile,
          accessToken: "verified-delivery-test",
          refreshToken: "verified-refresh-test",
        });
      if (path === "/api/auth/logout") return send({ loggedOut: true });
      return r.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          message: "Unexpected UI test endpoint " + path,
        }),
      });
    });
    fs.mkdirSync("/tmp/delivery-ui", { recursive: true });
    const shot = async (name, height) => {
      if (height) await p.setViewportSize({ width: 1440, height });
      await p.evaluate(() => document.fonts.ready);
      await p.screenshot({
        path: "/tmp/delivery-ui/" + name + ".png",
        fullPage: true,
      });
    };
    await p.goto(base + "/#settings", { waitUntil: "networkidle" });
    await p.locator(".delivery-workspace").waitFor();
    assert.equal(new URL(p.url()).hash, "#orders");
    assert.equal(await p.locator(".sidebar").count(), 0);
    assert.equal(await p.locator(".da-sidebar nav button").count(), 3);
    assert.equal(await p.locator(".da-stat").count(), 6);
    assert.equal(await p.locator(".da-order-table tbody tr").count(), 7);
    await shot("26-orders", 1475);
    await p.getByRole("combobox", { name: "حالة الطلب", exact: true }).click();
    await shot("29-status-filter", 1475);
    await p.getByRole("option", { name: "تم التوصيل", exact: true }).click();
    await p
      .getByRole("button", { name: "البحث و التصنيف", exact: true })
      .click();
    assert(
      (
        await p.locator(".da-order-table tbody .da-badge").allTextContents()
      ).every((x) => x === "تم التوصيل"),
    );
    await p.getByRole("button", { name: "الكل 50", exact: false }).click();
    await p
      .getByRole("navigation", { name: "صفحات النتائج" })
      .getByRole("button", { name: "2", exact: true })
      .click();
    assert.equal(
      await p.locator(".da-id-link").first().textContent(),
      "PRQ-008",
    );
    await p
      .getByLabel("البحث في طلبات المندوب", { exact: true })
      .fill("PRQ-001");
    assert.equal(await p.locator(".da-order-table tbody tr").count(), 1);
    await p.getByLabel("تحديد PRQ-001", { exact: true }).check();
    await p.getByLabel("البحث في طلبات المندوب", { exact: true }).fill("");
    await p.getByLabel("عرض PRQ-002", { exact: true }).click();
    assert.equal(await p.locator(".da-supplier-card").count(), 2);
    assert.equal(await p.locator(".da-timeline li").count(), 4);
    assert.equal(await p.locator(".da-items-table tbody tr").count(), 5);
    await shot("30-order-details", 1508);
    await p.getByRole("tab", { name: "التكاليف", exact: true }).click();
    await shot("33-costs", 1113);
    assert.equal(await p.locator(".da-cost-warning").count(), 1);
    await p.getByLabel("تكلفة item-1", { exact: true }).fill("149");
    assert.equal(await p.locator(".da-cost-warning").count(), 0);
    await p.getByLabel("تكلفة item-2", { exact: true }).fill("0");
    await p.getByRole("tab", { name: "الشحن والتتبع", exact: true }).click();
    await shot("32-shipping", 1791);
    await p.getByRole("combobox", { name: "المدينة", exact: true }).click();
    await p.getByRole("option", { name: "جدة", exact: true }).click();
    await p
      .getByLabel("رقم بوليصة الشحن / رمز التتبع", { exact: true })
      .fill("UI-TRACK-123");
    await p.getByLabel("تكلفة الشحن", { exact: true }).fill("0");
    await p.getByLabel("إرفاق صورة البوليصة", { exact: true }).setInputFiles({
      name: "test-bill.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==",
        "base64",
      ),
    });
    await p
      .getByRole("button", { name: "تأكيد التكاليف", exact: false })
      .click();
    await p.getByRole("status").filter({ hasText: "في المعاينة" }).waitFor();
    await p
      .locator(".da-sidebar")
      .getByRole("button", { name: "الطلبات", exact: true })
      .last()
      .click();
    await p.getByLabel("عرض PRQ-002", { exact: true }).click();
    await p.getByRole("tab", { name: "التكاليف", exact: true }).click();
    assert.equal(
      await p.getByLabel("تكلفة item-2", { exact: true }).inputValue(),
      "0",
    );
    await p.getByRole("tab", { name: "الشحن والتتبع", exact: true }).click();
    assert.equal(
      await p.getByLabel("تكلفة الشحن", { exact: true }).inputValue(),
      "0",
    );
    assert.match(
      await p
        .getByRole("combobox", { name: "المدينة", exact: true })
        .textContent(),
      /جدة/,
    );
    assert.equal(
      await p.locator(".da-bill-upload").textContent(),
      "test-bill.png",
    );
    await p
      .locator(".da-sidebar")
      .getByRole("button", { name: "طلبات الإرجاع", exact: true })
      .click();
    assert.equal(await p.locator(".da-stat").count(), 4);
    assert.equal(await p.locator(".da-return-table tbody tr").count(), 8);
    assert.equal(
      await p.locator(".da-return-table tbody input:checked").count(),
      2,
    );
    await shot("27-returns", 1303);
    await p.getByLabel("تحديد كل المرتجعات الظاهرة", { exact: true }).check();
    assert.equal(
      await p.locator(".da-return-table tbody input:checked").count(),
      8,
    );
    await p.getByLabel("تحديد كل المرتجعات الظاهرة", { exact: true }).uncheck();
    await p.getByLabel("عرض RET-001", { exact: true }).click();
    await shot("28-return-details", 1303);
    await p.getByRole("button", { name: "تم الاستلام", exact: true }).click();
    assert.equal(
      await p
        .getByRole("button", { name: "تم الاستلام", exact: true })
        .isDisabled(),
      true,
    );
    await p
      .locator(".da-sidebar")
      .getByRole("button", { name: "طلبات الإرجاع", exact: true })
      .click();
    assert.match(
      await p.locator(".da-return-table tbody tr").first().textContent(),
      /تم الاستلام/,
    );
    await p.setViewportSize({ width: 390, height: 844 });
    assert.equal(
      await p.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      ),
      false,
    );
    await p.getByLabel("قائمة مندوب التوصيل", { exact: true }).click();
    await p
      .locator(".da-sidebar")
      .getByRole("button", { name: "الطلبات", exact: true })
      .last()
      .click();
    await p.screenshot({
      path: "/tmp/delivery-ui/mobile-orders.png",
      fullPage: true,
    });
    assert.equal(
      await p.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      ),
      false,
    );
    await p.getByLabel("عرض PRQ-002", { exact: true }).click();
    await p.getByRole("tab", { name: "الشحن والتتبع", exact: true }).click();
    await p.screenshot({
      path: "/tmp/delivery-ui/mobile-shipping.png",
      fullPage: true,
    });
    assert.equal(
      await p.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      ),
      false,
    );
    assert.deepEqual(
      calls,
      [],
      "Delivery UI must not call or mutate admin backend endpoints",
    );
    async function changeAccount(account) {
      await p.evaluate(async (account) => {
        const auth = await import("/src/auth-api.js");
        auth.setAuthSession({
          verified: true,
          accessToken: "role-switch-test",
          refreshToken: "role-switch-refresh",
          admin: account,
        });
        location.hash = "#orders";
      }, account);
    }
    await p.setViewportSize({ width: 1440, height: 1100 });
    await changeAccount({
      id: "admin",
      name: "أدمن",
      role: "admin",
      isSuperAdmin: true,
      permissions,
    });
    await p.locator(".orders-main").waitFor();
    assert.equal(await p.locator(".delivery-workspace").count(), 0);
    await p
      .getByRole("heading", { name: "إدارة الطلبات", exact: true })
      .waitFor();
    assert.equal(
      (await p.locator(".sidebar nav>button,.sidebar nav>div>button").count()) >
        3,
      true,
    );
    await p.screenshot({
      path: "/tmp/delivery-ui/admin-unchanged.png",
      fullPage: true,
    });
    await changeAccount({ ...driver, isSuperAdmin: true });
    assert.equal(await p.locator(".delivery-workspace").count(), 0);
    await changeAccount({
      ...driver,
      permissions: [...permissions, "settings.manage"],
    });
    assert.equal(await p.locator(".delivery-workspace").count(), 0);
    await changeAccount(driver);
    await p.locator(".delivery-workspace").waitFor();
    await p.getByLabel("حساب مندوب التوصيل", { exact: true }).click();
    await p.getByRole("button", { name: "تسجيل الخروج", exact: true }).click();
    await p
      .getByLabel("البريد الإلكتروني", { exact: true })
      .fill("driver@example.com");
    await p.getByLabel("الرقم السري", { exact: true }).fill("UiTest12345!");
    await p.getByRole("button", { name: "تسجيل دخول", exact: true }).click();
    await p.getByLabel("الرقم 1 من رمز التحقق", { exact: true }).fill("111111");
    await p.getByRole("button", { name: "متابعة", exact: true }).click();
    await p.locator(".delivery-workspace").waitFor();
    assert.equal(await p.locator(".sidebar").count(), 0);
    assert.deepEqual(errors, []);
    console.log(
      "PASS delivery UI: seven reference states, filtering/pagination/selection, detail tabs, local zero-cost/shipping edits and bill selection, returns receipt, mobile, staff/admin/superadmin isolation, OTP login routing, no delivery API calls or runtime errors.",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
