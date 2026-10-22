# Notifications integration — 2026-10-22

Contract: Notifications section of the latest supplied Admin API collection, plus the user's populated GET /api/admin/notifications response (items, unreadCount, meta.total/limit/offset, title/body/type, is_read, created_at, Saudi group/date and link).

## Connected

- GET /api/admin/notifications with limit=30, offset, unread=true and the documented order/pricing/offer/promo/system type filters. Server total drives pagination; global unreadCount drives the heading and header badge. No fixture notifications or invented counts remain.
- Today/yesterday/earlier groups use the backend group; timestamps render in Asia/Riyadh. Empty/loading/error/retry/403/session expiry are explicit.
- PATCH /api/notifications/:id/read and /read-all, DELETE /api/notifications/:id and /all. Individual and bulk deletion require confirmation. Bulk confirmation explains that all account notifications are affected, including filtered-out rows.
- After writes, unfiltered GET verifies read state, absence, global unreadCount or total as appropriate. Paging is traversed for individual verification. If the write may have succeeded but readback fails, other writes are blocked and retry performs GET only. No duplicate mutation on verification retry; no success inferred from local state alone.
- Header bell opens notifications and shows its own authenticated unread count. Refresh on focus, confirmed mutations and every 60 seconds while visible. Page supports manual refresh and focus refresh; this is not a WebSocket/push subscription.
- Safe link dispatch uses the documented link entity and actual IDs, with no arbitrary URL navigation: order and return details, pricing request details, support ticket, product preview (all IDs retained with product selection), service details, supplier details, contact message details, price-list details and server-paged rows. Missing/unknown links do not produce invented destinations. Target permissions remain enforced by backend; errors/404/403 display normally.
- #notifications URL and sidebar/header return are wired. Existing detail components remain responsible for their own actions; no fabricated target records.

## Validation and limits

- 74 native tests pass; production build and git diff --check pass.
- Chromium contract test passes server paging/filtering, individual read with failed GET and retry without duplicate PATCH, actual pricing/product target requests, product switching, bulk read, unread filter, confirmed deletion, global deletion from a type-filtered list, 403, desktop/mobile rendering and no JavaScript errors.
- Browser responses and session are mocked. Supplied real GET response confirms the item schema, but no real authenticated read/delete mutations were performed. Live endpoint acknowledgements and permissions still need verification with an authorized admin account. No real notifications were changed or removed during testing.
- No additional backend endpoint is required for the documented notification-list/read/delete/deep-link scope. Realtime push delivery is not represented as tested or implemented by these REST routes.
