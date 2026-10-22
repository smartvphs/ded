# Coupons integration — 2026-10-22

Contract: Car Parts — Admin API.postman_collection (5).json, Coupons and Coupon usage report.

## Connected

- GET /api/coupons: backend search, active/inactive filter, documented validity=valid filter, paymentMethod, limit/offset, meta.total. All row states (valid/scheduled/expired/exhausted/inactive) display from the backend.
- meta.metrics supplies total/active/valid coupons, total uses, orders with coupons, total discount and average discount. Remaining uses/progress only derive from actual max_uses/used_count; null limits remain unlimited and absent metrics are not shown as zero.
- POST /api/coupons: code, discountType (percentage/fixed), value, maxUses, minOrderValue, startsAt, expiresAt and isActive. Empty optional fields are omitted on create. Percentages, dates, money and usage limits are validated.
- PATCH /api/coupons/:id: only changed documented fields are sent. Null explicitly clears documented optional limits/dates. Unchanged timestamp precision is retained; entered date/time is explicitly Saudi time, converted to UTC for the API.
- Activation/deactivation uses PATCH isActive, then GET verifies the persisted status. Displayed checkbox does not fake a successful local change.
- DELETE /api/coupons/:id: used coupons are disabled for deletion with an explanation to deactivate them. Server 409 remains visible. A successful delete requires acknowledgement and confirmed absence from the list. After uncertain delete, retry performs verification rather than blindly repeating DELETE.
- POST /api/coupons/:id/duplicate: new code plus isActive, new ID and zero usage verified, documented settings checked against the source. Clipboard copy remains a separate local action.
- Save/readback uses the documented list with search/paging, never an invented GET /coupons/:id. A known successful write followed by failed readback retries only GET. Unknown create/duplicate outcomes block resubmission.
- GET /api/admin/reports/coupons: actual usage report, date range, totals and per-coupon order/customer counts, discount and sales. Permissions reports.view/accounting.view enforced by server and UI. No list-row sums substitute for report totals.
- GET /api/admin/me: only super admin/catalog.manage/coupons.manage can mutate. Accounting readers can view/report. No fake success for denied requests.
- #coupons deep link, sidebar return, auth expiry, loading/error/retry/empty, clipboard and mobile layout connected.

## Pending backend clarification (asked during this task)

The collection returns `description`, `max_discount` and `payment_methods` but does not document their create/update request keys, accepted values or clearing semantics. These fields display the actual saved values and remain read-only. They are not sent using guessed camelCase keys.

Requested from backend:

1. Request keys and create/PATCH JSON examples for description, maximum discount and allowed payment methods.
2. Official allowed payment-method codes for the coupon restriction.
3. Values to clear description/max discount and permit all payment methods.

The user requested this forwarding text; it has been provided. Other documented operations are completed independently.

## Validation and limits

- 60 native tests pass, including Saudi-time conversion, unchanged timestamp preservation, partial PATCH shapes, clearing optional fields, omitted unsupported fields and readback verification.
- Chromium contract integration passes backend filters/paging/metrics, clipboard, partial edit, read-only pending fields, status, create/duplicate/delete readback retry without repeat writes, 409 errors, uncertain POST lock, ignored-save detection, report dates/values, read-only/403 access, mobile sidebar placement and no JavaScript errors.
- Production build passes.
- Browser tests use mocked responses matching the supplied contract and a test-only token. No real coupon/order was created, changed, applied or deleted while testing. Live backend validation needs an authenticated admin session.
