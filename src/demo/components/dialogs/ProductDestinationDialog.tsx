import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded'
import { Box, Dialog, IconButton, Stack, Typography } from '@mui/material'

type ProductDestinationDialogProps = {
  open: boolean
  selectedUrl: string
  onClose: () => void
}

/**
 * Desktop-aspect modal opened when the user clicks a product detail
 * surface in the pause-overlay flow (CTA Pause / Organic Pause).
 *
 * Deliberately distinct from `CompanionDialog`:
 *   - The companion modal is mobile-aspect (340 × 760) because the
 *     KERV companion is a phone-first shoppable iframe.
 *   - This dialog is desktop-aspect (≈ 1100 × 720) because the
 *     pause-overlay click-out is a traditional product website.
 *
 * The iframe is best-effort — many real-world product pages block
 * embedding via `X-Frame-Options` / `Content-Security-Policy`, so a
 * persistent "Open in new tab" affordance lives in the header for
 * the destinations that won't render inline.
 */
export function ProductDestinationDialog({
  open,
  selectedUrl,
  onClose,
}: ProductDestinationDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      PaperProps={{
        sx: {
          width: 1100,
          maxWidth: '92vw',
          height: 720,
          maxHeight: '90vh',
          borderRadius: 1.5,
          overflow: 'hidden',
          boxShadow:
            '0 11px 15px -7px rgba(0,0,0,0.2), 0 24px 38px 3px rgba(0,0,0,0.14), 0 9px 46px 8px rgba(0,0,0,0.12)',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      {/* Header strip: destination URL (truncated) + open-in-new-tab
          + close. Header is always visible so the user has a clear
          escape hatch when the iframe fails to render. */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.5}
        sx={{
          px: 2,
          py: 1,
          borderBottom: '1px solid rgba(0,0,0,0.12)',
          bgcolor: '#f5f5f5',
        }}
      >
        <Typography
          sx={{
            fontSize: 13,
            color: 'rgba(0,0,0,0.7)',
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {selectedUrl}
        </Typography>
        <IconButton
          aria-label="open destination in new tab"
          component="a"
          href={selectedUrl || undefined}
          target="_blank"
          rel="noopener noreferrer"
          size="small"
          sx={{ color: 'primary.main' }}
        >
          <OpenInNewRoundedIcon fontSize="small" />
        </IconButton>
        <IconButton
          aria-label="close product destination modal"
          onClick={onClose}
          size="small"
          sx={{ color: 'primary.main' }}
        >
          <CloseOutlinedIcon fontSize="small" />
        </IconButton>
      </Stack>

      {/* Iframe body. White background so empty/blocked iframes don't
          show as a hole in the modal — the header still gives the
          user a way to navigate to the destination. */}
      <Box sx={{ flex: 1, minHeight: 0, bgcolor: '#fff' }}>
        {selectedUrl && (
          <Box
            component="iframe"
            src={selectedUrl}
            title="Product destination"
            // `sandbox` restricts the iframe's capabilities. Allowing
            // `scripts` + `same-origin` keeps the destination
            // functional, while the *absence* of `allow-top-navigation`
            // defeats the most common framebuster pattern
            // (`if (top !== self) top.location = self.location`).
            // Some major retailers still render blank inside an
            // iframe regardless — at that point only a backend
            // proxy or a click-out can show the page.
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
            referrerPolicy="no-referrer-when-downgrade"
            sx={{ width: '100%', height: '100%', border: 0, display: 'block' }}
          />
        )}
      </Box>
    </Dialog>
  )
}
