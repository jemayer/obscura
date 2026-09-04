# ADR-016: Longest-Side Cap on Generated Image Variants

- **Date:** 2026-09-04
- **Status:** Accepted

## Context

The image pipeline generated variants at each configured breakpoint (default
`[400, 800, 1200, 2400]`), skipping breakpoints wider than the source, plus a
full-size passthrough when the source was wider than *every* breakpoint. That
had three problems.

**Resolution was discarded.** The passthrough only fired above the largest
breakpoint, so a 2048x1365 source was capped at 1200px wide — on a 2x HiDPI
display that covers only 600 CSS px of layout. Worse, portraits are gated on
*width*: a 683x2048 source matched only the 400px breakpoint and got a single
srcset entry, despite carrying 2048px of vertical detail.

**There was no upper bound.** When the passthrough did fire it emitted the
source with no resize at all, so a 6000px original became a 6000px WebP. No
maximum existed anywhere in config or validation.

**Small sources rendered as nothing.** A source narrower than the smallest
breakpoint had every breakpoint skipped and no passthrough, producing an empty
variant list. `bestVariant` returned `undefined` and the call sites returned an
empty string — the photo was silently omitted, with no warning and no error.

## Decision

Introduce `images.max_dimension` (default 2400), a cap on the **longest side**
of any generated variant, and apply it *before* breakpoints:

1. Compute an effective source size by scaling the source so its longest side
   fits the cap. Never enlarge — the scale factor is clamped to 1.
2. Run the existing width-based breakpoint logic against that effective width.
3. If the widest generated variant is still narrower than the effective width,
   emit one additional variant at the effective width.

Three properties fall out of ordering it this way:

- **Filenames stay honest.** Every breakpoint variant is still exactly `b`
  pixels wide, so `-1200w.webp` really is 1200px wide. Box-fitting each
  breakpoint individually would produce an 800px-wide `-1200w.webp`.
- **The cap is provably respected.** The effective size already fits the box, so
  any width-downscale from it keeps both dimensions within the cap.
- **No separate "skip breakpoints above the cap" rule is needed.** Breakpoints
  gate on the effective width, which is already within the cap.

Step 3 also fixes the small-source case: with no breakpoints applicable the
widest generated variant is zero, so one native-size variant is emitted and the
photo renders. The build warns when this happens so the author knows the source
is low-resolution.

## Why the longest side

A width-only cap treats orientations unequally. At 2400 wide, a 2:3 portrait is
2400x3600 (8.6 MP) against a landscape's 2400x1600 (3.8 MP) — and any full-frame
camera held in portrait produces 4000x6000, so this is the common case rather
than a corner case. Capping the longest side keeps the pixel budget comparable
across orientations.

The accepted trade-off is that portraits get 1600px of width rather than 2400,
carrying less horizontal detail in a width-driven layout. Portraits are
displayed narrower anyway.

## Alternatives considered

**Longest-side *skip* logic** — changing the breakpoint gate to compare against
`max(width, height)` while keeping width-based resizing. Verified empirically on
a 683x2048 source: `withoutEnlargement` clamps everything back to the source
width, so breakpoints 800 and 1200 both emit an identical 683x2048 file under
different names, and the srcset carries `683w` twice. Adding `fit: 'inside'` to
compensate makes variants *narrower* than today (133x400, 267x800, 400x1200),
which shrinks every option in a width-driven layout. Width semantics for
breakpoints are correct; only the passthrough condition was wrong.

**`max_width` (width-only cap)** — rejected for the orientation asymmetry above.

**`max_width` + `max_height`** — more flexible, but more surface to document and
validate than the need justifies.

**Megapixel cap** — fairest on file size, but unintuitive to configure and it
yields non-round dimensions like 2449x1633.

## Consequences

- Sources at or below 2400 on the longest side keep their current output; larger
  sources are now capped, where previously they passed through at full
  resolution. Existing sites with large originals will see their largest variant
  shrink.
- Panoramas benefit most: a 2400x7200 source previously emitted 2400x7200
  (17.3 MP) and now emits 800x2400 (1.9 MP).
- Photos smaller than the smallest breakpoint now render instead of silently
  disappearing.
- Oversized files already written to `dist/` are no longer referenced by any
  page, but they are not deleted. A one-off `npm run build:clean` purges them.
- The cap is a build-time parameter, so changing it re-processes every photo
  (see ADR-013).
