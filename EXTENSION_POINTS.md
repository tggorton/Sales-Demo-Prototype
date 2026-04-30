# Extension Points — Cookbook

**Audience:** Engineers (and AI tools) implementing routine additions: new ad modes, content tiles, taxonomies, auth providers, media sources.
**Pairs with:** [`HANDOFF.md`](HANDOFF.md), [`RESTRUCTURING_PLAN.md`](RESTRUCTURING_PLAN.md), [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md).
**Last updated:** 2026-04-27.

This document is the **recipe book**. When you (or an AI assistant) need to do something routine, look it up here first. If the task doesn't have a recipe yet, add one once you've figured it out — that's how this document grows.

> **Status of recipes**
>
> | Recipe | Status |
> |---|---|
> | Swap auth provider (mock ↔ Cognito stub) | ✅ Ready |
> | Override a media URL via env var | ✅ Ready |
> | Enable a commented-out ad mode | ✅ Ready (registry-driven — see `src/demo/ad-modes/README.md`) |
> | Add a brand-new ad mode | ✅ Ready (registry-driven — see `src/demo/ad-modes/README.md`) |
> | Add a new content tile | ⚠️ Possible but not formalized; see Phase 5 |
> | Add a new taxonomy | ✅ Ready (small change) |
> | Wire Cognito live | ⏳ Stub in place; details when AWS pool is ready |
> | Switch tier JSON / product images to S3 | ✅ Ready (env-flag swap — see `src/demo/sources/README.md`) |
> | Upload a new content package | ⏳ Resolver layer ready; manifest registry + UI deferred to Phase 5 |

A ⚠️ recipe means the task is doable today but the codebase pattern isn't yet ergonomic. Following the recipe will get you there; the same task will become significantly cleaner after the corresponding restructuring phase lands.

---

## Recipe: Swap auth provider (mock ↔ Cognito stub)

**Status:** ✅ Ready
**Pattern owner:** [`src/demo/auth/`](src/demo/auth/)

### Steps

1. Create / edit `.env.local` in the project root:
   ```bash
   VITE_AUTH_PROVIDER=mock      # current prototype behavior (default)
   VITE_AUTH_PROVIDER=cognito   # real Cognito (currently throws — see auth/README.md)
   ```
2. Restart the dev server (Vite reads env vars at startup).
3. Verify: log in with `user@kerv.ai` / `SalesDemoTest` (mock) — succeeds. Cognito mode will throw until the live integration is wired.

### To wire Cognito live

See the integration checklist in [`src/demo/auth/README.md`](src/demo/auth/README.md). Six steps; mostly mechanical once the User Pool details are available.

---

## Recipe: Override a media URL via env var

**Status:** ✅ Ready
**Pattern owner:** [`src/demo/constants.ts`](src/demo/constants.ts) (uses `envString` helper from [`src/demo/utils/env.ts`](src/demo/utils/env.ts))

### Why you'd do this

Point the player at a higher-fidelity local copy, an S3-hosted file, or a staging asset without changing code. The defaults resolve to bundled `public/assets/` files, which is fine for local dev and for the current Vercel deploy.

### Steps

1. Find the relevant constant in [`src/demo/constants.ts`](src/demo/constants.ts) — e.g. `DHYH_VIDEO_URL`, `PLACEHOLDER_VIDEO_URL`, or in [`src/demo/ad-modes/modes/<id>/config.ts`](src/demo/ad-modes/) for ad creatives.
2. Add the corresponding `VITE_*` key to `.env.local`. Example:
   ```bash
   VITE_DHYH_VIDEO_URL=https://kerv-cdn.example.com/dhyh-cmp.mp4
   ```
3. Restart Vite. The `envString(key, fallback)` resolver picks up the override; if the env var is empty or missing, the bundled default is used.

### Available keys

See [`.env.example`](.env.example) (kept in sync with the actual constants).

---

## Recipe: Switch tier JSON / product images to S3

**Status:** ✅ Ready
**Pattern owner:** [`src/demo/sources/`](src/demo/sources/) — full cookbook in [`src/demo/sources/README.md`](src/demo/sources/README.md).

### Why you'd do this

Today, tier JSONs (`tier1.json` / `tier2.json` / `tier3.json`) and product images ship bundled with the app. To host them on S3 / CloudFront — for example to roll out updated analysis without redeploying the frontend, or to keep the Vercel build small — set one env var. The resolver layer handles the swap.

### Steps

1. Upload tier JSONs and product images to your bucket / CDN at the path
   structure documented in [`src/demo/sources/README.md`](src/demo/sources/README.md):
   ```
   {base}/
   └── {contentId}/             # e.g. dhyh/
       ├── tier1.json
       ├── tier2.json
       ├── tier3.json
       └── products/
           └── {image_path}     # e.g. homedpt/335027444.jpg
   ```
2. Add to `.env.local` (or your production deploy env):
   ```bash
   VITE_CONTENT_SOURCE_BASE_URL=https://kerv-content.example.com
   ```
3. Restart Vite / rebuild. Tier JSONs are now fetched from the base URL; product images route through it (or use their existing absolute `image_url` when present).

### Reverting

Unset `VITE_CONTENT_SOURCE_BASE_URL` and the build resumes using bundled local copies — full reversibility.

---

## Recipe: Upload a new content package (FUTURE)

**Status:** ⏳ Resolver layer ready; backend + UI + manifest registry deferred (Phase 5 in `RESTRUCTURING_PLAN.md`)
**Pattern owner:** [`src/demo/sources/`](src/demo/sources/) — see "Future: content upload pipeline" in its README.

### Where the resolver layer fits

When a user uploads a content zip, the backend extracts to S3 under a new
`contentId`. The app's `resolveTierPayload(contentId, tier)` and
`resolveProductImageUrl(contentId, ...)` already accept the content id as a
parameter, so once the manifest registry exists and points
`getDhyhScenesForTier` (or its content-tile-aware successor) at the right
content id, no further refactoring is needed in the resolver layer.

### What's still needed (Phase 5 work)

- A manifest schema and per-content registry (where `DHYH_*` constants in
  `constants.ts` and the DHYH-specific code in `dhyhScenes.ts` live today).
- An upload UI + backend endpoint that extracts zips and writes the manifest.
- A way for `useDemoPlayback` to dispatch on `selectedContent.id` rather than
  hardcoding `dhyh` everywhere.

The current build is the right shape to slot all that in when the team
prioritizes it; today's resolver covers the data-fetching half of the work.

---

## Recipe: Enable a commented-out ad mode

**Status:** ✅ Ready
**Pattern owner:** [`src/demo/ad-modes/`](src/demo/ad-modes/) — full cookbook in [`src/demo/ad-modes/README.md`](src/demo/ad-modes/README.md).

The five currently-disabled modes are `Pause Ad`, `CTA Pause`, `Organic Pause`, `Carousel Shop`, and `Companion`. Each has a stub config under `src/demo/ad-modes/modes/<id>/config.ts`.

### Steps

1. **Open the mode's config** in `src/demo/ad-modes/modes/<id>/config.ts`.
2. **Set `enabled: true`** and add the three DHYH-specific fields if it's a sync-style ad-break mode:
   ```ts
   dhyhAdDurationSeconds: 30,
   dhyhAdVideoUrl: envString('VITE_DHYH_<UPPER_ID>_AD_VIDEO_URL', '/assets/ads/<file>.mp4'),
   dhyhCompliancePayload: fixtures as Record<string, unknown>,
   ```
3. **Add the creative** (`public/assets/ads/<file>.mp4`).
4. **Add `fixtures.json`** in the mode's folder.
5. Run `npm run build`. The dropdown picks the mode up automatically because `ENABLED_AD_MODE_IDS` is derived from the registry.

If the mode introduces UI behavior that doesn't fit the existing sync-ad-break pattern (e.g. `Pause Ad` shows a static image, `CTA Pause` shows an in-content CTA overlay), you'll also need to add a new branch in `DemoView.tsx` / `useDemoPlayback.ts`. See `src/demo/ad-modes/README.md` for the full breakdown of which behaviors the registry currently owns vs. which still flow through the playback hook.

---

## Recipe: Add a brand-new ad mode

**Status:** ✅ Ready
**Pattern owner:** [`src/demo/ad-modes/`](src/demo/ad-modes/)

### Steps

1. **Add the type literal** to `AdPlaybackOption` in `src/demo/types.ts`.
2. **Create the folder:** `src/demo/ad-modes/modes/<id>/` (kebab-case to match siblings).
3. **Add `config.ts`:**
   ```ts
   import { envString } from '../../../utils/env'
   import type { AdModeDefinition } from '../../types'
   import fixtures from './fixtures.json'

   export const newMode: AdModeDefinition = {
     id: 'New Mode',
     label: 'New Mode',
     enabled: true,
     dhyhAdDurationSeconds: 30,
     dhyhAdVideoUrl: envString('VITE_DHYH_NEW_MODE_AD_VIDEO_URL', '/assets/ads/your-file.mp4'),
     dhyhCompliancePayload: fixtures as Record<string, unknown>,
   }
   ```
4. **Add `fixtures.json`** in the same folder.
5. **Register it** in `src/demo/ad-modes/registry.ts`:
   ```ts
   import { newMode } from './modes/<id>/config'

   export const AD_MODE_REGISTRY: AdModeRegistry = {
     // ... existing entries
     'New Mode': newMode,
   }
   ```
6. Drop the creative into `public/assets/ads/`.
7. Run `npm run build`. Selector dropdown picks it up automatically.

---

## Recipe: Add a new content tile

**Status:** ⚠️ Possible today, formalized after Phase 5
**Current pattern owner:** [`src/demo/data/contentItems.ts`](src/demo/data/contentItems.ts)

### Steps (current state)

1. **Image asset.** Add a poster JPG (compressed; see HANDOFF §10) under `public/assets/posters/<id>.jpg`.
2. **`src/demo/data/contentItems.ts`** — add an entry. Mirror the DHYH entry; set `id`, `title`, `categories`, `posterUrl`, `videoUrl`.
3. **Scene data.** This is the part that's not yet formalized:
   - For DHYH-quality data (Tier 1/2/3 JSONs), follow the DHYH pattern: per-tier files under `src/demo/data/<id>/` (or `src/demo/data/dhyh/` style).
   - Update the resolver in `src/demo/data/dhyhScenes.ts` (or write a content-specific equivalent) to load the new tier files.
4. **Splice / clip-time logic.** If the content has an ad break, mirror the `DHYH_SEGMENT_*` and `DHYH_AD_BREAK_CLIP_SECONDS` constants pattern in `constants.ts`.
5. **Taxonomy hide list.** If certain taxonomies aren't curated for this content, add to `HIDDEN_TAXONOMIES_BY_CONTENT` in `constants.ts`.
6. **Categories.** If introducing a new category, add it to `ENABLED_CATEGORIES` in `constants.ts`.
7. Verify: the tile shows up in Content Selection, clicking through enters the demo, all three panels populate.

### Target state (Phase 5)

```
src/demo/content/<id>/
  config.ts         # tile metadata (label, categories, posterUrl, videoUrl)
  timeline.ts       # splice constants + DHYH_LOCATION_TIMELINE-style band table
  schema.ts         # Zod schema for tier JSON (catches malformed data)
  tiers/
    tier1.json
    tier2.json
    tier3.json
  buildScenes.ts    # content-specific equivalent of dhyhScenes.ts
```

Adding a new tile = creating that folder + registering it in `src/demo/content/registry.ts`. Same pattern as ad-modes.

---

## Recipe: Add a new taxonomy

**Status:** ✅ Ready (small change)
**Pattern owner:** [`src/demo/constants.ts`](src/demo/constants.ts) + [`src/demo/data/taxonomySceneData.ts`](src/demo/data/taxonomySceneData.ts)

### Steps

1. **`src/demo/types.ts`** — add the new taxonomy name to `TaxonomyOption`.
2. **`src/demo/constants.ts`** — add it to `taxonomyOptions` (around line 56). If it's a content-wide taxonomy that should be filled across blank scenes, also add it to `GAP_FILL_TAXONOMIES`. **Do NOT add per-scene-volatile taxonomies (like Location)** — see HANDOFF §8.
3. **`src/demo/data/taxonomySceneData.ts`** — add a builder branch that produces the headline/sections for this taxonomy from the scene's JSON.
4. **`src/demo/data/dhyhScenes.ts → buildTaxonomyData`** — wire the builder into the per-scene taxonomy map.
5. **(Optional)** If the taxonomy shouldn't appear for specific content, add it to `HIDDEN_TAXONOMIES_BY_CONTENT` in `constants.ts`.
6. Verify: open the demo, the new taxonomy appears in the Taxonomy panel dropdown if the loaded tier emits data for it.

### Why Location is special

The Location taxonomy resolves through a curated `DHYH_LOCATION_TIMELINE` band table, not the algorithmic resolver. This is intentional — see HANDOFF §8 → Location for the full reasoning. Don't try to make Location flow through the same path as IAB/Sentiment/Emotion.

---

## Recipe: Update a Location band in the DHYH timeline

**Status:** ✅ Ready
**Pattern owner:** [`src/demo/constants.ts`](src/demo/constants.ts) (`DHYH_LOCATION_TIMELINE`, lines 256–282)

### When to do this

The user reports "the location panel says X but the screen clearly shows Y." Don't add fallback flags or algorithmic forward-fill — those have failed before (HANDOFF §8). Re-audit the affected band by reading per-scene `objects` arrays in `src/demo/data/dhyh/tier3.json` and adjust the `fromSec` boundaries.

### Steps

1. Open `src/demo/data/dhyh/tier3.json`.
2. Find the scenes whose `start_time` / `end_time` fall in the affected clip-time range.
   - Remember the source-time → clip-time mapping (HANDOFF §6). Clip-time = source-time − 1185 (for Segment A) or 107 + (source-time − 2145) (for Segment B).
3. Read each scene's `objects[]` array. Decide what room the on-screen objects suggest (refrigerator + oven + dishwasher = Kitchen; sink + toilet = Bathroom; bed = Bedroom; etc.).
4. Adjust the relevant entry in `DHYH_LOCATION_TIMELINE` — change `fromSec`, change `location`, or insert a new entry.
5. Verify: scrub through the affected clip-time range, confirm the Location panel matches what's on screen.

---

## Recipe: Add a new MUI primitive

**Status:** ⚠️ Pre-Phase 4 — primitives folder doesn't formally exist yet
**Pattern owner (target):** `src/demo/components/primitives/`

Before Phase 4, primitives go directly into `src/demo/components/` (alongside `PanelGlyph.tsx`). After Phase 4 lands, they move into `primitives/`. The convention either way:

1. The primitive should be **stateless** (props in, JSX out).
2. It should **consume tokens from `src/demo/styles.ts`** (or `src/theme/` after Phase 1) — never inline color hex literals.
3. It should be **named for its role**, not its appearance — `<PanelHeader>` not `<RoundedTitleBar>`.
4. Add a usage example to `DESIGN_SYSTEM.md` once it has 2+ consumers.

---

## AI-tool tips

When using Claude / GPT / Cursor to make changes:

- **Tell the AI which recipe applies first.** Pasting "follow the 'Add a new taxonomy' recipe in `EXTENSION_POINTS.md`" is usually faster than describing the change.
- **Prefer registry edits over code generation** — once Phase 2 lands, adding a mode is a config change. The AI is much less likely to break protected behaviors editing config than rewriting a hook.
- **Read `HANDOFF.md` §6, §8, §9, §12 before touching playback or panel scroll.** These sections document the protected behaviors. Tell the AI to read them too.
- **Always run `npx tsc --noEmit && npm run build` after the AI's change.** The build catches the most common AI regressions (wrong import paths, type mismatches, missed branches in switches).
- **Keep changes small.** AI tools (and humans) are most accurate on focused changes. Resist the urge to bundle multiple unrelated changes into one PR.

---

*This file is intentionally incomplete. Add a recipe whenever you do something routine that someone else might do again.*
