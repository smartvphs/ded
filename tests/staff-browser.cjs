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
          accessToken: "staff-test",
          admin: { name: "اختبار" },
        }),
      ),
    );
    const page = await context.newPage(),
      errors = [],
      reads = [],
      writes = [];
    page.on("pageerror", (e) => errors.push(e.message));
    let failStatus = true,
      failRead = false,
      failReset = true,
      unknownReset = false,
      denyStaff = false;
    const staff = Array.from({ length: 9 }, (_, i) => ({
      id: "s" + i,
      name: "موظف " + i,
      email: "s" + i + "@example.com",
      role: i ? "staff" : "admin",
      isActive: true,
      isSuperAdmin: i === 0,
      permissions: i ? ["orders.read", "legacy.read"] : [],
      createdAt: "2026-10-22T10:00:00Z",
      deletedAt: null,
    }));
    const catalog = {
      data: [
        {
          key: "general",
          label: "الصلاحيات العامة",
          permissions: [
            { key: "orders.read", label: "قراءة الطلبات" },
            { key: "catalog.manage", label: "إدارة التصنيفات" },
            { key: "wallet.credit", label: "إضافة رصيد", sensitive: true },
          ],
        },
      ],
      meta: {
        matrix: [
          {
            key: "orders",
            label: "الطلبات",
            read: ["orders.read"],
            write: null,
            delete: null,
          },
          {
            key: "categories",
            label: "التصنيفات",
            read: null,
            write: ["catalog.manage"],
            delete: ["catalog.manage"],
          },
          {
            key: "staff",
            label: "الموظفون",
            superAdminOnly: true,
            read: null,
            write: null,
            delete: null,
          },
        ],
      },
    };
    await page.route(
      "https://car-parts-backend.vercel.app/**",
      async (route) => {
        const req = route.request(),
          u = new URL(req.url()),
          path = u.pathname,
          method = req.method(),
          body = req.postDataJSON();
        const send = (data, status = 200) =>
          route.fulfill({
            status,
            contentType: "application/json",
            body: JSON.stringify({ success: status < 400, ...data }),
          });
        assert.equal(req.headers().authorization, "Bearer staff-test");
        if (method === "GET") reads.push(u.pathname + u.search);
        else writes.push({ path, method, body });
        if (path === "/api/admin/me")
          return send({ data: { id: "s0", isSuperAdmin: true } });
        if (path === "/api/admin/permissions") return send(catalog);
        if (path === "/api/admin/audit-log")
          return send({
            data: [
              {
                id: "log1",
                actor_name: "موظف 1",
                action: "staff.update",
                entity_type: "staff",
                created_at: "2026-10-22T10:00:00Z",
              },
            ],
            meta: { total: 1, actions: ["staff.update"] },
          });
        if (path === "/api/admin/staff" && method === "GET") {
          if (denyStaff)
            return send({ message: "غير مسموح بعرض الموظفين" }, 403);
          if (failRead && !u.search) {
            failRead = false;
            return send({ message: "تعذر تأكيد البيانات" }, 503);
          }
          let rows = staff.filter((s) =>
            u.searchParams.get("status") === "deleted"
              ? s.deletedAt
              : !s.deletedAt,
          );
          const status = u.searchParams.get("status"),
            search = u.searchParams.get("search");
          if (status === "inactive") rows = rows.filter((s) => !s.isActive);
          if (status === "active") rows = rows.filter((s) => s.isActive);
          if (search)
            rows = rows.filter((s) => (s.name + s.email).includes(search));
          const total = rows.length;
          if (u.searchParams.has("limit"))
            rows = rows.slice(
              +u.searchParams.get("offset"),
              +u.searchParams.get("offset") + +u.searchParams.get("limit"),
            );
          return send({
            data: rows,
            meta: {
              total,
              statusCounts: {
                all: staff.length,
                active: staff.filter((s) => s.isActive).length,
                inactive: staff.filter((s) => !s.isActive).length,
                deleted: staff.filter((s) => s.deletedAt).length,
              },
            },
          });
        }
        if (path === "/api/admin/staff" && method === "POST") {
          assert.deepEqual(Object.keys(body).sort(), [
            "email",
            "name",
            "password",
            "permissions",
          ]);
          const row = {
            id: "created",
            ...body,
            role: "staff",
            isActive: true,
            isSuperAdmin: false,
            deletedAt: null,
          };
          delete row.password;
          staff.push(row);
          return send({ data: { ...row, is_active: true } }, 201);
        }
        const match = path.match(/^\/api\/admin\/staff\/([^/]+)(.*)$/);
        if (match) {
          const row = staff.find((s) => s.id === match[1]);
          assert(row);
          if (match[2] === "/status") {
            if (row.id === "created" && failStatus) {
              failStatus = false;
              return send({ message: "خطأ مؤقت" }, 503);
            }
            row.isActive = body.isActive;
            return send({ data: { id: row.id, isActive: row.isActive } });
          }
          if (match[2] === "/permissions") {
            row.permissions = body.permissions;
            failRead = true;
            return send({ data: { ...row, sessionsRevoked: true } });
          }
          if (match[2] === "/reset-password") {
            if (unknownReset) return send({ message: "نتيجة غير مؤكدة" }, 503);
            if (failReset) {
              failReset = false;
              return send({ message: "كلمة مرور غير صالحة" }, 422);
            }
            return send({ data: { changed: true, sessionsRevoked: true } });
          }
          if (method === "DELETE") {
            row.deletedAt = "2026-10-22";
            row.email = null;
            row.permissions = [];
            row.isActive = false;
            return send({
              data: { id: row.id, deleted: true, sessionsRevoked: true },
            });
          }
          if (method === "PATCH") {
            Object.assign(row, body);
            return send({ data: row });
          }
        }
        return send({ data: [] });
      },
    );
    await page.route('**/api/admin/notifications?*', r => r.fulfill({status:200, contentType:'application/json', body:JSON.stringify({success:true,data:{items:[],unreadCount:0},meta:{total:0}})}));
    await page.goto(
      (process.env.TEST_BASE_URL || "http://127.0.0.1:5189") + "/#employees",
    );
    await page
      .getByRole("button", { name: "صلاحيات الموظف s1", exact: true })
      .waitFor();
    assert(
      await page
        .getByRole("button", { name: "حذف الموظف s0", exact: true })
        .isDisabled(),
    );
    assert(
      await page
        .getByRole("button", { name: "إيقاف الموظف s0", exact: true })
        .isDisabled(),
    );
    await page.getByRole("button", { name: "التالي", exact: true }).click();
    await page
      .getByRole("button", { name: "صلاحيات الموظف s8", exact: true })
      .waitFor();
    assert(reads.some((p) => p.includes("offset=7")));
    await page
      .getByRole("textbox", {
        name: "البحث باسم الموظف أو البريد الإلكتروني",
        exact: true,
      })
      .fill("s1@");
    await page
      .getByRole("button", { name: "صلاحيات الموظف s1", exact: true })
      .waitFor();
    assert(reads.some((p) => p.includes("search=s1%40")));
    await page
      .getByRole("button", { name: "صلاحيات الموظف s1", exact: true })
      .click();
    await page
      .getByRole("checkbox", { name: "كتابة التصنيفات", exact: true })
      .check();
    assert(
      await page
        .getByRole("checkbox", { name: "حذف التصنيفات", exact: true })
        .isChecked(),
    );
    assert(
      await page
        .getByRole("checkbox", { name: "قراءة الموظفون", exact: true })
        .isDisabled(),
    );
    await page
      .getByRole("button", { name: "حفظ الصلاحيات", exact: true })
      .click();
    await page
      .getByRole("button", { name: "تأكيد البيانات", exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "تأكيد البيانات", exact: true })
      .click();
    await page
      .getByText("تم حفظ الصلاحيات وتأكيدها من الخادم.", { exact: true })
      .waitFor();
    assert.equal(
      writes.filter((w) => w.path.endsWith("/permissions")).length,
      1,
    );
    assert.deepEqual(staff[1].permissions, [
      "orders.read",
      "legacy.read",
      "catalog.manage",
    ]);
    await page.getByRole("button", { name: "سجل النشاط", exact: true }).click();
    await page
      .getByRole("cell", { name: "staff.update", exact: true })
      .waitFor();
    await page.getByLabel("نوع عملية الموظف").selectOption("staff.update");
    await page.waitForResponse(
      (r) =>
        r.url().includes("audit-log") &&
        r.url().includes("action=staff.update"),
    );
    assert(reads.some((p) => p.includes("actorId=s1")));
    await page
      .getByRole("button", { name: "إدارة الموظفين", exact: true })
      .click();
    await page
      .getByRole("button", { name: "تعديل الموظف s1", exact: true })
      .click();
    await page.getByLabel("اسم الموظف", { exact: true }).fill("موظف معدل");
    await page
      .getByRole("button", { name: "حفظ التعديلات", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "تعديل الموظف", exact: true })
      .waitFor({ state: "hidden" });
    assert.equal(staff[1].name, "موظف معدل");
    assert.deepEqual(
      Object.keys(
        writes.find(
          (w) => w.path === "/api/admin/staff/s1" && w.method === "PATCH",
        ).body,
      ).sort(),
      ["email", "name"],
    );
    await page
      .getByRole("button", { name: "إيقاف الموظف s1", exact: true })
      .click();
    await page.getByRole("button", { name: "تأكيد", exact: true }).click();
    await page
      .getByRole("button", { name: "تنشيط الموظف s1", exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "تغيير كلمة مرور الموظف s1", exact: true })
      .click();
    await page
      .getByLabel("كلمة المرور الجديدة", { exact: true })
      .fill("NewPass123");
    await page.getByRole("button", { name: "تأكيد", exact: true }).click();
    await page.getByText("كلمة مرور غير صالحة", { exact: true }).waitFor();
    await page.getByRole("button", { name: "تأكيد", exact: true }).click();
    await page
      .getByRole("heading", { name: "تغيير كلمة مرور الموظف", exact: true })
      .waitFor({ state: "hidden" });
    await page.getByRole("button", { name: "إضافة جديد", exact: true }).click();
    await page.getByLabel("اسم الموظف", { exact: true }).fill("موظف جديد");
    await page
      .getByLabel("البريد الإلكتروني", { exact: true })
      .fill("new@example.com");
    await page.getByLabel("كلمة المرور", { exact: true }).fill("NewPass123");
    await page.getByText("موظف نشط", { exact: true }).uncheck();
    await page
      .getByRole("button", { name: "إضافة الموظف", exact: true })
      .click();
    await page
      .getByRole("button", { name: "تأكيد البيانات", exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "تأكيد البيانات", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "إضافة موظف جديد", exact: true })
      .waitFor({ state: "hidden" });
    assert.equal(
      writes.filter((w) => w.method === "POST" && w.path === "/api/admin/staff")
        .length,
      1,
    );
    assert.equal(staff.find((s) => s.id === "created").isActive, false);
    assert.deepEqual(staff.find((s) => s.id === "created").permissions, []);
    await page
      .getByLabel("البحث باسم الموظف أو البريد الإلكتروني", { exact: true })
      .fill("new@");
    await page
      .getByRole("button", { name: "حذف الموظف created", exact: true })
      .click();
    await page.getByRole("button", { name: "تأكيد", exact: true }).click();
    await page
      .getByRole("heading", { name: "حذف الموظف", exact: true })
      .waitFor({ state: "hidden" });
    await page
      .getByLabel("البحث باسم الموظف أو البريد الإلكتروني", { exact: true })
      .fill("");
    await page.getByLabel("حالة الموظفين").selectOption("deleted");
    await page
      .getByRole("button", { name: "صلاحيات الموظف created", exact: true })
      .waitFor();
    assert(
      await page
        .getByRole("button", { name: "تعديل الموظف created", exact: true })
        .isDisabled(),
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: "/tmp/staff-mobile.png", fullPage: true });
    await page.getByLabel("حالة الموظفين").selectOption("");
    await page
      .getByRole("button", { name: "تغيير كلمة مرور الموظف s1", exact: true })
      .click();
    unknownReset = true;
    await page
      .getByLabel("كلمة المرور الجديدة", { exact: true })
      .fill("NewPassAgain123");
    await page.getByRole("button", { name: "تأكيد", exact: true }).click();
    await page
      .getByText(
        "نتيجة تغيير كلمة المرور غير مؤكدة؛ راجعها قبل تكرار العملية.",
        { exact: true },
      )
      .waitFor();
    assert(
      await page
        .getByRole("button", { name: "تأكيد", exact: true })
        .isDisabled(),
    );
    await page.getByRole("button", { name: "إلغاء", exact: true }).click();
    denyStaff = true;
    await page.reload();
    await page
      .getByText("ليس لديك صلاحية لعرض هذه البيانات أو تنفيذ الإجراء.", {
        exact: true,
      })
      .waitFor();
    assert.equal(
      await page
        .getByRole("button", { name: "تعديل الموظف s1", exact: true })
        .count(),
      0,
    );
    assert.deepEqual(errors, []);
    assert(
      !(await page.evaluate(() =>
        localStorage.getItem("mypart.admin.session.v1").includes("NewPass"),
      )),
    );
    console.log(
      "Staff browser PASS: server paging/search, official/shared permissions, readback retry, edit/status/password/delete, inactive creation retry without duplicate POST, mobile/no JS errors.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
