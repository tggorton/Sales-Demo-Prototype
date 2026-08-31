---
name: add-content
description: Add a new content tile to the demo's content-selection grid — taxonomy / product / JSON panels working end-to-end, ads OFF by default until the per-content ad creatives + compliance JSONs are produced. Wraps `scripts/create-content-scaffold.mjs` which generates the per-content scaffold (`timeline.ts`, `config.ts`, `scenes.ts`) and patches the FOUR registry files (`resolveTierPayload.ts`, `content/index.ts`, `contentItems.ts`, `hooks/useDemoPlayback.ts`) from a single JSON spec. Use whenever you're wiring a freshly-normalized content batch into the app. Ads are deliberately out-of-scope for this skill; wire them as a follow-up step using `/add-new-ad-playback-mode` per mode.
---

# Skill: `/add-content`

The final wiring step before a new content tile is playable in the demo.

> **Quick relationship**:
> `/normalize-tier-jsons` (structural prep) → `/align-tier-jsons` (app-readiness) → **`/add-content` (wire into the app)** → tile appears in the selector, panels work, ads OFF.

This skill assumes you've already produced the three b-files for the new content (`<prefix>tier{1,2,3}b.json`) and have the video + poster ready to drop in.

## When to invoke

- A normalized content batch is ready to be wired into the demo's selector.
- After running `/normalize-tier-jsons` + `/align-tier-jsons`, when you want to see the tile in the browser.

If you don't have the b-files yet, run `/normalize-tier-jsons` first.

## Input: a JSON spec

Drop a spec file anywhere (e.g. `/tmp/<id>-spec.json`) with these fields:

```jsonc
{
  // Stable id — kebab-case (letters, digits, hyphens). Becomes the
  // directory name + the env-var prefix + the content-id string the
  // rest of the app dispatches on.
  "id":                  "home-improvement",

  // Display title — shown on the content-selection grid + the title bar.
  "title":               "Home Improvement",

  // Tile categories — the array the content-selection filter chips use.
  "categories":          ["Reality TV", "Home & Garden"],

  // Clip duration in seconds. Read this from the b-file's
  // `duration_in_seconds` field — keep them in sync.
  "clipDurationSeconds": 358.4,

  // Where the Sync / Sync: L-Bar / Sync: Impulse ad break sits on the clip
  // timeline. End-of-clip = `clipDurationSeconds`. Mid-clip splice = a
  // different value, e.g. 107 for a clip with two segments meeting at 1:47.
  "adBreakClipSeconds":  358.4,

  // 'clip'   — tier JSON timestamps are already on the trimmed-clip axis
  //            (default for partner-delivered content; what
  //            /normalize-tier-jsons produces).
  // 'source' — tier JSON timestamps are on the full-source episode axis
  //            and get remapped through splice constants (DHYH-style only).
  "tierTimeBase":        "clip",

  // Filenames you'll drop into public/assets/ — the script doesn't
  // copy the assets itself, just records the paths.
  "videoFileName":       "home-improvement.mp4",
  "posterFileName":      "home-improvement.png",

  // Env-var name for the optional video URL override. Convention:
  // `VITE_<UPPER_SNAKE>_VIDEO_URL`. Used by the scaffold's
  // `envString(...)` call.
  "envVideoUrlVar":      "VITE_HOME_IMPROVEMENT_VIDEO_URL"
}
```

A copy of the MasterChef spec lives at `analysis/MASTERCHEF-CONTENT-SPEC.json` — fastest way to start a new one is `cp` + edit.

## The procedure

### 1. Drop the four asset files into place

Before running the script:

```bash
# Tier JSONs (from /normalize-tier-jsons output; drop the "b" suffix)
mkdir -p src/demo/content/<id>/tiers
cp <prefix>tier1b.json  src/demo/content/<id>/tiers/tier1.json
cp <prefix>tier2b.json  src/demo/content/<id>/tiers/tier2.json
cp <prefix>tier3b.json  src/demo/content/<id>/tiers/tier3.json

# Video file
cp <path-to-trim>.mp4   public/assets/video/<videoFileName>

# Poster image
cp <path-to-poster>.png public/assets/posters/<posterFileName>
```

(You can also run the script first — it creates the `tiers/` directory with a `.gitkeep` placeholder. Drop the JSONs in after.)

### 2. Run the scaffold script

```bash
node scripts/create-content-scaffold.mjs <path-to-spec.json>
```

The script:
- **Refuses to clobber** an existing `src/demo/content/<id>/` directory (idempotent).
- **Creates** `src/demo/content/<id>/`:
  - `timeline.ts` — content constants (id, video URL, clip duration, ad-break placement, time base)
  - `config.ts` — `ContentConfig` with empty `defaultAdModes` (ads OFF)
  - `scenes.ts` — thin wrapper around the shared `getScenesForContent` loader
  - `tiers/.gitkeep` — reminder to drop the tier JSONs
- **Patches three registries**:
  - `src/demo/sources/resolveTierPayload.ts` — adds the bundled tier loaders block (key is always quoted so kebab-case ids parse)
  - `src/demo/content/index.ts` — registers the `ContentConfig` (and the new id automatically opts in to `BUNDLED_CONTENT_IDS` since that set is derived from the registry)
  - `src/demo/data/contentItems.ts` — adds the `ContentItem` and appends the id to `ENABLED_CONTENT_IDS`

### 2b. The four registries — and the failure mode when one is missed

The script patches four files. `useDemoPlayback.ts`'s **`SCENE_LOADERS`** is the
one that actually makes the tier JSONs load, and it was missing from the script
until 2026-08-31.

**Symptom when it's missed:** the tile builds, `tsc` passes, the tile appears on
the grid, and the demo renders the placeholder `SCENE_METADATA` instead of the
real data — which presents as "the JSONs aren't activated": a near-empty Object
panel and product cards showing **another content's imagery**. Nothing errors.

If a new tile looks empty, check `SCENE_LOADERS` first.

### 2c. CTA Pause + Organic Pause are NOT optional

Every other ad mode (`Sync`, `Sync: L-Bar`, `Sync: Impulse`, `Pause Ad`) needs a
produced creative, so those can wait. **CTA Pause and Organic Pause cannot** —
they are generated *from the content's own tier3 products*, so they are
available the moment the tier JSONs land. Treat them as part of standing up a
new content, not as follow-up ad work.

```bash
mkdir -p src/demo/content/<id>/ads
cp src/demo/content/dhyh/ads/cta-pause.json src/demo/content/<id>/ads/   # theme seed only
node scripts/generate-cta-pause-moments.mjs --content <id> --windows a-b,c-d
node scripts/generate-organic-pause-moments.mjs --content <id>           # reads cta-pause.json
```

Then: copy `pauseMoments.ts` from an existing content, add
`<ID>_CTA_PAUSE_WINDOWS` + `<ID>_ORGANIC_PAUSE_CTA_END_SECONDS` to `timeline.ts`,
register in `PAUSE_MOMENTS_REGISTRY` (`content/index.ts`), and list both modes
under `adModesByTier['Exact Product Match']` in `config.ts`.

**Pick the CTA windows from product density, not arbitrarily** — bucket the clip
and put a window right after the ad break plus one over the densest stretch.

### 2d. Product images — the check that is easy to miss

Tile images in the pause overlays resolve through `resolveProductImageUrl`, which
handles both an absolute CDN URL and a bare filename. **Drop the content's
product images into `public/assets/products/` and confirm a tile actually
renders** — a missing file silently falls back to the campaign placeholder, so
the overlay looks "designed" rather than broken and the fault is easy to miss.

```bash
# every pause tile has a local image?
python3 - <<'EOF'
import json, os
for f in ('cta-pause','organic-pause'):
    d=json.load(open(f'src/demo/content/<id>/ads/{f}.json'))
    t=[p for c in d['campaign'] for s in c['scenes'] for o in s['objects'] for p in o['product_match']]
    miss=[p['image'] for p in t if not p['image'].startswith('http')
          and not os.path.exists('public/assets/products/'+p['image'])]
    print(f, len(t), 'tiles,', len(miss), 'missing')
EOF
```

### 2e. Retail title lengths differ wildly per feed

Tile titles are truncated to a fixed budget in `buildPauseOverlayPayload`
(`TILE_TITLE_MAX_CHARS`, currently 68) so a tile looks the same whatever content
is loaded. Do NOT rely on the CSS line-clamp alone — the tile's title and CTA are
both absolutely positioned, and at small player widths the font `clamp()` floors
stop scaling with the tile, so long titles grow into the "Shop Now" CTA.

Feed medians seen so far: DHYH 85 chars, Abbott **112** (max 198). Abbott also
omits the space after commas (`"Backpacks,Fashion"`), producing tokens that
cannot word-wrap — hence `overflowWrap: 'anywhere'` on the tile title.

The FULL title stays on the detail card and in the product-destination modal.
When adding content, eyeball one carousel tile with the longest title in the
feed:

```bash
python3 -c "
import json
d=json.load(open('src/demo/content/<id>/ads/cta-pause.json'))
t=[p['name'] for c in d['campaign'] for s in c['scenes'] for o in s['objects'] for p in o['product_match']]
print('longest:', max(len(x) for x in t)); print(max(t,key=len))"
```

### 2f. Affiliate links with unsubstituted macros

Retail feeds often ship `link`/`qr` as an affiliate wrapper holding a publisher
macro, e.g. `https://goto.walmart.com/c/|PUBID|/568844/9383?…&u=<encoded url>`.
Unsubstituted, the retailer returns a **"malformed link"** error (verified: 404),
so QR codes and product click-outs are dead.

`unwrapAffiliateUrl` in `content/_shared/pauseMoments.ts` handles this — if a
macro is still present it falls back to the wrapper's `u=` parameter (the real
product page); once the macro is substituted the wrapper is used as-is so
attribution survives. Direct URLs (DHYH's homedepot.com links) pass through.

**Check a new feed** and flag it to whoever owns the live deployment:

```bash
python3 -c "
import json
d=json.load(open('src/demo/content/<id>/ads/cta-pause.json'))
q=[p['qr'] for c in d['campaign'] for s in c['scenes'] for o in s['objects'] for p in o['product_match']]
print(sum(1 for x in q if '|' in x or '{' in x), 'of', len(q), 'qr urls carry an unsubstituted macro')"
```

### 3. Verify

```bash
npm run build         # tsc -b + vite — Vercel's build pipeline, catches more than --noEmit
npm run test:run      # full suite
npm run dev           # open http://localhost:5173/ — new tile appears on the grid
```

In the browser:
- The new tile shows up under its first category.
- Clicking through opens the demo with the video loading.
- The Ad Playback Mode dropdown is **empty** (ads OFF).
- The Tier dropdown works (Basic / Advanced / Exact Product Match all load tier JSONs).
- Taxonomy / Product / JSON panels light up from the tier JSONs.

## What this skill explicitly does NOT do

- **Ad modes.** Every new content starts with `defaultAdModes: []`. Wiring an ad mode (Sync, Sync: L-Bar, Sync: Impulse, Pause Ad, CTA Pause, Organic Pause) is a separate step — see `/add-new-ad-playback-mode` and the per-mode `config.ts` in `src/demo/ad-modes/modes/`.
- **CTA Pause / Organic Pause JSONs.** These are generated from the new content's `tier3.json` via `/generate-cta-pause-json` and `/generate-organic-pause-json` — only meaningful once you're ready to wire those two modes.
- **Editorial-location timeline overlay** (the DHYH-specific kitchen/bathroom band sequence). Non-DHYH content gets the model's own per-scene location data verbatim. If a curated overlay is wanted for a new content, that's a per-content addition to `scenes.ts`.
- **Source-splice handling.** Both DHYH (two-segment splice on a 44-min source) and clip-native content (a straight trim) flow through the shared parser. The script defaults to `tierTimeBase: 'clip'`. Set to `'source'` ONLY when delivering a splice + the segment constants in `timeline.ts` to match.

## Architecture notes — what the refactor on 2026-06-15 changed

- `BUNDLED_CONTENT_IDS` (in `src/demo/content/index.ts`) is derived from `CONTENT_REGISTRY` keys. **Adding a new content automatically opts in to bundle-driven playback** — `useDemoPlayback` no longer needs an `is<id>Content` flag per content.
- The generic `getScenesForContent(contentId, tier, clipDurationSeconds)` loader lives in `src/demo/content/dhyh/scenes.ts` and routes by `contentId`. Per-content `scenes.ts` wrappers are thin convenience exports (~10 lines) — they're created by the script but not strictly required.
- DHYH-specific behaviors inside the shared parser (editorial-location timeline, source-time → clip-time remap) are gated on `contentId === DHYH_CONTENT_ID`. Other content gets clean pass-through.
- Duration-related calculations in `useDemoPlayback` use the pattern `hasBundledContent && !isDhyhContent && dhyhBundle ? dhyhBundle.duration : …` so new content's clip duration flows automatically.

## Per-content isolation rule (2026-06-15 evening refactor)

**Every content tile owns all its own ad data. Nothing in MasterChef references anything in DHYH (or vice versa), and adding/removing one content never touches another.**

### Where per-content data lives

| Concern | Lives at | Owns it? |
|---|---|---|
| Content config (id, title, video URL, ad-mode availability) | `src/demo/content/<id>/config.ts` | Per-content |
| Tier JSONs (T1/T2/T3) | `src/demo/content/<id>/tiers/` | Per-content |
| Pause-overlay JSONs (CTA Pause, Organic Pause) | `src/demo/content/<id>/ads/cta-pause.json`, `organic-pause.json` | Per-content |
| Sync / Pause Ad creative URLs + compliance JSON | **`config.ts`'s `adAssets[mode]` map** | Per-content |
| Pause-overlay theme assets (CTA image, tile bg, detail bg) | `public/assets/pause-overlay/<id>/…` | Per-content |
| Pause-moment resolvers (CTA + Organic windows + clip-time logic) | `src/demo/content/<id>/pauseMoments.ts` + `timeline.ts` | Per-content |
| Tier loader (Vite-chunked JSON imports) | One entry in `src/demo/sources/resolveTierPayload.ts` | Per-content |
| Pause-moments registry entry (resolvers + CTA windows) | One entry in `src/demo/content/index.ts` `PAUSE_MOMENTS_REGISTRY` | Per-content |

### What's content-agnostic (shared)

| Concern | Lives at | Notes |
|---|---|---|
| Ad-mode metadata (id, label, enabled, kind) | `src/demo/ad-modes/modes/<mode>/config.ts` | Pure metadata, ~5 lines per mode. No creative URLs, no compliance payloads. |
| `getScenesForContent(...)` parser | `src/demo/content/dhyh/scenes.ts` | Routes by contentId; DHYH-specific overlays gated on `contentId === DHYH_CONTENT_ID` |
| Overlay chrome (exit button SVG, scan-QR SVG) | `public/assets/pause-overlay/exit.svg`, `scan-qr-message.svg` | Shared |

### The `adAssets` map per content

`ContentConfig.adAssets` is the SINGLE SOURCE OF TRUTH for per-content ad creatives + compliance JSON. Each entry has the shape:

```ts
{
  videoUrl?: string              // Sync-style modes (Sync, L-Bar, Impulse): MP4 URL
  durationSeconds?: number       // Sync-style modes: ad-break duration to match the MP4
  imageUrl?: string              // Pause Ad mode: static creative URL
  compliancePayload?: object     // Any mode: JSON shown in the JSON panel during the ad
  responseLabel?: string         // Any mode: JSON-panel header override (e.g. '_PauseAd Response')
}
```

To wire a new ad mode for an existing content:
1. Add the per-content creative + compliance JSON files (under `src/demo/content/<id>/ads/` or `public/assets/.../<id>/`)
2. Import the compliance JSON in the content's `config.ts`
3. Add an entry to `adAssets[mode]` with the URL + payload
4. Add the mode id to `defaultAdModes` or `adModesByTier`

That's it. No ad-mode config edits, no `useDemoPlayback` edits.

### Adding / removing a content tile

**Add**: drop folder + run the scaffold script (this skill). The new content's `config.ts` owns all its data; nothing else changes.

**Remove**: delete `src/demo/content/<id>/`, remove the loader entry in `resolveTierPayload.ts`, remove the `CONTENT_REGISTRY` + `PAUSE_MOMENTS_REGISTRY` entries in `content/index.ts`, remove the `ContentItem` + `ENABLED_CONTENT_IDS` entry in `contentItems.ts`. No other content is affected.

### Reading the playback hook

`useDemoPlayback` computes `contentAdAssets = getContentConfig(selectedContent?.id)?.adAssets?.[selectedAdPlayback]` at the top of the body. Every downstream read for creative URLs, compliance payloads, ad-break duration, and JSON-panel labels flows through `contentAdAssets`. There is no longer ANY `activeMode.dhyh*` read in the hook — the previous fallback pattern was removed because it made the data flow ambiguous.

## Pitfalls (and the fixes baked into the script)

1. **Kebab-case object keys are a TS syntax error.** The script always quotes the `bundledTierLoaders` key so `home-improvement: {` becomes `'home-improvement': { …`.
2. **The `Grant Gorton` path has spaces** — the script uses `fileURLToPath(import.meta.url)` not `new URL(...).pathname` so URL-encoded `%20`s don't end up in the resolved paths.
3. **The `bundledTierLoaders` close is easy to mismatch.** The script anchors its regex on the `const bundledTierLoaders` declaration and walks to the LAST `  },\n}` close so it doesn't accidentally inject into the close of `remoteBaseUrl` (which is what an earlier draft did — caught by the smoke test).
4. **Idempotency**: re-running the script with the same id bails out at the pre-flight check (target dir exists). To re-scaffold: delete `src/demo/content/<id>/` AND revert the three registry-file patches.
5. **Vite dynamic imports need literal paths.** The script's tier loaders use literal `import('../content/<id>/tiers/tierN.json')` calls (no template vars in the import path) so Vite can chunk them per-content. Don't try to make the loaders dynamic.

## Hand-off

After the tile is visible and panels work:

1. **CTA Pause + Organic Pause** — see 2c. Required, not optional.
1. (Optional) Curated editorial overlays specific to this content — edit `src/demo/content/<id>/scenes.ts` or extend the shared parser with new contentId gates.
2. **Ad wiring** — when creatives are ready:
   - Sync / Sync: L-Bar / Sync: Impulse → add per-content ad-break creative + compliance JSON, register in the ad-mode config.
   - Pause Ad → drop the still creative into `src/demo/content/<id>/ads/` and wire `pauseAdMode` config.
   - CTA Pause / Organic Pause → run `/generate-cta-pause-json` and `/generate-organic-pause-json` against `tier3.json`, then add a `pauseMoments.ts` parallel to `src/demo/content/dhyh/pauseMoments.ts`, and update the content's `config.ts` `adModesByTier`.
3. **Deploy** — push to `origin/main` (or `v2` depending on target). The new tier JSONs ship as part of the Vite build.

## Skill maintenance

When ad-mode wiring becomes a per-content concern (which it will, with three more contents incoming + CTA / Organic Pause as the first ad modes to add), update this skill to document the ad-mode wiring step. The script can grow to also patch the ad-mode configs at that point.

## File paths

- Script: `scripts/create-content-scaffold.mjs`
- Spec template / example: `analysis/MASTERCHEF-CONTENT-SPEC.json` (reference)
- Per-content output: `src/demo/content/<id>/`
- Registry patches:
  - `src/demo/sources/resolveTierPayload.ts`
  - `src/demo/content/index.ts`
  - `src/demo/data/contentItems.ts`
- Assets land at:
  - `public/assets/video/<videoFileName>`
  - `public/assets/posters/<posterFileName>`
