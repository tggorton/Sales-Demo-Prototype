---
name: generate-organic-pause-json
description: Re-run the Tier 3 → Organic Pause JSON generator (`scripts/generate-organic-pause-moments.mjs`) so `src/demo/content/<content-id>/ads/organic-pause.json` reflects the current Tier 3 source. Use whenever Tier 3 data changes, the dedupe window or trailing-window cap shifts, the bundled-image path moves, or the user asks to "regenerate organic pause" / "refresh organic moments".
---

# Skill: `/generate-organic-pause-json`

Bridge a content tile's Tier 3 scene metadata (the per-scene product matches the Vision pipeline produces against the original source-time axis) into the same `ads/cta-pause.json` shape the demo's pause-overlay adapter consumes — but on the spliced clip-time axis the player actually plays.

This is the "test/POC" recipe — it produces a usable Organic Pause document for DHYH from the data we have today (no editorial copy, no sponsor-supplied QR images, no per-product copy). When upstream supplies real organic-pause copy + QR assets, this skill becomes "translate that document into the local shape" and most of the synthesis below collapses; until then, this is the recipe.

## When to invoke this skill

- The user changes `tier3.json` (added scenes, swapped product matches, fixed product IDs) and wants the Organic Pause moments to track.
- The user changes the dedupe window, trailing-window cap, or splice constants and wants the JSON to reflect the new logic.
- The user adds a new content tile that should support Organic Pause (the recipe applies — point at that tile's Tier 3 instead of DHYH's).
- The user asks to "regenerate the organic pause JSON" or "rerun the organic generator" or similar.

## What this skill does

1. **Confirm the target content id.** Default is DHYH (`src/demo/content/dhyh/`). If the user is generating for a different content tile, confirm with them first — the recipe applies but the splice constants and source/destination paths need to swap.
2. **Read the script.** Open `scripts/generate-organic-pause-moments.mjs` and re-read the comment block at the top. The script is the canonical source of truth for the conversion logic; this skill is the human-readable companion. If the script has drifted from this skill, **trust the script and update the skill**.
3. **Sanity-check the inputs.** The generator reads two files:
   - `src/demo/content/<id>/tiers/tier3.json` — Tier 3 source data with per-scene `objects[].product_match[]` and source-time `startTime` / `endTime`.
   - `src/demo/content/<id>/ads/cta-pause.json` — the CTA Pause document. Only its `campaign[0].pause_to_shop_screen` and `campaign[0].product_detail_screen` blocks are reused (so Organic Pause shares sponsor logos / backdrop artwork with CTA Pause).

   If either file is missing or malformed, fix it before re-running.
4. **Run** `node scripts/generate-organic-pause-moments.mjs` from the project root. The script writes the output and prints a `scenes: N\n  total products: M` summary.
5. **Diff the result.** `git diff src/demo/content/<id>/organic-pause-moments.json` — confirm scene-count and product-count drift matches the Tier 3 change you expected. Unrelated drift means a constant changed; investigate before committing.
6. **Run the resolver tests.** `npx vitest run tests/unit/pauseMoments.test.ts --reporter=dot`. The Organic Pause resolver section asserts that windows cover the full clip, products cap at 5 per moment, and a placeholder description is present. If a test breaks because the generator legitimately changed shape, update the test alongside the generator — don't paper over it.
7. **Run the production build.** `npm run build`. The JSON is bundled at compile-time, so a malformed output would fail there before Vercel sees it.
8. **Commit** the regenerated JSON (and any generator/script edits) together. Don't commit a generator change without re-running it; don't commit a regenerated JSON without the generator change that produced it.

## The conversion logic, at a glance

What the generator actually does, in order. Each step is implemented in `scripts/generate-organic-pause-moments.mjs` — refer there for the canonical code. This is the explanation that lets you predict the output shape before running.

### 1. Source-time → clip-time rebase

Tier 3's scene timestamps reference the original 44-minute source axis. The demo plays the spliced 10:02 clip. The script rebases each kept scene's `startTime` / `endTime` onto the clip axis:

| Source range | Clip range |
|---|---|
| Segment A: `19:45–21:32` (1185–1292 s) | `0–107 s` |
| Segment B: `35:45–44:00` (2145–2640 s) | `107–602 s` |

Scenes outside both segments are dropped (they don't appear in the playable clip at all). Scenes that straddle a splice boundary are dropped too — the script uses the simple "fully inside one segment" check and that's enough for DHYH today.

### 2. Filter to scenes with at least one `product_match`

Tier 3 is wall-to-wall scene metadata; only the subset with a `product_match` array can produce Organic Pause moments. Empty-product scenes are skipped silently.

### 3. Sort by clip-time and dedupe by product_id

The script walks scenes in clip-time order and emits products into a flat list. Within `PRODUCT_DEDUPE_WINDOW_SECONDS = 90` (kept in sync by hand with `PRODUCT_DEDUPE_WINDOW_SECONDS` in `src/demo/constants.ts`), the same `product_id` is collapsed; gaps larger than 90 s let it reappear naturally later in the clip. This mirrors how the Products panel's `buildProductEntries` handles dedupe — both Organic Pause and the Products panel feel consistent because they share the same rule.

If the Products panel constant changes, **update the script's local constant** and re-run; don't import across the script/runtime boundary because the script runs in Node and the constant is a TypeScript symbol.

### 4. Trailing-5 rolling carousel

For each scene-with-products at clip-time `T`, the moment's carousel shows the **5 most recent deduped products with `sceneStart <= T`**. So:

- A scene late in the clip shows the 5 most-recently-emitted unique products, regardless of which scenes contributed them.
- Early scenes show whatever subset is available (1–4 products if fewer than 5 have appeared yet).
- The carousel feels like "what's been on screen recently" — same intuition as scrubbing the Products panel — rather than "only this scene's products," which would feel sparse and editorial.

The cap is `MAX_PRODUCTS_PER_MOMENT = 5` (matches the carousel's visual cap of 3 fully visible + 4th peeking + 5th in scroll).

### 5. Window each scene to the next one

Each emitted moment's `[startTime, endTime]` covers from this scene's clip-time to the next scene-with-products' clip-time (or `CLIP_DURATION = 602 s` for the last). This guarantees the resolver always finds an active moment for any pause-time inside the clip — Organic Pause is "always available" by design, unlike CTA Pause which only fires inside two editorial windows.

### 6. Bundled image paths (NOT S3)

Per-product `image` values come from `tier3.image` (e.g. `homedpt/335027444.jpg`) prefixed with `BUNDLED_PRODUCT_IMAGE_BASE = '/assets/products/'` so the demo loads from `public/assets/products/...` — same path the Products panel uses in local mode. The Tier 3 `image_url` field (S3) is intentionally NOT used here because of CORS / latency.

If you regenerate after adding new products and the image won't load, the bundled image is missing from `public/assets/products/` — drop the file in there before re-running the generator (or before committing).

### 7. Click-out URL via `qr` field

The generator copies each product's `link` URL into the output's `qr` field so the pause-overlay click-out resolves to the real product page. The overlay's QR rendering happens to encode this same URL — for the POC that's acceptable; production will swap in branded sponsor-supplied QRs and the script will likely stop populating `qr` from `link`.

### 8. Theme block reused verbatim

The output's `campaign[0].pause_to_shop_screen` and `campaign[0].product_detail_screen` blocks are copied verbatim from `ads/cta-pause.json`, so Organic Pause uses the same sponsor logos / detail backdrop / focused-tile artwork as CTA Pause. The two modes share campaign assets while their scenes diverge.

## Constants you may need to edit

| Constant | Location | Why you'd touch it |
|---|---|---|
| `SEG_A_SOURCE_START` / `SEG_A_SOURCE_END` / `SEG_B_SOURCE_START` / `SEG_B_SOURCE_END` / `CLIP_DURATION` | `scripts/generate-organic-pause-moments.mjs` | Splice math changed (different content tile, or DHYH's splice was re-cut). Mirror to `src/demo/content/<id>/timeline.ts`. |
| `PRODUCT_DEDUPE_WINDOW_SECONDS` | `scripts/generate-organic-pause-moments.mjs` | Products panel's dedupe window changed. Mirror to `src/demo/constants.ts`. |
| `MAX_PRODUCTS_PER_MOMENT` | `scripts/generate-organic-pause-moments.mjs` | Carousel visual cap changed (today: 5 = 3 visible + 4th peek + 5th in scroll). Coordinate with `MAX_TILES_PER_MOMENT` in `pauseMoments.ts`. |
| `PLACEHOLDER_DESCRIPTION` | `scripts/generate-organic-pause-moments.mjs` | Tier 3 still doesn't carry per-product copy; until it does, every detail card shows this string. The Organic Pause resolver test asserts the placeholder string survives, so update the test if you edit the placeholder. |
| `BUNDLED_PRODUCT_IMAGE_BASE` | `scripts/generate-organic-pause-moments.mjs` | Public asset path moved (e.g. CDN flip). Mirror to `resolveProductImageUrl` in the products util. |

## File paths

- Generator: `scripts/generate-organic-pause-moments.mjs`
- Source: `src/demo/content/<id>/tiers/tier3.json`
- CTA Pause document (theme reuse): `src/demo/content/<id>/ads/cta-pause.json`
- Output: `src/demo/content/<id>/organic-pause-moments.json`
- Adapter: `src/demo/content/<id>/pauseMoments.ts` (consumes both CTA and Organic documents)
- Resolver tests: `tests/unit/pauseMoments.test.ts` (last describe block: "Organic Pause resolver")
- Products-panel dedupe reference: `src/demo/utils/productEntries.ts` (`buildProductEntries`)
- Products-panel dedupe constant: `src/demo/constants.ts` (`PRODUCT_DEDUPE_WINDOW_SECONDS`)
- Splice constants reference: `src/demo/content/<id>/timeline.ts`

## Output expectations

A typical invocation should produce:

1. An updated `src/demo/content/<id>/organic-pause-moments.json` whose scene/product counts match the Tier 3 input under the current dedupe + trailing-5 rules.
2. A clean `npx vitest run tests/unit/pauseMoments.test.ts` and `npm run build`.
3. A summary listing scene count, total product count, and any drift from the prior output worth flagging (e.g. "scene count went 52 → 47 because Tier 3 dropped 5 source scenes outside Segment A/B").

Do **not** edit the JSON output by hand — it's auto-generated and the next regeneration will clobber edits. If a manual fixup is needed, fix the generator (or the Tier 3 input) and re-run.

## Skill maintenance

When the upstream organic-pause story matures (real copy, real QR images, sponsor-supplied destinations), the bulk of this skill collapses: Tier 3 stops being the source of truth for product display data, and the generator becomes a "translate the upstream organic-pause document into the local shape" skill — much closer to `convert-pause-moments-json`. At that point: rewrite this skill, drop the placeholder + bundled-image + trailing-5 logic from the generator, and lift the dedupe rule into a shared module both Node and TypeScript can consume.

Until then, this is the recipe — keep the script, this skill, and `pauseMoments.test.ts` aligned with each other after every change.
