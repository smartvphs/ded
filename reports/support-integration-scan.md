# Support tickets integration — 2026-10-22

Contract: latest supplied Car Parts — Admin API.postman_collection.json, Support Tickets and Uploads.

## Connected

- GET /api/support-tickets/admin: backend search (ticket/subject/name/phone), source customer/supplier, priority low/normal/high/urgent, category, Saudi-day date range, status, limit/offset. Items/total/countsByStatus are read from data, not an invented meta shape.
- Actual status counts: open/in_progress/resolved/closed. All count sums backend groups; total remains the filtered server total. The UI explains the documented fact that status counts ignore category filtering.
- GET /api/support-tickets/admin/:id: real description, category label, order number, priority, source/identity/contact, dates, ticket attachments and message thread. No fake purchase/order totals, assignee, response-time values or sample conversations.
- POST /api/support-tickets/admin/:id/reply: actual text plus uploaded attachment URLs. Incoming/outgoing messages use server IDs, sender_name, is_staff, body, timestamps and attachment URLs. Success requires the exact saved message ID/body/attachments to appear in a subsequent GET. If GET confirmation fails, retry reads only and does not repeat POST. Unknown/malformed POST outcomes lock blind resubmission for that ticket during the page session, including switching away/back.
- GET /api/uploads/signature?type=tickets&strictFormats=true: direct signed Cloudinary image upload, all signed parameters included. JPG/PNG/WebP at most 5 MB per image; validate before upload, retain already uploaded attachments if later uploads fail, remove draft attachments, expose upload errors/retry. No admin bearer is sent to Cloudinary.
- PATCH /api/support-tickets/admin/:id/status: actual canonical statuses, explicit confirmation, subsequent GET verification, confirmation retry without repeat PATCH. Close and reopen use closed/in_progress. Reply UI on a closed ticket requires reopening first.
- Real HTTPS ticket/message attachments open their actual URLs. No simulated attachment preview.
- #support deep link, sidebar return, loading/error/retry/empty/403 handling, desktop/mobile layout.

## Backend gaps (asked during implementation)

The supplied Support Tickets section documents only list, detail, reply and status update. The old UI simulated these additional operations without API routes:

1. Assign/unassign an employee (including permitted assignee lookup and saved assignee fields).
2. Update priority/escalate to supervisor.
3. Add/read internal notes, with a clear flag ensuring they are not public replies.
4. Delete a ticket (and its deletion semantics).
5. List/create/update/delete issue types, including accepted category codes/names and references in tickets.

These controls are visibly disabled, never reported as saved. The types page displays only actual categories observed in loaded ticket rows and explicitly does not claim to be a complete official catalog. No invented endpoints are called.

## Validation and limits

- 67 native tests pass, including support request shapes/canonical statuses, filter/pagination construction, attachment URL validation and message readback verification.
- Chromium contract integration passes list errors/retry, filters/counts/paging, real detail/attachments, invalid image rejection, signed upload error/retry, reply 422 and GET confirmation retry without duplicate POST, status confirmation/close/reopen, unknown reply lock across selection, disabled unsupported operations, source/category/priority/date filters, 403, mobile and no JavaScript errors.
- Production build passes.
- Browser integration uses mocked contract responses and a test-only session. No real ticket was replied to, changed or deleted during testing. Live authenticated backend enforcement/response behavior remains to be verified with a real authorized account.
