# Design System Reference

**Audience:** Engineers, designers, and AI tools picking up this codebase.
**Last verified:** 2026-04-27 against `feat/restructuring-pass`.

This is a static inventory of every MUI component, theme token, and
styling pattern in the project. It exists so a new contributor can answer
"is there already a token for this?" in seconds rather than grepping.

> **TL;DR**
>
> - **MUI 7 + Emotion**, default theme (no custom `<ThemeProvider>` yet).
> - **Style tokens live in [`src/demo/styles.ts`](src/demo/styles.ts)** — 10 exported objects covering tooltips, nav buttons, panel chrome, dropdown styling, etc.
> - **Brand magenta `#ED005E` is the primary accent.** Used in 27 places, currently as a hardcoded hex literal everywhere.
> - **185 inline `sx={{ }}` props** across the codebase; 75% of them are in the two largest files (`DemoView.tsx` and `ExpandedPanelDialog.tsx`).
> - **No global theme** — extracting `createTheme()` is recommended in Phase 1 of the restructuring (see `RESTRUCTURING_PLAN.md`).
> - **Roboto** is the default body font, set in [`src/index.css`](src/index.css).

---

## 1. MUI Components in Use

### High-frequency (the building blocks)

| Component | Approx usages | Exemplar locations |
|---|---|---|
| `Box` | 11+ files | [App.tsx:361-367](src/App.tsx#L361-L367), [LoginView.tsx:38-45](src/demo/components/LoginView.tsx#L38-L45) |
| `Typography` | 9+ files | [AuthenticatedHeader.tsx:31-36](src/demo/components/AuthenticatedHeader.tsx#L31-L36), [LoginView.tsx:54-58](src/demo/components/LoginView.tsx#L54-L58) |
| `Stack` | 10+ files | [LoginView.tsx:47-48](src/demo/components/LoginView.tsx#L47-L48), DemoView.tsx (multiple) |
| `Button` | 5 files | [LoginView.tsx:99-105](src/demo/components/LoginView.tsx#L99-L105), SelectorDialog.tsx |
| `IconButton` | 4 files | [AuthenticatedHeader.tsx:39](src/demo/components/AuthenticatedHeader.tsx#L39), DemoView.tsx |
| `Dialog`, `DialogContent`, `DialogTitle`, `DialogActions` | 4 files | SelectorDialog.tsx, JsonDownloadDialog.tsx, ExpandedPanelDialog.tsx, VerifyEmailDialog.tsx |
| `Select`, `MenuItem`, `FormControl`, `InputLabel` | Multiple | ContentSelectionView.tsx, SelectorDialog.tsx |

### Singleton / single-purpose

| Component | File | Use |
|---|---|---|
| `Paper` | [App.tsx:369](src/App.tsx#L369), [LoginView.tsx:21-32](src/demo/components/LoginView.tsx#L21-L32) | Layout containers |
| `Container` | [App.tsx:368](src/App.tsx#L368) | 1440px max-width wrapper |
| `Drawer` | [ProfileDrawer.tsx](src/demo/components/ProfileDrawer.tsx) | Right-side profile panel |
| `Menu` | [AuthenticatedHeader.tsx:44-66](src/demo/components/AuthenticatedHeader.tsx#L44-L66) | Profile dropdown |
| `TextField` | LoginView.tsx, ProfileDrawer.tsx | Login + profile inputs |
| `Divider` | ProfileDrawer.tsx | Visual separator |
| `Autocomplete` (multi-select) | ExpandedPanelDialog.tsx | Taxonomy multi-select in expanded view |
| `Tooltip` | DemoView.tsx | Panel toggle hover hints |

### Icons (`@mui/icons-material`)

11 unique icons across the app. Concentrated in DemoView.tsx (~10), ExpandedPanelDialog.tsx (~5), and a handful of singletons elsewhere.

`ArrowBack`, `CloseOutlined`, `DataObjectOutlined`, `DownloadOutlined`, `ExpandMore`, `ExpandLess`, `PlayArrowRounded`, `PauseRounded`, `VolumeUpRounded`, `VolumeOffRounded`, `Person`, `CheckBox`, `CheckBoxOutlineBlank`, `ShoppingCartOutlined`.

---

## 2. Theme & Tokens

### Where tokens live today

[`src/demo/styles.ts`](src/demo/styles.ts) is the **only** source of truth for shared style objects. There is **no `<ThemeProvider>`** — MUI's default theme is in effect everywhere.

### Exported style objects

| Token | Purpose | Key values |
|---|---|---|
| `tooltipStyles` | Hover tooltips | `bgcolor: '#666'`, white text, 14px, `borderRadius: 1`, `px: 1.25`, `py: 0.6` |
| `navButtonStyles(isActive)` | Top-bar / navigation buttons | 36px square, `borderRadius: '5px'`, 120ms color transition; active `rgba(0,0,0,0.12)`; hover `rgba(0,0,0,0.084)` |
| `getPlayerControlTokens(visibleCount)` | Responsive player controls (sized by 0/1/2+ visible side panels) | `timelineHeight: 8–11px`, `thumbSize: 14–18px`, `controlBarHeight: 52–56px`, `overlayPx/Py: 1.2–2`, `timeFontSize: 12–14px` |
| `panelPaperStyles` | Video & side-panel container | `borderRadius: 0`, `border: 0.73px solid rgba(0,0,0,0.22)`, `bgcolor: '#fff'`, `boxShadow: 'none'`, flex column |
| `panelHeaderIconButtonStyles` | Panel header action buttons (light) | 26px square, `color: '#ED005E'`, hover `rgba(237,0,94,0.08)` |
| `panelHeaderIconButtonDarkStyles` | Dark variant | white icon, hover `rgba(255,255,255,0.12)` |
| `panelHeaderActionIconSx` | Icon size override | `fontSize: 14` |
| `dropdownMagentaStyles` | `Select` / `Autocomplete` magenta theming | Focused label `#ED005E`, focused outline `#ED005E` width 2px, hover `rgba(237,0,94,0.6)` |
| `sceneAnchorStyles` | "Scene N · 0:00" divider | `fontSize: 14`, `fontWeight: 500`, `color: '#A1A1A1'`, `opacity: 0.95` |
| `taxonomyAutocompleteStyles` | Taxonomy multi-select chips | Composed from `dropdownMagentaStyles`; `inputRoot.minHeight: 56`, tag pill `height: 25.27px`, `borderRadius: 104.48px`, `fontSize: 11.5`, `bgcolor: '#F1F2F4'` |

### Color palette (extracted from inline + token usage)

**Brand**

| Hex | Role | Usage count | Example |
|---|---|---|---|
| `#ED005E` | Primary magenta | ~27 | LoginView submit button, all primary CTAs, focus rings |
| `#9A1B52` | Sign-out / dark magenta | 1 | [AuthenticatedHeader.tsx:63](src/demo/components/AuthenticatedHeader.tsx#L63) |
| `#CF0052` | Magenta hover variant | 1 | [LoginView.tsx:102](src/demo/components/LoginView.tsx#L102) |

**Neutrals**

| Hex | Role |
|---|---|
| `#FFFFFF` | White (icon button dark variant) |
| `#666` | Tooltip dark gray |
| `#A1A1A1` | Scene anchor mid-gray |
| `#F1F2F4` | Tag chip background |

**Opacity scale (`rgba(0,0,0,…)`)**

Used for text emphasis, hover, borders. **Inconsistently applied today** — same opacity values are written several different ways across files.

| Alpha | Common role |
|---|---|
| `0.87` | Text primary |
| `0.6` | Text secondary |
| `0.56`, `0.54`, `0.38` | Lighter text / disabled |
| `0.22` | Panel borders |
| `0.12`, `0.08`, `0.084` | Hover, light borders, inactive |
| `0.20`, `0.18`, `0.14`, `0.05` | Various semantic uses |

### Typography

- **Font family:** Roboto, set globally in [`src/index.css`](src/index.css):
  ```css
  body { font-family: Roboto, Helvetica, Arial, sans-serif; }
  ```
- **MUI variants used:** `h4`, `h6`, `button`, plus inline overrides.
- **Inline sizes seen:** `fontSize: 11.5 / 12 / 14 / 22`, weights `400 / 500 / 600 / 700`, line-heights `'32px'`, letter-spacings `0.2`.

### Spacing

MUI's 8px grid is the base. The codebase mixes:

- Grid units (`px: 2.5`, `py: 1.2`)
- Pixel literals (`gap: '80px'`)
- Decimal grid units (`mt: 0.8`)

This is technically valid but inconsistent. Phase 1 of the restructuring proposes standardizing.

### Border radius

| Value | Where |
|---|---|
| `0` | Panel containers (intentionally square) |
| `5px` | Nav buttons |
| `1` (8px) | Tooltip |
| `2` (16px) | Login `Paper`, App.tsx outer `Paper` |
| `104.48px` | Taxonomy tag pill (oddly specific — likely Figma-derived; consider rounding to a pill class like `9999px`) |

---

## 3. Inline `sx` Density

185 total inline `sx={{ }}` usages. By file:

| File | sx count | LOC | % styled | Notes |
|---|---|---|---|---|
| [DemoView.tsx](src/demo/components/DemoView.tsx) | **84** | 1034 | 8.1% | 45% of all inline sx in the project |
| [ExpandedPanelDialog.tsx](src/demo/components/ExpandedPanelDialog.tsx) | **41** | 519 | 7.9% | Duplicates much of DemoView's panel rendering |
| [ProfileDrawer.tsx](src/demo/components/ProfileDrawer.tsx) | 11 | 114 | 9.6% | |
| [ContentSelectionView.tsx](src/demo/components/ContentSelectionView.tsx) | 8 | 108 | 7.4% | |
| [VerifyEmailDialog.tsx](src/demo/components/VerifyEmailDialog.tsx) | 7 | 48 | 14.6% | |
| [SelectorDialog.tsx](src/demo/components/SelectorDialog.tsx) | 7 | 115 | 6.1% | |
| [LoginView.tsx](src/demo/components/LoginView.tsx) | 7 | 132 | 5.3% | |
| [JsonDownloadDialog.tsx](src/demo/components/JsonDownloadDialog.tsx) | 7 | 94 | 7.4% | |
| [AuthenticatedHeader.tsx](src/demo/components/AuthenticatedHeader.tsx) | 5 | 69 | 7.2% | |

### Patterns repeated inline that should become tokens

```tsx
// Brand magenta inline (~27×)
sx={{ color: '#ED005E', /* … */ }}

// Text-secondary opacity (9×)
sx={{ color: 'rgba(0,0,0,0.6)', /* … */ }}

// Panel padding pattern
sx={{ px: 2.5, py: 2, height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}

// Header typography
sx={{ fontWeight: 500, fontSize: 22, lineHeight: '32px', opacity: 0.87 }}
```

---

## 4. Inconsistencies to Flag

| Issue | Impact | Fix direction |
|---|---|---|
| **`#ED005E` hardcoded in 27 places** | Rebrand requires touching all 27 | Extract to `theme/colors.ts` as `colors.brand.magenta` |
| **Opacity scale not unified** | 10+ unique alpha values, no semantic naming | Define an `alpha.text.primary / .secondary / .tertiary` scale |
| **Spacing mixes units** | `px: 2.5`, `gap: '80px'`, `mt: 0.8` all in the same codebase | Standardize on MUI's 8px grid; reserve px literals for specific Figma overrides |
| **Border radius is ad-hoc** | `5px`, `0`, `104.48px` hardcoded | A small radius token set: `radius.none / sm (4px) / md (8px) / lg (16px) / pill (9999px)` |
| **DemoView panel rendering duplicates ExpandedPanelDialog** | ~250 LOC of card layout copy-paste | Extract shared `<TaxonomyPanelContent>`, `<ProductPanelContent>`, `<JsonPanelContent>` (RESTRUCTURING_PLAN Phase 2) |
| **No `<ThemeProvider>`** | Can't override MUI defaults globally; component variants and palette are unreachable | Add `createTheme()` once colors/typography tokens are extracted |
| **Mixed `Stack` vs `Box` for flex layouts** | Inconsistent reading; some files reach for `Stack`, others for `<Box sx={{ display: 'flex' }}>` | Convention: `Stack` for one-axis layouts, `Box` for everything else |
| **Dialog header styling duplicated** | All 4 dialogs reimplement title + close-button rows | Extract a `<DialogTitleBar>` primitive |

---

## 5. Asset References Used in Styles

| Asset | Where it's referenced | Pattern |
|---|---|---|
| `/assets/kerv-logo.svg` | LoginView, AuthenticatedHeader | `<Box component="img" src="/assets/kerv-logo.svg">` |
| `/assets/login-hero.jpg` | LoginView | `<Box component="img" />` with `objectFit: 'cover'`, tuned `objectPosition` |
| `/assets/posters/{id}.jpg` | ContentSelectionView | `backgroundImage: url(${item.posterUrl})` (dynamic) |
| `/assets/ads/ad-1-impulse-target.png`, `ad-2` | DemoView (legacy placeholder ad break) | `backgroundImage: url(${activeAdBreakImage})` |

All assets resolve via Vite's `/public/` folder. **Future S3 swap** routes through `VITE_*` env overrides defined in `src/demo/constants.ts` (see `RESTRUCTURING_PLAN.md` for the full source-resolver plan).

---

## 6. Recommended Evolution

### Phase 1 — Foundation (~0.5 day)

Extract a real theme module so the magenta-everywhere problem becomes a single point of change:

```
src/theme/
  index.ts        # createTheme() + re-exports
  colors.ts       # brand + neutral palette + alpha scale
  typography.ts   # named text styles (header / label / caption / time / button)
  spacing.ts      # named spacing tokens
  radius.ts       # named radius tokens
```

Wrap the app with `<ThemeProvider theme={appTheme}>` in `src/main.tsx`. Replace `#ED005E` literals with `theme.palette.brand.magenta` access inside `sx` props.

### Phase 2 — Component primitives (~0.5–1 day)

Pull the repeated UI patterns into reusable primitives so feature components stop reimplementing them:

```
src/demo/components/primitives/
  PanelGlyph.tsx           # already exists; move here
  PanelHeader.tsx          # icon + title + close/expand row (reused 4×)
  DialogTitleBar.tsx       # title + close-button row used by every dialog
  SceneAnchor.tsx          # "Scene N · 0:00" divider
  EmptyStateMessage.tsx    # standard empty-panel copy block
```

### Phase 3 — Optional / future

- **Storybook** for visual review of the primitives + dialog states. Real maintenance cost; only worth it once the primitives stabilize.
- **CSS-in-JS via `styled()`** for the highest-volume primitives, replacing inline `sx` for components that ship to lots of consumers.
- **Dark mode** via `createTheme({ palette: { mode } })` once a design exists for it.

### Out of scope (intentionally deferred)

- A full design-token export for cross-platform reuse.
- Replacing MUI with another component library.
- A visual regression test harness — defer until the panel decomposition lands so visual diffs are scoped to specific primitives.

---

## 7. Quick Reference for New Contributors

When you're about to write `sx={{ … }}` inline:

1. **Is the value already a token?** Skim [`src/demo/styles.ts`](src/demo/styles.ts) — if there's a relevant export, use it.
2. **Is the value `#ED005E` or any opacity literal?** It probably should be a token; either propose adding one or use the closest existing match.
3. **Is the same pattern already in another file?** Grep for it. If yes, propose a primitive extraction in your PR.
4. **Are you extending an existing component (Dialog, Panel, etc.)?** Check this doc's primitives list — there's likely a planned slot for what you're building.
