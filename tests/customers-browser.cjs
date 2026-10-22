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
        JSON.stringify({
          verified: true,
          accessToken: "customer-test",
          admin: { name: "اختبار" },
        }),
      ),
    );
    const p = await c.newPage(),
      errors = [],
      writes = [],
      reads = [];
    p.on("pageerror", (e) => errors.push(e.message));
    let createConflict = true,
      failCreatedRead = false,
      failEdit = true,
      failCredit = true,
      failWalletRead = false,
      unknownCredit = false,
      failExport = true,
      failAvatarUpload = true,
      failCashbackRead = false,
      cashbackFailOnce = true;
    const users = Array.from({ length: 7 }, (_, i) => ({
      id: "c" + (i + 1),
      name: "عميل حقيقي " + (i + 1),
      phone: "+96655123456" + i,
      email: "customer" + i + "@example.com",
      avatar_url: "https://example.com/avatar.png",
      status: i === 6 ? "inactive" : "active",
      is_active: i !== 6,
      is_phone_verified: false,
      wallet_balance: "0.00",
      cashback_percent: null,
      cashback_min_order: 150,
      cashback_max_amount: 1500,
      created_at: "2026-10-21T10:00:00Z",
      last_order_at: "2026-10-20T10:00:00Z",
      orders_count: 2,
      total_purchases: "300",
      pricing_requests_count: 1,
      abandoned_cart_items: 1,
      top_payment_method: "mada",
      admin_notes: "ملاحظة من الخادم",
      wallet: { balance: "0.00", cashbackPercent: null },
      pricing_requests_summary: { total: 1, confirmed: 0 },
      vehicles: [],
      vehicles_count: 0,
      addresses: [],
      addresses_count: 0,
    }));
    const cart = {
      userId: "c1",
      itemsCount: 1,
      cartValue: "80",
      lastActivityAt: "2026-10-20T10:00:00Z",
      isAbandoned: true,
      canRemind: true,
      reminderStatus: "ready",
      cart: {
        items: [
          {
            id: "ci1",
            name: "منتج السلة الحقيقي",
            quantity: 2,
            lineTotal: "80",
            thumbnail: "https://example.com/product.png",
          },
        ],
      },
    };
    const tx = [];
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX7kAAAAASUVORK5CYII=",
      "base64",
    );
    await c.route("https://res.cloudinary.com/**", (r) =>
      r.fulfill({ contentType: "image/png", body: png }),
    );
    await c.route("https://example.com/**", (r) =>
      r.fulfill({ contentType: "image/png", body: png }),
    );
    await c.route("https://api.cloudinary.com/**", async (r) => {
      assert.equal(r.request().headers().authorization, undefined);
      const body = r.request().postData();
      for (const key of [
        "folder",
        "timestamp",
        "allowed_formats",
        "signature",
        "api_key",
        "file",
      ])
        assert(body.includes('name="' + key + '"'));
      if (failAvatarUpload) {
        failAvatarUpload = false;
        return r.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ error: { message: "upload failed" } }),
        });
      }
      return r.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          secure_url:
            "https://res.cloudinary.com/fixture-cloud/image/upload/avatar.png",
        }),
      });
    });
    const reply = (r, data, meta, status = 200, message = "Success") =>
      r.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify({ success: status < 400, message, data, meta }),
      });
    await c.route("https://car-parts-backend.vercel.app/**", (r) => {
      const req = r.request(),
        u = new URL(req.url()),
        path = u.pathname,
        m = req.method(),
        body = req.postDataJSON();
      assert.equal(req.headers().authorization, "Bearer customer-test");
      if (m === "GET") reads.push({ path, q: u.searchParams });
      else writes.push({ path, m, body });
      if (path === "/api/admin/customers/summary")
        return reply(r, {
          period: { from: "2026-10-01", to: "2026-10-22" },
          customers: { total: users.length },
          purchases: { amount: "1234.5" },
          orders: { count: 12 },
          abandonedCarts: { count: 1 },
        });
      if (path === "/api/admin/customers/export") {
        if (failExport) {
          failExport = false;
          return reply(r, null, null, 403, "غير مسموح");
        }
        return r.fulfill({
          contentType: "text/csv; charset=utf-8",
          body: "\ufeffالاسم,الجوال\nعميل حقيقي,+966551234560",
        });
      }
      if (path === "/api/admin/customers" && m === "GET") {
        let rows = users.filter(
          (x) =>
            (!u.searchParams.get("status") ||
              u.searchParams.get("status") === "new" ||
              x.status === u.searchParams.get("status")) &&
            (!u.searchParams.get("search") ||
              [x.name, x.email, x.phone].some((v) =>
                v?.includes(u.searchParams.get("search")),
              )),
        );
        const total = rows.length;
        rows = rows.slice(
          Number(u.searchParams.get("offset")),
          Number(u.searchParams.get("offset")) +
            Number(u.searchParams.get("limit")),
        );
        return reply(r, rows, {
          total,
          metrics: {
            total_customers: users.length,
            active_customers: users.filter((x) => x.status === "active").length,
            inactive_customers: users.filter((x) => x.status === "inactive")
              .length,
            blocked_customers: users.filter((x) => x.status === "blocked")
              .length,
            deleted_customers: users.filter((x) => x.status === "deleted")
              .length,
            new_customers: users.length,
          },
        });
      }
      if (path === "/api/admin/customers" && m === "POST") {
        if (createConflict) {
          createConflict = false;
          return reply(r, null, null, 409, "رقم الجوال مسجل بالفعل");
        }
        const row = {
          ...structuredClone(users[0]),
          id: "created",
          name: body.name,
          email: body.email,
          phone: body.phone,
        };
        users.unshift(row);
        failCreatedRead = true;
        return reply(r, row, null, 201);
      }
      const target = users.find((x) => path === "/api/admin/customers/" + x.id);
      if (target) {
        if (m === "GET") {
          if (target.id === "c1" && failCashbackRead) {
            failCashbackRead = false;
            return reply(r, null, null, 503, "تعذر تأكيد إعدادات الكاش باك");
          }
          if (target.id === "created" && failCreatedRead) {
            failCreatedRead = false;
            return reply(r, null, null, 503, "تعذر تأكيد العميل");
          }
          return reply(r, target);
        }
        if (m === "PATCH") {
          assert(
            Object.keys(body).every((key) =>
              ["name", "email", "avatarUrl", "notes"].includes(key),
            ),
          );
          if (failEdit) {
            failEdit = false;
            return reply(r, null, null, 422, "البريد غير مقبول");
          }
          Object.assign(target, { name: body.name, email: body.email });
          if (Object.hasOwn(body, "avatarUrl"))
            target.avatar_url = body.avatarUrl;
          if (Object.hasOwn(body, "notes")) target.admin_notes = body.notes;
          return reply(r, target);
        }
        if (m === "DELETE") {
          target.status = "deleted";
          target.is_active = false;
          target.phone = null;
          target.email = null;
          return reply(r, { deleted: true });
        }
      }
      if (path === "/api/uploads/signature") {
        assert.equal(u.searchParams.get("type"), "avatars");
        return reply(r, {
          cloudName: "fixture-cloud",
          apiKey: "test-public",
          signature: "test-signature",
          uploadParams: {
            folder: "car-parts/avatars",
            timestamp: 1792620000,
            allowed_formats: "jpg,jpeg,png,webp",
          },
          maxFileSizeBytes: 5242880,
        });
      }
      if (path === "/api/admin/customers/c1/status") {
        assert(["active", "blocked"].includes(body.status));
        users.find((x) => x.id === "c1").status = body.status;
        return reply(r, { id: "c1", status: body.status });
      }
      if (path === "/api/wallet/admin/c1") {
        if (failWalletRead) {
          failWalletRead = false;
          return reply(r, null, null, 503, "تعذر تحديث المحفظة");
        }
        return reply(r, users.find((x) => x.id === "c1").wallet);
      }
      if (path === "/api/wallet/admin/c1/adjust") {
        if (failCredit) {
          failCredit = false;
          return reply(r, null, null, 422, "سبب الإضافة غير مقبول");
        }
        const user = users.find((x) => x.id === "c1");
        user.wallet.balance = String(Number(user.wallet.balance) + body.amount);
        user.wallet_balance = user.wallet.balance;
        const entry = {
          id: "tx" + (tx.length + 1),
          type: "admin_credit",
          amount: String(body.amount),
          balance_after: user.wallet.balance,
          reason: body.reason,
          created_at: "2026-10-22T10:00:00Z",
        };
        tx.unshift(entry);
        if (unknownCredit)
          return reply(r, null, null, 503, "نتيجة العملية غير مؤكدة");
        failWalletRead = true;
        return reply(r, entry);
      }
      if (path === "/api/wallet/admin/c1/cashback") {
        const user = users.find((x) => x.id === "c1");
        if (cashbackFailOnce) {
          cashbackFailOnce = false;
          failCashbackRead = true;
        }
        user.cashback_percent = body.cashbackPercent;
        if (Object.hasOwn(body, "minOrderValue"))
          user.cashback_min_order = body.minOrderValue;
        if (Object.hasOwn(body, "maxCashback"))
          user.cashback_max_amount = body.maxCashback;
        user.wallet.cashbackPercent = body.cashbackPercent;
        return reply(r, { id: "c1", cashback_percent: body.cashbackPercent });
      }
      if (path === "/api/wallet/admin/c1/transactions")
        return reply(r, {
          items: tx,
          pagination: { total: tx.length, page: 1, limit: 10 },
        });
      if (path === "/api/admin/customers/c1/addresses") {
        const user = users.find((x) => x.id === "c1");
        user.addresses.push({
          id: "addr1",
          city: body.city,
          district: body.district,
          street: body.street,
          phone: body.phone,
          is_default: true,
          created_at: "2026-10-22T10:00:00Z",
        });
        user.addresses_count = user.addresses.length;
        return reply(r, user, null, 201);
      }
      if (path === "/api/admin/customers/c1/vehicles") {
        const user = users.find((x) => x.id === "c1");
        assert.equal(body.makeId, "make1");
        assert.equal(body.modelId, "model1");
        user.vehicles.push({
          id: "car1",
          make_name_ar: "تويوتا من الخادم",
          model_name_ar: "كامري من الخادم",
          year: body.year,
          vin: body.vin,
          is_default: body.isDefault,
          created_at: "2026-10-22T10:00:00Z",
        });
        user.vehicles_count = user.vehicles.length;
        return reply(r, user, null, 201);
      }
      if (path === "/api/cars/admin/makes")
        return reply(
          r,
          [
            { id: "make1", name_ar: "تويوتا من الخادم", is_active: true },
            { id: "hidden", name_ar: "شركة مخفية", is_active: false },
          ],
          { total: 2 },
        );
      if (path === "/api/cars/admin/makes/make1/models")
        return reply(r, [
          { id: "model1", name_ar: "كامري من الخادم", is_active: true },
        ]);
      if (path === "/api/orders/all") {
        assert.equal(u.searchParams.get("userId"), "c1");
        return reply(
          r,
          u.searchParams.get("status")
            ? []
            : [
                {
                  id: "o1",
                  order_number: "ORD-CUSTOMER",
                  created_at: "2026-10-20T10:00:00Z",
                  items_count: 1,
                  status: "confirmed",
                },
              ],
          { total: u.searchParams.get("status") ? 0 : 1 },
        );
      }
      if (path === "/api/orders/admin/o1")
        return reply(r, {
          id: "o1",
          items: [
            {
              id: "oi1",
              product_name: "منتج الطلب الحقيقي",
              quantity: 1,
              line_total: "300",
              image_url: "https://example.com/product.png",
            },
          ],
        });
      if (path === "/api/pricing-requests/admin") {
        assert.equal(u.searchParams.get("customerId"), "c1");
        return reply(
          r,
          u.searchParams.has("hasAccepted")
            ? []
            : [
                {
                  id: "q1",
                  request_number: "PRQ-CUSTOMER",
                  created_at: "2026-10-20T10:00:00Z",
                  parts_count: 1,
                  status: "quoted",
                  pricing_type: "normal",
                },
              ],
          { total: u.searchParams.has("hasAccepted") ? 0 : 1 },
        );
      }
      if (path === "/api/pricing-requests/admin/q1")
        return reply(r, {
          id: "q1",
          request_number: "PRQ-CUSTOMER",
          status: "quoted",
          customer_name: "عميل حقيقي 1",
          parts: [],
          timeline: [],
        });
      if (path === "/api/admin/abandoned-carts/c1") return reply(r, cart);
      if (path === "/api/admin/abandoned-carts/c1/remind") {
        cart.canRemind = false;
        cart.reminderStatus = "already_reminded";
        return reply(r, { reminderId: "reminder1", userId: "c1" });
      }
      throw Error("Unexpected " + m + " " + path);
    });
    await p.goto(
      (process.env.TEST_BASE_URL || "http://127.0.0.1:5189") + "/#customers",
    );
    await p
      .getByRole("button", { name: "عميل حقيقي 1", exact: false })
      .waitFor();
    assert.equal(
      await p.locator(".customer-list-stats b").first().textContent(),
      "7",
    );
    assert.equal(await p.locator(".customer-table tbody tr").count(), 6);
    await p.getByRole("button", { name: "التالي", exact: true }).click();
    await p
      .getByRole("button", { name: "عميل حقيقي 7", exact: false })
      .waitFor();
    assert.ok(
      reads.some(
        (r) => r.path === "/api/admin/customers" && r.q.get("offset") === "6",
      ),
    );
    await p
      .getByLabel("البحث باسم العميل أو رقم الجوال", { exact: true })
      .fill("customer0@example.com");
    await p.waitForTimeout(400);
    await p
      .getByRole("button", { name: "عميل حقيقي 1", exact: false })
      .waitFor();
    assert.equal(await p.locator(".customer-table tbody tr").count(), 1);
    await p
      .getByRole("button", { name: "تصدير النتائج CSV", exact: true })
      .click();
    await p
      .getByText("ليس لديك صلاحية لعرض هذه البيانات أو تنفيذ الإجراء.", {
        exact: false,
      })
      .waitFor();
    const dl = p.waitForEvent("download");
    await p
      .getByRole("button", { name: "تصدير النتائج CSV", exact: true })
      .click();
    assert.equal((await dl).suggestedFilename(), "customers.csv");
    assert.ok(
      reads.some(
        (r) =>
          r.path === "/api/admin/customers/export" &&
          r.q.get("search") === "customer0@example.com",
      ),
    );
    const dialog = () => p.getByRole("dialog");
    async function submit(name) {
      await dialog().getByRole("button", { name, exact: true }).click();
    }
    async function closed() {
      await dialog().waitFor({ state: "hidden" });
    }
    await p
      .getByRole("button", { name: "خيارات العميل c1", exact: true })
      .click();
    await p.getByRole("button", { name: "تعديل العميل", exact: true }).click();
    await dialog()
      .getByLabel("الاسم الكامل", { exact: true })
      .fill("عميل معدل");
    assert.ok(
      await dialog().getByLabel("رقم الجوال", { exact: true }).isDisabled(),
    );
    await dialog()
      .getByLabel("البريد الإلكتروني", { exact: true })
      .fill("edited@example.com");
    await dialog()
      .getByLabel("ملاحظات الإدارة", { exact: true })
      .fill("ملاحظات الإدارة الجديدة");
    await dialog()
      .getByLabel("صورة العميل", { exact: true })
      .setInputFiles({
        name: "bad.html",
        mimeType: "text/html",
        buffer: Buffer.from("<p>bad</p>"),
      });
    await dialog()
      .getByText("اختر صورة JPG أو PNG أو WebP بحد أقصى 5 ميجابايت.", {
        exact: true,
      })
      .waitFor();
    await dialog().getByLabel("صورة العميل", { exact: true }).setInputFiles({
      name: "avatar.png",
      mimeType: "image/png",
      buffer: png,
    });
    await dialog()
      .getByText("تعذر رفع الصورة. حاول مرة أخرى.", { exact: true })
      .waitFor();
    await dialog().getByLabel("صورة العميل", { exact: true }).setInputFiles({
      name: "avatar.png",
      mimeType: "image/png",
      buffer: png,
    });
    await dialog().locator(".customer-avatar-editor img").waitFor();
    await p.waitForFunction(
      () =>
        document.querySelector(".customer-avatar-editor img")?.src ===
        "https://res.cloudinary.com/fixture-cloud/image/upload/avatar.png",
    );
    await submit("حفظ التعديلات");
    await dialog().getByText("البريد غير مقبول", { exact: true }).waitFor();
    assert.equal(
      await dialog().getByLabel("الاسم الكامل", { exact: true }).inputValue(),
      "عميل معدل",
    );
    await submit("حفظ التعديلات");
    await closed();
    await p
      .getByLabel("البحث باسم العميل أو رقم الجوال", { exact: true })
      .fill("");
    assert.equal(
      users[0].avatar_url,
      "https://res.cloudinary.com/fixture-cloud/image/upload/avatar.png",
    );
    assert.equal(users[0].admin_notes, "ملاحظات الإدارة الجديدة");
    await p
      .getByRole("button", { name: "خيارات العميل c1", exact: true })
      .click();
    await p.getByRole("button", { name: "تعديل العميل", exact: true }).click();
    await dialog()
      .getByRole("button", { name: "إزالة الصورة", exact: true })
      .click();
    await dialog().getByLabel("ملاحظات الإدارة", { exact: true }).fill("");
    await submit("حفظ التعديلات");
    await closed();
    assert.equal(users[0].avatar_url, null);
    assert.equal(users[0].admin_notes, null);
    await p
      .getByLabel("البحث باسم العميل أو رقم الجوال", { exact: true })
      .fill("");
    await p.waitForTimeout(350);
    await p
      .getByRole("button", { name: "خيارات العميل c1", exact: true })
      .click();
    await p.getByRole("button", { name: "حظر العميل", exact: true }).click();
    await dialog()
      .getByLabel("سبب الحظر", { exact: true })
      .fill("سبب اختبار الحظر");
    await submit("تأكيد الحظر");
    await closed();
    assert.ok(
      writes.some(
        (w) =>
          w.path === "/api/admin/customers/c1/status" &&
          w.body.reason === "سبب اختبار الحظر",
      ),
    );
    await p
      .getByRole("button", { name: "خيارات العميل c1", exact: true })
      .click();
    await p.getByRole("button", { name: "تنشيط العميل", exact: true }).click();
    await submit("تأكيد التنشيط");
    await closed();
    await p.getByRole("button", { name: "عميل معدل", exact: false }).click();
    await p
      .getByRole("heading", { name: "تفاصيل العميل", exact: true })
      .waitFor();
    await p.getByRole("button", { name: "ORD-CUSTOMER", exact: false }).click();
    await p.getByText("منتج الطلب الحقيقي", { exact: true }).waitFor();
    await p
      .getByLabel("نوع طلبات العميل", { exact: true })
      .selectOption("delivered");
    await p.getByText("لا توجد طلبات مطابقة.", { exact: true }).waitFor();
    await p.getByLabel("نوع طلبات العميل", { exact: true }).selectOption("");
    await p
      .getByRole("button", { name: "تفاصيل تسعير PRQ-CUSTOMER", exact: true })
      .click();
    await p
      .getByRole("heading", { name: "تفاصيل الطلب", exact: true })
      .waitFor();
    await p
      .getByRole("main")
      .getByRole("button", { name: "تفاصيل العميل", exact: true })
      .click();
    await p
      .getByRole("heading", { name: "تفاصيل العميل", exact: true })
      .waitFor();
    await p
      .getByRole("button", { name: "إضافة رصيد للعميل", exact: true })
      .click();
    await dialog().getByLabel("قيمة الرصيد", { exact: true }).fill("50.25");
    await dialog()
      .getByLabel("سبب إضافة الرصيد", { exact: true })
      .fill("تعويض");
    await submit("إضافة الرصيد");
    await dialog()
      .getByText("سبب الإضافة غير مقبول", { exact: true })
      .waitFor();
    await submit("إضافة الرصيد");
    await dialog().getByText("تعذر تحديث المحفظة", { exact: true }).waitFor();
    await submit("تحديث البيانات");
    await closed();
    assert.equal(writes.filter((w) => w.path.endsWith("/adjust")).length, 2);
    assert.equal(users.find((x) => x.id === "c1").wallet.balance, "50.25");
    await p.getByRole("button", { name: "نسبة كاش باك", exact: true }).click();
    await dialog()
      .getByLabel("استخدام نسبة كاش باك المنصة", { exact: true })
      .uncheck();
    await dialog().getByLabel("نسبة الكاش باك", { exact: true }).fill("0");
    await dialog().getByLabel("حد أدنى الطلب", { exact: true }).fill("200");
    await dialog().getByLabel("حد أعلى الكاش باك", { exact: true }).fill("50");
    await submit("تأكيد");
    await dialog()
      .getByText("تعذر تأكيد إعدادات الكاش باك", { exact: true })
      .waitFor();
    await submit("تحديث البيانات");
    await closed();
    assert.equal(writes.filter((w) => w.path.endsWith("/cashback")).length, 1);
    await p.getByText("الكاش باك: 0%", { exact: true }).waitFor();
    assert.equal(users[0].cashback_min_order, 200);
    assert.equal(users[0].cashback_max_amount, 50);
    await p.getByRole("button", { name: "نسبة كاش باك", exact: true }).click();
    await dialog().getByLabel("حد أدنى الطلب", { exact: true }).fill("");
    await dialog().getByLabel("حد أعلى الكاش باك", { exact: true }).fill("");
    await dialog()
      .getByLabel("استخدام نسبة كاش باك المنصة", { exact: true })
      .check();
    await submit("تأكيد");
    await closed();
    assert.equal(users[0].cashback_percent, null);
    assert.equal(users[0].cashback_min_order, null);
    assert.equal(users[0].cashback_max_amount, null);

    await p.getByRole("button", { name: "إضافة عنوان", exact: true }).click();
    await dialog().getByLabel("المدينة", { exact: true }).fill("الرياض");
    await dialog().getByLabel("الحي", { exact: true }).fill("العليا");
    await submit("إضافة العنوان");
    await closed();
    await p.getByText("الرياض، العليا", { exact: true }).waitFor();
    await p
      .getByRole("button", { name: "إضافة مركبة جديدة", exact: true })
      .click();
    await dialog()
      .getByLabel("شركة العربية", { exact: true })
      .selectOption("make1");
    assert.equal(await dialog().locator("option[value=hidden]").count(), 0);
    await dialog()
      .getByLabel("موديل العربية", { exact: true })
      .selectOption("model1");
    await dialog().getByLabel("سنة الصنع", { exact: true }).fill("1980");
    await dialog()
      .getByLabel("رقم الهيكل", { exact: true })
      .fill("JTD12345678901234");
    await submit("إضافة المركبة");
    await closed();
    await p
      .getByText("تويوتا من الخادم كامري من الخادم 1980", { exact: true })
      .waitFor();
    await p.getByRole("button", { name: "إرسال تنبيه", exact: true }).click();
    await dialog()
      .getByLabel("نص التنبيه (اختياري)", { exact: true })
      .fill("سلتك في انتظارك");
    await submit("إرسال التنبيه");
    await closed();
    assert.ok(
      await p
        .getByRole("button", { name: "إرسال تنبيه", exact: true })
        .isDisabled(),
    );
    assert.equal(writes.filter((w) => w.path.endsWith("/remind")).length, 1);
    await p.getByRole("button", { name: "حركات المحفظة", exact: true }).click();
    await p.getByText("إضافة إدارية", { exact: true }).waitFor();
    await p.screenshot({
      path: "/tmp/customer-connected-desktop.png",
      fullPage: true,
    });
    await p.setViewportSize({ width: 390, height: 844 });
    await p.screenshot({
      path: "/tmp/customer-connected-mobile.png",
      fullPage: true,
    });
    await p.setViewportSize({ width: 1440, height: 1100 });
    unknownCredit = true;
    await p
      .getByRole("button", { name: "إضافة رصيد للعميل", exact: true })
      .click();
    await dialog().getByLabel("قيمة الرصيد", { exact: true }).fill("9");
    await dialog()
      .getByLabel("سبب إضافة الرصيد", { exact: true })
      .fill("تعويض إضافي");
    await submit("إضافة الرصيد");
    await dialog()
      .getByText("نتيجة العملية غير مؤكدة", { exact: true })
      .waitFor();
    assert.ok(
      await dialog()
        .getByRole("button", { name: "إضافة الرصيد", exact: true })
        .isDisabled(),
    );
    await dialog().getByRole("button", { name: "إغلاق", exact: true }).click();
    await p.getByRole("button", { name: "تحديث", exact: true }).click();
    assert.equal(users.find((x) => x.id === "c1").wallet.balance, "59.25");
    await p.getByRole("button", { name: "إدارة العملاء", exact: true }).click();
    await p.getByRole("button", { name: "إضافة جديد", exact: true }).click();
    await dialog()
      .getByLabel("الاسم الكامل", { exact: true })
      .fill("عميل جديد");
    await dialog().getByLabel("رقم الجوال", { exact: true }).fill("0559999999");
    await submit("إضافة عميل جديد");
    await dialog()
      .getByText("رقم الجوال مسجل بالفعل", { exact: true })
      .waitFor();
    await submit("إضافة عميل جديد");
    await dialog().getByText("تعذر تأكيد العميل", { exact: true }).waitFor();
    await submit("تحديث البيانات");
    await closed();
    assert.equal(
      writes.filter((w) => w.path === "/api/admin/customers" && w.m === "POST")
        .length,
      2,
    );
    assert.equal(users.filter((x) => x.id === "created").length, 1);
    await p
      .getByRole("button", { name: "خيارات العميل c3", exact: true })
      .click();
    await p.getByRole("button", { name: "حذف العميل", exact: true }).click();
    await submit("تأكيد حذف العميل");
    await closed();
    assert.equal(users.find((x) => x.id === "c3").status, "deleted");
    assert.deepEqual(errors, []);
    console.log(
      "PASS customers including signed avatar upload/retry/removal, editable/clearable admin notes, all cashback limits/defaults/zero and readback-only retry; server list/search/paging/summary, protected CSV, edit constraints/422, block/unblock, actual orders/pricing navigation, wallet 422 and verification retry without double credit, uncertain credit lock, cashback zero, saved vehicle/address, real cart reminder, soft deletion, create verification retry, mobile and no runtime errors.",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
