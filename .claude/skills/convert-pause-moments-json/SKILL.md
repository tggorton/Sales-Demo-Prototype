---
name: convert-pause-moments-json
description: Convert a partner-supplied pause-to-shop "moments" JSON (the tracker-pixel-style document the campaign team produces) into the local `src/demo/content/<content-id>/ads/cta-pause.json` format the demo's adapter consumes. Use when the user drops a new test JSON in `_Temp-Files/` (or supplies one inline) and wants it wired up for a content tile.
---

# Skill: `/convert-pause-moments-json`

Take a partner-supplied JSON in the upstream "pause-to-shop" shape and produce the trimmed, demo-ready local copy the `pauseMoments.ts` adapter reads.

## When to invoke this skill

- The user pastes or drops a new partner JSON (often named like `test-moments-json` / `test-moments-json-b` / `test-moments-json-c` in `_Temp-Files/`) and wants it wired up.
- Upstream changes the schema and we need to re-derive the local file.
- A new content tile lands and needs its own pause-moments JSON.

## What this skill does

1. **Find the source JSON.** Default location: `_Temp-Files/`. The user may name it anything (`test-moments-json-c`, `pause-data.json`, etc.). Read the raw content first; do not assume the schema is identical to a previous round.
2. **Identify the target content id.** The destination is `src/demo/content/<content-id>/ads/cta-pause.json`. For DHYH that's `src/demo/content/dhyh/ads/cta-pause.json`. If the user is targeting a different content tile (e.g. a future `bb` for Big Brother), confirm the id with the user before writing.
3. **Validate the source's basic shape.** Top-level should be `{ video_id, campaign: [...] }`. Each campaign should have `pause_to_shop_screen`, `product_detail_screen`, and `scenes[]`. Each scene should have `objects[].product_match[]`. If any of those are missing, flag the issue and ask the user before proceeding (don't silently produce a bad local file).
4. **Apply the conversion rules** below.
5. **Write the local file** to the target path.
6. **If the file already exists**, diff against the new output and present the changes; let the user accept before overwriting (especially the `video_id` and any `_note` fields the user may have edited).
7. **Run** `npx tsc --noEmit` and `npx vitest run --reporter=dot` to confirm the new JSON parses through the adapter and existing tests still pass.
8. **Report** what was kept, trimmed, and changed (especially anything that needed remapping such as timestamps).

## Conversion rules

These are the deltas between the partner shape and the local shape. They reflect editorial directions the user has already given; if the user contradicts them in the current conversation, follow the new direction and update this skill afterwards.

### 1. Top-level

| Source field | Local file | Notes |
|---|---|---|
| `video_id` | rewrite to the demo's content id (`"DHYH"` for DHYH) | Documents the swap; the adapter doesn't read it. |
| `campaign[]` | preserved verbatim (subject to per-campaign rules) | |

### 2. Per-campaign theme blocks

Both `pause_to_shop_screen` and `product_detail_screen` are kept **verbatim**. The adapter ignores most colour fields today — preserve them anyway so a future "honour the JSON theme" pass is a one-edit change. Active fields the adapter reads:

- `pause_to_shop_screen.cta_url` — the adapter peels the `img=` query param to drive the in-playback "PAUSE TO SHOP" image.
- `pause_to_shop_screen.sponsored_by_logo_url` — carousel sponsor chip.
- `pause_to_shop_screen.selected_product_background_image` — focused-tile background.
- `pause_to_shop_screen.product_image_placeholder_url` — fallback for tile images.
- `product_detail_screen.shop_logo_url` — detail-card sponsor.
- `product_detail_screen.background_image` — detail card backdrop.
- `product_detail_screen.product_image_placeholder_url` — fallback for detail images.

### 3. Per-scene fields

Keep:

- `scene` — the upstream scene id (informational only; the adapter uses time bounds).
- `startTime`, `endTime`, `lengthInSeconds` — clip-time seconds. **These must be on the demo's clip-time axis.** If the source supplies source-time (the original episode timeline), rebase them to the spliced clip timeline before writing. For DHYH the editorial CTA Pause windows are `1:17–1:47` (77–107 s) and `2:33–8:52` (153–532 s) — align scenes to those windows.
- `objects[]` — preserved verbatim.

Drop (the adapter never reads them):

- `startFrame`, `endFrame` (frame counters)
- `startTimecode`, `endTimecode`, `lengthInFrames`, `lengthInTimecode` (mirror of the seconds fields)
- `trackers` (analytics pixels — demo doesn't fire them)
- `profile`, `iab_taxonomy`, `garm_category`, `sentiment_analysis`, `audio_transcript`, `labels`, `logos`, `faces`, `text`, `locations`, `description`, `music_emotion` (per-scene metadata used elsewhere upstream)

Optional: add an `_originalSourceTime` comment-key documenting the rebased range (helpful when reviewing diffs against the partner file).

### 4. Per-product fields

Keep verbatim within `objects[].product_match[]`:

- `product_id`, `name`, `description`, `cta`, `price`, `image`, `qr`

Drop:

- `scroll_tracker`, `select_tracker`, `exit_tracker` (analytics pixels)

### 5. Top-of-file `_note`

Add a leading `_note` key to the local file documenting the conversions applied (rebase, trims, video_id rewrite). This is the rebreaker for anyone reviewing the diff between the partner file and our local copy.

## Output expectations

A typical invocation should produce:

1. A new (or updated) `src/demo/content/<content-id>/ads/cta-pause.json` matching the rules above.
2. Confirmation that `npx tsc --noEmit` and `npx vitest run` pass.
3. A short summary that lists per-scene timestamp rebases (source → clip-time), how many products per scene, anything trimmed beyond the standard rules, and any open questions (e.g. ambiguous timestamps, missing `cta_url`).

Do **not** fire trackers, do **not** modify the partner-supplied file in `_Temp-Files/`, and do **not** add or remove fields the adapter consumes without flagging the change to the user. If the upstream schema gains a new field that the adapter should read, that's a separate change to `pauseMoments.ts` + `pauseOverlay.types.ts` — surface it before silently updating the JSON contract.

## File paths

- Source samples: `_Temp-Files/test-moments-json*` (gitignored — do not modify)
- Target: `src/demo/content/<content-id>/ads/cta-pause.json`
- Adapter: `src/demo/content/<content-id>/pauseMoments.ts`
- Payload type: `src/demo/components/player/pause-overlay/pauseOverlay.types.ts`
- Tests: `tests/unit/pauseMoments.test.ts`

## Skill maintenance

If the user changes the editorial direction (e.g. theme overrides, tracker handling, QR rendering), update this file before the next conversion. Keep the rules section as the single authoritative source for "what changes when going from partner JSON → local file" so future sessions don't re-litigate.
