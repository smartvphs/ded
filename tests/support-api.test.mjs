import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const source = (
  await readFile(new URL("../src/support-api.js", import.meta.url), "utf8")
).replace(
  /import\s+\{[^}]+\}\s+from\s+['"]\.\/admin-api['"];?/,
  `const adminRequest=(...a)=>globalThis.ticketRequest(...a);const queryString=v=>new URLSearchParams(Object.entries(v).filter(([,x])=>x!==undefined&&x!==null&&x!=='')).toString();`,
);
const {
  ticketsPath,
  ticketStatusBody,
  ticketReplyBody,
  readTicket,
  verifyTicketReply,
  attachmentRows,
} = await import(
  "data:text/javascript;base64," + Buffer.from(source).toString("base64")
);
test("ticket filters and pagination go to server with canonical statuses and supplier source", () => {
  const q = new URL(
    ticketsPath({
      search: " 05 ",
      status: "in_progress",
      source: "supplier",
      priority: "urgent",
      category: "technical",
      from: "2026-10-01",
      to: "2026-10-22",
      page: 2,
    }),
    "https://test.local",
  ).searchParams;
  assert.equal(q.get("search"), "05");
  assert.equal(q.get("offset"), "7");
  assert.equal(q.get("source"), "supplier");
  assert.equal(q.get("status"), "in_progress");
  assert.equal(q.get("category"), "technical");
  assert.equal(q.get("from"), "2026-10-01");
  assert.deepEqual(ticketStatusBody("resolved"), { status: "resolved" });
  assert.throws(() => ticketStatusBody("processing"));
});
test("reply sends actual uploaded URLs and rejects empty text or local/insecure attachment data", () => {
  const url = "https://res.cloudinary.com/test/image/upload/photo.png";
  assert.deepEqual(ticketReplyBody(" رد ", [{ url, name: "photo" }]), {
    body: "رد",
    attachments: [url],
  });
  assert.throws(() => ticketReplyBody("  "));
  assert.throws(() => ticketReplyBody("reply", ["data:image/png;base64,abc"]));
  assert.throws(() =>
    ticketReplyBody("reply", ["https://example.com/asset.png"]),
  );
});
test("readback requires saved message identity, staff flag, body and every attachment", async () => {
  const expected = {
    body: "رد",
    attachments: ["https://res.cloudinary.com/test/image/upload/photo.png"],
  };
  globalThis.ticketRequest = async () => ({
    data: {
      id: "ticket",
      messages: [{ id: "message", is_staff: true, ...expected }],
    },
  });
  const row = await readTicket("ticket");
  verifyTicketReply(row, "message", expected);
  assert.throws(() => verifyTicketReply(row, "different", expected));
  assert.throws(() =>
    verifyTicketReply(row, "message", { ...expected, body: "different" }),
  );
  assert.throws(() =>
    verifyTicketReply(
      {
        ...row,
        messages: [
          { id: "message", is_staff: true, body: "رد", attachments: [] },
        ],
      },
      "message",
      expected,
    ),
  );
  await assert.rejects(readTicket("other"));
});
test("incoming attachments display real HTTPS files and omit invalid links", () => {
  const rows = attachmentRows([
    "javascript:alert(1)",
    { url: "https://res.cloudinary.com/test/image/upload/a.png", name: "صورة" },
    {
      url: "https://res.cloudinary.com/test/raw/upload/invoice.pdf",
      name: "فاتورة",
    },
    null,
  ]);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].image, true);
  assert.equal(rows[1].name, "فاتورة");
});
