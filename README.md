# HKSDPCL Studio

HKSDPCL Studio is a Tauri desktop application for planning and producing social media content for the Hong Kong Survival and Disaster Prevention Council

## Stack

- Tauri 2 for the desktop shell
- React 19, Vite, and TypeScript
- Tailwind CSS v4 with shadcn-style shared components
- Zustand for application state
- i18next and react-i18next for English and Traditional Chinese
- Framer Motion for focused interface transitions

## Requirements

- Node.js 20 or newer
- Rust and the platform prerequisites required by Tauri for desktop builds

## Commands

Install dependencies

```bash
npm install
```

Run the web development server

```bash
npm run dev
```

Run the Tauri desktop app

```bash
npm run tauri dev
```

Run the TypeScript check

```bash
npm run typecheck
```

Create a production frontend build

```bash
npm run build
```

Run the full local quality check

```bash
npm run check
```

## Project structure

```text
src/
  components/
    shell/       Application shell and navigation
    steps/       Content production workflow steps
    ui/          Reusable interface primitives
    views/       Top-level application views
  i18n/          Locale resources and language setup
  store/         Zustand application state and persistence
  assets/        Brand assets
  lib/           Shared utilities
src-tauri/       Native desktop shell and build configuration
```

## Local data

Settings and character records are kept locally in the application storage for the current desktop implementation

The Poe API key is stored locally and is never displayed by default. A production backend or Tauri secure storage integration should be used before handling sensitive keys at scale.
