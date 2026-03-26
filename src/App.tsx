import {
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Menu,
  Paper,
  Select,
  Slider,
  Stack,
  TextField,
  Drawer,
  Divider,
  Tooltip,
  Typography,
  Chip,
} from '@mui/material'
import PersonIcon from '@mui/icons-material/Person'
import CloseIcon from '@mui/icons-material/Close'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded'
import PauseRoundedIcon from '@mui/icons-material/PauseRounded'
import VolumeUpRoundedIcon from '@mui/icons-material/VolumeUpRounded'
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined'
import DataObjectOutlinedIcon from '@mui/icons-material/DataObjectOutlined'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'

type ContentCategory = 'All' | 'Reality TV' | 'Comedy' | 'Drama'
type TierOption =
  | 'Assets Summary'
  | 'Basic Scene'
  | 'Advanced Scene'
  | 'Categorical Product Match'
  | 'Exact Product Match'
type AdPlaybackOption =
  | 'Pause Ad'
  | 'CTA Pause'
  | 'Organic Pause'
  | 'Carousel Shop'
  | 'Sync'
  | 'Sync: L-Bar'
  | 'Sync: Impulse'
  | 'Companion'
type TaxonomyOption = 'IAB' | 'Location' | 'Sentiment' | 'Brand Safety' | 'Faces' | 'Emotion' | 'Object'
type JsonDownloadOption = 'Original JSON' | 'Summary JSON'

type ContentItem = {
  id: string
  title: string
  category: Exclude<ContentCategory, 'All'>
  posterUrl: string
}

const CONTENT_ITEMS: ContentItem[] = [
  {
    id: 'parks',
    title: 'Parks and Recreation',
    category: 'Comedy',
    posterUrl: '/assets/posters/parks-and-rec.png',
  },
  {
    id: 'yellowstone',
    title: 'Yellowstone',
    category: 'Drama',
    posterUrl: '/assets/posters/yellowstone.png',
  },
  {
    id: 'big-brother',
    title: 'Big Brother',
    category: 'Reality TV',
    posterUrl: '/assets/posters/big-brother.png',
  },
  {
    id: 'raymond',
    title: 'Everybody Loves Raymond',
    category: 'Comedy',
    posterUrl: '/assets/posters/everybody-loves-raymond.png',
  },
  {
    id: 'ted',
    title: 'Ted',
    category: 'Comedy',
    posterUrl: '/assets/posters/ted.png',
  },
  {
    id: 'wolf-like-me',
    title: 'Wolf Like Me',
    category: 'Drama',
    posterUrl: '/assets/posters/wolf-like-me.png',
  },
  {
    id: 'ap-bio',
    title: 'A.P. Bio',
    category: 'Comedy',
    posterUrl: '/assets/posters/ap-bio.png',
  },
  {
    id: 'below-deck',
    title: 'Below Deck',
    category: 'Reality TV',
    posterUrl: '/assets/posters/below-deck.png',
  },
]

const categories: ContentCategory[] = ['All', 'Reality TV', 'Comedy', 'Drama']
const tierOptions: TierOption[] = [
  'Assets Summary',
  'Basic Scene',
  'Advanced Scene',
  'Categorical Product Match',
  'Exact Product Match',
]
const adPlaybackOptions: AdPlaybackOption[] = [
  'Pause Ad',
  'CTA Pause',
  'Organic Pause',
  'Carousel Shop',
  'Sync',
  'Sync: L-Bar',
  'Sync: Impulse',
  'Companion',
]
const taxonomyOptions: TaxonomyOption[] = [
  'IAB',
  'Location',
  'Sentiment',
  'Brand Safety',
  'Faces',
  'Emotion',
  'Object',
]
const jsonDownloadOptions: JsonDownloadOption[] = ['Original JSON', 'Summary JSON']
const TOTAL_DURATION_SECONDS = 32 * 60 + 20
const DEFAULT_START_SECONDS = 4 * 60 + 31
const SYNC_IMPULSE_DURATION_SECONDS = 60 + 30 + 60 + 30 + 60
const SYNC_IMPULSE_SEGMENTS = [
  { start: 0, end: 60, kind: 'content' as const },
  { start: 60, end: 90, kind: 'ad-break-1' as const },
  { start: 90, end: 150, kind: 'content' as const },
  { start: 150, end: 180, kind: 'ad-break-2' as const },
  { start: 180, end: SYNC_IMPULSE_DURATION_SECONDS, kind: 'content' as const },
]
const AD_BREAK_1_IMAGE = '/assets/ads/ad-1-impulse-target.png'
const AD_BREAK_2_IMAGE = '/assets/ads/ad-2-impulse-target.png'
const AD_QR_DESTINATION_1 = 'https://kerv.social/embed/3/32014'
const AD_QR_DESTINATION_2 = 'https://kerv.social/embed/3/32015'
const AD_QR_IMAGE_1 = `https://quickchart.io/qr?size=260&margin=0&text=${encodeURIComponent(AD_QR_DESTINATION_1)}`
const AD_QR_IMAGE_2 = `https://quickchart.io/qr?size=260&margin=0&text=${encodeURIComponent(AD_QR_DESTINATION_2)}`
const PLACEHOLDER_VIDEO_URL = '/assets/video/Placeholder-SalesDemo-Content_Compresssed.mp4'
const DEFAULT_USER_NAME = 'John Doe'
const DEFAULT_USER_EMAIL = 'John.doe@kerv.ai'
// REFERENCE: tune these if we revisit collapsed-title viewport centering behavior.
const DEFAULT_MACBOOK_VIEWPORT_MAX_WIDTH = 1600
const DEFAULT_MACBOOK_VIEWPORT_MAX_HEIGHT = 1000

type SceneMetadata = {
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
  products: Array<{
    id: string
    name: string
    description: string
    image: string
  }>
}

type PanelGlyphProps = {
  variant: 'expand' | 'collapse'
  color: string
  size?: number
}

const PanelGlyph = ({ variant, color, size = 12 }: PanelGlyphProps) => {
  const viewBox = variant === 'expand' ? '8.8 8.8 9.8 9.8' : '7.8 7.8 9.8 9.8'
  const path =
    variant === 'expand'
      ? 'M10.3257 14.9657H9V18.28H12.3143V16.9543H10.3257V14.9657ZM9 12.3143H10.3257V10.3257H12.3143V9H9V12.3143ZM16.9543 16.9543H14.9657V18.28H18.28V14.9657H16.9543V16.9543ZM14.9657 9V10.3257H16.9543V12.3143H18.28V9H14.9657Z'
      : 'M8 15.2914H9.98857V17.28H11.3143V13.9657H8V15.2914ZM9.98857 9.98857H8V11.3143H11.3143V8H9.98857V9.98857ZM13.9657 17.28H15.2914V15.2914H17.28V13.9657H13.9657V17.28ZM15.2914 9.98857V8H13.9657V11.3143H17.28V9.98857H15.2914Z'

  return (
    <Box
      component="svg"
      viewBox={viewBox}
      aria-hidden
      sx={{ width: size, height: size, display: 'block', color, flexShrink: 0 }}
    >
      <path d={path} fill="currentColor" />
    </Box>
  )
}

const SCENE_METADATA: SceneMetadata[] = [
  {
    id: 'scene-1',
    start: 0,
    end: 320,
    sceneLabel: 'Scene 1',
    emotion: 'Emotion',
    emotionScore: 0.74,
    considered: 'Curiosity, Uplifting, Unknown',
    reasoning:
      'A logo/title card paired with dreamy music conveys a serene, dreamy setup rather than an active narrative emotion.',
    textData: 'Mox',
    musicEmotion: 'Dreamy',
    musicScore: 0.9,
    cta: 'In-Content-CTA',
    products: [
      {
        id: 'p1',
        name: 'Bed',
        description: 'Sturdy and stylish, holds a vast collection of books.',
        image: '/assets/posters/parks-and-rec.png',
      },
      {
        id: 'p2',
        name: 'Chair',
        description: 'Sturdy and stylish, holds a vast collection of books.',
        image: '/assets/posters/ap-bio.png',
      },
      {
        id: 'p3',
        name: 'Desk',
        description: 'Sturdy and stylish, holds a vast collection of books.',
        image: '/assets/posters/yellowstone.png',
      },
    ],
  },
  {
    id: 'scene-2',
    start: 320,
    end: 620,
    sceneLabel: 'Scene 2',
    emotion: 'Focused',
    emotionScore: 0.81,
    considered: 'Determined, Calm, Unknown',
    reasoning:
      'Long stable shots and low-motion framing suggest concentration and task-oriented behavior.',
    textData: 'Wall Paint',
    musicEmotion: 'Motivational',
    musicScore: 0.84,
    cta: 'Shop Similar',
    products: [
      {
        id: 'p4',
        name: 'Desk 2',
        description: 'Sturdy and stylish, holds a vast collection of books.',
        image: '/assets/posters/below-deck.png',
      },
      {
        id: 'p5',
        name: 'Lamp',
        description: 'Modern accent lamp with soft warm tone.',
        image: '/assets/posters/wolf-like-me.png',
      },
      {
        id: 'p6',
        name: 'Storage Bin',
        description: 'Compact and durable storage utility piece.',
        image: '/assets/posters/big-brother.png',
      },
    ],
  },
  {
    id: 'scene-3',
    start: 620,
    end: 980,
    sceneLabel: 'Scene 3',
    emotion: 'Uplifting',
    emotionScore: 0.77,
    considered: 'Optimistic, Energetic, Unknown',
    reasoning:
      'Brighter palette and more active scene progression map to a generally positive emotional signal.',
    textData: 'Refresh',
    musicEmotion: 'Upbeat',
    musicScore: 0.86,
    cta: 'Tap to Learn More',
    products: [
      {
        id: 'p7',
        name: 'Shelf',
        description: 'Open shelving for decor and essentials.',
        image: '/assets/posters/everybody-loves-raymond.png',
      },
      {
        id: 'p8',
        name: 'Wall Art',
        description: 'Minimal framed wall pieces for calm interiors.',
        image: '/assets/posters/ted.png',
      },
      {
        id: 'p9',
        name: 'Rug',
        description: 'Soft low-pile rug with neutral tones.',
        image: '/assets/posters/parks-and-rec.png',
      },
    ],
  },
  {
    id: 'scene-4',
    start: 980,
    end: 1320,
    sceneLabel: 'Scene 4',
    emotion: 'Neutral',
    emotionScore: 0.69,
    considered: 'Neutral, Informational, Unknown',
    reasoning:
      'Balanced framing and steady pacing align with an informational, neutral segment.',
    textData: 'Material Match',
    musicEmotion: 'Ambient',
    musicScore: 0.7,
    cta: 'Compare Items',
    products: [
      {
        id: 'p10',
        name: 'Bed',
        description: 'Sturdy and stylish, holds a vast collection of books.',
        image: '/assets/posters/yellowstone.png',
      },
      {
        id: 'p11',
        name: 'Desk 2',
        description: 'Sturdy and stylish, holds a vast collection of books.',
        image: '/assets/posters/ap-bio.png',
      },
      {
        id: 'p12',
        name: 'Chair',
        description: 'Sturdy and stylish, holds a vast collection of books.',
        image: '/assets/posters/below-deck.png',
      },
    ],
  },
  {
    id: 'scene-5',
    start: 1320,
    end: 1650,
    sceneLabel: 'Scene 5',
    emotion: 'Excited',
    emotionScore: 0.83,
    considered: 'Excited, Curious, Unknown',
    reasoning:
      'Faster cadence and brighter transitions increase perceived excitement and anticipation.',
    textData: 'New Collection',
    musicEmotion: 'Energetic',
    musicScore: 0.88,
    cta: 'Open Collection',
    products: [
      {
        id: 'p13',
        name: 'Desk',
        description: 'Sturdy and stylish, holds a vast collection of books.',
        image: '/assets/posters/big-brother.png',
      },
      {
        id: 'p14',
        name: 'Bed',
        description: 'Sturdy and stylish, holds a vast collection of books.',
        image: '/assets/posters/wolf-like-me.png',
      },
      {
        id: 'p15',
        name: 'Desk 2',
        description: 'Sturdy and stylish, holds a vast collection of books.',
        image: '/assets/posters/everybody-loves-raymond.png',
      },
    ],
  },
  {
    id: 'scene-6',
    start: 1650,
    end: TOTAL_DURATION_SECONDS,
    sceneLabel: 'Scene 6',
    emotion: 'Reflective',
    emotionScore: 0.71,
    considered: 'Reflective, Calm, Unknown',
    reasoning:
      'The closing rhythm and reduced motion suggest a reflective ending moment.',
    textData: 'Final Card',
    musicEmotion: 'Warm',
    musicScore: 0.76,
    cta: 'In-Content-CTA',
    products: [
      {
        id: 'p16',
        name: 'Chair',
        description: 'Sturdy and stylish, holds a vast collection of books.',
        image: '/assets/posters/ted.png',
      },
      {
        id: 'p17',
        name: 'Desk',
        description: 'Sturdy and stylish, holds a vast collection of books.',
        image: '/assets/posters/parks-and-rec.png',
      },
      {
        id: 'p18',
        name: 'Bed',
        description: 'Sturdy and stylish, holds a vast collection of books.',
        image: '/assets/posters/ap-bio.png',
      },
    ],
  },
]

function App() {
  const [currentView, setCurrentView] = useState<'login' | 'selection' | 'demo'>('login')
  const [activeDemoPanels, setActiveDemoPanels] = useState<
    Array<'taxonomy' | 'product' | 'json'>
  >([])
  const [selectedCategory, setSelectedCategory] = useState<ContentCategory>('All')
  const [selectedContentIds, setSelectedContentIds] = useState<string[]>([])
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null)
  const [isSelectorModalOpen, setIsSelectorModalOpen] = useState(false)
  const [selectedTier, setSelectedTier] = useState<TierOption>('Basic Scene')
  const [selectedAdPlayback, setSelectedAdPlayback] =
    useState<AdPlaybackOption>('CTA Pause')
  const [selectedTaxonomy, setSelectedTaxonomy] = useState<TaxonomyOption>('Emotion')
  const [isTitlePanelExpanded, setIsTitlePanelExpanded] = useState(true)
  const [isJsonDownloadModalOpen, setIsJsonDownloadModalOpen] = useState(false)
  const [selectedJsonDownloadOption, setSelectedJsonDownloadOption] =
    useState<JsonDownloadOption>('Original JSON')
  const [isCompanionModalOpen, setIsCompanionModalOpen] = useState(false)
  const [selectedCompanionUrl, setSelectedCompanionUrl] = useState(AD_QR_DESTINATION_1)
  const [profileMenuAnchorEl, setProfileMenuAnchorEl] = useState<null | HTMLElement>(null)
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false)
  const [profileName, setProfileName] = useState(DEFAULT_USER_NAME)
  const [verifiedProfileEmail] = useState(DEFAULT_USER_EMAIL)
  const [pendingProfileEmail, setPendingProfileEmail] = useState<string | null>(null)
  const [profileNameDraft, setProfileNameDraft] = useState(DEFAULT_USER_NAME)
  const [profileEmailDraft, setProfileEmailDraft] = useState(DEFAULT_USER_EMAIL)
  const [isVerifyEmailDialogOpen, setIsVerifyEmailDialogOpen] = useState(false)
  const [loginUsername, setLoginUsername] = useState('user@kerv.ai')
  const [loginPassword, setLoginPassword] = useState('SalesDemoTest')
  const [expandedPanel, setExpandedPanel] = useState<null | 'taxonomy' | 'product' | 'json'>(null)
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)
  const [videoCurrentSeconds, setVideoCurrentSeconds] = useState(DEFAULT_START_SECONDS)
  const [videoElementDuration, setVideoElementDuration] = useState(0)
  const wasVideoPlayingBeforeExpandRef = useRef(false)
  const contentVideoRef = useRef<HTMLVideoElement | null>(null)
  const playbackLoadAreaRef = useRef<HTMLDivElement | null>(null)
  const previousTitlePanelExpandedRef = useRef(isTitlePanelExpanded)

  const filteredItems = useMemo(() => {
    if (selectedCategory === 'All') return CONTENT_ITEMS
    return CONTENT_ITEMS.filter((item) => item.category === selectedCategory)
  }, [selectedCategory])

  const isSyncImpulseMode =
    selectedTier === 'Exact Product Match' && selectedAdPlayback === 'Sync: Impulse'
  const titlePanelSummary = `VOD: ${selectedTier.toUpperCase()} - ${selectedAdPlayback.toUpperCase()}`
  const effectiveProfileEmail = pendingProfileEmail ?? verifiedProfileEmail
  const isProfileEmailVerified = pendingProfileEmail === null
  const shouldShowInContentCta =
    selectedAdPlayback === 'CTA Pause' || selectedAdPlayback === 'Organic Pause'
  const playbackDurationSeconds = isSyncImpulseMode
    ? SYNC_IMPULSE_DURATION_SECONDS
    : TOTAL_DURATION_SECONDS
  const nonImpulsePanelProgress = useMemo(() => {
    if (isSyncImpulseMode) return 0
    const effectiveDuration = Math.max(1, videoElementDuration || 0)
    const elapsedSinceStart = Math.max(0, videoCurrentSeconds - DEFAULT_START_SECONDS)
    return Math.min(1, elapsedSinceStart / effectiveDuration)
  }, [isSyncImpulseMode, videoCurrentSeconds, videoElementDuration])
  const panelTimelineSeconds = isSyncImpulseMode
    ? videoCurrentSeconds
    : nonImpulsePanelProgress * TOTAL_DURATION_SECONDS
  const playbackScenes = useMemo(() => {
    if (!isSyncImpulseMode) return SCENE_METADATA
    return Array.from({ length: 12 }, (_, index) => {
      const baseScene = SCENE_METADATA[index % SCENE_METADATA.length]
      return {
        ...baseScene,
        id: `impulse-scene-${index + 1}`,
        sceneLabel: `Scene ${index + 1}`,
        start: index * 20,
        end: (index + 1) * 20,
        cta: index % 2 === 0 ? 'In-Content-CTA' : 'Scan to Shop',
        products: baseScene.products.map((product) => ({
          ...product,
          id: `${product.id}-impulse-${index + 1}`,
        })),
      }
    })
  }, [isSyncImpulseMode])
  const activeImpulseSegment = useMemo(() => {
    if (!isSyncImpulseMode) return null
    return (
      SYNC_IMPULSE_SEGMENTS.find(
        (segment) => videoCurrentSeconds >= segment.start && videoCurrentSeconds < segment.end
      ) ?? SYNC_IMPULSE_SEGMENTS[SYNC_IMPULSE_SEGMENTS.length - 1]
    )
  }, [isSyncImpulseMode, videoCurrentSeconds])
  const isAdBreakPlayback =
    isSyncImpulseMode &&
    (activeImpulseSegment?.kind === 'ad-break-1' || activeImpulseSegment?.kind === 'ad-break-2')
  const activeAdBreakImage = activeImpulseSegment?.kind === 'ad-break-1' ? AD_BREAK_1_IMAGE : AD_BREAK_2_IMAGE
  const activeAdQrDestination =
    activeImpulseSegment?.kind === 'ad-break-1' ? AD_QR_DESTINATION_1 : AD_QR_DESTINATION_2
  const activeAdQrImage = activeImpulseSegment?.kind === 'ad-break-1' ? AD_QR_IMAGE_1 : AD_QR_IMAGE_2
  const activeAdBreakLabel =
    activeImpulseSegment?.kind === 'ad-break-1' ? '_AdBreak-1 Response' : '_AdBreak-2 Response'
  const hasPlaybackEnded = videoCurrentSeconds >= playbackDurationSeconds
  const adBreakSegmentProgress = useMemo(() => {
    if (!isSyncImpulseMode || !isAdBreakPlayback || !activeImpulseSegment) return 0
    const duration = Math.max(1, activeImpulseSegment.end - activeImpulseSegment.start)
    const elapsed = videoCurrentSeconds - activeImpulseSegment.start
    return Math.min(1, Math.max(0, elapsed / duration))
  }, [isSyncImpulseMode, isAdBreakPlayback, activeImpulseSegment, videoCurrentSeconds])
  const adDecisionPayload = {
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
  const adDecisioningTail = [
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

  const openSelectorForContent = (item: ContentItem) => {
    const { id } = item
    setSelectedContentIds((prev) => {
      const exists = prev.includes(id)
      if (exists) {
        return prev
      }
      return [id]
    })
    setSelectedContent(item)
    setIsSelectorModalOpen(true)
  }

  const handleStartDemo = () => {
    if (!selectedContent) return
    setIsSelectorModalOpen(false)
    setIsVideoPlaying(false)
    setVideoCurrentSeconds(isSyncImpulseMode ? 0 : DEFAULT_START_SECONDS)
    setCurrentView('demo')
  }

  const handleLogin = () => {
    setCurrentView('selection')
  }

  const openProfileMenu = (event: ReactMouseEvent<HTMLElement>) => {
    setProfileMenuAnchorEl(event.currentTarget)
  }

  const closeProfileMenu = () => {
    setProfileMenuAnchorEl(null)
  }

  const openProfileDrawer = () => {
    closeProfileMenu()
    setProfileNameDraft(profileName)
    setProfileEmailDraft(effectiveProfileEmail)
    setIsProfileDrawerOpen(true)
  }

  const closeProfileDrawer = () => {
    setProfileNameDraft(profileName)
    setProfileEmailDraft(effectiveProfileEmail)
    setIsProfileDrawerOpen(false)
  }

  const handleSaveProfile = () => {
    const nextName = profileNameDraft.trim() || profileName
    const nextEmail = profileEmailDraft.trim() || effectiveProfileEmail
    const emailChanged = nextEmail.toLowerCase() !== verifiedProfileEmail.toLowerCase()
    setProfileName(nextName)
    setProfileNameDraft(nextName)
    if (!emailChanged) {
      setPendingProfileEmail(null)
    } else {
      setPendingProfileEmail(nextEmail)
      setIsVerifyEmailDialogOpen(true)
    }
    setProfileEmailDraft(nextEmail)
    setIsProfileDrawerOpen(false)
  }

  const handleSignOut = () => {
    closeProfileMenu()
    setIsProfileDrawerOpen(false)
    setIsVerifyEmailDialogOpen(false)
    setIsVideoPlaying(false)
    setIsSelectorModalOpen(false)
    setIsJsonDownloadModalOpen(false)
    setIsCompanionModalOpen(false)
    setExpandedPanel(null)
    setActiveDemoPanels([])
    setCurrentView('login')
  }

  const toggleDemoPanel = (panel: 'taxonomy' | 'product' | 'json') => {
    setActiveDemoPanels((prev) =>
      prev.includes(panel) ? prev.filter((value) => value !== panel) : [...prev, panel]
    )
  }

  const closeDemoPanel = (panel: 'taxonomy' | 'product' | 'json') => {
    setActiveDemoPanels((prev) => prev.filter((value) => value !== panel))
  }

  const openExpandedPanel = (panel: 'taxonomy' | 'product' | 'json') => {
    wasVideoPlayingBeforeExpandRef.current = isVideoPlaying
    setIsVideoPlaying(false)
    setExpandedPanel(panel)
  }

  const closeExpandedPanel = () => {
    setExpandedPanel(null)
    if (wasVideoPlayingBeforeExpandRef.current) {
      setIsVideoPlaying(true)
    }
  }

  const originalJsonDownloadString = useMemo(() => {
    if (isSyncImpulseMode && isAdBreakPlayback) {
      return `{
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
    }

    return JSON.stringify(
      playbackScenes.map((scene, index) => ({
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
      })),
      null,
      2
    )
  }, [
    isSyncImpulseMode,
    isAdBreakPlayback,
    activeAdBreakLabel,
    adDecisionPayload,
    adDecisioningTail,
    playbackScenes,
  ])

  const summaryJsonDownloadString = useMemo(() => {
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
        ad_breaks:
          isSyncImpulseMode
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
  }, [
    playbackScenes,
    selectedTier,
    selectedAdPlayback,
    playbackDurationSeconds,
    isSyncImpulseMode,
  ])

  const handleDownloadJson = () => {
    const content =
      selectedJsonDownloadOption === 'Original JSON'
        ? originalJsonDownloadString
        : summaryJsonDownloadString
    const fileName =
      selectedJsonDownloadOption === 'Original JSON' ? 'original-json-export.json' : 'summary-json-export.json'
    const blob = new Blob([content], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = fileName
    anchor.click()
    URL.revokeObjectURL(url)
    setIsJsonDownloadModalOpen(false)
  }

  const openCompanionModal = () => {
    setSelectedCompanionUrl(activeAdQrDestination)
    setIsCompanionModalOpen(true)
  }

  const tooltipStyles = {
    bgcolor: '#666',
    color: '#fff',
    fontSize: 14,
    lineHeight: 1.2,
    fontWeight: 500,
    borderRadius: 1,
    px: 1.25,
    py: 0.6,
    mt: 0.8,
  }

  const navButtonStyles = (isActive: boolean) => ({
    width: 36,
    height: 36,
    minWidth: 36,
    minHeight: 36,
    borderRadius: '5px',
    backgroundColor: isActive ? 'rgba(0,0,0,0.12)' : 'transparent',
    '&:hover': {
      backgroundColor: isActive ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.084)',
    },
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flex: '0 0 auto',
    transition: 'background-color 120ms ease',
  })

  const orderedPanels: Array<'taxonomy' | 'product' | 'json'> = ['taxonomy', 'product', 'json']
  const visiblePanels = orderedPanels.filter((panel) => activeDemoPanels.includes(panel))
  const visiblePanelsKey = visiblePanels.join('|')
  const playerControlSizeMode: 'large' | 'medium' | 'small' =
    visiblePanels.length >= 2 ? 'small' : visiblePanels.length === 1 ? 'medium' : 'large'
  const playerControlTokens =
    playerControlSizeMode === 'large'
      ? {
          overlayPx: 2,
          overlayPy: 1.4,
          timelineHeight: 8,
          timelineTop: 8,
          sliderContainerHeight: 24,
          thumbSize: 14,
          playIconSize: 32,
          secondaryIconSize: 24,
          controlButtonPadding: 0.4,
          timeFontSize: 14,
          timeWidth: 96,
          controlBarHeight: 56,
        }
      : playerControlSizeMode === 'medium'
        ? {
            overlayPx: 1.5,
            overlayPy: 1.15,
            timelineHeight: 10,
            timelineTop: 8,
            sliderContainerHeight: 26,
            thumbSize: 16,
            playIconSize: 30,
            secondaryIconSize: 24,
            controlButtonPadding: 0.45,
            timeFontSize: 13,
            timeWidth: 92,
            controlBarHeight: 54,
          }
        : {
            overlayPx: 1.2,
            overlayPy: 1,
            timelineHeight: 11,
            timelineTop: 7.5,
            sliderContainerHeight: 28,
            thumbSize: 18,
            playIconSize: 28,
            secondaryIconSize: 24,
            controlButtonPadding: 0.5,
            timeFontSize: 12,
            timeWidth: 86,
            controlBarHeight: 52,
          }

  const activeSceneIndex = useMemo(() => {
    const foundIndex = playbackScenes.findIndex(
      (scene) => panelTimelineSeconds >= scene.start && panelTimelineSeconds < scene.end
    )
    if (foundIndex >= 0) return foundIndex
    return playbackScenes.length - 1
  }, [playbackScenes, panelTimelineSeconds])

  const activeScene = playbackScenes[activeSceneIndex]
  const productEntries = useMemo(
    () =>
      playbackScenes.flatMap((scene) =>
        scene.products.map((product) => ({
          ...product,
          sceneId: scene.id,
          sceneLabel: scene.sceneLabel,
          sceneStart: scene.start,
        }))
      ),
    [playbackScenes]
  )
  const activeProductIndex = useMemo(() => {
    const firstMatch = productEntries.findIndex((entry) => entry.sceneId === activeScene.id)
    return firstMatch >= 0 ? firstMatch : 0
  }, [activeScene.id, productEntries])

  const taxonomyRefs = useRef<Array<HTMLDivElement | null>>([])
  const productRefs = useRef<Array<HTMLDivElement | null>>([])
  const jsonRefs = useRef<Array<HTMLDivElement | null>>([])
  const taxonomyScrollContainerRef = useRef<HTMLDivElement | null>(null)
  const productScrollContainerRef = useRef<HTMLDivElement | null>(null)
  const jsonScrollContainerRef = useRef<HTMLDivElement | null>(null)
  const panelScrollTargetsRef = useRef({ taxonomy: 0, product: 0, json: 0 })
  const panelScrollRafRef = useRef<number | null>(null)

  useEffect(() => {
    if (currentView !== 'demo' || isVideoPlaying) return
    const frame = window.requestAnimationFrame(() => {
      taxonomyRefs.current[activeSceneIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [activeSceneIndex, currentView, visiblePanelsKey, isVideoPlaying])

  useEffect(() => {
    if (currentView !== 'demo' || isVideoPlaying) return
    const frame = window.requestAnimationFrame(() => {
      productRefs.current[activeProductIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [activeProductIndex, currentView, visiblePanelsKey, isVideoPlaying])

  useEffect(() => {
    if (currentView !== 'demo' || !isVideoPlaying) return
    const progress = isSyncImpulseMode
      ? Math.min(1, videoCurrentSeconds / playbackDurationSeconds)
      : nonImpulsePanelProgress

    if (visiblePanels.includes('taxonomy')) {
      const taxonomyContainer = taxonomyScrollContainerRef.current
      if (taxonomyContainer) {
        const maxScroll = taxonomyContainer.scrollHeight - taxonomyContainer.clientHeight
        if (maxScroll > 0) panelScrollTargetsRef.current.taxonomy = maxScroll * progress
      }
    }

    if (visiblePanels.includes('product')) {
      const productContainer = productScrollContainerRef.current
      if (productContainer) {
        const maxScroll = productContainer.scrollHeight - productContainer.clientHeight
        if (maxScroll > 0) panelScrollTargetsRef.current.product = maxScroll * progress
      }
    }
  }, [
    currentView,
    isVideoPlaying,
    videoCurrentSeconds,
    playbackDurationSeconds,
    visiblePanelsKey,
    isSyncImpulseMode,
    nonImpulsePanelProgress,
  ])

  useEffect(() => {
    if (currentView !== 'demo' || !isVideoPlaying || !visiblePanels.includes('json')) return
    const container = jsonScrollContainerRef.current
    if (!container) return
    const maxScroll = container.scrollHeight - container.clientHeight
    if (maxScroll <= 0) return
    const progress =
      isSyncImpulseMode && isAdBreakPlayback
        ? adBreakSegmentProgress
        : isSyncImpulseMode
          ? Math.min(1, (videoCurrentSeconds / playbackDurationSeconds) * 2)
          : nonImpulsePanelProgress
    panelScrollTargetsRef.current.json = maxScroll * progress
  }, [
    currentView,
    isVideoPlaying,
    videoCurrentSeconds,
    playbackDurationSeconds,
    visiblePanelsKey,
    isSyncImpulseMode,
    isAdBreakPlayback,
    adBreakSegmentProgress,
    nonImpulsePanelProgress,
  ])

  useEffect(() => {
    if (currentView !== 'demo' || !isVideoPlaying) return

    const animatePanelScrolls = () => {
      const smoothFactor = 0.2

      if (visiblePanels.includes('taxonomy') && taxonomyScrollContainerRef.current) {
        const el = taxonomyScrollContainerRef.current
        el.scrollTop += (panelScrollTargetsRef.current.taxonomy - el.scrollTop) * smoothFactor
      }
      if (visiblePanels.includes('product') && productScrollContainerRef.current) {
        const el = productScrollContainerRef.current
        el.scrollTop += (panelScrollTargetsRef.current.product - el.scrollTop) * smoothFactor
      }
      if (visiblePanels.includes('json') && jsonScrollContainerRef.current) {
        const el = jsonScrollContainerRef.current
        el.scrollTop += (panelScrollTargetsRef.current.json - el.scrollTop) * smoothFactor
      }

      panelScrollRafRef.current = window.requestAnimationFrame(animatePanelScrolls)
    }

    panelScrollRafRef.current = window.requestAnimationFrame(animatePanelScrolls)
    return () => {
      if (panelScrollRafRef.current !== null) {
        window.cancelAnimationFrame(panelScrollRafRef.current)
        panelScrollRafRef.current = null
      }
    }
  }, [currentView, isVideoPlaying, visiblePanelsKey])

  const panelPaperStyles = {
    borderRadius: 0,
    overflow: 'hidden',
    border: '0.73px solid rgba(0,0,0,0.22)',
    backgroundColor: '#fff',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 0,
    boxShadow: 'none',
  }

  const panelHeaderIconButtonStyles = {
    width: 26,
    height: 26,
    p: 0,
    color: '#ED005E',
    '&:hover': { bgcolor: 'rgba(237,0,94,0.08)' },
  }
  const panelHeaderIconButtonDarkStyles = {
    ...panelHeaderIconButtonStyles,
    color: '#ffffff',
    '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' },
  }
  const panelHeaderActionIconSx = { fontSize: 14 }
  const dropdownMagentaStyles = {
    '& .MuiInputLabel-root.Mui-focused': {
      color: '#ED005E',
    },
    '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderColor: '#ED005E',
      borderWidth: '2px',
    },
    '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
      borderColor: 'rgba(237,0,94,0.6)',
    },
  }

  useEffect(() => {
    if (!isVideoPlaying || currentView !== 'demo' || hasPlaybackEnded) return
    const timer = window.setTimeout(() => {
      setVideoCurrentSeconds((prev) => Math.min(prev + 0.1, playbackDurationSeconds))
    }, 100)
    return () => window.clearTimeout(timer)
  }, [isVideoPlaying, currentView, hasPlaybackEnded, playbackDurationSeconds, videoCurrentSeconds])

  useEffect(() => {
    setVideoCurrentSeconds((prev) => Math.min(prev, playbackDurationSeconds))
  }, [playbackDurationSeconds])

  useEffect(() => {
    const wasExpanded = previousTitlePanelExpandedRef.current
    previousTitlePanelExpandedRef.current = isTitlePanelExpanded
    if (currentView !== 'demo' || isTitlePanelExpanded || !wasExpanded) return
    if (
      window.innerWidth > DEFAULT_MACBOOK_VIEWPORT_MAX_WIDTH ||
      window.innerHeight > DEFAULT_MACBOOK_VIEWPORT_MAX_HEIGHT
    ) {
      return
    }
    const target = playbackLoadAreaRef.current
    if (!target) return
    const frame = window.requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [currentView, isTitlePanelExpanded])

  useEffect(() => {
    if (currentView !== 'demo') return
    const videoEl = contentVideoRef.current
    if (!videoEl) return

    if (isAdBreakPlayback || !isVideoPlaying || hasPlaybackEnded) {
      videoEl.pause()
      return
    }

    const playPromise = videoEl.play()
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {})
    }
  }, [currentView, isAdBreakPlayback, isVideoPlaying, hasPlaybackEnded])

  useEffect(() => {
    if (currentView !== 'demo' || isAdBreakPlayback) return
    const videoEl = contentVideoRef.current
    if (!videoEl) return

    const duration = videoElementDuration || videoEl.duration || 0
    if (!duration || Number.isNaN(duration)) return
    const targetTime = videoCurrentSeconds % duration
    if (Math.abs(videoEl.currentTime - targetTime) > 0.6) {
      videoEl.currentTime = targetTime
    }
  }, [currentView, isAdBreakPlayback, videoCurrentSeconds, videoElementDuration])

  const formatTime = (seconds: number) => {
    const wholeSeconds = Math.max(0, Math.floor(seconds))
    const minutes = Math.floor(wholeSeconds / 60)
    const remainder = wholeSeconds % 60
    return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
  }

  const getTaxonomySceneData = (scene: SceneMetadata, index: number, taxonomy: TaxonomyOption) => {
    const iabValues = ['Home & Garden', 'Food & Drink', 'Entertainment', 'Travel', 'Retail', 'Family']
    const locationValues = ['Kitchen', 'Dining Room', 'Retail Floor', 'Living Room', 'Studio Set', 'Outdoor Patio']
    const sentimentValues = ['Positive', 'Neutral Positive', 'Optimistic', 'Curious', 'Comforting', 'Elevated']
    const brandSafetyValues = ['Low Risk', 'Suitable', 'Context Safe', 'No Sensitive Content', 'Family Safe', 'Advertiser Friendly']
    const faceValues = ['3 primary faces', '2 primary faces', '1 featured face', '4 background faces', '2 speaking faces', 'Group crowd']
    const objectValues = ['Cookware, counter, produce', 'Tabletop, decor, chair', 'Packaging, product display', 'Sofa, lamp, shelf', 'Wardrobe, accessories', 'Glassware, utensils']

    switch (taxonomy) {
      case 'IAB':
        return {
          headline: iabValues[index % iabValues.length],
          chip: `${0.78 + index * 0.02 > 0.96 ? 0.96 : 0.78 + index * 0.02}`,
          sections: [
            { label: 'Primary Category:', value: iabValues[index % iabValues.length] },
            { label: 'Considered:', value: 'Retail, Lifestyle, Entertainment' },
            { label: 'Reasoning:', value: `Scene cues and on-screen context align most closely with the ${iabValues[index % iabValues.length]} taxonomy bucket.` },
            { label: 'Text Data:', value: scene.textData },
            { label: 'Confidence:', value: `${(0.78 + index * 0.02 > 0.96 ? 0.96 : 0.78 + index * 0.02).toFixed(2)}` },
          ],
        }
      case 'Location':
        return {
          headline: locationValues[index % locationValues.length],
          chip: `${(0.73 + index * 0.03 > 0.94 ? 0.94 : 0.73 + index * 0.03).toFixed(2)}`,
          sections: [
            { label: 'Detected Location:', value: locationValues[index % locationValues.length] },
            { label: 'Considered:', value: 'Interior, Domestic Space, Branded Environment' },
            { label: 'Reasoning:', value: 'Foreground objects, layout, and scene composition indicate a consistent location classification.' },
            { label: 'Text Data:', value: scene.textData },
            { label: 'Confidence:', value: `${(0.73 + index * 0.03 > 0.94 ? 0.94 : 0.73 + index * 0.03).toFixed(2)}` },
          ],
        }
      case 'Sentiment':
        return {
          headline: sentimentValues[index % sentimentValues.length],
          chip: `${(0.75 + index * 0.025 > 0.95 ? 0.95 : 0.75 + index * 0.025).toFixed(2)}`,
          sections: [
            { label: 'Sentiment:', value: sentimentValues[index % sentimentValues.length] },
            { label: 'Considered:', value: 'Uplifting, Calm, Motivational' },
            { label: 'Reasoning:', value: 'Visual pacing, framing, and tone suggest a stable sentiment signal across the scene.' },
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
            { label: 'Reasoning:', value: 'No sensitive visual or verbal cues are present, keeping the scene advertiser-safe.' },
            { label: 'Text Data:', value: scene.textData },
            { label: 'Confidence:', value: `${(0.84 + index * 0.015 > 0.97 ? 0.97 : 0.84 + index * 0.015).toFixed(2)}` },
          ],
        }
      case 'Faces':
        return {
          headline: faceValues[index % faceValues.length],
          chip: `${(0.71 + index * 0.03 > 0.93 ? 0.93 : 0.71 + index * 0.03).toFixed(2)}`,
          sections: [
            { label: 'Face Detection:', value: faceValues[index % faceValues.length] },
            { label: 'Considered:', value: 'Primary cast, background cast, speaking roles' },
            { label: 'Reasoning:', value: 'Detected faces and shot composition indicate the listed visible subject count and prominence.' },
            { label: 'Text Data:', value: scene.textData },
            { label: 'Confidence:', value: `${(0.71 + index * 0.03 > 0.93 ? 0.93 : 0.71 + index * 0.03).toFixed(2)}` },
          ],
        }
      case 'Object':
        return {
          headline: objectValues[index % objectValues.length],
          chip: `${(0.74 + index * 0.025 > 0.95 ? 0.95 : 0.74 + index * 0.025).toFixed(2)}`,
          sections: [
            { label: 'Objects:', value: objectValues[index % objectValues.length] },
            { label: 'Considered:', value: 'Furniture, product, decor, utility items' },
            { label: 'Reasoning:', value: 'The object group reflects the most persistent physical items visible in the scene.' },
            { label: 'Text Data:', value: scene.textData },
            { label: 'Confidence:', value: `${(0.74 + index * 0.025 > 0.95 ? 0.95 : 0.74 + index * 0.025).toFixed(2)}` },
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

  const renderExpandedPanelContent = () => {
    if (expandedPanel === 'taxonomy') {
      return (
        <Box sx={{ px: 2.5, py: 2, height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <Box sx={{ px: 0.5, pb: 1.25 }}>
            <FormControl fullWidth size="small" sx={dropdownMagentaStyles}>
              <InputLabel id="taxonomy-playback-mode-label-expanded">Taxonomies</InputLabel>
              <Select
                labelId="taxonomy-playback-mode-label-expanded"
                value={selectedTaxonomy}
                label="Taxonomies"
                onChange={(event) => setSelectedTaxonomy(event.target.value as TaxonomyOption)}
                sx={{ height: 40 }}
              >
                {taxonomyOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', pr: 1 }}>
            <Stack spacing={0.9}>
              {playbackScenes.map((scene, index) => {
                const taxonomyData = getTaxonomySceneData(scene, index, selectedTaxonomy)
                return (
                <Box key={`expanded-${scene.id}`} sx={{ p: 1.1 }}>
                  <Typography sx={{ fontSize: 28, color: '#A1A1A1', lineHeight: 1, mb: 0.35, opacity: 0.95 }}>
                    {scene.sceneLabel}
                  </Typography>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, opacity: 0.87 }}>{selectedTaxonomy}</Typography>
                  <Chip
                    label={`${taxonomyData.headline} (${taxonomyData.chip})`}
                    size="small"
                    sx={{ height: 25.27, borderRadius: '104.48px', mt: 0.4, mb: 0.8, fontSize: 11.5 }}
                  />
                  {taxonomyData.sections.map((section) => (
                    <Box key={`${scene.id}-${selectedTaxonomy}-${section.label}`}>
                      <Typography sx={{ fontSize: 12, fontWeight: 700, opacity: 0.87 }}>{section.label}</Typography>
                      <Typography sx={{ fontSize: 12, mb: 0.7, lineHeight: 1.35, opacity: 0.87 }}>
                        {section.value}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )})}
            </Stack>
          </Box>
        </Box>
      )
    }

    if (expandedPanel === 'product') {
      return (
        <Box sx={{ px: 2, py: 1.25, height: '100%', overflowY: 'auto' }}>
          {productEntries.map((entry) => (
            <Box key={`expanded-${entry.id}`} sx={{ px: 0.9, py: 1.2, borderBottom: '1px solid #e6e6e6' }}>
              <Stack direction="row" spacing={1.2}>
                <Box
                  component="img"
                  src={entry.image}
                  alt={entry.name}
                  sx={{ width: 64, height: 64, borderRadius: 0.5, objectFit: 'cover', flexShrink: 0 }}
                />
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 600, fontSize: 17, lineHeight: 1.1 }}>{entry.name}</Typography>
                  <Typography
                    sx={{
                      color: '#666',
                      fontSize: 12.5,
                      mt: 0.2,
                      lineHeight: 1.3,
                      opacity: 0.87,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {entry.description}
                  </Typography>
                  <Typography sx={{ color: '#A1A1A1', fontSize: 11, mt: 0.25 }}>
                    {entry.sceneLabel} · {formatTime(entry.sceneStart)}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          ))}
        </Box>
      )
    }

    return (
      <Box sx={{ px: 1.6, pt: 1.2, pb: 1.4, height: '100%', overflowY: 'auto', backgroundColor: '#303841' }}>
        {isSyncImpulseMode && isAdBreakPlayback ? (
          <Box sx={{ p: 0.85 }}>
            <Typography sx={{ fontSize: 11, color: '#d4deea', mb: 0.5 }}>
              {activeScene.sceneLabel} @ {formatTime(videoCurrentSeconds)}
            </Typography>
            <Typography
              component="pre"
              sx={{
                m: 0,
                mb: 0.4,
                whiteSpace: 'pre-wrap',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontSize: 10.4,
                lineHeight: 1.45,
                color: '#f3f7fd',
              }}
            >
              {`{
  "${activeAdBreakLabel}"
}
`}
            </Typography>
            <Typography
              component="pre"
              sx={{
                m: 0,
                whiteSpace: 'pre-wrap',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontSize: 10.4,
                lineHeight: 1.45,
                color: '#F05BB8',
              }}
            >
              {`${JSON.stringify(adDecisionPayload, null, 2)}

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
        },`}
            </Typography>
          </Box>
        ) : (
          <Stack spacing={0.9}>
            {playbackScenes.map((scene, index) => {
              const payload = {
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
              return (
                <Box key={`expanded-${scene.id}`} sx={{ p: 0.85 }}>
                  <Typography sx={{ fontSize: 11, color: '#d4deea', mb: 0.4 }}>
                    {scene.sceneLabel} @ {formatTime(scene.start)}
                  </Typography>
                  <Typography
                    component="pre"
                    sx={{
                      m: 0,
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                      fontSize: 10.4,
                      lineHeight: 1.4,
                      color: '#f3f7fd',
                    }}
                  >
                    {JSON.stringify(payload, null, 2)}
                  </Typography>
                </Box>
              )
            })}
          </Stack>
        )}
      </Box>
    )
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background:
          'linear-gradient(125deg, #f6f6f6 5%, #e9ebf7 20%, #f6f6f6 42%, #ffe8f0 58%, #e9ebf7 77%, #f6f6f6 100%)',
        py: 2,
      }}
    >
      <Container maxWidth={false} sx={{ width: 1440, maxWidth: '100%', px: 3 }}>
        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, bgcolor: 'transparent' }}>
          {currentView === 'login' ? (
            <Paper
              sx={{
                width: 'min(100%, 1280px)',
                height: 'min(82vh, 760px)',
                mx: 'auto',
                borderRadius: 2,
                overflow: 'hidden',
                border: '1px solid rgba(0,0,0,0.08)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
              }}
            >
              <Box sx={{ p: { xs: 4, md: 6 }, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 4.5 }}>
                  <Box component="img" src="/assets/kerv-logo.svg" alt="Kerv logo" sx={{ width: 40, height: 40 }} />
                  <Typography color="text.primary" sx={{ fontWeight: 500, fontSize: 34, lineHeight: 1, opacity: 0.87 }}>
                    | Sales Demo Tool
                  </Typography>
                </Stack>

                <Typography sx={{ fontSize: { xs: 42, md: 50 }, lineHeight: 1.2, color: 'rgba(0,0,0,0.87)', mb: 6 }}>
                  Welcome back!
                  <br />
                  Log in to your account.
                </Typography>

                <Box sx={{ width: 'min(100%, 420px)' }}>
                  <Typography sx={{ fontWeight: 600, fontSize: 36, color: 'rgba(0,0,0,0.87)', mb: 2.5 }}>
                    Log in
                  </Typography>
                  <Stack spacing={1.4}>
                    <TextField
                      size="small"
                      value={loginUsername}
                      onChange={(event) => setLoginUsername(event.target.value)}
                      placeholder="Email"
                      fullWidth
                    />
                    <TextField
                      size="small"
                      value={loginPassword}
                      onChange={(event) => setLoginPassword(event.target.value)}
                      placeholder="Password"
                      type="password"
                      fullWidth
                    />
                    <Button
                      variant="contained"
                      onClick={handleLogin}
                      sx={{ mt: 1.2, bgcolor: '#ED005E', '&:hover': { bgcolor: '#cf0052' }, height: 42, fontWeight: 600 }}
                    >
                      LOG IN
                    </Button>
                    <Button
                      variant="text"
                      sx={{ mt: 0.2, color: '#A0245D', p: 0, justifyContent: 'flex-start', width: 'fit-content', fontWeight: 700 }}
                    >
                      FORGOT YOUR PASSWORD?
                    </Button>
                  </Stack>
                </Box>
              </Box>
              <Box sx={{ bgcolor: '#ED005E' }} />
            </Paper>
          ) : (
            <>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Box
                    role="button"
                    component="img"
                    src="/assets/kerv-logo.svg"
                    alt="Kerv logo"
                    sx={{ width: 40, height: 40, cursor: 'pointer' }}
                  />
                  <Typography
                    color="text.primary"
                    sx={{ fontWeight: 500, fontSize: 22, lineHeight: '32px', opacity: 0.87 }}
                  >
                    | Sales Demo Tool
                  </Typography>
                </Stack>

                <IconButton sx={{ color: '#ED005E' }} onClick={openProfileMenu}>
                  <PersonIcon />
                </IconButton>
              </Stack>

              <Menu
                anchorEl={profileMenuAnchorEl}
                open={Boolean(profileMenuAnchorEl)}
                onClose={closeProfileMenu}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                slotProps={{
                  paper: {
                    sx: {
                      minWidth: 160,
                      borderRadius: 1.1,
                      mt: 0.8,
                    },
                  },
                }}
              >
                <MenuItem onClick={openProfileDrawer} sx={{ fontSize: 14 }}>
                  Profile
                </MenuItem>
                <MenuItem onClick={handleSignOut} sx={{ fontSize: 14, color: '#9A1B52' }}>
                  Sign Out
                </MenuItem>
              </Menu>

              {currentView === 'selection' ? (
            <Stack spacing={2}>
              <Paper
                sx={{
                  p: 2,
                  borderRadius: 3,
                  border: '1px solid rgba(0,0,0,0.08)',
                  backgroundColor: 'rgba(255,255,255,0.5)',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.05)',
                }}
              >
                <Stack spacing={2}>
                  <Typography variant="h4" color="text.primary" sx={{ fontSize: 44 }}>
                    Content Selection
                  </Typography>

                  <FormControl sx={{ width: 240, ...dropdownMagentaStyles }} size="small">
                    <InputLabel id="category-label">Content Category</InputLabel>
                    <Select
                      labelId="category-label"
                      value={selectedCategory}
                      label="Content Category"
                      onChange={(event) => {
                        const category = event.target.value as ContentCategory
                        setSelectedCategory(category)
                      }}
                    >
                      {categories.map((category) => (
                        <MenuItem key={category} value={category}>
                          {category}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Stack>
              </Paper>

              <Paper
                sx={{
                  p: 4,
                  minHeight: 520,
                  borderRadius: 3,
                  border: '1px solid rgba(0,0,0,0.08)',
                  backgroundColor: 'rgba(255,255,255,0.5)',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.05)',
                }}
              >
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(156px, 1fr))',
                    gap: 2,
                    alignItems: 'start',
                    maxWidth: selectedCategory === 'All' ? '100%' : 380,
                  }}
                >
                  {filteredItems.map((item) => {
                    const selected = selectedContentIds.includes(item.id)

                    return (
                      <Box
                        key={item.id}
                        role="button"
                        onClick={() => openSelectorForContent(item)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <Box
                          sx={{
                            height: 156,
                            borderRadius: 2,
                            backgroundImage: `url(${item.posterUrl})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            border: selected ? '3px solid #ed005e' : '1px solid rgba(0,0,0,0.1)',
                            boxShadow: selected ? '0 0 0 3px rgba(237, 0, 94, 0.15)' : 'none',
                          }}
                        />
                        <Typography
                          mt={0.5}
                          variant="body2"
                          sx={{
                            fontWeight: selected ? 700 : 500,
                            color: 'rgba(0,0,0,0.87)',
                            lineHeight: 1.3,
                          }}
                        >
                          {item.title}
                        </Typography>
                      </Box>
                    )
                  })}
                </Box>
              </Paper>
            </Stack>
          ) : (
            <Stack spacing={2}>
              <Paper
                sx={{
                  p: 2,
                  borderRadius: 3,
                  border: '1px solid rgba(0,0,0,0.08)',
                  backgroundColor: 'rgba(255,255,255,0.5)',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.05)',
                }}
              >
                <Stack spacing={isTitlePanelExpanded ? 1.75 : 0}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Stack direction="row" alignItems="center" spacing={0.8}>
                      <Button
                        variant="text"
                        startIcon={<ArrowBackIcon />}
                        onClick={() => {
                          setIsVideoPlaying(false)
                          setCurrentView('selection')
                        }}
                        sx={{ color: '#ED005E', width: 'fit-content', p: 0 }}
                      >
                        Back to Content Selection
                      </Button>
                      <Typography sx={{ color: 'rgba(0,0,0,0.38)' }}>|</Typography>
                      <Typography sx={{ color: 'rgba(0,0,0,0.87)', fontWeight: 500, letterSpacing: 0.2 }}>
                        {titlePanelSummary}
                      </Typography>
                    </Stack>
                    <IconButton
                      size="small"
                      onClick={() => setIsTitlePanelExpanded((prev) => !prev)}
                      sx={{ color: 'rgba(0,0,0,0.56)' }}
                    >
                      {isTitlePanelExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  </Stack>

                  {isTitlePanelExpanded && (
                    <Stack direction="row" spacing={2} sx={{ maxWidth: 636 }}>
                      <FormControl fullWidth size="small" sx={dropdownMagentaStyles}>
                        <InputLabel id="tier-page-select-label">Tier Selection</InputLabel>
                        <Select
                          labelId="tier-page-select-label"
                          value={selectedTier}
                          label="Tier Selection"
                          onChange={(event) => setSelectedTier(event.target.value as TierOption)}
                        >
                          {tierOptions.map((option) => (
                            <MenuItem key={option} value={option}>
                              {option}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      <FormControl fullWidth size="small" sx={dropdownMagentaStyles}>
                        <InputLabel id="ad-page-select-label">Ad Playback Mode</InputLabel>
                        <Select
                          labelId="ad-page-select-label"
                          value={selectedAdPlayback}
                          label="Ad Playback Mode"
                          onChange={(event) =>
                            setSelectedAdPlayback(event.target.value as AdPlaybackOption)
                          }
                        >
                          {adPlaybackOptions.map((option) => (
                            <MenuItem key={option} value={option}>
                              {option}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Stack>
                  )}
                </Stack>
              </Paper>

              <Paper
                ref={playbackLoadAreaRef}
                sx={{
                  p: 3,
                  minHeight: 650,
                  borderRadius: 3,
                  border: '1px solid rgba(0,0,0,0.08)',
                  backgroundColor: 'rgba(255,255,255,0.5)',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.05)',
                }}
              >
                <Stack spacing={2.5}>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns:
                        visiblePanels.length === 0
                          ? 'minmax(0, 1fr)'
                          : `minmax(0, 1fr) ${visiblePanels.map(() => '324px').join(' ')}`,
                      height: 549,
                      gap: 1,
                      alignItems: 'stretch',
                    }}
                  >
                    <Box
                      sx={{
                        minWidth: 0,
                        display: 'flex',
                        justifyContent: visiblePanels.length === 0 ? 'center' : 'flex-start',
                        alignSelf: 'start',
                      }}
                    >
                      <Box
                        sx={{
                          width:
                            visiblePanels.length <= 1 ? 'min(100%, 976px)' : '100%',
                          maxWidth: '100%',
                          height: 'auto',
                          aspectRatio: '16 / 9',
                          alignSelf: 'start',
                          position: 'relative',
                          borderRadius: 1,
                          overflow: 'hidden',
                          bgcolor: '#00152A',
                          boxShadow: '0 6px 14px rgba(0,0,0,0.2)',
                        }}
                      >
                        <Box
                          sx={{
                            position: 'absolute',
                            inset: 0,
                            backgroundColor: '#1a1a1a',
                            backgroundImage: `url(${activeAdBreakImage})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            opacity: isAdBreakPlayback ? 1 : 0,
                            transition: 'opacity 320ms ease-in-out',
                          }}
                        />
                        <Box sx={{ position: 'absolute', inset: 0, opacity: isAdBreakPlayback ? 0 : 1, transition: 'opacity 320ms ease-in-out' }}>
                          <Box
                            component="video"
                            ref={contentVideoRef}
                            src={PLACEHOLDER_VIDEO_URL}
                            muted
                            playsInline
                            preload="metadata"
                            onLoadedMetadata={(event) => {
                              const duration = event.currentTarget.duration
                              if (!Number.isNaN(duration)) {
                                setVideoElementDuration(duration)
                              }
                            }}
                            sx={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              display: 'block',
                              backgroundColor: '#1a1a1a',
                            }}
                          />
                          <Box
                            sx={{
                              position: 'absolute',
                              inset: 0,
                              backgroundColor: isSyncImpulseMode ? 'rgba(255,0,40,0.14)' : 'rgba(0,0,0,0.3)',
                              pointerEvents: 'none',
                            }}
                          />
                        </Box>
                        {isSyncImpulseMode && (
                          <Box
                            sx={{
                              position: 'absolute',
                              inset: 0,
                              pointerEvents: 'none',
                              background:
                                'radial-gradient(circle at 18% 35%, rgba(0,255,255,0.12), transparent 36%), radial-gradient(circle at 80% 20%, rgba(255,40,90,0.16), transparent 34%), radial-gradient(circle at 65% 78%, rgba(255,80,120,0.14), transparent 40%)',
                              mixBlendMode: 'screen',
                              opacity: isAdBreakPlayback ? 0 : 1,
                              transition: 'opacity 320ms ease-in-out',
                            }}
                          />
                        )}
                        {isSyncImpulseMode && isAdBreakPlayback && (
                          <Box
                            role="button"
                            aria-label="Open companion experience"
                            onClick={openCompanionModal}
                            sx={{
                              position: 'absolute',
                              left: '83.9%',
                              transform: 'translateX(-50%)',
                              bottom: '8.9%',
                              width: '19.1%',
                              aspectRatio: '1 / 1',
                              cursor: 'pointer',
                              zIndex: 4,
                              borderRadius: 0.5,
                              overflow: 'hidden',
                              backgroundColor: '#fff',
                              p: '0.1%',
                              boxSizing: 'border-box',
                              '&:hover': { opacity: 0.92 },
                            }}
                          >
                            <Box
                              component="img"
                              src={activeAdQrImage}
                              alt="Ad QR code"
                              sx={{ width: '100%', height: '100%', display: 'block', backgroundColor: '#fff' }}
                            />
                          </Box>
                        )}

                        {shouldShowInContentCta && (
                          <Box
                            sx={{
                              position: 'absolute',
                              right: '35px',
                              bottom: `${playerControlTokens.controlBarHeight + 10}px`,
                              px: 2.25,
                              py: 1.1,
                              borderRadius: 0.75,
                              bgcolor: 'rgba(255,255,255,0.92)',
                            }}
                          >
                            <Typography sx={{ fontSize: 15, fontWeight: 500, color: '#1d1d1d' }}>
                              {activeScene.cta}
                            </Typography>
                          </Box>
                        )}

                        <Box
                          sx={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            bottom: 0,
                            px: playerControlTokens.overlayPx,
                            py: playerControlTokens.overlayPy,
                            background: 'linear-gradient(0deg, rgba(0,0,0,0.4), rgba(0,0,0,0.15))',
                          }}
                        >
                          <Stack direction="row" alignItems="center" spacing={1.4}>
                            <IconButton
                              onClick={() => setIsVideoPlaying((prev) => !prev)}
                              sx={{ color: '#fff', p: playerControlTokens.controlButtonPadding }}
                            >
                              {isVideoPlaying ? (
                                <PauseRoundedIcon sx={{ fontSize: playerControlTokens.playIconSize }} />
                              ) : (
                                <PlayArrowRoundedIcon sx={{ fontSize: playerControlTokens.playIconSize }} />
                              )}
                            </IconButton>
                            <Typography
                              sx={{
                                color: '#fff',
                                fontSize: playerControlTokens.timeFontSize,
                                width: playerControlTokens.timeWidth,
                              }}
                            >
                              {formatTime(videoCurrentSeconds)} / {formatTime(playbackDurationSeconds)}
                            </Typography>

                            <Box
                              sx={{
                                flex: 1,
                                position: 'relative',
                                height: playerControlTokens.sliderContainerHeight,
                              }}
                            >
                              {isSyncImpulseMode ? (
                                <>
                                  <Box
                                    sx={{
                                      position: 'absolute',
                                      top: playerControlTokens.timelineTop,
                                      left: 0,
                                      right: 0,
                                      height: playerControlTokens.timelineHeight,
                                      bgcolor: '#404040',
                                    }}
                                  />
                                  {SYNC_IMPULSE_SEGMENTS.map((segment, idx) => (
                                    <Box
                                      key={`${segment.kind}-${idx}`}
                                      sx={{
                                        position: 'absolute',
                                        top: playerControlTokens.timelineTop,
                                        left: `${(segment.start / playbackDurationSeconds) * 100}%`,
                                        width: `${((segment.end - segment.start) / playbackDurationSeconds) * 100}%`,
                                        height: playerControlTokens.timelineHeight,
                                        bgcolor: segment.kind === 'content' ? '#D7283B' : '#18D1E5',
                                      }}
                                    />
                                  ))}
                                </>
                              ) : (
                                <>
                                  <Box
                                    sx={{
                                      position: 'absolute',
                                      top: playerControlTokens.timelineTop,
                                      left: 0,
                                      right: 0,
                                      height: playerControlTokens.timelineHeight,
                                      bgcolor: '#404040',
                                    }}
                                  />
                                  <Box
                                    sx={{
                                      position: 'absolute',
                                      top: playerControlTokens.timelineTop,
                                      left: 0,
                                      height: playerControlTokens.timelineHeight,
                                      width: `${(videoCurrentSeconds / playbackDurationSeconds) * 100}%`,
                                      bgcolor: '#1a9ee9',
                                    }}
                                  />
                                </>
                              )}
                              <Slider
                                min={0}
                                max={playbackDurationSeconds}
                                value={videoCurrentSeconds}
                                onChange={(_, value) =>
                                  setVideoCurrentSeconds(Array.isArray(value) ? value[0] : value)
                                }
                                sx={{
                                  position: 'absolute',
                                  left: 0,
                                  right: 0,
                                  top: playerControlTokens.timelineTop,
                                  height: playerControlTokens.timelineHeight,
                                  p: 0,
                                  color: '#1a9ee9',
                                  '& .MuiSlider-rail': { opacity: 0 },
                                  '& .MuiSlider-track': { opacity: 0 },
                                  '& .MuiSlider-thumb': {
                                    width: playerControlTokens.thumbSize,
                                    height: playerControlTokens.thumbSize,
                                    top: '50%',
                                    bgcolor: '#1a9ee9',
                                    border: 'none',
                                    boxShadow: 'none',
                                    '&:hover, &.Mui-focusVisible': { boxShadow: 'none' },
                                  },
                                }}
                              />
                            </Box>

                            <IconButton sx={{ color: '#fff', p: playerControlTokens.controlButtonPadding }}>
                              <VolumeUpRoundedIcon sx={{ fontSize: playerControlTokens.secondaryIconSize }} />
                            </IconButton>
                          </Stack>
                        </Box>
                      </Box>
                    </Box>

                    {visiblePanels.includes('taxonomy') && (
                      <Paper
                        elevation={0}
                        sx={{ ...panelPaperStyles, height: visiblePanels.length === 1 ? 549 : '100%' }}
                      >
                        <Stack
                          direction="row"
                          alignItems="center"
                          justifyContent="space-between"
                          sx={{ px: 1, py: 0.75, borderBottom: '0.73px solid rgba(0,0,0,0.18)' }}
                        >
                          <Stack direction="row" alignItems="center" spacing={0.8}>
                            <Box
                              component="img"
                              src="/assets/elements/taxo-btn.svg"
                              alt=""
                              aria-hidden
                              sx={{ width: 16, height: 16, opacity: 0.8 }}
                            />
                            <Typography sx={{ fontWeight: 500, fontSize: 16, lineHeight: 1.1 }}>
                              Taxonomies
                            </Typography>
                          </Stack>
                          <Stack direction="row" spacing={0.25}>
                            <IconButton
                              size="small"
                              sx={panelHeaderIconButtonStyles}
                              onClick={() => openExpandedPanel('taxonomy')}
                            >
                              <PanelGlyph variant="expand" color="#ED005E" />
                            </IconButton>
                            <IconButton
                              size="small"
                              sx={panelHeaderIconButtonStyles}
                              onClick={() => closeDemoPanel('taxonomy')}
                            >
                              <CloseOutlinedIcon sx={panelHeaderActionIconSx} />
                            </IconButton>
                          </Stack>
                        </Stack>
                        <Box sx={{ px: 1.25, pt: 1.05, pb: 0.9 }}>
                          <FormControl fullWidth size="small" sx={dropdownMagentaStyles}>
                            <InputLabel id="taxonomy-playback-mode-label">Taxonomies</InputLabel>
                            <Select
                              labelId="taxonomy-playback-mode-label"
                              value={selectedTaxonomy}
                              label="Taxonomies"
                              onChange={(event) => setSelectedTaxonomy(event.target.value as TaxonomyOption)}
                              sx={{ height: 40 }}
                            >
                              {taxonomyOptions.map((option) => (
                                <MenuItem key={option} value={option}>
                                  {option}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Box>
                        <Box
                          ref={taxonomyScrollContainerRef}
                          sx={{ px: 1.05, pb: 1, flex: 1, minHeight: 0, overflowY: 'auto' }}
                        >
                          <Stack spacing={0.7}>
                            {playbackScenes.map((scene, index) => {
                              const taxonomyData = getTaxonomySceneData(scene, index, selectedTaxonomy)
                              return (
                                <Box
                                  key={scene.id}
                                  ref={(el: HTMLDivElement | null) => {
                                    taxonomyRefs.current[index] = el
                                  }}
                                  sx={{
                                    p: 0.9,
                                    borderRadius: 1,
                                    border: '1px solid transparent',
                                    backgroundColor: 'transparent',
                                  }}
                                >
                                  <Typography
                                    sx={{
                                      fontSize: 28,
                                      color: '#A1A1A1',
                                      lineHeight: 1,
                                      mb: 0.35,
                                      opacity: 0.95,
                                    }}
                                  >
                                    {scene.sceneLabel}
                                  </Typography>
                                  <Typography sx={{ fontSize: 12, fontWeight: 700, opacity: 0.87 }}>
                                    {selectedTaxonomy}
                                  </Typography>
                                  <Chip
                                    label={`${taxonomyData.headline} (${taxonomyData.chip})`}
                                    size="small"
                                    sx={{
                                      height: 25.27,
                                      borderRadius: '104.48px',
                                      mt: 0.4,
                                      mb: 0.8,
                                      fontSize: 11.5,
                                    }}
                                  />
                                  {taxonomyData.sections.map((section) => (
                                    <Box key={`${scene.id}-${selectedTaxonomy}-${section.label}`}>
                                      <Typography sx={{ fontSize: 12, fontWeight: 700, opacity: 0.87 }}>
                                        {section.label}
                                      </Typography>
                                      <Typography
                                        sx={{ fontSize: 12, mb: 0.7, lineHeight: 1.35, opacity: 0.87 }}
                                      >
                                        {section.value}
                                      </Typography>
                                    </Box>
                                  ))}
                                </Box>
                              )
                            })}
                          </Stack>
                        </Box>
                      </Paper>
                    )}

                    {visiblePanels.includes('product') && (
                      <Paper
                        elevation={0}
                        sx={{ ...panelPaperStyles, height: visiblePanels.length === 1 ? 549 : '100%' }}
                      >
                        <Stack
                          direction="row"
                          alignItems="center"
                          justifyContent="space-between"
                          sx={{ px: 1, py: 0.75, borderBottom: '0.73px solid rgba(0,0,0,0.18)' }}
                        >
                          <Stack direction="row" alignItems="center" spacing={0.8}>
                            <ShoppingCartOutlinedIcon sx={{ fontSize: 16, color: '#4f4f4f' }} />
                            <Typography sx={{ fontWeight: 500, fontSize: 16, lineHeight: 1.1 }}>
                              Products
                            </Typography>
                          </Stack>
                          <Stack direction="row" spacing={0.25}>
                            <IconButton
                              size="small"
                              sx={panelHeaderIconButtonStyles}
                              onClick={() => openExpandedPanel('product')}
                            >
                              <PanelGlyph variant="expand" color="#ED005E" />
                            </IconButton>
                            <IconButton
                              size="small"
                              sx={panelHeaderIconButtonStyles}
                              onClick={() => closeDemoPanel('product')}
                            >
                              <CloseOutlinedIcon sx={panelHeaderActionIconSx} />
                            </IconButton>
                          </Stack>
                        </Stack>
                        <Box
                          ref={productScrollContainerRef}
                          sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 0.9 }}
                        >
                          {productEntries.map((entry, index) => {
                            return (
                              <Box
                                key={entry.id}
                                ref={(el: HTMLDivElement | null) => {
                                  productRefs.current[index] = el
                                }}
                                sx={{
                                  px: 0.75,
                                  py: 1.05,
                                  borderBottom: '1px solid #e6e6e6',
                                  backgroundColor: 'transparent',
                                  borderLeft: '3px solid transparent',
                                }}
                              >
                                <Stack direction="row" spacing={1.2}>
                                  <Box
                                    component="img"
                                    src={entry.image}
                                    alt={entry.name}
                                    sx={{
                                      width: 54,
                                      height: 54,
                                      borderRadius: 0.5,
                                      objectFit: 'cover',
                                      flexShrink: 0,
                                    }}
                                  />
                                  <Box sx={{ minWidth: 0 }}>
                                    <Typography sx={{ fontWeight: 600, fontSize: 16, lineHeight: 1.1 }}>
                                      {entry.name}
                                    </Typography>
                                    <Typography
                                      sx={{
                                        color: '#666',
                                        fontSize: 11.5,
                                        mt: 0.2,
                                        lineHeight: 1.3,
                                        opacity: 0.87,
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                      }}
                                    >
                                      {entry.description}
                                    </Typography>
                                    <Typography sx={{ color: '#A1A1A1', fontSize: 10.5, mt: 0.25 }}>
                                      {entry.sceneLabel} · {formatTime(entry.sceneStart)}
                                    </Typography>
                                  </Box>
                                </Stack>
                              </Box>
                            )
                          })}
                        </Box>
                      </Paper>
                    )}

                    {visiblePanels.includes('json') && (
                      <Paper
                        elevation={0}
                        sx={{
                          ...panelPaperStyles,
                          height: visiblePanels.length === 1 ? 549 : '100%',
                          backgroundColor: '#303841',
                          color: '#fff',
                        }}
                      >
                        <Stack
                          direction="row"
                          alignItems="center"
                          justifyContent="space-between"
                          sx={{ px: 1, py: 0.75, borderBottom: '0.73px solid rgba(255,255,255,0.22)' }}
                        >
                          <Stack direction="row" alignItems="center" spacing={0.8}>
                            <DataObjectOutlinedIcon sx={{ fontSize: 16, color: '#d8e3f1' }} />
                            <Typography sx={{ fontWeight: 500, fontSize: 16, lineHeight: 1.1 }}>
                              JSON
                            </Typography>
                          </Stack>
                          <Stack direction="row" spacing={0.25}>
                            <IconButton
                              size="small"
                              sx={panelHeaderIconButtonDarkStyles}
                              onClick={() => openExpandedPanel('json')}
                            >
                              <PanelGlyph variant="expand" color="#ffffff" />
                            </IconButton>
                            <IconButton
                              size="small"
                              sx={panelHeaderIconButtonDarkStyles}
                              onClick={() => setIsJsonDownloadModalOpen(true)}
                            >
                              <DownloadOutlinedIcon sx={panelHeaderActionIconSx} />
                            </IconButton>
                            <IconButton
                              size="small"
                              sx={panelHeaderIconButtonDarkStyles}
                              onClick={() => closeDemoPanel('json')}
                            >
                              <CloseOutlinedIcon sx={panelHeaderActionIconSx} />
                            </IconButton>
                          </Stack>
                        </Stack>
                        <Box
                          ref={jsonScrollContainerRef}
                          sx={{ px: 1.05, pt: 0.8, pb: 1.1, flex: 1, minHeight: 0, overflowY: 'auto' }}
                        >
                          {isSyncImpulseMode && isAdBreakPlayback ? (
                            <Box sx={{ p: 0.85 }}>
                              <Typography sx={{ fontSize: 11, color: '#d4deea', mb: 0.5 }}>
                                {activeScene.sceneLabel} @ {formatTime(videoCurrentSeconds)}
                              </Typography>
                              <Typography
                                component="pre"
                                sx={{
                                  m: 0,
                                  mb: 0.4,
                                  whiteSpace: 'pre-wrap',
                                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                                  fontSize: 10.4,
                                  lineHeight: 1.45,
                                  color: '#f3f7fd',
                                }}
                              >
                                {`{
  "${activeAdBreakLabel}"
}
`}
                              </Typography>
                              <Typography
                                component="pre"
                                sx={{
                                  m: 0,
                                  whiteSpace: 'pre-wrap',
                                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                                  fontSize: 10.4,
                                  lineHeight: 1.45,
                                  color: '#F05BB8',
                                }}
                              >
                                {`${JSON.stringify(adDecisionPayload, null, 2)}

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
        },`}
                              </Typography>
                            </Box>
                          ) : (
                            <Stack spacing={0.9}>
                              {playbackScenes.map((scene, index) => {
                                const payload = {
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
                                return (
                                  <Box
                                    key={scene.id}
                                    ref={(el: HTMLDivElement | null) => {
                                      jsonRefs.current[index] = el
                                    }}
                                    sx={{
                                      p: 0.85,
                                      borderRadius: 1,
                                      backgroundColor: 'transparent',
                                      border: '1px solid transparent',
                                    }}
                                  >
                                    <Typography sx={{ fontSize: 11, color: '#d4deea', mb: 0.4 }}>
                                      {scene.sceneLabel} @ {formatTime(scene.start)}
                                    </Typography>
                                    <Typography
                                      component="pre"
                                      sx={{
                                        m: 0,
                                        whiteSpace: 'pre-wrap',
                                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                                        fontSize: 10.4,
                                        lineHeight: 1.4,
                                        color: '#f3f7fd',
                                      }}
                                    >
                                      {JSON.stringify(payload, null, 2)}
                                    </Typography>
                                  </Box>
                                )
                              })}
                            </Stack>
                          )}
                        </Box>
                      </Paper>
                    )}
                  </Box>

                  <Box sx={{ pt: 2, pb: 2 }}>
                    <Box
                      sx={{
                        width: 'fit-content',
                        mx: 'auto',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 1.25,
                      }}
                    >
                      <Tooltip
                        title="Taxonomies"
                        arrow
                        placement="bottom"
                        slotProps={{
                          tooltip: { sx: tooltipStyles },
                          arrow: { sx: { color: '#666' } },
                        }}
                      >
                        <Box
                          role="button"
                          onClick={() => toggleDemoPanel('taxonomy')}
                          sx={navButtonStyles(activeDemoPanels.includes('taxonomy'))}
                        >
                          <Box
                            component="img"
                            src="/assets/elements/taxo-btn.svg"
                            alt="Taxonomy panel"
                            sx={{ width: 22, height: 22 }}
                          />
                        </Box>
                      </Tooltip>

                      <Box
                        component="img"
                        src="/assets/elements/divider-vertical.svg"
                        alt=""
                        aria-hidden
                        sx={{ width: 1, height: 28, opacity: 0.85 }}
                      />

                      <Tooltip
                        title="Product Match"
                        arrow
                        placement="bottom"
                        slotProps={{
                          tooltip: { sx: tooltipStyles },
                          arrow: { sx: { color: '#666' } },
                        }}
                      >
                        <Box
                          role="button"
                          onClick={() => toggleDemoPanel('product')}
                          sx={navButtonStyles(activeDemoPanels.includes('product'))}
                        >
                          <Box
                            component="img"
                            src="/assets/elements/product-btn.svg"
                            alt="Product panel"
                            sx={{ width: 22, height: 22 }}
                          />
                        </Box>
                      </Tooltip>

                      <Box
                        component="img"
                        src="/assets/elements/divider-vertical.svg"
                        alt=""
                        aria-hidden
                        sx={{ width: 1, height: 28, opacity: 0.85 }}
                      />

                      <Tooltip
                        title="JSON Response"
                        arrow
                        placement="bottom"
                        slotProps={{
                          tooltip: { sx: tooltipStyles },
                          arrow: { sx: { color: '#666' } },
                        }}
                      >
                        <Box
                          role="button"
                          onClick={() => toggleDemoPanel('json')}
                          sx={navButtonStyles(activeDemoPanels.includes('json'))}
                        >
                          <Box
                            component="img"
                            src="/assets/elements/json-btn.svg"
                            alt="JSON panel"
                            sx={{ width: 22, height: 22 }}
                          />
                        </Box>
                      </Tooltip>
                    </Box>
                  </Box>
                </Stack>
              </Paper>
            </Stack>
              )}
            </>
          )}
        </Paper>
      </Container>

      <Drawer
        anchor="right"
        open={isProfileDrawerOpen}
        onClose={closeProfileDrawer}
        PaperProps={{
          sx: {
            width: 430,
            maxWidth: '92vw',
            borderTopLeftRadius: 8,
            borderBottomLeftRadius: 8,
            overflow: 'hidden',
          },
        }}
      >
        <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.4 }}>
            <Typography sx={{ fontSize: 26, fontWeight: 600, color: 'rgba(0,0,0,0.87)' }}>
              Profile
            </Typography>
            <IconButton size="small" onClick={closeProfileDrawer} sx={{ color: '#8b8b8b' }}>
              <CloseOutlinedIcon />
            </IconButton>
          </Stack>
          <Divider />

          <Stack spacing={2.4} sx={{ pt: 2.2 }}>
            <TextField
              fullWidth
              label="Name"
              size="small"
              value={profileNameDraft}
              onChange={(event) => setProfileNameDraft(event.target.value)}
              sx={dropdownMagentaStyles}
            />
            <Box>
              <Stack direction="row" spacing={1.2} alignItems="flex-start">
                <TextField
                  fullWidth
                  label="Email"
                  size="small"
                  value={profileEmailDraft}
                  onChange={(event) => setProfileEmailDraft(event.target.value)}
                  sx={dropdownMagentaStyles}
                />
                {!isProfileEmailVerified && (
                  <Button
                    variant="outlined"
                    onClick={() => setIsVerifyEmailDialogOpen(true)}
                    sx={{
                      borderColor: '#ED005E80',
                      color: '#ED005E',
                      minWidth: 166,
                      height: 40,
                      fontWeight: 600,
                      letterSpacing: 0.3,
                      '&:hover': { borderColor: '#ED005E', backgroundColor: 'rgba(237,0,94,0.04)' },
                    }}
                  >
                    RESEND EMAIL
                  </Button>
                )}
              </Stack>
              {!isProfileEmailVerified && (
                <Typography sx={{ mt: 0.9, ml: 0.25, fontSize: 12, color: '#B0004D', fontWeight: 600 }}>
                  Email not verified
                </Typography>
              )}
            </Box>
          </Stack>

          <Box sx={{ mt: 'auto', pt: 2 }}>
            <Divider sx={{ mb: 1.2 }} />
            <Stack direction="row" justifyContent="flex-end" spacing={1}>
              <Button
                variant="text"
                onClick={closeProfileDrawer}
                sx={{ color: 'rgba(0,0,0,0.54)', minWidth: 80 }}
              >
                CANCEL
              </Button>
              <Button
                variant="contained"
                onClick={handleSaveProfile}
                sx={{ bgcolor: '#ED005E', '&:hover': { bgcolor: '#cf0052' }, minWidth: 80 }}
              >
                SAVE
              </Button>
            </Stack>
          </Box>
        </Box>
      </Drawer>

      <Dialog
        open={isVerifyEmailDialogOpen}
        onClose={() => setIsVerifyEmailDialogOpen(false)}
        maxWidth={false}
        PaperProps={{
          sx: {
            width: 444,
            maxWidth: '95vw',
            borderRadius: 1.5,
            overflow: 'hidden',
            boxShadow:
              '0 11px 15px -7px rgba(0,0,0,0.2), 0 24px 38px 3px rgba(0,0,0,0.14), 0 9px 46px 8px rgba(0,0,0,0.12)',
          },
        }}
      >
        <DialogContent sx={{ px: 3, pt: 3.2, pb: 2.4 }}>
          <Stack spacing={2} alignItems="center" textAlign="center">
            <Typography sx={{ fontSize: 42, lineHeight: 1, color: '#ED005E' }}>✉</Typography>
            <Box>
              <Typography sx={{ fontSize: 24, fontWeight: 500, color: 'rgba(0,0,0,0.87)' }}>
                Verify your new email
              </Typography>
              <Typography sx={{ fontSize: 14, color: 'rgba(0,0,0,0.6)', mt: 0.8 }}>
                We sent you an email verification request.
              </Typography>
            </Box>
            <Stack spacing={1} sx={{ width: '100%', maxWidth: 300 }}>
              <Button
                variant="contained"
                onClick={() => setIsVerifyEmailDialogOpen(false)}
                sx={{ bgcolor: '#ED005E', '&:hover': { bgcolor: '#cf0052' }, fontWeight: 600 }}
              >
                CHECK EMAIL APP
              </Button>
              <Button
                variant="outlined"
                onClick={() => setIsVerifyEmailDialogOpen(false)}
                sx={{ borderColor: '#ED005E80', color: '#ED005E', fontWeight: 600 }}
              >
                RESEND EMAIL
              </Button>
            </Stack>
          </Stack>
        </DialogContent>
      </Dialog>

      <Dialog
        open={expandedPanel !== null}
        onClose={closeExpandedPanel}
        maxWidth={false}
        PaperProps={{
          sx: {
            width: 980,
            maxWidth: '94vw',
            height: 760,
            maxHeight: '88vh',
            borderRadius: 2,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{
            px: 2,
            py: 1,
            borderBottom:
              expandedPanel === 'json' ? '0.73px solid rgba(255,255,255,0.22)' : '0.73px solid rgba(0,0,0,0.18)',
            bgcolor: expandedPanel === 'json' ? '#303841' : '#fff',
            color: expandedPanel === 'json' ? '#fff' : 'inherit',
          }}
        >
          <Stack direction="row" alignItems="center" spacing={0.8}>
            {expandedPanel === 'taxonomy' && (
              <Box
                component="img"
                src="/assets/elements/taxo-btn.svg"
                alt=""
                aria-hidden
                sx={{ width: 16, height: 16, opacity: 0.8 }}
              />
            )}
            {expandedPanel === 'product' && (
              <ShoppingCartOutlinedIcon sx={{ fontSize: 16, color: '#4f4f4f' }} />
            )}
            {expandedPanel === 'json' && (
              <DataObjectOutlinedIcon sx={{ fontSize: 16, color: '#d8e3f1' }} />
            )}
            <Typography sx={{ fontWeight: 500, fontSize: 16, lineHeight: 1.1 }}>
              {expandedPanel === 'taxonomy'
                ? 'Taxonomies'
                : expandedPanel === 'product'
                  ? 'Products'
                  : 'JSON'}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={0.25}>
            {expandedPanel === 'json' && (
              <IconButton
                size="small"
                onClick={() => setIsJsonDownloadModalOpen(true)}
                sx={panelHeaderIconButtonDarkStyles}
              >
                <DownloadOutlinedIcon sx={panelHeaderActionIconSx} />
              </IconButton>
            )}
            <IconButton
              size="small"
              onClick={closeExpandedPanel}
              sx={expandedPanel === 'json' ? panelHeaderIconButtonDarkStyles : panelHeaderIconButtonStyles}
            >
              <PanelGlyph variant="collapse" color={expandedPanel === 'json' ? '#ffffff' : '#ED005E'} />
            </IconButton>
          </Stack>
        </Stack>
        <Box sx={{ flex: 1, minHeight: 0, bgcolor: expandedPanel === 'json' ? '#303841' : '#fff' }}>
          {renderExpandedPanelContent()}
        </Box>
      </Dialog>

      <Dialog
        open={isSelectorModalOpen}
        onClose={() => setIsSelectorModalOpen(false)}
        maxWidth={false}
        PaperProps={{
          sx: {
            width: 762,
            maxWidth: '95vw',
            borderRadius: 2,
            border: '2px solid rgba(255,255,255,0.9)',
            boxShadow: '0 8px 18px rgba(0,0,0,0.15)',
            overflow: 'hidden',
          },
        }}
      >
        <DialogTitle sx={{ position: 'relative', p: 0, minHeight: 52 }}>
          <IconButton
            aria-label="close"
            onClick={() => setIsSelectorModalOpen(false)}
            sx={{ position: 'absolute', right: 20, top: 20, color: '#ED005E' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ px: 6, pt: 7, pb: 5.5, flex: '0 0 auto' }}>
          <Stack spacing={0} alignItems="center">
            <Typography
              variant="h4"
              color="text.primary"
              textAlign="center"
              sx={{ maxWidth: 760, fontSize: 26, lineHeight: 1.28, mb: 5.5 }}
            >
              Please select the Tier-level and
              <br />
              Ad Playback mode to start your Demo:
            </Typography>

            <Stack direction="row" spacing={2} width="100%">
              <FormControl fullWidth size="small" sx={dropdownMagentaStyles}>
                <InputLabel id="tier-select-label">Tier Selection</InputLabel>
                <Select
                  labelId="tier-select-label"
                  value={selectedTier}
                  label="Tier Selection"
                  onChange={(event) => setSelectedTier(event.target.value as TierOption)}
                >
                  {tierOptions.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth size="small" sx={dropdownMagentaStyles}>
                <InputLabel id="ad-playback-select-label">Ad Playback Mode</InputLabel>
                <Select
                  labelId="ad-playback-select-label"
                  value={selectedAdPlayback}
                  label="Ad Playback Mode"
                  onChange={(event) =>
                    setSelectedAdPlayback(event.target.value as AdPlaybackOption)
                  }
                >
                  {adPlaybackOptions.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </Stack>
        </DialogContent>

        <DialogActions
          sx={{
            justifyContent: 'center',
            gap: 1,
            px: 3,
            py: 2,
            borderTop: '1px solid rgba(0,0,0,0.12)',
          }}
        >
          <Button
            variant="outlined"
            onClick={() => setIsSelectorModalOpen(false)}
            sx={{ borderColor: '#ED005E80', color: '#ED005E', minWidth: 88 }}
          >
            CANCEL
          </Button>
          <Button
            variant="contained"
            onClick={handleStartDemo}
            sx={{
              bgcolor: '#ED005E',
              '&:hover': { bgcolor: '#cf0052' },
              minWidth: 76,
            }}
          >
            START
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={isJsonDownloadModalOpen}
        onClose={() => setIsJsonDownloadModalOpen(false)}
        maxWidth={false}
        PaperProps={{
          sx: {
            width: 460,
            maxWidth: '95vw',
            borderRadius: 1,
            overflow: 'hidden',
            boxShadow:
              '0 11px 15px -7px rgba(0,0,0,0.2), 0 24px 38px 3px rgba(0,0,0,0.14), 0 9px 46px 8px rgba(0,0,0,0.12)',
          },
        }}
      >
        <DialogTitle
          sx={{ px: 3, pt: 2.25, pb: 1.75, color: 'rgba(0,0,0,0.87)', fontSize: 28, lineHeight: 1.2 }}
        >
          Schedule Report
        </DialogTitle>
        <DialogContent sx={{ px: 2.5, pt: 0.5, pb: 2, overflow: 'visible' }}>
          <FormControl fullWidth size="medium" sx={dropdownMagentaStyles}>
            <InputLabel
              id="json-download-select-label"
              shrink
              sx={{ px: 0.55, backgroundColor: '#fff', fontSize: 12 }}
            >
              Download Type
            </InputLabel>
            <Select
              labelId="json-download-select-label"
              value={selectedJsonDownloadOption}
              label="Download Type"
              onChange={(event) =>
                setSelectedJsonDownloadOption(event.target.value as JsonDownloadOption)
              }
              sx={{ minHeight: 52, fontSize: 16 }}
            >
              {jsonDownloadOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.5, justifyContent: 'flex-end', gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => setIsJsonDownloadModalOpen(false)}
            sx={{
              borderColor: '#ED005E80',
              color: '#ED005E',
              minWidth: 88,
              height: 32,
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            CANCEL
          </Button>
          <Button
            variant="contained"
            onClick={handleDownloadJson}
            sx={{
              bgcolor: '#ED005E',
              '&:hover': { bgcolor: '#cf0052' },
              minWidth: 119,
              height: 32,
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            DOWNLOAD
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={isCompanionModalOpen}
        onClose={() => setIsCompanionModalOpen(false)}
        maxWidth={false}
        PaperProps={{
          sx: {
            width: 340,
            maxWidth: '92vw',
            height: 760,
            maxHeight: '90vh',
            borderRadius: 1,
            overflow: 'hidden',
            position: 'relative',
            boxShadow:
              '0 11px 15px -7px rgba(0,0,0,0.2), 0 24px 38px 3px rgba(0,0,0,0.14), 0 9px 46px 8px rgba(0,0,0,0.12)',
          },
        }}
      >
        <IconButton
          aria-label="close companion modal"
          onClick={() => setIsCompanionModalOpen(false)}
          sx={{ position: 'absolute', right: 10, top: 8, color: '#ED005E', zIndex: 2 }}
        >
          <CloseOutlinedIcon />
        </IconButton>
        <Box sx={{ p: 2, pt: 5, height: '100%' }}>
          <Box
            sx={{
              width: '100%',
              height: '100%',
              border: '1px solid rgba(0,0,0,0.16)',
              bgcolor: '#fff',
              overflow: 'hidden',
            }}
          >
            <Box
              component="iframe"
              src={selectedCompanionUrl}
              title="Companion mobile experience"
              sx={{ width: '100%', height: '100%', border: 0, display: 'block' }}
            />
          </Box>
        </Box>
      </Dialog>
    </Box>
  )
}

export default App
