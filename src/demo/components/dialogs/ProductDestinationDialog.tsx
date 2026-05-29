import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded'
import { Box, Button, Dialog, IconButton, Stack, Typography } from '@mui/material'
import { QRCodeSVG } from 'qrcode.react'
import type { PauseProductDestinationTarget } from '../player/pause-overlay/pauseOverlay.types'

type ProductDestinationDialogProps = {
  open: boolean
  product: PauseProductDestinationTarget | null
  onClose: () => void
}

// Click-out rendering mode for the pause-overlay product modal:
//   'preview' — Option B: render an in-app product preview (image, title,
//               description, price, QR, "open in new tab"). Use this because
//               many retailers (Home Depot, etc.) block iframing their pages
//               via X-Frame-Options / CSP, so the live page renders blank.
//   'iframe'  — legacy: embed the destination URL in an iframe (works for
//               frame-friendly destinations; blank for blockers — header still
//               offers "open in new tab").
// To revert Option B, flip this to 'iframe'.
const PRODUCT_DESTINATION_MODE: 'preview' | 'iframe' = 'preview'

/**
 * Desktop-aspect modal opened when the user clicks a product detail surface in
 * the pause-overlay flow (CTA Pause / Organic Pause). Deliberately distinct
 * from `CompanionDialog` (mobile-aspect Sync companion).
 *
 * Default mode is an **in-app product preview** (Option B) rather than an
 * iframe of the retailer's page, because retailer pages commonly block
 * embedding. The preview shows the product image, title, description, price,
 * and a QR + button that open the real product page in a new tab.
 */
export function ProductDestinationDialog({
  open,
  product,
  onClose,
}: ProductDestinationDialogProps) {
  const url = product?.url ?? ''

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
      {/* Header strip: destination URL (truncated) + open-in-new-tab + close.
          Always visible so the user has a clear escape hatch to the real page. */}
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
          {url}
        </Typography>
        <IconButton
          aria-label="open destination in new tab"
          component="a"
          href={url || undefined}
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

      {PRODUCT_DESTINATION_MODE === 'preview' ? (
        // ── Option B: in-app product preview ──────────────────────────────
        <Stack
          direction="row"
          sx={{ flex: 1, minHeight: 0, bgcolor: '#fff' }}
        >
          {/* Product image (left). Gray fallback when missing/not loaded. */}
          <Box
            sx={{
              width: '44%',
              minWidth: 0,
              bgcolor: '#f0f0f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              p: 4,
            }}
          >
            {product?.imageSrc ? (
              <Box
                component="img"
                src={product.imageSrc}
                alt={product.title}
                sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              />
            ) : (
              <Box sx={{ width: '80%', aspectRatio: '1', bgcolor: '#ddd', borderRadius: 1 }} />
            )}
          </Box>

          {/* Product copy + QR (right). */}
          <Stack spacing={2.5} sx={{ flex: 1, minWidth: 0, p: 4, overflowY: 'auto' }}>
            <Typography sx={{ fontSize: 24, fontWeight: 700, lineHeight: 1.25 }}>
              {product?.title}
            </Typography>
            {product?.price ? (
              <Typography sx={{ fontSize: 22, fontWeight: 700, color: 'primary.main' }}>
                {product.price}
              </Typography>
            ) : null}
            {product?.description ? (
              <Typography sx={{ fontSize: 15, color: 'rgba(0,0,0,0.72)', lineHeight: 1.5 }}>
                {product.description}
              </Typography>
            ) : null}

            <Stack direction="row" spacing={3} alignItems="center" sx={{ pt: 1 }}>
              {url ? (
                <Stack alignItems="center" spacing={0.75}>
                  <Box sx={{ p: 1, bgcolor: '#fff', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 1 }}>
                    <QRCodeSVG value={url} size={104} />
                  </Box>
                  <Typography sx={{ fontSize: 11, color: 'rgba(0,0,0,0.55)' }}>
                    Scan to shop
                  </Typography>
                </Stack>
              ) : null}
              <Button
                component="a"
                href={url || undefined}
                target="_blank"
                rel="noopener noreferrer"
                variant="contained"
                endIcon={<OpenInNewRoundedIcon />}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                Open product page
              </Button>
            </Stack>
          </Stack>
        </Stack>
      ) : (
        // ── Legacy iframe body (frame-friendly destinations only) ─────────
        <Box sx={{ flex: 1, minHeight: 0, bgcolor: '#fff' }}>
          {url && (
            <Box
              component="iframe"
              src={url}
              title="Product destination"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
              referrerPolicy="no-referrer-when-downgrade"
              sx={{ width: '100%', height: '100%', border: 0, display: 'block' }}
            />
          )}
        </Box>
      )}
    </Dialog>
  )
}
