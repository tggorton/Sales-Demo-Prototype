---
name: generate-cta-pause-json
description: Generate `src/demo/content/<id>/ads/cta-pause.json` from a content tile's Tier 3 product data using `scripts/generate-cta-pause-moments.mjs`. CTA Pause shows the pause-to-shop CTA only inside fixed editorial windows; this fills those windows with scene-accurate, time-stamp-correct top-5 products. Use when Tier 3 changes, the CTA windows move, the image host changes, or the user asks to "regenerate / refresh CTA pause".
---

# Skill: `/generate-cta-pause-json`

Generate the CTA Pause document for a content tile from its **Tier 3** product
data. CTA Pause reveals the pause-to-shop carousel **only inside fixed editorial
windows** (`DHYH_CTA_PAUSE_WINDOWS` in `timeline.ts`). The generator tiles each
window with scene-accurate moments so any pause inside a window resolves to the
**time-accurate top-5 products** at that clip-time; pausing outside a window does
nothing.

> **History:** this skill was `convert-pause-moments-json` (it converted a
> partner-supplied "moments" JSON by hand). The product source is now **Tier 3**
> directly, and the latest Tier 3 batch (e.g. `DB-DemoVid1`) is the **canonical
> format going forward** — clip-native timestamps, real product titles +
> descriptions + links, CDN image URLs. Older partner/test JSONs are legacy.

## When to invoke

- Tier 3 (`tiers/tier3.json`) changed and CTA Pause should track it.
- The editorial CTA windows changed (keep in sync with `DHYH_CTA_PAUSE_WINDOWS`).
- The image host changes (local ↔ CDN ↔ S3 — see below).
- The user asks to "regenerate / refresh / rebuild CTA pause".

## What this skill does

1. **Confirm the content id** (default DHYH = `src/demo/content/dhyh/`). For another tile, the recipe applies but paths + windows swap.
2. **Read the script** `scripts/generate-cta-pause-moments.mjs` and the shared core `scripts/lib/pause-moments-core.mjs`. The scripts are the source of truth; this skill is the companion. If they've drifted, trust the script and update this skill.
3. **Check the knobs** at the top of the script (below): `TIME_BASE`, `IMAGE_SOURCE`, `CTA_PAUSE_WINDOWS`, dedupe window, max products.
4. **Run** the generator from the project root:
   - DHYH (default — windows hardcoded): `node scripts/generate-cta-pause-moments.mjs`
   - Any other content: `node scripts/generate-cta-pause-moments.mjs --content <id> --windows <a-b>,<c-d>` (e.g. `--content masterchef --windows 30-75,135-195`)
   - For a fresh content tile, **seed `src/demo/content/<id>/ads/cta-pause.json`** first with a minimal `{ campaign: [{ campaign_id, pause_to_shop_screen, product_detail_screen, scenes: [] }] }` document — the script reuses the theme block from the existing file, so it needs something to read from.

## Per-content theme assets (2026-06-15 convention)

Each content tile **owns its own pause-overlay theme assets** — MasterChef must never reference `dhyh/`-prefixed files, and vice versa. The split is enforced by the JSON theme URLs:

| Theme field | Convention | Example (MasterChef) |
|---|---|---|
| `pause_to_shop_screen.cta_url` | Per-content PAUSE TO SHOP image (or tracker URL). Local path under `public/assets/pause-overlay/<id>/`, OR an absolute partner CDN URL whose path is unambiguously "owned" by that content. | `/assets/pause-overlay/masterchef/pause-to-shop.png` |
| `pause_to_shop_screen.selected_product_background_image` | Per-content focused-tile background image. Same per-content asset rule. | (Wayfair: `selected_product_background_color: #7B189F` is set instead, so this field is unused.) |
| `pause_to_shop_screen.selected_product_background_color` | Optional hex; overrides the image when both are set. Lets a campaign brand the focused tile with a solid color (e.g. Wayfair `#7B189F`). | `#7B189F` |
| `product_detail_screen.background_image` | Per-content detail-card background. Same per-content asset rule. | (Wayfair: replaced by the color field below.) |
| `product_detail_screen.background_color` | Optional hex; overrides the image when both are set. | `#7B189F` |
| `pause_to_shop_screen.sponsored_by_logo_url` | Per-content sponsor logo. Empty string → render nothing. | `""` |
| `product_detail_screen.shop_logo_url` | Per-content detail sponsor logo. Empty string → render nothing. | `""` |

**Directory layout:**
```
public/assets/pause-overlay/
├── exit.svg                 # shared (overlay chrome)
├── scan-qr-message.svg      # shared (overlay chrome)
├── product-detail-bg.svg    # shared default; per-content backgrounds can override
├── dhyh/                    # (DHYH uses partner CDN URLs; this folder may be empty)
└── masterchef/
    └── pause-to-shop.png    # placeholder until the per-content purple version arrives
```

Future content tiles should create their own `<id>/` subfolder and drop the per-content theme assets in. Adding a Wayfair-purple `pause-to-shop.png` for MasterChef later is a one-file swap — overwrite the placeholder.
5. **Verify** with `npm run build` (the JSON is bundled at compile time) and `npx vitest run tests/unit/pauseMoments.test.ts tests/unit/pauseWindows.test.ts --reporter=dot`.
6. **Diff + report** moment count, total tiles, and that every CTA window is fully tiled (no dead pause-time inside a window).

## The two knobs (shared with Organic Pause)

Both live at the top of the script and are documented in `scripts/lib/pause-moments-core.mjs`.

### `TIME_BASE` — clip-native vs. source-splice
- **`'clip'`** (current / canonical): Tier 3 scenes are already on the playable
  clip timeline (`DB-DemoVid1`, processed natively from the spliced mp4). Times
  pass through 1:1. **Works for any content length** — a 10-min clip, a full
  44-min native export, or a segment export. Default going forward.
- **`'source-splice'`**: Tier 3 is on a longer SOURCE timeline and the playable
  clip is a splice of segments (the legacy 44-min `DHYH1` case). Times are
  remapped via the segment windows; scenes outside every segment are dropped.

> The app has a matching flag: `DHYH_TIER_TIME_BASE` in `timeline.ts`. Keep the
> generator's `TIME_BASE` consistent with it.

### `IMAGE_SOURCE` — local ↔ CDN ↔ S3 (easy hosting swap)
```js
const IMAGE_SOURCE = { mode: 'cdn', s3Base: 'https://<bucket>.s3.amazonaws.com/products' }
```
- **`'cdn'`** (current): use each product's own absolute `image` URL as-is.
- **`'local'`**: emit `/assets/products/homedpt/<product_id>.<ext>`. A backup of
  the current images is gitignored under `_archive/product-images-DB-DemoVid1-*/`;
  copy them into `public/assets/products/homedpt/` to serve locally.
- **`'s3'`**: emit `${s3Base}/<product_id>.<ext>`.

To move hosting, change `mode` (+ `s3Base`) and **re-run** — the JSON carries a
ready-to-use URL, so **no app change is needed** (the adapter uses `image` directly).

## CTA-window logic (scene-accurate within windows)

`CTA_PAUSE_WINDOWS` in the script **must mirror** `DHYH_CTA_PAUSE_WINDOWS` in
`timeline.ts` (clip-time seconds). For each window the generator:

1. Places a moment boundary at the window start and at every product-scene start
   inside the window.
2. Each moment runs to the next boundary (or the window end) → the **whole window
   is tiled**, so any pause inside resolves to a moment.
3. Each moment shows the **trailing-5** deduped products at its start time (same
   rolling logic as the Products panel + Organic Pause). 5 is the cap to keep the
   carousel simple.

Pauses outside the windows have no moment (CTA-gated), matching in-app CTA visibility.

## Product + theme mapping (shared core)

Per product: `product_id`, `name`, **`description` (real Tier 3 copy)**, `cta`
(defaults "Shop Now"), `price` (leading `$` stripped), `image` (per `IMAGE_SOURCE`),
and **`qr` = Tier 3 `link`** (the destination URL rendered as a client-side QR +
opened in the click-out modal — NOT Tier 3's `qr`, which is a pre-rendered QR
image we don't use). Trackers / `loc_id` / `confidence` are dropped.

The **theme block** (`pause_to_shop_screen`, `product_detail_screen` —
designer/client CTA + sponsor assets) is **preserved verbatim** from the existing
`cta-pause.json`, and `campaign_id` is carried through. Organic Pause reuses it.

## File paths

- Generator: `scripts/generate-cta-pause-moments.mjs`
- Shared core: `scripts/lib/pause-moments-core.mjs`
- Source: `src/demo/content/<id>/tiers/tier3.json`
- Output / theme source: `src/demo/content/<id>/ads/cta-pause.json`
- Editorial windows: `DHYH_CTA_PAUSE_WINDOWS` in `src/demo/content/<id>/timeline.ts`
- Adapter: `src/demo/content/<id>/pauseMoments.ts`
- Tests: `tests/unit/pauseMoments.test.ts`, `tests/unit/pauseWindows.test.ts`

## Skill maintenance

Keep `CTA_PAUSE_WINDOWS` (script) and `DHYH_CTA_PAUSE_WINDOWS` (timeline.ts) in
sync. If editorial direction, theme handling, QR rendering, or the dedupe/cap
rules change, update the script + this skill + the tests together. Don't hand-edit
the generated `cta-pause.json` — re-run the generator.
