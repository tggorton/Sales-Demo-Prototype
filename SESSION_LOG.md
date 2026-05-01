# Session Log — KERV Sales Demo Restructuring

**Coverage:** 2026-04-27 → present (this branch's lifetime).
**Audience:** Anyone (you, an engineer, future-me after compaction) who needs the *narrative* context behind the commits — what was discussed, what trade-offs were weighed, what the user observed visually, what's still open.

The git log is the authoritative technical record (every change has a detailed commit message). The six docs at the project root (`HANDOFF.md`, `RESTRUCTURING_PLAN.md`, `EXTENSION_POINTS.md`, `DESIGN_SYSTEM.md`, `TIME_LOG.md`, and this file) capture documented state. The pre-handoff Cursor log lives at `archive/TIME_LOG-001.md` (gitignored, frozen) — its data is mirrored into `TIME_LOG.md`'s "Cursor engagement" section so the canonical totals are in one place. **This file fills the gap between "what changed" and "why we made that call"** — and surfaces user-facing observations and future considerations that don't fit naturally in any other doc.

---

## How to use this doc

- **Just landed on the project?** Read [`HANDOFF.md`](HANDOFF.md) first (project conventions + protected behaviors), then [`RESTRUCTURING_PLAN.md`](RESTRUCTURING_PLAN.md) (target architecture + phase status), then this doc for the human/decision context.
- **Trying to remember a specific decision?** Search this doc by keyword — every major call is captured with the rationale, often with the user's exact framing.
- **Trying to find a specific commit?** Use the commit reference table at the bottom.
- **Want to know what's still open?** See [§ Future considerations](#future-considerations) and [§ Open threads](#open-threads).

---

## Engagement framing

The user (a UX/UI designer) inherited a working KERV Sales Demo prototype originally built with AI assistance in Cursor (per [`archive/TIME_LOG-001.md`](archive/TIME_LOG-001.md), ~5h45m / ~17h35m of pre-handoff work across 6 thematic sessions). On 2026-04-27 they handed it off here for an engineering-grade restructuring pass — making the codebase comfortable for engineers (and AI coding tools like Claude/GPT/Cursor) to extend with new ad modes, new content tiles, and eventually integrate AWS Cognito and S3.

**Two parallel deployments are live and intentionally divergent:**
- `sales-demo-prototype` (production demo) — `origin` remote, hosted on Vercel
- `sales-demo-v2` (sales-team review) — `v2` remote, hosted on Vercel

**Working rule:** all restructuring work happens on `feat/restructuring-pass` (local-only, never pushed). When the user is ready to ship, they decide which remote(s) to push to. The user explicitly asked for this isolation: *"I don't want to push anything to git yet --- as if something goes wrong, I will still be able to restore from the current repos."*

---

## Sessions

### 2026-04-27 — Session 1: Handoff onboarding + restructuring kickoff

**Wall-clock span:** ~16:30 – 21:32 local. Multi-hour user-away gap mid-session (errands).

**Ground rules established early:**
- *"localhost should be set to '5173'"* — never substitute `127.0.0.1` when sharing dev URLs.
- Two-deployment workflow: ALWAYS ask the user which target before any push or deploy.
- Asset hygiene: never `git add` `_archive/`, `*.backup.*`, `_Temp/`, `dist/`, large mp4s.
- The user's prior `HANDOFF.md` documents protected behaviors (panel scroll discontinuity heuristic §9, location editorial timeline §8, product segment isolation §8 → Product, ad-break splice §6) — these must survive any refactor.

**Inflight at handoff:**
- Local working tree had uncommitted changes (location-timeline editorial fix + image compression + Vite vendor chunking) deployed to v2 Vercel via `npx vercel --prod` CLI but NOT committed to either GitHub repo.
- v2 GitHub integration was reconnected on 2026-04-27.

**First action — get the work into git.** Per the user's request, committed and pushed to v2 only (left `origin` untouched). Used a temporary PAT they provided. Commit `b26cf54` ("Editorial location timeline, JPG hero/poster, vendor chunk splitting, handoff doc") landed on `main` and was fast-forwarded to v2 (`6facb34..b26cf54`). After the push, the v2 git remote was added locally with a clean URL so future pushes don't re-supply the token.

**Restructuring planning conversation.** The user asked: *"is there any recommendation you have for restructuring the project?"* — they want engineers + AI tools to be able to pick up the project comfortably, with future cases like new ad modes (*"adding additional ad formats in the 'ad playback mode' section"*), new content tiles, S3 migration, and Cognito migration in mind.

I delegated three parallel Explore agents to audit:
1. Ad-type wiring across the codebase
2. Component structure (`DemoView.tsx` ~1034 LOC, `ExpandedPanelDialog.tsx` ~519 LOC)
3. The playback hook (`useDemoPlayback.ts` ~1336 LOC)

Findings:
- **65+ mode-aware string conditionals** across 5+ files for the 3 active ad modes — clear candidate for a registry pattern.
- **~250 LOC of duplicated panel-rendering code** between `DemoView` (collapsed inline panels) and `ExpandedPanelDialog` (fullscreen).
- The playback hook has 11 interdependent subsystems; the scroll engine + manual-override + global snap heuristic is a *cohesive state machine* that must NOT be split (HANDOFF §9 explicitly warns against this).

**Recommended restructuring (8 phases):**
| Phase | Scope | Risk |
|---|---|---|
| 0 | Auth abstraction | Low |
| 1a | Theme + tokens (initially "build from scratch") | Low |
| 1b | Inline literal migration | Low |
| 2 | Ad-mode registry | Medium |
| 3 | S3 source resolvers | Low |
| 4 | Component decomposition | Medium |
| 5 | Content tile pattern (deferred until 2nd content tile is real) | — |
| 6 | Hook decomposition | High (needs test net first) |
| 7 | Golden-path Playwright test | Low |
| 8 | GitHub Actions CI | Low |

User-driven scope adjustment: *"I'm not ready for the s3/cognito steps yet, as I don't have the details necessary"* — but they wanted abstractions in place so future swap is easy. The scope was tightened: prep abstractions now, defer live wiring.

**Time-estimate calibration moment.** I initially estimated "5–7 dev-days" for the full pass. The user pushed back: that felt high. I clarified — that was *senior-engineer hours*, not literal AI compute. Realistic AI active session time was 10–15 hours total spread across multiple sessions. The user accepted this and asked about Pro account costs (flat fee, possible rate limiting on long pushes, no extra billing). They opted to start work the same evening.

**Work landed (commits in chronological order):**
| Commit | Scope |
|---|---|
| `f383b98` | Phase 0 — auth abstraction (`src/demo/auth/` with `MockAuthService` + Cognito stub + integration checklist README) |
| `797e428` | `DESIGN_SYSTEM.md` — MUI inventory (185 inline `sx`, 27 `#ED005E` literals, all theme tokens cataloged) |
| `53e8eb8` | `RESTRUCTURING_PLAN.md` — master spec for engineers |
| `9e78bf5` | `EXTENSION_POINTS.md` — cookbook stub for routine additions |
| `5fbf8dc` | Gitignore `*.tsbuildinfo` + `.claude/` |
| *(user away ~3 hr)* | |
| `a1e4f10` | Drop `@kerv-one/theme` kit (user provided files mid-session: package.json, README, theme.ts, AppShell, GlassSection) — pristine, with `INTEGRATION_NOTES.md` analyzing the React 18/19 + MUI 6/7 version mismatch |
| `4faa100` | Phase 1a — install kit (`--legacy-peer-deps`, accept peer warnings, kit's APIs are stable across both major versions); wire `<ThemeProvider>` + `<CssBaseline>` + Open Sans; outer gradient stays inline pending 1b |
| `a4ba75e` | Mark Phase 1a done |

**User verification (Phase 1a):** *"Nothing looks broken. At least not within that path. Seems okay."* — visual changes confirmed (frosted-glass dialogs, slimmer scrollbars, button shadow removal, Open Sans typography). Magenta `#ED005E` is identical in the kit's `primary.main` so brand color is preserved.

---

### 2026-04-28 — Session 2: Brief check-in only

No commits. Two short clarifying conversations:

1. **Multi-project workflow.** The user asked if they could open another VS Code project without affecting this one — confirmed: VS Code windows are per-folder, fully independent. Each Claude Code session shares the user's Pro account budget but doesn't interfere with the other.
2. **Rate-limit behavior.** Pro is a flat-fee subscription with rolling 5-hour windows. Hitting a limit pauses the conversation (UI greys out) but doesn't bill anything extra and preserves the conversation state. The work survives.

---

### 2026-04-29 — Session 3: Phase 1b + Phase 2 + bug fixes + JSON grouping (the long day)

**Wall-clock span:** ~13:30 – ~18:55 local. Multiple short user-away gaps (excluded from time log).

**Phase 1b — inline literal migration.** Replaced 17 inline `#ED005E` / `#cf0052` / `#9A1B52` / `rgba(0,0,0,0.6)` / `rgba(0,0,0,0.87)` literals with theme tokens (`primary.main`, `primary.dark`, `primary.darkest`, `text.secondary`, `text.primary`). App.tsx's outer `<Box>` swapped for `<AppShell>`. Color-identical for primary magenta; minor brand-aligned shifts on the dark variants. Commits `2b79e5a`, `9adf295`. **User: *"Nothing really looks broken."***

**Phase 2 — ad-mode registry.** This was the user's originally-stated motivating need. Created `src/demo/ad-modes/` with:
- `types.ts` — `AdModeDefinition` shape
- `registry.ts` — `AD_MODE_REGISTRY` + `ENABLED_AD_MODE_IDS` + `isSyncAdBreakMode` helper
- Per-mode folders for the 3 active modes (Sync / Sync: L-Bar / Sync: Impulse) + 5 disabled stubs (Pause Ad / CTA Pause / Organic Pause / Carousel Shop / Companion)
- `README.md` — cookbook for adding/enabling modes

JSON fixtures (`ad-compliance-results-*.json`) `git mv`'d into the per-mode folders. `useDemoPlayback.ts`'s six mode-aware ternaries collapsed to single registry lookups. Commits `67230b6`, `5c00fd2`. **No runtime behavior change.**

**User-reported bugs surfaced after Phase 2:**

1. **Mid-break ad-mode switch was choppy.** *"the playback when I do that is still choppy."* This took **three iterations** to resolve:
   - First attempt (`54d3fef`) — drop the `key={activeAdVideoUrl}` from the ad `<video>` so React reuses the DOM element across src changes; add hidden preload siblings for alternate creatives. **Didn't fully solve it.**
   - Second attempt (`967eea9`) — render all enabled ad creatives concurrently, opacity-flip between them. Ref-Map effect forwards the active element to `adVideoRef`. Pause inactive ones. **Still choppy.**
   - Third attempt (`1f20b6b`) — keep all ad videos *playing in parallel* during the break (decoders warm, inactive ones silently muted). Switching mode mid-break is now a pure opacity + mute flip, no `play()` startup cost. **User: *"That is better! Fixed!"***

2. **Per-tier taxonomy whitelist** (`29e9da5`). User reported the dropdown for Tier 1 (Basic Scene) was showing Location, which Tier 1's JSON doesn't actually emit — the editorial `DHYH_LOCATION_TIMELINE` was retrofitting Location into every scene's data. Verified the actual tier1.json keys (only `iab_taxonomy`, `garm_category`, `sentiment_analysis`) and added `TAXONOMIES_AVAILABLE_BY_TIER` enforced *before* the data-presence check.

3. **Snap-scrubber-to-ad-start on mid-break mode switch** (`e36308d`) — when ad mode changes during the break, the new creative starts from frame 0 and the scrubber resets to ad-block start. Pre-existing UX issue, not a Phase 2 regression.

4. **"Considered:" duplicating the headline** (`f45777b`) — for IAB and Location panels, the slice/filter included the primary entry, so the card showed the headline value in both "Primary Category:" and "Considered:". Fix: skip primary at index 0 (IAB) and filter resolved name out (Location).

**The JSON panel grouping saga.** The user reported: *"the JSON panel in particular scrolled much differently and slower"* (compared to the v2 baseline) and that it was now *"extremely fast. It is extremely difficult to read/see."* I diffed every relevant file and confirmed the JSON panel code, scroll engine, and JSON-build pipeline were byte-identical to `b26cf54`. The actual cause was different: **scene density**. DHYH emits 1–3s scenes, often near-identical within a beat. The JSON panel was rendering every cut as its own card.

The user's diagnostic insight: *"there are a LOT of repeating elements within a short timespan for the JSON. Maybe if we simplify to not 'duplicate' elements being exposted in the JSON multiple times, and 'combine' scene chunks to make 'sections' of checks that are similar?"*

**Three iterations to land the right algorithm:**
1. `87aa5bd` — fingerprint hash (IAB + GARM + music + location + objects-presence). Sentiment excluded. ~44% reduction. **User: *"It doesn't really seem any different... in the bathroom."*** Two scenes in their example differed only in IAB (model hedging between "Style & Fashion" and "Home Improvement" within the same beat) and weren't merging.
2. `a71cf45` — switched fingerprint to use `audio_transcript` prefix instead of IAB. The model emits the same rolling-window dialogue across cuts in a beat, so transcript-equality is a much stronger same-beat signal. Plus reverted ExpandedPanelDialog to ungrouped per-scene rendering (user wanted full detail in expanded view). ~35% reduction. **Still felt repetitive in the bathroom.**
3. `89435f1` — full rewrite to **iterative sticky-inheritance** algorithm. Adjacent scenes extend the current group unless they actively contradict it. "Empty" values inherit. Splits on: music change, time gap > 15s, explicit transcript-prefix difference, explicit location difference, explicit objects difference. Lead picked dynamically (first scene with non-empty transcript) so card content isn't blank when a beat opens with empty-transcript scenes. **~61% reduction. User: *"This seems better for sure."***

The user explicitly requested the design split: collapsed inline panel = grouped overview; expanded dialog = ungrouped reality (every scene, full JSON).

**Day wrap-up:** time tracking spec landed (`a2a30f4`, `8b0c87b`). Methodology refined after the user pushed back on Session 1's 75m prompting estimate (revised down to 50m using a per-message archetype model — quick approval / decision / intricate).

---

### 2026-04-30 — Session 4: Phases 3 → 9 (full restructure landing day)

The longest single-day sprint of the engagement. Started with Phase 3 (S3 source resolvers) and the Location panel cleanup; ended with Phase 9e (cross-view sync refinement) — the full restructure complete except for the explicitly-deferred Phase 5b (Zod validation, gated on a 2nd content tile arriving). Total day produced 33 commits across Phases 3, 4 (a/b/c), 5a, 6 (a/b/c/d), 7 (a/b), 8, and 9 (a/b/c/d/e), plus three TIME_LOG / SESSION_LOG checkpoints and four `RESTRUCTURING_PLAN` updates.

**Phase 3 — S3 source resolvers** (`a2d488c`, `4c1db75`). The user flagged two future-proofing considerations *before* I started: (1) a new "very different" ad playback mode coming, and (2) eventual content-upload feature for new content packages. I structured Phase 3 to support both:

- `src/demo/sources/` with `resolveTierPayload(contentId, tier)` and `resolveProductImageUrl(contentId, match)`.
- Content-id parameter on every resolver = future content-upload backend can route per-content data through the same code paths without further refactoring.
- `VITE_CONTENT_SOURCE_BASE_URL` env flag swaps from bundled-local to remote fetching.
- Bundled imports preserved for default config (Vite chunks tier JSONs individually).
- `README.md` includes the content-upload pipeline pathway sketch + manifest schema proposal.

**No runtime change in default config.** Phase 3 came in at ~35 min — at the *low* end of the 30–60 min estimate. Most abstraction it depended on (env-flag video URLs, absolute S3 `image_url` fields) was already in place.

**Two user-driven Location panel cleanups** that emerged from a careful review of the inline-vs-JSON correspondence:

1. **Concern #2 — JSON didn't show the location data the panel showed** (`3fbf6da`). User noticed: Scene 3 in clip (source 338) has no `locations` field upstream, but the Location panel says "Construction Site" because of the editorial timeline. The JSON panel was showing only raw upstream JSON — out of sync with the Taxonomy panel. Fix: refactor location resolution into a shared `resolveSceneLocation` helper; inject the resolved value into the displayed JSON when the scene's upstream `locations` is empty. Synthesized entries carry a `source: "editorial_timeline"` field for unambiguous provenance.

2. **Concern #1 — "Considered:" was misleading on the per-scene Location card** (`cc8ac8b`). User: *"considered doesn't seem actually associated specfically with the 'location'... 'Considered:' for 'construction site' is = Considered: Bathroom, Kitchen, Neighborhood. This is a little confusing?"* The "Considered" line was sourcing `payload.video_metadata.locations` (show-wide), not per-scene data. The label implied per-scene reasoning ("alternatives the model considered for THIS scene") which Bathroom/Kitchen/Neighborhood don't fit when the detected location is Construction Site. Fix: remove the row entirely from per-scene cards. Cleaned up the dead `ShowLocations` plumbing. Left a comment breadcrumb for re-introducing show-wide locations as a panel-level header (rather than a per-scene row) if that surface is ever valuable.

**The IAB "Considered:"** stays — for IAB it's genuinely per-scene (sourced from `scene.iab_taxonomy.slice(1, 5)` — secondary categories the model emitted alongside the primary). Honest label, honest data.

**Phase 4a — file relocations** (`4fc701f`). Mechanical reorganization:
- `dialogs/` ← Companion, ExpandedPanel, JsonDownload, Profile, Selector, VerifyEmail
- `layout/` ← AuthenticatedHeader
- `primitives/` ← PanelGlyph

Updated all consumers; rewrote `../X` imports inside moved files to `../../X`. ~12 min of work. **No behavior change.** This established the directory shape for Phase 4b/4c content extraction.

**Process refinement** (`14ced8f`, `9f08c5a`, `c3e63d1`). Mid-session the user flagged that my Phase 4 estimate (1–2 hr) felt high vs. observed pacing on phases 1–3. We agreed on three deliverables before resuming code: (1) `SESSION_LOG.md` itself, as the narrative-history doc this is part of; (2) `/log-time` skill at [`.claude/skills/log-time/SKILL.md`](.claude/skills/log-time/SKILL.md) so the time-log update procedure is invokable rather than ad-hoc; (3) §5b "Process commitments" in [`RESTRUCTURING_PLAN.md`](RESTRUCTURING_PLAN.md) capturing the time-log cadence + phase-estimate calibration rules + the Phase 4 recalibration to 45–75 min.

**Phase 4b — VideoPlayer + PlayerControls extraction** (`db145da`). Pulled the player surface out of `DemoView` into `src/demo/components/player/`: `VideoPlayer.tsx` (video element + ad creative grid + parallel-playback machinery) and `PlayerControls.tsx` (scrubber + play/pause + mute + time readout). The parallel-playback `adVideoElementsRef` Map and its two driving useEffects moved with the player. Two complications: (1) a messy intermediate edit left an orphaned `</Box>` requiring `sed` cleanup; (2) I initially defined a local `PlayerControlTokens` type instead of importing the canonical one from `src/demo/types.ts`, which TS caught with an incompatible `timelineTop` (string vs. number). Fixed the import. Worked across a `/compact` boundary. DemoView dropped 1161 → 793 LOC.

**Phase 4c — shared panel cards** (`5f0d843`). Created `TaxonomySceneCard` / `ProductCard` / `JsonSceneCard` in `src/demo/components/cards/`. Refactored both `DemoView` (collapsed) and `ExpandedPanelDialog` (expanded) to use them via a `variant: 'collapsed' | 'expanded'` prop. ~250 LOC of card-shape duplication collapsed into ~257 LOC of canonical implementation. DemoView 793 → 694, ExpandedPanelDialog 525 → 462.

**Phase 4 actual vs. estimate.** Total ~92 min vs. 45–75 min recalibrated estimate (~23% over). First phase to overshoot. Logged in `TIME_LOG.md`'s phase-estimate tracking — the "phases 1–3 averaging 30% under upper bound" pattern doesn't extend to Phase 4. Phase 4b's player-state entanglement was bigger than the recalibration accounted for; 4a + 4c landed clean.

**Sync diagnosis (read-only)** — user flagged after a 7-min playthrough: Products panel expand-sync is "close but not exact" no matter where playback is. Diagnosed two drift sources without touching code: (1) the on-open `targetSceneAnchorId` fallback uses `videoCurrentSeconds` (player-time) instead of `panelTimelineSeconds` (clip-time), so post-ad-break the expanded view picks a product ~30s ahead of where the collapsed panel was; (2) `data-scene-anchor` is stamped per-scene-first-product, so a scene with multiple products always lands the expanded scroll on product #1. Taxonomy and JSON panels confirmed correct (both pivot on `activeScene` which is panel-time-derived). Queued as a new Phase 9 in the plan rather than a same-session fix — the user wanted to finish the structural restructure before fine-tuning sync.

**Phase 5 split** (`970c1a9`, `7e0a576`). The user clarified that the per-content organizational work in Phase 5 should NOT be deferred until a 2nd content tile lands — only the Zod-schema-validation portion is gated on having a 2nd real consumer. They also flagged that ad experiences need to live at the **content × tier** intersection, not globally, because some future ad modes (e.g. carousel-shop) may be valid only at certain tier levels for a given piece of content. Split Phase 5 into:
- **5a** — per-content org + content×tier×ad-mode availability model (do now)
- **5b** — Zod validation + final API lockdown (still deferred until 2nd tile)

Also added Phase 9 (panel sync hardening) capturing the diagnosis above.

**Phase 5a — per-content org + content×tier×ad-mode** (`d7fefe7`). Stood up `src/demo/content/dhyh/` as the canonical home for everything DHYH owns: `config.ts` (ContentConfig — id, title, hiddenTaxonomies, defaultAdModes, optional adModesByTier), `timeline.ts` (all DHYH_* constants relocated from `constants.ts` — splice points, ad-break time, location timeline, override/overlap thresholds, video URL, companion URL), `scenes.ts` (was `data/dhyhScenes.ts`), `tiers/tier{1,2,3}.json`, plus empty `ads/` `products/` `compliance/` `review/` placeholders. Root-level `dhyh-products.json` moved into `review/` (still gitignored — rule generalized to `src/demo/content/*/review/`).

Created `src/demo/content/index.ts` with `CONTENT_REGISTRY`, `getContentConfig(id)`, and the key new helper `getAvailableAdModes(contentId, tier)` which resolves `config.adModesByTier?.[tier] ?? config.defaultAdModes` then intersects with the globally-enabled set in `ad-modes/registry.ts`. DemoView's ad-mode dropdown now reads `availableAdModes` from `useDemoPlayback` instead of importing `ENABLED_AD_MODE_IDS` directly. A future Tier-3-only mode (the user's `carousel-shop` example) is one config edit, not a code change. Currently DHYH declares `defaultAdModes` only since all 3 enabled tiers offer the same modes today — `adModesByTier` stays unused until the divergence appears.

Per-content `hiddenTaxonomies` retired the old `HIDDEN_TAXONOMIES_BY_CONTENT` global lookup; the value lives on each ContentConfig now and the hook reads it via `getContentConfig(id)?.hiddenTaxonomies`. Build chunked tier1/2/3 to identical sizes after the move (verified — Vite still split them per the dynamic imports in `resolveTierPayload.ts`).

**No behavior changes** in 5a. Golden-path verified by user; the only outstanding observation is the known sync drift queued for Phase 9.

**Phase 7 — test net** (`6299cdf`, `762f717`, `a25393c`). After Phase 5a landed, the next structural slice was the test net so subsequent phases would have regression coverage. Split into:
- **7a** — Vitest scaffold + 38 unit tests across 4 files: `formatTime`, DHYH timeline invariants (HANDOFF §6 splice + §8 location timeline), `groupJsonScenes` (Phase 4 algorithm), `getAvailableAdModes` (Phase 5a content×tier resolver). `npm run test:run` and `npm run test:run` scripts wired through `vite.config.ts`'s `test` block (no separate config file).
- **7b** — Playwright + Chromium download + golden-path spec (login → DHYH → START → demo loads). Runs via `npm run test:e2e`; the config auto-starts `vite dev` so the test net is one command. The HANDOFF §9 panel-scroll discontinuity heuristic deferred from this phase to Phase 6's hook decomposition (testing it in-place would have required either a full hook-render harness or extraction-first anyway).

Phase 7 came in well under the original 75–90m estimate (~10m wall-clock total). The work was simpler than expected — Vitest plays nicely with the existing Vite config, and the pure-function tests were straightforward against the modules already extracted in Phases 4–5.

**Phase 6 — pure-function extractions from `useDemoPlayback`** (`23eb1b8` → `d27ec9a`, `6c07ed6`). User asked to push through the restructure; the original Phase 6 plan (split the 1300-LOC hook into 4–7 narrower hooks) turned out to be more cosmetic than valuable once I read the full hook body — splitting would require lifting state across hook boundaries, threading 8+ refs through subhooks, and maintaining careful effect ordering across files. **Net would be a more complex graph for engineers to reason about, not less.**

Surfaced this mid-phase. Three options: (A) continue with hook splits, (B) redirect to pure-function extractions in 6a's shape, (C) stop. User picked (B), with the asked-for assurance that the codebase still meets a deployable production-quality bar. Confirmed: tsc strict, 60+ tests at that point, clean module boundaries, pluggable seams (Cognito, S3, content uploads), known-imperfect surfaces queued (Phase 9), no error boundaries / telemetry by design (sales-demo prototype scope, not full production webapp).

Sub-phases:
- **6a** — `src/demo/hooks/panelScroll.ts` (HANDOFF §9 discontinuity heuristic + scroll target resolvers). 22 tests pinning the snap-vs-smooth decision.
- **6b** — `src/demo/utils/adBreakMath.ts` (HANDOFF §6 player↔clip mapping + impulse segments). 24 tests.
- **6c** — `src/demo/utils/productEntries.ts` (HANDOFF §6 segment isolation). 18 tests.
- **6d** — `src/demo/utils/sceneState.ts` (active-scene + taxonomy-availability resolvers). 14 tests.

Hook went **1362 → 1047 LOC** (–315 LOC, all to testable modules). 78 new unit tests. No behavior change.

**Phase 8 — CI workflow** (`5115a90`). User asked to clarify: Phase 8 is creating the file locally, not pushing. Confirmed — the workflow is a no-op until pushed to GitHub Actions on a remote. Per the established branching policy (no pushes without explicit instruction), this just stages the file for whenever the user decides to push. Workflow mirrors the local chain: tsc → lint → unit tests → build → e2e. Triggers on push (any branch) + PR. No deploy step (Vercel handles deployment via its own GitHub integration). Lint config tightened in the same commit: `kerv-one-theme/` ignored as a vendored package, `argsIgnorePattern: '^_'` added so stub interfaces don't error.

**Phase 9 — panel sync hardening** (`f2a26de` → `c1c0a26`, `0d35042`). User's most detailed mandate of the engagement: *"This is really important that this part is bullet proof... we need this to be SOLID."* The demo's primary story is "everything connects" — content + taxonomies + product match + raw JSON moving together — so any visible drift undermines the value prop.

Audited the full sync surface across all 6 panel-state combinations (3 panels × collapsed/expanded). Identified four issues that all flowed from the original Products bug the user reported earlier:

- **9a — Products exact-anchor + segment-aligned data source** (`f2a26de`). Two bugs in one fix: (i) the expanded dialog's open-time scroll fallback used `videoCurrentSeconds` (player-time, post-ad-break offset) while the inline panel used `panelTimelineSeconds` (clip-time), so post-ad-break the expanded view lagged by ~30s; (ii) `data-scene-anchor` was stamped only on first-of-scene products, so multi-product scenes always landed the expanded scroll on product #1 regardless of which one collapsed was on. Switch the expanded view to use the SAME segment-isolated `productEntries` (so indices align), pass `activeProductIndex` through, stamp `data-product-anchor={entry.id}` on every expanded product card. Drop the now-unused `allProductEntries` export.
- **9b — Scrub-triggered re-sync** (`119c33f`). Open-time scroll only fired once per dialog open; a scrub during playback didn't re-anchor. Added a `scrubVersion` counter to `useDemoPlayback` that bumps on every `flagPanelScrub` call. Dialog re-fires its scroll effect on `(open ∪ scrubVersion change)`. Natural playback drift doesn't bump it, so the user can browse the expanded view freely between scrubs.
- **9c — Sync invariant tests** (`8b9c175`). 8 tests pinning the cross-resolver composition: for any panel-time, the `(activeSceneIndex, activeProductIndex)` pair both panels see must be coherent. Sweep across a synthetic timeline confirms we never point at a future product. Segment-isolation invariant explicitly pinned.
- **9d — Ad-break response future-proofing** (`c1c0a26`). User flagged: future ad formats will have their own response shapes — *"a bit different in some cases."* Audited the contract. Payload was already fully open (`Record<string, unknown>` per-mode). Label was hardcoded to `'_AdBreak-{1|2} Response'` and not overridable. Added optional `dhyhAdResponseLabel?: string` on `AdModeDefinition` so future modes can override (`'_PauseAd Response'`, etc.) without touching core code.

**User verification of Phase 9 a–d** caught more drift. Two screenshots: the expanded Products panel showed FUTURE products (scenes 88–118 below the active product at clip-time 03:52); the collapsed panels showed Taxonomy parked on scene 77/79 (~03:32–03:42, near playback) but Products parked on scene 64 (02:52, ~1 min behind). Diagnosed both:

- **(A)** Expanded view didn't apply the inline panel's `index > activeProductIndex` filter, so it rendered every product in the list including unreached scenes.
- **(B)** Cross-panel scene drift. At clip-time 03:52, the active scene is ~80, but every candidate product in scenes 65–87 had appeared earlier in the clip and got deduped under the 180s window — leaving the most-recent-past product on scene 64 (02:52). The fallback resolver was returning the right answer for that data; the data just had a 75-second product gap.

**Phase 9e — cross-view sync refinement** (`0d35042`). Two fixes:
- **(A)** Apply the same `index > activeProductIndex` gate to the expanded Products view.
- **(B)** Drop `PRODUCT_DEDUPE_WINDOW_SECONDS` from 180 → 90 so recurring products re-emerge once per ~1.5 min beat. The 180s window was originally tuned against 1–10s adjacent-scene spam; 90s still suppresses that pattern but lets the panel track playback more closely through product-less stretches. Constant comment updated with the specific incident that prompted the change.

User verified: *"This definitely seems better... we may have to make further adjustments later."* Tracking that further-adjustments may be needed is itself a Phase 9 outcome — the diagnostic + dedupe-tuning loop is now well-trodden, so future iteration should be cheap.

**Player control streamline** (`36d52d4`). User: *"It's a little 'big' and I would like to make it a little more 'streamlined'... when all the panels are active the player is in small mode, the player control takes up too much vertical space"* + asked for YouTube-style hover-show/hide. Tightened all three sizing-token states (most aggressive on the 2+ panel "small" state — bar height 52→32, slider container 28→18, timeline 11→5) and added `isHovered || !isVideoPlaying` controls visibility with 220ms opacity transition + `pointer-events: none` when hidden. Bar always shows when paused so first-load users find the play button.

**JSON download dialog restyle + Summary JSON v1 → v2** (`5b54b58`, `d9998d0`). User flagged the "Schedule Report" modal had a misaligned solid-white pill behind the "Download Type" label and asked to match the SelectorDialog look. Removed the `<InputLabel shrink sx={{backgroundColor: '#fff'}}>` hack that produced the pill; restyled with white glass border + centered Typography heading + DialogActions with a top-border separator. Renamed "Schedule Report" → "Download JSON". **The Summary JSON itself was a fabricated client-side artifact** (placeholder, with wrong `ad_breaks` using SYNC_IMPULSE_SEGMENTS instead of DHYH's segments). User provided a real spec — wrote v1 with the full schema (summary_metadata / content_fingerprint / aggregated_taxonomy rollups / brand_safety / commerce_summary / scene_digest / statistical_metadata). User: *"It should be significantly shorter than the original JSON. It should be a simplified high-level version."* Trimmed v1 → v2: collapsed scene_digest into beats via the existing `groupJsonScenes` algorithm (~175 scenes → ~25–35 beats), dropped per-rollup `weight` + `appearances` (kept just `name + share`), omitted empty rollups entirely, shortened top-level keys, dropped redundant fields. Estimated DHYH summary size ~7–8 KB (was ~50 KB in v1; original is ~1 MB+, so ~125–150× smaller).

### 2026-04-30 evening — Vercel production push + deploy saga

**Push to origin** (after user's PAT-mediated authorization). The branch was 63 commits ahead of `origin/main`, zero behind — clean fast-forward. Confirmed with the user that pushing to `origin` (production: `sales-demo-prototype.vercel.app`) doesn't affect v2 (separate repo + separate Vercel project).

**First push rejected**: GitHub PAT lacked `workflow` scope, blocked by Phase 8's `.github/workflows/ci.yml`. User regenerated with `repo` + `workflow`; second push fast-forwarded.

**First Vercel deploy crashed at runtime** (`TypeError: e.alpha is not a function` / `e.lighten is not a function`). Two compounding causes:

1. **Vercel ran `npm install` without `--legacy-peer-deps`**. Fixed by `.npmrc` with `legacy-peer-deps=true` (commit `c58e7b4`) so every environment honors it.
2. **Root cause**: `@kerv-one/theme` had `"@mui/material": "^6.4.0"` as a direct `dependencies` entry. npm hoisted MUI 6's `@mui/system` / `@mui/utils` / `@mui/styled-engine` / `@mui/private-theming` to top-level node_modules where MUI 7's runtime imports look. The `styled()` factory called `.alpha()` on a v6 module with a different shape, blowing up the entire render. **Three-layer fix** (commit `9a8cbac`):
   - **Moved `@mui/material` from kerv-one-theme `dependencies` to `peerDependencies`** (canonical theme-package pattern: consume the host's MUI rather than bring your own). Relaxed React peer to `^18 || ^19`.
   - Top-level `overrides` expanded to cover every `@mui/*` + React.
   - Vite `resolve.dedupe` for the same set as a bundler-level safety net.

After this, the Vercel deploy worked. User: *"That worked."*

**Perf optimization attempt → silent regression → revert** (`e85df38` + `3fdca82`, then `44291e1` + `e37563b`). User reported lag + choppy first-playback. Tried three changes together: (a) `vercel.json` cache headers, (b) `preload="auto"` on content video, (c) `React.lazy` + `<Suspense>` code-splitting for `DemoView` and 5 dialogs. The combination broke the deploy in a particularly nasty way — panels were empty, no JS errors, no unhandled rejections caught, but `dhyhBundle` never reached the React tree. Diagnostic confirmed: tier3 chunk loads correctly (801 scenes available); the React state path between "data loaded" and "DemoView re-renders" silently failed. **Strongly suspect: `React.lazy` + `Suspense` interaction with `useDemoPlayback`'s state setter** — the cached Promise from `bundleCache[tier]` resolves once, but if Suspense re-mounts the parent, the resolved value never re-flows. After ~2 hours of remote debugging, **reverted both perf commits** to restore the working state.

**Re-introduced the safe perf changes one commit at a time** (`4223156`, `99a5acc`, `01a0044`):
- **`vercel.json` cache headers** — pure HTTP config, zero runtime risk. 1-year immutable cache on `/assets/video/`, `/assets/ads/`, `/assets/posters/`, `/assets/elements/`, and `/assets/products/`.
- **`preload="auto"` on the content video** — single attribute. Browser buffers on player mount.
- **Product image optimizations**: `loading="lazy"` + `decoding="async"` on every product `<img>`. Defers fetch until near viewport; decode off main thread. Eliminates the ~50-parallel-image race the panel triggered on mount.

**The React.lazy code-splitting was deliberately NOT re-added.** The bundle-size win (~30KB on the login screen) wasn't worth a second silent-disconnect regression.

User: *"Doesn't seem to have made a huge difference. I think there is work to be done here."* — Acknowledged. Scrub-to-seek lag is the remaining bottleneck; partially mitigated by `preload="auto"` for sequential play but range-fetching new positions inside the 58MB MP4 has unavoidable CDN round-trip cost. Re-encoding the video with **shorter keyframe intervals + lower bitrate** is the remaining content-team lever for further improvement (out of restructure scope).

### 2026-05-01 — Session 5: Asset delivery package for partner handoff (one-off task)

Not a restructuring task — a side request from the user for an asset
delivery package to send to a partner. Scope: full-resolution clips of
the two DHYH segments the demo uses + a spliced version + a handoff
document explaining timestamps and how the demo syncs to them.

**Asset extraction** (frame-accurate re-encode at CRF 18 from the
local-only `dhyh-cmp-full.mp4` 44:15 master):
- `handoff/dhyh-clip1-pre-ad-break.mp4` — Segment A, source `19:45–21:32`, **01:47** runtime, 67 MB.
- `handoff/dhyh-clip2-post-ad-break.mp4` — Segment B, source `35:45–44:00`, **08:15** runtime, 267 MB.
- `handoff/dhyh-spliced-clip.mp4` — concat of the two (no re-encode), **10:02** runtime, 334 MB.

All H.264 1920×1080, AAC 192 kbps, `+faststart` for streaming. Cuts are
frame-accurate (re-encoded with `-ss` after `-i`, not stream-copied).

**Handoff document** (`handoff/HANDOFF-clip-delivery.md`) walks through:
- Asset list with source ranges
- ASCII timeline showing both segments inside the 44:15 source episode
- Three-timeline model the demo uses (source / clip / player time) and how scenes re-anchor across them
- **Dedicated `Ad-break placement` section** with per-mode timestamps:
  the synthetic ad block lives at clip-time `01:47.000` regardless of mode,
  duration is 30s (Sync: Impulse / Sync: L-Bar) or 45s (Sync), and the
  total scrubber length grows accordingly. The break does NOT correspond
  to any source-episode time range — it's UI-injected at the splice point.
- ffmpeg recipes for re-extracting from a different master
- Code-path references for cross-checking (`timeline.ts`, `scenes.ts`, `adBreakMath.ts`)

User followed up asking to expand the doc with more prominent ad-break
information after the first version had it buried in the sync-model
section. Promoted it to a top-level section with its own per-mode
timestamps table + ASCII diagram + a concat recipe partners can use to
bake an ad creative directly into a single playable file.

`/handoff/` is gitignored (large videos, partner-only deliverables) but
the doc itself is the durable artifact — anyone re-running the ffmpeg
extraction commands inside it will reproduce the package byte-for-byte
from the same master.

---

## Future considerations

These are user-flagged items that are **not** part of the current restructuring scope but that the structure should accommodate cleanly when the time comes.

### "Very different" ad playback mode
- User: *"After the restructure, I will be working on a new 'ad playback mode' that will be very different from the current ones."*
- The current `AdModeDefinition` shape is video-centric (duration + URL + compliance JSON). A non-video mode (overlay, multi-trigger, interactive hotspots, etc.) might need additional optional fields.
- Phase 2's registry pattern accommodates this: a new mode is a new folder under `src/demo/ad-modes/modes/<id>/`. If the mode needs new behavior the type can grow optional fields without breaking existing modes.

### Content-upload feature (zip packages)
- User: *"I will also want to build in an 'upload' feature for when there is new content. Basically a zip package with all the necessary assets to support a new piece of content, as well as all the ad formats/assets that go with it."*
- Phase 3's source resolvers are the data-fetching half of this — they accept a `contentId` parameter today even though only `'dhyh'` is wired.
- The remaining work (deferred to Phase 5 in the plan):
  - Manifest registry + schema (per-content config — DHYH's splice constants, location timeline, hidden taxonomies, ad mode list)
  - Upload UI + backend endpoint that extracts zips into the right S3 prefix
  - `useDemoPlayback` (and DHYH-specific paths in `dhyhScenes.ts` / `constants.ts`) need to dispatch on `selectedContent.id` rather than hardcoding DHYH everywhere
- See `src/demo/sources/README.md` for the full pipeline sketch.

### Cognito wiring
- HANDOFF §11 noted the prototype's hardcoded credentials would be replaced by AWS Cognito.
- Phase 0 set up the abstraction (`AuthService` interface + `MockAuthService` for current behavior + `CognitoAuthService` stub with integration checklist).
- Wiring is one env-var change + filling in the stub — pending AWS pool details.

### S3 / CloudFront for media
- Phase 3 resolver layer makes this an env-var change (`VITE_CONTENT_SOURCE_BASE_URL`) + asset upload to the bucket per the documented path convention.
- Pending bucket + CDN setup.

---

## Open threads

These are items I noticed and flagged but haven't acted on. Pick them up when they become relevant.

- **`.cursor/rules/no-backup-artifacts.mdc` has a stale path table.** Lists tier JSONs at `src/assets/data/...` instead of `src/demo/data/dhyh/...`. One-line fix when convenient. Noted in `RESTRUCTURING_PLAN.md` § 9.
- **`SD-HD-Tools-L-bar.mp4` is 60 MB committed** — between GitHub's 50 MB warning and 100 MB hard limit. If a similar-sized creative gets added later, consider transcoding tighter or splitting upload via Git LFS.
- **`HANDOFF.md` itself is now committed** in the repo (was untracked at branch creation). Future agents inherit it from git directly.
- **`TIME_LOG-001.md` from the prior Cursor engagement.** Originally lived at the project root; archived to `archive/TIME_LOG-001.md` on 2026-05-01 once its data had been mirrored into `TIME_LOG.md`'s "Cursor engagement" section. The archive folder is gitignored — file is preserved locally for traceability but not part of the repo.

---

## Process commitments

- **Time logging:** I update `TIME_LOG.md` after every phase commits land (not just at session end). The user can also invoke `/log-time` (skill at `.claude/skills/log-time/`) to force an update at any checkpoint.
- **Phase verification:** every runtime-touching commit gets `tsc --noEmit` + `npm run build` + dev-server-200 check before commit. The user does the visual click-through afterward.
- **Local-only branch:** `feat/restructuring-pass` is never pushed without explicit user instruction. When the user is ready to ship, they pick the target (`origin` for production, `v2` for sales-team review, or both).
- **Asset hygiene:** no `_archive/`, `*.backup.*`, `_Temp/`, `dist/`, large mp4s in commits. Per HANDOFF §5.

---

## Commit reference (chronological)

All commits on `feat/restructuring-pass` since branching from `main` at `b26cf54`.

| # | Hash | Date | Title |
|---:|---|---|---|
| 1 | `f383b98` | 04-27 18:03 | Extract auth into pluggable AuthService (mock + Cognito stub) |
| 2 | `797e428` | 04-27 18:06 | Add `DESIGN_SYSTEM.md` — MUI / token / styling inventory |
| 3 | `53e8eb8` | 04-27 18:08 | Add `RESTRUCTURING_PLAN.md` — master spec for the engineering pass |
| 4 | `9e78bf5` | 04-27 18:10 | Add `EXTENSION_POINTS.md` — cookbook for routine additions |
| 5 | `5fbf8dc` | 04-27 18:10 | Gitignore `*.tsbuildinfo` and `.claude/` |
| 6 | `a1e4f10` | 04-27 21:21 | Drop the `@kerv-one/theme` kit pristine + cross-reference docs |
| 7 | `4faa100` | 04-27 21:28 | Phase 1: install KERV theme kit and wire `<ThemeProvider>` (Path A) |
| 8 | `a4ba75e` | 04-27 21:32 | `RESTRUCTURING_PLAN`: mark Phase 1a (kit install + wire) done |
| 9 | `2b79e5a` | 04-29 14:03 | Phase 1b: migrate inline color literals to KERV theme tokens |
| 10 | `9adf295` | 04-29 14:04 | `RESTRUCTURING_PLAN`: mark Phase 1b done |
| 11 | `67230b6` | 04-29 14:35 | Phase 2: ad-mode registry — single source of truth per mode |
| 12 | `5c00fd2` | 04-29 14:38 | Mark Phase 2 done; promote ad-mode recipes to ✅ Ready in EXTENSION_POINTS |
| 13 | `29e9da5` | 04-29 15:05 | Fix: enforce per-tier taxonomy whitelist in availability calc |
| 14 | `e36308d` | 04-29 15:06 | Fix: snap scrubber to ad-break start when ad mode switches mid-break |
| 15 | `a2a30f4` | 04-29 15:14 | Add `TIME_LOG.md` — track prompting vs AI Work time per session |
| 16 | `8b0c87b` | 04-29 15:23 | `TIME_LOG`: refine methodology + recalibrate Session 1 down to ~50m |
| 17 | `54d3fef` | 04-29 15:39 | Smooth mid-break ad-mode switch: drop video remount key + pre-warm alts |
| 18 | `967eea9` | 04-29 15:49 | Render all enabled ad creatives concurrently; switch via opacity, not src |
| 19 | `1f20b6b` | 04-29 17:34 | Keep all ad videos playing in parallel during break (warm decoders) |
| 20 | `f45777b` | 04-29 17:40 | Fix taxonomy "Considered:" showing the headline value alongside alternatives |
| 21 | `87aa5bd` | 04-29 18:13 | JSON panel: collapse adjacent same-fingerprint scenes into single cards |
| 22 | `a71cf45` | 04-29 18:24 | Refine JSON fingerprint to transcript-keyed + ungroup expanded dialog |
| 23 | `89435f1` | 04-29 18:42 | JSON grouping: iterative + sticky-inheritance algorithm |
| 24 | `27e6037` | 04-29 18:49 | `TIME_LOG`: append Session 3's afternoon blocks |
| 25 | `a2d488c` | 04-30 09:50 | Phase 3: S3 source resolvers (tier JSON + product image abstraction) |
| 26 | `4c1db75` | 04-30 09:50 | `RESTRUCTURING_PLAN`: fill in Phase 3 commit hash |
| 27 | `3fbf6da` | 04-30 10:52 | JSON panel: inject editorial-timeline location when scene has none upstream |
| 28 | `cc8ac8b` | 04-30 11:27 | Remove misleading "Considered:" line from per-scene Location card |
| 29 | `357eea4` | 04-30 11:31 | `TIME_LOG`: append Session 4 (Phase 3 + Location panel cleanup) + phase-estimate tracking |
| 30 | `4fc701f` | 04-30 11:38 | Phase 4a: relocate components into subdirectories |
| 31 | `14ced8f` | 04-30 11:49 | Add `SESSION_LOG.md` — narrative day-by-day history |
| 32 | `9f08c5a` | 04-30 11:51 | Add `/log-time` skill for end-of-session time-log updates |
| 33 | `c3e63d1` | 04-30 11:52 | `RESTRUCTURING_PLAN`: process commitments + Phase 4 recalibration |
| 34 | `db145da` | 04-30 12:04 | Phase 4b: extract VideoPlayer + PlayerControls from DemoView |
| 35 | `5f0d843` | 04-30 12:13 | Phase 4c: extract shared panel cards (Taxonomy/Product/JsonScene) |
| 36 | `ae17c5b` | 04-30 12:21 | `TIME_LOG`: append Phase 4 (a/b/c) + process commitments |
| 37 | `970c1a9` | 04-30 12:55 | `RESTRUCTURING_PLAN`: expand Phase 5 scope + add Phase 9 (panel sync hardening) |
| 38 | `7e0a576` | 04-30 13:06 | `RESTRUCTURING_PLAN`: split Phase 5 into 5a (org now) + 5b (validation later) |
| 39 | `d7fefe7` | 04-30 13:27 | Phase 5a: per-content org + content×tier×ad-mode availability model |
| 40 | `c370275` | 04-30 13:54 | `RESTRUCTURING_PLAN`: mark Phase 5a done with commit hash |
| 41 | `df541ad` | 04-30 15:18 | Phase 5a: complete consumer wire-up missed in d7fefe7 |
| 42 | `e674600` | 04-30 15:18 | Housekeeping: SESSION_LOG + TIME_LOG + sources/README updates for Session 4 |
| 43 | `6299cdf` | 04-30 15:23 | Phase 7a: Vitest scaffold + 38 unit tests for pure-function protected behaviors |
| 44 | `762f717` | 04-30 15:24 | `RESTRUCTURING_PLAN`: split Phase 7 into 7a (done) + 7b |
| 45 | `a25393c` | 04-30 15:28 | Phase 7b: Playwright golden-path E2E |
| 46 | `23eb1b8` | 04-30 15:43 | Phase 6a: extract panel-scroll engine helpers + HANDOFF §9 unit tests |
| 47 | `b468854` | 04-30 15:51 | Phase 6b: extract ad-break / clip-time math (HANDOFF §6) + unit tests |
| 48 | `2a018e0` | 04-30 15:54 | Phase 6c: extract product-entry building (HANDOFF §6 segment isolation) + tests |
| 49 | `d27ec9a` | 04-30 15:57 | Phase 6d: extract active-scene + taxonomy-availability resolvers + tests |
| 50 | `6c07ed6` | 04-30 15:58 | `RESTRUCTURING_PLAN`: mark Phase 6 done; document the mid-phase redirect |
| 51 | `5115a90` | 04-30 16:04 | Phase 8: GitHub Actions CI workflow + lint config tightening |
| 52 | `f2a26de` | 04-30 16:19 | Phase 9a: Products exact-anchor sync + segment-aligned data source |
| 53 | `119c33f` | 04-30 16:21 | Phase 9b: scrub-triggered re-sync of expanded panel dialogs |
| 54 | `8b9c175` | 04-30 16:24 | Phase 9c: cross-resolver sync invariant tests |
| 55 | `c1c0a26` | 04-30 16:26 | Phase 9d: ad-break response future-proofing — per-mode label override |
| 56 | `b2eb452` | 04-30 16:27 | `RESTRUCTURING_PLAN`: mark Phase 9 (a/b/c/d) done with commit hashes |
| 57 | `0d35042` | 04-30 16:50 | Phase 9e: tighten cross-view product sync (gate expanded + reduce dedupe) |
| 58 | `bb04c2f` | 04-30 17:06 | Housekeeping: SESSION_LOG + TIME_LOG checkpoint for Phases 6–9 |
| 59 | `36d52d4` | 04-30 17:28 | Streamline player control bar: tighter sizing + hover-based show/hide |
| 60 | `5b54b58` | 04-30 17:46 | JSON download dialog: restyle to match SelectorDialog + real Summary JSON |
| 61 | `d9998d0` | 04-30 17:58 | Summary JSON: trim to a true high-level shape (beats, not per-scene) |
| 62 | `c58e7b4` | 04-30 18:20 | Add `.npmrc` with `legacy-peer-deps=true` (Vercel install fix) |
| 63 | `9a8cbac` | 04-30 18:34 | Fix Vercel runtime crash: deduplicate MUI installs (root cause) |
| 64 | `e85df38` | 04-30 18:44 | Optimize Vercel load + first-playback latency *(later reverted)* |
| 65 | `3fdca82` | 04-30 18:46 | Fix vercel.json: remove `_comment` field *(later reverted)* |
| 66 | `44291e1` | 04-30 19:33 | Revert "Fix vercel.json: remove `_comment` field" |
| 67 | `e37563b` | 04-30 19:33 | Revert "Optimize Vercel load + first-playback latency" |
| 68 | `4223156` | 04-30 19:52 | Re-add `vercel.json` with cache headers (isolated from prior revert) |
| 69 | `99a5acc` | 04-30 19:52 | Re-add `preload="auto"` on content video (isolated from prior revert) |
| 70 | `01a0044` | 04-30 19:57 | Faster product images: lazy-load + cache headers |

---

## How this doc gets updated

I append to this doc at the end of each session, alongside the `TIME_LOG.md` update. If a session crosses a major architectural decision or has a notable user observation, the relevant section gets a paragraph capturing the *why*. The commit reference table grows monotonically.

If this doc and any other doc disagree, the other doc is canonical for its domain (`RESTRUCTURING_PLAN.md` for phase status, `TIME_LOG.md` for time, `HANDOFF.md` for protected behaviors). This doc is the *connective tissue* — it explains the human side of decisions that other docs only describe technically.
