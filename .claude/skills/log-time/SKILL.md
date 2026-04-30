---
name: log-time
description: Update TIME_LOG.md for this project with the latest session's work blocks. Reads commits since the last logged block, classifies the recent prompts (quick approval / decision / intricate), and appends new rows + recomputes running totals. Use this at the end of a session, after a phase commit lands, or any time the user asks for a time-log checkpoint.
---

# Skill: `/log-time`

Update [`TIME_LOG.md`](TIME_LOG.md) for this project with the latest session's work blocks.

## When to invoke this skill

- End of a working session (the obvious case).
- After a phase commit lands and the next phase isn't starting immediately (checkpoint the work).
- Whenever the user explicitly asks for a time-log update.
- Whenever the user notes that an estimate felt off (record it for calibration).

## What this skill does

1. **Read [`TIME_LOG.md`](TIME_LOG.md)** to see the current state — when the last block was logged, the methodology, the running totals.
2. **Read recent commits**: `git log --pretty=format:"%h | %ai | %s" main..HEAD` (or the relevant range since the last logged commit).
3. **Classify the work into blocks.** A block is a coherent slice of activity that produced one or more related commits. Rough sizing:
   - Single-commit phase fix: usually one block.
   - Multi-iteration debugging cycle: one block covering all iterations.
   - Doc-only work + small fix: separate blocks.
4. **Estimate per-block time using the existing methodology** (see `TIME_LOG.md` § "Methodology"):
   - **AI Work**: anchor in commit timestamps + tool-call cadence. Wall-clock between meaningful checkpoints, minus obvious idle gaps. ±5 min accuracy.
   - **Prompting**: per user message in the block, sum `reading + thinking + (chars / ~130 chars/min typing)`. Three archetypes:
     - Quick approval ("go", "yes"): 1–2m total.
     - Decision (choosing between options, brief feedback): 4–8m total.
     - Intricate (technical prompts, bug repros, multi-decision messages): 10–20m total.
5. **Append rows** to the current session's table (or create a new session table if a new day has started). Update the session subtotal.
6. **Recompute running totals** at the bottom of the doc.
7. **Update the Phase-estimate tracking table** if a numbered phase landed in this update — add a row with estimate vs. actual.
8. **Commit** the update with a message describing the block(s) added.

## Important rules

- **Idle gaps don't count.** If the user was away running errands or working on a different project, exclude that wall-clock time from BOTH columns. The `TIME_LOG.md` methodology spells this out.
- **Visual verification time isn't Prompting.** When the user clicks through the demo to verify a change, that's not in either column.
- **Be honest about under-estimates and over-estimates.** Both directions are useful calibration. The `TIME_LOG.md` "Phase-estimate tracking" section should reflect reality, not flattery.
- **Don't re-log already-logged blocks.** Read the existing log first to know where to start. The last commit hash referenced in any existing block is your floor.
- **Match the existing table format exactly.** Markdown table with `Prompting | AI Work | Notes` columns; subtotal row in bold; commit hashes in backticks.

## File paths

- Time log: `TIME_LOG.md` (project root)
- Pre-handoff Cursor log: `TIME_LOG-001.md` (project root) — **do not modify**, kept for historical reference per the user's instruction.
- Plan with phase estimates: `RESTRUCTURING_PLAN.md` (project root) — phase estimate ranges live here; recalibrate when actuals consistently land on one side.

## Output expectations

A typical invocation should produce:
1. One or more new rows in the current session's table.
2. Updated session subtotal.
3. Updated running totals.
4. (When a phase landed) New row in the Phase-estimate tracking table.
5. A single commit titled like: `TIME_LOG: append <block description> for Session N`.
