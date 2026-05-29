---
name: align-tier-jsons
description: Align a new batch of hero tier JSONs (tier1/2/3 — Basic / Advanced / Exact Product Match) so they work correctly in the app — clip-time scenes, unified emotion, taxonomy parity, synthetic-object marker, nested products. Use when a new Tier 1/2/3 batch arrives from the analysis pipeline, tier data changes, or panels/products misbehave after a tier swap.
---

# Skill: `/align-tier-jsons`

Take a fresh batch of **hero tier JSONs** (`tier1.json` / `tier2.json` /
`tier3.json` — the data behind the **Basic Scene** / **Advanced Scene** / **Exact
Product Match** selections) and align them so the demo works: panels sync to
playback, taxonomies render correctly, Tier 3 products work, and the pause modes
can be regenerated from Tier 3.

This is the reference for the adjustments made on 2026-05-27 when swapping to the
clip-native `DB-DemoVid1` data. Full narrative: `analysis/TIER-PREP-NOTES.md`.

## When to invoke

- A new Tier 1/2/3 batch arrives (new content, re-export, or a re-cut clip).
- Tier data changes and you need to confirm app compatibility.
- After a tier swap, panels go blank / products break / the Object panel shows odd
  items — usually one of the checks below was missed.

## The app contract — what tier JSONs MUST satisfy

1. **Timestamps match the PLAYED video (clip-time).** The biggest gotcha. The demo
   plays a specific clip; scene `startTime`/`endTime` must be on **that clip's**
   timeline.
   - If the batch is processed **natively against the clip** (e.g. `DB-DemoVid1`,
     0→~602 s), it's **clip-native** → app flag `DHYH_TIER_TIME_BASE = 'clip'`
     (`src/demo/content/dhyh/timeline.ts`). Pass-through, any length.
   - If the batch is **full-source** time (e.g. the 44-min `DHYH1…`) and the clip
     is a splice of segments, set `DHYH_TIER_TIME_BASE = 'source-splice'` and keep
     the segment constants current. **Mismatch = every scene falls outside the
     clip window → all panels blank.** Verify which you have first.
2. **The three tiers describe the SAME cut** — identical `video_id`,
   `duration_in_seconds`, `total_scenes`. (A T1 from a different/longer cut than
   T2/T3 is the classic mistake — cross-check before aligning.)
3. **Taxonomy contract.** The Taxonomy panel surfaces only: **Location, IAB,
   Brand Safety (GARM), Sentiment, Emotion, Object, Faces, Logo** — and only when
   the field has data. `description`, `text`, `audio_transcript`, `labels` are
   scene **metadata** (JSON panel / reasoning), **not** taxonomies.
4. **Tier roles:** T1 = IAB + GARM + Sentiment; T2 = + Emotion, Locations, Objects,
   Faces, descriptions, labels; T3 = T2 + the product layer (`product_match`,
   `image`, `shoppable_score`).

## The alignment checklist (the adjustments)

Apply per batch; each is idempotent-ish (skip if already satisfied). Always
verify data integrity after a reformat (`JSON.parse` → compare).

**A. Formatting.** Normalize to 4-space JSON (`JSON.stringify(data, null, 4)`),
confirming parsed data is unchanged (formatting-only).

**B. Emotion unification.** If scenes carry a separate **`music_emotion`** field,
merge it into a single per-scene **`emotion`** array and delete `music_emotion`.
(`emotion` supersedes `music_emotion` — see memory `emotion_supersedes_music_emotion`.)
Give music-derived moods `emotion`-style entries (`{id,name,confidence}`) with IDs
that **don't collide** with the existing emotion taxonomy (continue past the max
used `E#`). Add the moods to the video-level `emotion` rollup too. The app reads
`emotion` (falling back to `music_emotion`), so a batch that already uses unified
`emotion` needs nothing here.

**C. Tier 1 per-scene sentiment.** If `tier1` has only video-level sentiment and
**no per-scene `sentiment_analysis`**, the Basic Scene Sentiment panel renders
blank. Fill per-scene `sentiment_analysis` (copy from `tier2` — same clip/scenes,
align by index/`startTime`). Confirm T1's IAB/GARM are present per-scene too.

**D. Tier 2 ↔ Tier 3 taxonomy + metadata parity.** T3 must carry **everything T2
has** plus the product layer. Fill any T3 fields that are empty-but-present-in-T2:
`faces`, `description`, `text`, `labels` (copy from T2 by scene index). The *only*
intended T2→T3 difference is products/`image`/`shoppable_score` (and the synthetic
objects in D-next).

**E. Synthetic-object marker (Tier 3).** T3's product-matching **scaffolding**
objects must be tagged **`"synthetic": true`** so the app keeps them out of the
Object taxonomy panel while the Products panel still reads `product_match` from
them. Rule (the one used 2026-05-27): an object is synthetic iff its **name is not
in T2's detection vocabulary** AND it **shares its exact `bounding_box` with
another object in the same scene** (it "rides on" a detected anchor). See memory
`tier3_synthetic_objects`. If a future batch ships its own synthetic flag, use that
instead.

**F. Products & images (Tier 3).** Products stay **nested**:
`scene.objects[].product_match[]`. `image` is the product photo URL (absolute CDN
URL by default; can be local/S3 — see the `generate-*-pause-json` skills' image
notes and `resolveProductImage.ts`). `link` is the product page (the pause modes
copy it to `qr`). Don't decouple products from objects — the app + generators read
the nested shape.

## Verify (gate before declaring done)

1. `npm run build` clean (tsc -b + vite — Vercel uses `tsc -b`, catches more than `--noEmit`).
2. `npx vitest run` — full suite green.
3. **Data sanity** (quick node check on the swapped tier3): clip-native mapping
   keeps **all** scenes (0 dropped, span 0→duration); product count preserved;
   synthetic-object count looks right; `emotion`/`faces` populated as expected.
4. **In-browser** (`localhost:5173`): for each tier, the Taxonomy + Products + JSON
   panels track playback **and each other** (one clock → `resolveActiveSceneIndex`
   → all panels); the Object panel shows real objects only (synthetic hidden);
   products + images render.
5. **Regenerate the pause modes** afterward (`/generate-cta-pause-json`,
   `/generate-organic-pause-json`) — they're built from `tier3.json`.
6. **Archive the old tiers** before swapping (gitignored `archive/…`), so the swap
   is revertable (restore + flip `DHYH_TIER_TIME_BASE`).

## Where the app enforces each piece

| Concern | File |
|---|---|
| Clip vs source time | `DHYH_TIER_TIME_BASE`, `remapSceneToClipTime` / `clipNativeRange` in `scenes.ts` |
| Scene build / emotion reader / synthetic filter / nested products | `src/demo/content/dhyh/scenes.ts` |
| Taxonomy set (+ Logo) | `src/demo/types.ts`, `constants.ts` (`taxonomyOptions`, `TAXONOMIES_AVAILABLE_BY_TIER`), `utils/sceneState.ts` |
| Tier → file mapping | `src/demo/sources/resolveTierPayload.ts` |
| Product image resolution (CDN/local/S3) | `src/demo/sources/resolveProductImage.ts` |
| Panel sync invariant | `useDemoPlayback.ts` + `resolveActiveSceneIndex` |

## File paths

- Hero tiers: `src/demo/content/<id>/tiers/tier{1,2,3}.json`
- Prep narrative + streamlining report: `analysis/TIER-PREP-NOTES.md`
- Delivery package example: `_Temp-Files/DELIVERY-jsons-2026-05-27/`
- Tests: `tests/unit/sceneState.test.ts`, `syncInvariants.test.ts`, `pauseMoments.test.ts`

## Skill maintenance

These transforms (B–E) were done with one-off node scripts on 2026-05-27. If
future batches consistently arrive in the same shape, consider promoting them into
a reusable `scripts/align-hero-tiers.mjs` (parallel to the pause generators) and
point this skill at it. Until then, this checklist is the spec. Keep it in sync
with the app contract — if `DHYH_TIER_TIME_BASE`, the taxonomy set, or the
synthetic rule changes in code, update this skill.
