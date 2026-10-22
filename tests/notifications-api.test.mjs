import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const source = await readFile(
  new URL("../src/notifications-api.js", import.meta.url),
  "utf8",
);
const { readNotifications, notificationTarget, notificationTime } =
  await import(
    "data:text/javascript;base64," + Buffer.from(source).toString("base64")
  );
test("notifications preserve authoritative total, global unread count and read state", () => {
  const row = { id: "n", is_read: false, group: "today" };
  assert.deepEqual(
    readNotifications({
      data: { items: [row], unreadCount: 152 },
      meta: { total: 152 },
    }),
    { items: [row], unread: 152, total: 152 },
  );
  assert.throws(() =>
    readNotifications({
      data: { items: [], unreadCount: null },
      meta: { total: 0 },
    }),
  );
  assert.throws(() =>
    readNotifications({
      data: { items: [{ id: "n" }], unreadCount: 1 },
      meta: { total: 1 },
    }),
  );
});
test("notification deep links accept only documented entities and preserve all product IDs", () => {
  assert.deepEqual(
    notificationTarget({
      link: { entity: "pricing_request", id: "request-1" },
    }),
    { entity: "pricing_request", id: "request-1" },
  );
  assert.deepEqual(
    notificationTarget({
      link: { entity: "products", ids: ["p1", "p2", "p1", null] },
    }),
    { entity: "products", ids: ["p1", "p2"] },
  );
  assert.equal(
    notificationTarget({ link: { entity: "https://evil.test", id: "x" } }),
    null,
  );
  assert.equal(
    notificationTarget({ data: { url: "javascript:alert(1)" } }),
    null,
  );
});
test("notification dates display the Saudi local day", () => {
  assert.match(notificationTime("2026-10-21T22:29:59.943Z"), /٢٢/);
  assert.equal(notificationTime("invalid"), "—");
});
