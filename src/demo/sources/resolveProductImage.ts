import { PRODUCT_PLACEHOLDER_IMAGE } from '../constants'
import type { ContentId, ProductImageInput } from './types'

/** Bundled product images live under `public/assets/products/<image>`.
 *  This base is the content-agnostic prefix for the local fallback path. */
const BUNDLED_PRODUCT_IMAGE_BASE = '/assets/products/'

const remoteBaseUrl = (): string => {
  const v = (import.meta.env as Record<string, string | undefined>)
    .VITE_CONTENT_SOURCE_BASE_URL
  return (v ?? '').replace(/\/$/, '')
}

/**
 * Resolve a product image's display URL.
 *
 * Resolution order:
 *   1. If `VITE_CONTENT_SOURCE_BASE_URL` is set:
 *        a. Prefer `image_url` (already an absolute https URL — saves a fetch
 *           through our base) when present.
 *        b. Otherwise build `${base}/${contentId}/products/${image}`.
 *   2. Else (bundled / local default):
 *        a. Prefer `image` resolved against the bundled `/assets/products/`
 *           prefix (current behavior — keeps demo offline-friendly).
 *        b. Fall back to `image_url` if no `image` field.
 *   3. If neither is present, return `PRODUCT_PLACEHOLDER_IMAGE`.
 *
 * The local-vs-remote ordering is deliberately reversed between modes so the
 * default build serves images from its bundled `/assets/products/` (fast,
 * offline) while a remotely-configured deploy uses the canonical `image_url`
 * the upstream JSON already contains.
 */
export const resolveProductImageUrl = (
  contentId: ContentId,
  match: ProductImageInput
): string => {
  const base = remoteBaseUrl()

  if (base) {
    if (match.image_url && match.image_url.length > 0) return match.image_url
    if (match.image && match.image.length > 0) {
      return `${base}/${contentId}/products/${match.image.replace(/^\/+/, '')}`
    }
    return PRODUCT_PLACEHOLDER_IMAGE
  }

  if (match.image && match.image.length > 0) {
    return `${BUNDLED_PRODUCT_IMAGE_BASE}${match.image.replace(/^\/+/, '')}`
  }
  if (match.image_url && match.image_url.length > 0) return match.image_url
  return PRODUCT_PLACEHOLDER_IMAGE
}
