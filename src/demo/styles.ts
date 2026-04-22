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
  if (visiblePanelCount === 0) {
    return {
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
  }

  if (visiblePanelCount === 1) {
    return {
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
  }

  return {
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
