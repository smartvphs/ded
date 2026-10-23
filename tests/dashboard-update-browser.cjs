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
          accessToken: "audit-test",
          admin: { name: "اختبار" },
        }),
      ),
    );
    const page = await context.newPage(),
      errors = [],
      writes = [],
      reads = [];
    page.on("pageerror", (e) => errors.push(e.message));
    let settingsVerifyFail = false,
      noteVerifyFail = false,
      costVerifyFail = false,
      deleted = false,
      costKnown = false,
      unitCost = null,
      source = null;
    let settings = {
      groups: [
        {
          key: "margins",
          label: "الهوامش والعمولات",
          settings: [
            {
              key: "platform_margin_percent",
              label: "هامش المنصة",
              type: "percent",
              min: 0,
              max: 100,
              value: 20,
            },
            {
              key: "payment_fee_moyasar_percent",
              label: "رسوم الدفع",
              type: "percent",
              min: 0,
              max: 100,
              value: 0,
            },
          ],
        },
        {
          key: "cashback",
          label: "الكاش باك",
          settings: [
            {
              key: "cashback_percent",
              label: "نسبة الكاش باك",
              type: "percent",
              value: 2,
              min: 0,
              max: 100,
            },
          ],
        },
      ],
      unknown: [{ key: "legacy", value: 1, isReadOnly: true }],
    };
    let ticket = {
      id: "t1",
      ticket_number: "TKT-1",
      source: "customer",
      customer_name: "أحمد",
      subject: "مشكلة تجريبية",
      status: "open",
      priority: "normal",
      category: "other",
      created_at: "2026-10-22T10:00:00Z",
      assigned_to: null,
      assigned_name: null,
      internal_notes: [],
      messages: [],
    };
    let categories = [
      {
        id: "c1",
        code: "other",
        name: "أخرى",
        name_en: "Other",
        is_active: true,
        is_protected: true,
        sort_order: 1,
        tickets_count: 1,
      },
    ];
    let contact = {
      id: "ct1",
      name: "مرسل حقيقي من الرد",
      subject: "استفسار",
      message: "نص الرسالة من الخادم",
      status: "new",
      admin_notes: null,
    };
    await page.route(
      "https://car-parts-backend.vercel.app/**",
      async (route) => {
        const req = route.request(),
          u = new URL(req.url()),
          p = u.pathname,
          m = req.method(),
          body = req.postDataJSON();
        assert.equal(req.headers().authorization, "Bearer audit-test");
        if (m === "GET") reads.push(p + u.search);
        else writes.push({ p, m, body });
        const send = (data, status = 200) =>
          route.fulfill({
            status,
            contentType: "application/json",
            body: JSON.stringify({ success: status < 400, ...data }),
          });
        if (p === "/api/admin/notifications")
          return send({
            data: { items: [], unreadCount: 0 },
            meta: { total: 0 },
          });
        if (p === "/api/admin/me")
          return send({
            data: {
              id: "admin",
              isSuperAdmin: true,
              permissions: [
                "settings.manage",
                "orders.manage",
                "support.manage",
              ],
            },
          });
        if (p === "/api/admin/settings") {
          if (m === "PATCH") {
            assert.deepEqual(body, { platform_margin_percent: 25 });
            settings.groups[0].settings[0].value = 25;
            settingsVerifyFail = true;
            return send({
              data: {
                updated: 1,
                settings: [{ key: "platform_margin_percent", value: 25 }],
              },
            });
          }
          if (settingsVerifyFail) {
            settingsVerifyFail = false;
            return send({ message: "تعذر تأكيد الإعدادات" }, 503);
          }
          return send({ data: settings });
        }
        if (p === "/api/contact/admin")
          return send({
            data: {
              items: [contact],
              countsByStatus: {
                new: contact.status === "new" ? 1 : 0,
                replied: contact.status === "replied" ? 1 : 0,
              },
            },
          });
        if (p === "/api/contact/admin/ct1") {
          if (m === "PATCH") {
            contact = {
              ...contact,
              status: body.status ?? contact.status,
              admin_notes: body.adminNotes ?? contact.admin_notes,
            };
            return send({ data: contact });
          }
          return send({ data: contact });
        }
        if (p === "/api/support-tickets/admin/assignees")
          return send({
            data: {
              items: [{ id: "staff", name: "الموظف المختص", open_tickets: 2 }],
            },
          });
        if (p === "/api/support-tickets/admin/categories") {
          if (m === "POST") {
            const row = {
              id: "c2",
              code: body.code || "delivery",
              name: body.name,
              name_en: body.nameEn || null,
              is_active: body.isActive,
              sort_order: body.sortOrder || 2,
              tickets_count: 0,
              is_protected: false,
            };
            categories.push(row);
            return send({ data: row }, 201);
          }
          return send({ data: { items: categories } });
        }
        if (p === "/api/support-tickets/admin/categories/c2") {
          if (m === "PATCH") {
            Object.assign(categories[1], {
              name: body.name ?? categories[1].name,
              is_active: body.isActive ?? categories[1].is_active,
            });
            return send({ data: categories[1] });
          }
          if (m === "DELETE") {
            categories = categories.filter((x) => x.id !== "c2");
            return send({ data: { id: "c2" } });
          }
        }
        if (p === "/api/support-tickets/admin")
          return send({
            data: {
              items: deleted ? [] : [ticket],
              total: deleted ? 0 : 1,
              countsByStatus: deleted ? {} : { open: 1 },
            },
          });
        if (p === "/api/support-tickets/admin/t1") {
          if (m === "DELETE") {
            deleted = true;
            return send({ data: { id: "t1" } });
          }
          if (deleted) return send({ message: "not found" }, 404);
          if (noteVerifyFail) {
            noteVerifyFail = false;
            return send({ message: "تعذر تأكيد الملاحظة" }, 503);
          }
          return send({ data: ticket });
        }
        if (p === "/api/support-tickets/admin/t1/assign") {
          ticket.assigned_to = body.staffId;
          ticket.assigned_name = body.staffId ? "الموظف المختص" : null;
          return send({
            data: { id: "t1", assignedTo: { id: body.staffId }, changed: true },
          });
        }
        if (p === "/api/support-tickets/admin/t1/priority") {
          ticket.priority = body.priority;
          return send({ data: { id: "t1", priority: body.priority } });
        }
        if (p === "/api/support-tickets/admin/t1/notes") {
          const note = {
            id: "n1",
            body: body.body,
            author_id: "admin",
            author_name: "الإدارة",
            created_at: "2026-10-22T11:00:00Z",
          };
          ticket.internal_notes.push(note);
          noteVerifyFail = true;
          return send({ data: note }, 201);
        }
        if (p === "/api/support-tickets/admin/t1/notes/n1") {
          ticket.internal_notes = [];
          return send({ data: { id: "n1" } });
        }
        if (p === "/api/admin/reports/missing-costs")
          return send({
            data: {
              items: costKnown
                ? []
                : [
                    {
                      orderId: "o1",
                      orderNumber: "ORD-1",
                      orderItemId: "i1",
                      productName: "قطعة بتكلفة ناقصة",
                      quantity: 2,
                      unitPrice: "100",
                      lineTotal: "200",
                    },
                  ],
              pagination: { total: costKnown ? 0 : 1, limit: 20, offset: 0 },
              totalSales: costKnown ? "0" : "200",
            },
          });
        if (p === "/api/orders/admin/o1/items/i1/cost") {
          unitCost = body.unitCost;
          source = unitCost === null ? "quotation" : "manual";
          costKnown = true;
          costVerifyFail = true;
          return send({
            data: {
              order: { id: "o1" },
              items: [
                { id: "i1", unitCost: unitCost ?? 50, costSource: source },
              ],
              summary: {},
            },
          });
        }
        if (p === "/api/orders/admin/o1/costs") {
          if (costVerifyFail) {
            costVerifyFail = false;
            return send({ message: "تعذر تأكيد التكلفة" }, 503);
          }
          return send({
            data: {
              order: { id: "o1" },
              items: [
                { id: "i1", unitCost: unitCost ?? 50, costSource: source },
              ],
              summary: {},
            },
          });
        }
        return send({ message: "not found" }, 404);
      },
    );
    await page.goto("http://127.0.0.1:5189/#settings");
    await page.getByLabel("هامش المنصة", { exact: true }).fill("25");
    await page.getByRole("button", { name: "حفظ جميع الإعدادات" }).click();
    await page
      .getByRole("button", { name: "تأكيد الحفظ", exact: true })
      .click();
    await page.getByText("تعذر تأكيد الإعدادات", { exact: true }).waitFor();
    await page
      .getByRole("button", { name: "إعادة التحقق", exact: true })
      .click();
    await page.getByText("تم حفظ الإعدادات وتأكيدها من الخادم.").waitFor();
    assert.equal(writes.filter((x) => x.p === "/api/admin/settings").length, 1);
    await page.getByRole("tab", { name: "إدارة التواصل", exact: true }).click();
    await page.getByText("مرسل حقيقي من الرد", { exact: true }).waitFor();
    await page.getByRole("button", { name: "عرض الرسالة" }).click();
    await page.getByText("نص الرسالة من الخادم").waitFor();
    await page.getByLabel("تعديل حالة الرسالة").selectOption("replied");
    await page.getByLabel("ملاحظات رسالة التواصل").fill("تم التواصل هاتفيًا");
    await page.getByRole("button", { name: "حفظ الرسالة" }).click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    await page
      .getByRole("button", { name: "تذاكر مساعدة", exact: true })
      .click();
    await page
      .getByLabel("تعيين التذكرة", { exact: true })
      .selectOption("staff");
    await page.getByRole("button", { name: "تأكيد", exact: true }).click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    assert.equal(ticket.assigned_to, "staff");
    await page.getByLabel("تغيير أولوية التذكرة").selectOption("urgent");
    await page.getByRole("button", { name: "تأكيد", exact: true }).click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    assert.equal(ticket.priority, "urgent");
    await page.getByLabel("نص الملاحظة الداخلية").fill("ملاحظة خاصة لا تُرسل");
    await page
      .getByRole("button", { name: "إضافة ملاحظة داخلية", exact: true })
      .click();
    await page.getByRole("button", { name: "تأكيد", exact: true }).click();
    await page.getByText("تعذر تأكيد الملاحظة", { exact: true }).waitFor();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "إعادة التحقق", exact: true })
      .click();
    await page.getByText("ملاحظة خاصة لا تُرسل", { exact: true }).waitFor();
    assert.equal(
      writes.filter((x) => x.p.endsWith("/notes") && x.m === "POST").length,
      1,
    );
    assert(!writes.some((x) => x.p.endsWith("/reply")));
    await page.getByRole("button", { name: "حذف الملاحظة n1" }).click();
    await page.getByRole("button", { name: "تأكيد", exact: true }).click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    await page
      .getByRole("button", { name: "أنواع المشكلة", exact: true })
      .click();
    assert(
      await page
        .locator(".support-category-list article")
        .first()
        .getByRole("button", { name: "حذف النوع" })
        .isDisabled(),
    );
    await page
      .getByRole("button", { name: "إضافة نوع مشكلة", exact: true })
      .click();
    await page
      .getByLabel("اسم نوع المشكلة", { exact: true })
      .fill("مشكلة في الشحن");
    await page.getByLabel("اسم نوع المشكلة بالإنجليزية").fill("Shipping issue");
    await page.getByRole("button", { name: "حفظ النوع", exact: true }).click();
    await page.getByText("مشكلة في الشحن", { exact: true }).waitFor();
    await page
      .locator(".support-category-list article")
      .last()
      .getByRole("button", { name: "حذف النوع" })
      .click();
    await page
      .getByRole("button", { name: "تأكيد الحذف", exact: true })
      .click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    await page
      .getByRole("button", { name: "تذاكر المساعدة", exact: true })
      .click();
    await page
      .getByRole("button", { name: "حذف التذكرة", exact: true })
      .click();
    await page.getByRole("button", { name: "تأكيد", exact: true }).click();
    await page.getByText("لا توجد تذاكر تطابق البحث.").waitFor();
    await page.evaluate(async () => {
      const React = (await import("/node_modules/.vite/deps/react.js")).default;
      const dom = await import("/node_modules/.vite/deps/react-dom_client.js");
      const createRoot = dom.createRoot || dom.default.createRoot;
      const { default: MissingCosts } = await import("/src/MissingCosts.jsx");
      const div = document.createElement("div");
      document.body.appendChild(div);
      window.costRoot = createRoot(div);
      window.costRoot.render(
        React.createElement(MissingCosts, {
          period: { from: "2026-10-01", to: "2026-10-23" },
          account: { isSuperAdmin: true },
          onChanged: () => {},
          onSessionExpired: () => {},
        }),
      );
    });
    await page
      .getByRole("button", { name: "تسجيل التكلفة", exact: true })
      .click();
    await page.getByLabel("تكلفة الوحدة", { exact: true }).fill("0");
    await page
      .getByRole("button", { name: "حفظ التكلفة", exact: true })
      .click();
    await page.getByText("تعذر تأكيد التكلفة", { exact: true }).waitFor();
    await page
      .getByRole("button", { name: "إعادة التحقق", exact: true })
      .click();
    await page
      .getByText("لا توجد بنود بتكلفة ناقصة خلال هذه الفترة.")
      .waitFor();
    assert.equal(writes.filter((x) => x.p.endsWith("/cost")).length, 1);
    assert.equal(writes.find((x) => x.p.endsWith("/cost")).body.unitCost, 0);
    assert(
      reads.some((x) =>
        x.includes(
          "missing-costs?from=2026-10-01&to=2026-10-23&limit=20&offset=0",
        ),
      ),
    );
    assert.equal(errors.length, 0, errors.join("\n"));
    console.log(
      "Dashboard update browser PASS: real schema settings/verification retry, contact messages, ticket assignment/priority/private notes/GET-only retry/delete, protected type/create/delete, missing costs and zero-cost readback without duplicate writes.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
