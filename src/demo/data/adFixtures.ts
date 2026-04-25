import type { AdDecisioningTailItem } from '../types'

export const adDecisionPayload = {
  status: 'success',
  message: 'results found for video_id: 123',
  data: {
    id: '123',
    client_url: 'https://video/hosting/123.mp4',
    type: 'mp4',
    duration$2seconds: '15.0',
    fps: '30.0',
    ad$2data: {
      iab_category: {
        id: '406',
        name: 'Credit Cards',
        confidence: 0.95,
      },
      garm_category: {
        id: 'G11',
        category: 'Debated Sensitive Social Issue',
        risk_level: 'High',
        confidence: 0.9,
      },
      advertiser: 'My Credit Cards',
      adomain: 'mycreditcards.com',
      primary_language: 'English',
    },
  },
}

export const adDecisioningTail: AdDecisioningTailItem[] = [
  {
    id: '432',
    name: 'Pop Culture',
    confidence: 0.85,
    count: 15,
    screen_time: 124.037,
  },
  {
    id: '640',
    name: 'Television',
    confidence: 0.9,
    count: 5,
    screen_time: 115.073,
  },
]
