import { Box, Container, Paper } from '@mui/material'
import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { AuthenticatedHeader } from './demo/components/AuthenticatedHeader'
import { CompanionDialog } from './demo/components/CompanionDialog'
import { ContentSelectionView } from './demo/components/ContentSelectionView'
import { DemoView } from './demo/components/DemoView'
import { ExpandedPanelDialog } from './demo/components/ExpandedPanelDialog'
import { JsonDownloadDialog } from './demo/components/JsonDownloadDialog'
import { LoginView } from './demo/components/LoginView'
import { ProfileDrawer } from './demo/components/ProfileDrawer'
import { SelectorDialog } from './demo/components/SelectorDialog'
import { VerifyEmailDialog } from './demo/components/VerifyEmailDialog'
import {
  DEFAULT_MACBOOK_VIEWPORT_MAX_HEIGHT,
  DEFAULT_MACBOOK_VIEWPORT_MAX_WIDTH,
  DEFAULT_START_SECONDS,
  DEFAULT_USER_EMAIL,
  DEFAULT_USER_NAME,
  DEMO_LOGIN_EMAIL,
  DEMO_LOGIN_PASSWORD,
} from './demo/constants'
import { CONTENT_ITEMS } from './demo/contentItems'
import { getJsonDownloadContent } from './demo/jsonExport'
import {
  clearPersistedSession,
  loadPersistedSession,
  savePersistedSession,
} from './demo/sessionStorage'
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
import { useDemoPlayback } from './demo/useDemoPlayback'

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

  const handleLogin = () => {
    // Prototype auth: the only accepted credentials are the autofilled pair.
    // Trim + case-insensitive email match so trivial whitespace/case tweaks
    // still pass, but anything actually different is rejected.
    const emailMatches =
      loginUsername.trim().toLowerCase() === DEMO_LOGIN_EMAIL.toLowerCase()
    const passwordMatches = loginPassword === DEMO_LOGIN_PASSWORD
    if (!emailMatches || !passwordMatches) {
      setLoginError('Invalid email or password. Please try again.')
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
      setExpandedSelectedTaxonomies((prev) =>
        prev.length > 0 && prev.includes(selectedTaxonomy) ? prev : [selectedTaxonomy]
      )
    }
    setExpandedPanel(panel)
  }

  const closeExpandedPanel = () => {
    setExpandedPanel(null)
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
                  activeSceneIndex={demoPlayback.activeSceneIndex}
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
                  onVideoTimeChange={setVideoCurrentSeconds}
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
        productEntries={demoPlayback.productEntries}
        productsUnavailableMessage={demoPlayback.productsUnavailableMessage}
        hasReachedFirstProduct={demoPlayback.hasReachedFirstProduct}
        taxonomyAvailability={demoPlayback.taxonomyAvailability}
        activeSceneIndex={demoPlayback.activeSceneIndex}
        isSyncImpulseMode={demoPlayback.isSyncImpulseMode}
        isAdBreakPlayback={demoPlayback.isAdBreakPlayback}
        activeScene={demoPlayback.activeScene}
        activeAdBreakLabel={demoPlayback.activeAdBreakLabel}
        adDecisionPayload={demoPlayback.adDecisionPayload}
        adDecisioningTail={demoPlayback.adDecisioningTail}
        videoCurrentSeconds={videoCurrentSeconds}
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
    </Box>
  )
}

export default App
