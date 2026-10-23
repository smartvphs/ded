# UI restoration — 2026-10-23

The user rejected the visual changes in 8022354. Settings, support list/details, supplier ticket details, order cost table and financial report were restored to their pre-update JSX and CSS. The extra settings tab, generic settings form, support management panel/assignee filter, manual-cost action column and missing-cost report section were removed. Existing original icons, field arrangement, seven settings tabs and shared layout were restored.

The newly added backend workflows depended on these rejected controls and are no longer exposed. In particular, settings is back to the original local-only implementation: its original save handler does not persist to the server. Do not report settings or the newly added support/cost actions as integrated. Reconnecting them requires mapping the original design controls to the official contracts without redesigning the page. Existing pre-update integrations elsewhere remain in place. The nonvisual order-cost save readback verification is retained.

The audit and backend request from 8022354 describe available/missing API contracts, but their claim that the new frontend workflows are completed is superseded by this restoration note. No new UI has been designed in this restoration.
