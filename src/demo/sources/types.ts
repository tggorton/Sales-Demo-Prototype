import type { TierOption } from '../types'

/**
 * A content tile's identifier (e.g. `'dhyh'`). Future content uploads will
 * have their own ids that key into the tier-loading + product-image
 * resolution; for now only `'dhyh'` is wired and other ids throw.
 */
export type ContentId = string

/**
 * Trimmed shape of an upstream tier JSON payload — only the fields the
 * downstream `buildBundle` pipeline actually consumes. The full upstream
 * schema has many more fields per scene; resolvers don't validate, they
 * just deliver the parsed JSON.
 */
export type TierJsonPayload = {
  duration_in_seconds?: number
  Scenes?: unknown[]
  video_metadata?: { locations?: unknown[] }
  // Pass-through for any additional fields the upstream model emits.
  [key: string]: unknown
}

/**
 * Input to the product-image resolver — the relevant fields from a
 * `product_match` entry inside a tier JSON's `objects[].product_match[]`
 * array. The full upstream type has more fields (price, link, confidence,
 * dedupe_key, etc.); the resolver only needs the image-related ones.
 */
export type ProductImageInput = {
  /** Bundled-asset relative path, e.g. `'homedpt/335027444.jpg'`. */
  image?: string
  /** Absolute (often S3) URL to the same product image. */
  image_url?: string
}

export type { TierOption }
