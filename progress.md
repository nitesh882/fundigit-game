Original prompt: coplete this project and also testing

## Implementation scope

Approved plan: finish the existing five-mode game, polish the current design, persist local data in H2, calculate scores on the server, and add unit, integration, and browser tests. Early exits are history-only; fraction rounds mix addition and subtraction. Deployment and multiplayer are excluded.

## Baseline

- Frontend lint and production build pass.
- Backend startup test passes (one test); no initial frontend tests.
- Existing user change: one blank line at the end of .gitignore; preserve it.

## Completed implementation

- Added authenticated, persisted rounds with server-generated questions, deadlines, scoring, retries, early endings, and owned history. The file-backed H2 URL uses `WRITE_DELAY=0` so a committed result survives an abrupt backend restart.
- Kept all five modes and three difficulties. Fraction rounds mix five additions and five subtractions. The server keeps expected answers and required carry/borrow positions private.
- Reworked the React game to use explicit phases, recover lost responses after refresh, resume active rounds, show server scores, and protect account routes. Added responsive boards, keyboard controls, honest game instructions, and leaderboard filter cancellation.
- Added the Windows Maven wrapper, environment examples, setup/API/test documentation, ignored local data and test artifacts, and GitHub Actions checks.

## Final verification (2026-11-03)

- Backend `mvnw.cmd verify`: 48 tests passed, including HTTP, service, concurrency, deadline, and persistence checks.
- Frontend `npm.cmd run lint`, `npm.cmd run test`, and `npm.cmd run build`: all passed; 32 Vitest tests passed.
- Browser `npm.cmd run test:e2e`: 24 scenarios passed with no browser console errors. All 15 mode/difficulty rounds completed at 100 points, plus refresh/replay, timeout, early ending, backend restart, logout, and mobile layouts.
- Inspected desktop/mobile home, arithmetic, fraction, level selection, history, and login screenshots, plus the bundled web-game client state capture. Artifacts are under ignored `Frontend/output/e2e/`.
