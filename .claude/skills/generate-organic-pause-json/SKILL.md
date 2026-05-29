---
name: generate-organic-pause-json
description: Re-run the Tier 3 → Organic Pause JSON generator (`scripts/generate-organic-pause-moments.mjs`) so `src/demo/content/<id>/ads/organic-pause.json` reflects the current Tier 3 source. Use whenever Tier 3 changes, the dedupe/cap shifts, the image host changes (local/CDN/S3), or the user asks to "regenerate / refresh organic pause".
---

# Skill: `/generate-organic-pause-json`

Generate the Organic Pause document for a content tile from its **Tier 3**
product data. Organic Pause lets the user pause at **any** point and see the
**time-accurate top-5 products** (no editorial windows — the CTA hint only shows
in the first few seconds, gated separately in the app). One moment is emitted per
product-scene, tiled to the next, so any pause resolves.

> **Canonical format (2026-05-27 onward):** Tier 3 is now **clip-native**
> (`DB-DemoVid1` — timestamps already on the playable clip axis) with **real
> product titles, descriptions, and links**, and **CDN image URLs**. Newer Tier 3
> batches will match this, not the old 44-min source-time / placeholder-copy
> shape. This skill and the CTA skill share `scripts/lib/pause-moments-core.mjs`.

## When to invoke

- Tier 3 (`tiers/tier3.json`) changed and Organic Pause should track it.
- The dedupe window or per-moment product cap changed.
- The image host changes (local ↔ CDN ↔ S3 — see below).
- The user asks to "regenerate / refresh / rerun organic pause".

## What this skill does

1. **Confirm the content id** (default DHYH = `src/demo/content/dhyh/`). For another tile the recipe applies but paths swap.
2. **Read** `scripts/generate-organic-pause-moments.mjs` + the shared core `scripts/lib/pause-moments-core.mjs`. The scripts are the source of truth; if they've drifted from this skill, trust them and update the skill.
3. **Check the knobs** at the top of the script: `TIME_BASE`, `IMAGE_SOURCE`, dedupe window, max products.
4. **Run** `node scripts/generate-organic-pause-moments.mjs` from the project root. (Run the CTA generator first if the shared theme block needs refreshing — organic reuses `cta-pause.json`'s theme.)
5. **Verify** `npm run build` + `npx vitest run tests/unit/pauseMoments.test.ts --reporter=dot`.
6. **Diff + report** moment count, total tiles, and any drift from the prior output (e.g. "moments 52 → 111 because the new Tier 3 has far more product-scenes").

## The two knobs (shared with CTA Pause)

Documented in `scripts/lib/pause-moments-core.mjs`.

### `TIME_BASE` — clip-native vs. source-splice
- **`'clip'`** (current / canonical): Tier 3 scenes are already clip-time; pass
  through 1:1. **Works for any content length** (10-min clip, full 44-min native
  export, segment export). Clip length is read from `tier3.duration_in_seconds`,
  so the generator is length-agnostic.
- **`'source-splice'`**: legacy 44-min `DHYH1` source-time — remap via the segment
  windows; scenes outside every segment drop. Keep consistent with the app's
  `DHYH_TIER_TIME_BASE` flag in `timeline.ts`.

### `IMAGE_SOURCE` — local ↔ CDN ↔ S3 (easy hosting swap)
```js
const IMAGE_SOURCE = { mode: 'cdn', s3Base: 'https://<bucket>.s3.amazonaws.com/products' }
```
- **`'cdn'`** (current): each product's own absolute `image` URL as-is.
- **`'local'`**: `/assets/products/homedpt/<product_id>.<ext>` (bundled copy in
  `public/assets/products/homedpt/`; backup at `_archive/product-images-DB-DemoVid1-*/`).
- **`'s3'`**: `${s3Base}/<product_id>.<ext>`.

Change `mode` (+ `s3Base`) and re-run to switch hosting — no app change needed
(the adapter uses the emitted `image` directly).

## The conversion logic, at a glance

Implemented in the shared core; this predicts the output.

1. **Time base.** Per `TIME_BASE` (clip pass-through, or source-splice remap).
2. **Filter to scenes with ≥1 `product_match`.** Empty-product scenes skipped.
3. **Dedupe by `product_id`** within `DEDUPE_WINDOW_SECONDS = 90` (mirror of the
   Products-panel `PRODUCT_DEDUPE_WINDOW_SECONDS`). A product reappearing within
   90 s collapses; larger gaps let it resurface.
4. **Trailing-5 rolling carousel.** Each moment shows the 5 most recent deduped
   products with `sceneStart ≤ T`. Early moments show 1–4 if fewer exist.
   `MAX_PRODUCTS_PER_MOMENT = 5` (coordinate with `MAX_TILES_PER_MOMENT` in
   `pauseMoments.ts`).
5. **Window each scene to the next** (last → `tier3.duration_in_seconds`), so the
   resolver always finds an active moment for any pause-time after the first
   product-scene. Organic is "always available" by design.
6. **Real product copy.** `description` comes straight from Tier 3 now (no more
   placeholder). `qr` = Tier 3 `link` (destination URL, rendered client-side as a
   QR + click-out modal). `image` per `IMAGE_SOURCE`. `cta` defaults "Shop Now";
   `price` has a leading `$` stripped.
7. **Theme block reused verbatim** from `ads/cta-pause.json` (`pause_to_shop_screen`,
   `product_detail_screen`), so both pause modes share campaign assets.

## Knobs you may edit

| Knob | Location | Why |
|---|---|---|
| `TIME_BASE` | top of the script | Clip-native vs. 44-min source. Keep aligned with `DHYH_TIER_TIME_BASE`. |
| `IMAGE_SOURCE.mode` / `s3Base` | top of the script | Switch image hosting (local/CDN/S3). |
| `DEDUPE_WINDOW_SECONDS` | top of the script | Mirror `PRODUCT_DEDUPE_WINDOW_SECONDS` in `src/demo/constants.ts`. |
| `MAX_PRODUCTS_PER_MOMENT` | top of the script | Carousel cap (5). Coordinate with `MAX_TILES_PER_MOMENT` in `pauseMoments.ts`. |
| `SPLICE_DEFAULT` | `scripts/lib/pause-moments-core.mjs` | Only for `source-splice` mode; mirror `timeline.ts` segment constants. |

## File paths

- Generator: `scripts/generate-organic-pause-moments.mjs`
- Shared core: `scripts/lib/pause-moments-core.mjs`
- Source: `src/demo/content/<id>/tiers/tier3.json`
- Theme source: `src/demo/content/<id>/ads/cta-pause.json`
- Output: `src/demo/content/<id>/ads/organic-pause.json`
- Adapter: `src/demo/content/<id>/pauseMoments.ts`
- Tests: `tests/unit/pauseMoments.test.ts`

## Skill maintenance

Don't hand-edit the generated `organic-pause.json` — re-run the generator. If the
dedupe/cap/time-base/image rules change, update the script + this skill + the
tests together. The CTA and Organic generators share the core module, so a fix
there applies to both — keep both skills' "two knobs" sections in sync.
