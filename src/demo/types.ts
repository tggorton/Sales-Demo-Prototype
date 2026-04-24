export type CurrentView = 'login' | 'selection' | 'demo'

export type ContentCategory = 'All' | 'Reality TV' | 'Comedy' | 'Drama' | 'Home & Garden'

export type TierOption =
  | 'Assets Summary'
  | 'Basic Scene'
  | 'Advanced Scene'
  | 'Categorical Product Match'
  | 'Exact Product Match'

export type AdPlaybackOption =
  | 'Pause Ad'
  | 'CTA Pause'
  | 'Organic Pause'
  | 'Carousel Shop'
  | 'Sync'
  | 'Sync: L-Bar'
  | 'Sync: Impulse'
  | 'Companion'

export type TaxonomyOption =
  | 'IAB'
  | 'Location'
  | 'Sentiment'
  | 'Brand Safety'
  | 'Faces'
  | 'Emotion'
  | 'Object'

export type JsonDownloadOption = 'Original JSON' | 'Summary JSON'

export type DemoPanel = 'taxonomy' | 'product' | 'json'
export type ExpandedPanel = DemoPanel | null

export type ContentItem = {
  id: string
  title: string
  categories: Array<Exclude<ContentCategory, 'All'>>
  posterUrl: string
  videoUrl?: string
}

export type SceneProduct = {
  id: string
  // Stable cross-scene identifier for the *product itself* (e.g. the Home Depot SKU).
  // `id` is unique per scene/product emission and is used for React keys; `productKey`
  // is shared across every scene that references the same underlying product and is
  // used by the time-windowed dedupe in useDemoPlayback.
  productKey: string
  name: string
  description: string
  image: string
}

export type SceneMetadata = {
  id: string
  start: number
  end: number
  sceneLabel: string
  emotion: string
  emotionScore: number
  considered: string
  reasoning: string
  textData: string
  musicEmotion: string
  musicScore: number
  cta: string
  products: SceneProduct[]
  // Optional precomputed taxonomy overrides (used for real-content JSON, e.g. DHYH)
  taxonomyData?: Partial<Record<TaxonomyOption, TaxonomySceneData>>
  // Optional raw JSON for the scene, used by the JSON panel when available (e.g. DHYH)
  rawJson?: unknown
  // True when the scene has no meaningful analysis data (e.g. the DHYH color-bar intro).
  // Panels should skip rendering these so they stay empty until real content begins.
  isEmpty?: boolean
}

export type ProductEntry = SceneProduct & {
  sceneId: string
  sceneLabel: string
  sceneStart: number
}

export type SyncImpulseSegment = {
  start: number
  end: number
  kind: 'content' | 'ad-break-1' | 'ad-break-2'
}

export type AdDecisioningTailItem = {
  id: string
  name: string
  confidence: number
  count: number
  screen_time: number
}

export type TaxonomySceneSection = {
  label: string
  value: string
}

export type TaxonomySceneData = {
  headline: string
  chip: string
  sections: TaxonomySceneSection[]
}

export type PlayerControlTokens = {
  overlayPx: number
  overlayPy: number
  timelineHeight: number
  timelineTop: number
  sliderContainerHeight: number
  thumbSize: number
  playIconSize: number
  secondaryIconSize: number
  controlButtonPadding: number
  timeFontSize: number
  timeWidth: number
  controlBarHeight: number
}
