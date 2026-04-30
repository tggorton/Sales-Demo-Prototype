import type { ContentId, TierJsonPayload, TierOption } from './types'

/**
 * Returns the (trimmed) base URL configured for remote content fetching, or
 * empty string when not set. When set, tier JSONs are fetched from
 * `${baseUrl}/${contentId}/${tierFileName}` instead of bundled imports.
 *
 * Convention: a hosted content package lives at `${baseUrl}/${contentId}/`
 * with `tier1.json`, `tier2.json`, `tier3.json` (and a `products/`
 * subdirectory — see resolveProductImage.ts) directly inside.
 */
const remoteBaseUrl = (): string => {
  const v = (import.meta.env as Record<string, string | undefined>)
    .VITE_CONTENT_SOURCE_BASE_URL
  return (v ?? '').replace(/\/$/, '')
}

/**
 * Maps a TierOption to the canonical filename inside a content package.
 * Two TierOption values can map to the same JSON file (Basic Scene + Assets
 * Summary both pull from tier1.json) — that mapping is preserved here so
 * remote and bundled paths stay symmetric.
 */
const tierFileName = (tier: TierOption): string => {
  switch (tier) {
    case 'Exact Product Match':
    case 'Categorical Product Match':
      return 'tier3.json'
    case 'Advanced Scene':
      return 'tier2.json'
    case 'Basic Scene':
    case 'Assets Summary':
    default:
      return 'tier1.json'
  }
}

// Bundled-import map for content the build ships with. Vite chunks these
// individually so a tier change downloads only its own file. Adding bundled
// support for a new content id = create `src/demo/data/<id>/tier{1,2,3}.json`
// and add the entries here. Most new content should NOT use this path —
// upload-flow content lives entirely under VITE_CONTENT_SOURCE_BASE_URL.
const bundledTierLoaders: Record<ContentId, Record<TierOption, () => Promise<unknown>>> = {
  dhyh: {
    'Basic Scene': () => import('../data/dhyh/tier1.json').then((m) => m.default ?? m),
    'Assets Summary': () => import('../data/dhyh/tier1.json').then((m) => m.default ?? m),
    'Advanced Scene': () => import('../data/dhyh/tier2.json').then((m) => m.default ?? m),
    'Exact Product Match': () => import('../data/dhyh/tier3.json').then((m) => m.default ?? m),
    'Categorical Product Match': () => import('../data/dhyh/tier3.json').then((m) => m.default ?? m),
  },
}

/**
 * Resolve a tier JSON payload for a given content id and tier.
 *
 * Resolution order:
 *   1. If `VITE_CONTENT_SOURCE_BASE_URL` is set → fetch from
 *      `${base}/${contentId}/${tierFileName}`.
 *   2. Else, if the content id has a bundled-loader entry → dynamic-import
 *      the corresponding local JSON (Vite chunks it).
 *   3. Else, throw — the build doesn't know how to load this content.
 *
 * The function intentionally does not validate the payload shape —
 * downstream `buildBundle` is the parser/validator.
 */
export const resolveTierPayload = async (
  contentId: ContentId,
  tier: TierOption
): Promise<TierJsonPayload> => {
  const base = remoteBaseUrl()
  if (base) {
    const url = `${base}/${contentId}/${tierFileName(tier)}`
    const res = await fetch(url)
    if (!res.ok) {
      throw new Error(
        `resolveTierPayload: failed to fetch ${url} (status ${res.status} ${res.statusText})`
      )
    }
    return (await res.json()) as TierJsonPayload
  }

  const contentLoaders = bundledTierLoaders[contentId]
  if (!contentLoaders) {
    throw new Error(
      `resolveTierPayload: no bundled loader for content "${contentId}" and ` +
        `VITE_CONTENT_SOURCE_BASE_URL is not set. Either configure the env var ` +
        `or add a bundled entry in src/demo/sources/resolveTierPayload.ts.`
    )
  }
  const loader = contentLoaders[tier]
  return (await loader()) as TierJsonPayload
}
