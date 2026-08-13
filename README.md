# HKSDPCL Studio

HKSDPCL Studio is a web-first creative workspace that can be packaged as a Tauri 2 desktop application for planning and producing Cantonese social-media content for the Hong Kong Survival and Disaster Prevention Council.

The product workflow is intentionally human-in-the-loop:

1. Capture an idea and an optional reference image.
2. Let the creative agent produce a first-pass brief using the selected brand and mascot context.
3. Refine the direction through multiple turns before spending points on image generation.
4. Generate several image directions through Poe and refine an individual image with a follow-up instruction.
5. Generate one Cantonese narration segment and timing suggestion per image.
6. Review the package and download the images plus a manifest for production handoff.

## Stack

- Tauri 2 for the desktop shell
- React 19, Vite, and TypeScript
- Tailwind CSS v4 with shadcn-style shared components
- Zustand for application state
- i18next and react-i18next for English and Traditional Chinese
- Framer Motion for focused interface transitions
- Poe OpenAI-compatible Chat Completions API for text, multimodal prompts, and image/audio-capable bots

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

## Poe setup

Open Settings and enter a Poe API key from `poe.com/api/keys`. The API key is used directly from the webview and requests go to `https://api.poe.com/v1/chat/completions`.

Configure one Poe model per stage. The default text models are `Claude-Sonnet-4.6` for planning and `MiniMax-2.8` for Cantonese narration. Choose an image-capable model available in the user's Poe account for image generation. Poe model names and availability are account-dependent, so the image model is intentionally left blank until configured.

Use “Test connection” in Settings before starting a campaign. Image, video, and audio models should be called without streaming; the app follows that rule for generation requests.

## Local data and security

Project drafts, mascot records, and model settings are currently kept locally in application storage. Generated image URLs and prompts are stored with the project so a draft can be reopened.

The Poe API key is masked in the UI, but this web-first build still uses local web storage. Before a public multi-user release, move key storage to Tauri secure storage or use Poe OAuth / a backend token broker. Never ship a shared Poe API key in the frontend.

## Tauri 2 release checklist

- Install Rust and Cargo on the build machine, then run `npm run tauri build`.
- Build separately on macOS and Windows, or use a tested CI matrix.
- Sign and notarize the macOS app; sign the Windows installer to reduce Gatekeeper and SmartScreen warnings.
- Add a signed Tauri updater manifest before enabling in-app updates.
- Review the CSP and capabilities whenever adding a native plugin. The current CSP explicitly allows the Poe API and remote generated-image URLs.
