import type { SceneMetadata, TaxonomyOption, TaxonomySceneData } from './types'

const iabValues = ['Home & Garden', 'Food & Drink', 'Entertainment', 'Travel', 'Retail', 'Family']
const locationValues = ['Kitchen', 'Dining Room', 'Retail Floor', 'Living Room', 'Studio Set', 'Outdoor Patio']
const sentimentValues = ['Positive', 'Neutral Positive', 'Optimistic', 'Curious', 'Comforting', 'Elevated']
const brandSafetyValues = [
  'Low Risk',
  'Suitable',
  'Context Safe',
  'No Sensitive Content',
  'Family Safe',
  'Advertiser Friendly',
]
const faceValues = [
  '3 primary faces',
  '2 primary faces',
  '1 featured face',
  '4 background faces',
  '2 speaking faces',
  'Group crowd',
]
const objectValues = [
  'Cookware, counter, produce',
  'Tabletop, decor, chair',
  'Packaging, product display',
  'Sofa, lamp, shelf',
  'Wardrobe, accessories',
  'Glassware, utensils',
]

export const getTaxonomySceneData = (
  scene: SceneMetadata,
  index: number,
  taxonomy: TaxonomyOption
): TaxonomySceneData | null => {
  const override = scene.taxonomyData?.[taxonomy]
  if (override) return override

  // For real-content scenes (DHYH), we only want to display taxonomy rows that came
  // from the upstream JSON. If the scene has no data for this taxonomy (e.g. color
  // bars at the start of the episode) we return null so the panel skips the card.
  if (scene.taxonomyData || scene.isEmpty) return null

  switch (taxonomy) {
    case 'IAB':
      return {
        headline: iabValues[index % iabValues.length],
        chip: `${0.78 + index * 0.02 > 0.96 ? 0.96 : 0.78 + index * 0.02}`,
        sections: [
          { label: 'Primary Category:', value: iabValues[index % iabValues.length] },
          { label: 'Considered:', value: 'Retail, Lifestyle, Entertainment' },
          {
            label: 'Reasoning:',
            value: `Scene cues and on-screen context align most closely with the ${iabValues[index % iabValues.length]} taxonomy bucket.`,
          },
          { label: 'Text Data:', value: scene.textData },
          {
            label: 'Confidence:',
            value: `${(0.78 + index * 0.02 > 0.96 ? 0.96 : 0.78 + index * 0.02).toFixed(2)}`,
          },
        ],
      }
    case 'Location':
      return {
        headline: locationValues[index % locationValues.length],
        chip: `${(0.73 + index * 0.03 > 0.94 ? 0.94 : 0.73 + index * 0.03).toFixed(2)}`,
        sections: [
          { label: 'Detected Location:', value: locationValues[index % locationValues.length] },
          { label: 'Considered:', value: 'Interior, Domestic Space, Branded Environment' },
          {
            label: 'Reasoning:',
            value: 'Foreground objects, layout, and scene composition indicate a consistent location classification.',
          },
          { label: 'Text Data:', value: scene.textData },
          {
            label: 'Confidence:',
            value: `${(0.73 + index * 0.03 > 0.94 ? 0.94 : 0.73 + index * 0.03).toFixed(2)}`,
          },
        ],
      }
    case 'Sentiment':
      return {
        headline: sentimentValues[index % sentimentValues.length],
        chip: `${(0.75 + index * 0.025 > 0.95 ? 0.95 : 0.75 + index * 0.025).toFixed(2)}`,
        sections: [
          { label: 'Sentiment:', value: sentimentValues[index % sentimentValues.length] },
          { label: 'Considered:', value: 'Uplifting, Calm, Motivational' },
          {
            label: 'Reasoning:',
            value: 'Visual pacing, framing, and tone suggest a stable sentiment signal across the scene.',
          },
          { label: 'Text Data:', value: scene.textData },
          { label: 'Music Emotion:', value: `${scene.musicEmotion} (${scene.musicScore.toFixed(2)})` },
        ],
      }
    case 'Brand Safety':
      return {
        headline: brandSafetyValues[index % brandSafetyValues.length],
        chip: `${(0.84 + index * 0.015 > 0.97 ? 0.97 : 0.84 + index * 0.015).toFixed(2)}`,
        sections: [
          { label: 'Brand Safety:', value: brandSafetyValues[index % brandSafetyValues.length] },
          { label: 'Considered:', value: 'Violence, Adult Themes, Sensitive Issues' },
          {
            label: 'Reasoning:',
            value: 'No sensitive visual or verbal cues are present, keeping the scene advertiser-safe.',
          },
          { label: 'Text Data:', value: scene.textData },
          {
            label: 'Confidence:',
            value: `${(0.84 + index * 0.015 > 0.97 ? 0.97 : 0.84 + index * 0.015).toFixed(2)}`,
          },
        ],
      }
    case 'Faces':
      return {
        headline: faceValues[index % faceValues.length],
        chip: `${(0.71 + index * 0.03 > 0.93 ? 0.93 : 0.71 + index * 0.03).toFixed(2)}`,
        sections: [
          { label: 'Face Detection:', value: faceValues[index % faceValues.length] },
          { label: 'Considered:', value: 'Primary cast, background cast, speaking roles' },
          {
            label: 'Reasoning:',
            value: 'Detected faces and shot composition indicate the listed visible subject count and prominence.',
          },
          { label: 'Text Data:', value: scene.textData },
          {
            label: 'Confidence:',
            value: `${(0.71 + index * 0.03 > 0.93 ? 0.93 : 0.71 + index * 0.03).toFixed(2)}`,
          },
        ],
      }
    case 'Object':
      return {
        headline: objectValues[index % objectValues.length],
        chip: `${(0.74 + index * 0.025 > 0.95 ? 0.95 : 0.74 + index * 0.025).toFixed(2)}`,
        sections: [
          { label: 'Objects:', value: objectValues[index % objectValues.length] },
          { label: 'Considered:', value: 'Furniture, product, decor, utility items' },
          {
            label: 'Reasoning:',
            value: 'The object group reflects the most persistent physical items visible in the scene.',
          },
          { label: 'Text Data:', value: scene.textData },
          {
            label: 'Confidence:',
            value: `${(0.74 + index * 0.025 > 0.95 ? 0.95 : 0.74 + index * 0.025).toFixed(2)}`,
          },
        ],
      }
    case 'Emotion':
    default:
      return {
        headline: scene.emotion,
        chip: scene.emotionScore.toFixed(2),
        sections: [
          { label: 'Considered:', value: scene.considered },
          { label: 'Reasoning:', value: scene.reasoning },
          { label: 'Text Data:', value: scene.textData },
          { label: 'Music Emotion:', value: `${scene.musicEmotion} (${scene.musicScore.toFixed(2)})` },
        ],
      }
  }
}
