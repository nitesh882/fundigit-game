# ViemIt frontend

React 19 + Vite + Tailwind CSS. See the [project README](../README.md) for full setup, game rules, and API details.

## Development

Use Node 22.x (22.13+) or 24.x.

```powershell
npm.cmd ci
npm.cmd run dev
```

Use `npm` instead of `npm.cmd` on macOS/Linux. The backend should run at http://localhost:8080. The frontend runs at http://localhost:5173.

Copy `.env.example` to `.env` to change `VITE_API_BASE_URL`; restart Vite after editing it. No secrets belong in Vite environment variables.

## Verification

```powershell
npm.cmd run lint
npm.cmd test
npm.cmd run build
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

`npm.cmd run test:watch` runs Vitest interactively. Unit/component tests mock API responses; browser tests use a real Spring backend and an isolated temporary H2 database. Browser artifacts are saved under `output/`. Java and Maven/the Maven wrapper are needed for the browser suite.

The game uses server-owned session and question IDs, replay-safe submissions, and server deadlines. Session storage tracks resumable rounds; it is never used as a source of score truth.
