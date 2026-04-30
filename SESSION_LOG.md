# Session Log — KERV Sales Demo Restructuring

**Coverage:** 2026-04-27 → present (this branch's lifetime).
**Audience:** Anyone (you, an engineer, future-me after compaction) who needs the *narrative* context behind the commits — what was discussed, what trade-offs were weighed, what the user observed visually, what's still open.

The git log is the authoritative technical record (every change has a detailed commit message). The seven docs at the project root (`HANDOFF.md`, `RESTRUCTURING_PLAN.md`, `EXTENSION_POINTS.md`, `DESIGN_SYSTEM.md`, `TIME_LOG.md`, plus this file and `TIME_LOG-001.md`) capture documented state. **This file fills the gap between "what changed" and "why we made that call"** — and surfaces user-facing observations and future considerations that don't fit naturally in any other doc.

---

## How to use this doc

- **Just landed on the project?** Read [`HANDOFF.md`](HANDOFF.md) first (project conventions + protected behaviors), then [`RESTRUCTURING_PLAN.md`](RESTRUCTURING_PLAN.md) (target architecture + phase status), then this doc for the human/decision context.
- **Trying to remember a specific decision?** Search this doc by keyword — every major call is captured with the rationale, often with the user's exact framing.
- **Trying to find a specific commit?** Use the commit reference table at the bottom.
- **Want to know what's still open?** See [§ Future considerations](#future-considerations) and [§ Open threads](#open-threads).

---

## Engagement framing

The user (a UX/UI designer) inherited a working KERV Sales Demo prototype originally built with AI assistance in Cursor (per [`TIME_LOG-001.md`](TIME_LOG-001.md), ~5h45m / ~17h35m of pre-handoff work across 6 thematic sessions). On 2026-04-27 they handed it off here for an engineering-grade restructuring pass — making the codebase comfortable for engineers (and AI coding tools like Claude/GPT/Cursor) to extend with new ad modes, new content tiles, and eventually integrate AWS Cognito and S3.

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

### 2026-04-30 — Session 4: Phase 3 + Location panel cleanup + Phase 4a (today)

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
- **`TIME_LOG-001.md` exists from the prior Cursor engagement.** Not part of this engagement's tracker; the user explicitly asked me to ignore it (only update the new `TIME_LOG.md`). It's at the project root for reference.

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

---

## How this doc gets updated

I append to this doc at the end of each session, alongside the `TIME_LOG.md` update. If a session crosses a major architectural decision or has a notable user observation, the relevant section gets a paragraph capturing the *why*. The commit reference table grows monotonically.

If this doc and any other doc disagree, the other doc is canonical for its domain (`RESTRUCTURING_PLAN.md` for phase status, `TIME_LOG.md` for time, `HANDOFF.md` for protected behaviors). This doc is the *connective tissue* — it explains the human side of decisions that other docs only describe technically.
