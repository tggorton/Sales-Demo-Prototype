# Time Log — KERV Sales Demo Restructuring

Tracks approximate effort across the restructuring engagement, separated
into the time **you** spent prompting vs. the time **I** spent working.

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

Phase 3 looking "fast" is an artifact of the lower bound being a
realistic value when prerequisites are in place. The estimate range
itself was reasonable. Phase 4's overrun, by contrast, came from
genuine complexity that wasn't visible from the outside until the
extraction was underway.

---

## Backlog (sessions to date)

### 2026-04-27 — Session 1: Handoff onboarding + restructuring kickoff

**Wall-clock span:** ~16:30 – 21:32 local (with a ~3-hour gap mid-session while you were away running errands).

| Block | Prompting | AI Work | Notes |
|---|---:|---:|---|
| Handoff acknowledgment + plan + memory writes | 15m | 30m | Read HANDOFF.md end-to-end, wrote plan file, created 8 memory entries |
| Verify state + push to v2 GitHub + smoke test | 10m | 15m | Commit `b26cf54`, push to sales-demo-v2 (intricate prompt: PAT + push targets) |
| Phase 0 (auth abstraction) + 3 docs + gitignore | 15m | 40m | Commits `f383b98` → `5fbf8dc` — mostly approvals while AI worked |
| *— ~3h gap, you were away —* | — | — | |
| KERV theme kit drop + Phase 1a (install + wire) + plan update | 10m | 25m | Commits `a1e4f10` → `a4ba75e` |
| **Session subtotal** | **~50m** | **~110m** | (revised down from initial 75m estimate per new methodology) |

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
| **Session subtotal** | **~74m** | **~250m** | |

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
| TIME_LOG update + Phase 4 verification offer | 5m | 10m | This block — pre-break checkpoint. Provided a golden-path browser verification checklist for Phase 4 (deferred — user breaking before walking through). |
| **Session subtotal so far** | **~52m** | **~217m** | |

## Running totals

| | Prompting | AI Work |
|---|---:|---:|
| Session 1 (04-27) | 50m | 110m |
| Session 2 (04-28) | 8m | 5m |
| Session 3 (04-29) | 74m | 250m |
| Session 4 (04-30) | 52m | 217m |
| **Total** | **~3h 04m** | **~9h 42m** |

---

## How this gets updated

After each phase commit lands (or whenever you ask for a checkpoint), I
append a row to the current session's table. AI Work is anchored in
commit timestamps; Prompting follows the methodology above.

You can adjust any Prompting estimate that feels off — when you do,
mention it and I'll also recalibrate the per-archetype defaults so
future estimates land closer.

If you want a finer-grained breakdown (per-commit instead of per-block),
or a separate calendar-month rollup for reporting, say the word.

This file is intentionally separate from the rest of the project tracking
docs (`HANDOFF.md`, `RESTRUCTURING_PLAN.md`, etc.) so the time data
doesn't bleed into engineering documentation.
