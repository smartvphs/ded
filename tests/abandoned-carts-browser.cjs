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
      viewport: { width: 1440, height: 1100 },
    });
    await context.addInitScript(() =>
      localStorage.setItem(
        "mypart.admin.session.v1",
        JSON.stringify({
          verified: true,
          accessToken: "cart-test",
          admin: { name: "اختبار" },
        }),
      ),
    );
    const page = await context.newPage(),
      errors = [],
      reads = [],
      writes = [];
    page.on("pageerror", (e) => errors.push(e.message));
    let failList = true,
      failSingle = true,
      denyList = false,
      readOnly = false,
      missingDetail = false;
    const carts = Array.from({ length: 9 }, (_, i) => ({
      userId: "u" + i,
      name: "عميل " + i,
      email: "u" + i + "@example.com",
      phone: "+96650000000" + i,
      itemsCount: 1,
      quantity: 4,
      cartValue: "1000.00",
      firstAddedAt: "2026-10-14T11:02:57.201Z",
      lastActivityAt: "2026-10-14T11:02:57.201Z",
      idleHours: i === 3 ? 2 : 150 + i,
      lastReminderAt: i === 2 ? "2026-10-20T18:40:55Z" : null,
      remindersCount: i === 2 ? 1 : 0,
      reminderStatus:
        i === 2 ? "already_reminded" : i === 3 ? "not_abandoned" : "ready",
      canRemind: ![2, 3].includes(i),
    }));
    const history = {};
    const sent = (id) => {
      const r = {
        reminderId: "reminder-" + id,
        userId: id,
        message: "سلتك ما زالت بانتظارك",
        sentAt: "2026-10-22T12:00:00Z",
      };
      const c = carts.find((c) => c.userId === id);
      c.canRemind = false;
      c.reminderStatus = "already_reminded";
      c.lastReminderAt = r.sentAt;
      c.remindersCount++;
      history[id] = [{ ...r, recovered: false }];
      return r;
    };
    await page.route(
      "https://car-parts-backend.vercel.app/**",
      async (route) => {
        const req = route.request(),
          url = new URL(req.url()),
          path = url.pathname,
          method = req.method();
        assert.equal(req.headers().authorization, "Bearer cart-test");
        const send = (data, status = 200) =>
          route.fulfill({
            status,
            contentType: "application/json",
            body: JSON.stringify({ success: status < 400, ...data }),
          });
        if (method === "GET") reads.push(path + url.search);
        else writes.push({ path, method, body: req.postDataJSON() });
        if (path === "/api/admin/me")
          return send({
            data: {
              id: "admin",
              isSuperAdmin: false,
              permissions: readOnly
                ? ["customers.view"]
                : ["customers.view", "customers.manage"],
            },
          });
        if (path === "/api/admin/abandoned-carts" && method === "GET") {
          if (denyList) return send({ message: "forbidden" }, 403);
          if (failList) {
            failList = false;
            return send({ message: "تعذر تحميل السلات مؤقتًا" }, 503);
          }
          let rows = carts.filter(
            (c) =>
              c.idleHours >= Number(url.searchParams.get("idleHours") || 24),
          );
          const search = url.searchParams.get("search");
          if (search)
            rows = rows.filter((c) =>
              (c.name + c.phone + c.email).includes(search),
            );
          if (url.searchParams.get("order") === "asc")
            rows = [...rows].reverse();
          const total = rows.length,
            offset = +url.searchParams.get("offset"),
            limit = +url.searchParams.get("limit");
          rows = rows.slice(offset, offset + limit);
          return send({
            data: rows,
            meta: {
              total,
              limit,
              offset,
              idleHours: 24,
              metrics: {
                abandonedCarts: 8,
                abandonedValue: "8000.00",
                abandonedQuantity: 32,
                readyToRemind: carts.filter((c) => c.canRemind).length,
                guestCarts: 71,
                guestValue: "27787.49",
                last30Days: {
                  remindersSent: Object.keys(history).length,
                  recovered: 0,
                  recoveryRate: null,
                },
              },
            },
          });
        }
        if (path === "/api/admin/abandoned-carts/remind" && method === "POST") {
          const ids = req.postDataJSON().userIds;
          assert.deepEqual(ids, ["u0", "u1"]);
          const result = sent("u0");
          carts[1].canRemind = false;
          carts[1].reminderStatus = "already_reminded";
          return send({
            data: {
              sent: [result],
              skipped: [{ userId: "u1", reason: "already_reminded" }],
              sentCount: 1,
              skippedCount: 1,
            },
          });
        }
        const match = path.match(
          /^\/api\/admin\/abandoned-carts\/(u\d+)(\/remind)?$/,
        );
        if (match) {
          const id = match[1],
            cart = carts.find((c) => c.userId === id);
          if (method === "POST") {
            if (id === "u5")
              return send({ message: "تعذر الاتصال أثناء الإرسال" }, 503);
            if (id === "u6") return send({ data: {} });
            if (id === "u7") {
              cart.canRemind = false;
              cart.reminderStatus = "already_reminded";
              return send({ message: "سبق إرسال التذكير" }, 409);
            }
            if (failSingle) {
              failSingle = false;
              return send({ message: "تعذر حفظ نص الرسالة" }, 422);
            }
            return send({ data: sent(id) });
          }
          if (missingDetail)
            return send({ message: "لا توجد سلة لهذا العميل" }, 404);
          return send({
            data: {
              ...cart,
              isAbandoned: cart.idleHours >= 24,
              cart: {
                items: [
                  {
                    id: "item-" + id,
                    quantity: 4,
                    name: "فلتر هواء أصلي",
                    nameEn: "Air Filter",
                    thumbnail: null,
                    quality: "oem",
                    qualityLabel: "أصلي",
                    condition: "new",
                    price: 250,
                    lineTotal: "1000.00",
                    oldPrice: 300,
                    discountPercentage: 16.67,
                    isUniversal: false,
                    compatibility: [
                      {
                        makeNameAr: "تويوتا",
                        modelNameAr: "كامري",
                        yearFrom: 2018,
                        yearTo: 2024,
                      },
                    ],
                    variant: { nameAr: "فل كامل", engine: "2.5" },
                    linkedCar: {
                      makeNameAr: "تويوتا",
                      modelNameAr: "كامري",
                      year: 2022,
                    },
                  },
                ],
                itemsCount: 1,
                subtotal: "1000.00",
                orderSummary: {
                  subtotal: "1000.00",
                  discount: "50.00",
                  shippingFee: "0.00",
                  tax: "142.50",
                  total: "1092.50",
                },
                coupon: { code: "SAVE50" },
                missingVinCount: 1,
              },
              reminders: history[id] || [],
            },
          });
        }
        throw new Error("Unexpected endpoint " + method + " " + path);
      },
    );
    await page.goto(
      (process.env.TEST_BASE_URL || "http://127.0.0.1:5189") + "/#carts",
    );
    await page.getByText("تعذر تحميل السلات مؤقتًا", { exact: true }).waitFor();
    await page
      .getByRole("button", { name: "إعادة المحاولة", exact: true })
      .click();
    await page
      .getByRole("button", { name: "عرض السلة u0", exact: true })
      .waitFor();
    await page.screenshot({
      path: "/tmp/abandoned-carts-desktop.png",
      fullPage: true,
    });
    assert.equal(writes.length, 0);
    assert(
      await page
        .getByRole("checkbox", { name: "تحديد السلة u2", exact: true })
        .isDisabled(),
    );
    assert(
      await page
        .getByRole("button", { name: "تذكير السلة u2", exact: true })
        .isDisabled(),
    );
    await page.getByRole("button", { name: "التالي", exact: true }).click();
    await page
      .getByRole("button", { name: "عرض السلة u8", exact: true })
      .waitFor();
    assert(reads.some((p) => p.includes("offset=7")));
    await page.getByLabel("البحث في السلات", { exact: true }).fill("u4@");
    await page
      .getByRole("button", { name: "عرض السلة u4", exact: true })
      .waitFor();
    assert(reads.some((p) => p.includes("search=u4%40")));
    await page
      .getByRole("button", { name: "عرض السلة u4", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "فلتر هواء أصلي", exact: true })
      .waitFor();
    await page.getByText("SAVE50", { exact: false }).waitFor();
    assert(
      (await page.locator(".cart-product-photo").getAttribute("src")) ===
        "/images/products/default-product.jpeg",
    );
    assert(
      (await page.locator(".cart-order-summary").innerText()).includes(
        "1,092.5",
      ),
    );
    await page.getByText("السيارات المتوافقة (1)", { exact: true }).click();
    await page.getByText("كامري", { exact: true }).waitFor();
    assert(reads.includes("/api/admin/abandoned-carts/u4"));
    await page
      .getByRole("button", { name: "إرسال رسالة تذكير", exact: true })
      .click();
    await page.getByLabel("نص التذكير", { exact: true }).fill("قص");
    await page
      .getByRole("button", { name: "تأكيد الإرسال", exact: true })
      .click();
    await page
      .getByText("نص التذكير من 5 إلى 300 حرف.", { exact: true })
      .waitFor();
    assert.equal(writes.length, 0);
    await page
      .getByLabel("نص التذكير", { exact: true })
      .fill("سلتك بانتظارك أكمل طلبك");
    await page
      .getByRole("button", { name: "تأكيد الإرسال", exact: true })
      .click();
    await page.getByText("تعذر حفظ نص الرسالة", { exact: true }).waitFor();
    await page
      .getByRole("button", { name: "تأكيد الإرسال", exact: true })
      .click();
    await page
      .getByText("أكد الخادم إرسال 1 تذكير، وتخطي 0 سلة.", { exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "إغلاق", exact: true })
      .last()
      .click();
    assert(
      await page
        .getByRole("button", { name: "إرسال رسالة تذكير", exact: true })
        .isDisabled(),
    );
    await page.getByRole("cell", { name: "لم تُسترد", exact: true }).waitFor();
    await page.screenshot({
      path: "/tmp/abandoned-cart-details-desktop.png",
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "رجوع للسلات المتروكة", exact: true })
      .click();
    await page.getByLabel("البحث في السلات", { exact: true }).fill("");
    await page
      .getByRole("checkbox", { name: "تحديد السلة u0", exact: true })
      .check();
    await page
      .getByRole("checkbox", { name: "تحديد السلة u1", exact: true })
      .check();
    await page
      .getByRole("button", { name: /إرسال رسائل استرداد للسلات/ })
      .click();
    assert.equal(
      await page.getByLabel("نص التذكير", { exact: true }).count(),
      0,
    );
    await page
      .getByRole("button", { name: "تأكيد الإرسال", exact: true })
      .click();
    await page
      .getByText("أكد الخادم إرسال 1 تذكير، وتخطي 1 سلة.", { exact: true })
      .waitFor();
    await page
      .getByText("عميل 1: سبق إرسال تذكير بدون إضافة جديدة", { exact: true })
      .waitFor();
    assert.deepEqual(
      writes.find((w) => w.path === "/api/admin/abandoned-carts/remind").body,
      { userIds: ["u0", "u1"] },
    );
    await page
      .getByRole("button", { name: "إغلاق", exact: true })
      .last()
      .click();
    assert(
      await page
        .getByRole("button", { name: "تذكير السلة u0", exact: true })
        .isDisabled(),
    );
    await page.getByLabel("مدة توقف السلة").selectOption("1");
    await page
      .getByRole("button", { name: "عرض السلة u3", exact: true })
      .waitFor();
    assert(
      await page
        .getByRole("button", { name: "تذكير السلة u3", exact: true })
        .isDisabled(),
    );
    assert(reads.some((p) => p.includes("idleHours=1")));
    await page.getByLabel("ترتيب السلات").selectOption("asc");
    await page.waitForResponse((r) => r.url().includes("order=asc"));
    assert(reads.some((p) => p.includes("order=asc")));
    await page.getByLabel("ترتيب السلات").selectOption("desc");
    await page
      .getByRole("button", { name: "تذكير السلة u5", exact: true })
      .click();
    await page
      .getByRole("button", { name: "تأكيد الإرسال", exact: true })
      .click();
    await page
      .getByText(
        "نتيجة الإرسال غير مؤكدة. حدّث بيانات السلات وراجع سجل التذكير قبل أي محاولة جديدة.",
        { exact: true },
      )
      .waitFor();
    assert(
      await page
        .getByRole("button", { name: "تأكيد الإرسال", exact: true })
        .isDisabled(),
    );
    await page
      .getByRole("button", { name: "إغلاق", exact: true })
      .last()
      .click();
    assert(
      await page
        .getByRole("button", { name: "تذكير السلة u5", exact: true })
        .isDisabled(),
    );
    assert.equal(writes.filter((w) => w.path.endsWith("/u5/remind")).length, 1);
    await page
      .getByRole("button", { name: "تذكير السلة u6", exact: true })
      .click();
    await page
      .getByRole("button", { name: "تأكيد الإرسال", exact: true })
      .click();
    await page
      .getByText(
        "الخادم لم يرجع تأكيد إرسال صالحًا. حدّث السلة قبل تكرار الإرسال.",
        { exact: true },
      )
      .waitFor();
    assert(
      await page
        .getByRole("button", { name: "تأكيد الإرسال", exact: true })
        .isDisabled(),
    );
    await page
      .getByRole("button", { name: "إغلاق", exact: true })
      .last()
      .click();
    await page.getByLabel("البحث في السلات", { exact: true }).fill("u7@");
    await page
      .getByRole("button", { name: "تذكير السلة u7", exact: true })
      .click();
    await page
      .getByRole("button", { name: "تأكيد الإرسال", exact: true })
      .click();
    await page.getByText("سبق إرسال التذكير", { exact: true }).waitFor();
    await page.getByRole("button", { name: "إلغاء", exact: true }).click();
    assert(
      await page
        .getByRole("button", { name: "تذكير السلة u7", exact: true })
        .isDisabled(),
    );
    await page.getByLabel("البحث في السلات", { exact: true }).fill("no-match");
    await page
      .getByText("لا توجد سلات تطابق البحث.", { exact: true })
      .waitFor();
    await page.getByLabel("البحث في السلات", { exact: true }).fill("");
    await page
      .getByRole("button", { name: "عرض السلة u0", exact: true })
      .waitFor();
    missingDetail = true;
    await page
      .getByRole("button", { name: "عرض السلة u0", exact: true })
      .click();
    await page.getByText("لا توجد سلة لهذا العميل", { exact: true }).waitFor();
    await page
      .getByRole("button", { name: "رجوع للسلات المتروكة", exact: true })
      .click();
    missingDetail = false;
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: "/tmp/abandoned-carts-mobile.png",
      fullPage: true,
    });
    readOnly = true;
    await page.reload();
    await page
      .getByRole("button", { name: "عرض السلة u5", exact: true })
      .waitFor();
    assert(
      await page
        .getByRole("button", { name: "تذكير السلة u5", exact: true })
        .isDisabled(),
    );
    assert(
      await page
        .getByRole("checkbox", { name: "تحديد السلة u5", exact: true })
        .isDisabled(),
    );
    denyList = true;
    await page.reload();
    await page
      .getByText("ليس لديك صلاحية لعرض هذه البيانات أو تنفيذ الإجراء.", {
        exact: true,
      })
      .waitFor();
    assert.equal(
      await page
        .getByRole("button", { name: "عرض السلة u0", exact: true })
        .count(),
      0,
    );
    assert.deepEqual(errors, []);
    console.log(
      "Abandoned carts browser PASS: server filters/paging/metrics, actual cart items/images/summary, single validation and reminder log, partial bulk/skipped results, uncertain and malformed acknowledgements locked, 409 refresh, 404/403/read-only, mobile/no JS errors.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
