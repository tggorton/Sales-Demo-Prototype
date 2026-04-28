import { Box, type BoxProps } from '@mui/material';
import { useTheme } from '@mui/material/styles';

/**
 * Root layout wrapper that applies the KERV gradient background.
 *
 * Wrap your entire app (or the main content area) with this component to get
 * the branded pink-to-lavender gradient that stays fixed while content scrolls.
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <AppShell>
 *       <Header />
 *       <GlassSection sx={{ m: 3, p: 3 }}>
 *         <Typography>Page content</Typography>
 *       </GlassSection>
 *     </AppShell>
 *   );
 * }
 * ```
 */
export function AppShell({ children, sx = [], ...props }: BoxProps) {
  const theme = useTheme();

  return (
    <Box
      sx={[
        {
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          background: theme.customBackground.gradient,
          backgroundAttachment: 'fixed',
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...props}
    >
      {children}
    </Box>
  );
}
