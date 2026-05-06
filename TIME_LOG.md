# Time Log — KERV Sales Demo (combined)

Tracks approximate effort across the project's full lifecycle in **two
tracks**, kept separate for traceability but rolled up into a single
combined total:

1. **Cursor engagement** — original prototype build inside Cursor
   (DHYH splice, panel sync, login, deploy paths, V2 work). Dates
   `2026-04-22` → `2026-04-27`. Frozen — these sessions are complete
   and won't grow. Imported from the standalone Cursor-era log; the
   original lives at `archive/TIME_LOG-001.md` (gitignored, kept on
   disk as a frozen historical artifact). This section mirrors its
   data.
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
methodology — copied verbatim from the original Cursor log
(now archived at `archive/TIME_LOG-001.md`):

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
Imported from the original Cursor log (now archived at
`archive/TIME_LOG-001.md`, gitignored, kept on disk for traceability).

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

### 2026-05-01 — Session 5: Asset delivery + TIME_LOG combine + Figma MCP panel capture

**Wall-clock span:** ~09:08 – ~13:00 local (with multiple stepping-away gaps; entry counts only active work). User returned twice mid-day for follow-ups (ad-break section, then Figma MCP work).

| Block | Prompting | AI Work | Notes |
|---|---:|---:|---|
| Asset extraction + handoff doc | 10m | 25m | Three ffmpeg extractions (Clip 1: ~31s re-encode; Clip 2: ~2:21 re-encode; spliced concat: instant stream-copy), `handoff/HANDOFF-clip-delivery.md` initial draft, `.gitignore` update. ffmpeg run-time counts as AI Work since the tool was active even though the human was idle. |
| Ad-break section expansion | 2m | 7m | User: *"Can you update the handoff doc to also include information on the 'ad-break' time stamp?"* Promoted ad-break info to a dedicated top-level section with ASCII diagram, per-mode timestamps table, and an ffmpeg-concat recipe for partners who want to bake an ad creative into a single deliverable file. Removed the redundant subsection under the sync-model section. |
| TIME_LOG combine (001 → primary) + archive 001 | 5m | 18m | Folded the frozen Cursor-era log into primary `TIME_LOG.md` as a two-track structure (Cursor frozen / Handoff active) with a Combined section. Then moved `TIME_LOG-001.md` to gitignored `archive/` and updated the `.claude/skills/log-time/SKILL.md` path reference. Commits `292aeb3`, `8054459`. |
| Figma MCP panel-capture (no commits, exploratory) | 20m | 32m | Authenticated Figma MCP via OAuth (`ggorton@kerv.ai`, KERV org), injected capture script into `index.html`, started dev server, generated server-side captureIds pre-targeted at the existing KERV Sales Demo file (`fileKey: FFJ7lmfsFVQFDyHnNyqIh2`, `nodeId: 3067:31415`). First toolbar-fired capture worked and landed in the file at sibling node `3069-2`. Subsequent toolbar captures landed nowhere visible — diagnosed that toolbar-generated captureIds discard the URL-hash `existingFile`+`fileKey` targeting and default to creating new files. Offered a console-based workaround (`window.figma.captureForDesign({...})`) so each capture preserves targeting. User reports they got what they needed + ~3–5min of additional work before stepping away. No commits this block; the capture script tag remains in `index.html` per the MCP server's standing guidance ("leave the capture script in the HTML unless the user explicitly asks you to remove it"). |
| **Session subtotal** | **~37m** | **~82m** | Honest from the start — no inflated wall-clock to recalibrate later. |

### 2026-05-05 — Session 6: New ad mode scaffolding (CTA Pause + Organic Pause)

**Wall-clock span:** ~late-morning – ~evening local (with multiple verification gaps as the user tested each iteration in the browser; entry counts only active work). Single-feature day: scaffold the two new pause-triggered ad modes from `0 → working tier-gating + carousel/detail surface ready for next-day refinement`.

| Block | Prompting | AI Work | Notes |
|---|---:|---:|---|
| Discovery + plan + tier-gating + lock | 12m | 50m | Read user brief + sample files in `_Temp-Files/`, ran an Explore-agent codebase mapping for the ad-mode registry seams (`src/demo/ad-modes/`, `getAvailableAdModes`, `useDemoPlayback`'s `shouldShowInContentCta`, the legacy in-content CTA chip in `VideoPlayer.tsx`). Confirmed both modes already existed as disabled stubs. Proposed and got sign-off on plan. Implemented: enabled both modes; added `adModesByTier['Exact Product Match']` to `dhyhContentConfig`; switched `SelectorDialog` from `ENABLED_AD_MODE_IDS` (global) to `availableAdModes` (per-content × tier resolver) so Tier 1/2 stop seeing CTA/Organic; added `App.tsx` effect to auto-reset `selectedAdPlayback` when a tier change makes the current mode invalid; froze the in-playback Tier dropdown with explanatory tooltip while CTA/Organic Pause is active; updated the `getAvailableAdModes` test to pin the new gating contract. Verified by user: gating works as expected. Part of commit `79b85ba`. |
| Pause-overlay scaffolding (initial build) | 10m | 50m | Created `src/demo/components/player/pause-overlay/` with: `pauseOverlay.types.ts` (PauseProductTile / Detail / Payload), `pauseOverlay.placeholder.ts` (5 placeholder tiles + matching detail records), `PauseProductTile.tsx`, `PauseProductCarousel.tsx`, `PauseProductDetail.tsx`, `PauseOverlay.tsx` (routes carousel ↔ detail), and an `index.ts` barrel. Renamed `shouldShowInContentCta` → `isPauseOverlayActive` across `useDemoPlayback`, `App.tsx`, `DemoView.tsx`, `VideoPlayer.tsx` and added `!isVideoPlaying` to the computation so the overlay only mounts on actual pause. Replaced the legacy in-content CTA chip with a mounted `<PauseOverlay>` and removed its `inContentCtaText` plumbing. Type-check + 125 tests green. Part of commit `79b85ba`. |
| Detail card iteration: opaque inner + black backdrop | 9m | 30m | User feedback: detail card was too transparent — content showed through the inner area, breaking readability. Restructured to a two-layer surface: semi-transparent black backdrop fills the player (matching the wash used by expanded panels) and an opaque white inner card hovers on top. Inset proportions ported from Figma's 1540×900 inside 1920×1080 (~10% horizontal / 5% top / 15% bottom — leaving room for Browse + Exit on the backdrop below the card). Pulled exact copy/QR/sponsor measurements via `mcp__figma__get_design_context` against nodes `3083:42282` + `3083:42283`. Image | Copy | QR row, Browse swapped to `ViewCarouselOutlined` icon. Part of commit `79b85ba`. |
| Tile + carousel iteration: slot-anchored, no overlap on focus | 7m | 30m | User feedback: tiles overlapping when focused, scaling needed for any player size. Fetched the carousel Figma reference (node `3083:42129`) to confirm the design intent — slots stay at fixed centres ~500 px apart and tiles grow *within* their slot rather than scaling outward. Rewrote `PauseProductTile` with state-driven width/aspect (89.6% / 99.2% of slot) and rewrote `PauseProductCarousel` with `flex 0 0 calc(100% / 3)` slots + `container-type: inline-size` per slot so tile typography uses `cqw` against the slot width rather than the viewport. All sizing expressed as percentages of the player area. Part of commit `79b85ba`. |
| Tile / sponsor / peek polish | 8m | 30m | User feedback (with screenshot): tile image area too small, sponsor block too prominent, no 4th-tile peek to signal scrollability. Three fixes: (1) image inset bug — `left: '3.5%'` was resolving against tile *width* (~16 px) while the Figma calls for 5 px = ~1.1% of tile width; switched to `top: 3.3% / left: 1.1% / height: 93.4% / aspect-ratio: 1/1` to match Figma's 31% image footprint. (2) Sponsor reverted to the earlier inline label + small chip (`vw`-clamped sizes) — reads as quiet attribution rather than competing with the tiles. (3) Slot width 1/3 → 30% of carousel area + right margin 11% → 4%, so the 4th tile peeks ~33% of its width on the right edge of a 5-tile carousel. Title + CTA inside tiles repositioned to absolute Figma coordinates (35.5% left, 8.6% top / 11.9% bottom). Part of commit `79b85ba`. |
| Commit + TIME_LOG | 1m | 10m | Single commit (`79b85ba`) bundles all of the above: feature work, test update, hook rename, legacy chip removal, scaffolded overlay components. Index.html still has the leftover Figma capture script tag from Session 5 — left uncommitted. This block. |
| **Session subtotal** | **~47m** | **~200m** | Single feature, three rounds of in-browser iteration. User stepping away for the night before final UI verification — overlay refinements likely continue tomorrow. |

### 2026-05-06 — Session 7: Pause-overlay refinement + first-play gating + full CTA Pause JSON wire-up + Organic Pause from Tier 3

**Wall-clock span:** ~09:30 – ~22:00 local (with multiple stepping-away gaps as the user verified each iteration in the browser; entry counts only active work). Single longest day of the Handoff engagement. Continuation of the pause-mode work scaffolded yesterday. Morning: scaffold polish + behaviour spec + two false-start JSON exploration cycles. Afternoon: third-time's-the-charm with `test-moments-json-c` — end-to-end feature integration of the partner JSON, including a new desktop-aspect product-destination modal, scrubber markers, and pause-moments JSON injection in the JSON panel. Evening: stand up Organic Pause end-to-end by deriving its data from `tier3.json` (no upstream organic-pause document yet) — generator script + dual-document adapter + bundled image paths + 90s dedupe + trailing-5 window + small carousel/CTA polish. Closed out with a process safeguard (committed pre-push hook running `npm run build` per the morning's Vercel-build-fail incident) and a new skill so the Organic JSON recipe stays replayable.

| Block | Prompting | AI Work | Notes |
|---|---:|---:|---|
| Pause-overlay polish (4th tile peek + Exit→carousel) | 5m | 25m | User feedback on yesterday's scaffold: 4th tile was clipped inside an inner margin instead of bleeding at the player's right edge, and Exit was resuming playback when it should have gone back to the carousel. Carousel right margin trimmed (4% → 0); slot width changed from 30% to `calc(100%/3.5)` so three full tiles + ~50%-visible 4th tile fit cleanly. Both Exit and Browse now route through `onBackToCarousel`; the dead `onExitOverlay` plumbing through `PauseOverlay` → `VideoPlayer` removed. Part of commit `c65beea`. |
| CTA Pause / Organic Pause behaviour + PauseToShopCta | 14m | 50m | User specced the editorial differentiation: Organic Pause = CTA visible 0–15s, overlay surfaces on any pause after first play; CTA Pause = CTA + overlay both gated to `1:17–1:47` and `2:33–8:52`. Plus a hard rule that nothing pause-related can render before the user has clicked Play once. New `DHYH_ORGANIC_PAUSE_CTA_END_SECONDS` + `DHYH_CTA_PAUSE_WINDOWS` constants in `timeline.ts`; new pure helper `isInPauseWindow` in `src/demo/utils/pauseWindows.ts` with 7 unit tests; new `hasStartedPlayback` state + reset/detect effects in `useDemoPlayback`; `isPauseOverlayActive` updated and new `isPauseToShopCtaVisible` flag added; new `PauseToShopCta` component (magenta-themed `primary.main` pill, scales via `vw` clamps, click pauses the video). Plumbed through `App` → `DemoView` → `VideoPlayer`. Part of commit `c65beea`. |
| Content Selection title fix | 4m | 5m | User flagged the title rendering visibly larger than Figma's h4 spec. `ContentSelectionView.tsx` had a `fontSize: 44` override on the `Typography variant="h4"` — drop the override, MUI's h4 default already matches the design token (34 px, line-height 1.235, letter-spacing 0.25). One-line fix. Commit `91e78ee`. |
| Test JSON exploration (cycled, no commits) | 9m | 63m | Two rounds of partner-supplied test JSON. **Round 1** (`test-moments-json`): full assessment write-up flagging shape vs. content gaps (theme override semantics, source-time vs clip-time stamps, QR URLs not images, top-N capping behaviour, tracker handling). User answered the open questions (use the demo's own magenta/white/grey theme, QR placeholder for now, no padding to 5, replace timestamps with the CTA Pause windows verbatim, ignore trackers). I wired it: local rebased copy at `src/demo/content/dhyh/pause-moments.json`, types + `getActivePauseMomentScene` + `buildPauseOverlayPayload` adapter at `pauseMoments.ts`, 12 resolver tests, plumbed `activePauseOverlayPayload` through `useDemoPlayback` → `App` → `DemoView` → `VideoPlayer`. 144 tests green. **Then user revoked it** ("very unfinished, working on a cleaner solution"). Reverted entirely (deleted JSON + adapter + tests, unwound the prop plumbing) — back to 132 tests. Magenta CTA pill kept (theme decision, not JSON-specific). **Round 2** (`test-moments-json-b`): user expected 2 moments × 5 products with rich detail; actual file had 1 scene × 1 product, still empty `selected_product_background_image` + `background_image`, still QR-as-URL not image, still source-time stamps for non-DHYH (Big Brother) content. Wrote up the discrepancy + three options (wire what's there / synthesize 2×5 from the one product as a template / wait for fuller JSON). User chose **hold** — taking a break, will fix the upstream issue and resume later. No commits this block. |
| Morning commits + TIME_LOG checkpoint | 1m | 10m | Split morning work into two commits: `c65beea` for the pause-overlay polish + behaviour, `91e78ee` for the standalone Content Selection title fix. Plus `c420f30` for the morning's TIME_LOG entry. |
| Test JSON c wire-up + ProductDestinationDialog + qrcode.react + skill | 18m | 65m | Third-attempt partner JSON (`test-moments-json-c`) was complete enough to integrate: 2 moments × 5 products at clip-time-aligned windows, real catalog images, sponsor logo, theme bg images, real CTA artwork URL embedded in the tracker `cta_url`. Local copy at `src/demo/content/dhyh/pause-moments.json` (trackers stripped, `video_id` rewritten to DHYH); types + adapter at `src/demo/content/dhyh/pauseMoments.ts` with `getActivePauseMomentScene` / `buildPauseOverlayPayload` / `extractCtaImageUrl` (peels the `img=` query param off the `cta_url` tracker so the CTA renders as a real image instead of firing the tracker). Added `qrcode.react@^4.2.0` for client-side QR rendering. Wrote `convert-pause-moments-json` skill at `.claude/skills/convert-pause-moments-json/SKILL.md` codifying the partner-JSON → local-JSON conversion rules. Extended `PauseOverlayPayload` with new fields (`pauseToShopCtaImageSrc`, `detailSponsorLogoSrc`, `tileBackgroundImageSrc`, `detailBackgroundImageSrc`, `qrDestinationUrl`); 17 resolver/adapter tests pinning the lifts. New `ProductDestinationDialog.tsx` — desktop-aspect modal for the pause-overlay click-out (vs the mobile-aspect Sync `CompanionDialog`), with iframe + sandbox attribute and a header "open in new tab" affordance. Part of commit `753e332`. |
| Detail card layout iterations (multi-round) | 28m | 85m | Probably the longest single sub-thread of the engagement to date. Rounds: (1) initial assessment-then-plumbing of the new JSON; (2) detail card transparency + "two CTAs" + cut-off title — rebuilt detail card per Figma absolute coordinates; (3) "fonts too big + spacing off + still two CTAs" — switched typography from `vw` to `cqw` against the inner card's container, dropped fixed Stack height that was clipping glyphs, tightened line-heights to 1.05; (4) inline JSX detour: I read the Scan QR SVG path coords and incorrectly concluded the Figma export had the text rendered twice (the two y-coord clusters are actually a single message wrapped to two lines), so I replaced it with `QrCodeScannerOutlinedIcon` + Typography — then user pushed back ("you should be using the provided one"); reverted to SVG, this time hidden when the campaign bg image is set (the partner artwork ships with the CTA baked in, which was the real source of the duplicate visual); (5) sizing pass: switch from Large QR (364×364) to Small QR (250×250) per the user's explicit measurements; restore text-area width to 48% (Figma 740/1540) with a `maxWidth: 740` cap and fluid height. Detail card now matches the Figma 3083:42286 spec to the millimetre at the 1080p reference. Part of commit `753e332`. |
| CTA Pause new affordances (scrubber markers, clickable detail, ProductDestinationDialog isolation, URL overrides) | 18m | 60m | Three feature additions: (a) scrubber markers on the player timeline matching Sync: Impulse styling — red base + cyan rectangles for the two pause-to-shop windows, only when CTA Pause is active; (b) entire detail card is now a click target opening the new `ProductDestinationDialog` pointed at the active product's QR destination URL; (c) Browse button removed (was redundant with Exit). Hit a self-inflicted bug mid-block: parameterised the Sync `openCompanionModal` to accept an optional URL so it could serve both flows — but `<Box onClick={fn}>` passes the click `MouseEvent` as the first arg, which the new signature accepted as the URL, breaking Sync companion. User flagged it and called out the architecture rule: new playback modes get fully isolated handlers + dialogs. Reverted Sync handler to its original no-args form, created a separate `openProductDestinationModal(url)` handler + state + prop chain (`onOpenProductDestination`) that doesn't touch the Sync surface. Saved both architecture decisions as memory entries (`feedback_playback_mode_isolation` + `project_pause_overlay_iframe_fallback`) so future sessions don't re-litigate. Plus `TEMP_PRODUCT_DESTINATION_OVERRIDES` map (Home Depot URLs keyed by product name) so the QR + click-out skip the partner tracker redirect; iframe `sandbox` attribute defeats the JS framebusters that some retailers use. Part of commit `753e332`. |
| Pause-moments JSON in JSON panel | 5m | 22m | New `activePauseMomentScene` field on `useDemoPlayback` returns the live scene from `pause-moments.json` while the CTA Pause overlay is active (otherwise null). Added a new middle branch in the DemoView JSON-panel ternary that renders the active scene's payload (scene number, time range, `objects[].product_match[]`) in the same magenta-on-dark monospace style as the Sync ad-break compliance JSON. Sync branch byte-identical to before; the per-scene-cards branch byte-identical to before. Part of commit `753e332`. |
| Afternoon commit + TIME_LOG | 1m | 10m | Single feature commit (`753e332`) bundles the entire afternoon's CTA Pause work: 20 files changed, 1414 insertions, 260 deletions. |
| First-push Vercel build failure → unused-locals fix → push retry | 4m | 12m | First push of `753e332` to `origin/main` was rejected by Vercel: TS6133 unused-locals error on `captionColor` in `PauseProductDetail.tsx`. `tsc -b` (which Vercel's build runs) is stricter than the `tsc --noEmit` I'd been relying on locally — unused-locals fail the build under project references. Removed the variable; push retry succeeded. Saved `feedback_pre_push_build_check.md` memory enforcing `npm run build` (not `tsc --noEmit`) as the local pre-push verification. Commit `71f4e50`. |
| Organic Pause: Tier 3 → JSON generator + dual-document adapter + 7 resolver tests | 14m | 60m | User spec ("let me try organic pause"): build a generator that re-anchors Tier 3 source-time scenes to clip-time and emits the same `pause-moments.json` shape so Organic Pause can use the existing carousel/detail surface. New `scripts/generate-organic-pause-moments.mjs`, new `src/demo/content/dhyh/organic-pause-moments.json` (auto-generated). Dual resolver in `pauseMoments.ts` (`getActivePauseMomentScene` for CTA / `getActiveOrganicMomentScene` for Organic) sharing internal `findActiveSceneInDocument`. `dhyhCtaPausePayload` / `dhyhOrganicPausePayload` routing in `useDemoPlayback` with mode-aware fallback to placeholder. Mode-aware `ctaPauseSegments` for the scrubber (markers only render when CTA Pause is the active mode). `activePauseMomentScene` resolver routes to the correct document by mode for the JSON panel branch. 7 new resolver tests covering full-clip coverage, 5-product cap, placeholder description, click-out URL via Tier 3 `link`, and theme-block reuse. Part of commit `380f857`. |
| Organic Pause iteration: bundled image paths + Products-panel dedupe + trailing-5 window | 11m | 35m | First-cut generator emitted Tier 3's S3 `image_url` field — images failed to load (CORS / latency). Switched to bundled `/assets/products/<image>` path matching `resolveProductImageUrl`'s local-mode behaviour. Then user reported "not enough products loading" — first cut only emitted each scene's own products (1–5). Borrowed the Products panel's dedupe logic (`PRODUCT_DEDUPE_WINDOW_SECONDS = 90` from `productEntries.ts`) and added a trailing-5 rolling window so each Organic Pause moment shows the 5 most-recently-seen unique products at its clip-time. Result: 250 products across 52 windows. **Critical constraint from user**: "DO NOT change the original product-panel functionality, only borrow for logic purposes" — duplicated the constant by hand into the script and noted it in the script header. Part of commit `380f857`. |
| Tile carousel left-bleed + `PauseToShopCta` to right side | 6m | 14m | User feedback: "tiles get cut on the left when scrolling — they should bleed off the player's edge instead, mirroring the right-side 4th-tile peek." Restructured the carousel container from `left: 11%, right: 0` to full-width `left: 0, right: 0` with `paddingLeft: 11%` on the scroll track itself; because the padding lives inside the overflow:auto container, it scrolls with the content and tiles 1–3 slide past the player's actual left edge. Sponsor row's matching offset moved to `pl: 'calc(11% + 4px)'` so the logo still aligns with the first tile's left edge. Slot width stays `100% / 3.5` of the content box → same per-tile size as before. Plus user's second ask: `PauseToShopCta` from `left: '4%'` to `right: '4%'`. Behavioural difference between CTA Pause (visible inside windows) and Organic Pause (visible 0–15s) is owned upstream and intentionally untouched. Part of commit `380f857`. |
| `generate-organic-pause-json` skill + committed pre-push hook + TIME_LOG | 6m | 35m | Two long-lived process artefacts. New skill at `.claude/skills/generate-organic-pause-json/SKILL.md` codifies the Tier 3 → Organic JSON recipe (splice rebase, dedupe-by-product_id within 90s window, trailing-5 carousel window, bundled image path, theme-block reuse from `pause-moments.json`) so the generator stays replayable when Tier 3 changes. New committed pre-push hook at `.githooks/pre-push` runs `npm run build` and blocks the push if it fails — defence-in-depth against the `tsc -b` strictness gap that caused the morning's Vercel-build failure. Activated locally with `git config core.hooksPath .githooks` (one-time per clone; documented in the hook header). Skill + hook landed in commit `380f857` alongside the feature work. |
| Click-out iframe regression diagnosis (Akamai 403, no code change) | 10m | 35m | User reported the product-detail click-out modal had stopped loading — modal opens, iframe stays blank. Audited every file in the click-chain (App.tsx → DemoView → VideoPlayer → PauseOverlay → PauseProductDetail → ProductDestinationDialog) against the last-known-working push (`753e332`/`71f4e50`); confirmed byte-identical, no commits today touched any of those paths. 24 unit tests still pass including the override-map asserts (Product-1 → Makita, Product-5 → BUCKET-BOSS). `curl -I` against the Makita override URL with a real-browser User-Agent returns `HTTP/2 403 server: AkamaiGHost` directly — Akamai's edge is now denying the URL outright. Yesterday's intermittent loads were Akamai ramping its block as it fingerprinted the dev-session traffic (`localhost:5173` referer, repeated requests). Confirmed via memory `project_pause_overlay_iframe_fallback.md` that this validates Option B (in-app product preview modal) — client-side iframe punch-through is fundamentally fragile against Akamai-class bot detection. Updated the memory entry with the 403 evidence and the "this is end-of-state for the iframe approach" framing. User opted to leave it for tonight; Option B is queued for the next session. No commit beyond this TIME_LOG update. |
| **Session subtotal** | **~2h 34m** | **~9h 46m** | Single longest day of the Handoff engagement (replaces Session 4's prior record). Morning was incremental polish + two false-start JSON exploration cycles (~33m / 153m). Afternoon was the end-to-end CTA Pause integration with the third-attempt partner JSON (~70m / 252m). Evening was the Organic Pause feature derived from Tier 3, capped by a process safeguard — pre-push hook + skill — so the morning's Vercel-build-fail incident doesn't repeat (~41m / 156m), then a closing diagnosis when the click-out iframe stopped loading (~10m / 35m, root cause: Akamai 403, not our code). |

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
| Handoff Session 5 (05-01) | 37m | 82m |
| Handoff Session 6 (05-05) | 47m | 200m |
| Handoff Session 7 (05-06) | 154m | 586m |
| **Handoff subtotal** | **~8h 57m** | **~25h 58m** |

### Combined (full project lifecycle)

| | Prompting | AI Work |
|---|---:|---:|
| Cursor engagement | ~5h 45m | ~17h 35m |
| Handoff engagement | ~8h 57m | ~25h 58m |
| **Combined total** | **~14h 42m** | **~43h 33m** |

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
