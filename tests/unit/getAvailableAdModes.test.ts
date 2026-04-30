import { describe, expect, it } from 'vitest'
import { getAvailableAdModes, getContentConfig } from '../../src/demo/content'
import { ENABLED_AD_MODE_IDS } from '../../src/demo/ad-modes'
import { DHYH_CONTENT_ID } from '../../src/demo/content/dhyh/timeline'

// Phase 5a behavior: ad-mode availability is a content × tier lookup,
// resolved from `config.adModesByTier?.[tier] ?? config.defaultAdModes`,
// then intersected with the globally-enabled set in ad-modes/registry.ts.
// These tests pin the resolver's contract so a future tier-exclusive mode
// (e.g. carousel-shop) can be added confidently as a config edit.
describe('getAvailableAdModes (content × tier resolver)', () => {
  describe('with the registered DHYH content', () => {
    it('returns DHYH defaultAdModes for every enabled tier', () => {
      // DHYH currently declares only `defaultAdModes` (3 Sync modes), no
      // per-tier overrides — so every tier resolves to the same list.
      const tiersToCheck = [
        'Basic Scene',
        'Advanced Scene',
        'Exact Product Match',
      ] as const
      for (const tier of tiersToCheck) {
        expect(getAvailableAdModes(DHYH_CONTENT_ID, tier)).toEqual([
          'Sync',
          'Sync: L-Bar',
          'Sync: Impulse',
        ])
      }
    })

    it('only surfaces modes that are also globally enabled', () => {
      const result = getAvailableAdModes(DHYH_CONTENT_ID, 'Exact Product Match')
      for (const id of result) {
        expect(ENABLED_AD_MODE_IDS).toContain(id)
      }
    })
  })

  describe('with an unknown content id', () => {
    it('falls back to the global enabled set', () => {
      expect(getAvailableAdModes('not-a-real-content', 'Basic Scene')).toEqual([
        ...ENABLED_AD_MODE_IDS,
      ])
    })
  })

  describe('with a null/undefined content id', () => {
    it('falls back to the global enabled set', () => {
      expect(getAvailableAdModes(null, 'Basic Scene')).toEqual([...ENABLED_AD_MODE_IDS])
      expect(getAvailableAdModes(undefined, 'Basic Scene')).toEqual([
        ...ENABLED_AD_MODE_IDS,
      ])
    })
  })
})

describe('getContentConfig', () => {
  it('returns the DHYH config for its registered id', () => {
    const cfg = getContentConfig(DHYH_CONTENT_ID)
    expect(cfg).not.toBeNull()
    expect(cfg?.id).toBe(DHYH_CONTENT_ID)
    expect(cfg?.title).toBe("Don't Hate Your House")
  })

  it('declares Brand Safety as a hidden taxonomy for DHYH', () => {
    // Migrated from the old HIDDEN_TAXONOMIES_BY_CONTENT global lookup in
    // Phase 5a. The Brand Safety hide is what keeps the DHYH demo from
    // surfacing the unapproved garm_category data.
    const cfg = getContentConfig(DHYH_CONTENT_ID)
    expect(cfg?.hiddenTaxonomies).toContain('Brand Safety')
  })

  it('returns null for an unknown content id', () => {
    expect(getContentConfig('not-a-real-content')).toBeNull()
  })
})
