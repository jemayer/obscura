---
# comagen-mruq
title: Watch mode (npm run dev)
status: completed
type: task
priority: normal
created_at: 2026-02-27T21:57:09Z
updated_at: 2026-02-27T21:57:09Z
parent: comagen-7f5h
---

Implement watch mode that monitors content/, config/, and themes/ for changes and triggers a rebuild. Use chokidar or Node.js fs.watch. For image changes, only reprocess the changed image. For template/config changes, full rebuild. Serve dist/ via a local HTTP server with live reload.
