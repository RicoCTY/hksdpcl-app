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

## CI, download, and updates

This is a single-operator desktop app. Builds are unsigned. GitHub Actions does the packaging; you publish the Release so it can be downloaded.

### Everyday CI (no installer)

Push to `main` or open a pull request. The **CI** workflow runs `npm run check` only.

It does **not** produce a `.dmg` or `.exe`. Check the result at [Actions](https://github.com/RicoCTY/hksdpcl-app/actions).

### First downloadable build

Version lives in two files and must stay in sync:

- `package.json`
- `src-tauri/tauri.conf.json`

Both are currently `0.2.0`. To ship a version:

```bash
git tag v0.2.0
git push origin v0.2.0
```

The **Release** workflow then builds:

- macOS Apple Silicon `.dmg`
- macOS Intel `.dmg`
- Windows NSIS `.exe`

When it finishes, GitHub creates a **draft** at [Releases](https://github.com/RicoCTY/hksdpcl-app/releases). Open the `v0.1.0` draft and click **Publish release**. Until you publish, there is nothing to download and Settings cannot see a newer version.

Download page after publish:

https://github.com/RicoCTY/hksdpcl-app/releases/latest

First launch (unsigned):

- macOS: right-click the app → Open → Open
- Windows: SmartScreen → More info → Run anyway

### Later updates

1. Bump the version in **both** `package.json` and `src-tauri/tauri.conf.json` (for example `0.1.0` → `0.2.0`).
2. Commit and push to `main`.
3. Tag and push the same version:

```bash
git tag v0.2.0
git push origin v0.2.0
```

4. Wait for the Release workflow, then **Publish** the new draft.

In the installed app: Settings → Help → **Check for updates**.

- Current version is the same as or newer than the latest **published** GitHub Release → “You're on the latest version”
- GitHub has a newer tag (for example `v0.2.0`) → “Version 0.2.0 is available” → **Install and restart** opens that Release page so you can download and install again

Drafts do not count. If you forget to publish, the app will keep saying it is up to date.

There is no silent in-app overlay install. Update means download the new installer and replace the old app.
