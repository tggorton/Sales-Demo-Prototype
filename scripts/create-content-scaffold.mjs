#!/usr/bin/env node
//
// create-content-scaffold.mjs
// ----------------------------------------------------------------------------
// Scaffold a new content tile (Taxonomy / Product / JSON panels working;
// ads OFF by default until the per-content ad creatives + JSONs are
// produced). Generates the three per-content source files AND patches the
// three registry files; you copy the assets (tier JSONs, video, poster)
// into place separately.
//
// USAGE
//   node scripts/create-content-scaffold.mjs <spec.json>
//
// Or with an inline JSON spec via stdin:
//   echo '{...}' | node scripts/create-content-scaffold.mjs -
//
// SPEC SHAPE
//   {
//     "id":                "masterchef",            // string, kebab-case
//     "title":             "MasterChef Australia",  // display title in the grid
//     "categories":        ["Reality TV"],          // ContentItem categories
//     "clipDurationSeconds": 241.42,                // from tier JSON `duration_in_seconds`
//     "adBreakClipSeconds": 241.42,                 // where Sync/Lbar/Impulse ad break
//                                                   // sits (end-of-clip = clip duration;
//                                                   // mid-clip = some other value)
//     "tierTimeBase":      "clip",                  // "clip" (clip-native) or "source"
//                                                   // (44-min-source-splice — only for
//                                                   // DHYH-style splice content)
//     "videoFileName":     "masterchef.mp4",        // file you'll drop into
//                                                   // public/assets/video/
//     "posterFileName":    "masterchef.png",        // file you'll drop into
//                                                   // public/assets/posters/
//     "envVideoUrlVar":    "VITE_MASTERCHEF_VIDEO_URL"  // env override name
//                                                       // (uppercase, underscored)
//   }
//
// WHAT THIS SCRIPT DOES
//   Creates:
//     src/demo/content/<id>/timeline.ts
//     src/demo/content/<id>/config.ts
//     src/demo/content/<id>/scenes.ts
//     src/demo/content/<id>/tiers/.gitkeep    (drop your tier JSONs here)
//   Patches:
//     src/demo/sources/resolveTierPayload.ts  (add bundledTierLoaders block)
//     src/demo/content/index.ts               (register CONTENT_REGISTRY entry)
//     src/demo/data/contentItems.ts           (add ContentItem + enable id)
//
// WHAT YOU DO BEFORE / AFTER
//   Before:
//     - Normalize the partner-delivered tier JSONs via /normalize-tier-jsons.
//   After:
//     - Drop tier1.json, tier2.json, tier3.json into
//       src/demo/content/<id>/tiers/  (use the normalized b-files,
//       renamed to drop the "b" suffix).
//     - Drop the video file into public/assets/video/<videoFileName>.
//     - Drop the poster image into public/assets/posters/<posterFileName>.
//     - Run /align-tier-jsons to complete app-readiness.
//     - npm run build → confirm clean.
//     - Test in browser: tile appears, panels light up, video plays, ad
//       dropdown is empty (ads OFF until later).
//
// IDEMPOTENCY
//   The script bails out if any target file/folder already exists. To
//   re-run for the same id: delete `src/demo/content/<id>/` and revert
//   the three registry-file patches first.

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// ─── Args ─────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
if (args.length < 1) {
  console.error('Usage: node scripts/create-content-scaffold.mjs <spec.json | ->')
  process.exit(1)
}

const specRaw =
  args[0] === '-'
    ? await new Promise((resolve, reject) => {
        let buf = ''
        process.stdin.on('data', (c) => (buf += c))
        process.stdin.on('end', () => resolve(buf))
        process.stdin.on('error', reject)
      })
    : await fs.readFile(args[0], 'utf-8')

const spec = JSON.parse(specRaw)

const required = [
  'id',
  'title',
  'categories',
  'clipDurationSeconds',
  'adBreakClipSeconds',
  'tierTimeBase',
  'videoFileName',
  'posterFileName',
  'envVideoUrlVar',
]
for (const k of required) {
  if (spec[k] === undefined || spec[k] === null) {
    console.error(`Spec missing required field: ${k}`)
    process.exit(1)
  }
}
if (!/^[a-z][a-z0-9-]*$/.test(spec.id)) {
  console.error(`Spec.id must be kebab-case (lowercase, alphanum + hyphens): ${spec.id}`)
  process.exit(1)
}
if (spec.tierTimeBase !== 'clip' && spec.tierTimeBase !== 'source') {
  console.error(`Spec.tierTimeBase must be 'clip' or 'source' (got ${spec.tierTimeBase})`)
  process.exit(1)
}

// Categories are a closed union in src/demo/types.ts; an unknown value writes
// a file that fails `tsc` later, far from the cause. Fail loudly here instead.
const VALID_CATEGORIES = ['Reality TV', 'Comedy', 'Drama', 'Home & Garden']
const badCats = (spec.categories ?? []).filter((c) => !VALID_CATEGORIES.includes(c))
if (badCats.length > 0) {
  console.error(
    `✗ Unknown categories: ${badCats.join(', ')}\n` +
      `  Allowed: ${VALID_CATEGORIES.join(' | ')}\n` +
      `  (Widen the ContentItem['categories'] union in src/demo/types.ts first.)`
  )
  process.exit(1)
}

const ID = spec.id // e.g. 'masterchef'
const UPPER = spec.id.replace(/-/g, '_').toUpperCase() // e.g. 'MASTERCHEF'
const titleEscaped = spec.title.replace(/'/g, "\\'") // escape for single-quote string literal

// Use fileURLToPath so URL-encoded chars in the path (e.g. spaces → %20 on
// macOS when the repo lives under "Grant Gorton") get decoded correctly.
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CONTENT_DIR = path.join(REPO_ROOT, 'src/demo/content', ID)

const log = (msg) => console.log(msg)
const logSection = (msg) => console.log(`\n── ${msg} ──`)

// ─── Pre-flight: don't clobber ───────────────────────────────────────────────
logSection(`Pre-flight (spec.id='${ID}')`)
try {
  await fs.stat(CONTENT_DIR)
  console.error(`✗ Refusing to clobber existing dir: ${CONTENT_DIR}`)
  console.error('  Delete it and revert registry patches if you want to re-scaffold.')
  process.exit(1)
} catch (e) {
  if (e.code !== 'ENOENT') throw e
}
log(`  ✓ ${CONTENT_DIR} doesn't exist — safe to create`)

// ─── Generators ──────────────────────────────────────────────────────────────

const timelineTs = `// ${spec.title} content-specific constants. Parallel to
// \`src/demo/content/dhyh/timeline.ts\`; everything content-shaped that the
// shell needs lives here.
import { envString } from '../../utils/env'

/** Stable id used by source resolvers + per-content config lookups. */
export const ${UPPER}_CONTENT_ID = '${ID}'

/** Bundled clip. Override via \`${spec.envVideoUrlVar}\` if hosting elsewhere. */
export const ${UPPER}_VIDEO_URL = envString(
  '${spec.envVideoUrlVar}',
  '/assets/video/${spec.videoFileName}'
)

// Duration is sourced from the tier JSON (\`duration_in_seconds\`) — keep this
// in sync with the JSON value.
export const ${UPPER}_CLIP_DURATION_SECONDS = ${spec.clipDurationSeconds}

// ---------- Tier-JSON time base ----------------------------------------------
// 'clip'   — tier JSON \`startTime\`/\`endTime\` are already on the trimmed-clip
//            timeline (clip-native delivery).
// 'source' — tier JSON values are on the original full-source timeline and get
//            remapped through the splice constants below.
export const ${UPPER}_TIER_TIME_BASE: 'clip' | 'source' = '${spec.tierTimeBase}'

// ---------- Ad break (clip-time seconds) ------------------------------------
// Pins WHERE in the clip the Sync / Sync: L-Bar / Sync: Impulse ad break
// starts. End-of-clip = \`clipDurationSeconds\`; mid-clip splice = the cut
// point on the clip timeline.
//
// All ad modes start disabled in \`config.ts\` until creatives are produced;
// this constant is in place so wiring ads on is a one-line config change.
export const ${UPPER}_AD_BREAK_CLIP_SECONDS = ${spec.adBreakClipSeconds}

// Legacy aliases the scene builder consumes — kept for parity with DHYH's
// surface even when the time base is 'clip'.
export const ${UPPER}_CLIP_START_SECONDS = 0
export const ${UPPER}_CLIP_END_SECONDS = ${UPPER}_CLIP_DURATION_SECONDS
`

const configTs = `import type { ContentConfig } from '../types'
import {
  ${UPPER}_AD_BREAK_CLIP_SECONDS,
  ${UPPER}_CLIP_DURATION_SECONDS,
  ${UPPER}_CONTENT_ID,
  ${UPPER}_VIDEO_URL,
} from './timeline'

/**
 * "${spec.title}" content config.
 *
 * ALL ad modes are disabled by default until the ad creatives + compliance
 * JSONs are produced for this content. \`defaultAdModes\` is intentionally
 * empty AND \`adModesByTier\` is empty — tier-3 pause-overlay modes
 * (\`CTA Pause\`, \`Organic Pause\`) are NOT exposed yet either; they'll be
 * the first ad modes added when wired up.
 *
 * Taxonomy panels (Object, IAB, GARM, Sentiment, Location, Emotion, Faces,
 * Logo), the Product panel, and the JSON panel all light up from the tier
 * JSONs directly — those are NOT gated by ad modes.
 */
export const ${ID.replace(/-/g, '')}ContentConfig: ContentConfig = {
  id: ${UPPER}_CONTENT_ID,
  title: '${titleEscaped}',
  clipDurationSeconds: ${UPPER}_CLIP_DURATION_SECONDS,
  videoUrl: ${UPPER}_VIDEO_URL,
  adBreakClipSeconds: ${UPPER}_AD_BREAK_CLIP_SECONDS,
  hiddenTaxonomies: [],
  defaultAdModes: [],
}
`

const PASCAL = ID.charAt(0).toUpperCase() + ID.slice(1).replace(/-/g, '')

// NOTE: this template targets `_shared/sceneBuilder.ts` and its OPTIONS-OBJECT
// signature. It previously wrapped `dhyh/scenes.ts` and passed
// `clipDurationSeconds` as a bare number — that stopped compiling when the
// shared builder was extracted, and every new content failed `tsc` until the
// file was hand-edited. Keep this in step with `SceneBuilderOptions`.
const scenesTs = `// ${spec.title} scene-bundle entry point.
//
// Thin wrapper around \`_shared/sceneBuilder.ts\`. This content's tier data is
// clip-native and ships without a curated editorial-location overlay, so no
// callbacks are supplied — the shared default clip-native mapper runs and the
// Location panel uses the per-scene JSON verbatim.

import {
  getScenesForContent as sharedGetScenesForContent,
  type SceneBundle,
} from '../_shared/sceneBuilder'
import { ${UPPER}_CLIP_DURATION_SECONDS, ${UPPER}_CONTENT_ID } from './timeline'
import type { TierOption } from '../../types'

export type ${PASCAL}SceneBundle = SceneBundle

export const get${PASCAL}ScenesForTier = (
  tier: TierOption
): Promise<${PASCAL}SceneBundle> =>
  sharedGetScenesForContent(${UPPER}_CONTENT_ID, tier, {
    clipDurationSeconds: ${UPPER}_CLIP_DURATION_SECONDS,
  })
`

const gitkeep = `# Drop tier1.json / tier2.json / tier3.json here. Use the normalized b-files
# from /normalize-tier-jsons, renamed to drop the "b" suffix:
#   <prefix>tier1b.json  →  tier1.json
#   <prefix>tier2b.json  →  tier2.json
#   <prefix>tier3b.json  →  tier3.json
`

// ─── Create scaffold files ───────────────────────────────────────────────────
logSection('Creating scaffold files')
await fs.mkdir(path.join(CONTENT_DIR, 'tiers'), { recursive: true })
await fs.writeFile(path.join(CONTENT_DIR, 'timeline.ts'), timelineTs)
log(`  ✓ wrote ${path.relative(REPO_ROOT, CONTENT_DIR)}/timeline.ts`)
await fs.writeFile(path.join(CONTENT_DIR, 'config.ts'), configTs)
log(`  ✓ wrote ${path.relative(REPO_ROOT, CONTENT_DIR)}/config.ts`)
await fs.writeFile(path.join(CONTENT_DIR, 'scenes.ts'), scenesTs)
log(`  ✓ wrote ${path.relative(REPO_ROOT, CONTENT_DIR)}/scenes.ts`)
await fs.writeFile(path.join(CONTENT_DIR, 'tiers/.gitkeep'), gitkeep)
log(`  ✓ wrote ${path.relative(REPO_ROOT, CONTENT_DIR)}/tiers/.gitkeep`)

// ─── Patch registries ────────────────────────────────────────────────────────
logSection('Patching registries')

const cfgVar = `${ID.replace(/-/g, '')}ContentConfig`

// 1. resolveTierPayload.ts — add bundled loaders block.
//    Match the LAST `},\n}` inside `bundledTierLoaders` (closes the
//    last content's tier-map). Using a regex anchored on the
//    `bundledTierLoaders` declaration keeps us from accidentally
//    targeting the close of an earlier function like `remoteBaseUrl`.
//    Always quote the object key so kebab-case ids like `home-improvement`
//    parse correctly (bare identifiers with `-` are a TS syntax error).
{
  const fp = path.join(REPO_ROOT, 'src/demo/sources/resolveTierPayload.ts')
  const txt = await fs.readFile(fp, 'utf-8')
  // Idempotency check: the per-content import path is unique to this id.
  if (txt.includes(`'../content/${ID}/tiers/`)) {
    log(`  ⓘ ${path.basename(fp)} already loads '${ID}' tiers — skipping`)
  } else {
    const block = `  '${ID}': {
    'Basic Scene': () =>
      import('../content/${ID}/tiers/tier1.json').then((m) => m.default ?? m),
    'Assets Summary': () =>
      import('../content/${ID}/tiers/tier1.json').then((m) => m.default ?? m),
    'Advanced Scene': () =>
      import('../content/${ID}/tiers/tier2.json').then((m) => m.default ?? m),
    'Exact Product Match': () =>
      import('../content/${ID}/tiers/tier3.json').then((m) => m.default ?? m),
    'Categorical Product Match': () =>
      import('../content/${ID}/tiers/tier3.json').then((m) => m.default ?? m),
  },
}`
    // Anchor: from the declaration line, capture everything up to and
    // including the FIRST top-level `}` that closes the bundledTierLoaders
    // object. We rely on the convention that each per-content tier-map
    // ends with `  },\n` (two-space indent + comma + newline) and the
    // outer object closes with `}\n` (column 0).
    const re = /(const bundledTierLoaders[\s\S]*?\n  \},\n)\}/m
    const m = txt.match(re)
    if (!m) {
      throw new Error(
        `Could not locate bundledTierLoaders close in ${fp}. ` +
          `Expected pattern: const bundledTierLoaders ... },\\n}`
      )
    }
    const next = txt.replace(re, `${m[1]}${block}`)
    if (next === txt) throw new Error(`Patch produced no change in ${fp}`)
    await fs.writeFile(fp, next)
    log(`  ✓ patched ${path.relative(REPO_ROOT, fp)} (bundledTierLoaders.${ID})`)
  }
}

// 2. content/index.ts — register the config
{
  const fp = path.join(REPO_ROOT, 'src/demo/content/index.ts')
  const txt = await fs.readFile(fp, 'utf-8')
  if (txt.includes(`'./${ID}/config'`)) {
    log(`  ⓘ ${path.basename(fp)} already imports ${ID}/config — skipping`)
  } else {
    const importMarker = "import { dhyhContentConfig } from './dhyh/config'"
    if (!txt.includes(importMarker)) throw new Error(`Could not find import marker in ${fp}`)
    const importLine = `\nimport { ${cfgVar} } from './${ID}/config'`
    let next = txt.replace(importMarker, importMarker + importLine)

    const registryMarker = '[dhyhContentConfig.id]: dhyhContentConfig,'
    if (!next.includes(registryMarker))
      throw new Error(`Could not find registry marker in ${fp}`)
    next = next.replace(
      registryMarker,
      registryMarker + `\n  [${cfgVar}.id]: ${cfgVar},`
    )
    await fs.writeFile(fp, next)
    log(`  ✓ patched ${path.relative(REPO_ROOT, fp)} (CONTENT_REGISTRY.${ID})`)
  }
}

// 3. contentItems.ts — add ContentItem + enable id
{
  const fp = path.join(REPO_ROOT, 'src/demo/data/contentItems.ts')
  const txt = await fs.readFile(fp, 'utf-8')
  if (txt.includes(`${UPPER}_CONTENT_ID`)) {
    log(`  ⓘ ${path.basename(fp)} already references ${UPPER}_CONTENT_ID — skipping`)
  } else {
    // Insert the new content import just BEFORE `import type { ContentItem }`,
    // matching the existing pattern: every content's `…_CONTENT_ID` import
    // sits at the top, type imports come last.
    const importMarker = "import type { ContentItem } from '../types'"
    if (!txt.includes(importMarker)) throw new Error(`Could not find import marker in ${fp}`)
    const importLine = `import { ${UPPER}_CONTENT_ID, ${UPPER}_VIDEO_URL } from '../content/${ID}/timeline'\n`
    let next = txt.replace(importMarker, importLine + importMarker)

    // Add the new ContentItem before the closing ']' of ALL_CONTENT_ITEMS.
    // No trailing newline on `itemBlock` — the array-close marker provides
    // the `\n]` directly, avoiding a blank line in the output.
    const categoriesLiteral = JSON.stringify(spec.categories).replace(/"/g, "'")
    const itemBlock = `  {
    id: ${UPPER}_CONTENT_ID,
    title: '${titleEscaped}',
    categories: ${categoriesLiteral},
    posterUrl: '/assets/posters/${spec.posterFileName}',
    videoUrl: ${UPPER}_VIDEO_URL,
  },`
    const arrayCloseMarker = '\n]\n\n// Ids that should be visible'
    if (!next.includes(arrayCloseMarker))
      throw new Error(`Could not find ALL_CONTENT_ITEMS close marker in ${fp}`)
    next = next.replace(arrayCloseMarker, '\n' + itemBlock + arrayCloseMarker)

    // Append to ENABLED_CONTENT_IDS
    const enabledMarker = /const ENABLED_CONTENT_IDS: string\[\] = \[(.*?)\]/
    const m = next.match(enabledMarker)
    if (!m) throw new Error(`Could not find ENABLED_CONTENT_IDS in ${fp}`)
    const inside = m[1].trim()
    const newInside = inside.length > 0 ? `${inside}, ${UPPER}_CONTENT_ID` : `${UPPER}_CONTENT_ID`
    next = next.replace(enabledMarker, `const ENABLED_CONTENT_IDS: string[] = [${newInside}]`)

    await fs.writeFile(fp, next)
    log(`  ✓ patched ${path.relative(REPO_ROOT, fp)} (ContentItem + enabled)`)
  }
}


// 4. useDemoPlayback.ts — register the scene loader
//
// This is the registry that actually makes the tier JSONs load. Miss it and the
// tile still builds and still appears on the grid, but `SCENE_LOADERS[id]` is
// undefined, the `hasBundledContent` guard short-circuits, and the demo renders
// the placeholder SCENE_METADATA instead — which looks like "the JSONs aren't
// activated": a near-empty Object panel and product cards showing another
// content's imagery. Abbott hit this on 2026-08-31.
{
  const fp = path.join(REPO_ROOT, 'src/demo/hooks/useDemoPlayback.ts')
  const txt = await fs.readFile(fp, 'utf-8')
  const loaderFn = `get${PASCAL}ScenesForTier`
  if (txt.includes(loaderFn)) {
    log(`  ⓘ ${path.basename(fp)} already registers ${loaderFn} — skipping`)
  } else {
    const importLine = `import { ${loaderFn} } from '../content/${ID}/scenes'`
    // Anchor on the LAST existing content-scenes import so the group stays
    // together regardless of how many contents exist.
    const importRe = /(import \{ get\w+ScenesForTier \} from '\.\.\/content\/[\w-]+\/scenes'\n)(?![\s\S]*import \{ get\w+ScenesForTier \})/
    if (!importRe.test(txt))
      throw new Error(`Could not find a content-scenes import to anchor on in ${fp}`)
    let next = txt.replace(importRe, `$1${importLine}\n`)

    // Append the entry just before the closing brace of SCENE_LOADERS.
    const mapRe = /(const SCENE_LOADERS[\s\S]*?\n)(\})/m
    const m = next.match(mapRe)
    if (!m) throw new Error(`Could not locate SCENE_LOADERS close in ${fp}`)
    next = next.replace(mapRe, `$1  ${ID}: ${loaderFn},\n$2`)

    if (next === txt) throw new Error(`Patch produced no change in ${fp}`)
    await fs.writeFile(fp, next)
    log(`  ✓ patched ${path.relative(REPO_ROOT, fp)} (SCENE_LOADERS.${ID})`)
  }
}

// ─── Done — next-step instructions ───────────────────────────────────────────
logSection('Next steps')
log(`  0. Four registries were patched: resolveTierPayload, content/index.ts,`)
log(`     contentItems.ts, useDemoPlayback.ts (SCENE_LOADERS). Pause-mode`)
log(`     wiring (ads/, pauseMoments.ts, PAUSE_MOMENTS_REGISTRY) is NOT done —`)
log(`     see /add-new-ad-playback-mode.`)
log(`  1. Drop tier JSONs into src/demo/content/${ID}/tiers/:`)
log(`       tier1.json, tier2.json, tier3.json`)
log(`     (Use the b-files from /normalize-tier-jsons, dropping the 'b' suffix.)`)
log(`  2. Drop the video into public/assets/video/${spec.videoFileName}`)
log(`  3. Drop the poster into public/assets/posters/${spec.posterFileName}`)
log(`  4. Run /align-tier-jsons for app-readiness pass.`)
log(`  5. npm run build  →  confirm clean.`)
log(`  6. Open the demo: '${spec.title}' should appear on the content grid.`)
log(``)
log(`  Ad modes are OFF for this content by default. Wire them by editing`)
log(`  src/demo/content/${ID}/config.ts (defaultAdModes + adModesByTier).`)
