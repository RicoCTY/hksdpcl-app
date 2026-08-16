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

## CI and downloadable builds

This is a single-operator desktop app. Builds are unsigned. GitHub Actions packages the installers; you publish the Release and send users the file yourself. The app does not check for updates.

### Everyday CI (no installer)

Push to `main` or open a pull request. The **CI** workflow runs `npm run check` only.

It does **not** produce a `.dmg` or `.exe`. Check the result at [Actions](https://github.com/RicoCTY/hksdpcl-app/actions).

### First downloadable build

Version lives in two files and must stay in sync:

- `package.json`
- `src-tauri/tauri.conf.json`

Both are currently `0.2.3`. To ship a version:

```bash
git tag v0.2.0
git push origin v0.2.0
```

The **Release** workflow then builds:

- macOS Apple Silicon `.dmg`
- macOS Intel `.dmg`
- Windows NSIS `.exe`

When it finishes, GitHub creates a **draft** at [Releases](https://github.com/RicoCTY/hksdpcl-app/releases). Open that draft and click **Publish release**. Until you publish, there is nothing to download.

Download page after publish:

https://github.com/RicoCTY/hksdpcl-app/releases/latest

First launch (unsigned builds):

macOS Sequoia / Tahoe will say the app is **damaged**. It is not. Gatekeeper blocks unsigned downloads, and right-click → Open no longer works. After dragging the app to Applications:

```bash
xattr -cr "/Applications/HKSDPCL Studio.app"
open "/Applications/HKSDPCL Studio.app"
```

If that is not enough:

```bash
xattr -dr com.apple.quarantine "/Applications/HKSDPCL Studio.app"
open "/Applications/HKSDPCL Studio.app"
```

Use the Apple Silicon `.dmg` on M-series Macs and the Intel `.dmg` on Intel Macs. The real fix is an Apple Developer ID certificate plus notarization.

Windows: SmartScreen → More info → Run anyway. That warning is expected for an unsigned installer. It is not a broken download.

If the installer runs but the installed app **double-clicking does nothing** (no window, no error), install `0.2.3` or newer. Older builds crashed on launch because an unused updater plugin was registered without a signing key.

The installer also embeds an offline WebView2 runtime. If a machine still has a broken WebView2 setup, reinstalling repairs it without needing internet. To check whether WebView2 is present, run in PowerShell:

```powershell
Get-AppxPackage -AllUsers -Name "Microsoft.WebView2Runtime"
```

If that returns nothing, reinstall the app, or grab the "Evergreen Standalone Installer" from <https://developer.microsoft.com/microsoft-edge/webview2>. If the downloaded `.exe` itself refuses to start or disappears, check the antivirus quarantine — unsigned NSIS installers are frequent false positives. A tiny downloaded `.exe` (a few hundred KB or less) is usually a GitHub login/404 page saved with the wrong name, which happens when the repository is private.

### Later builds

1. Bump the version in **both** `package.json` and `src-tauri/tauri.conf.json` (for example `0.2.3` → `0.2.4`).
2. Commit and push to `main`.
3. Tag and push the same version:

```bash
git tag v0.2.4
git push origin v0.2.4
```

4. Wait for the Release workflow, **Publish** the new draft, then send users the new installer. There is no in-app update check.
