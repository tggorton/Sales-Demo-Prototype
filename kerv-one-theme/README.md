# KERV UI Kit — `@kerv-one/theme`

> **This is not a component library.** This is our theme — the single config file that makes every standard MUI component look like KERV. Build with stock MUI components and they'll inherit the right styles automatically.

---

## What the package provides

| Export | Purpose |
|--------|---------|
| `theme` (alias: `kervTheme`) | A complete MUI **v6** theme: palette, typography, and default styles for common components |
| `AppShell` | Wrapper that paints the **full-viewport KERV gradient** behind your UI |
| `GlassSection` | **Frosted-glass** container for main content on top of the gradient |

```ts
import { theme, AppShell, GlassSection } from '@kerv-one/theme';
```

---

## Installing the package

Install with the path to this folder (or however your KERV contact delivers it):

```bash
npm install ./kerv-one-theme
# or
npm install file:./path/to/kerv-one-theme
```

You can also add it directly in your `package.json`:

```json
"@kerv-one/theme": "file:./kerv-one-theme"
```

> **Implementation note:** The package entry points at **TypeScript source** (`.ts` / `.tsx`). Modern bundlers such as **Vite** handle this out of the box. If your build fails on `.ts` inside `node_modules`, enable transpilation for `@kerv-one/theme` (for example Next.js `transpilePackages`, or the equivalent for your toolchain).

---

## Required stack versions

Use versions **compatible with KERV's theme** so types and component overrides behave correctly:

| Dependency | Version |
|------------|---------|
| `react` / `react-dom` | **^19.0.0** |
| `@mui/material` | **^6.4.0** |
| `@emotion/react` | **^11.14.0** |
| `@emotion/styled` | **^11.14.0** |
| `typescript` | **~5.6** (recommended) |

Optional: `@mui/icons-material@^6.4.0` for icons.

Example install:

```bash
npm install react react-dom @mui/material @emotion/react @emotion/styled
```

---

## Step 1 — Load the brand font

The theme expects **Open Sans**. Add these tags to your app's HTML shell (for example `index.html` in a Vite app):

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
```

Without this, text will fall back to system fonts and no longer match KERV products.

---

## Step 2 — Provide the theme at the root

Wrap your application with MUI's `ThemeProvider`, pass in `theme` from `@kerv-one/theme`, and include `CssBaseline` once at the root.

Example entry file (`main.tsx`):

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { theme } from '@kerv-one/theme';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </StrictMode>
);
```

After this, **standard MUI components** (`Button`, `TextField`, `Dialog`, `Table`, etc.) pick up KERV styling automatically.

---

## Step 3 — Use the gradient background and glass panels

1. Wrap your app in **`AppShell`** so the KERV gradient fills the viewport.
2. Place primary content inside **`GlassSection`** (optionally inside a `Container` for max width).

Example `App.tsx`:

```tsx
import { Container, Typography } from '@mui/material';
import { AppShell, GlassSection } from '@kerv-one/theme';

export default function App() {
  return (
    <AppShell>
      {/* Your header or navigation */}
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <GlassSection sx={{ p: { xs: 2, md: 3 } }}>
          <Typography variant="h5" gutterBottom>
            Your demo
          </Typography>
          <Typography color="text.secondary">
            Add routes, forms, and tables using normal MUI components.
            They inherit KERV styling automatically.
          </Typography>
        </GlassSection>
      </Container>
    </AppShell>
  );
}
```

### `<AppShell>`

- Fixed gradient background; content scrolls over it.
- Accepts MUI `Box` props (`sx`, etc.).

### `<GlassSection>`

- Translucent panel with blur and gradient-border treatment.
- Use `sx` for padding, layout, and responsive overrides.

---

## Styling guidance

- Prefer **`sx` props** and **`theme` values** (e.g. `theme.palette.primary.main`) over hardcoded hex colors so the demo stays aligned with future theme updates.
- The theme adds custom palette keys (glass surfaces, extended accent scales, etc.). Explore `theme.palette` in your editor via `useTheme()` from MUI.

### Key palette tokens

| Token | Value | Usage |
|-------|-------|-------|
| `primary.main` | `#ED005E` | KERV pink — buttons, links, active states |
| `primary.light` | `#F24C91` | Hover tints |
| `primary.dark` | `#DC005C` | Pressed states |
| `primary.hover` | `rgba(237, 0, 94, 0.08)` | Subtle hover backgrounds |
| `success.main` | `#0EB367` | Success states |
| `error.main` | `#F44336` | Error states (full scale: lightest through darkest) |
| `indigo.*` | 5-stop scale from `#C3C9E6` to `#3B4EAB` | Secondary accent |
| `amber.*` | 5-stop scale from `#FFF8E1` to `#FF6F00` | Warning / highlight |
| `grey.300–700` | `#A1A1A1` → `#292929` | Neutral scale |
| `glassSection.*` | Various | Glass panel tokens (used by `GlassSection`) |

### Custom tokens (via TS augmentation)

These are KERV-specific extensions — your IDE will autocomplete them:

```tsx
// Glass morphism (for overlay/container effects)
theme.palette.glass.background       // 'rgba(255, 255, 255, 0.1)'
theme.palette.glass.backdropFilter   // 'blur(10px)'
theme.palette.glassSection.background // 'rgba(255, 255, 255, 0.5)'

// App background gradient
theme.customBackground.gradient       // pink-to-lavender linear gradient

// Taxonomy category colors (for content classification UI)
theme.palette.taxonomy.object.bg
theme.palette.taxonomy.location.bg
theme.palette.taxonomy.sentiment.bg
// ... etc
```

### Typography

- **Font**: Open Sans
- **Variants customized**: `h5` (400/24px), `h6` (600), `body1` (400/16px), `button` (600/14px/uppercase)
- All other MUI variants (h1–h4, body2, caption, etc.) use MUI defaults with Open Sans

---

## Built-in MUI overrides

The theme adjusts defaults for these components:

| Component | What changes |
|-----------|--------------|
| **Buttons** | No box-shadow on any variant; text buttons use `primary.hover` background |
| **Dialogs** | Frosted glass: semi-transparent white, backdrop blur, rounded 16px, gradient border |
| **Drawers** | Same frosted glass treatment |
| **Tables** | Fixed 52px row height, 14px body text, transparent backgrounds, divider borders |
| **Chips** | Status classes: `.status-active` (green), `.status-inactive` (amber), `.status-unverified` (grey) |
| **Paper** | No elevation/shadow by default |
| **Selects** | Scroll lock disabled, subtle border on dropdown |
| **Alerts** | 8px radius, padding 12/20, elevated shadow |
| **Snackbars** | Slide-in animation from bottom |
| **Scrollbars** | Slim 8px, transparent track, subtle thumb |

---

## Design rules

1. **Use theme tokens, never hardcoded values.** Colors via `theme.palette.*`, spacing via `theme.spacing()`. If a design calls for a value that doesn't exist in the theme, flag it — we'll add it.
2. **Use the `sx` prop for component-level styling.** This is the standard pattern in our codebase.
3. **Use stock MUI components.** Don't wrap them in custom abstractions unless there's real logic to encapsulate. Buttons should be `<Button>`, not `<KervButton>`. The theme handles the look.
4. **WCAG 2.1 AA.** Proper color contrast, semantic HTML, keyboard navigation, ARIA attributes.

---

## What this kit does NOT include

- **No component library.** Use standard MUI components. The theme styles them.
- **No Storybook.**
- **No published npm package.** Install from the folder as described above.

If you need a component that feels KERV-specific (beyond what the theme + stock MUI gives you), reach out before building it — we may already have a pattern.

---

## Troubleshooting

| Problem | What to verify |
|---------|----------------|
| Font looks wrong | Open Sans `<link>` in HTML; include weights **300, 400, 500, 600, 700**. |
| Looks like unstyled MUI | Root must use `ThemeProvider` + `theme` from `@kerv-one/theme` and `CssBaseline`. |
| Build errors in the theme package | Bundler must transpile `.ts` in `@kerv-one/theme`; Vite does this by default. Ensure MUI **v6** and Emotion versions match the table above. |
| TypeScript errors on `theme.palette` | Ensure you are on MUI **v6** and that you do not shadow the `theme` import. The package augments `@mui/material/styles` with custom palette keys. |
