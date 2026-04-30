import { Container, Paper } from '@mui/material'
import { AppShell } from '@kerv-one/theme'
import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import { AuthenticatedHeader } from './demo/components/layout/AuthenticatedHeader'
import { ContentSelectionView } from './demo/components/ContentSelectionView'
import { LoginView } from './demo/components/LoginView'
import { SelectorDialog } from './demo/components/dialogs/SelectorDialog'

// Code-split the heavy demo modules so they don't block the login + content
// selection screens. `DemoView` carries the player, panel cards, scroll
// engine, and ~dozen MUI components — by deferring it the login bundle
// shrinks and the user sees the login screen sooner. The expanded panel
// dialog, JSON download dialog, companion dialog, profile drawer, and
// verify-email dialog are also rarely-used surfaces; lazy-loading them
// keeps the initial JS payload focused on the auth + selection flow.
const DemoView = lazy(() =>
  import('./demo/components/DemoView').then((m) => ({ default: m.DemoView }))
)
const ExpandedPanelDialog = lazy(() =>
  import('./demo/components/dialogs/ExpandedPanelDialog').then((m) => ({
    default: m.ExpandedPanelDialog,
  }))
)
const JsonDownloadDialog = lazy(() =>
  import('./demo/components/dialogs/JsonDownloadDialog').then((m) => ({
    default: m.JsonDownloadDialog,
  }))
)
const CompanionDialog = lazy(() =>
  import('./demo/components/dialogs/CompanionDialog').then((m) => ({
    default: m.CompanionDialog,
  }))
)
const ProfileDrawer = lazy(() =>
  import('./demo/components/dialogs/ProfileDrawer').then((m) => ({
    default: m.ProfileDrawer,
  }))
)
const VerifyEmailDialog = lazy(() =>
  import('./demo/components/dialogs/VerifyEmailDialog').then((m) => ({
    default: m.VerifyEmailDialog,
  }))
)
import {
  DEFAULT_MACBOOK_VIEWPORT_MAX_HEIGHT,
  DEFAULT_MACBOOK_VIEWPORT_MAX_WIDTH,
  DEFAULT_START_SECONDS,
  DEFAULT_USER_EMAIL,
  DEFAULT_USER_NAME,
  DEMO_LOGIN_EMAIL,
  DEMO_LOGIN_PASSWORD,
} from './demo/constants'
import { authService } from './demo/auth'
import { CONTENT_ITEMS } from './demo/data/contentItems'
import { getJsonDownloadContent } from './demo/utils/jsonExport'
import {
  clearPersistedSession,
  loadPersistedSession,
  savePersistedSession,
} from './demo/utils/sessionStorage'
import { dropdownMagentaStyles } from './demo/styles'
import type {
  AdPlaybackOption,
  ContentCategory,
  ContentItem,
  CurrentView,
  DemoPanel,
  ExpandedPanel,
  JsonDownloadOption,
  TaxonomyOption,
  TierOption,
} from './demo/types'
import { useDemoPlayback } from './demo/hooks/useDemoPlayback'

function App() {
  // Read once on mount – never during render – so we restore the last active session
  // across a page refresh while keeping React's state contract intact.
  const persisted = useMemo(() => loadPersistedSession(), [])

  // Recover the content item from its id. If the id no longer exists (content was
  // renamed/removed across deploys) we fall back to the content-selection screen.
  const persistedContent = useMemo(
    () =>
      persisted.selectedContentId
        ? CONTENT_ITEMS.find((item) => item.id === persisted.selectedContentId) ?? null
        : null,
    [persisted.selectedContentId]
  )

  const persistedView: CurrentView =
    persisted.currentView === 'demo' && !persistedContent
      ? 'selection'
      : persisted.currentView ?? 'login'

  // Mirror handleStartDemo's initial-time logic for a rehydrated demo view so the
  // scrubber starts from the content's natural beginning. Without this, the
  // generic DEFAULT_START_SECONDS (4:31) lands past the DHYH ad break and the
  // player gets stuck inside an unconsumed ad on refresh.
  const restoredInitialSeconds = (() => {
    if (persistedView !== 'demo' || !persistedContent) return DEFAULT_START_SECONDS
    const isSyncImpulse = persisted.selectedAdPlayback === 'Sync: Impulse'
    const isDhyh = persistedContent.id === 'dhyh'
    return isSyncImpulse || isDhyh ? 0 : DEFAULT_START_SECONDS
  })()

  const [currentView, setCurrentView] = useState<CurrentView>(persistedView)
  const [selectedCategory, setSelectedCategory] = useState<ContentCategory>('All')
  const [selectedContentIds, setSelectedContentIds] = useState<string[]>(
    persistedContent ? [persistedContent.id] : []
  )
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(persistedContent)
  const [isSelectorModalOpen, setIsSelectorModalOpen] = useState(false)
  const [selectedTier, setSelectedTier] = useState<TierOption>(
    persisted.selectedTier ?? 'Basic Scene'
  )
  const [selectedAdPlayback, setSelectedAdPlayback] = useState<AdPlaybackOption>(
    persisted.selectedAdPlayback ?? 'Sync: Impulse'
  )
  const [selectedTaxonomy, setSelectedTaxonomy] = useState<TaxonomyOption>('Emotion')
  const [expandedSelectedTaxonomies, setExpandedSelectedTaxonomies] = useState<TaxonomyOption[]>(['Emotion'])
  const [isTitlePanelExpanded, setIsTitlePanelExpanded] = useState(true)
  const [isJsonDownloadModalOpen, setIsJsonDownloadModalOpen] = useState(false)
  const [selectedJsonDownloadOption, setSelectedJsonDownloadOption] =
    useState<JsonDownloadOption>('Original JSON')
  const [isCompanionModalOpen, setIsCompanionModalOpen] = useState(false)
  const [selectedCompanionUrl, setSelectedCompanionUrl] = useState('')
  const [profileMenuAnchorEl, setProfileMenuAnchorEl] = useState<null | HTMLElement>(null)
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false)
  const [profileName, setProfileName] = useState(DEFAULT_USER_NAME)
  const [verifiedProfileEmail] = useState(DEFAULT_USER_EMAIL)
  const [pendingProfileEmail, setPendingProfileEmail] = useState<string | null>(null)
  const [profileNameDraft, setProfileNameDraft] = useState(DEFAULT_USER_NAME)
  const [profileEmailDraft, setProfileEmailDraft] = useState(DEFAULT_USER_EMAIL)
  const [isVerifyEmailDialogOpen, setIsVerifyEmailDialogOpen] = useState(false)
  const [loginUsername, setLoginUsername] = useState(DEMO_LOGIN_EMAIL)
  const [loginPassword, setLoginPassword] = useState(DEMO_LOGIN_PASSWORD)
  const [loginError, setLoginError] = useState<string | null>(null)
  const [expandedPanel, setExpandedPanel] = useState<ExpandedPanel>(null)
  const [activeDemoPanels, setActiveDemoPanels] = useState<DemoPanel[]>([])
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)
  const [isVideoMuted, setIsVideoMuted] = useState(true)
  const [videoCurrentSeconds, setVideoCurrentSeconds] = useState(restoredInitialSeconds)
  const [videoElementDuration, setVideoElementDuration] = useState(0)

  const wasVideoPlayingBeforeExpandRef = useRef(false)
  const playbackLoadAreaRef = useRef<HTMLDivElement | null>(null)
  const previousTitlePanelExpandedRef = useRef(isTitlePanelExpanded)

  const filteredItems = useMemo(() => {
    if (selectedCategory === 'All') return CONTENT_ITEMS
    return CONTENT_ITEMS.filter((item) => item.categories.includes(selectedCategory))
  }, [selectedCategory])

  const effectiveProfileEmail = pendingProfileEmail ?? verifiedProfileEmail
  const isProfileEmailVerified = pendingProfileEmail === null

  const demoPlayback = useDemoPlayback({
    currentView,
    selectedContent,
    selectedTier,
    selectedAdPlayback,
    activeDemoPanels,
    videoCurrentSeconds,
    setVideoCurrentSeconds,
    videoElementDuration,
    isVideoPlaying,
  })

  // Keep the taxonomy selection valid against the currently-available set.
  //
  // `availableTaxonomies` is derived per tier/content: a tier that doesn't
  // emit data for a given taxonomy (e.g. Basic tier has only IAB + Sentiment,
  // Exact has everything except Faces today) drops that option from the
  // dropdowns. If the user was already on one of those dropped options when
  // the tier changes, we auto-switch the collapsed single-selection to the
  // first available option so the panel never displays an empty state and
  // the <Select> doesn't show a MUI warning about a value that isn't in the
  // options list. The expanded multi-selection is filtered the same way; if
  // filtering empties it, we re-seed it from the (now-valid) single
  // selection.
  useEffect(() => {
    if (demoPlayback.availableTaxonomies.length === 0) return
    if (!demoPlayback.availableTaxonomies.includes(selectedTaxonomy)) {
      setSelectedTaxonomy(demoPlayback.availableTaxonomies[0])
    }
    setExpandedSelectedTaxonomies((prev) => {
      const filtered = prev.filter((tax) => demoPlayback.availableTaxonomies.includes(tax))
      if (filtered.length === prev.length) return prev
      if (filtered.length === 0) {
        const fallback = demoPlayback.availableTaxonomies.includes(selectedTaxonomy)
          ? selectedTaxonomy
          : demoPlayback.availableTaxonomies[0]
        return [fallback]
      }
      return filtered
    })
  }, [demoPlayback.availableTaxonomies, selectedTaxonomy])

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

  // Remember just enough about the session to land the user back on the same page
  // after a browser refresh. Everything else (scrubber position, panels, mute,
  // taxonomy selection, etc.) is deliberately left out so a refresh behaves like a
  // fresh load of the current page rather than a resume.
  useEffect(() => {
    if (currentView === 'login') {
      clearPersistedSession()
      return
    }
    savePersistedSession({
      currentView,
      selectedContentId: selectedContent?.id ?? null,
      selectedTier,
      selectedAdPlayback,
    })
  }, [currentView, selectedContent, selectedTier, selectedAdPlayback])

  const openSelectorForContent = (item: ContentItem) => {
    const { id } = item
    setSelectedContentIds((prev) => (prev.includes(id) ? prev : [id]))
    setSelectedContent(item)
    setIsSelectorModalOpen(true)
  }

  const handleStartDemo = () => {
    if (!selectedContent) return
    setIsSelectorModalOpen(false)
    setIsVideoPlaying(false)
    setIsVideoMuted(true)
    const isDhyh = selectedContent.id === 'dhyh'
    const initialSeconds = demoPlayback.isSyncImpulseMode ? 0 : isDhyh ? 0 : DEFAULT_START_SECONDS
    setVideoCurrentSeconds(initialSeconds)
    setCurrentView('demo')
  }

  const handleLogin = async () => {
    // Credential check is delegated to authService — see src/demo/auth.
    // Today that's MockAuthService (preserves the exact prototype behavior:
    // hardcoded credentials, trim + case-insensitive email match). When the
    // team wires Cognito, swap the env var and the rest of this flow stays
    // identical.
    const result = await authService.signIn(loginUsername, loginPassword)
    if (!result.ok) {
      setLoginError(result.error)
      return
    }
    setLoginError(null)
    setCurrentView('selection')
  }

  const handleLoginUsernameChange = (value: string) => {
    setLoginUsername(value)
    if (loginError) setLoginError(null)
  }

  const handleLoginPasswordChange = (value: string) => {
    setLoginPassword(value)
    if (loginError) setLoginError(null)
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
    setIsVideoMuted(true)
    setIsSelectorModalOpen(false)
    setIsJsonDownloadModalOpen(false)
    setIsCompanionModalOpen(false)
    setExpandedPanel(null)
    setActiveDemoPanels([])
    setCurrentView('login')
    // Drop any persisted session so a subsequent refresh lands back on login
    // rather than rehydrating the previously-signed-in state.
    clearPersistedSession()
  }

  const toggleDemoPanel = (panel: DemoPanel) => {
    setActiveDemoPanels((prev) =>
      prev.includes(panel) ? prev.filter((value) => value !== panel) : [...prev, panel]
    )
  }

  const closeDemoPanel = (panel: DemoPanel) => {
    setActiveDemoPanels((prev) => prev.filter((value) => value !== panel))
  }

  const openExpandedPanel = (panel: DemoPanel) => {
    wasVideoPlayingBeforeExpandRef.current = isVideoPlaying
    setIsVideoPlaying(false)
    if (panel === 'taxonomy') {
      // Each expand session starts fresh with just the collapsed-view
      // selection. We deliberately do NOT preserve the previous expanded
      // multi-selection across open/close cycles – the collapsed inline
      // panel is the source of truth for "the taxonomy the user is currently
      // looking at", and opening the expanded view should always reflect
      // that single taxonomy as the starting point.
      setExpandedSelectedTaxonomies([selectedTaxonomy])
    }
    setExpandedPanel(panel)
  }

  const closeExpandedPanel = () => {
    setExpandedPanel(null)
    // Reset the expanded multi-select back to the collapsed single taxonomy
    // so the inline panel unambiguously "returns to" the pre-expand state
    // and a future re-open starts from a clean baseline. `selectedTaxonomy`
    // itself is never touched by the expanded view – only the collapsed
    // <Select> in DemoView writes to it – so the inline panel displays the
    // same taxonomy the user had selected before they expanded.
    setExpandedSelectedTaxonomies([selectedTaxonomy])
    if (wasVideoPlayingBeforeExpandRef.current) {
      setIsVideoPlaying(true)
    }
  }

  const handleDownloadJson = () => {
    const { content, fileName } = getJsonDownloadContent(
      selectedJsonDownloadOption,
      demoPlayback.originalJsonDownloadString,
      demoPlayback.summaryJsonDownloadString
    )
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
    setSelectedCompanionUrl(demoPlayback.activeAdQrDestination)
    setIsCompanionModalOpen(true)
  }

  return (
    // `Suspense` boundary covers every lazy-loaded chunk in the tree
    // (DemoView + the five dialogs above). Fallback is `null` so the
    // currently-mounted view remains visible until the chunk arrives —
    // the alternative (a spinner overlay) would visibly flash on every
    // dialog open.
    <Suspense fallback={null}>
    <AppShell sx={{ py: 2 }}>
      <Container maxWidth={false} sx={{ width: 1440, maxWidth: '100%', px: 3 }}>
        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, bgcolor: 'transparent' }}>
          {currentView === 'login' ? (
            <LoginView
              loginUsername={loginUsername}
              loginPassword={loginPassword}
              loginError={loginError}
              onUsernameChange={handleLoginUsernameChange}
              onPasswordChange={handleLoginPasswordChange}
              onLogin={handleLogin}
            />
          ) : (
            <>
              <AuthenticatedHeader
                profileMenuAnchorEl={profileMenuAnchorEl}
                onOpenProfileMenu={openProfileMenu}
                onCloseProfileMenu={closeProfileMenu}
                onOpenProfileDrawer={openProfileDrawer}
                onSignOut={handleSignOut}
              />

              {currentView === 'selection' ? (
                <ContentSelectionView
                  selectedCategory={selectedCategory}
                  filteredItems={filteredItems}
                  selectedContentIds={selectedContentIds}
                  onCategoryChange={setSelectedCategory}
                  onSelectContent={openSelectorForContent}
                />
              ) : (
                <DemoView
                  playbackLoadAreaRef={playbackLoadAreaRef}
                  isTitlePanelExpanded={isTitlePanelExpanded}
                  selectedTier={selectedTier}
                  selectedAdPlayback={selectedAdPlayback}
                  titlePanelSummary={demoPlayback.titlePanelSummary}
                  activeDemoPanels={activeDemoPanels}
                  visiblePanels={demoPlayback.visiblePanels}
                  selectedTaxonomy={selectedTaxonomy}
                  playbackScenes={demoPlayback.playbackScenes}
                  activeScene={demoPlayback.activeScene}
                  productEntries={demoPlayback.productEntries}
                  isVideoPlaying={isVideoPlaying}
                  isVideoMuted={isVideoMuted}
                  videoCurrentSeconds={videoCurrentSeconds}
                  playbackDurationSeconds={demoPlayback.playbackDurationSeconds}
                  displayedCurrentSeconds={demoPlayback.displayedCurrentSeconds}
                  displayedDurationSeconds={demoPlayback.displayedDurationSeconds}
                  impulseSegments={demoPlayback.impulseSegments}
                  playerControlTokens={demoPlayback.playerControlTokens}
                  isSyncImpulseMode={demoPlayback.isSyncImpulseMode}
                  isAdBreakPlayback={demoPlayback.isAdBreakPlayback}
                  activeAdBreakImage={demoPlayback.activeAdBreakImage}
                  activeAdQrImage={demoPlayback.activeAdQrImage}
                  activeAdVideoUrl={demoPlayback.activeAdVideoUrl}
                  mainVideoSrc={demoPlayback.mainVideoSrc}
                  productsUnavailableMessage={demoPlayback.productsUnavailableMessage}
                  hasReachedFirstProduct={demoPlayback.hasReachedFirstProduct}
                  taxonomyAvailability={demoPlayback.taxonomyAvailability}
                  availableTaxonomies={demoPlayback.availableTaxonomies}
                  availableAdModes={demoPlayback.availableAdModes}
                  activeSceneIndex={demoPlayback.activeSceneIndex}
                  activeProductIndex={demoPlayback.activeProductIndex}
                  shouldShowInContentCta={demoPlayback.shouldShowInContentCta}
                  activeAdBreakLabel={demoPlayback.activeAdBreakLabel}
                  adDecisionPayload={demoPlayback.adDecisionPayload}
                  adDecisioningTail={demoPlayback.adDecisioningTail}
                  contentVideoRef={demoPlayback.contentVideoRef}
                  adVideoRef={demoPlayback.adVideoRef}
                  taxonomyRefs={demoPlayback.taxonomyRefs}
                  productRefs={demoPlayback.productRefs}
                  jsonRefs={demoPlayback.jsonRefs}
                  taxonomyScrollContainerRef={demoPlayback.taxonomyScrollContainerRef}
                  productScrollContainerRef={demoPlayback.productScrollContainerRef}
                  jsonScrollContainerRef={demoPlayback.jsonScrollContainerRef}
                  onBackToSelection={() => {
                    setIsVideoPlaying(false)
                    setCurrentView('selection')
                  }}
                  onToggleTitlePanel={() => setIsTitlePanelExpanded((prev) => !prev)}
                  onTierChange={setSelectedTier}
                  onAdPlaybackChange={setSelectedAdPlayback}
                  onTaxonomyChange={setSelectedTaxonomy}
                  onToggleVideoPlaying={() => setIsVideoPlaying((prev) => !prev)}
                  onToggleVideoMuted={() => setIsVideoMuted((prev) => !prev)}
                  onVideoTimeChange={(value) => {
                    // Every slider interaction – drag tick or click-jump, large
                    // or small – flags an imperative scrub so the panels
                    // snap-load to the new position instead of smooth-scrolling.
                    // The threshold detector in useDemoPlayback is the backup;
                    // this is the source-of-truth signal for user seeks.
                    demoPlayback.flagPanelScrub()
                    setVideoCurrentSeconds(value)
                  }}
                  onVideoMetadataLoaded={setVideoElementDuration}
                  onToggleDemoPanel={toggleDemoPanel}
                  onCloseDemoPanel={closeDemoPanel}
                  onOpenExpandedPanel={openExpandedPanel}
                  onOpenJsonDownload={() => setIsJsonDownloadModalOpen(true)}
                  onOpenCompanionModal={openCompanionModal}
                />
              )}
            </>
          )}
        </Paper>
      </Container>

      <ProfileDrawer
        open={isProfileDrawerOpen}
        profileNameDraft={profileNameDraft}
        profileEmailDraft={profileEmailDraft}
        isProfileEmailVerified={isProfileEmailVerified}
        onClose={closeProfileDrawer}
        onSave={handleSaveProfile}
        onOpenVerifyEmail={() => setIsVerifyEmailDialogOpen(true)}
        onNameChange={setProfileNameDraft}
        onEmailChange={setProfileEmailDraft}
        inputStyles={dropdownMagentaStyles}
      />

      <VerifyEmailDialog
        open={isVerifyEmailDialogOpen}
        onClose={() => setIsVerifyEmailDialogOpen(false)}
      />

      <ExpandedPanelDialog
        expandedPanel={expandedPanel}
        expandedSelectedTaxonomies={expandedSelectedTaxonomies}
        playbackScenes={demoPlayback.playbackScenes}
        // Phase 9a — expanded panel uses the SAME segment-isolated list
        // as the inline panel. This guarantees `activeProductIndex` lines
        // up across both views and the open-time scroll lands on the
        // exact product the collapsed panel was centered on.
        productEntries={demoPlayback.productEntries}
        activeProductIndex={demoPlayback.activeProductIndex}
        productsUnavailableMessage={demoPlayback.productsUnavailableMessage}
        hasReachedFirstProduct={demoPlayback.hasReachedFirstProduct}
        taxonomyAvailability={demoPlayback.taxonomyAvailability}
        availableTaxonomies={demoPlayback.availableTaxonomies}
        activeSceneIndex={demoPlayback.activeSceneIndex}
        isSyncImpulseMode={demoPlayback.isSyncImpulseMode}
        isAdBreakPlayback={demoPlayback.isAdBreakPlayback}
        activeScene={demoPlayback.activeScene}
        activeAdBreakLabel={demoPlayback.activeAdBreakLabel}
        adDecisionPayload={demoPlayback.adDecisionPayload}
        adDecisioningTail={demoPlayback.adDecisioningTail}
        videoCurrentSeconds={videoCurrentSeconds}
        scrubVersion={demoPlayback.scrubVersion}
        onClose={closeExpandedPanel}
        onOpenJsonDownload={() => setIsJsonDownloadModalOpen(true)}
        onExpandedTaxonomiesChange={setExpandedSelectedTaxonomies}
      />

      <SelectorDialog
        open={isSelectorModalOpen}
        selectedTier={selectedTier}
        selectedAdPlayback={selectedAdPlayback}
        onClose={() => setIsSelectorModalOpen(false)}
        onStart={handleStartDemo}
        onTierChange={setSelectedTier}
        onAdPlaybackChange={setSelectedAdPlayback}
      />

      <JsonDownloadDialog
        open={isJsonDownloadModalOpen}
        selectedOption={selectedJsonDownloadOption}
        onClose={() => setIsJsonDownloadModalOpen(false)}
        onDownload={handleDownloadJson}
        onOptionChange={setSelectedJsonDownloadOption}
      />

      <CompanionDialog
        open={isCompanionModalOpen}
        selectedCompanionUrl={selectedCompanionUrl}
        onClose={() => setIsCompanionModalOpen(false)}
      />
    </AppShell>
    </Suspense>
  )
}

export default App
