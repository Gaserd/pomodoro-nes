# Pomodoro Timer (Electron + NES.css)

A desktop Pomodoro timer with retro NES UI, button/finish sounds, and daily coin rewards stored locally.

## Features
- Work/Break durations (default 25/5), Start/Pause/Skip/Reset
- NES.css styled UI, frameless window with custom close button
- Click sounds per button; random finish sound at the end of each interval
- Earn a coin after each completed Work interval; daily stats saved to a JSON file

## Getting Started
Requirements: Node.js 18+ (Windows build config included).

Install dependencies:
```bash
npm install
```

Run in development:
```bash
npm start
```

## Build Installer
Electron Builder is configured.
```bash
npm run dist
```
Artifacts appear in `dist/`: NSIS installer `.exe` and a portable build.

## Sounds
Audio files live in `sound/`.
- Clicks: `click-menu-app-147357.mp3`, `big-button-129050.mp3`
- Finish (random): `Voicy_YAHOO.mp3`, `whistle-47997.mp3`, `victory-1-90174.mp3`, `mario-coin-200bpm-82548.mp3`

## Tech Overview
- Main process: `main.js` (frameless window, IPC, stats storage)
- Preload: `preload.js` (exposes `window.stats`, `window.windowControls`)
- UI: `src/index.html`, `src/styles.css`
- Logic: `src/renderer.js`
- Stats file: `coins.json` in Electron `userData`

## License
MIT
