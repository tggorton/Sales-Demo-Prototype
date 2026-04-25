import { SYNC_IMPULSE_SEGMENTS } from '../constants'
import type {
  AdDecisioningTailItem,
  AdPlaybackOption,
  JsonDownloadOption,
  SceneMetadata,
  TierOption,
} from '../types'

export const buildSceneJsonPayload = (scene: SceneMetadata, index: number) => {
  if (scene.rawJson !== undefined) {
    return scene.rawJson
  }
  return {
    video_id: 'cabbcae2-d527-406c-abbd-a5cc0269bbab',
    ext_id: `scene-${index + 1}`,
    duration_in_seconds: scene.end - scene.start,
    aspect_ratio: '16:9',
    video_metadata: {
      scene: scene.sceneLabel,
      sentiment_analysis: [
        {
          name: scene.emotion,
          count: Math.round(scene.emotionScore * 250),
          screen_time: scene.end - scene.start,
        },
      ],
      text_data: scene.textData,
      considered: scene.considered,
    },
  }
}

export const buildAdBreakJsonString = (
  activeAdBreakLabel: string,
  adDecisionPayload: Record<string, unknown>,
  adDecisioningTail: AdDecisioningTailItem[]
) => `{
  "${activeAdBreakLabel}"
}

${JSON.stringify(adDecisionPayload, null, 2)}

            "id": "${adDecisioningTail[0].id}",
            "name": "${adDecisioningTail[0].name}",
            "confidence": ${adDecisioningTail[0].confidence},
            "count": ${adDecisioningTail[0].count},
            "screen_time": ${adDecisioningTail[0].screen_time}
        },
        {
            "id": "${adDecisioningTail[1].id}",
            "name": "${adDecisioningTail[1].name}",
            "confidence": ${adDecisioningTail[1].confidence},
            "count": ${adDecisioningTail[1].count},
            "screen_time": ${adDecisioningTail[1].screen_time}
        },`

export const buildOriginalJsonString = ({
  isSyncImpulseMode,
  isAdBreakPlayback,
  activeAdBreakLabel,
  adDecisionPayload,
  adDecisioningTail,
  playbackScenes,
}: {
  isSyncImpulseMode: boolean
  isAdBreakPlayback: boolean
  activeAdBreakLabel: string
  adDecisionPayload: Record<string, unknown>
  adDecisioningTail: AdDecisioningTailItem[]
  playbackScenes: SceneMetadata[]
}) => {
  if (isSyncImpulseMode && isAdBreakPlayback) {
    return buildAdBreakJsonString(activeAdBreakLabel, adDecisionPayload, adDecisioningTail)
  }

  return JSON.stringify(playbackScenes.map(buildSceneJsonPayload), null, 2)
}

export const buildSummaryJsonString = ({
  playbackScenes,
  selectedTier,
  selectedAdPlayback,
  playbackDurationSeconds,
  isSyncImpulseMode,
}: {
  playbackScenes: SceneMetadata[]
  selectedTier: TierOption
  selectedAdPlayback: AdPlaybackOption
  playbackDurationSeconds: number
  isSyncImpulseMode: boolean
}) => {
  const uniqueEmotions = [...new Set(playbackScenes.map((scene) => scene.emotion))]
  const allProductNames = playbackScenes.flatMap((scene) => scene.products.map((product) => product.name))
  const uniqueProducts = [...new Set(allProductNames)]

  return JSON.stringify(
    {
      summary_type: 'playback-json-summary',
      selected_tier: selectedTier,
      selected_playback_mode: selectedAdPlayback,
      duration_seconds: playbackDurationSeconds,
      total_scenes: playbackScenes.length,
      total_products: allProductNames.length,
      unique_emotions: uniqueEmotions,
      unique_product_names: uniqueProducts.slice(0, 12),
      ad_breaks: isSyncImpulseMode
        ? SYNC_IMPULSE_SEGMENTS.filter((segment) => segment.kind !== 'content').map((segment) => ({
            label: segment.kind === 'ad-break-1' ? 'Ad Break 1' : 'Ad Break 2',
            start: segment.start,
            end: segment.end,
            duration: segment.end - segment.start,
          }))
        : [],
    },
    null,
    2
  )
}

export const getJsonDownloadContent = (
  option: JsonDownloadOption,
  originalJsonDownloadString: string,
  summaryJsonDownloadString: string
) =>
  option === 'Original JSON'
    ? {
        content: originalJsonDownloadString,
        fileName: 'original-json-export.json',
      }
    : {
        content: summaryJsonDownloadString,
        fileName: 'summary-json-export.json',
      }
