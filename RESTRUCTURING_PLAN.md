# Restructuring Plan — KERV Sales Demo Prototype

**Audience:** Engineers picking up this project from the original UX/UI-led prototype.
**Status:** In progress on branch `feat/restructuring-pass` (local-only, not pushed).
**Last updated:** 2026-04-27.

This document is the master spec for evolving the prototype into a codebase that is comfortable for engineers (and AI coding tools) to extend. It works in tandem with:

- **[`HANDOFF.md`](HANDOFF.md)** — the project's history, conventions, and protected behaviors. Read this first.
- **[`SESSION_LOG.md`](SESSION_LOG.md)** — narrative day-by-day history of the engagement (the *why* behind the commits + user observations + future considerations).
- **[`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md)** — MUI/styling inventory + recommended theme evolution.
- **[`EXTENSION_POINTS.md`](EXTENSION_POINTS.md)** — cookbook for "how do I add an X?" routine tasks.
- **[`TIME_LOG.md`](TIME_LOG.md)** — per-session time tracking + phase-estimate calibration.
- **[`kerv-one-theme/`](kerv-one-theme/)** — the official KERV design-system package, dropped into the repo root for adoption. See [`kerv-one-theme/INTEGRATION_NOTES.md`](kerv-one-theme/INTEGRATION_NOTES.md) for the version-compatibility analysis.

---

## 1. Context — why this restructuring exists

The prototype was built rapidly by a UX/UI designer (with AI assistance) to hit a specific demo target. That goal was achieved — the demo works, looks right, and ships to two Vercel projects (see HANDOFF §2). It's now being handed off to engineers for ongoing feature work, including:

- Adding new ad playback modes (today: `Sync`, `Sync: L-Bar`, `Sync: Impulse`; future: `Pause Ad`, `CTA Pause`, `Organic Pause`, `Carousel Shop`).
- Migrating media + JSON sources from bundled `public/assets/` to S3/CloudFront.
- Migrating auth from hardcoded credentials to AWS Cognito.
- Wiring additional content tiles beyond DHYH.
- General feature work and design iteration.

The restructuring's job is to make those changes **fast, safe, and AI-tool-friendly** without breaking the protected behaviors HANDOFF §6 / §8 / §9 / §12 documents.

---

## 2. Goals & non-goals

### Goals

1. **Decompose the two largest files** (`DemoView.tsx` ~1034 LOC, `useDemoPlayback.ts` ~1336 LOC) into focused sub-modules so engineers can onboard without reading 2000+ lines on day one.
2. **Establish library / registry patterns** for ad modes (and eventually content tiles) so adding a new one is a recipe, not archaeology.
3. **Set up abstractions for S3 and Cognito** so when AWS details land, the swap is configuration + filling in stubs — no architectural refactor.
4. **Eliminate the ~250 LOC of duplicated panel rendering** between `DemoView.tsx` and `ExpandedPanelDialog.tsx`.
5. **Add a safety net** (golden-path test + CI) so subsequent changes can't silently regress the protected behaviors.
6. **Document extension points** so the next person — engineer or AI — can ship without spelunking.

### Non-goals (intentionally deferred)

- **Actually integrating S3 or Cognito.** This pass scaffolds the seams; live integration is a separate task once AWS details are available.
- **Replacing MUI** or introducing a new component library.
- **Adding a router.** Single-page-app view switching in `App.tsx` works for current use; revisit only if deep-linking becomes a requirement.
- **Storybook.** Useful eventually but adds maintenance burden. Defer until primitives stabilize.
- **Visual regression testing.** Defer until panel components are decomposed; doing it before means re-baselining everything later.
- **Decomposing `useDemoPlayback`'s scroll engine.** The RAF loop + manual-override state + global snap heuristic are a coherent state machine and HANDOFF §9 explicitly warns against splitting them. Around them is fine; through them is not.

### Constraints inherited from HANDOFF

- **Don't add new explicit panel-snap flags** (HANDOFF §9). Fix target computation; the global heuristic handles the rest.
- **Location is editorial, not algorithmic** (HANDOFF §8). For "wrong location" reports, audit per-scene `objects` arrays and adjust `DHYH_LOCATION_TIMELINE` bands. Don't add forward-fill logic.
- **Asset hygiene** (HANDOFF §5). `_archive/`, `*.backup.*`, `_Temp/`, `dist/` never go to git. The `.gitignore` and `.vercelignore` already enforce this.
- **`<video>.currentTime` is clip-time, never source-time** (HANDOFF §6, §15). Only `dhyhScenes.ts → remapSceneToClipTime` touches source time.
- **Two deployments**, never assume target. Always ask before pushing or deploying (HANDOFF §2).

---

## 3. Target architecture

```
kerv-one-theme/                    # NEW — KERV design-system package (Phase 1)
  package.json                     # @kerv-one/theme — installable via file:./kerv-one-theme
  README.md                        # consumer-facing usage docs
  INTEGRATION_NOTES.md              # version-compat analysis + adoption paths
  src/
    index.ts
    theme.ts                       # createTheme() + module augmentations
    components/
      AppShell.tsx                 # gradient background wrapper
      GlassSection.tsx             # frosted-glass content container

src/
  App.tsx                          # top-level orchestration, ~250 LOC after decomposition (was 540)
  main.tsx                         # entry, wraps with <ThemeProvider theme={kervTheme}> after Phase 1
  index.css                        # global base styles

  demo/
    constants.ts                   # shrinks ~70% — most things move into ad-modes/ and content/
    types.ts                       # shared TS types
    styles.ts                      # transitional, eventually merged into theme/

    auth/                          # ✅ DONE (this pass)
      types.ts
      MockAuthService.ts
      CognitoAuthService.ts
      resolveAuthService.ts
      index.ts
      README.md

    ad-modes/                      # NEW — Phase 2
      types.ts                     # AdModeDefinition, OverlayProps
      registry.ts                  # AD_MODE_REGISTRY: Record<AdMode, AdModeDefinition>
      modes/
        sync/                      # plain Sync, no overlay
          config.ts
          fixtures.json
        sync-lbar/                 # L-bar overlay
          config.ts
          fixtures.json
          Overlay.tsx
        sync-impulse/              # QR + companion + radial gradients
          config.ts
          fixtures.json
          Overlay.tsx
        # future modes follow the same pattern:
        # pause-ad/, cta-pause/, organic-pause/, carousel-shop/
      README.md                    # the recipe for adding a new mode

    content/                       # NEW — Phase 5a (org now) + 5b (Zod validation when 2nd tile lands)
      dhyh/
        config.ts                  # tile metadata + content×tier×ad-mode availability map
                                   # (which ad modes are valid at which tier for this content)
        timeline.ts                # DHYH_LOCATION_TIMELINE, splice constants (clip cut points, ad break)
        schema.ts                  # Zod schema for tier JSON (added in 5b once 2 real consumers exist)
        tiers/                     # tier1.json, tier2.json, tier3.json (current dhyh/ folder relocates here)
        ads/                       # creatives + manifests scoped to this content
          sync-lbar/               # per-mode subdirs mirror ad-modes/modes/* shape
          sync-impulse/
        products/                  # any per-content product overrides / curated lists
        compliance/                # per-content compliance JSON, IAB attestations, etc.
        review/                    # one-off generated artifacts (e.g. dhyh-products.json) — kept
                                   # out of project root so future content folders stay self-contained

    sources/                       # ✅ Done — Phase 3
      types.ts                     # ContentId, TierJsonPayload, ProductImageInput
      resolveTierPayload.ts        # tier-JSON loader (env-flag swappable + bundled fallback)
      resolveProductImage.ts       # product-image URL resolver (content-id aware)
      index.ts                     # barrel
      README.md                    # S3 wiring + upload-feature pathway

    components/
      DemoView.tsx                 # shell + composition, ~300 LOC after decomposition
      panels/                      # Phase 4
        TaxonomyPanel.tsx          # collapsed inline taxonomy
        ProductPanel.tsx           # collapsed inline product
        JsonPanel.tsx              # collapsed inline JSON
        TaxonomyPanelContent.tsx   # shared between collapsed + expanded
        ProductPanelContent.tsx    # shared between collapsed + expanded
        JsonPanelContent.tsx       # shared between collapsed + expanded
      player/                      # Phase 4
        VideoPlayer.tsx            # video + overlays
        PlayerControls.tsx         # scrubber, play/pause, volume
        AdOverlay.tsx              # QR, companion zone, gradients (delegates to ad-modes/*/Overlay)
        ImpulseTimeline.tsx        # segment timeline (Sync: Impulse only)
      dialogs/
        ExpandedPanelDialog.tsx    # refactored, ~200 LOC composing panel content
        CompanionDialog.tsx
        JsonDownloadDialog.tsx
        SelectorDialog.tsx
        VerifyEmailDialog.tsx
      primitives/                  # Phase 4
        PanelGlyph.tsx             # already exists
        PanelHeader.tsx            # NEW — icon + title + close/expand
        DialogTitleBar.tsx         # NEW — title + close button row
        SceneAnchor.tsx            # NEW — "Scene N · 0:00"
        EmptyStateMessage.tsx      # NEW — standard empty-panel copy
      layout/
        AuthenticatedHeader.tsx
        TitlePanel.tsx             # NEW — extracted Tier + Ad Playback dropdowns

    hooks/                         # Phase 6
      useDemoPlayback.ts           # orchestrator, ~200 LOC after decomposition (was 1336)
      useActiveScene.ts            # scene-from-clip-time
      useAdBreakState.ts           # mode-dependent durations + segment + clip-time pinning
      useProductEntries.ts         # dedupe + segment isolation
      usePanelScroll.ts            # ⚠ KEEP UNIFIED — RAF + manual override + snap heuristic
      useVideoSync.ts              # play/pause/seek for both video elements

    data/                          # mostly preserved, partially migrated to content/
      adFixtures.ts                # may move into ad-modes/
      contentItems.ts              # tile catalog (until content/ exists)
      sceneMetadata.ts             # mock scenes for non-DHYH placeholders
      taxonomySceneData.ts         # taxonomy panel card builder
      dhyhScenes.ts                # remap + buildBundle (moves under content/dhyh/)

    utils/                         # mostly preserved
      formatTime.ts
      jsonExport.ts
      sessionStorage.ts

  tests/                           # Phase 7 — NEW
    e2e/
      golden-path.spec.ts          # login → DHYH → Tier3 + Sync: Impulse → 1:47 ad break
    unit/
      panel-scroll.spec.ts         # protected behavior — discontinuity heuristic
      location-timeline.spec.ts    # protected behavior — DHYH_LOCATION_TIMELINE
      product-segment-isolation.spec.ts # protected behavior — pre/post ad split
```

**Out of `src/`:**

- **`.github/workflows/ci.yml`** — Phase 8 — runs `tsc --noEmit`, `npm run build`, `npm run lint`, `npm test` on every push.

---

## 4. Phased plan

Each phase lands as one or more commits on `feat/restructuring-pass`. The plan is intentionally ordered so each phase leaves the demo working — no half-finished interim states.

| Phase | Scope | Risk | Status |
|---|---|---|---|
| **0. Auth abstraction** | `src/demo/auth/` (mock + Cognito stub) | Low | ✅ Done — commit `f383b98` |
| **1a. Adopt KERV theme kit (install + wire)** | `npm install ./kerv-one-theme --legacy-peer-deps`, Open Sans `<link>`, `<ThemeProvider>` + `<CssBaseline>` in main.tsx | Low | ✅ Done — commit `4faa100` (Path A; visually verified by user) |
| **1b. Migrate inline literals to theme tokens** | Replace 27 hardcoded `#ED005E` → `theme.palette.primary.main`; opacity literals → semantic tokens; outer gradient → `<AppShell>` | Low | ✅ Done — commit `2b79e5a` (17 inline literals migrated; styles.ts deferred to Phase 4) |
| **2. Ad-mode registry** | `src/demo/ad-modes/`, registry pattern, migrate `useDemoPlayback` and `DemoView` consumers | Medium | ✅ Done — commit `67230b6` (3 active modes + 5 disabled stubs; cookbook in `src/demo/ad-modes/README.md`) |
| **3. S3 source resolvers** | `src/demo/sources/`, abstract tier-JSON + product-image loading | Low | ✅ Done — commit `a2d488c` (env-flag swap via `VITE_CONTENT_SOURCE_BASE_URL`; foundation for the future content-upload feature) |
| **4. Component decomposition** | Split DemoView + ExpandedPanelDialog, extract panels/, player/, primitives/ | Medium | 🟡 In progress — 4a done (`4fc701f`, file relocations); 4b/4c remaining. **Recalibrated estimate: 45–75 min total** (down from 1–2 hr based on observed actuals running ~30% under upper bound across phases 1–3) |
| **5a. Per-content org + content×tier×ad-mode model** | Stand up `src/demo/content/dhyh/` with `config.ts`, `timeline.ts`, `tiers/`, `ads/`, `products/`, `compliance/`, `review/`. Relocate existing DHYH artifacts: `src/demo/data/dhyh/tier{1,2,3}.json` → `tiers/`; DHYH-specific constants from `constants.ts` (splice points, ad-break duration, location timeline) → `timeline.ts`; root-level `dhyh-products.json` → `review/`. Update `sources/resolveTierPayload.ts` to read from the new location. Promote ad-mode availability to a **`content × tier`** lookup in each content's `config.ts` so a future Tier-3-only mode (e.g. `carousel-shop`) is one config edit, not a code change — `ENABLED_AD_MODE_IDS` becomes a fallback / global cap. **No behavior changes**; DHYH renders identically, just powered by the new structure. | Medium | ✅ Done — commit `d7fefe7` (`getAvailableAdModes(contentId, tier)` resolver in `src/demo/content/index.ts`; DHYH config registers `defaultAdModes` only since all 3 enabled tiers offer the same modes today; `dhyhScenes.ts` also relocated to `content/dhyh/scenes.ts`) |
| **5b. Zod validation + finalize APIs** | Once a real 2nd content tile exists (or is committed-to), add `schema.ts` per content, validate at load time, lock the final shape of `config.ts` / tier JSON / ad manifests with two real consumers having stressed it. | Low | ⏳ Deferred until 2nd tile is real |
| **6. Hook decomposition** | **Redirected mid-phase.** The original "split into 4–7 narrower hooks" plan would have required lifting state across hook boundaries (`isDhyhContent`, `isSyncImpulseMode`, `panelTimelineSeconds` are shared by 4–5 of those hooks), passing 8+ refs as parameters, and maintaining careful effect ordering across files — net: a more complex graph for engineers to reason about, not less. After 6a landed and exposed the full hook body, the better redirect was **pure-function extraction in 6a's shape**: lift each pure-logic block into a testable module while leaving the React glue as one hook. Real testability gains, lower risk, complementary to Phase 7's test net. Sub-phases below. Hook went from 1362 → 1047 LOC (-315 LOC, all to testable modules; 78 new unit tests). | Medium | ✅ Done — see 6a–6d below |
| **6a. Panel-scroll engine + HANDOFF §9 discontinuity heuristic** | `src/demo/hooks/panelScroll.ts` — `decidePanelScrollAction` (the §9 rule itself), `buildPanelScrollTarget`, `resolveSceneScrollTarget`, `resolveProductScrollTarget`, `walkBackForRef`, `createPanelManualScrollState`. | Low | ✅ Done — commit `23eb1b8` (22 unit tests) |
| **6b. Ad-break / clip-time math (HANDOFF §6)** | `src/demo/utils/adBreakMath.ts` — `mapPlayerToClipSeconds`, `buildDhyhImpulseSegments`, `findActiveImpulseSegment`, `isAdBreakSegment`, `computeAdBreakProgress`. | Low | ✅ Done — commit `b468854` (24 unit tests) |
| **6c. Product entries + segment isolation (HANDOFF §6)** | `src/demo/utils/productEntries.ts` — `buildProductEntries`, `splitProductEntriesAroundAdBreak`, `buildAllProductEntries`, `resolveActiveProductIndex`. | Low | ✅ Done — commit `2a018e0` (18 unit tests) |
| **6d. Scene-state resolvers** | `src/demo/utils/sceneState.ts` — `resolveActiveSceneIndex`, `resolveTaxonomyAvailability`. | Low | ✅ Done — commit `d27ec9a` (14 unit tests) |
| **7a. Vitest scaffold + pure-function tests** | Stand up Vitest via the existing vite.config.ts; unit tests for HANDOFF §6 splice + ad-break, §8 editorial location timeline, the Phase 4 `groupJsonScenes` algorithm, the Phase 5a `getAvailableAdModes` resolver, and `formatTime`. Node env, no DOM. | Low | ✅ Done — commit `6299cdf` (38 tests across 4 files; `npm run test:run` green) |
| **7b. Playwright golden-path** | Playwright install + config; golden-path script (login → DHYH selection → START → demo view loads). HANDOFF §14's "manual golden path" gets a regression net so the demo can't silently break the entry flow. | Low | ✅ Done — commit pending (1 spec; `npm run test:e2e` green; auto-starts Vite dev server via `webServer` config) |
| **8. CI** | GitHub Actions workflow at `.github/workflows/ci.yml` mirroring the local verification chain (tsc → lint → unit tests → build → Playwright e2e). Triggers on every push and PR; concurrency-cancels superseded runs. No deploy step (Vercel handles deployment via its own GitHub integration). The workflow file is local-only until pushed to GitHub — Actions don't activate until a remote sees the file. | Low | ✅ Done — commit pending (lint config also tightened: `kerv-one-theme/` ignored as a vendored package, `argsIgnorePattern: '^_'` added so stub interfaces don't error) |
| **9. Panel sync hardening** | Tighten the collapsed↔expanded "where the panel was" continuity for all three panels (Taxonomies, Products, JSON), and ensure scrubs re-anchor the expanded view. Sync is the demo's primary story — content + taxonomies + products + JSON moving together. Sub-phases 9a–9d below. | Low–Medium | ✅ Done — see 9a–9d below |
| **9a. Products exact-anchor + segment-aligned data source** | Switch the expanded Products view to use the same segment-isolated `productEntries` the inline panel uses (so indices align), pass `activeProductIndex` through, stamp `data-product-anchor={entry.id}` on every expanded ProductCard, scroll lands on the EXACT product collapsed was centered on. Removes both Phase-9-diagnosis bugs in one shot (time-domain mismatch + per-scene-first-product granularity). | Low | ✅ Done — commit `f2a26de` |
| **9b. Scrub-triggered re-sync of expanded panels** | Expose a `scrubVersion` counter from `useDemoPlayback` (bumps on every `flagPanelScrub` call). The expanded dialog's open-time scroll effect re-fires on `(open ∪ scrubVersion change)` — natural playback drift doesn't bump `scrubVersion`, so the user can browse the expanded view freely between scrubs but every explicit scrub re-anchors the view. Multi-taxonomy expanded view inherits the same path (`data-scene-anchor` is taxonomy-agnostic). | Low | ✅ Done — commit `119c33f` |
| **9c. Sync invariant tests** | Cross-resolver composition tests pinning that `(activeSceneIndex, activeProductIndex)` are coherent for any panel-time, plus a sweep across a synthetic timeline confirming we never point at a future product. Segment-isolation invariant explicitly pinned. 8 new tests. | Low | ✅ Done — commit `8b9c175` |
| **9d. Ad-break response future-proofing** | Audited the payload contract: `dhyhCompliancePayload` is `Record<string, unknown>` so future ad formats supply any shape they need. Added optional `dhyhAdResponseLabel?: string` on `AdModeDefinition` so future modes can override the default `'_AdBreak-{1\|2} Response'` label without touching the core hook. Tail (`adDecisioningTail`) stays global until a real second consumer wants its own. Documented in `src/demo/ad-modes/README.md`. | Low | ✅ Done — commit `c1c0a26` |

### Suggested execution order

`0 → 1 → 2 → 3 → 4 → 5a → 7a → 7b → 6a → 6b → 6c → 6d → 8 → 9a → 9b → 9c → 9d` — Phase 5a lands before the test net so the tests pin the new content structure, not the old. Phase 7 splits into 7a (Vitest, pure-function tests) and 7b (Playwright golden-path). Phase 6 redirected mid-phase from "split the hook" to "extract pure functions from the hook" (see Phase 6 row above) — landed as 6a–6d, four pure-function modules + 78 new unit tests. Phase 5b stays deferred until a real 2nd content tile is on the roadmap. Phase 9 is post-structural fine-tuning — best done after the test net so any sync regressions get caught.

### Phase entry criteria

Before starting any phase:
- The previous phase's verification has passed (see §6).
- The working tree is clean on `feat/restructuring-pass`.
- The user has clicked through the golden-path on `localhost:5173` after the previous phase's commit.

---

## 5. Status as of 2026-04-27

### ✅ Done

- Branch `feat/restructuring-pass` created (local only, not pushed).
- **Phase 0 — Auth abstraction.** `src/demo/auth/` with mock + Cognito stub. App.tsx delegates to `authService.signIn()`. See [`src/demo/auth/README.md`](src/demo/auth/README.md). (Commit `f383b98`.)
- **`DESIGN_SYSTEM.md`** — MUI/styling inventory.
- **`EXTENSION_POINTS.md`** — cookbook stub.
- **This document** (`RESTRUCTURING_PLAN.md`) — master spec.
- **KERV theme kit** dropped into [`./kerv-one-theme/`](kerv-one-theme/) pristine. (Commit `a1e4f10`.)
- **Phase 1a — KERV theme kit installed and wired (Path A).** Open Sans loaded, `<ThemeProvider>` + `<CssBaseline>` wrap `<App />`, build clean, golden path visually verified by user with no breakage. See [`kerv-one-theme/INTEGRATION_NOTES.md`](kerv-one-theme/INTEGRATION_NOTES.md). (Commit `4faa100`.)

### 🔜 Next up

Several unblocked options, none strictly depending on the others:

- **Phase 1b — inline literal migration** (~30 min, low risk). Replace 27 hardcoded `#ED005E` with `theme.palette.primary.main`, opacity literals with semantic tokens, outer gradient with `<AppShell>`. Mechanical; finishes the theme adoption.
- **Phase 2 — ad-mode registry** (~60–90 min, medium risk). Originally-stated need: makes adding new ad modes a registry change rather than 8-place archaeology. Touches `useDemoPlayback` and `DemoView`.
- **Phase 3 — S3 source resolvers** (~30–60 min, low risk). Tier-JSON + product-image source abstraction with env-flag swappability. Pairs naturally with the Cognito work already done.

If multiple phases are appetite, suggested order: 1b → 2 → 3, since 1b finishes the theme story before introducing ad-mode overlays that may want theme tokens, and 2 is the highest-stakes business value.

### 🟡 Deferred

| Item | Why deferred | When to revisit |
|---|---|---|
| Cognito live wiring | AWS pool details not yet available | When the team provisions the User Pool |
| S3 live wiring | S3 bucket + CloudFront distro not yet set up | When AWS infrastructure lands |
| Storybook | Adds maintenance overhead; primitives must stabilize first | After Phase 4 completes |
| Visual regression | Same — needs stable primitives | After Phase 4 |
| Router | Current view switching is sufficient | If/when deep-link requirements emerge |

---

## 5b. Process commitments

These rules govern HOW the work happens, not WHAT changes. They're durable across sessions so the agent and the user always know what's expected.

### Time-logging cadence

- The agent updates [`TIME_LOG.md`](TIME_LOG.md) **after every phase commit lands**, not just at session end.
- The agent updates [`TIME_LOG.md`](TIME_LOG.md) **at the start of each new session** for any work that landed in a prior session that wasn't logged at the time.
- The user can also invoke the [`/log-time` skill](.claude/skills/log-time/SKILL.md) at any checkpoint to force a focused update.
- The methodology + per-message archetype model (quick approval / decision / intricate) is documented in `TIME_LOG.md`'s methodology section.

### Phase-estimate calibration

- Each phase's row in §4 below carries an estimate range.
- The "Phase-estimate tracking" table in `TIME_LOG.md` records actual AI Work time per landed phase against the original estimate.
- If estimates consistently land on one side (high or low), the agent recalibrates upper/lower bounds for not-yet-started phases. The current pattern (phases 1–3) is averaging ~30% under the upper bound — Phase 4's estimate has been adjusted accordingly.

### Branch + push policy

- All restructuring work happens on `feat/restructuring-pass` (local-only).
- Never pushed to `origin` or `v2` without **explicit user instruction including the target**.
- See HANDOFF §2 for the two-deployment workflow.

### Verification gates per commit

- Every runtime-touching commit gets `tsc --noEmit` + `npm run build` + `curl localhost:5173/` (200) before commit.
- The user does the visual click-through afterward.
- Doc-only or pure-add commits skip the dev-server check; build is sufficient.

## 6. Verification standards (per phase)

For every runtime-touching change, all five must pass before the phase is marked done:

1. `npx tsc --noEmit` — clean
2. `npm run build` — clean
3. `npm run dev` — boots without console errors
4. `curl http://localhost:5173/` — returns 200 with HTML
5. **Manual click-through** of the golden path: login → DHYH → Tier3 + Sync: Impulse → click into demo → verify all three side panels populate and scroll cleanly through the 1:47 ad break.

After Phase 7 lands, step 5 becomes automated via Playwright. Until then, it requires the human owner.

For doc-only or pure-add changes (Phases 0 docs, 1 token additions before consumers migrate), steps 1–2 are sufficient.

---

## 7. Patterns to follow when adding new code

These conventions exist so the codebase stays coherent across contributors and AI tools:

### File size

Aim for **< 300 LOC per file**. The two-large-files problem is exactly what this pass is solving; don't recreate it. If a file is creeping past 300, it's usually a sign that two concerns belong in two files.

### Single responsibility per module

A `*.ts` / `*.tsx` file should have one reason to change. Auth changes shouldn't touch the player; player changes shouldn't touch panels.

### Co-located fixtures and configs

Per-mode and per-content folders own their own fixtures. Don't centralize all JSON in a top-level `data/` if the JSON is mode- or content-specific.

### Strong types at boundaries

External JSON (tier JSON, ad-compliance fixtures) should be Zod-validated at parse time, not trusted by structure. This catches malformed S3 payloads before they propagate.

### No string-literal mode checks

Once the ad-mode registry lands (Phase 2), `if (mode === 'Sync: Impulse')` becomes `AD_MODE_REGISTRY[mode].behavior.X`. The registry is the single source of truth.

### TypeScript strict mode

The project is on TS strict; keep it that way. `// @ts-ignore` is a code smell — investigate the underlying type issue.

### Don't import across protected boundaries

The hooks under `src/demo/hooks/` should not import from `src/demo/components/`. Components consume hooks, not the other way around. Same for `auth/` not importing from `components/`.

### AI-tool-friendliness

Several conventions exist specifically because engineers will use Claude/GPT/Cursor:
- Files small enough to fit in one AI context window.
- Cookbook docs (`EXTENSION_POINTS.md`, `auth/README.md`) the AI can be told to read first.
- Self-contained module folders the AI can be told to update without loading the whole project.
- Strong types so AI suggestions can't introduce regressions silently.
- Tests so the AI can self-verify after a change.

---

## 8. Glossary

| Term | Meaning |
|---|---|
| **Clip time** | Position in the spliced 10:02 file (what the player and user see). HANDOFF §6. |
| **Source time** | Position in the original 44-min DHYH episode. Only `dhyhScenes.ts` cares. HANDOFF §6. |
| **Protected behavior** | A subtle behavior arrived at through prior iteration that must be preserved across refactors. HANDOFF §9 / §12. |
| **Splice** | The two-segment concatenation that produces `dhyh-cmp.mp4`. HANDOFF §6. |
| **Ad break** | The 30s/30s/45s window inserted at clip time 1:47, with mode-specific creatives. HANDOFF §6. |
| **Tier** | The level of taxonomy detail in the loaded JSON (Basic / Advanced / Exact). HANDOFF §7. |
| **Discontinuity heuristic** | The single global rule in `useDemoPlayback.ts → applyScroll` that snaps panels when the target jumps. HANDOFF §9. |
| **Segment isolation** | The product panel only shows products from the current pre/post-ad segment in the inline view. HANDOFF §8 → Product. |
| **Editorial timeline** | A curated, hand-tuned mapping (e.g. `DHYH_LOCATION_TIMELINE`) used where algorithmic derivation has failed. HANDOFF §8 → Location. |
| **Original / V2** | The two parallel deployments: `sales-demo-prototype` (production) and `sales-demo-v2` (sales-team review). HANDOFF §2. |

---

## 9. Out-of-scope items captured for later

These came up during planning but aren't part of the current restructuring. Capturing them here so they're not forgotten:

- **`.cursor/rules/no-backup-artifacts.mdc` has a stale path table** — it lists tier JSONs at `src/assets/data/...` instead of `src/demo/data/dhyh/...`. One-line fix when convenient.
- **`tsconfig.app.tsbuildinfo`** is showing up as untracked-but-modified. Should be added to `.gitignore` (it's a build cache).
- **`.claude/settings.json`** is appearing as untracked. Should be added to `.gitignore` (user-local Claude Code settings).
- **`SD-HD-Tools-L-bar.mp4` is 60 MB committed** — between GitHub's 50 MB warning and 100 MB hard limit. Consider re-encoding tighter if a similar-sized creative gets added.
- **`HANDOFF.md` itself was untracked** when this branch was created and was committed in the prior pass (commit `b26cf54` on `main`).
