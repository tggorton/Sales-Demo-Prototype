import type { PlayerControlTokens } from './types'

export const tooltipStyles = {
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

export const navButtonStyles = (isActive: boolean) => ({
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

export const getPlayerControlTokens = (visiblePanelCount: number): PlayerControlTokens => {
  // Slim defaults across all states. Phase 9-follow-up trim — the previous
  // tokens reserved enough vertical space that the bottom strip felt
  // chunky in the 2+ panel "small player" state. Cuts: lower overlayPy
  // (the gradient strip's top/bottom padding), shorter sliderContainer,
  // smaller timeline + thumb, smaller play/mute icons in the small
  // states. The 0-panel "full player" state stays roomier since vertical
  // real estate isn't constrained there.
  if (visiblePanelCount === 0) {
    return {
      overlayPx: 2,
      overlayPy: 0.8,
      timelineHeight: 6,
      timelineTop: 8,
      sliderContainerHeight: 22,
      thumbSize: 14,
      playIconSize: 30,
      secondaryIconSize: 22,
      controlButtonPadding: 0.4,
      timeFontSize: 13,
      timeWidth: 92,
      controlBarHeight: 44,
    }
  }

  if (visiblePanelCount === 1) {
    return {
      overlayPx: 1.5,
      overlayPy: 0.6,
      timelineHeight: 6,
      timelineTop: 7,
      sliderContainerHeight: 20,
      thumbSize: 12,
      playIconSize: 26,
      secondaryIconSize: 20,
      controlButtonPadding: 0.35,
      timeFontSize: 12,
      timeWidth: 86,
      controlBarHeight: 38,
    }
  }

  return {
    overlayPx: 1.2,
    overlayPy: 0.5,
    timelineHeight: 5,
    timelineTop: 6.5,
    sliderContainerHeight: 18,
    thumbSize: 11,
    playIconSize: 22,
    secondaryIconSize: 18,
    controlButtonPadding: 0.3,
    timeFontSize: 11,
    timeWidth: 78,
    controlBarHeight: 32,
  }
}

export const panelPaperStyles = {
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

export const panelHeaderIconButtonStyles = {
  width: 26,
  height: 26,
  p: 0,
  color: '#ED005E',
  '&:hover': { bgcolor: 'rgba(237,0,94,0.08)' },
}

export const panelHeaderIconButtonDarkStyles = {
  ...panelHeaderIconButtonStyles,
  color: '#ffffff',
  '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' },
}

export const panelHeaderActionIconSx = { fontSize: 14 }

export const dropdownMagentaStyles = {
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

// Shared "Scene N · 0:00" anchor used as the scene divider in both the
// Taxonomy and Products panels (collapsed and expanded views). One source of
// truth so the panels visually rhyme – both show the same anchor at the same
// size, color, and opacity. Sized halfway between body text (12pt) and the
// previous oversized 28pt anchor; weight 500 keeps it readable at the smaller
// size without making it dominant over the section labels (12pt / 700) below.
//
// `mb` is intentionally generous (8px). The anchor lives directly above
// content of very different visual weight in each panel – soft body text in
// Taxonomy, a hard-edged 54px product image in Products – so a tight gap
// reads cramped on the Products side. 8px gives both panels a comfortable
// breathing room while keeping them consistent (since both consume this same
// token).
export const sceneAnchorStyles = {
  fontSize: 14,
  fontWeight: 500,
  color: '#A1A1A1',
  lineHeight: 1.2,
  opacity: 0.95,
  mb: 1,
}

export const taxonomyAutocompleteStyles = {
  ...dropdownMagentaStyles,
  '& .MuiAutocomplete-inputRoot': {
    minHeight: 56,
    alignItems: 'flex-start',
    py: 0.5,
  },
  '& .MuiAutocomplete-tag': {
    height: 25.27,
    borderRadius: '104.48px',
    fontSize: 11.5,
    backgroundColor: '#F1F2F4',
  },
}
