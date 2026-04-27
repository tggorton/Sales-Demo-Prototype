# KERV Sales Demo Prototype — Project Handoff

**Last updated:** 2026-04-27
**Prepared for:** Whoever picks this project up next (e.g. Claude in VS Code).
**Author of this doc:** Outgoing AI assistant, summarizing the working state at handoff time.

This file is the single source of truth a new agent should read before touching anything. It exists because the project is mid-flight: there are two parallel deployments, several non-obvious data-handling rules, and a couple of conventions that will silently break things if violated. Read this end-to-end before making changes.

> **TL;DR for a new agent**
>
> 1. Always confirm with the user **which deployment** you're targeting before pushing or deploying — see [§2 Deployments](#2-deployments--the-deployment-rule).
> 2. Never `git add` anything matching the [Asset hygiene](#5-asset-hygiene--what-stays-out-of-github) patterns, especially `_archive/`, `*.backup.*`, `_Temp/`, large mp4s, or `dist/`.
> 3. The DHYH video is a **two-segment splice** with an ad break at the splice point. The "clip timeline" is what the user sees and what the JSON has been remapped onto — see [§6 Splice & virtual timeline](#6-the-dhyh-splice--virtual-timeline).
> 4. Panel scroll bug? **Don't add a new explicit snap flag.** There is a single global "target discontinuity" snap heuristic — see [§9 Panel scroll rules](#9-panel-scroll-rules-do-not-special-case).
> 5. Test locally on `localhost:5173` before deploying (the user works from `http://localhost:5173/`, not `127.0.0.1`). The user has explicitly asked for this and is over their token budget — be conservative.

---

## 1. What this project is

A React + MUI prototype of the KERV Sales Demo Tool. It walks a sales rep through:

- login / authenticated shell
- content selection grid (currently only the "Don't Hate Your House" / DHYH tile is fully wired)
- a demo playback surface with three synchronized side panels: **Taxonomy**, **Product**, **JSON**
- expanded fullscreen dialogs for each panel
- the protected `Tier = Exact Product Match` + `Ad Playback = Sync: Impulse` ad-break behavior, which is the demo's headline moment

It is a **prototype**, not a production build. Auth is hardcoded, media is bundled in `public/assets/`, JSON is dynamically imported. A future production build will swap auth for Cognito and media for S3/CloudFront — every media URL already routes through `VITE_*` env overrides for that reason.

### Stack

- React 18 + TypeScript (strict)
- Vite 5
- MUI 7 + Emotion
- No client router (single page, view switched in `App.tsx`)
- No backend; static Vite build to Vercel

### Local dev

```bash
npm install
npm run dev          # http://localhost:5173  (preferred — do NOT substitute 127.0.0.1)
npm run build        # tsc -b && vite build → dist/
npm run preview      # preview dist/
npm run lint
```

Login: `user@kerv.ai` / `SalesDemoTest` (autofilled; manual edits are rejected). Both values are in `src/demo/constants.ts` (`DEMO_LOGIN_EMAIL`, `DEMO_LOGIN_PASSWORD`).

---

## 2. Deployments — THE deployment rule

There are now **two** GitHub repos and **two** Vercel projects. They serve different purposes. Every deploy decision must start with: *which one are we targeting?*

| | Original (production demo) | V2 (sales-team verification) |
|---|---|---|
| **GitHub repo** | `https://github.com/tggorton/Sales-Demo-Prototype.git` | `https://github.com/tggorton/sales-demo-v2.git` |
| **Vercel project** | `sales-demo-prototype` | `sales-demo-v2` |
| **Stable URL** | (original Vercel alias) | `https://sales-demo-v2-nu.vercel.app` |
| **Local git remote name** | `origin` | (not yet added — see below) |
| **Audience** | Production sales demos | Sales-team review / staging for new features |
| **Auto-deploy on push?** | Yes (Vercel ↔ GitHub) | Yes — *user just connected this on 2026-04-27* |

### **Rule: ASK before pushing or deploying.**

When the user says "push" / "deploy" / "ship" — do **not** assume which target they mean. Ask:

> "Which target — original (`sales-demo-prototype`, production demo) or v2 (`sales-demo-v2`, sales-team review)?"

The two are intentionally divergent right now. The user uses v2 to test changes with the sales team before promoting to original. Pushing to the wrong remote ships the wrong build to the wrong audience.

### Important historical note about CLI deploys

Up until 2026-04-27, the user worked around a Vercel↔GitHub permission issue by using `npx vercel --prod` to push directly from the local working directory to the v2 Vercel instance. **CLI deploys do not touch git** — they upload from the local filesystem to Vercel's build infrastructure and bypass GitHub entirely.

This means when you start working, the v2 Vercel **production deployment** may be ahead of the v2 GitHub **repo**, because the build was deployed via CLI but never committed/pushed. Run `git status` and check the v2 repo on GitHub before assuming they're in sync.

Now that the GitHub integration is connected, the going-forward workflow is **commit → push → Vercel auto-deploys**, separately for each remote.

### Remotes setup (current state at handoff)

```bash
$ git remote -v
origin  https://github.com/tggorton/Sales-Demo-Prototype.git (fetch)
origin  https://github.com/tggorton/Sales-Demo-Prototype.git (push)
```

The v2 remote has **not yet been added locally**. To add it cleanly (when the user is ready):

```bash
git remote add v2 https://github.com/tggorton/sales-demo-v2.git
# Then push current main to v2:
git push v2 main
```

Both repos can share the same `main` branch — Vercel will independently auto-build each on its own push. There is no shared history requirement; they just happen to track the same content.

### `.vercel/project.json` (CLI link)

Currently points to the v2 project:

```json
{"projectId":"prj_ztXMvI72uEYps9Zu6urFZS3c6Aqq","orgId":"team_azoJFCoRpo3nBkAXIen6BC8f","projectName":"sales-demo-v2"}
```

If you ever run `npx vercel`, this is what it'll deploy to. Don't relink without asking.

---

## 3. Repository layout

```
src/
  App.tsx                        # top-level orchestration + view routing (login → content → demo)
  main.tsx                       # React entry
  index.css                      # global base styles

  demo/
    constants.ts                 # ⭐ option lists, durations, splice ranges, dedupe windows, login creds, env hooks
    styles.ts                    # shared MUI sx tokens
    types.ts                     # shared TS types

    components/
      AuthenticatedHeader.tsx
      CompanionDialog.tsx        # Sync: Impulse companion / QR experience
      ContentSelectionView.tsx
      DemoView.tsx               # ⭐ main playback surface (1034 LOC) — video, scrubber, three side panels
      ExpandedPanelDialog.tsx    # fullscreen Taxonomy / Product / JSON dialogs
      JsonDownloadDialog.tsx
      LoginView.tsx
      PanelGlyph.tsx
      ProfileDrawer.tsx
      SelectorDialog.tsx
      VerifyEmailDialog.tsx

    hooks/
      useDemoPlayback.ts         # ⭐ ALL playback timing, panel sync, ad-break logic, scroll behavior (1336 LOC)

    data/
      adFixtures.ts
      ad-compliance-results-*.json  # static fixtures for the ad-break panels
      contentItems.ts            # tile catalog
      dhyhScenes.ts              # ⭐ remaps upstream DHYH JSON onto spliced clip timeline + builds taxonomy/product data
      sceneMetadata.ts           # mock scenes for non-DHYH placeholder content
      taxonomySceneData.ts       # shapes scenes into taxonomy panel cards
      dhyh/
        tier1.json               # Basic Scene (IAB + Sentiment, ~666KB)
        tier2.json               # Advanced Scene (~1.8MB — largest chunk)
        tier3.json               # ⭐ Exact Product Match (~943KB) — has product_match arrays

    utils/
      formatTime.ts              # mm:ss
      jsonExport.ts              # builds the JSON-download payloads
      sessionStorage.ts          # persists view/content/tier across refresh

public/
  assets/
    ads/                         # ad creatives (mp4 + L-bar PNGs)
    elements/                    # shared UI SVGs
    posters/                     # content tile poster art (dhyh.jpg etc — JPGs not PNGs, see §11)
    products/homedpt/            # SKU imagery
    video/                       # main content videos (dhyh-cmp.mp4 is the spliced clip)
    kerv-logo.svg
    login-hero.jpg               # ⭐ JPG, not PNG (compressed for first-paint perf)

_archive/                        # ⭐ LOCAL ONLY, gitignored — see §5
  original-images/               # uncompressed PNG masters of login-hero + dhyh poster

.cursor/rules/
  no-backup-artifacts.mdc        # automated rule that enforces §5 conventions

.env.example                     # all VITE_* env override keys
.gitignore
.vercelignore                    # Vercel-CLI-specific exclude list
.vercel/project.json             # CLI link to sales-demo-v2 (see §2)
vite.config.ts                   # ⭐ vendor chunk splitting (vendor-mui, vendor-react, vendor)
index.html                       # has <link rel="preload"> for login-hero.jpg
```

### Where to make changes (cheat sheet)

| Change | Touch |
|---|---|
| App routing / view switching / global state | `src/App.tsx` |
| Playback timing, ad breaks, panel sync, scrubbing, scroll | `src/demo/hooks/useDemoPlayback.ts` |
| New UI view / dialog | `src/demo/components/` (+ wire from `App.tsx`) |
| Shared styling tokens | `src/demo/styles.ts` |
| New content tile | `src/demo/data/contentItems.ts` (+ poster JPG under `public/assets/posters/`) |
| Replace DHYH content JSON | `src/demo/data/dhyh/tier{1,2,3}.json` |
| Taxonomy display logic / data shape | `src/demo/data/dhyhScenes.ts` (`buildTaxonomyData`) |
| **Location timeline** (curated bands) | `src/demo/constants.ts` (`DHYH_LOCATION_TIMELINE`) — see §8 |
| JSON download/export format | `src/demo/utils/jsonExport.ts` |
| Timing / defaults / credentials / dedupe windows | `src/demo/constants.ts` |

---

## 4. Build & deploy

### Build config (`vite.config.ts`)

Vendor chunks are split out so MUI/Emotion/React are cached across deploys when only app code changes:

- `vendor-mui` — MUI + Emotion (~273KB / 83KB gzip)
- `vendor-react` — React + ReactDOM + scheduler (~142KB / 46KB gzip)
- `vendor` — everything else from node_modules
- App code chunk shrinks to ~91KB (~26KB gzip)
- Tier JSONs are emitted as separate dynamic-import chunks (`tier1`, `tier2`, `tier3`)
- `chunkSizeWarningLimit: 2000` because tier2 is unavoidably ~1.8MB

### Vercel build

- Build command: `npm run build`
- Output: `dist`
- Install: `npm install`
- Node 18+ (Vite 5 requirement)
- No SPA rewrites needed (single page app, single `index.html`)

### Pre-deploy sanity

```bash
npm run build   # must be clean
npx tsc --noEmit   # quick TS check during edits
```

### Deploy paths

- **GitHub-driven** (preferred, post-2026-04-27): commit + push → Vercel auto-builds.
- **CLI** (fallback / when GitHub integration is broken): `npx vercel --prod` from project root. The currently linked project is v2 — see §2.

---

## 5. Asset hygiene — what stays out of GitHub

This project has been bitten multiple times by oversized git repos and Vercel deployments that exceed size limits. There is a strict, enforced convention. **Read `.cursor/rules/no-backup-artifacts.mdc` once, then internalize it.**

### What's gitignored / vercelignored

From `.gitignore`:

```
node_modules
dist
dist-ssr
.env.local
.env.*.local
.vercel
public/assets/video/dhyh-cmp-full.mp4    # full 44-min DHYH source — too big for GitHub
public/assets/ads/scott-brothers-home-depot-lbar.mp4
_Temp/
_Temp_Ads/
_archive/                                # local-only stash of original-quality images
*.backup.*                               # any *.backup.json, *.backup.mp4, *.backup.png
**/_backups/
**/*.backup.json
**/*.backup.mp4
/dhyh-products.json                      # one-off review artifact, regenerable
```

Everything in `.gitignore` is also in `.vercelignore` plus a few more (because Vercel CLI doesn't auto-respect `.gitignore`). The `.vercelignore` exists specifically to keep `npx vercel` uploads under Vercel's per-deploy size limit — without it, the upload was 2.9 GB and got rejected. With it, it's ~190 MB.

### The `_archive/` convention

When we replace a committed asset with a smaller / re-encoded version, we keep the original as a **local-only** copy under `_archive/`:

```
_archive/
  original-images/
    login-hero.png       # 2.1 MB — pre-compression master
    dhyh.png             # 4.1 MB — pre-compression master
```

`_archive/` is gitignored and vercelignored, so it never ships. It exists purely so we can re-export at a different size/quality later without going back to git history. **Never `git add _archive/`.** The Cursor rule will warn you, but it's still your job.

### The `*.backup.*` convention

When replacing an in-place asset (JSON, MP4, JPG), the prior version may briefly stick around as a sidecar, e.g. `dhyh-tier1.backup.json`. These are also gitignored and vercelignored. **Never stage them.** Never reference them from imports.

### Big assets to be wary of

| File | Status |
|---|---|
| `public/assets/video/dhyh-cmp.mp4` | committed — the spliced clip the demo plays |
| `public/assets/video/dhyh-cmp-full.mp4` | gitignored — full 44-min source |
| `public/assets/ads/SD-HD-Tools-*.mp4` | committed — short ad creatives |
| `public/assets/ads/scott-brothers-home-depot-lbar.mp4` | gitignored — too large |
| `public/assets/login-hero.jpg` | committed — compressed JPG (was a 2.1 MB PNG) |
| `public/assets/posters/dhyh.jpg` | committed — compressed JPG (was a 4.1 MB PNG) |
| `_archive/original-images/*.png` | gitignored — keep locally |

If you need to add something > 10 MB to `public/assets/`, **ask the user first**. It directly costs Vercel bandwidth.

---

## 6. The DHYH splice & virtual timeline

This is the single most important model to understand before touching scene/playback code.

### The setup

The shipped `dhyh-cmp.mp4` is a **pre-spliced concatenation** of two ranges from a 44-minute source episode, chosen to surface the most product-rich moments:

```
Segment A (pre-ad):  source 19:45 – 21:32   →   clip 0:00 – 1:47   (107s)
Segment B (post-ad): source 35:45 – 44:00   →   clip 1:47 – 10:02  (495s)
                                                ─────────────────
                                                clip total: 10:02 (602s)
```

Plus an **ad break** that visually appears at clip-time `1:47` (between segments). The ad-break duration depends on ad mode:

- `Sync: Impulse` → 30s
- `Sync: L-Bar` → 30s
- `Sync` → 45s

### The two timelines

There are two time domains in this codebase:

| Domain | What it means | Where it shows up |
|---|---|---|
| **Source time** | Position in the original 44-min episode | `tier{1,2,3}.json` `Scenes[].startTime/endTime` |
| **Clip time** | Position in the spliced 10:02 file (what the user sees) | `<video>.currentTime`, scrubber, scene cards, panel sync |

Because the file itself is the splice, **`<video>.currentTime` maps 1:1 onto clip time**. The player never has to know about source time. Only `dhyhScenes.ts` cares — it remaps each upstream scene window from source-time onto clip-time at load.

### Constants (`src/demo/constants.ts`)

```ts
DHYH_SEGMENT_A_SOURCE_START = 19 * 60 + 45      // 1185s
DHYH_SEGMENT_A_SOURCE_END   = 21 * 60 + 32      // 1292s
DHYH_SEGMENT_A_DURATION     = 107               // clip 0 → 107
DHYH_SEGMENT_B_SOURCE_START = 35 * 60 + 45      // 2145s
DHYH_SEGMENT_B_SOURCE_END   = 44 * 60 + 0       // 2640s
DHYH_SEGMENT_B_DURATION     = 495               // clip 107 → 602
DHYH_CLIP_DURATION_SECONDS  = 602               // 10:02
DHYH_AD_BREAK_CLIP_SECONDS  = 107               // ad sits at the splice point
```

### The remap (`dhyhScenes.ts → remapSceneToClipTime`)

For each scene in the upstream JSON:

1. If `[sourceStart, sourceEnd]` overlaps Segment A → clip range = `[sourceStart - 1185, sourceEnd - 1185]`
2. Else if it overlaps Segment B → clip range = `[107 + (sourceStart - 2145), 107 + (sourceEnd - 2145)]`
3. Else → drop the scene entirely
4. **Boundary-leak guard:** if the overlap with the kept segment is < `DHYH_MIN_SCENE_CLIP_OVERLAP_SECONDS` (0.5s), drop the scene anyway. This was added because a single sliver-overlap scene tagged `location: Park` was forward-filling "Park" across 74s of unrelated subsequent scenes (see §8).

### What this means for any new feature touching scenes/products

- **Always think in clip-time** when displaying anything to the user.
- **Always remember Segment A and Segment B are visually contiguous but semantically discontinuous.** Pre-ad and post-ad have totally different content — a kitchen tour starts in Segment B, etc.
- **The ad break is at clip-time 1:47** for `Sync: Impulse` / `Sync: L-Bar` / `Sync`. Anything that overlays the player (scrubber segments, companion sheet) has to know about this.
- If the user ever asks to change the splice ranges, update the constants in `constants.ts` and verify `DHYH_LOCATION_TIMELINE` still makes sense (its `fromSec` values are clip-time, not source-time).

---

## 7. JSON data model

### Tier files

All under `src/demo/data/dhyh/`:

| File | Tier(s) | Contents |
|---|---|---|
| `tier1.json` | `Basic Scene`, `Assets Summary` | IAB + Sentiment only, no products |
| `tier2.json` | `Advanced Scene` | + GARM, music_emotion, locations, faces, objects (no product_match) |
| `tier3.json` | `Exact Product Match`, `Categorical Product Match` | Everything in tier2 + `product_match` arrays attached to objects |

`dhyhScenes.ts → resolveTierModule()` dynamically `import()`s the right tier on demand. Bundles are cached per tier.

### Scene shape (trimmed, in JSON)

```ts
type DhyhScene = {
  scene: number
  startTime: number     // SOURCE time (seconds in 44-min episode)
  endTime: number       // SOURCE time
  lengthInSeconds?: number
  audio_transcript?: string
  description?: string
  iab_taxonomy?: { name, confidence }[]
  garm_category?: { name, risk_level, confidence }[]
  sentiment_analysis?: { name, confidence } | { name, confidence }[]
  labels?: { name, confidence }[]
  logos?: { name, confidence }[]
  faces?: { name?, confidence?, gender?, age_group? }[]
  text?: { value?, text? }[]
  locations?: { name, confidence }[]
  objects?: {
    name, confidence?,
    product_match?: {
      product_id, name, price, image, image_url, link, confidence,
      dedupe_key?         // ⭐ optional override — see §10
    }[]
  }[]
  music_emotion?: { name, confidence } | [...]
  shoppable_score?: number
}
```

Top-level payload also has:

```ts
type DhyhPayload = {
  duration_in_seconds: number
  Scenes: DhyhScene[]
  video_metadata?: {
    locations?: {
      name, confidence?, screen_time?, screen_time_percentage?, count?
    }[]                   // ⭐ show-wide locations — used for the "Considered" line
  }
}
```

### Build pipeline (`dhyhScenes.ts → buildBundle`)

```
upstream payload
  → for each scene: remapSceneToClipTime() (drop or remap to clip time)
  → sort by clip start (Segment A scenes precede Segment B)
  → buildShowLocations() once  (extract `considered` list from video_metadata.locations, conf ≥ 0.85)
  → for each scene: buildScene()
       ├─ buildProducts()        (intra-scene SKU dedupe; full panel-level dedupe is later)
       ├─ buildTaxonomyData()    (per-taxonomy headline/sections, location timeline logic)
       └─ buildRawJsonForScene() (only if scene is "meaningful")
  → fillTaxonomyGaps()           (forward + back fill for stable taxonomies; Location is excluded)
```

The output is a `DhyhSceneBundle { scenes, duration, tier, hasProductData }` consumed by `useDemoPlayback`.

---

## 8. Panel sync logic (THE big one)

All three panels (Taxonomy / Product / JSON) sync to the same `videoCurrentSeconds` clip-time. The hook `useDemoPlayback` is the orchestrator. Each panel has different rules for what content to surface.

### Currently active scene

```
currentScene = scenes.find(s => clipTime >= s.start && clipTime < s.end)
```

Scene boundaries are 1-3s for tier3 in DHYH (since the upstream model emits at scene-cut granularity).

### Panel-specific behavior

#### Taxonomy panel

- One card per taxonomy emission (e.g. `IAB: Home Improvement, conf 0.92`).
- The active taxonomy comes from the dropdown in the panel header (IAB / Sentiment / Brand Safety / Emotion / Location / Faces / Object).
- **Per-content hiding**: `HIDDEN_TAXONOMIES_BY_CONTENT` in `constants.ts` removes options from the dropdown (DHYH currently hides `Brand Safety`).
- **Dynamic option filtering**: only taxonomies that have data in the loaded tier appear in the dropdown (e.g. tier1 doesn't have Faces/Object, so they don't appear).
- **Time-windowed dedupe**: `TAXONOMY_DEDUPE_WINDOW_SECONDS = 8` — if the same taxonomy headline was just emitted within 8s, suppress the new card. Prevents the same `"Energizing, pump-up"` card from appearing 30 times in a row.
- **Gap fill**: stable taxonomies (IAB, Sentiment, Brand Safety, Emotion, Faces, Object) are forward- AND back-filled across blank scenes so panels don't go empty mid-clip. **Location is excluded** because gap-filling caused outlier per-scene tags ("Park", "Cottage") to propagate inappropriately.
- **Expanded dialog**: switches the inline panel from single-select to multi-select (MUI Autocomplete with checkboxes); on collapse, reverts to whichever single taxonomy was selected before expanding.

#### Location taxonomy (special handling — read this carefully)

Location is the single most-iterated panel because the upstream model only emits scene-level `locations` on a small fraction of scenes, leaving the rest blank. Naive fallbacks failed:

- Forward-fill from neighbors → outlier tags ("Park" 0.79 in one boundary-leak scene) propagated across 74s of unrelated content.
- Use show-wide #1 location by screen-time → "Bathroom" dominated 95% of the demo even though the first 2:30 of clip is clearly construction-site b-roll.

**Current solution (since 2026-04-27):** a curated `DHYH_LOCATION_TIMELINE` in `constants.ts`. Each entry says "from clip-time X seconds onward, the location is Y with confidence Z." Resolution priority per scene:

1. **High-confidence per-scene tag** (`scene.locations[0].confidence ≥ DHYH_SCENE_LOCATION_OVERRIDE_CONFIDENCE = 0.85`) — honor the model.
2. **Otherwise, the active timeline band** (largest `fromSec` ≤ this scene's clip-time) — editorial backbone.
3. Otherwise, panel renders empty (shouldn't happen given the timeline starts at `fromSec: 0`).

The "Considered" line is **always** populated from `video_metadata.locations` (filtered to `confidence ≥ 0.85`), independent of which path resolved the headline.

Current timeline (verified by per-scene object audit in tier3):

| Clip-time | Location | Why |
|---|---|---|
| 0:00 – 2:33 | Construction Site | b-roll demolition / framing |
| 2:33 – 3:35 | Living Room | open-plan reveal, dining table + coffee table + mirror |
| 3:35 – 5:30 | Kitchen | refrigerator + oven + dishwasher visible |
| 5:30 – 6:13 | Bathroom | sink + toilet directly tagged at scene 718 (0.95) |
| 6:13 – 6:45 | Bedroom | bed object detected |
| 6:45 – 7:07 | Living Room | hallway / transitional |
| 7:07 – 7:30 | Bathroom | bathtub + toilet + sink + mirror |
| 7:30 – 9:25 | Bedroom | model has no "Office/Study"; bedroom is closest |
| 9:25 – end | Kitchen | strong kitchen objects again |

If the user reports a location-feels-wrong issue: **don't add explicit fallback flags**. Re-audit the affected band's per-scene `objects` in the tier3 JSON, then adjust the timeline boundary.

#### Product panel

- Cards built from `buildProducts()` per scene (intra-scene SKU dedupe by `product_id`).
- **Time-windowed cross-scene dedupe**: `PRODUCT_DEDUPE_WINDOW_SECONDS = 180`. Same `productKey` (defaults to `product_id`) within 180s = suppress; > 180s gap = re-emit.
- **`dedupe_key` override**: a single product's `product_match[]` entry can carry an optional `dedupe_key: string`. Setting it to a unique value forces that occurrence to render as its own card even if the SKU matches another nearby product. Used currently to keep the circular-saw appearance in scene 3/4 separate from later saw appearances.
- **Segment isolation (critical):** the inline collapsed panel only shows products from the segment you're currently in (pre-ad ↔ post-ad). The expanded dialog shows everything. This was added because pre-ad scrubbing was bleeding post-ad products into the panel.

#### JSON panel

- Surfaces `scene.rawJson` (built only for "meaningful" scenes — see `isSceneMeaningful`). Production slates / black frames render an empty JSON view by design.
- Same scroll/sync rules as the others.

---

## 9. Panel scroll rules — DO NOT special-case

There is **one global rule** in `useDemoPlayback.ts → applyScroll`:

> **Smooth scroll is reserved exclusively for natural playback drift. Anything else is a snap.**

Implementation: a single target-discontinuity heuristic (`TARGET_JUMP_THRESHOLD_PX`). Each frame, if the computed scroll target moved by more than the threshold compared to last frame, the panel snaps to the new target instantly. Otherwise it eases smoothly.

Conditions that trigger a snap automatically (no special code needed):

- Taxonomy switch (different scene anchor → different target)
- Tier or content swap
- Scene re-index
- Ad-break flip
- Panel re-open (expand/collapse)
- Window resize (different `maxScroll`)
- Slider scrub (also belt-and-suspenders flagged via `flagPanelScrub()`)

### Manual scroll override

When a user scrolls a panel manually:

- That panel pauses auto-scroll for `PANEL_MANUAL_SCROLL_PAUSE_MS = 5000ms`.
- Pause is **per panel** — scrolling Taxonomy doesn't pause Products.
- After 5s, the panel snaps (not eases) back to the live target via `needsSnapOnResume` and resumes normal tracking.

### `ScrollTargetValue { clamped, unclamped }`

Targets are tracked as both clamped (within `0..maxScroll`) and unclamped values. The discontinuity check uses `unclamped` so that hitting the bottom of the panel doesn't *itself* count as a jump (which used to cause spurious snaps).

### **If you find a panel doing an "aggressive scroll" instead of a snap…**

**Don't add another explicit snap flag.** Almost every time, the bug is in how the target is being computed (e.g. someone added a new code path that mutates the active scene index without going through the canonical setter). Fix the target computation; the global heuristic will handle the snap.

The README has a more detailed write-up under "Protected Behaviors" — read that if you're about to touch panel scroll.

---

## 10. Performance optimizations in place

These exist because the user demos this live at events with poor wifi. Don't undo them without good reason.

- **Image compression**: `login-hero.png` (2.1 MB) → `login-hero.jpg` (~250KB). `posters/dhyh.png` (4.1 MB) → `posters/dhyh.jpg`. PNG masters live in `_archive/original-images/`.
- **HTML preload**: `index.html` has `<link rel="preload" as="image" href="/assets/login-hero.jpg" fetchpriority="high">` so the hero starts downloading in parallel with the JS bundle.
- **Vendor chunk splitting**: see §4. Cuts re-download size when only app code changes.
- **Tier JSONs are dynamic-imported**, not statically bundled. Selecting `Basic Scene` doesn't download tier3's 943KB.
- **Per-tier bundle cache**: `getDhyhScenesForTier` memoizes the parsed bundle per tier so retier-then-untier doesn't reparse.
- **RAF-driven panel scroll** with a velocity cap (`PANEL_AUTOSCROLL_MAX_VELOCITY_PX_PER_SEC = 500`) so big jumps don't dart across the panel in 250ms.

---

## 11. Login & auth

`src/demo/components/LoginView.tsx` + `src/App.tsx → handleLogin`:

- The form autofills `DEMO_LOGIN_EMAIL` / `DEMO_LOGIN_PASSWORD` from `constants.ts`.
- Manual edits away from those exact values are rejected client-side with an inline error.
- This is *intentional* — the prototype has no auth backend and the credentials are the only way in.
- The hero image (compressed JPG, see §10) sits beside the form and is `object-fit: cover` with a tuned `object-position` to keep the right brand text visible.
- **Future migration**: `handleLogin` is the single replacement point for Cognito.

---

## 12. Recent fixes & open threads

A new agent should be aware of these so they don't accidentally re-litigate solved problems or miss in-flight ones.

### Recently resolved

- **Two-segment splice with mid-clip ad break** — the entire splice-and-remap pipeline (§6, §7) was rebuilt to support this. Don't try to "simplify" it back to a single-segment timeline.
- **Panel scroll glitches & manual override** — solved by the global snap heuristic + per-panel pause (§9). Earlier versions had a forest of special-case snap flags; those have all been deleted. **Don't bring them back.**
- **Product panel ad-break leakage** — solved by segment isolation in the collapsed panel (§8 → Product).
- **Taxonomy sync lag / spam** — solved by `TAXONOMY_DEDUPE_WINDOW_SECONDS = 8`.
- **Expanded Taxonomy multi-select** — solved with MUI Autocomplete; reverts on collapse.
- **Dynamic taxonomy options** — dropdown only shows taxonomies that have data in the loaded tier.
- **DHYH-specific Brand Safety hide** — `HIDDEN_TAXONOMIES_BY_CONTENT`.
- **Login boundary-leak `Park` and `Bathroom`-everywhere bugs** — solved by `DHYH_MIN_SCENE_CLIP_OVERLAP_SECONDS` (§6) + `DHYH_LOCATION_TIMELINE` (§8). The 4:40 → 5:30 mislabel ("Living Room" while a refrigerator + dishwasher were on screen) was fixed on 2026-04-27 by collapsing two timeline bands into one.
- **Vercel CLI 2.9 GB upload** — solved by `.vercelignore`.
- **Vercel ↔ GitHub permission outage** — worked around with `npx vercel` CLI; resolved by user on 2026-04-27 by reconnecting the v2 project to GitHub.
- **Image compression + preload** — see §10.

### In flight / things to watch

- **v2 GitHub repo may be stale relative to v2 Vercel** — see §2's note about CLI deploys. First task on resume: confirm `git status`, then push current local + commits to v2 to bring its GitHub repo up to date.
- **Local working tree has uncommitted changes** at handoff time. As of last check:
  - modified: `.gitignore`, `index.html`, `src/demo/components/LoginView.tsx`, `src/demo/constants.ts`, `src/demo/data/contentItems.ts`, `src/demo/data/dhyhScenes.ts`, `vite.config.ts`
  - deleted: `public/assets/login-hero.png`, `public/assets/posters/dhyh.png` (replaced by their `.jpg` siblings)
  - untracked: `.vercelignore`, `public/assets/login-hero.jpg`, `public/assets/posters/dhyh.jpg`
  - main is 1 ahead of `origin/main`
  - These changes correspond to the location-timeline fix + image compression + chunk splitting work. They've been **deployed to v2 Vercel via CLI** but not yet committed/pushed to either GitHub repo. Confirm with the user which repo(s) to push them to before committing.
- **Location timeline is editorial, not algorithmic.** If the user reports a "wrong location" issue, don't try to algorithmically derive a better one — re-audit the per-scene `objects` arrays in tier3.json and adjust band boundaries in `DHYH_LOCATION_TIMELINE`. There's a Python audit pattern that's been used several times during this project — see the chat history.

---

## 13. Cursor / agent rules to inherit

- `.cursor/rules/no-backup-artifacts.mdc` — `alwaysApply: true`. Enforces §5. Read once.
- The user has explicitly stated: **do not deploy without explicit local verification.** Test on `localhost:5173` (the user's canonical local URL — don't substitute `127.0.0.1`) and get user confirmation before pushing/deploying.
- The user is currently over their Cursor token budget. Be concise. Avoid redundant audits when the answer is in a previously-touched file.

---

## 14. Quick start for a new agent

1. `git status` — confirm the working-tree state described in §12 still matches.
2. `git remote -v` — confirm `origin` points to `Sales-Demo-Prototype.git`.
3. `cat .vercel/project.json` — confirm CLI link is `sales-demo-v2`.
4. `npm install && npm run dev` — start local server at `http://localhost:5173/` (always use `localhost`, not `127.0.0.1`, when sharing URLs with the user).
5. Log in (`user@kerv.ai` / `SalesDemoTest`), select **Don't Hate Your House** content, set **Tier = Exact Product Match** + **Ad Playback = Sync: Impulse**, click into the demo. This is the headline path — verify all three panels populate and scroll correctly through the 1:47 ad break.
6. Read `.cursor/rules/no-backup-artifacts.mdc`.
7. If the user asks you to deploy: ask "original or v2?" (see §2). If they ask you to push: also ask which remote.

If anything in this doc looks stale, update it in the same change as whatever you were doing. The goal is for this file to keep being the truth.

---

## 15. Known caveats / gotchas

- **`<video>.currentTime` is clip-time, never source-time.** The only place that touches source-time is `dhyhScenes.ts → remapSceneToClipTime`.
- **Tier3 is the only tier with products.** Selecting any other tier hides the Product panel content (the panel chrome stays).
- **The `Sync: Impulse` ad mode is what the sales team demos.** `Pause Ad`, `CTA Pause`, `Organic Pause`, `Carousel Shop` are commented out in `ENABLED_AD_PLAYBACK_OPTIONS` until they have creative + JSON.
- **Only "Reality TV" and "Home & Garden" categories are enabled** (DHYH is the only fully-wired tile). Restoring Comedy/Drama/etc. requires also wiring scene data and posters.
- **Scrubbing across the ad break is supported.** Panels resync correctly. Don't add ad-break-aware special cases to the scrub handler — it goes through the global snap heuristic.
- **`fillTaxonomyGaps` runs after scenes are built.** If you add a new taxonomy that's content-wide, add it to `GAP_FILL_TAXONOMIES`. If it's per-scene-volatile (like Location), do NOT add it.
- **`buildRawJsonForScene` only emits for meaningful scenes** (`isSceneMeaningful`). Empty/black-frame scenes intentionally render no JSON. This matches the upstream model's behavior; don't backfill them.
- **`dedupe_key` is a JSON-side override**, not a code-side feature. To make a specific product cluster reappear, edit the relevant tier3.json `product_match` entry and add a unique `dedupe_key`.
- **Login hero image is `object-position` tuned for a specific crop.** If you swap the image, expect to re-tune.

---

*End of handoff.*
