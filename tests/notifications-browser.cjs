const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE || "playwright-core",
);
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1050 },
    });
    await context.addInitScript(() =>
      localStorage.setItem(
        "mypart.admin.session.v1",
        JSON.stringify({
          verified: true,
          accessToken: "notifications-test",
          admin: { name: "اختبار" },
        }),
      ),
    );
    const page = await context.newPage(),
      errors = [],
      writes = [],
      reads = [];
    page.on("pageerror", (e) => errors.push(e.message));
    let items = Array.from({ length: 32 }, (_, i) => ({
      id: "n" + i,
      title:
        i === 0
          ? "طلب تسعير جديد بانتظار المراجعة"
          : i === 1
            ? "مخزون منخفض"
            : "طلب جديد " + i,
      body: i === 0 ? "1 قطعة تحتاج إضافة للكتالوج" : "رسالة من الخادم",
      type: i === 0 ? "pricing" : i === 1 ? "system" : "order",
      is_read: false,
      created_at: "2026-10-21T22:29:59.943Z",
      group: i === 0 ? "today" : "earlier",
      link:
        i === 0
          ? { entity: "pricing_request", id: "pr1" }
          : i === 1
            ? { entity: "products", ids: ["p1", "p2"] }
            : { entity: "order", id: "o" + i },
    }));
    let failVerify = false,
      deny = false;
    await page.route(
      "https://car-parts-backend.vercel.app/**",
      async (route) => {
        const req = route.request(),
          u = new URL(req.url()),
          path = u.pathname;
        assert.equal(req.headers().authorization, "Bearer notifications-test");
        const send = (data, status = 200) =>
          route.fulfill({
            status,
            contentType: "application/json",
            body: JSON.stringify({ success: status < 400, ...data }),
          });
        if (req.method() === "GET") {
          reads.push(path + u.search);
          if (path === "/api/admin/notifications") {
            if (deny) return send({ message: "forbidden" }, 403);
            if (failVerify) {
              failVerify = false;
              return send({ message: "تعذر التحقق" }, 503);
            }
            let filtered = items.filter(
              (x) =>
                (!u.searchParams.get("type") ||
                  x.type === u.searchParams.get("type")) &&
                (u.searchParams.get("unread") !== "true" || !x.is_read),
            );
            const limit = Number(u.searchParams.get("limit")),
              offset = Number(u.searchParams.get("offset"));
            return send({
              data: {
                items: filtered.slice(offset, offset + limit),
                unreadCount: items.filter((x) => !x.is_read).length,
              },
              meta: { total: filtered.length, limit, offset },
            });
          }
          if (path === "/api/pricing-requests/admin/pr1")
            return send({ message: "الطلب غير موجود" }, 404);
          if (path.startsWith("/api/products/admin/"))
            return send({
              data: {
                id: path.split("/").pop(),
                name: "منتج " + path.split("/").pop(),
                name_ar: "منتج " + path.split("/").pop(),
                images: [],
                specifications: [],
                compatibility: [],
                variants: [],
                qualities: [],
              },
            });
          return send({ message: "غير متاح" }, 404);
        }
        writes.push(req.method() + " " + path);
        if (path === "/api/notifications/read-all") {
          items.forEach((x) => (x.is_read = true));
          return send({ data: {} });
        }
        if (path === "/api/notifications/all") {
          items = [];
          return send({ data: {} });
        }
        const match = path.match(/^\/api\/notifications\/(n\d+)(\/read)?$/);
        if (match) {
          if (match[2]) {
            items.find((x) => x.id === match[1]).is_read = true;
            failVerify = true;
          } else items = items.filter((x) => x.id !== match[1]);
          return send({ data: {} });
        }
        throw Error("unexpected mutation " + path);
      },
    );
    await page.goto("http://127.0.0.1:5189/#notifications");
    await page.getByText("32 إشعار غير مقروء").waitFor();
    assert.equal(await page.locator(".notification-item").count(), 30);
    await page.getByRole("button", { name: "التالي", exact: true }).click();
    await page.getByText("صفحة 2 · 32 إشعار").waitFor();
    await page.getByText("طلب جديد 31", { exact: true }).waitFor();
    assert.equal(await page.locator(".notification-item").count(), 2);
    await page.getByRole("button", { name: "السابق", exact: true }).click();
    await page
      .getByText("طلب تسعير جديد بانتظار المراجعة", { exact: true })
      .waitFor();
    await page
      .locator(".notification-item")
      .first()
      .getByRole("button", { name: "تحديد كمقروء" })
      .click();
    await page
      .getByRole("button", { name: "إعادة التحقق", exact: true })
      .waitFor();
    assert.equal(writes.length, 1);
    await page
      .getByRole("button", { name: "إعادة التحقق", exact: true })
      .click();
    await page.getByText("31 إشعار غير مقروء").waitFor();
    assert.equal(writes.length, 1);
    await page
      .locator(".notification-item")
      .first()
      .getByRole("button", { name: "عرض التفاصيل" })
      .click();
    await page.getByText("الطلب غير موجود").waitFor();
    assert(reads.some((x) => x.startsWith("/api/pricing-requests/admin/pr1")));
    await page
      .getByRole("button", { name: /الإشعارات/ })
      .filter({ hasText: "الإشعارات" })
      .first()
      .click();
    await page.getByText("31 إشعار غير مقروء").waitFor();
    await page
      .locator(".notification-item")
      .nth(1)
      .getByRole("button", { name: "عرض التفاصيل" })
      .click();
    await page.getByText("المنتجات المرتبطة بالإشعار").waitFor();
    await page.getByRole("combobox").selectOption("p2");
    await page.getByText("منتج p2", { exact: true }).first().waitFor();
    await page
      .getByRole("button", { name: "العودة للإشعارات", exact: true })
      .click();
    await page.getByRole("button", { name: "قراءة الكل", exact: true }).click();
    await page.getByText("0 إشعار غير مقروء").waitFor();
    await page.getByRole("checkbox", { name: "غير المقروء فقط" }).check();
    await page.getByText("لا توجد إشعارات تطابق الاختيارات.").waitFor();
    await page.getByRole("checkbox", { name: "غير المقروء فقط" }).uncheck();
    await page.locator(".notification-item").first().waitFor();
    await page
      .getByRole("button", { name: "حذف الإشعار n0", exact: true })
      .click();
    assert.equal(
      writes.filter((x) => x === "DELETE /api/notifications/n0").length,
      0,
    );
    await page
      .getByRole("button", { name: "تأكيد الحذف", exact: true })
      .click();
    await page.getByText("صفحة 1 · 31 إشعار").waitFor();
    await page.getByRole("combobox").selectOption("system");
    await page.getByText("صفحة 1 · 1 إشعار").waitFor();
    await page.screenshot({
      path: "/tmp/notifications-desktop.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(
      () =>
        document.querySelector(".sidebar").getBoundingClientRect().x >=
        innerWidth - 1,
    );
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      "mobile overflow",
    );
    await page.screenshot({
      path: "/tmp/notifications-mobile.png",
      fullPage: true,
    });
    await page.getByRole("button", { name: "حذف الكل", exact: true }).click();
    await page
      .getByText("حذف كل إشعارات حسابك، بما فيها غير الظاهرة في الفلتر؟")
      .waitFor();
    await page
      .getByRole("button", { name: "تأكيد الحذف", exact: true })
      .click();
    await page.getByText("لا توجد إشعارات تطابق الاختيارات.").waitFor();
    assert.equal(items.length, 0);
    deny = true;
    await page.getByRole("button", { name: "تحديث", exact: true }).click();
    await page
      .getByText("ليس لديك صلاحية لعرض هذه البيانات أو تنفيذ الإجراء.")
      .waitFor();
    assert.equal(errors.length, 0, errors.join("\n"));
    console.log(
      "Notifications browser: PASS — paging, read verification without duplicate writes, pricing/product links, bulk reading, filtering, confirmed deletion, global delete, forbidden state",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
