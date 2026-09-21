# AI Design Log

A running record of the prompts, decisions and trade-offs behind this project (kept for traceability).

## Log
| When | Area | Decision | Why |
|---|---|---|---|
| Phase 0 | Backend | FastAPI instead of Node | Model is Python/ONNX, avoids a second service |
| Phase 0 | Process | Auth, Highlight.io and deploy come last | Get the core ML flow working first |
