import { Box } from '@mui/material'

type PanelGlyphProps = {
  variant: 'expand' | 'collapse'
  color: string
  size?: number
}

export function PanelGlyph({ variant, color, size = 12 }: PanelGlyphProps) {
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
