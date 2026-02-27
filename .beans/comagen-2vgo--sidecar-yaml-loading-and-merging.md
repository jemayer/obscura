---
# comagen-2vgo
title: Sidecar YAML loading and merging
status: todo
type: task
priority: high
created_at: 2026-02-27T21:55:55Z
updated_at: 2026-02-27T21:58:05Z
parent: comagen-4mko
blocking:
    - comagen-byng
---

Load sidecar YAML files and merge them with EXIF data. Sidecar values win on conflict. Return a unified Photo metadata object. Handle missing sidecars gracefully (EXIF-only is valid).
