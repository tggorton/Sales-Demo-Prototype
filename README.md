# Sales Demo Prototype

Interactive React + MUI prototype for the KERV sales demo experience. This project includes:

- login flow
- content selection flow
- demo playback view
- taxonomy, product, and JSON side panels
- expanded panel dialogs
- user profile and verification dialogs
- special `Exact Product Match` + `Sync: Impulse` playback handling

## Stack
- React 18
- TypeScript
- Vite
- MUI
- Emotion

## Run Locally
```bash
npm install
npm run dev
```

Local development server:
- `http://localhost:5173/`

Useful scripts:
- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run preview`

## Project Structure
```text
src/
  App.tsx                  # top-level app orchestration
  main.tsx                 # app entry
  index.css                # global base styles
  components/
    PanelGlyph.tsx         # shared expand/collapse panel icon
  demo/
    types.ts               # shared demo/app types
    constants.ts           # option lists, timing values, URLs, defaults
    contentItems.ts        # content selection tile data
    sceneMetadata.ts       # primary playback scene fixture data
    adFixtures.ts          # ad-break JSON fixture data
    taxonomySceneData.ts   # taxonomy display shaping helpers
    jsonExport.ts          # JSON payload/export builders
    styles.ts              # shared MUI sx tokens/helpers
    useDemoPlayback.ts     # playback timing, panel sync, derived demo state
    components/
      AuthenticatedHeader.tsx
      LoginView.tsx
      ContentSelectionView.tsx
      DemoView.tsx
      ExpandedPanelDialog.tsx
      SelectorDialog.tsx
      JsonDownloadDialog.tsx
      CompanionDialog.tsx
      ProfileDrawer.tsx
      VerifyEmailDialog.tsx
  utils/
    formatTime.ts          # viewer-facing mm:ss formatting helper
```

## Where To Make Changes

### App Flow
- `src/App.tsx`
- high-level state orchestration
- login / selection / demo view switching
- dialog and drawer wiring

### Demo Playback Logic
- `src/demo/useDemoPlayback.ts`
- scene progression
- panel scroll syncing
- video timing
- sync impulse special-case logic

### Demo Data / Fixtures
- `src/demo/contentItems.ts`
- `src/demo/sceneMetadata.ts`
- `src/demo/adFixtures.ts`
- `src/demo/constants.ts`

### UI Components
- `src/demo/components/`
- main views and modal/drawer components are split by feature

### Styling
- `src/demo/styles.ts`
- shared MUI `sx` objects and control tokens

### Taxonomy Display
- `src/demo/taxonomySceneData.ts`
- maps scene metadata into display-friendly taxonomy panel content

### JSON Export / JSON Panel Helpers
- `src/demo/jsonExport.ts`

## Behavior Notes
- The protected special-case playback mode is:
  - `Tier Selection = Exact Product Match`
  - `Ad Playback Mode = Sync: Impulse`
- That mode includes the current ad-break splice/transition behavior.
- Other modes currently reuse the primary data scrolling behavior without alternate ad overlays yet.

## Handoff Notes
- `App.tsx` should stay relatively thin.
- New UI work should usually go into `src/demo/components/`.
- New demo constants/fixtures should go into `src/demo/`.
- If a new feature changes structure, flows, or file ownership, update this README in the same change.

## Verification
Before handing off changes, prefer:

```bash
npm run build
```

And when appropriate:

```bash
npm run lint
```
