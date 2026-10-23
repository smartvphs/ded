# UI restoration — 2026-10-23

The user rejected the visual changes in 8022354. Settings, support list/details, supplier ticket details, order cost table and financial report were restored to their pre-update JSX and CSS. The extra settings tab, generic settings form, support management panel/assignee filter, manual-cost action column and missing-cost report section were removed. Existing original icons, field arrangement, seven settings tabs and shared layout were restored.

The newly added backend workflows depended on these rejected controls and are no longer exposed. In particular, settings is back to the original local-only implementation: its original save handler does not persist to the server. Do not report settings or the newly added support/cost actions as integrated. Reconnecting them requires mapping the original design controls to the official contracts without redesigning the page. Existing pre-update integrations elsewhere remain in place. The nonvisual order-cost save readback verification is retained.

The audit and backend request from 8022354 describe available/missing API contracts, but their claim that the new frontend workflows are completed is superseded by this restoration note. No new UI has been designed in this restoration.

## Subsequent user request

The user then requested integration on the original UI. Settings is now connected without changing its seven-tab layout, artwork or stylesheet; see settings-original-ui-integration-2026-10-23.md for exact coverage and remaining contract clarifications. The restoration status of the separate support/cost additions remains unchanged.

## Subsequent completion of support/cost controls

The user explicitly requested frontend integration within the restored design. Ticket assignment/priority/internal notes/deletion and manual/missing costs are now connected through existing controls and matching dialogs, without a management panel, additional order columns or a permanent financial table. See ticket-cost-controls-integration-2026-10-23.md.
