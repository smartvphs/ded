const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE || "playwright-core",
);
const assert = require("node:assert/strict");
const XLSX = require("xlsx");
(async () => {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    const c = await browser.newContext({
      viewport: { width: 1440, height: 1100 },
    });
    await c.addInitScript(() => {
      localStorage.setItem(
        "mypart.admin.session.v1",
        JSON.stringify({
          verified: true,
          accessToken: "new-api-test",
          admin: { name: "اختبار" },
        }),
      );
      sessionStorage.setItem("mypart.screen", "products");
      window.print = () => {
        window.didPrint = true;
      };
    });
    const p = await c.newPage(),
      errors = [],
      calls = [];
    p.on("pageerror", (e) => errors.push(e.message));
    let failRelated = true,
      failReview = true,
      failAi = true;
    let imported = 0,
      failInactive = true;
    const p1 = {
        id: "p1",
        name: "منتج أساسي",
        name_en: "Primary",
        part_type: "part",
        part_number: "PN-1",
        category_id: "cat",
        supplier_id: "supplier",
        price: 100,
        cost_price: 60,
        stock_quantity: 10,
        is_active: true,
        status: "published",
        images: [],
        specifications: [],
        compatibility: [],
        variants: [],
        is_free_shipping: false,
        is_special_offer: false,
        alt_part_numbers: [],
      },
      p2 = { ...p1, id: "p2", name: "منتج للربط", part_number: "PN-2" },
      products = [p1, p2];
    let related = [],
      reviews = [],
      qualities = [
        {
          id: "p1",
          qualityTier: "original",
          qualityName: "أصلي",
          isCurrent: true,
          price: 100,
        },
      ];
    let svc = {
      id: "svc",
      name: "فحص موثق",
      cars: [
        { makeId: "make", modelId: "model", yearFrom: 2018, yearTo: 2023 },
      ],
      isSpecialOffer: true,
      nameEn: "Inspection",
      description: "فحص الخدمة",
      terms: "شروط محفوظة",
      workshopAddress: "عنوان محفوظ",
      workingHours: { sunday: { from: "09:00", to: "17:00" } },
      categoryId: "service-root",
      subcategoryId: "service-sub",
      price: 150,
      aliases: ["فحص"],
      cities: ["الرياض"],
      images: ["https://example.com/service.png"],
      includes: [],
      isActive: true,
      approvalStatus: "approved",
      supplierName: "مركز الخدمة",
      durationMinutes: 30,
      locationType: "both",
    };
    const send = (
      r,
      data,
      meta,
      status = 200,
      message = "خطأ التحقق التجريبي",
    ) =>
      r.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify({
          success: status < 400,
          data,
          meta,
          ...(status >= 400 ? { message } : {}),
        }),
      });
    const update = (row, body) => {
      for (const [k, v] of Object.entries(body)) {
        if (k === "replaceImages" || k === "replaceSpecifications") continue;
        if (k === "images") {
          if (body.replaceImages)
            row.images = v.map((image_url) => ({ image_url }));
          continue;
        }
        if (k === "specifications") {
          if (body.replaceSpecifications)
            row.specifications = v.map((x) => ({
              spec_name: x.specName,
              spec_value: x.specValue,
            }));
          continue;
        }
        row[k.replace(/[A-Z]/g, (x) => "_" + x.toLowerCase())] = v;
      }
    };
    await c.route("https://example.com/**", (r) =>
      r.fulfill({
        contentType: "image/png",
        body: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX7kAAAAASUVORK5CYII=",
          "base64",
        ),
      }),
    );
    await c.route("https://car-parts-backend.vercel.app/**", async (r) => {
      const req = r.request(),
        u = new URL(req.url()),
        q = u.searchParams,
        path = u.pathname,
        m = req.method(),
        body = req.postDataJSON();
      calls.push({ path, m, body, q: Object.fromEntries(q) });
      assert.equal(req.headers().authorization, "Bearer new-api-test");
      if (path === "/api/categories/admin")
        return send(r, [
          {
            id: "cat",
            name_ar: "قطع غيار",
            sort_order: 1,
            type: "product",
            parent_id: null,
          },
          {
            id: "service-root",
            name_ar: "خدمات",
            sort_order: 5,
            type: "service",
            parent_id: null,
          },
          {
            id: "service-sub",
            name_ar: "فحص شامل",
            type: "service",
            parent_id: "service-root",
          },
        ]);
      if (path === "/api/brands") return send(r, []);
      if (path === "/api/cars/admin/makes")
        return send(r, [
          { id: "make", name_ar: "تويوتا" },
          { id: "make2", name_ar: "نيسان" },
        ]);
      if (path === "/api/cars/admin/makes/make/models")
        return send(r, [{ id: "model", name_ar: "كامري" }]);
      if (path === "/api/cars/admin/makes/make2/models")
        return send(r, [{ id: "model2", name_ar: "صني" }]);
      if (path === "/api/suppliers/admin")
        return send(r, { items: [], total: 0 });
      if (path === "/api/products/admin/import/template")
        return send(r, {
          maxRows: 100,
          columns: [
            { key: "name", header: "اسم المنتج", required: true },
            { key: "price", header: "السعر", required: true },
          ],
        });
      if (path === "/api/products/admin/import") {
        assert.equal(body.rows.length, 1);
        if (!body.dryRun) imported++;
        return send(r, {
          dryRun: body.dryRun,
          total: 1,
          created: body.dryRun ? 0 : 1,
          valid: body.dryRun ? 1 : 0,
          failed: 0,
          skipped: 0,
          results: [
            {
              row: 2,
              status: body.dryRun ? "valid" : "created",
              name: "منتج استيراد",
              ...(!body.dryRun ? { productId: "imported-platform" } : {}),
            },
          ],
        });
      }
      if (path === "/api/uploads/signature")
        return send(r, {
          signature: "sig",
          apiKey: "key",
          cloudName: "test",
          uploadParams: { timestamp: 1, folder: "products" },
        });
      if (path === "/api/products/admin/export") {
        assert.equal(q.has("limit"), false);
        assert.equal(q.has("offset"), false);
        return send(r, products);
      }
      if (path === "/api/products/admin/generate-description") {
        if (failAi) {
          failAi = false;
          return send(r, null, null, 503, "التوليد غير متاح مؤقتًا");
        }
        return send(r, {
          description: "وصف مولد من البيانات الحقيقية",
          model: "test",
        });
      }
      if (path === "/api/products/admin") {
        if (m === "POST") {
          assert.equal(body.supplierId, undefined);
          const row = {
            id: "created-platform",
            images: [],
            specifications: [],
            compatibility: [],
            variants: [],
            is_active: true,
            status: "published",
          };
          update(row, body);
          row.images = body.images;
          row.specifications = body.specifications;
          products.push(row);
          return send(r, row, null, 201);
        }
        const all =
          q.get("partType") === "service"
            ? []
            : !q.get("partType") || q.get("partType") === "part"
              ? products
              : [];
        const rows = q.get("search")
          ? all.filter((x) => x.name.includes(q.get("search")))
          : all;
        return send(
          r,
          rows.slice(
            Number(q.get("offset") || 0),
            Number(q.get("offset") || 0) + Number(q.get("limit") || 20),
          ),
          {
            total: rows.length,
            statusCounts: { all: all.length, published: all.length },
          },
        );
      }
      if (path === "/api/products/admin/p1/related") {
        if (m === "PUT") {
          assert.ok(Array.isArray(body.productIds));
          if (failRelated) {
            failRelated = false;
            return send(r, null, null, 422);
          }
          related = body.productIds.map((id) =>
            products.find((x) => x.id === id),
          );
        }
        return send(r, {
          items: related,
          suggestions: related.length ? [] : [p2],
        });
      }
      if (path === "/api/products/admin/p1/qualities") {
        if (m === "POST") {
          qualities.push({
            id: "q-new",
            qualityTier: body.qualityTier,
            qualityName: "بديل",
            price: body.price,
            costPrice: body.costPrice,
            stockQuantity: body.stockQuantity,
            isActive: body.isActive,
            isCurrent: false,
          });
          return send(r, { id: "q-new", qualities }, null, 201);
        }
        return send(r, qualities);
      }
      if (path === "/api/products/admin/p1/pricings")
        return send(r, [
          {
            supplierName: "مورد تسعير",
            price: 70,
            qualityName: "أصلي",
            pricedAt: "2026-10-20T12:00:00Z",
          },
        ]);
      if (path.endsWith("/pricings")) return send(r, []);
      if (path.endsWith("/qualities")) return send(r, []);
      if (path.startsWith("/api/products/admin/p1/variants")) {
        if (m === "POST") {
          const row = {
            id: "v1",
            variant_label: body.variantLabel,
            price: body.price,
            stock_quantity: body.stockQuantity,
            is_active: body.isActive,
          };
          p1.variants.push(row);
          return send(r, row, null, 201);
        }
        const row = p1.variants.find((x) => x.id === path.split("/").pop());
        if (m === "DELETE") {
          p1.variants = [];
          return send(r, {});
        }
        Object.assign(row, {
          price: body.price,
          variant_label: body.variantLabel,
        });
        return send(r, row);
      }
      if (path === "/api/reviews/admin") {
        if (m === "POST") {
          assert.deepEqual(Object.keys(body).sort(), [
            "comment",
            "orderNumber",
            "productId",
            "rating",
          ]);
          if (failReview) {
            failReview = false;
            return send(r, null, null, 422, "الطلب لا يحتوي على المنتج");
          }
          const row = {
            id: "review",
            reviewer_name: "عميل الطلب الحقيقي",
            rating: body.rating,
            comment: body.comment,
            status: "published",
          };
          reviews.push(row);
          return send(
            r,
            { ...row, productRating: 5, productReviewsCount: 1 },
            null,
            201,
          );
        }
        return send(r, reviews, {
          total: reviews.length,
          averageRating: reviews.length ? 5 : null,
          ratingCounts: { 5: reviews.length },
        });
      }
      if (path === "/api/orders/all") {
        assert.equal(q.get("source"), "service");
        return send(
          r,
          [
            {
              id: "order-service",
              services: [
                {
                  productId: "svc",
                  name: "طلب فحص فعلي",
                  quantity: 1,
                  car: { makeNameAr: "تويوتا" },
                },
              ],
              customer_name: "عميل خدمة",
              customer_phone: "0500000000",
              total: 150,
              status: "confirmed",
              display_status_label: "قيد التنفيذ",
              suppliers: [{ id: "centre", name: "المركز المسند" }],
            },
          ],
          { total: 1, statusCounts: { all: 1, confirmed: 1 } },
        );
      }
      if (path === "/api/orders/admin/order-service")
        return send(r, {
          id: "order-service",
          customer: { name: "عميل خدمة" },
          items: [
            {
              id: "item",
              source: "service",
              product_id: "svc",
              product_name: "طلب فحص فعلي",
              line_total: 150,
              quantity: 1,
              car: { makeNameAr: "تويوتا" },
              supplier: { name: "المركز المسند" },
            },
          ],
        });
      if (path === "/api/suppliers/admin/services")
        return send(r, [svc], { total: 1 });
      if (path === "/api/suppliers/admin/platform-services") {
        assert.equal(m, "POST");
        assert.ok(body.images[0].startsWith("https://"));
        assert.equal(body.aliases[0], "فحص جديد");
        assert.equal(body.cities[0], "جدة");
        assert.deepEqual(body.cars, [{ makeId: "make2", modelId: "model2" }]);
        assert.equal(body.isSpecialOffer, true);
        svc = {
          ...body,
          id: "svc-new",
          categoryId: "service-root",
          approvalStatus: "approved",
          isActive: true,
        };
        return send(r, svc, null, 201);
      }
      if (
        path === "/api/suppliers/admin/services/svc" ||
        path === "/api/suppliers/admin/services/svc-new"
      ) {
        if (m === "PATCH") {
          if (
            path.endsWith("/svc-new") &&
            Object.keys(body).length === 1 &&
            failInactive
          ) {
            failInactive = false;
            return send(r, null, null, 503, "تعذر تحديث الحالة مؤقتًا");
          }
          assert.equal(
            body.name,
            path.endsWith("/svc-new") ? "خدمة منصة جديدة" : "فحص بعد التعديل",
          );
          assert.equal(body.terms, undefined);
          assert.equal(body.workingHours, undefined);
          assert.equal(body.workshopAddress, undefined);
          Object.assign(svc, body);
        }
        return send(r, svc);
      }
      if (path.startsWith("/api/products/admin/")) {
        const id = path.split("/")[4],
          row = [...products, ...qualities].find((x) => x.id === id);
        if (path.endsWith("/status")) {
          row.is_active = body.isActive;
          return send(r, row);
        }
        if (m === "PUT") {
          update(row, body);
          Object.assign(row, body);
          return send(r, row);
        }
        assert.ok(row, "Unknown product " + path);
        return send(r, { ...row, qualities, variants: row.variants || [] });
      }
      if (path === "/api/suppliers/quality-tiers") return send(r, [{code:"original",name:"أصلي"},{code:"oem",name:"وكالة"},{code:"commercial",name:"تجاري"},{code:"japanese",name:"ياباني"}]);
      if (path === "/api/catalog-fields" && m === "GET") return send(r, []);
      throw new Error("Unexpected " + m + " " + path);
    });
    await c.route("https://api.cloudinary.com/**", (r) =>
      r.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          secure_url: "https://example.com/service-uploaded.png",
        }),
      }),
    );
    const base = process.env.TEST_BASE_URL || "http://127.0.0.1:5182";
    await p.goto(base + "/#products");
    await p.getByRole("button", { name: "إجراءات منتج أساسي" }).click();
    await p
      .getByRole("button", { name: "تعديل البيانات", exact: true })
      .click();
    await p.getByLabel("سعر التكلفة", { exact: true }).first().fill("65");
    await p.getByRole("switch", { name: "شحن مجاني", exact: true }).click();
    await p.getByRole("switch", { name: "عرض خاص", exact: true }).click();
    await p.getByRole("button", { name: "توليد", exact: true }).click();
    await p
      .getByRole("alert")
      .filter({ hasText: "التوليد غير متاح" })
      .waitFor();
    assert.equal(
      await p
        .getByRole("textbox", { name: "وصف المنتج", exact: true })
        .inputValue(),
      "",
    );
    await p.getByRole("button", { name: "توليد", exact: true }).click();
    await p.getByRole("status").filter({ hasText: "تم توليد الوصف" }).waitFor();
    assert.equal(
      await p
        .getByRole("textbox", { name: "وصف المنتج", exact: true })
        .inputValue(),
      "وصف مولد من البيانات الحقيقية",
    );
    await p.getByRole("button", { name: "حفظ", exact: true }).click();
    await p
      .getByRole("status")
      .filter({ hasText: "تم نشر المنتج على المنصة" })
      .waitFor();
    await p.getByRole("button", {name:"إجراءات منتج أساسي",exact:true}).click();
    await p.getByRole("button", {name:"تعديل البيانات",exact:true}).click();
    assert.equal(p1.cost_price, 65);
    assert.equal(p1.is_free_shipping, true);
    assert.equal(p1.is_special_offer, true);
    await p
      .getByRole("tab", { name: "المنتجات المرتبطة", exact: true })
      .click();
    await p
      .getByRole("button", { name: "ربط منتج للربط", exact: true })
      .click();
    await p
      .getByRole("button", { name: "حفظ المنتجات المرتبطة", exact: true })
      .click();
    await p
      .getByRole("alert")
      .filter({ hasText: "خطأ التحقق التجريبي" })
      .waitFor();
    assert.equal(related.length, 0);
    await p
      .getByRole("button", { name: "إزالة ارتباط منتج للربط", exact: true })
      .waitFor();
    await p
      .getByRole("button", { name: "حفظ المنتجات المرتبطة", exact: true })
      .click();
    await p
      .getByRole("status")
      .filter({ hasText: "تم حفظ المنتجات المرتبطة" })
      .waitFor();
    assert.equal(related[0].id, "p2");
    await p
      .getByRole("button", { name: "إزالة ارتباط منتج للربط", exact: true })
      .click();
    await p
      .getByRole("button", { name: "حفظ المنتجات المرتبطة", exact: true })
      .click();
    await p
      .getByRole("status")
      .filter({ hasText: "تم حفظ المنتجات المرتبطة" })
      .waitFor();
    assert.equal(related.length, 0);
    await p.getByRole("tab", { name: "التقييمات", exact: true }).click();
    await p.getByLabel("رقم الطلب*", { exact: true }).fill("ORD-1");
    await p.getByLabel("نص التقييم*", { exact: true }).fill("تقييم من العميل");
    await p.getByRole("button", { name: "إضافة التقييم", exact: true }).click();
    await p.getByRole("alert").filter({ hasText: "الطلب لا يحتوي" }).waitFor();
    assert.equal(
      await p.getByLabel("رقم الطلب*", { exact: true }).inputValue(),
      "ORD-1",
    );
    await p.getByRole("button", { name: "إضافة التقييم", exact: true }).click();
    await p.getByText("عميل الطلب الحقيقي", { exact: true }).waitFor();
    assert.equal(reviews.length, 1);
    await p.getByRole("tab", { name: "تفاصيل المنتج", exact: true }).click();
    const packs = p.locator("section").filter({
      has: p.getByRole("heading", {
        name: "أحجام العبوات وأسعارها",
        exact: true,
      }),
    });
    await packs.getByLabel("حجم العبوة", { exact: true }).fill("جالون");
    await packs.getByLabel("سعر البيع", { exact: true }).fill("50");
    await packs.getByLabel("كمية المخزون", { exact: true }).fill("8");
    await packs
      .getByRole("button", { name: "إضافة عبوة", exact: true })
      .click();
    await packs
      .getByRole("button", { name: "حفظ التعديلات", exact: true })
      .waitFor();
    assert.equal(p1.variants.length, 1);
    const existing = packs.locator("form").first();
    await existing.getByLabel("سعر البيع", { exact: true }).fill("55");
    await Promise.all([
      p.waitForResponse(
        (r) =>
          r.url().endsWith("/variants/v1") && r.request().method() === "PUT",
      ),
      existing
        .getByRole("button", { name: "حفظ التعديلات", exact: true })
        .click(),
    ]);
    await packs
      .getByRole("button", { name: "حفظ التعديلات", exact: true })
      .waitFor();
    assert.equal(p1.variants[0].price, 55);
    p.once("dialog", (d) => d.accept());
    await packs
      .getByRole("button", { name: "حذف العبوة", exact: true })
      .click();
    await packs
      .getByRole("button", { name: "حفظ التعديلات", exact: true })
      .waitFor({ state: "hidden" });
    assert.equal(p1.variants.length, 0);
    const other = p.locator("section").filter({
      has: p.getByRole("heading", { name: "الجودات الأخرى", exact: true }),
    });
    assert.equal(await p.getByLabel("الجودة", {exact:true}).locator('option[value="japanese"]').textContent(), "ياباني");
    assert.equal(await other.getByLabel("جودة إضافية", {exact:true}).locator('option[value="japanese"]').textContent(), "ياباني");
    await other.getByLabel("جودة إضافية", { exact: true }).selectOption("oem");
    await other.getByLabel("سعر البيع", { exact: true }).fill("80");
    await other.getByLabel("سعر التكلفة", { exact: true }).fill("50");
    await other.getByLabel("كمية المخزون", { exact: true }).fill("4");
    await other
      .getByRole("button", { name: "إضافة جودة", exact: true })
      .click();
    await other
      .getByRole("button", { name: "حفظ التعديلات", exact: true })
      .waitFor();
    assert.equal(qualities.length, 2);
    const siblingForm = other.locator("form").first();
    await siblingForm.getByLabel("سعر البيع", { exact: true }).fill("85");
    await Promise.all([
      p.waitForResponse((r) => r.url().endsWith("/q-new/status")),
      siblingForm
        .getByRole("button", { name: "حفظ التعديلات", exact: true })
        .click(),
    ]);
    await other
      .getByRole("button", { name: "حفظ التعديلات", exact: true })
      .waitFor();
    assert.equal(qualities[1].price, 85);
    await p
      .getByRole("button", { name: "العودة للمنتجات", exact: true })
      .click();
    await p.getByRole("button", { name: "إضافة منتج", exact: true }).click();
    await p.getByLabel("الإسم الأساسي*", { exact: true }).fill("منتج المنصة");
    await p.getByLabel("التصنيف الرئيسي", { exact: true }).selectOption("cat");
    await p.getByLabel("سعر البيع*", { exact: true }).fill("90");
    await p.getByRole("button", { name: "حفظ", exact: true }).click();
    await p
      .getByRole("status")
      .filter({ hasText: "تم نشر المنتج على المنصة" })
      .waitFor();
    assert.ok(products.some((x) => x.id === "created-platform"));
    const popupPromise = p.waitForEvent("popup");
    await p.getByRole("button", { name: "تصدير PDF" }).click();
    const popup = await popupPromise;
    await popup.getByRole("heading", { name: "تقرير المنتجات" }).waitFor();
    assert.equal(await popup.locator("table tr").count(), 4);
    await popup.close();
    await p.getByRole("button", { name: "استيراد XLS", exact: true }).click();
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      book,
      XLSX.utils.aoa_to_sheet([
        ["اسم المنتج", "السعر"],
        ["منتج استيراد", 100],
      ]),
      "المنتجات",
    );
    await p.getByLabel("ملف Excel", { exact: true }).setInputFiles({
      name: "platform.xlsx",
      mimeType: "application/octet-stream",
      buffer: XLSX.write(book, { type: "buffer", bookType: "xlsx" }),
    });
    await p.getByRole("button", { name: "فحص الملف", exact: true }).click();
    await p
      .getByRole("status")
      .filter({ hasText: "اكتمل فحص الملف" })
      .waitFor();
    await p
      .getByRole("button", { name: "استيراد الصفوف السليمة (1)", exact: true })
      .click();
    await p
      .getByRole("status")
      .filter({ hasText: "اكتمل الاستيراد." })
      .waitFor();
    assert.equal(imported, 1);
    await p.getByRole("button", { name: "إغلاق", exact: true }).click();
    await p.locator(".pp-category").nth(3).click();
    await p.getByRole("cell", { name: "طلب فحص فعلي", exact: true }).waitFor();
    await p.getByRole("cell", { name: "تويوتا", exact: true }).waitFor();
    await p.getByRole("cell", { name: "المركز المسند", exact: true }).waitFor();
    assert.equal(
      await p.getByRole("button", { name: "عميل خدمة", exact: true }).count(),
      1,
    );
    await p.getByRole("tab", { name: "كتالوج الخدمات", exact: true }).click();
    await p.getByRole("button", {name:"إجراءات فحص موثق",exact:true}).click();
    await p.getByRole("menuitem", { name: "تعديل الخدمة", exact: true }).click();
    await p
      .getByLabel("الإسم الأساسي", { exact: true })
      .fill("فحص بعد التعديل");
    await p.evaluate(() => Object.defineProperty(navigator, "clipboard", {configurable:true,value:{writeText: async (value) => {window.__copiedService = value;}}}));
    await p.getByRole("button",{name:"نسخ رابط الخدمة",exact:true}).click();
    await p.getByRole("status").filter({hasText:"تم نسخ رابط الخدمة"}).waitFor();
    assert.equal(await p.evaluate(() => window.__copiedService), "https://mypart.com.sa/#/service/svc");
    assert.equal(await p.getByLabel("خط العرض", { exact: true }).count(), 0);
    assert.equal(
      await p.getByLabel("مدة الخدمة بالدقائق", { exact: true }).count(),
      0,
    );
    assert.equal(
      await p.getByLabel("الشركة", { exact: true }).inputValue(),
      "make",
    );
    assert.equal(
      await p.getByLabel("السيارة", { exact: true }).inputValue(),
      "model",
    );
    assert.equal(
      await p
        .getByRole("switch", { name: "عرض خاص", exact: true })
        .getAttribute("aria-checked"),
      "true",
    );
    await p.getByRole("switch", { name: "عرض خاص", exact: true }).click();
    assert.equal(
      await p
        .getByRole("switch", { name: "شحن مجاني", exact: true })
        .isDisabled(),
      true,
    );
    const mainBox = await p.locator(".pp-editor-body").boundingBox(),
      asideBox = await p.locator(".pp-editor-aside").boundingBox();
    assert.ok(asideBox.x < mainBox.x, "reference preview stays on the left");
    await p.screenshot({
      path: "/tmp/service-restored-desktop.png",
      fullPage: true,
    });
    await p.getByRole("button", { name: "حفظ الخدمة", exact: true }).click();
    await p
      .getByRole("status")
      .filter({ hasText: "تم حفظ الخدمة على الخادم" })
      .waitFor();
    assert.equal(svc.name, "فحص بعد التعديل");
    assert.deepEqual(svc.cars, [
      { makeId: "make", modelId: "model", yearFrom: 2018, yearTo: 2023 },
    ]);
    assert.equal(svc.isSpecialOffer, false);
    assert.equal(
      calls
        .filter(
          (x) =>
            x.path === "/api/suppliers/admin/services/svc" && x.m === "PATCH",
        )
        .at(-1).body.isFreeShipping,
      undefined,
    );
    await p.getByRole("button", { name: "إضافة سيارة", exact: true }).click();
    await p.getByLabel("الشركة", { exact: true }).nth(1).selectOption("make2");
    await p
      .getByLabel("السيارة", { exact: true })
      .nth(1)
      .selectOption("model2");
    await p.getByRole("button", { name: "حفظ الخدمة", exact: true }).click();
    await p
      .getByRole("status")
      .filter({ hasText: "تم حفظ الخدمة على الخادم" })
      .waitFor();
    assert.equal(svc.cars.length, 2);
    assert.equal(svc.cars[1].modelId, "model2");
    await p
      .getByRole("button", { name: "حذف سيارة الخدمة", exact: true })
      .nth(1)
      .click();
    await p
      .getByRole("button", { name: "حذف سيارة الخدمة", exact: true })
      .click();
    await p.getByRole("button", { name: "حفظ الخدمة", exact: true }).click();
    await p
      .getByRole("status")
      .filter({ hasText: "تم حفظ الخدمة على الخادم" })
      .waitFor();
    assert.deepEqual(svc.cars, []);
    assert.equal(svc.terms, "شروط محفوظة");
    assert.equal(svc.workshopAddress, "عنوان محفوظ");
    assert.ok(
      calls.some(
        (x) =>
          x.path === "/api/suppliers/admin/services/svc" && x.m === "PATCH",
      ),
    );
    assert.equal(
      calls.some((x) => x.path === "/api/products/admin/svc"),
      false,
    );
    await p
      .getByRole("button", { name: "العودة للخدمات", exact: true })
      .click();
    await p.getByRole("button", { name: "إضافة خدمة", exact: true }).click();
    await p
      .getByLabel("الإسم الأساسي", { exact: true })
      .fill("خدمة منصة جديدة");
    await p.getByLabel("الوصف", { exact: true }).fill("خدمة جديدة موثقة");
    await p.getByLabel("السعر", { exact: true }).fill("120");
    await p.getByLabel("الشركة", { exact: true }).selectOption("make2");
    await p.getByLabel("السيارة", { exact: true }).selectOption("model2");
    await p.getByRole("switch", { name: "عرض خاص", exact: true }).click();
    await p
      .getByLabel("التصنيف الفرعي", { exact: true })
      .selectOption("service-sub");
    await p.getByLabel("أسماء ثانوية", { exact: true }).fill("فحص جديد");
    await p.getByLabel("أسماء ثانوية", { exact: true }).press("Enter");
    await p.getByLabel("المدن المتاحة للخدمة", { exact: true }).fill("جدة");
    await p.getByLabel("المدن المتاحة للخدمة", { exact: true }).press("Enter");
    await p.locator("input[type=file]").setInputFiles({
      name: "photo.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX7kAAAAASUVORK5CYII=",
        "base64",
      ),
    });
    await p.locator(".pp-thumbnails img").waitFor();
    await p.getByRole("switch", { name: "الحالة", exact: true }).click();
    await p.getByRole("button", { name: "حفظ الخدمة", exact: true }).click();
    await p
      .getByRole("alert")
      .filter({ hasText: "تم إنشاء الخدمة لكن لم يكتمل تحديث حالتها" })
      .waitFor();
    assert.equal(
      await p
        .getByRole("button", { name: "حفظ الخدمة", exact: true })
        .isEnabled(),
      true,
    );
    await p.getByRole("button", { name: "حفظ الخدمة", exact: true }).click();
    await p
      .getByRole("status")
      .filter({ hasText: "تم حفظ الخدمة على الخادم" })
      .waitFor();
    assert.equal(svc.id, "svc-new");
    assert.equal(svc.isActive, false);
    assert.equal(
      calls.filter(
        (x) =>
          x.path === "/api/suppliers/admin/platform-services" && x.m === "POST",
      ).length,
      1,
    );
    await p.setViewportSize({ width: 390, height: 844 });
    assert.equal(
      await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    await p.screenshot({
      path: "/tmp/product-new-service-mobile.png",
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    console.log(
      "PASS new API: product fields, AI failure/retry, related atomic save/clear/failure retention, verified-order reviews, variants CRUD, additional quality, default platform creation, full export, service-order customer/car/centre, separate catalogue and service PATCH, mobile.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
