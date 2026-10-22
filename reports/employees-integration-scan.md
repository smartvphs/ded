# Employees integration scan — 2026-10-22

Contract: Car Parts — Admin API.postman_collection (5).json, Staff & Permissions and Auth & Account.

## Connected

- GET /api/admin/me: fresh super-admin status and current account identifier. The documented staff administration routes require a super admin. Server access denials remain visible; actions are not simulated.
- GET /api/admin/staff: backend search by name/email, status filter (active/inactive/deleted), limit/offset and real status counts. No fixture employees remain.
- GET /api/admin/permissions: official grouped keys, labels, sensitive markers, and meta.matrix for read/write/delete. Shared permission keys update all linked cells. Unsupported/super-admin-only cells are disabled. Previously stored keys absent from the catalog are retained, never silently discarded.
- POST /api/admin/staff: name, email, initial password, explicitly selected permissions. No permissions granted by default. Requested inactive status is saved separately through the documented status endpoint; retries retain the new ID to avoid duplicate creation.
- PATCH /api/admin/staff/:id: documented name/email only; duplicate-email and validation errors remain server errors.
- PATCH /api/admin/staff/:id/permissions: replaces the complete selected key list on explicit save. Readback confirms the complete set. Successful write plus failed verification retries only the read.
- PATCH /api/admin/staff/:id/status: real activation/deactivation, followed by readback. Current account cannot deactivate itself through this UI.
- POST /api/admin/staff/:id/reset-password: actual staff-only operation, response changed=true required. Unknown network/server outcomes disable blind resubmission. Passwords are not stored in localStorage.
- DELETE /api/admin/staff/:id: permanent deactivation, verified through status=deleted and deletedAt. Super-admin/current/deleted account deletion disabled; deleted accounts cannot be edited.
- GET /api/admin/audit-log: per-actor activity, action and date filters, backend paging, actual record details/IP/entity identifiers. Read only.
- Employee detail and write verification use the documented unpaginated staff list; no nonexistent GET /staff/:id was invented.
- Employee deep link #employees, sidebar return, auth expiry, loading/error/empty/retry states connected.

## Validation and limits

- 53 native tests pass, including staff request shapes, official/unknown permission handling and persisted value verification.
- Chromium contract integration covers backend search/paging, protected admin actions, shared keys, permission readback retry without repeat PATCH, name/email edit, status, password validation/reset, inactive creation retry without duplicate POST, deletion and disabled deleted actions, uncertain password result lock, 403 handling, mobile and JavaScript errors.
- Production build passes.
- Browser tests use mocked documented API responses and a test-only token. There is no authenticated production admin session in this environment. No real employee was created, changed, deleted or messaged for testing.
- No additional backend endpoint is needed for the documented staff page operations. Real account testing remains necessary to verify the deployed backend responses and enforcement.
