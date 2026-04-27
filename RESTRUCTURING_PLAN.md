# Restructuring Plan — KERV Sales Demo Prototype

**Audience:** Engineers picking up this project from the original UX/UI-led prototype.
**Status:** In progress on branch `feat/restructuring-pass` (local-only, not pushed).
**Last updated:** 2026-04-27.

This document is the master spec for evolving the prototype into a codebase that is comfortable for engineers (and AI coding tools) to extend. It works in tandem with:

- **[`HANDOFF.md`](HANDOFF.md)** — the project's history, conventions, and protected behaviors. Read this first.
- **[`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md)** — MUI/styling inventory + recommended theme evolution.
- **[`EXTENSION_POINTS.md`](EXTENSION_POINTS.md)** — cookbook for "how do I add an X?" routine tasks.

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
src/
  App.tsx                          # top-level orchestration, ~250 LOC after decomposition (was 540)
  main.tsx                         # entry, wraps with <ThemeProvider> after Phase 1
  index.css                        # global base styles

  theme/                           # Phase 1
    index.ts                       # createTheme() + re-exports
    colors.ts                      # brand + neutral palette + alpha scale
    typography.ts                  # named text styles
    spacing.ts                     # spacing tokens
    radius.ts                      # radius tokens

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

    content/                       # NEW — Phase 5 (deferred until 2nd content tile is real)
      dhyh/
        config.ts                  # tile metadata
        timeline.ts                # DHYH_LOCATION_TIMELINE, splice constants
        schema.ts                  # Zod schema for tier JSON
        tiers/                     # tier1.json, tier2.json, tier3.json (current dhyh/ folder relocates here)

    sources/                       # NEW — Phase 3 (S3 prep)
      resolveTierUrl.ts            # tier-JSON loader (env-flag swappable)
      resolveProductImage.ts       # product-image URL resolver
      README.md                    # S3 wiring checklist

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
| **1. Theme + tokens** | `src/theme/`, ThemeProvider in main.tsx, replace `#ED005E` literals with `theme.palette.brand.magenta` | Low | ⏳ Pending |
| **2. Ad-mode registry** | `src/demo/ad-modes/`, registry pattern, migrate `useDemoPlayback` and `DemoView` consumers | Medium | ⏳ Pending |
| **3. S3 source resolvers** | `src/demo/sources/`, abstract tier-JSON + product-image loading | Low | ⏳ Pending |
| **4. Component decomposition** | Split DemoView + ExpandedPanelDialog, extract panels/, player/, primitives/ | Medium | ⏳ Pending |
| **5. Content tile pattern** | `src/demo/content/dhyh/`, Zod schemas for tier JSON | Low | ⏳ Deferred until 2nd tile is real |
| **6. Hook decomposition** | Split `useDemoPlayback` into 4–7 narrower hooks (scroll engine stays unified) | **High** | ⏳ Blocked on Phase 7 |
| **7. Test net** | Playwright golden-path + Vitest unit tests for protected behaviors | Low | ⏳ Should land **before** Phase 6 |
| **8. CI** | GitHub Actions: tsc, build, lint, test | Low | ⏳ Pending |

### Suggested execution order

`0 → 1 → 2 → 3 → 4 → 7 → 6 → 8` — re-orders 6 and 7 because the test net should exist before the riskiest refactor. Phase 5 lands whenever a second content tile is genuinely on the roadmap (no point building the abstraction speculatively for one).

### Phase entry criteria

Before starting any phase:
- The previous phase's verification has passed (see §6).
- The working tree is clean on `feat/restructuring-pass`.
- The user has clicked through the golden-path on `localhost:5173` after the previous phase's commit.

---

## 5. Status as of 2026-04-27

### ✅ Done

- Branch `feat/restructuring-pass` created (local only, not pushed).
- **Phase 0 — Auth abstraction.** `src/demo/auth/` with mock + Cognito stub. App.tsx delegates to `authService.signIn()`. tsc + build clean. See [`src/demo/auth/README.md`](src/demo/auth/README.md).
- **`DESIGN_SYSTEM.md`** — MUI/styling inventory.
- **This document** (`RESTRUCTURING_PLAN.md`) — master spec.

### 🔜 Next up

The unblocked next phase is **Phase 1 (theme + tokens)** because:
- It's pure addition (no existing behavior to preserve).
- It unlocks Phase 2 (ad-mode overlays will use theme tokens).
- Engineers reading the codebase get token clarity immediately.

If a different phase is more urgent (e.g. Phase 2 if a new ad mode is the next business need), it can be reordered — none of 1, 2, 3 strictly depend on each other.

### 🟡 Deferred

| Item | Why deferred | When to revisit |
|---|---|---|
| Cognito live wiring | AWS pool details not yet available | When the team provisions the User Pool |
| S3 live wiring | S3 bucket + CloudFront distro not yet set up | When AWS infrastructure lands |
| Storybook | Adds maintenance overhead; primitives must stabilize first | After Phase 4 completes |
| Visual regression | Same — needs stable primitives | After Phase 4 |
| Router | Current view switching is sufficient | If/when deep-link requirements emerge |

---

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
