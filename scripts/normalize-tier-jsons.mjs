#!/usr/bin/env node
//
// normalize-tier-jsons.mjs
// ----------------------------------------------------------------------------
// Take a partner-delivered tier batch (raw shape) and produce a DHYH-aligned
// trio of tier1/tier2/tier3 JSONs ready for the `align-tier-jsons` skill.
//
// Five transforms (each is conditional — skipped if the input already satisfies it):
//   A. Reformat to DHYH style              — 4-space indent, raw unicode, no trailing newline.
//   B. Strip legacy `music_emotion` field  — successor field `emotion` is kept.
//   C. Generate tier1 from tier2           — only if no tier1 input is supplied.
//   D. Backfill tier3 objects from tier2   — only if tier3 has fewer detections than tier2.
//   E. Verify content-identity             — round-trip + per-scene parity checks.
//
// What this script does NOT do (those belong to /align-tier-jsons):
//   - Clip-time vs source-time mapping. Does not touch `startTime`/`endTime`.
//   - Synthetic-object MARKER (`"synthetic": true`). Synthetic OBJECTS are preserved
//     verbatim if present; the boolean flag is added in /align-tier-jsons.
//   - Per-scene sentiment backfill for tier1 (handled by /align-tier-jsons).
//   - T2 ↔ T3 metadata parity for non-object fields (faces/text/labels/description).
//
// USAGE
// ----------------------------------------------------------------------------
//   node scripts/normalize-tier-jsons.mjs <src-dir> <prefix> [--out-suffix b]
//
//   src-dir    Directory holding the partner-delivered tier JSONs.
//   prefix     The filename prefix before `tier{N}.json`.
//
// EXAMPLE
//   node scripts/normalize-tier-jsons.mjs \
//     _Temp-Files/MasterChef/JSONs mc-response-
//
//   Reads:  mc-response-tier2.json, mc-response-tier3.json
//          (and mc-response-tier1.json if present)
//   Writes: mc-response-tier1b.json, mc-response-tier2b.json, mc-response-tier3b.json
//   (Originals are never modified.)
//
// REFERENCE SHAPE (lifted from `_Temp-Files/Dont-Hate-Your-Home/response-tier1_1b.json` etc.)
// The DHYH trio is treated as the canonical schema target.

import fs from 'node:fs/promises'
import path from 'node:path'

// ─── Schema constants (DHYH-reference) ─────────────────────────────────────────

const T1_SCENE_KEYS = [
  'scene', 'startFrame', 'startTimecode', 'startTime',
  'midFrame', 'midTimecode', 'midTime',
  'endFrame', 'endTimecode', 'endTime',
  'lengthInFrames', 'lengthInTimecode', 'lengthInSeconds',
  'profile', 'iab_taxonomy', 'garm_category',
  'audio_transcript', 'sentiment_analysis',
  // ↑ note: T1 places sentiment_analysis AFTER audio_transcript,
  //   whereas T2/T3 place it BEFORE.
]

const T1_VM_KEYS = ['garm_category', 'iab_taxonomy', 'sentiment_analysis']

// Synthetic-object signature (per project memory `tier3_synthetic_objects`).
// Pipelines mark synthetic product-matching scaffolds with this exact bbox
// and constant confidence.
const SYNTHETIC_BBOX = [
  { x: 9, y: 9 }, { x: 59, y: 9 }, { x: 59, y: 29 }, { x: 9, y: 29 },
]
const SYNTHETIC_CONF = 0.8511

const deepEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const isSynthetic = (obj) =>
  deepEqual(obj.bounding_box, SYNTHETIC_BBOX) && obj.confidence === SYNTHETIC_CONF

// Object identity for matching T2 detection ↔ T3 detection.
const objKey = (obj) => `${obj.name}|${JSON.stringify(obj.bounding_box)}`

// ─── DHYH-formatting writer ───────────────────────────────────────────────────
// 4-space indent, raw unicode (Node's JSON.stringify does this by default),
// no trailing newline. Matches `response-tier{N}_1b.json` exactly.
const writeDHYH = (data) => JSON.stringify(data, null, 4)

// ─── Transform A: reformat (whitespace + unicode encoding only) ───────────────
// Pure round-trip; no content mutation. The "ensure_ascii=False" equivalent in
// Node is the default behavior of JSON.stringify.
const reformat = (data) => data // round-trip handled by JSON.parse + writeDHYH

// ─── Transform B: strip `music_emotion` ───────────────────────────────────────
// Per project memory `emotion_supersedes_music_emotion`, `emotion` is the
// successor. Both appearing in a scene is a legacy tooling artifact. We strip
// the legacy field; the populated `emotion` field is left untouched. Matches
// what DHYH ships (only `emotion`, no `music_emotion`).
const stripMusicEmotion = (data) => {
  let removed = 0
  for (const scene of data.Scenes ?? []) {
    if ('music_emotion' in scene) {
      delete scene.music_emotion
      removed++
    }
  }
  return removed
}

// ─── Transform C: generate tier1 from tier2 ───────────────────────────────────
// Tier 1 is a structural subset of tier 2. Drop 8 scene keys + 3 video_metadata
// keys, reorder so `sentiment_analysis` sits AFTER `audio_transcript`.
// Every kept value is copied verbatim (no transforms).
const generateT1FromT2 = (t2) => {
  const t1 = {
    video_id: t2.video_id,
    duration_in_seconds: t2.duration_in_seconds,
    aspect_ratio: t2.aspect_ratio,
    video_metadata: {},
    total_scenes: t2.total_scenes,
    Scenes: [],
  }
  const srcVM = t2.video_metadata ?? {}
  for (const k of T1_VM_KEYS) if (k in srcVM) t1.video_metadata[k] = srcVM[k]

  for (const scene of t2.Scenes ?? []) {
    const projected = {}
    for (const k of T1_SCENE_KEYS) if (k in scene) projected[k] = scene[k]
    t1.Scenes.push(projected)
  }
  return t1
}

// ─── Transform D: backfill T3 objects with T2 detections ──────────────────────
// Some partner pipelines deliver a T3 that has been heavily filtered upstream
// (only product-matchable items + synthetic scaffolds). The app's Object
// taxonomy panel needs T3 to carry the same detection vocabulary as T2.
//
// Per scene, this rebuilds the objects array as:
//   1. Every T2 detection (full set) — shaped as T3 objects with `product_match`.
//      If the existing T3 had already matched that detection (same name+bbox),
//      the existing `product_match` array is transferred onto the T2 entry so
//      no upstream product-match data is lost.
//   2. All synthetic objects from the existing T3 (placeholder-bbox + 0.8511
//      confidence), preserved verbatim.
//
// Returns { backfilled, preservedPM, syntheticsKept, scenesTouched, droppedNonT2 }.
const backfillT3Objects = (t2, t3) => {
  let backfilled = 0
  let preservedPM = 0
  let syntheticsKept = 0
  let scenesTouched = 0
  let droppedNonT2 = 0

  for (let i = 0; i < t3.Scenes.length; i++) {
    const t3scene = t3.Scenes[i]
    const t2scene = t2.Scenes[i]
    if (!t2scene) continue

    // Index existing T3 non-synthetic objects by (name, bbox) so we can
    // transfer their product_match arrays onto matching T2 entries.
    const existingPM = new Map()
    for (const o of t3scene.objects ?? []) {
      if (!isSynthetic(o)) existingPM.set(objKey(o), o.product_match ?? [])
    }

    const newObjects = []

    // (1) T2 base — every detection becomes a T3 object
    for (const o of t2scene.objects ?? []) {
      const key = objKey(o)
      let productMatch = []
      if (existingPM.has(key)) {
        productMatch = existingPM.get(key)
        existingPM.delete(key)
        if (productMatch.length > 0) preservedPM++
      }
      newObjects.push({
        name: o.name,
        confidence: o.confidence,
        bounding_box: o.bounding_box,
        product_match: productMatch,
      })
      backfilled++
    }

    // (2) Synthetic objects from existing T3 — preserved verbatim
    for (const o of t3scene.objects ?? []) {
      if (isSynthetic(o)) {
        newObjects.push(o)
        syntheticsKept++
      }
    }

    // If existingPM still has entries, those were T3 detections that did NOT
    // match anything in T2. Treat as upstream noise and drop with a warning.
    if (existingPM.size > 0) {
      droppedNonT2 += existingPM.size
    }

    const before = (t3scene.objects ?? []).length
    t3scene.objects = newObjects
    if (newObjects.length !== before) scenesTouched++
  }

  return { backfilled, preservedPM, syntheticsKept, scenesTouched, droppedNonT2 }
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
if (args.length < 2) {
  console.error(
    'Usage: node scripts/normalize-tier-jsons.mjs <src-dir> <prefix> [--out-suffix b]'
  )
  process.exit(1)
}
const [srcDir, prefix, ...flags] = args
const outSuffix =
  flags.indexOf('--out-suffix') >= 0
    ? flags[flags.indexOf('--out-suffix') + 1]
    : 'b'

const tierPath = (n, withSuffix = false) =>
  path.join(srcDir, `${prefix}tier${n}${withSuffix ? outSuffix : ''}.json`)

// ─── Main ─────────────────────────────────────────────────────────────────────

const log = (msg) => console.log(msg)
const logSection = (msg) => console.log(`\n── ${msg} ──`)

async function main() {
  log(`normalize-tier-jsons — src=${srcDir} prefix=${prefix} out-suffix=${outSuffix}`)

  // Read inputs
  logSection('Reading inputs')
  const t2 = JSON.parse(await fs.readFile(tierPath(2), 'utf-8'))
  log(`  ✓ tier2 loaded (${t2.Scenes?.length ?? 0} scenes)`)
  const t3 = JSON.parse(await fs.readFile(tierPath(3), 'utf-8'))
  log(`  ✓ tier3 loaded (${t3.Scenes?.length ?? 0} scenes)`)

  let t1Source = null
  try {
    t1Source = JSON.parse(await fs.readFile(tierPath(1), 'utf-8'))
    log(`  ✓ tier1 loaded (${t1Source.Scenes?.length ?? 0} scenes) — will reformat in place`)
  } catch (e) {
    if (e.code === 'ENOENT') {
      log(`  ℹ tier1 not supplied — will generate from tier2`)
    } else throw e
  }

  // Transform B — strip music_emotion
  logSection('B. Strip music_emotion')
  const t2Removed = stripMusicEmotion(t2)
  log(`  tier2: removed ${t2Removed} music_emotion entries`)
  const t3Removed = stripMusicEmotion(t3)
  log(`  tier3: removed ${t3Removed} music_emotion entries`)
  if (t1Source) {
    const t1Removed = stripMusicEmotion(t1Source)
    log(`  tier1: removed ${t1Removed} music_emotion entries`)
  }

  // Transform D — backfill T3 objects from T2
  logSection('D. Backfill tier3 objects from tier2')
  const t2ObjTotal = (t2.Scenes ?? []).reduce((n, s) => n + (s.objects?.length ?? 0), 0)
  const t3ObjBefore = (t3.Scenes ?? []).reduce((n, s) => n + (s.objects?.length ?? 0), 0)
  if (t3ObjBefore >= t2ObjTotal) {
    log(`  tier3 already has ${t3ObjBefore} objects vs tier2's ${t2ObjTotal} — skipping backfill`)
  } else {
    log(`  tier3 has ${t3ObjBefore} objects vs tier2's ${t2ObjTotal} — backfilling`)
    const r = backfillT3Objects(t2, t3)
    log(`    T2 detections copied into T3 base:           ${r.backfilled}`)
    log(`    product_match arrays preserved from old T3:  ${r.preservedPM}`)
    log(`    synthetic objects preserved from old T3:     ${r.syntheticsKept}`)
    log(`    scenes whose object count changed:           ${r.scenesTouched}`)
    if (r.droppedNonT2 > 0) {
      log(`    ⚠ old-T3 detections NOT in T2 (dropped):    ${r.droppedNonT2}`)
    }
  }

  // Transform C — generate tier1 if missing
  logSection('C. Tier1')
  const t1 = t1Source ?? generateT1FromT2(t2)
  if (!t1Source) {
    log(`  generated tier1 from tier2 — ${t1.Scenes.length} scenes, ${t1.Scenes[0] ? Object.keys(t1.Scenes[0]).length : 0} keys/scene`)
  }

  // Transform A — reformat (write with DHYH style)
  logSection('A. Write outputs (DHYH formatting)')
  await fs.writeFile(tierPath(1, true), writeDHYH(t1))
  log(`  ✓ wrote ${tierPath(1, true)}`)
  await fs.writeFile(tierPath(2, true), writeDHYH(t2))
  log(`  ✓ wrote ${tierPath(2, true)}`)
  await fs.writeFile(tierPath(3, true), writeDHYH(t3))
  log(`  ✓ wrote ${tierPath(3, true)}`)

  // Transform E — verify
  logSection('E. Verify')
  const verify = async (n, expectedScenes) => {
    const reloaded = JSON.parse(await fs.readFile(tierPath(n, true), 'utf-8'))
    const ok = (reloaded.Scenes?.length ?? 0) === expectedScenes
    log(`  tier${n}${outSuffix}: ${reloaded.Scenes?.length ?? 0} scenes  ${ok ? '✓' : '✗ MISMATCH'}`)
    return reloaded
  }
  const v1 = await verify(1, t1.Scenes.length)
  const v2 = await verify(2, t2.Scenes.length)
  const v3 = await verify(3, t3.Scenes.length)

  const noMusicEmotion = !JSON.stringify([v1, v2, v3]).includes('music_emotion')
  log(`  music_emotion fully removed:  ${noMusicEmotion ? '✓' : '✗'}`)

  // Object-count parity check
  const finalT2Obj = v2.Scenes.reduce((n, s) => n + (s.objects?.length ?? 0), 0)
  const finalT3Obj = v3.Scenes.reduce((n, s) => n + (s.objects?.length ?? 0), 0)
  const finalT3Syn = v3.Scenes.reduce(
    (n, s) => n + (s.objects ?? []).filter(isSynthetic).length, 0
  )
  const finalT3Real = finalT3Obj - finalT3Syn
  log(`  tier2 total objects:                   ${finalT2Obj}`)
  log(`  tier3 total objects (real + synth):    ${finalT3Obj} (${finalT3Real} + ${finalT3Syn})`)
  log(`  tier3 real == tier2 total:             ${finalT3Real === finalT2Obj ? '✓' : '✗'}`)
  log(`  tier3 >= tier2 (synth makes T3 ≥ T2):  ${finalT3Obj >= finalT2Obj ? '✓' : '✗'}`)

  logSection('Next step')
  log(`  Run /align-tier-jsons to handle clip-time mapping, per-scene sentiment,`)
  log(`  T2↔T3 metadata parity (faces/text/labels), and the synthetic-object marker.`)
}

main().catch((e) => {
  console.error('\n✗ normalize-tier-jsons failed:', e.message)
  process.exit(1)
})
