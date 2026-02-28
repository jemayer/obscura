---
# comagen-wvfv
title: Ideation for a command line tool to handle sidecar YAMLs
status: draft
type: task
priority: normal
created_at: 2026-02-28T22:11:42Z
updated_at: 2026-02-28T22:16:25Z
---

This is an ideation ticket.

Current situation: When adding multiple pictures in batches, only some
information can be extracted from their EXIFs. This leads to missing titles,
captions, locations and tags for many of them. Right now, the only possibility
is to manually edit every sidecar YAML, which is a painful process.

Idea: Would it be possible to implement a CLI tool that helps to manage the
sidecar files with an UX friendly interface? Ideally, this CLI tool would be
able to display the corresponding picture(s) within the terminal.

Open questions:
- How to batch the edits best?
- Which files to edit, which files not to edit?
- Do we need filters, i.e., let me edit everything with an empty location?
- This should work only per current directory, right?

And additional ideas, questions or remarks should be raised when working on this
ideation/discovery.
