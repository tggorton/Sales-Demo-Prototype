import { Box, type BoxProps } from '@mui/material';
import { useTheme } from '@mui/material/styles';

/**
 * Semi-transparent container with gradient border, backdrop blur, and rounded
 * corners. Reads styling tokens from `theme.palette.glassSection`.
 *
 * Designed to sit on top of the gradient background provided by `<AppShell>`.
 *
 * @example
 * ```tsx
 * <GlassSection sx={{ p: 3 }}>
 *   <Typography>Content here</Typography>
 * </GlassSection>
 * ```
 */
export function GlassSection({ children, sx = [], ...props }: BoxProps) {
  const theme = useTheme();

  return (
    <Box
      sx={[
        {
          position: 'relative',
          background: theme.palette.glassSection.background,
          backdropFilter: theme.palette.glassSection.backdropFilter,
          borderRadius: '16px',
          boxShadow: theme.palette.glassSection.boxShadow,
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            borderRadius: '16px',
            padding: '2px',
            background:
              'linear-gradient(130deg, #FFF 48.23%, rgba(146, 143, 143, 0.20) 99.6%)',
            WebkitMask:
              'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
            pointerEvents: 'none',
          },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...props}
    >
      {children}
    </Box>
  );
}
