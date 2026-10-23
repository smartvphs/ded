const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE || "playwright-core",
);
const assert = require("node:assert/strict");
(async () => {
  const b = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  try {
    const c = await b.newContext({ viewport: { width: 1440, height: 1100 } });
    await c.addInitScript(() =>
      localStorage.setItem(
        "mypart.admin.session.v1",
        JSON.stringify({ verified: true, accessToken: "ticket-cost-test" }),
      ),
    );
    const p = await c.newPage(),
      writes = [],
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    let permissions = ["support.manage", "orders.manage", "accounting.view"],
      deleted = false,
      failTicketRead = false,
      failCostRead = false,
      denyNote = false;
    const ticket = {
      id: "t1",
      ticket_number: "TKT-1",
      subject: "مساعدة",
      status: "open",
      priority: "normal",
      assigned_to: null,
      source: "customer",
      customer_name: "عميل",
      messages: [],
      internal_notes: [
        {
          id: "foreign",
          body: "ملاحظة موظف آخر",
          author_id: "other",
          author_name: "موظف",
          created_at: "2026-10-22T10:00:00Z",
        },
      ],
    };
    const costs = {
      order: { id: "o1" },
      items: [
        {
          id: "i1",
          productName: "منتج فعلي",
          source: "catalog",
          quantity: 1,
          unitPrice: "100",
          lineTotal: "100",
          unitCost: null,
          costSource: "unknown",
          profit: null,
        },
        {
          id: "service",
          productName: "خدمة فعلية",
          source: "service",
          quantity: 1,
          unitCost: 30,
          costSource: "service",
        },
      ],
      summary: {
        totalSales: 100,
        productsCost: 0,
        netProfit: null,
        isPartial: true,
        shippingCost: 0,
        packagingCost: 0,
        extraFees: 0,
      },
    };
    await p.route("**/api/**", async (r) => {
      const req = r.request(),
        u = new URL(req.url()),
        path = u.pathname,
        method = req.method(),
        body = req.postDataJSON();
      const send = (data, status = 200) =>
        r.fulfill({
          status,
          contentType: "application/json",
          body: JSON.stringify(
            status < 400
              ? { success: true, data }
              : { success: false, message: "رفض اختباري" },
          ),
        });
      if (method !== "GET") writes.push({ path, method, body });
      if (path === "/api/admin/notifications")
        return send({ items: [], unreadCount: 0 });
      if (path === "/api/admin/me")
        return send({
          id: "me",
          name: "مسؤول",
          permissions,
          isSuperAdmin: false,
        });
      if (path === "/api/support-tickets/admin")
        return send({ items: [ticket], total: 1 });
      if (path === "/api/support-tickets/admin/assignees")
        return send({
          items: [{ id: "staff", name: "موظف فعلي", open_tickets: 2 }],
        });
      if (path === "/api/support-tickets/admin/t1") {
        if (method === "DELETE") {
          deleted = true;
          return send({ id: "t1" });
        }
        if (deleted) return send(null, 404);
        if (failTicketRead) {
          failTicketRead = false;
          return send(null, 503);
        }
        return send(ticket);
      }
      if (path.endsWith("/t1/assign")) {
        ticket.assigned_to = body.staffId;
        ticket.assigned_name = body.staffId ? "موظف فعلي" : null;
        return send({ id: "t1", changed: true });
      }
      if (path.endsWith("/t1/priority")) {
        ticket.priority = body.priority;
        return send({ id: "t1" });
      }
      if (path.endsWith("/t1/notes")) {
        if (denyNote) return send(null, 422);
        const note = {
          id: "n" + writes.length,
          body: body.body,
          author_id: "me",
          author_name: "مسؤول",
          created_at: "2026-10-23T10:00:00Z",
        };
        ticket.internal_notes.push(note);
        failTicketRead = true;
        return send(note, 201);
      }
      if (path.includes("/t1/notes/")) {
        const id = path.split("/").pop();
        ticket.internal_notes = ticket.internal_notes.filter(
          (n) => n.id !== id,
        );
        return send({ id });
      }
      if (path === "/api/orders/admin/o1/items/i1/cost") {
        costs.items[0].unitCost = body.unitCost;
        costs.items[0].costSource =
          body.unitCost === null ? "unknown" : "manual";
        costs.items[0].costNote = body.note;
        costs.summary.isPartial = body.unitCost === null;
        failCostRead = true;
        return send(costs);
      }
      if (path === "/api/orders/admin/o1/costs") {
        if (failCostRead) {
          failCostRead = false;
          return send(null, 503);
        }
        return send(costs);
      }
      if (path === "/api/admin/reports/missing-costs") {
        assert.equal(u.searchParams.get("from"), "2026-10-01");
        assert.equal(u.searchParams.get("to"), "2026-10-23");
        const items =
          costs.items[0].unitCost === null
            ? [
                {
                  orderId: "o1",
                  orderItemId: "i1",
                  orderNumber: "ORD-1",
                  productName: "منتج فعلي",
                  quantity: 1,
                  unitPrice: 100,
                  lineTotal: 100,
                },
              ]
            : [];
        return send({
          items,
          totalSales: items.length ? 100 : 0,
          pagination: { total: items.length, limit: 10, offset: 0 },
        });
      }
      throw Error("Unexpected " + method + " " + path);
    });
    await p.goto(
      (process.env.TEST_BASE_URL || "http://127.0.0.1:5189") +
        "/#notifications",
    );
    async function mount(name, props = {}) {
      await p.evaluate(
        async ({ name, props }) => {
          const React = (await import("/node_modules/.vite/deps/react.js"))
              .default,
            dom = await import("/node_modules/.vite/deps/react-dom_client.js");
          document.getElementById("root").style.display = "none";
          if (!window.harness) {
            const el = document.createElement("div");
            el.className = "op-content";
            document.body.appendChild(el);
            window.harness = (dom.createRoot || dom.default.createRoot)(el);
          }
          window.deleted = false;
          window.saved = 0;
          window.closed = false;
          const Component = (await import("/src/" + name + ".jsx")).default;
          window.harness.render(
            React.createElement(Component, {
              key: Math.random(),
              ...props,
              onChanged: () => {
                window.saved++;
              },
              onSaved: () => {
                window.saved++;
              },
              onClose: () => {
                window.closed = true;
              },
              onBusyChange: () => {},
              onUncertain: () => {},
              onSessionExpired: () => {},
            }),
          );
        },
        { name, props },
      );
    }
    await mount("SupportTicket", { id: "t1", listRow: ticket });
    await p.getByLabel("تعيين التذكرة", { exact: true }).selectOption("staff");
    await p
      .getByRole("dialog", { name: "تعيين التذكرة", exact: true })
      .getByRole("button", { name: "تأكيد", exact: true })
      .click();
    await p.getByRole("dialog").waitFor({ state: "hidden" });
    assert.equal(ticket.assigned_to, "staff");
    await p.getByLabel("تعيين التذكرة", { exact: true }).selectOption("");
    await p
      .getByRole("dialog")
      .getByRole("button", { name: "تأكيد", exact: true })
      .click();
    await p.getByRole("dialog").waitFor({ state: "hidden" });
    assert.equal(ticket.assigned_to, null);
    await p
      .getByRole("button", { name: "رفع الأولوية للمشرف", exact: true })
      .click();
    await p.getByLabel("أولوية التذكرة", { exact: true }).selectOption("high");
    await p
      .getByRole("dialog")
      .getByRole("button", { name: "تأكيد", exact: true })
      .click();
    await p.getByRole("dialog").waitFor({ state: "hidden" });
    assert.equal(ticket.priority, "high");
    await p
      .getByRole("button", { name: "إضافة ملاحظة داخلية", exact: true })
      .click();
    assert.equal(
      await p
        .getByRole("button", { name: "حذف الملاحظة", exact: true })
        .count(),
      0,
    );
    await p
      .getByLabel("نص الملاحظة الداخلية", { exact: true })
      .fill("ملاحظة للإدارة فقط");
    denyNote = true;
    await p.getByRole("button", { name: "حفظ الملاحظة", exact: true }).click();
    await p.getByRole("alert").waitFor();
    assert.equal(ticket.internal_notes.length, 1);
    denyNote = false;
    await p.getByRole("button", { name: "حفظ الملاحظة", exact: true }).click();
    await p.getByRole("alert").waitFor();
    const postCount = writes.filter(
      (x) => x.path.endsWith("/notes") && x.method === "POST",
    ).length;
    await p.getByRole("button", { name: "إلغاء", exact: true }).click();
    await p
      .getByRole("button", { name: "إضافة ملاحظة داخلية", exact: true })
      .click();
    await p.getByRole("button", { name: "إعادة التحقق", exact: true }).click();
    await p.getByRole("dialog").waitFor({ state: "hidden" });
    assert.equal(
      writes.filter((x) => x.path.endsWith("/notes") && x.method === "POST")
        .length,
      postCount,
    );
    assert.equal(
      writes.some((x) => x.path.endsWith("/reply")),
      false,
    );
    await p
      .getByRole("button", { name: "إضافة ملاحظة داخلية", exact: true })
      .click();
    await p.getByRole("button", { name: "حذف الملاحظة", exact: true }).click();
    await p
      .getByRole("dialog")
      .getByRole("button", { name: "تأكيد", exact: true })
      .click();
    await p
      .getByRole("dialog", { name: "الملاحظات الداخلية", exact: true })
      .waitFor();
    assert.equal(ticket.internal_notes.length, 1);
    await p.getByRole("button", { name: "إلغاء", exact: true }).click();
    await p.getByRole("button", { name: "حذف التذكرة", exact: true }).click();
    await p
      .getByRole("dialog")
      .getByRole("button", { name: "تأكيد", exact: true })
      .click();
    await p.getByRole("dialog").waitFor({ state: "hidden" });
    assert.equal(deleted, true);
    await mount("OrderCosts", { id: "o1" });
    await p
      .getByRole("button", { name: "تعديل تكلفة منتج فعلي", exact: true })
      .click();
    assert.equal(
      await p
        .getByRole("button", { name: "تعديل تكلفة خدمة فعلية", exact: true })
        .count(),
      0,
    );
    await p.getByLabel("تكلفة الوحدة", { exact: true }).fill("0");
    await p.getByLabel("ملاحظة محاسبية", { exact: true }).fill("فاتورة 1");
    await p.getByRole("button", { name: "حفظ التكلفة", exact: true }).click();
    await p.getByRole("alert").waitFor();
    const costCount = writes.filter((x) => x.path.endsWith("/cost")).length;
    await p
      .getByRole("dialog")
      .getByRole("button", { name: "إغلاق", exact: true })
      .click();
    await p
      .getByRole("button", { name: "تعديل تكلفة منتج فعلي", exact: true })
      .click();
    await p.getByRole("button", { name: "إعادة التحقق", exact: true }).click();
    await p.getByRole("dialog").waitFor({ state: "hidden" });
    assert.equal(costs.items[0].unitCost, 0);
    assert.equal(
      writes.filter((x) => x.path.endsWith("/cost")).length,
      costCount,
    );
    assert.equal(await p.locator(".op-items-table thead th").count(), 7);
    await p
      .getByRole("button", { name: "تعديل تكلفة منتج فعلي", exact: true })
      .click();
    await p
      .getByLabel("إزالة التكلفة اليدوية واستخدام مصدر التكلفة المتاح", {
        exact: true,
      })
      .check();
    await p.getByRole("button", { name: "حفظ التكلفة", exact: true }).click();
    await p.getByRole("alert").waitFor();
    await p.getByRole("button", { name: "إعادة التحقق", exact: true }).click();
    await p.getByRole("dialog").waitFor({ state: "hidden" });
    assert.equal(costs.items[0].unitCost, null);
    await mount("MissingCostsDialog", {
      period: { from: "2026-10-01", to: "2026-10-23" },
      account: { permissions: ["accounting.view", "orders.manage"] },
    });
    await p.getByText("ORD-1", { exact: true }).waitFor();
    await p.getByRole("button", { name: "تسجيل التكلفة", exact: true }).click();
    await p.getByLabel("تكلفة الوحدة", { exact: true }).fill("40");
    await p.getByRole("button", { name: "حفظ التكلفة", exact: true }).click();
    await p.getByRole("alert").waitFor();
    await p.getByRole("button", { name: "إعادة التحقق", exact: true }).click();
    await p
      .getByText("لا توجد مبيعات بتكاليف ناقصة خلال الفترة.", { exact: true })
      .waitFor();
    assert.equal(costs.items[0].unitCost, 40);
    assert.ok((await p.evaluate(() => window.saved)) > 0);
    permissions = ["support.manage", "orders.manage", "accounting.view"];
    deleted = false;
    ticket.source = "supplier";
    ticket.supplier_id = "s1";
    await mount("SupplierTickets", {
      supplier: { id: "s1", name: "مورد فعلي" },
    });
    await p.getByLabel("ملاحظة داخلية", { exact: true }).click();
    await p
      .getByLabel("نص الملاحظة الداخلية", { exact: true })
      .fill("ملاحظة المورد للإدارة");
    await p.getByRole("button", { name: "حفظ الملاحظة", exact: true }).click();
    await p.getByRole("alert").waitFor();
    await p.getByRole("button", { name: "إعادة التحقق", exact: true }).click();
    await p.getByRole("dialog").waitFor({ state: "hidden" });
    await p
      .getByRole("button", { name: "رفع الأولوية القصوى", exact: true })
      .click();
    await p
      .getByRole("dialog")
      .getByRole("button", { name: "تأكيد", exact: true })
      .click();
    await p.getByRole("dialog").waitFor({ state: "hidden" });
    assert.equal(ticket.priority, "urgent");
    await p.getByLabel("تعيين التذكرة", { exact: true }).selectOption("staff");
    await p
      .getByRole("dialog")
      .getByRole("button", { name: "تأكيد", exact: true })
      .click();
    await p.getByRole("dialog").waitFor({ state: "hidden" });
    assert.equal(ticket.assigned_to, "staff");
    assert.equal(
      writes.some((x) => x.path.endsWith("/reply")),
      false,
    );
    await p.screenshot({
      path: "/tmp/supplier-ticket-controls-desktop.png",
      fullPage: true,
    });
    permissions = ["accounting.view"];
    await mount("OrderCosts", { id: "o1" });
    await p.getByText("منتج فعلي", { exact: true }).waitFor();
    assert.equal(
      await p
        .getByRole("button", { name: "تعديل تكلفة منتج فعلي", exact: true })
        .count(),
      0,
    );
    await p.setViewportSize({ width: 390, height: 844 });
    await p.screenshot({
      path: "/tmp/ticket-cost-controls-mobile.png",
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    console.log(
      "PASS ticket/cost controls: existing assignment/priority/actions, private notes and author deletion, read-only retry across close/reopen, confirmed deletion, seven original order columns, zero/null costs, service/read-only guards, missing-cost period and refresh, mobile/no runtime errors.",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
