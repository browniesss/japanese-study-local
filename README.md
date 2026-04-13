# Japanese Study Local

Localhost-first Japanese study app for absolute beginners.

## What it includes

- Beginner learning path from zero
- File-based lesson content under `content/`
- Local-only progress tracking by default
- Streak, XP, badges, and weekly goal
- Review practice from completed lessons
- Browser-based speaking practice with sample playback and shadowing
- Local mode requires no login, no backend, and no cloud API dependency

Cloudflare Pages + D1 deployment scaffolding is included under `functions/`, `migrations/`, and `wrangler.jsonc`.
Oracle Always Free VM deployment scaffolding is included under `server/` and `scripts/oracle/`.

## Run locally

```bash
npm install
npm run dev
```

Then open the local URL shown by Vite.

## Content Workflow

```bash
npm run content:check
npm run content:sync
```

If you need to re-bootstrap the new file-based content structure from the legacy TypeScript curriculum:

```bash
npm run content:bootstrap
```

## Build

```bash
npm run build
```

## Oracle VM Server

```bash
npm run start:server
```

This serves the built app plus `/api/*` progress endpoints from a single Node process.

## Notes

- Progress is stored only in this browser via local storage.
- Speaking practice uses browser speech synthesis for sample playback when a Japanese voice is available.
- Speaking practice focuses on listening once and reading aloud locally in the browser.
- Runtime lesson data is loaded from `/content/*.json`, not bundled directly from `src/data/curriculum.ts`.
- For Oracle VM deployment, the bundled Node server stores progress in a local SQLite file with nickname + internal device token.
