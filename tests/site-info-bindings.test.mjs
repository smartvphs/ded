import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const source = (
  await readFile(
    new URL("../src/site-info-bindings.js", import.meta.url),
    "utf8",
  )
).replace(/import[^;]+;/, "");
const { siteRows, siteBody, containsValues } = await import(
  "data:text/javascript;base64," + Buffer.from(source).toString("base64")
);
const base = {
  contact: {
    phones: [{ label: "الدعم", number: "+9661" }],
    emails: [{ label: "الدعم", email: "old@example.com" }],
    warehouse: { name: "رئيسي", address: "قديم", lat: 24, lng: 46 },
    location: { mapUrl: "https://maps.google.com", lat: 24, lng: 46 },
    socials: {
      x: "https://x.com/example",
      tiktok: "https://tiktok.com/example",
    },
  },
  workingHours: {
    days: ["sat", "sun", "mon", "tue", "wed", "thu", "fri"].map((day) => ({
      day,
      isOpen: false,
    })),
    holidays: [{ date: "2026-12-01", name: "إجازة" }],
    isOpenNow: false,
    todayHoliday: null,
  },
  pricingTypes: {
    free: { title: "مجاني", titleEn: "Free", description: "قديم" },
    normal: { title: "عادي", description: "لا يتغير" },
  },
};
test("site sections replace whole while preserving unseen contact fields and translations", () => {
  const result = siteBody(base, {
    __site_phones: ["+9662"],
    __site_warehouse: "جديد",
    __site_description_free: "نص جديد",
  });
  assert.deepEqual(result.contact.phones, [
    { label: "الدعم", number: "+9662" },
  ]);
  assert.equal(result.contact.warehouse.name, "رئيسي");
  assert.equal(result.contact.warehouse.lat, 24);
  assert.deepEqual(result.contact.location, base.contact.location);
  assert.equal(result.contact.socials.tiktok, base.contact.socials.tiktok);
  assert.equal(result.pricingTypes.free.titleEn, "Free");
  assert.equal(result.pricingTypes.normal.description, "لا يتغير");
  assert.equal(base.pricingTypes.free.description, "قديم");
});
test("workday order converts correctly, preserves holidays and omits response-only keys", () => {
  const rows = siteRows({ data: base }),
    days = rows.find((x) => x.key === "__site_hours").value;
  days[4] = { ...days[4], enabled: true, from: "16:00", to: "02:00" };
  const result = siteBody(base, { __site_hours: days });
  assert.deepEqual(
    result.workingHours.days.find((x) => x.day === "thu"),
    { day: "thu", isOpen: true, from: "16:00", to: "02:00" },
  );
  assert.deepEqual(result.workingHours.holidays, base.workingHours.holidays);
  assert.equal(Object.hasOwn(result.workingHours, "isOpenNow"), false);
  assert.equal(
    containsValues(
      { ...result, workingHours: { ...result.workingHours, isOpenNow: true } },
      result,
    ),
    true,
  );
  assert.throws(() => siteRows({ data: { contact: null } }));
});
