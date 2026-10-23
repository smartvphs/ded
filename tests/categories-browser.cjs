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
    const c = await browser.newContext({
      viewport: { width: 1440, height: 1100 },
    });
    await c.addInitScript(() =>
      localStorage.setItem(
        "mypart.admin.session.v1",
        JSON.stringify({
          verified: true,
          accessToken: "category-test",
          admin: { name: "اختبار" },
        }),
      ),
    );
    const page = await c.newPage(),
      errors = [],
      writes = [],
      reads = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const categories = [
      "قطع غيار حقيقية",
      "زيوت حقيقية",
      "إطارات حقيقية",
      "مستعمل حقيقي",
      "خدمات حقيقية",
      "إكسسوارات حقيقية",
    ].map((name, i) => ({
      id: "cat" + (i + 1),
      name_ar: name,
      name_en: "Category " + i,
      sort_order: i + 1,
      is_active: true,
      parent_id: null,
      type: i === 4 ? "service" : "product",
      icon_url: "https://example.com/category" + i + ".png",
      products_count: 31 + i,
      suppliers_count: 2,
      cars_count: 3,
      fields_count: 1,
      subcategories_count: 1,
    }));
    categories.push({
      id: "sub1",
      name_ar: "فرع حقيقي",
      parent_id: "cat1",
      is_active: true,
      products_count: 3,
    });
    let makes = [
        {
          id: "make1",
          name_ar: "تويوتا حقيقية",
          name_en: "Toyota",
          is_active: true,
          models_count: 1,
          variants_count: 1,
          logo_url: "https://example.com/toyota.png",
        },
      ],
      models = [
        {
          id: "model1",
          make_id: "make1",
          name_ar: "كامري حقيقية",
          is_active: true,
        },
      ],
      variants = [
        {
          id: "variant1",
          make_id: "make1",
          model_id: "model1",
          year_from: 2021,
          year_to: 2022,
          trim: "جراندي",
          engine: "4 سلندر",
          transmission: "أوتوماتيك",
          is_active: true,
        },
      ],
      brands = [
        {
          id: "brand1",
          name: "شل حقيقية",
          category: "oils",
          is_active: true,
          logo_url: "https://example.com/shell.png",
        },
      ];
    const fields = [
      {
        id: "field1",
        categoryId: "cat2",
        key: "oil_type",
        labelAr: "نوع الزيت",
        valueType: "text",
        isActive: true,
        options: [
          {
            id: "option1",
            fieldId: "field1",
            value: "synthetic",
            labelAr: "صناعي بالكامل",
            isActive: true,
          },
        ],
      },
    ];
    let failCategory = true,
      failDelete = true,
      failVerify = false,
      uncertainMake = false;
    const reply = (r, data, meta, status = 200, message = "Success") =>
      r.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify({ success: status < 400, message, data, meta }),
      });
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX7kAAAAASUVORK5CYII=",
      "base64",
    );
    await c.route("https://example.com/**", (r) =>
      r.fulfill({ contentType: "image/png", body: png }),
    );
    await c.route("https://api.cloudinary.com/**", (r) =>
      r.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          secure_url: "https://example.com/uploaded-category.png",
        }),
      }),
    );
    await c.route("https://car-parts-backend.vercel.app/**", (r) => {
      const req = r.request(),
        u = new URL(req.url()),
        p = u.pathname,
        m = req.method(),
        body = req.postDataJSON();
      assert.equal(req.headers().authorization, "Bearer category-test");
      if (m !== "GET") writes.push({ p, m, body });
      else reads.push({ p, q: u.searchParams });
      if (p === "/api/categories/admin/main")
        return reply(
          r,
          categories.filter((x) => !x.parent_id),
          { total: 6, warnings: [] },
        );
      if (p === "/api/admin/reports/categories")
        return reply(r, {
          period: { from: "2026-10-01", to: "2026-10-21" },
          items: categories
            .filter((x) => !x.parent_id)
            .map((x) => ({ categoryId: x.id, ordersCount: 7 })),
        });
      if (p === "/api/categories/admin") {
        if (failVerify) {
          failVerify = false;
          return reply(r, null, null, 503, "تعذر تحديث القائمة");
        }
        const rows = u.searchParams.has("parentId")
          ? categories.filter(
              (x) => x.parent_id === u.searchParams.get("parentId"),
            )
          : categories;
        return reply(r, rows, { total: rows.length });
      }
      if (p === "/api/uploads/signature")
        return reply(r, {
          signature: "test",
          apiKey: "test",
          cloudName: "test",
          uploadParams: { timestamp: 1, folder: "categories" },
        });
      if (p === "/api/categories" && m === "POST") {
        if (failCategory) {
          failCategory = false;
          return reply(r, null, null, 409, "التصنيف موجود");
        }
        const row = {
          id: "new-sub",
          name_ar: body.nameAr,
          name_en: body.nameEn,
          parent_id: body.parentId,
          sort_order: body.sortOrder,
          is_active: true,
          products_count: 0,
        };
        categories.push(row);
        return reply(r, row);
      }
      const cat = categories.find(
        (x) =>
          p === "/api/categories/" + x.id ||
          p === "/api/categories/" + x.id + "/status",
      );
      if (cat) {
        if (m === "PATCH") {
          cat.is_active = body.isActive;
          return reply(r, cat);
        }
        if (m === "PUT") {
          Object.assign(cat, {
            name_ar: body.nameAr,
            name_en: body.nameEn,
            icon_url: body.iconUrl,
            description: body.description,
          });
          return reply(r, cat);
        }
        if (m === "DELETE") {
          if (cat.id === "sub1" && failDelete) {
            failDelete = false;
            return reply(r, null, null, 409, "التصنيف مرتبط بمنتجات");
          }
          categories.splice(categories.indexOf(cat), 1);
          return reply(r, { deleted: true });
        }
      }
      if (p === "/api/cars/admin/makes")
        return reply(r, makes, { total: makes.length });
      if (p === "/api/cars/admin/variants")
        return reply(
          r,
          variants.filter(
            (v) =>
              !u.searchParams.get("makeId") ||
              v.make_id === u.searchParams.get("makeId"),
          ),
          {
            total: variants.filter(
              (v) =>
                !u.searchParams.get("makeId") ||
                v.make_id === u.searchParams.get("makeId"),
            ).length,
          },
        );
      if (p === "/api/cars/admin/makes/make1/models") return reply(r, models);
      if (p === "/api/cars/makes" && m === "POST") {
        const row = {
          id: "make2",
          name_ar: body.nameAr,
          is_active: true,
          models_count: 0,
          variants_count: 0,
        };
        makes.push(row);
        if (uncertainMake)
          return reply(r, null, null, 503, "تعذر تأكيد الإضافة");
        return reply(r, row);
      }
      if (p === "/api/cars/makes/make1/models" && m === "POST") {
        const row = {
          id: "model2",
          make_id: "make1",
          name_ar: body.nameAr,
          is_active: true,
        };
        models.push(row);
        return reply(r, row);
      }
      if (p === "/api/cars/models/model1" && m === "PUT") {
        assert.equal(body.logoUrl, undefined);
        models[0].name_ar = body.nameAr;
        return reply(r, models[0]);
      }
      if (p === "/api/cars/models/model2" && m === "DELETE") {
        models = models.filter((x) => x.id !== "model2");
        return reply(r, { deleted: true });
      }
      if (p === "/api/cars/models/model1/status") {
        models[0].is_active = body.isActive;
        return reply(r, models[0]);
      }
      if (p === "/api/cars/admin/models/model1/variants" && m === "POST") {
        const row = {
          id: "variant2",
          make_id: "make1",
          model_id: "model1",
          year_from: body.yearFrom,
          year_to: body.yearTo,
          engine: body.engine,
          trim: body.trim,
          transmission: body.transmission,
          is_active: true,
        };
        variants.push(row);
        return reply(r, row);
      }
      if (p === "/api/cars/admin/variants/variant1" && m === "PUT") {
        Object.assign(variants[0], {
          year_from: body.yearFrom,
          year_to: body.yearTo,
          engine: body.engine,
          trim: body.trim,
          transmission: body.transmission,
        });
        return reply(r, variants[0]);
      }
      if (p === "/api/cars/admin/variants/variant2" && m === "DELETE") {
        variants = variants.filter((v) => v.id !== "variant2");
        return reply(r, { deleted: true });
      }
      if (p === "/api/brands" && m === "GET")
        return reply(
          r,
          brands.filter((b) => b.category === u.searchParams.get("category")),
        );
      if (p === "/api/brands" && m === "POST") {
        const row = {
          id: "brand2",
          name: body.name,
          name_en: body.nameEn,
          logo_url: body.logoUrl,
          category: body.category,
          is_active: true,
        };
        brands.push(row);
        failVerify = true;
        return reply(r, row);
      }
      if (p === "/api/brands/brand2" && m === "DELETE") {
        brands = brands.filter((b) => b.id !== "brand2");
        return reply(r, { deleted: true });
      }
      if (p === "/api/brands/brand1" && m === "PUT") {
        if ("isActive" in body) brands[0].is_active = body.isActive;
        else brands[0].name = body.name;
        return reply(r, brands[0]);
      }
      if (p === "/api/catalog-fields" && m === "GET") return reply(r, fields);
      if (p === "/api/catalog-fields/field1" && m === "PUT") {
        if ("isActive" in body) fields[0].isActive = body.isActive;
        else Object.assign(fields[0], body);
        return reply(r, fields[0]);
      }
      if (p === "/api/catalog-fields/field1/options" && m === "POST") {
        const row = { id: "option2", ...body, isActive: true };
        fields[0].options.push(row);
        return reply(r, row);
      }
      if (p === "/api/catalog-fields/field1/options/option1" && m === "DELETE")
        return reply(r, null, null, 409, "القيمة مستخدمة في منتجات");
      if (p === "/api/catalog-fields/field1/options/option1/status") {
        fields[0].options[0].isActive = body.isActive;
        return reply(r, fields[0].options[0]);
      }
      if (p === "/api/catalog-fields/field1/options/option2" && m === "PUT") {
        Object.assign(fields[0].options[1], body);
        return reply(r, fields[0].options[1]);
      }
      if (
        p === "/api/catalog-fields/field1/options/option2" &&
        m === "DELETE"
      ) {
        fields[0].options = fields[0].options.filter((o) => o.id !== "option2");
        return reply(r, { deleted: true });
      }
      if (p === "/api/admin/reports/performance")
        return reply(r, {
          period: {
            from: u.searchParams.get("from"),
            to: u.searchParams.get("to"),
          },
          kpis: {
            sales: { netRevenue: 987 },
            orders: { total: 12 },
            pricingRequests: {
              total: 23,
              quoted: 3,
              confirmed: 4,
              awaitingQuote: 16,
            },
            activeCompanies: { count: 2 },
            profit: { amount: 40, isPartial: true },
          },
          suppliersPerformance: {
            items: [{ name: "مورد تقرير", ordersCount: 2, netRevenue: 50 }],
            total: 1,
          },
          topCars: {
            items: [
              {
                makeId: "make1",
                makeNameAr: "تويوتا تقرير",
                modelNameAr: "كامري تقرير",
                pricingRequests: 23,
                ordersCount: 12,
              },
            ],
          },
          topCategories: { items: [] },
          insights: {
            items: [],
            unavailable: [],
            metrics: { pricingByMake: [] },
          },
          topYears: { items: [] },
          partsQuality: { items: [] },
          monthlyComparison: { series: [] },
          ordersRevenueTrend: { series: [] },
          partsShare: { items: [] },
        });
      throw Error("Unexpected " + m + " " + p);
    });
    await page.route('**/api/admin/notifications?*',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({success:true,data:{items:[],unreadCount:0},meta:{total:0}})}));
    await page.goto(
      (process.env.TEST_BASE_URL || "http://127.0.0.1:5189") + "/#categories",
    );
    await page
      .getByRole("button", { name: "فتح تصنيف قطع غيار حقيقية", exact: true })
      .waitFor();
    assert.equal(await page.locator(".category-card").count(), 6);
    for (let i = 0; i < 6; i++)
      assert.equal(
        await page.locator(".category-image img").nth(i).getAttribute("src"),
        "https://example.com/category" + i + ".png",
      );
    assert.equal(
      await page.locator(".category-metrics dt").first().textContent(),
      "31",
    );
    await page
      .getByRole("button", { name: "فتح تصنيف قطع غيار حقيقية", exact: true })
      .click();
    await page.getByText("كامري حقيقية", { exact: true }).waitFor();
    await page.getByText(/سنوات الصنع من 2021 إلى 2022/).waitFor();
    assert.equal(
      await page.getByText("بي ام دبليو", { exact: true }).count(),
      0,
    );
    const dialog = () => page.getByRole("dialog");
    async function submit(name) {
      await dialog().getByRole("button", { name, exact: true }).click();
    }
    async function closed() {
      await dialog().waitFor({ state: "hidden" });
    }
    await page
      .getByRole("button", { name: "تعديل بيانات القسم", exact: true })
      .click();
    await dialog().getByLabel("رفع صورة").setInputFiles({
      name: "category.png",
      mimeType: "image/png",
      buffer: png,
    });
    await submit("حفظ التعديل");
    await closed();
    assert.ok(
      writes.some(
        (w) =>
          w.p === "/api/categories/cat1" &&
          w.body.iconUrl === "https://example.com/uploaded-category.png",
      ),
    );
    await page
      .getByRole("button", { name: "تعديل كامري حقيقية", exact: true })
      .click();
    await dialog()
      .getByLabel("اسم الموديل", { exact: true })
      .fill("كامري معدلة");
    await submit("حفظ التعديل");
    await closed();
    await page.getByText("كامري معدلة", { exact: true }).waitFor();
    await page
      .getByRole("button", {
        name: "تعديل السيارة كامري معدلة 2021 2022",
        exact: true,
      })
      .click();
    await dialog().getByLabel("إلى سنة", { exact: true }).fill("2024");
    await submit("حفظ التعديل");
    await closed();
    await page.getByText(/سنوات الصنع من 2021 إلى 2024/).waitFor();
    await page
      .getByRole("button", { name: "إضافة سيارة", exact: true })
      .click();
    await dialog().getByLabel("من سنة", { exact: true }).fill("2025");
    await dialog().getByLabel("إلى سنة", { exact: true }).fill("2026");
    await submit("إضافة");
    await closed();
    assert.equal(variants.length, 2);
    await page
      .getByRole("button", {
        name: "حذف السيارة كامري معدلة 2025 2026",
        exact: true,
      })
      .click();
    await submit("تأكيد الحذف");
    await closed();
    assert.equal(variants.length, 1);
    await page
      .getByRole("button", { name: "إضافة موديل", exact: true })
      .click();
    await dialog()
      .getByLabel("اسم الموديل", { exact: true })
      .fill("موديل جديد");
    await submit("إضافة");
    await closed();
    await page
      .getByRole("button", { name: "حذف موديل جديد", exact: true })
      .click();
    await submit("تأكيد الحذف");
    await closed();
    await page
      .getByLabel("اسم التصنيف الجديد", { exact: true })
      .fill("فرع جديد");
    await page
      .getByRole("button", { name: "إضافة التصنيف", exact: true })
      .click();
    await submit("إضافة");
    await dialog().getByText("التصنيف موجود", { exact: true }).waitFor();
    assert.equal(
      await dialog().getByLabel("اسم التصنيف", { exact: true }).inputValue(),
      "فرع جديد",
    );
    await submit("إضافة");
    await closed();
    assert.equal(categories.filter((x) => x.id === "new-sub").length, 1);
    await page
      .getByRole("button", { name: "حذف فرع حقيقي", exact: true })
      .click();
    await submit("تأكيد الحذف");
    await dialog()
      .getByText("التصنيف مرتبط بمنتجات", { exact: true })
      .waitFor();
    await dialog().getByRole("button", { name: "إلغاء", exact: true }).click();
    assert.ok(categories.find((x) => x.id === "sub1"));
    await page
      .getByRole("button", { name: "إخفاء فرع حقيقي", exact: true })
      .click();
    await page
      .getByRole("button", { name: "إظهار فرع حقيقي", exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "حذف فرع جديد", exact: true })
      .click();
    await submit("تأكيد الحذف");
    await closed();
    await page
      .getByRole("button", { name: "الإحصائيات والتحليلات", exact: true })
      .click();
    await page.getByText("مورد تقرير", { exact: true }).waitFor();
    await page
      .getByLabel("فترة إحصائيات قطع الغيار", { exact: true })
      .selectOption("7");
    await page.waitForTimeout(150);
    assert.ok(
      reads.some(
        (r) =>
          r.p === "/api/admin/reports/performance" &&
          r.q.get("from") &&
          r.q.get("to"),
      ),
    );
    await page
      .getByRole("button", { name: "التصنيفات الرئيسية", exact: true })
      .click();
    await page
      .getByRole("button", { name: "فتح تصنيف زيوت حقيقية", exact: true })
      .click();
    await page.getByText("شل حقيقية", { exact: true }).waitFor();
    await page
      .getByRole("button", { name: "إضافة ماركة", exact: true })
      .click();
    await dialog()
      .getByLabel("اسم الماركة", { exact: true })
      .fill("ماركة جديدة");
    await submit("إضافة");
    await dialog().getByText("تعذر تحديث القائمة", { exact: false }).waitFor();
    await submit("تحديث القائمة");
    await closed();
    assert.equal(
      writes.filter((w) => w.p === "/api/brands" && w.m === "POST").length,
      1,
    );
    await page
      .getByRole("button", { name: "إخفاء شل حقيقية", exact: true })
      .click();
    await page
      .getByRole("button", { name: "إظهار شل حقيقية", exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "حذف ماركة جديدة", exact: true })
      .click();
    await submit("تأكيد الحذف");
    await closed();
    await page
      .getByRole("button", { name: "حذف نوع الزيت صناعي بالكامل", exact: true })
      .click();
    await submit("تأكيد الحذف");
    await dialog()
      .getByText("القيمة مستخدمة في منتجات", { exact: true })
      .waitFor();
    await dialog().getByRole("button", { name: "إلغاء", exact: true }).click();
    await page
      .getByRole("button", {
        name: "إخفاء نوع الزيت صناعي بالكامل",
        exact: true,
      })
      .click();
    await page
      .getByRole("button", {
        name: "إظهار نوع الزيت صناعي بالكامل",
        exact: true,
      })
      .waitFor();
    await page
      .getByRole("button", { name: "إضافة اختيار", exact: true })
      .click();
    await dialog()
      .getByLabel("القيمة المحفوظة", { exact: true })
      .fill("new-code");
    await dialog()
      .getByLabel("الاسم بالعربي", { exact: true })
      .fill("اختيار جديد");
    await submit("إضافة");
    await closed();
    assert.equal(fields[0].options[1].value, "new-code");
    await page
      .getByRole("button", { name: "تعديل نوع الزيت اختيار جديد", exact: true })
      .click();
    await dialog()
      .getByLabel("الاسم بالعربي", { exact: true })
      .fill("اختيار معدل");
    await submit("حفظ التعديل");
    await closed();
    await page
      .getByRole("button", { name: "حذف نوع الزيت اختيار معدل", exact: true })
      .click();
    await submit("تأكيد الحذف");
    await closed();
    await page
      .getByRole("button", { name: "تعديل حقل نوع الزيت", exact: true })
      .click();
    await dialog()
      .getByLabel("اسم الحقل بالعربي", { exact: true })
      .fill("نوع الزيت المعدل");
    await submit("حفظ التعديل");
    await closed();
    await page
      .getByRole("heading", { name: "نوع الزيت المعدل", exact: true })
      .waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: "/tmp/categories-connected-mobile.png",
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "التصنيفات الرئيسية", exact: true })
      .click();
    await page
      .getByRole("button", { name: "فتح تصنيف مستعمل حقيقي", exact: true })
      .click();
    assert.equal(await page.locator(".cm-tabs").count(), 0);
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.screenshot({
      path: "/tmp/categories-connected-details.png",
      fullPage: true,
    });
    uncertainMake = true;
    await page.getByRole("button", { name: "إضافة شركة", exact: true }).click();
    await dialog()
      .getByLabel("اسم الشركة", { exact: true })
      .fill("شركة غير مؤكدة");
    await submit("إضافة");
    await dialog().getByText("تعذر تأكيد الإضافة", { exact: true }).waitFor();
    assert.ok(
      await dialog()
        .getByRole("button", { name: "إضافة", exact: true })
        .isDisabled(),
    );
    assert.equal(
      writes.filter((w) => w.p === "/api/cars/makes" && w.m === "POST").length,
      1,
    );
    await dialog().getByRole("button", { name: "إغلاق", exact: true }).click();
    assert.deepEqual(errors, []);
    console.log(
      "PASS categories: six API images/counts, upload, model/variant CRUD, subcategory conflict/status/delete, brand verification retry without duplicate, field/option CRUD and in-use guard, real analytics filters, mobile, uncertain-create lock and no runtime errors.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
