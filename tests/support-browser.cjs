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
          accessToken: "support-test",
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
      failReply = true,
      failRead = false,
      unknownReply = false,
      denyList = false,
      failUpload = true;
    const imageUrl =
        "https://res.cloudinary.com/test-cloud/image/upload/part.png",
      png = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX7kAAAAASUVORK5CYII=",
        "base64",
      );
    const tickets = Array.from({ length: 9 }, (_, i) => ({
      id: "t" + i,
      ticket_number: "TKT-" + i,
      category: i === 1 ? "payment" : "technical",
      category_name: i === 1 ? "مشكلة دفع" : "مشكلة تقنية",
      subject: "موضوع التذكرة " + i,
      description: "شرح المشكلة من الخادم",
      status: ["open", "in_progress", "resolved", "closed"][i % 4],
      priority: "normal",
      source: i % 2 ? "supplier" : "customer",
      supplier_id: i % 2 ? "supplier-" + i : null,
      supplier_name: i % 2 ? "المورد " + i : null,
      user_id: i % 2 ? null : "customer-" + i,
      customer_name: "عميل " + i,
      customer_phone: "+96650000000" + i,
      customer_email: "customer" + i + "@example.com",
      created_at: "2026-10-20T10:00:00Z",
      updated_at: "2026-10-21T10:00:00Z",
      order_number: "ORD-" + i,
      attachments: i === 0 ? [imageUrl] : [],
      messages_count: 1,
      messages: [
        {
          id: "m" + i,
          body: "رسالة العميل " + i,
          is_staff: false,
          sender_name: "المرسل " + i,
          created_at: "2026-10-20T10:00:00Z",
          attachments: [],
        },
      ],
    }));
    await context.route("https://res.cloudinary.com/**", (r) =>
      r.fulfill({ contentType: "image/png", body: png }),
    );
    await context.route("https://api.cloudinary.com/**", (r) => {
      assert.equal(r.request().headers().authorization, undefined);
      for (const key of [
        "folder",
        "timestamp",
        "allowed_formats",
        "file",
        "api_key",
        "signature",
      ])
        assert(
          r
            .request()
            .postData()
            .includes('name="' + key + '"'),
        );
      if (failUpload) {
        failUpload = false;
        return r.fulfill({
          status: 503,
          contentType: "application/json",
          body: "{}",
        });
      }
      return r.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ secure_url: imageUrl }),
      });
    });
    await page.route(
      "https://car-parts-backend.vercel.app/**",
      async (route) => {
        const req = route.request(),
          u = new URL(req.url()),
          path = u.pathname,
          method = req.method(),
          body = req.postDataJSON();
        assert.equal(req.headers().authorization, "Bearer support-test");
        if (method === "GET") reads.push(path + u.search);
        else writes.push({ path, method, body });
        const send = (data, status = 200) =>
          route.fulfill({
            status,
            contentType: "application/json",
            body: JSON.stringify({ success: status < 400, ...data }),
          });
        if (method === "GET" && path.startsWith("/api/admin/customers/"))
          return send({
            data: {
              id: path.split("/").pop(),
              avatar_url: "https://res.cloudinary.com/test/customer.png",
            },
          });
        if (method === "GET" && path.startsWith("/api/suppliers/admin/"))
          return send({
            data: {
              id: path.split("/").pop(),
              logo_url: "https://res.cloudinary.com/test/supplier.png",
            },
          });
        if (path === "/api/admin/me")
          return send({
            data: { id: "admin", permissions: ["support.manage"] },
          });
        if (path === "/api/support-tickets/admin/assignees")
          return send({
            data: { items: [{ id: "staff", name: "موظف", open_tickets: 0 }] },
          });
        if (path === "/api/uploads/signature") {
          assert.equal(u.searchParams.get("type"), "tickets");
          assert.equal(u.searchParams.get("strictFormats"), "true");
          return send({
            data: {
              cloudName: "test-cloud",
              apiKey: "public-test",
              signature: "test-signature",
              uploadParams: {
                folder: "car-parts/tickets",
                timestamp: 1792620000,
                allowed_formats: "jpg,jpeg,png,webp",
              },
            },
          });
        }
        if (path === "/api/support-tickets/admin") {
          if (denyList) return send({ message: "forbidden" }, 403);
          if (failList) {
            failList = false;
            return send({ message: "تعذر تحميل التذاكر" }, 503);
          }
          let rows = tickets;
          const search = u.searchParams.get("search");
          if (search)
            rows = rows.filter((row) =>
              (
                row.ticket_number +
                row.subject +
                row.customer_name +
                row.customer_phone +
                row.supplier_name
              ).includes(search),
            );
          for (const key of ["source", "priority"])
            if (u.searchParams.get(key))
              rows = rows.filter((row) => row[key] === u.searchParams.get(key));
          const countsByStatus = {};
          for (const row of rows)
            countsByStatus[row.status] = (countsByStatus[row.status] || 0) + 1;
          for (const key of ["status", "category"])
            if (u.searchParams.get(key))
              rows = rows.filter((row) => row[key] === u.searchParams.get(key));
          const total = rows.length,
            offset = +u.searchParams.get("offset");
          return send({
            data: {
              items: rows.slice(offset, offset + 7),
              countsByStatus,
              total,
            },
          });
        }
        const match = path.match(
          /^\/api\/support-tickets\/admin\/(t\d+)(\/(?:reply|status))?$/,
        );
        if (match) {
          const row = tickets.find((t) => t.id === match[1]);
          assert(row);
          if (method === "GET") {
            if (failRead) {
              failRead = false;
              return send({ message: "فشل تأكيد تفاصيل التذكرة" }, 503);
            }
            return send({ data: row });
          }
          if (match[2] === "/status") {
            row.status = body.status;
            failRead = true;
            return send({
              data: {
                id: row.id,
                ticketNumber: row.ticket_number,
                status: row.status,
              },
            });
          }
          if (match[2] === "/reply") {
            if (unknownReply)
              return send({ message: "نتيجة إرسال غير مؤكدة" }, 503);
            if (failReply) {
              failReply = false;
              return send({ message: "الرد غير مقبول" }, 422);
            }
            const message = {
              id: "saved-" + row.id,
              body: body.body,
              attachments: body.attachments,
              is_staff: true,
              sender_name: "فريق الدعم",
              created_at: "2026-10-22T12:00:00Z",
            };
            row.messages.push(message);
            row.messages_count = row.messages.length;
            failRead = true;
            return send({ data: message }, 201);
          }
        }
        throw new Error("Unexpected endpoint " + method + " " + path);
      },
    );
    await page.route("**/api/admin/notifications?*", (r) =>
      r.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { items: [], unreadCount: 0 },
          meta: { total: 0 },
        }),
      }),
    );
    await page.goto(
      (process.env.TEST_BASE_URL || "http://127.0.0.1:5189") + "/#support",
    );
    await page.getByText("تعذر تحميل التذاكر", { exact: true }).waitFor();
    await page
      .getByRole("button", { name: "إعادة المحاولة", exact: true })
      .click();
    await page
      .getByRole("textbox", { name: "رسالة الرد", exact: true })
      .waitFor();
    await page.locator(".support-customer .support-avatar img").waitFor();
    assert.equal(
      await page
        .locator(".support-customer .support-avatar img")
        .getAttribute("src"),
      "https://res.cloudinary.com/test/customer.png",
    );
    await page
      .locator(
        '.ticket-list-person img[src="https://res.cloudinary.com/test/supplier.png"]',
      )
      .first()
      .waitFor();
    assert.equal(
      reads.filter((path) => path === "/api/admin/customers/customer-0").length,
      1,
    );
    assert(
      !(await page.getByLabel("تعيين التذكرة", { exact: true }).isDisabled()),
    );
    assert(
      !(await page
        .getByRole("button", { name: "إضافة ملاحظة داخلية", exact: true })
        .isDisabled()),
    );
    assert(
      !(await page
        .getByRole("button", { name: "حذف التذكرة", exact: true })
        .isDisabled()),
    );
    assert.equal(
      await page.locator(".support-attachments a").getAttribute("href"),
      imageUrl,
    );
    await page.screenshot({ path: "/tmp/support-desktop.png", fullPage: true });
    assert.equal(writes.length, 0);
    await page.getByRole("button", { name: "التالي", exact: true }).click();
    await page
      .getByRole("button", { name: "عرض التذكرة TKT-8", exact: true })
      .waitFor();
    assert(reads.some((p) => p.includes("offset=7")));
    await page.getByLabel("بحث التذاكر").fill("TKT-0");
    await page
      .getByRole("button", { name: "عرض التذكرة TKT-0", exact: true })
      .click();
    await page
      .getByLabel("رسالة الرد", { exact: true })
      .fill("تمت مراجعة المشكلة");
    await page.getByLabel("إرفاق صور للرد", { exact: true }).setInputFiles({
      name: "bad.html",
      mimeType: "text/html",
      buffer: Buffer.from("bad"),
    });
    await page
      .getByText("اختار صور JPG أو PNG أو WebP، كل صورة بحد أقصى 5 ميجابايت.", {
        exact: true,
      })
      .waitFor();
    await page
      .getByLabel("إرفاق صور للرد", { exact: true })
      .setInputFiles({ name: "photo.png", mimeType: "image/png", buffer: png });
    await page
      .getByText("تعذر رفع الصورة. حاول مرة أخرى.", { exact: true })
      .waitFor();
    await page
      .getByLabel("إرفاق صور للرد", { exact: true })
      .setInputFiles({ name: "photo.png", mimeType: "image/png", buffer: png });
    await page
      .getByRole("button", { name: "إزالة مرفق الرد 1", exact: true })
      .waitFor();
    await page.getByRole("button", { name: "إرسال الرد", exact: true }).click();
    await page.getByText("الرد غير مقبول", { exact: true }).waitFor();
    await page.getByRole("button", { name: "إرسال الرد", exact: true }).click();
    await page
      .getByRole("button", { name: "تأكيد الرد", exact: true })
      .waitFor();
    const posts = writes.filter((w) => w.path.endsWith("/reply")).length;
    await page.getByRole("button", { name: "تأكيد الرد", exact: true }).click();
    await page
      .getByText("تم إرسال الرد وتأكيد ظهوره في المحادثة.", { exact: true })
      .waitFor();
    assert.equal(writes.filter((w) => w.path.endsWith("/reply")).length, posts);
    assert.deepEqual(
      writes.filter((w) => w.path.endsWith("/reply")).at(-1).body,
      { body: "تمت مراجعة المشكلة", attachments: [imageUrl] },
    );
    await page
      .locator(".support-message.support")
      .getByText("تمت مراجعة المشكلة", { exact: true })
      .waitFor();
    await page
      .getByLabel("حالة التذكرة", { exact: true })
      .selectOption("resolved");
    let dialog = page.getByRole("dialog");
    await dialog
      .getByRole("button", { name: "تأكيد تغيير الحالة", exact: true })
      .click();
    await dialog
      .getByText("فشل تأكيد تفاصيل التذكرة", { exact: true })
      .waitFor();
    await dialog
      .getByRole("button", { name: "تأكيد البيانات", exact: true })
      .click();
    await dialog.waitFor({ state: "hidden" });
    assert.equal(tickets[0].status, "resolved");
    assert.equal(writes.filter((w) => w.path.endsWith("/status")).length, 1);
    await page
      .getByRole("button", { name: "إغلاق التذكرة", exact: true })
      .click();
    dialog = page.getByRole("dialog");
    await dialog
      .getByRole("button", { name: "تأكيد تغيير الحالة", exact: true })
      .click();
    await dialog
      .getByRole("button", { name: "تأكيد البيانات", exact: true })
      .click();
    await dialog.waitFor({ state: "hidden" });
    assert(await page.getByLabel("رسالة الرد", { exact: true }).isDisabled());
    await page.getByRole("button", { name: "إعادة فتح", exact: true }).click();
    dialog = page.getByRole("dialog");
    await dialog
      .getByRole("button", { name: "تأكيد تغيير الحالة", exact: true })
      .click();
    await dialog
      .getByRole("button", { name: "تأكيد البيانات", exact: true })
      .click();
    await dialog.waitFor({ state: "hidden" });
    assert.equal(tickets[0].status, "in_progress");
    await page.getByLabel("رسالة الرد", { exact: true }).fill("رد غير مؤكد");
    unknownReply = true;
    await page.getByRole("button", { name: "إرسال الرد", exact: true }).click();
    await page
      .getByText(
        "نتيجة الإرسال السابق غير مؤكدة. حدّث المحادثة وراجعها قبل أي محاولة جديدة.",
        { exact: true },
      )
      .waitFor();
    assert(
      await page
        .getByRole("button", { name: "إرسال الرد", exact: true })
        .isDisabled(),
    );
    await page.getByLabel("بحث التذاكر").fill("");
    await page
      .getByRole("button", { name: "عرض التذكرة TKT-1", exact: true })
      .click();
    await page
      .getByRole("button", { name: "عرض التذكرة TKT-0", exact: true })
      .click();
    assert(
      await page
        .getByRole("button", { name: "إرسال الرد", exact: true })
        .isDisabled(),
    );
    await page.getByLabel("مصدر التذكرة").selectOption("supplier");
    await page
      .getByRole("button", { name: "عرض التذكرة TKT-1", exact: true })
      .waitFor();
    assert(reads.some((p) => p.includes("source=supplier")));
    await page.getByLabel("نوع مشكلة التذكرة").selectOption("payment");
    await page
      .getByText("أعداد الحالات لا تتأثر بفلتر نوع المشكلة.", { exact: true })
      .waitFor();
    assert(reads.some((p) => p.includes("category=payment")));
    await page.getByLabel("تصفية أولوية التذاكر").selectOption("urgent");
    await page
      .getByText("لا توجد تذاكر تطابق البحث.", { exact: true })
      .waitFor();
    await page.getByLabel("تصفية أولوية التذاكر").selectOption("");
    await page.getByLabel("التذاكر من تاريخ").fill("2026-10-01");
    await page.getByLabel("التذاكر إلى تاريخ").fill("2026-10-22");
    await page
      .getByRole("button", { name: "تطبيق الفترة", exact: true })
      .click();
    await page.waitForResponse((r) => r.url().includes("from=2026-10-01"));
    assert(reads.some((p) => p.includes("to=2026-10-22")));
    await page
      .getByRole("button", { name: "أنواع المشكلة", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "الأنواع الواردة في التذاكر", exact: true })
      .waitFor();
    assert(
      await page
        .getByRole("button", { name: "إضافة نوع مشكلة", exact: true })
        .isDisabled(),
    );
    await page
      .getByRole("button", { name: "تذاكر المساعدة", exact: true })
      .click();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(
      () =>
        document.querySelector(".sidebar").getBoundingClientRect().x >=
        innerWidth - 1,
    );
    await page.screenshot({ path: "/tmp/support-mobile.png", fullPage: true });
    denyList = true;
    await page.reload();
    await page
      .getByText("ليس لديك صلاحية لعرض هذه البيانات أو تنفيذ الإجراء.", {
        exact: true,
      })
      .waitFor();
    assert.equal(
      await page
        .getByRole("button", { name: "عرض التذكرة TKT-0", exact: true })
        .count(),
      0,
    );
    assert.deepEqual(errors, []);
    console.log(
      "Support browser PASS: real list filters/counts/paging, details/messages/attachment URLs, upload validation/retry, reply 422 and confirmation retry without duplicate POST, status/readback/close/reopen, uncertain reply lock across selection, enabled documented actions, 403 and mobile/no JS errors.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
