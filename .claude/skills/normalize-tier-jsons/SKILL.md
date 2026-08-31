---
name: normalize-tier-jsons
description: Take a partner-delivered raw tier batch (any incoming `tier1/2/3.json` set in non-canonical shape) and produce DHYH-aligned `tier{1,2,3}b.json` files ready to feed into `/align-tier-jsons`. Five transforms — reformat to DHYH style, strip legacy `music_emotion`, generate `tier1` from `tier2` when missing, backfill `tier3` objects with the full `tier2` detection set (preserving synthetic objects + product_match data). Use whenever a new content batch arrives from the analysis pipeline and the raw shape doesn't match what `/align-tier-jsons` expects.
---

# Skill: `/normalize-tier-jsons`

The **structural prep step** before `/align-tier-jsons`. Takes a partner-delivered raw tier batch and produces a DHYH-shaped `tier{1,2,3}b.json` set so the existing app-readiness skill can take over.

> **Quick relationship**: `/normalize-tier-jsons` (this skill, structural prep) → `/align-tier-jsons` (existing skill, app-readiness — clip-time mapping, panel parity, synthetic marker) → wire into `src/demo/content/<id>/tiers/`.

## When to invoke

- **A new content batch arrives** from the analysis pipeline with raw JSONs that don't exactly match the DHYH reference shape (different float formatting, escaped unicode, minified, missing tier1, sparse tier3 objects, legacy `music_emotion`, etc.).
- **`/align-tier-jsons` fails its prerequisites** — usually because tier1 is missing, music_emotion is present, or tier3 has fewer objects than tier2.

If the incoming batch already matches DHYH shape (correct indent + raw unicode + no `music_emotion` + tier1 present + T3 has ≥ T2 objects + synthetic objects already on T3 base), this skill is a no-op. Go straight to `/align-tier-jsons`.

## The five transforms (this is what the script does)

Every transform is conditional — applied only if the input doesn't already satisfy it. Values are never mutated; only structural fields are added/removed/reordered.

### A. Reformat to DHYH style
Re-serialize with **4-space indent**, **raw unicode characters** (no `\u…` escapes), **no trailing newline**. Whole-number floats render as `0`, not `0.0` — Node's `JSON.stringify` matches DHYH canonical format automatically; Python's `json.dumps` does NOT (it inserts `.0` artifacts). **Use Node for this work.** Round-trips through `JSON.parse → JSON.stringify` preserve every leaf value byte-identically.

### B. Strip legacy `music_emotion`

> **Prefer `/merge-music-emotion` instead.** As of 2026-08-31 the merge is a
> documented skill; it keeps the mood values as `emotion` entries rather than
> discarding them. Strip only when the partner confirms the moods are junk.
Per project memory `emotion_supersedes_music_emotion`, `emotion` is the successor and `music_emotion` is a legacy tooling artifact. Delete the `music_emotion` key from every scene. Don't touch `emotion` (it's the kept signal).

Note: the existing `/align-tier-jsons` skill describes an optional MERGE strategy (preserve `music_emotion` values as new `emotion` entries with non-colliding IDs). This skill does the simpler STRIP — matching what DHYH actually ships and what MasterChef was processed with on 2026-06-15. If the partner's `music_emotion` carries data you don't want to lose, use the merge approach from `/align-tier-jsons` instead.

### C. Generate `tier1` from `tier2` when missing
Tier 1 is a structural subset of Tier 2 — same scenes, fewer fields. If no `tier1` input is provided, project `tier2` down to the T1 schema:

| Drop from scene-level | Drop from `video_metadata` | Reorder |
|---|---|---|
| `labels`, `logos`, `faces`, `text`, `locations`, `objects`, `description`, `emotion` (8 keys) | `emotion`, `locations`, `objects` (3 keys) | `sentiment_analysis` moves to AFTER `audio_transcript` in scene keys (vs BEFORE in T2/T3) |

Every kept field is copied verbatim from T2. If a `tier1` input IS supplied (same content, separate file from the partner), it's reformatted in place instead of regenerated.

### D. Backfill `tier3` objects with `tier2` detection set
Some partner pipelines deliver T3 heavily filtered — only the objects that the upstream product-matcher kept, plus synthetic scaffolds. The app's Object taxonomy panel needs T3 to carry the **same detection vocabulary as T2**.

Per scene, rebuild `objects` as:
1. **Every T2 detection** — shaped as a T3 object: `{name, confidence, bounding_box, product_match}`. `product_match` defaults to `[]`.
2. **Preserved product_match data**: if the existing T3 had already matched a T2 detection by `(name, bounding_box)`, transfer that `product_match` array onto the corresponding T2 entry so no upstream match data is lost.
3. **All synthetic objects** from the existing T3 (placeholder bbox + `0.8511` confidence), preserved verbatim with their `product_match`.

Result: `T3 object count = T2 detections + T3 synthetics` (matching DHYH's natural T3 > T2 size relationship).

Skipped if T3 already has ≥ T2 objects (= the partner shipped a complete detection set).

### E. Verify
- All three b-files parse cleanly
- Scene counts match across tiers (T1 = T2 = T3)
- `music_emotion` is gone everywhere
- T3 real-object count exactly equals T2 total
- T3 total ≥ T2 total (synthetics make T3 ≥ T2 by design)

## Usage

```bash
node scripts/normalize-tier-jsons.mjs <src-dir> <prefix> [--out-suffix b]
```

**Example** (the MasterChef batch on 2026-06-15):
```bash
node scripts/normalize-tier-jsons.mjs _Temp-Files/MasterChef/JSONs mc-response-
```

Reads `<src-dir>/<prefix>tier{1,2,3}.json` (tier1 optional). Writes `<src-dir>/<prefix>tier{1,2,3}b.json`. **Originals are never modified.**

The script self-reports each transform's outcome (counts of removed `music_emotion`, backfilled T3 objects, preserved product_match arrays, etc.). Watch for any `⚠ old-T3 detections NOT in T2 (dropped)` warnings — they indicate the partner's T3 had real detections that didn't appear in T2, which is unusual and worth investigating.

## What this skill explicitly does NOT do

These belong to `/align-tier-jsons` and run AFTER normalize:

- **Clip-time vs source-time mapping** — does not touch `startTime`/`endTime` or set `DHYH_TIER_TIME_BASE`.
- **Synthetic-object MARKER** (`"synthetic": true`) — synthetic objects are preserved verbatim, but the boolean tag is added in the align step (so the app keeps them out of the Object taxonomy panel).
- **Per-scene `sentiment_analysis` backfill for tier1** — T1 carries whatever sentiment was in the source T2 it was projected from.
- **T2 ↔ T3 metadata parity** for `faces`, `text`, `labels`, `description`. Only the `objects` field is backfilled here.
- **Products / image / link wiring** — `product_match` arrays are preserved/initialized, but the deeper "are the products + images app-ready" gate is `/align-tier-jsons`.

## Common edge cases

- **Tier1 input exists but is from a different/longer cut than T2** — script will reformat it in place; cross-check `video_id` / `duration_in_seconds` / `total_scenes` afterward.
- **T3 has detections NOT in T2** — script drops them with a warning. If they look like real upstream signal (not noise), inspect manually before continuing.
- **No `music_emotion` field present** — transform B is a no-op (0 entries removed). Fine.
- **T3 has more objects than T2** (= partner already shipped full T3) — transform D is skipped. Fine.
- **Float formatting drift** — if you re-run this script over already-normalized b-files, the output is byte-identical (idempotent). If you re-run over Python-touched files, expect tiny diffs as `.0` → no-suffix.

## File paths

- Script: `scripts/normalize-tier-jsons.mjs`
- Inputs (per batch): `<src-dir>/<prefix>tier{1,2,3}.json` (raw, partner-delivered)
- Outputs: `<src-dir>/<prefix>tier{1,2,3}b.json` (DHYH-aligned)
- DHYH reference: `_Temp-Files/Dont-Hate-Your-Home/response-tier{1,2,3}_1b.json`
- Reference report (what we did + why for the MasterChef batch): `analysis/MASTERCHEF-PREP-NOTES.md`

## Hand-off to `/align-tier-jsons`

After this skill runs cleanly:
1. The b-files are DHYH-shaped (formatting, schema, T1 present, T3 ≥ T2 objects).
2. Run `/align-tier-jsons` for the app-readiness work (clip-time mapping, panel parity, synthetic marker, products/images wiring).
3. After align is done, drop the b-files into `src/demo/content/<id>/tiers/tier{1,2,3}.json` and regenerate the pause modes via `/generate-cta-pause-json` and `/generate-organic-pause-json`.

## Skill maintenance

If a future partner batch ships in a shape this script's transforms don't cover — log it in `analysis/`, add the transform to `scripts/normalize-tier-jsons.mjs`, and update this skill with the new case. The script is designed to be additive; new transforms become new optional steps.
