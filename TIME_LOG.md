# Time Log — KERV Sales Demo (combined)

Tracks approximate effort across the project's full lifecycle in **two
tracks**, kept separate for traceability but rolled up into a single
combined total:

1. **Cursor engagement** — original prototype build inside Cursor
   (DHYH splice, panel sync, login, deploy paths, V2 work). Dates
   `2026-04-22` → `2026-04-27`. Frozen — these sessions are complete
   and won't grow. Imported from the standalone `TIME_LOG-001.md`
   (kept on disk as the original artifact; this section mirrors its
   data).
2. **Handoff engagement** — the engineering-grade restructuring pass
   + production-deploy + asset-delivery work from the handoff to
   present. Dates `2026-04-27` → ongoing. This is where new sessions
   get appended.

Methodologies differed slightly between the two tracks (Cursor used
session-thematic estimates with ±20–25% uncertainty; the handoff
engagement anchors on commit timestamps + per-message archetypes).
Both are documented under [Methodology](#methodology) below. Treat
the combined totals as a fair rough number; if you need precision
within either track, dig into the per-block notes in that track's
section.

## Methodology

### AI Work column (well-grounded)

Anchored in commit timestamps and tool-call cadence. Each block is
wall-clock between meaningful checkpoints, minus obvious idle gaps.
Roughly accurate ±5 min.

### Prompting column (estimated, ask if it feels off)

Per user message:

```
prompting_time =
    reading_time   (user reading my prior response)
  + thinking_time  (deciding, weighing options)
  + typing_time    (user_message_chars / ~130 chars-per-min)
```

Three rough archetypes I'll classify each user message into:

| Type | Pattern | Reading | Thinking | Typing |
|---|---|---:|---:|---:|
| **Quick approval** | "go", "yes", "looks good" | 1–2m | ≤30s | ≤30s |
| **Decision / lightweight** | choosing between options, brief feedback | 2–3m | 1–2m | 1–3m |
| **Intricate** | technical prompts with context, bug reports with repros, multi-decision messages | 3–5m | 3–8m | 4–10m |

**What's NOT counted as Prompting:**

- Time the AI is working (tool calls, code generation) — you can be doing
  other things in parallel, even if some of it requires occasional "yes"
  clicks. Those clicks themselves are minimal and absorbed into the
  next message's prompting time.
- Visual verification time (clicking through the demo) — happens between
  messages but isn't reading/deciding/typing.
- Errands, breaks, or meetings during long gaps.

**What IS counted:**

- Reading my output before responding.
- Deciding on next steps or approach.
- Typing the message itself.
- Any actual review-and-verify of code that happens *before* you reply
  (e.g. opening files I changed and reading them).

### Calibration

You called out that Session 1's original 75m estimate felt high. The
revision below uses the new methodology and lands closer to 50m for
that session. If a future session's estimate feels off, tell me and
I'll recalibrate the typing speed or thinking-time defaults.

**End-of-engagement recalibration (Session 4 follow-up).** After the
final TIME_LOG checkpoint of Session 4, the user pushed back on the
AI Work column — pointing out that the wall-clock-between-commits
methodology over-credits AI Work for stretches where the human is
reading my output, taking screenshots, composing a debug report,
verifying in the browser, or away from the desk. The AI is *not*
running tools during those stretches even though the commit timestamp
clock keeps ticking.

Reality check from the user: the longest day (Session 4) was actually
~7 hours of focused engagement, not the ~10 hours wall-clock would
suggest. Applied that ratio retroactively across all sessions:

| Session | Logged AI Work | Recalibrated | Reduction |
|---|---:|---:|---:|
| Session 1 (04-27) | 110m | 85m | 23% |
| Session 2 (04-28) | 5m | 5m | 0% (trivial) |
| Session 3 (04-29) | 250m | 180m | 28% |
| Session 4 (04-30) | 587m | 420m | 28% |
| **Sessions 1–4** | **~16h 12m** | **~11h 30m** | **~29%** |

Prompting figures stayed unchanged — those are anchored on
per-message archetype × character count and the human is the
authority on their own time anyway.

**Methodology limitation.** The commit-timestamp anchor works well
when the AI is producing commits at a steady cadence (clearly active).
It breaks down during long conversation stretches (debugging, screenshot
analysis, design discussions) where commits are sparse and most of
the elapsed time is the human side. Future engagements should either
(a) commit more frequently to give the timestamps better resolution,
or (b) explicitly subtract conversation stretches before logging.

### Methodology used for the Cursor engagement (frozen track)

The Cursor sessions below were logged with a slightly different
methodology — copied verbatim from the original `TIME_LOG-001.md`:

> **Prompting (estimated)** — Includes: reading agent output, deciding
> next steps, typing prompts, clarifying constraints, local verification
> when asked (e.g. `localhost:5173` smoke tests, scrubbing the clip,
> confirming Location labels), and quick back-and-forth on deploy
> targets. Typing time inferred from typical message length (~100–140
> chars/min effective when editing technical text). Not counted: idle
> time while the agent ran in parallel unless the human was actively
> reviewing diffs during that window.
>
> **AI Work (estimated)** — Wall-clock style aggregate: code search,
> multi-file edits, terminal runs (`npm run build`, `ffmpeg`, audits),
> Vercel CLI deploys, and long-form doc generation. Uncertainty is
> higher on multi-day threads; treat totals as ±20–25%.
>
> Session boundaries are thematic (major feature arcs), not exact
> calendar blocks.

The Cursor session numbers (1–6) are independent of the Handoff
session numbers (1–5). Together they cover the full project arc.

### Phase-estimate tracking

Each entry in `RESTRUCTURING_PLAN.md` carries a phase-time estimate
(e.g. "Phase 3: ~30–60 min, low risk"). Actual phase times are
recorded in this log's per-session blocks. If a phase systematically
lands above or below its estimate, that's a calibration signal for
future estimates. To date:

| Phase | Estimate | Actual AI Work | Note |
|---|---|---:|---|
| 0. Auth abstraction | (no explicit estimate) | ~30m | Bundled with docs in Session 1 |
| 1a. Kit install + wire | ~30 min | ~25m | At low end |
| 1b. Inline literal migration | ~30 min | ~30m | On target |
| 2. Ad-mode registry | ~60–90 min | ~50m | Below range — registry pattern was straightforward once designed |
| 3. S3 source resolvers | ~30–60 min | ~35m | Low end — much abstraction already existed |
| 4. Component decomposition | ~45–75 min (recalibrated) | ~92m | **Over upper bound by ~23%.** 4a relocations were trivial (~7m) but 4b player extraction ran long (~50m: parallel-playback machinery moved across files, plus a messy intermediate edit + a TS error from a duplicate `PlayerControlTokens` type that needed unwinding). 4c shared cards landed clean (~35m). The ~30%-under-upper-bound pattern from phases 1–3 doesn't extend to Phase 4 — DemoView's player section had more entangled state than the recalibration accounted for. |
| 5a. Per-content org + content×tier×ad-mode model | (no explicit estimate before split) | ~50m | Mostly mechanical relocations + a small forward-looking abstraction (`getAvailableAdModes` resolver). Came in fast because Phase 3 had already abstracted the tier-loading swap-point + product image resolver, so 5a was largely "rename and re-target" rather than design new layers. |
| 6. Hook decomposition (redirected to pure-fn extraction) | (original: ~hours; redirect: ~30–60m) | ~30m | Original "split into 4–7 hooks" plan never executed — re-scoped mid-phase to pure-function extractions when the full hook body proved that splitting would add complexity rather than reduce it. The 30m actual is for the redirect (4 modules + 78 unit tests). The original would have been 2–4 hr easily. |
| 7. Test net (a + b) | ~75–90m projected | ~10m | **Way under.** Vitest scaffold + Playwright + 38 unit tests + 1 e2e in 10m wall-clock. Pure-function tests were trivial against the modules already extracted in Phases 4–5; the Vite/Vitest integration "just worked." Real lesson: late-stage tests on already-clean modules are *much* faster than mid-restructure tests would have been. |
| 8. CI workflow | (no explicit estimate) | ~6m | Single YAML file + lint config tightening. Mechanical. |
| 9. Panel sync hardening (a + b + c + d + e) | ~Low–Medium per plan | ~35m | 4 sub-phases of fixes + 1 verification-driven follow-up. The diagnostic-and-decide work took longer per LOC than the actual coding (Phase 9e changed 17 lines but the screenshot diagnosis took ~12m). Calibration: when the user provides screenshots, budget the prompting time accordingly — visual diagnosis is dense work. |
| Production deploy + MUI dedup + perf saga (post-restructure, unplanned) | (no estimate) | ~135m | Single biggest unplanned block of the engagement. Push to origin → first runtime crash (kerv-one-theme's nested MUI 6 hoisting to top-level node_modules where MUI 7 expects v7 — three-layer fix) → second perf-optimization regression that broke data flow with no JS errors → ~50min of remote diagnosis without a reproduction → reverted, then re-introduced the safe pieces individually. **Calibration takeaway: production deploys are their own phase.** The restructure work assumed deploys were a flip-of-a-switch ("Phase 8 just creates the workflow file"), but real Vercel-vs-local environment differences (npm resolution, install flags, bundle quirks) ate ~2 hours of unplanned time. Future engagements should budget a "first-deploy reality" block separately. |

Phase 3 looking "fast" is an artifact of the lower bound being a
realistic value when prerequisites are in place. The estimate range
itself was reasonable. Phase 4's overrun, by contrast, came from
genuine complexity that wasn't visible from the outside until the
extraction was underway. Phase 5a benefited directly from Phase 3
having pre-abstracted the right seams.

**Late-restructure phases (6 redirect, 7, 8, 9) all came in
significantly under any plausible estimate.** This is the inverse
of Phase 4's overrun: by Phase 6, the foundation phases (1–5a) had
already cleaned up the seams that the late phases needed to hook
into. Lesson: estimates calibrated against early-phase pace
overestimate late-phase pace, not the other way around.

---

## Cursor engagement — pre-handoff (frozen)

These six sessions cover the original Cursor build of the prototype
prior to the handoff to me. Frozen — no new entries get appended here.
Imported from `TIME_LOG-001.md` (kept as-is on disk for traceability).

| Cursor Session | Date | Prompting | AI Work |
|---|---|---:|---:|
| 1 — DHYH two-segment splice, clip vs source time, ad break at 1:47, scrubber / playback contract | 04-22 | 1h 30m | 4h 00m |
| 2 — Panel sync architecture: Taxonomy / Product / JSON; scroll snap + manual override; product segment gates & dedupe | 04-24 | 1h 15m | 3h 30m |
| 3 — Login (hero asset, credentials), content posters, taxonomy dropdown rules (hide Brand Safety, dynamic options, expanded multi-select) | 04-25 | 50m | 2h 15m |
| 4 — Location taxonomy: min overlap filter, curated `DHYH_LOCATION_TIMELINE`, scene override confidence, kitchen band fix | 04-27 | 1h 20m | 4h 15m |
| 5 — V2 path: `.vercelignore`, CLI deploy sizing, image compression + preload, `vite` vendor chunks, two-repo / two-Vercel workflow | 04-27 | 55m | 2h 45m |
| 6 — `HANDOFF.md`, localhost convention, original time log | 04-27 | 25m | 50m |
| **Cursor engagement subtotal** | | **~5h 45m** | **~17h 35m** |

---

## Handoff engagement — restructure + deploy + asset delivery

Five sessions to date covering the engineering-grade restructure pass,
the production-deploy work, and the asset-delivery package. Active —
new sessions get appended here.

### Backlog (sessions to date)

### 2026-04-27 — Session 1: Handoff onboarding + restructuring kickoff

**Wall-clock span:** ~16:30 – 21:32 local (with a ~3-hour gap mid-session while you were away running errands).

| Block | Prompting | AI Work | Notes |
|---|---:|---:|---|
| Handoff acknowledgment + plan + memory writes | 15m | 30m | Read HANDOFF.md end-to-end, wrote plan file, created 8 memory entries |
| Verify state + push to v2 GitHub + smoke test | 10m | 15m | Commit `b26cf54`, push to sales-demo-v2 (intricate prompt: PAT + push targets) |
| Phase 0 (auth abstraction) + 3 docs + gitignore | 15m | 40m | Commits `f383b98` → `5fbf8dc` — mostly approvals while AI worked |
| *— ~3h gap, you were away —* | — | — | |
| KERV theme kit drop + Phase 1a (install + wire) + plan update | 10m | 25m | Commits `a1e4f10` → `a4ba75e` |
| **Session subtotal** | **~50m** | **~85m** | (revised down end-of-engagement to ~85m AI Work after the user pointed out commit-timestamp arithmetic was over-crediting AI Work for stretches where the human was reading / verifying. See calibration note below.) |

### 2026-04-28 — Session 2: Brief check-in only

**Wall-clock span:** short conversation, no code commits.

| Block | Prompting | AI Work | Notes |
|---|---:|---:|---|
| Multi-project Q&A + rate-limit Q&A | 8m | 5m | Two info questions, brief replies |
| **Session subtotal** | **~8m** | **~5m** | |

### 2026-04-29 — Session 3: Phase 1b + Phase 2 + bug fixes + JSON polish

**Wall-clock span:** ~13:30 – ~18:55 (with multiple short user-away gaps, all excluded).

| Block | Prompting | AI Work | Notes |
|---|---:|---:|---|
| Resumption ("go") + Phase 1b inline-literal migration | 5m | 30m | Mostly AI work; user mostly approving. Commits `2b79e5a`, `9adf295` |
| Phase 2 ad-mode registry | 8m | 50m | Registry + per-mode folders + cookbook README. Commits `67230b6`, `5c00fd2` |
| Issue reports + 2 bug fixes | 10m | 25m | Per-tier taxonomy whitelist + snap scrubber to ad-break start on mid-break mode switch. Commits `29e9da5`, `e36308d` |
| Time-tracking spec + methodology refinement | 10m | 15m | Intricate prompt: methodology critique + recalibrate Session 1 estimate. Commits `a2a30f4`, `8b0c87b` |
| 001 reconciliation + ad-mode-switch polish (3 iterations) + Considered cleanup | 25m | 50m | Combined-total reconciliation against existing `TIME_LOG-001.md`. Three-iteration fix for residual ad-mode-switch jank: drop video remount key + hidden preloads, then render-all + opacity flip, then parallel playback with warm decoders. Plus IAB/Location "Considered:" duplication fix. Commits `54d3fef` → `f45777b` (15:39–17:40) |
| JSON panel scene grouping (3 iterations) | 14m | 70m | Initial fingerprint approach, then transcript-keyed + ungroup expanded dialog, then iterative sticky-inheritance algorithm. ~61% reduction in JSON cards across the full clip. Commits `87aa5bd` → `89435f1` (18:13–18:42) |
| TIME_LOG update + day wrap | 2m | 10m | This block. Resume note for tomorrow. |
| **Session subtotal** | **~74m** | **~180m** | (revised down end-of-engagement; original 250m was wall-clock-based and over-credited AI Work during long conversation stretches without commits. See calibration note below.) |

---

### 2026-04-30 — Session 4: Phase 3 + Location panel cleanup

**Wall-clock span:** ~09:00 – ongoing.

| Block | Prompting | AI Work | Notes |
|---|---:|---:|---|
| Phase 3 — S3 source resolvers | 7m | 35m | `src/demo/sources/` module + content-id-aware resolvers + README. Came in at the low end of the original 30–60m estimate; most abstraction (env-flag video URLs, S3 product `image_url` fields) was already in place from earlier phases — only tier loading needed real new code. Commits `a2d488c`, `4c1db75` |
| Location panel-JSON sync (concern #2) | 8m | 25m | Refactored location resolution into a shared `resolveSceneLocation` helper; injected timeline-resolved location into displayed JSON with `source` field marking provenance. Commit `3fbf6da` |
| 'Considered:' cleanup (concern #1) | 6m | 15m | Removed misleading show-wide "Considered:" row from per-scene Location card; cleaned up dead `ShowLocations` plumbing. Commit `cc8ac8b` |
| TIME_LOG update + next-phase coordination | 3m | 10m | First TIME_LOG checkpoint of the session. |
| Phase 4a — component relocations | 2m | 7m | Mechanical mv of components into `dialogs/`, `layout/`, `primitives/`, `player/` subdirectories + import-path fixups. Commit `4fc701f` |
| Process commitments + companion docs | 14m | 30m | Intricate prompt: Phase 4 timing observation + conversation-download Q + auto-time-tracking + skill request. Wrote 268-line `SESSION_LOG.md` (narrative day-by-day history), created `.claude/skills/log-time/SKILL.md`, updated `.gitignore` to track project skills, added §5b process commitments + Phase 4 recalibration to `RESTRUCTURING_PLAN.md`. Commits `14ced8f`, `9f08c5a`, `c3e63d1` |
| Phase 4b — VideoPlayer + PlayerControls extraction | 3m | 50m | Major extraction: `VideoPlayer.tsx` (377 LOC) + `PlayerControls.tsx` (182 LOC), with the parallel-playback `adVideoElementsRef` Map + 2 useEffects relocating from DemoView into VideoPlayer. Hit a messy intermediate edit (orphaned `</Box>`) requiring `sed` cleanup, and a TS error from defining `PlayerControlTokens` locally instead of importing the canonical one in `src/demo/types.ts`. Worked across a `/compact` boundary — full conversation context was summarized mid-extraction and resumed. DemoView 1161 → 793 LOC. Commit `db145da` |
| Phase 4c — shared panel cards | 4m | 35m | Created `TaxonomySceneCard` / `ProductCard` / `JsonSceneCard` in `src/demo/components/cards/`; refactored both `DemoView` (collapsed) and `ExpandedPanelDialog` (expanded) to use them via `variant: 'collapsed' \| 'expanded'` props. ~250 LOC of card-shape duplication collapsed into ~257 LOC of canonical implementation. DemoView 793 → 694 LOC, ExpandedPanelDialog 525 → 462 LOC. Commit `5f0d843` |
| TIME_LOG update + Phase 4 verification offer | 5m | 10m | Pre-break checkpoint. Provided a golden-path browser verification checklist for Phase 4 (deferred — user breaking before walking through). |
| Panel sync drift diagnosis (read-only) | 8m | 15m | User flagged after a 7-min playthrough that the Products panel collapsed→expanded scroll is "close but not exact" and asked to double-check syncing for all three panels. Diagnosed two drift sources without touching code: (1) `targetSceneAnchorId` fallback uses `videoCurrentSeconds` instead of `panelTimelineSeconds` — drifts by the full ad-break duration in DHYH Segment B; (2) `data-scene-anchor` is per-scene-first-product, so multi-product scenes lose sub-scene granularity. Taxonomy + JSON confirmed correct. Queued as Phase 9 instead of fixing now. |
| Phase 5 split + Phase 9 added | 6m | 18m | Two plan-only commits (`970c1a9`, `7e0a576`). User clarified that per-content org should NOT be deferred until a 2nd tile lands (only Zod validation is) and that ad experiences live at the **content × tier** intersection. Expanded Phase 5 scope to cover ads/products/compliance/review subdirs; added Phase 9 (panel sync hardening) capturing the diagnosis above; split Phase 5 into 5a (org now) + 5b (validation later). Updated execution order to `0 → 1 → 2 → 3 → 4 → 5a → 7 → 6 → 8 → 9`. |
| Phase 5a — per-content org + content×tier×ad-mode model | 5m | 50m | Stood up `src/demo/content/dhyh/` with the full directory shape; relocated tier JSONs, `dhyhScenes.ts`, all `DHYH_*` constants, and `dhyh-products.json` (root → `content/dhyh/review/`). Created `src/demo/content/index.ts` with `CONTENT_REGISTRY`, `getContentConfig`, and `getAvailableAdModes(contentId, tier)` resolver. DemoView now reads `availableAdModes` from useDemoPlayback instead of importing the global `ENABLED_AD_MODE_IDS`. `HIDDEN_TAXONOMIES_BY_CONTENT` retired. Build chunked tier1/2/3 to identical sizes after the move. **No behavior change**; user verified golden path. Commits `d7fefe7`, `c370275`. |
| Housekeeping (sources/README + SESSION_LOG + TIME_LOG) | 6m | 20m | First mid-session checkpoint. Updated `sources/README.md` for new `content/<id>/tiers/` paths; appended Session 4's post-noon work to `SESSION_LOG.md`. Commits `e674600`, `df541ad`. |
| Phase 7 (a + b) — test net | 4m | 10m | Vitest scaffold + 38 unit tests across 4 files (formatTime, DHYH timeline invariants, groupJsonScenes, getAvailableAdModes); Playwright install + Chromium browser download + 1 golden-path spec. Came in well under estimate (full Phase 7 originally projected 75–90m); the Vite/Vitest integration was straightforward and the pure-function tests were quick to write against modules already extracted in Phases 4–5. Commits `6299cdf`, `762f717`, `a25393c` |
| Phase 6 (a/b/c/d) — pure-function extractions | 7m | 30m | **Phase redirected mid-execution.** Original plan was "split useDemoPlayback into 4–7 hooks." After reading the 1300-LOC body, recognized that splitting would require lifting state across hook boundaries — a more complex graph for engineers, not less. Surfaced options A (continue split) / B (extract pure functions) / C (stop). User picked B with a question about deployment-quality bar (confirmed yes). Sub-phases extracted `panelScroll.ts`, `adBreakMath.ts`, `productEntries.ts`, `sceneState.ts` — 78 new unit tests, hook 1362 → 1047 LOC. Commits `23eb1b8` → `d27ec9a`, `6c07ed6` |
| Phase 8 — CI workflow | 4m | 6m | GitHub Actions YAML at `.github/workflows/ci.yml` mirroring the local chain (tsc → lint → unit tests → build → Playwright e2e). User asked the clarifying question "is this just preparing the file?" — confirmed yes, no push. Lint config also tightened in the same commit (`kerv-one-theme/` ignored, `argsIgnorePattern: '^_'` added). Commit `5115a90` |
| Phase 9 (a/b/c/d) — sync hardening | 15m | 25m | User's most detailed mandate of the engagement. Audited the full collapsed↔expanded sync surface across 6 panel-state combinations. Sub-phases: 9a (Products exact-anchor + segment-aligned data source), 9b (scrub-triggered re-sync via `scrubVersion` counter), 9c (8 cross-resolver invariant tests), 9d (per-mode `dhyhAdResponseLabel` override for future ad formats). Commits `f2a26de` → `c1c0a26`, `b2eb452` |
| Phase 9e — cross-view sync refinement | 13m | 10m | User verification post-9d caught two new misalignments via screenshots: expanded view rendering future products + cross-panel scene drift in product-less stretches. Diagnostic took most of the time; the fix was small. Two changes: (A) apply `index > activeProductIndex` gate to expanded Products view (B) drop `PRODUCT_DEDUPE_WINDOW_SECONDS` from 180 → 90 so recurring products re-emerge per ~1.5min beat. User verified: *"definitely seems better... we may have to make further adjustments later."* Commit `0d35042` |
| Housekeeping (TIME_LOG + SESSION_LOG checkpoint for Phases 6–9) | 1m | 12m | Second mid-session checkpoint covering `e674600` → `0d35042`. Commit `bb04c2f`. |
| Player control streamline (sizing + hover show/hide) | 6m | 22m | Tightened all three sizing-token states; auto-hide controls on `!isHovered && isVideoPlaying` with 220ms opacity transition + `pointer-events: none`. Commit `36d52d4` |
| JSON download dialog restyle + Summary JSON v1 + v2 | 14m | 30m | Removed the white-pill `<InputLabel>` hack; matched SelectorDialog look. Wrote a real Summary JSON schema per user spec (rollups, brand_safety, scene_digest, etc.), then trimmed v1 → v2 (~50KB → ~7KB) by collapsing scene_digest into beats via `groupJsonScenes`. Commits `5b54b58`, `d9998d0` |
| Push to origin + Vercel deploy + MUI dedup root-cause | 9m | 35m | First push rejected (PAT lacked `workflow` scope). Second push fast-forwarded. First deploy crashed at runtime (`e.alpha is not a function`) — diagnosed as kerv-one-theme's MUI 6 dependency hoisting v6 packages to top-level node_modules where MUI 7 imports look. Three-layer fix: peer-dep refactor on kerv-one-theme, expanded top-level overrides, Vite `resolve.dedupe`. Plus `.npmrc` to force `legacy-peer-deps` on Vercel. Commits `c58e7b4`, `9a8cbac` |
| Perf optimization attempt + silent regression + revert | 8m | 50m | Tried `vercel.json` cache + `preload="auto"` + React.lazy code-splitting in one commit. Deploy succeeded but panels stayed empty — no JS errors, no unhandled rejections, but `dhyhBundle` never reached the React tree. Strongly suspect `React.lazy` + `<Suspense>` interaction with `useDemoPlayback`'s state setter (cached promise resolves once, parent re-mount loses the resolved value). After ~50min of remote diagnosis (curl tests, console pastes, listener install), reverted both perf commits to restore the working state. Commits `e85df38`, `3fdca82`, `44291e1`, `e37563b` |
| Re-introduce safe perf bits one at a time + product image polish | 8m | 25m | Decomposed the broken commit into individual changes. Re-added `vercel.json` cache headers (HTTP-only, no runtime risk) and `preload="auto"` (single attribute, no state risk) as separate commits. **Deliberately NOT** re-added the React.lazy code-splitting. Then product image lazy-load + decoding-async + cache rule for `/assets/products/`. Commits `4223156`, `99a5acc`, `01a0044` |
| Housekeeping (this entry — end-of-day session log) | 1m | 12m | This block. Third checkpoint of the day, covering everything from `bb04c2f` (the second checkpoint at 17:06) through the deploy saga. |
| **Session subtotal so far** | **~167m** | **~420m** | (Single longest day of the engagement. Wall-clock ~09:50 → ~20:10 (~10h elapsed). Initial logging credited ~587m AI Work but the user flagged that as inflated — actual was closer to **7 hours** since significant non-coding stretches happened: extended afternoon break, screenshot-driven debugging while the user composed reports, idle time waiting on Vercel rebuilds. Revised down end-of-engagement to ~420m. See calibration note below.) |

### 2026-05-01 — Session 5: Asset delivery package (one-off, not restructure)

**Wall-clock span:** ~09:08 – ~09:35 local. User stepped away after the initial delivery; later returned with an ad-break-section follow-up request. This entry counts only the time during my actual work — not the gap.

| Block | Prompting | AI Work | Notes |
|---|---:|---:|---|
| Asset extraction + handoff doc | 10m | 25m | Three ffmpeg extractions (Clip 1: ~31s re-encode; Clip 2: ~2:21 re-encode; spliced concat: instant stream-copy), `handoff/HANDOFF-clip-delivery.md` initial draft, `.gitignore` update. ffmpeg run-time counts as AI Work since the tool was active even though the human was idle. |
| Ad-break section expansion | 2m | 7m | User: *"Can you update the handoff doc to also include information on the 'ad-break' time stamp?"* Promoted ad-break info to a dedicated top-level section with ASCII diagram, per-mode timestamps table, and an ffmpeg-concat recipe for partners who want to bake an ad creative into a single deliverable file. Removed the redundant subsection under the sync-model section. |
| **Session subtotal** | **~12m** | **~32m** | Honest from the start — no inflated wall-clock to recalibrate later. |

## Running totals

### Cursor engagement (frozen)

| | Prompting | AI Work |
|---|---:|---:|
| Cursor Session 1 (04-22) | 1h 30m | 4h 00m |
| Cursor Session 2 (04-24) | 1h 15m | 3h 30m |
| Cursor Session 3 (04-25) | 50m | 2h 15m |
| Cursor Session 4 (04-27) | 1h 20m | 4h 15m |
| Cursor Session 5 (04-27) | 55m | 2h 45m |
| Cursor Session 6 (04-27) | 25m | 50m |
| **Cursor subtotal** | **~5h 45m** | **~17h 35m** |

### Handoff engagement (active)

| | Prompting | AI Work |
|---|---:|---:|
| Handoff Session 1 (04-27) | 50m | 85m |
| Handoff Session 2 (04-28) | 8m | 5m |
| Handoff Session 3 (04-29) | 74m | 180m |
| Handoff Session 4 (04-30) | 167m | 420m |
| Handoff Session 5 (05-01) | 12m | 32m |
| **Handoff subtotal** | **~5h 11m** | **~12h 02m** |

### Combined (full project lifecycle)

| | Prompting | AI Work |
|---|---:|---:|
| Cursor engagement | ~5h 45m | ~17h 35m |
| Handoff engagement | ~5h 11m | ~12h 02m |
| **Combined total** | **~10h 56m** | **~29h 37m** |

---

## How this gets updated

After each phase commit lands (or whenever you ask for a checkpoint), I
append a row to the current session's table in the **Handoff engagement**
section. AI Work is anchored in commit timestamps; Prompting follows the
methodology above. The Cursor engagement section is frozen — no new
entries get appended there.

You can adjust any Prompting estimate that feels off — when you do,
mention it and I'll also recalibrate the per-archetype defaults so
future estimates land closer.

If you want a finer-grained breakdown (per-commit instead of per-block),
or a separate calendar-month rollup for reporting, say the word.

This file is intentionally separate from the rest of the project tracking
docs (`HANDOFF.md`, `RESTRUCTURING_PLAN.md`, etc.) so the time data
doesn't bleed into engineering documentation.
