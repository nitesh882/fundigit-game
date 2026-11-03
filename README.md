# ViemIt · Fun Digit Game

A full-stack math game built with React 19, Vite, Tailwind CSS, Spring Boot 4, H2, and JWT authentication.

Choose addition, subtraction, multiplication, division, or fractions. Play ten timed questions, compare completed rounds on a leaderboard, and review your personal game history.

## Run locally

Requirements: **Node.js 22.x (22.13+) or 24.x**, **Java 21** (recommended; Java 17 is the compile target), and npm. The Maven wrapper downloads Maven automatically on first use.

Start the backend in one terminal:

```powershell
cd Backend
.\mvnw.cmd spring-boot:run
```

On macOS/Linux, use `bash ./mvnw spring-boot:run`. If Maven is installed, `mvn spring-boot:run` also works.

Start the frontend in another terminal:

```powershell
cd Frontend
npm.cmd ci
npm.cmd run dev
```

On macOS/Linux, use `npm` in place of `npm.cmd`. Open **http://localhost:5173**. The API runs at **http://localhost:8080**; `GET /api/health` returns `{"status":"ok"}`.

Create an account from the home page. Usernames contain 3–30 characters. Passwords contain at least 8 characters and at most 72 UTF-8 bytes. Email addresses are trimmed and normalized to lowercase.

## Game rules

| Mode | Easy / medium / hard | Time per question |
| --- | --- | --- |
| Addition, subtraction, multiplication, division | Operands from 1–9 / 1–99 / 1–999 | 30 / 20 / 10 seconds |
| Fractions | Denominators up to 6 / 12 / 20 | 40 / 30 / 20 seconds |

- A round contains **10 questions**. Fraction rounds shuffle five additions and five subtractions. Subtraction results are nonnegative; division results are exact integers.
- Correct answers earn **10 points**. For addition/subtraction, incomplete or incorrect carry/borrow entries reduce a correct answer to **8 points**.
- Wrong answers, skipped questions, and timeouts earn **0 points**.
- Equivalent fractions are accepted; a numerator and a positive denominator are required.
- Use the on-screen number pad or keyboard. **Enter** submits, **Backspace** deletes, and **Escape** clears. Select a carry/borrow box or fraction field before entering digits.
- Only completed rounds appear in the leaderboard. **End Game** records an unfinished entry in personal history.
- Refreshing resumes the current round in that browser tab. The server deadline keeps running. Leaving the page does not pause a question.
- Each leaderboard entry represents an individual completed round. Scores sort descending, then completion time and result ID ascending. Personal history shows the latest games first.

## Saved data and configuration

Local accounts, sessions, and results are stored in `Backend/data/fundigitgame.mv.db` when the backend starts from `Backend/`. Restarting the backend preserves them. These files are ignored by Git.

The backend reads environment variables; it does **not** automatically load `.env`. See `Backend/.env.example` for available settings.

| Backend variable | Default |
| --- | --- |
| `PORT` | `8080` |
| `DB_URL` | `jdbc:h2:file:./data/fundigitgame;WRITE_DELAY=0` |
| `DB_DRIVER` | `org.h2.Driver` |
| `DB_USERNAME` / `DB_PASSWORD` | `sa` / empty |
| `JWT_SECRET` | Local development key |
| `JWT_EXPIRATION` | `3600000` milliseconds |
| `CORS_ALLOWED_ORIGINS` | Localhost and 127.0.0.1, ports 5173–5175 |

Use a private `JWT_SECRET` when sharing an instance beyond local development. H2 console access is disabled.

The frontend uses `VITE_API_BASE_URL` (default `http://localhost:8080`). Copy `Frontend/.env.example` to `Frontend/.env` to customize it, then restart Vite. Vite also supports the configured `/api` development proxy.

## API

Authenticated endpoints require `Authorization: Bearer <token>`.

| Method | Endpoint | Authentication | Purpose |
| --- | --- | --- | --- |
| GET | `/api/health` | Public | Health check |
| POST | `/api/auth/signup` | Public | Register with `username,email,password` |
| POST | `/api/auth/login` | Public | Sign in with `email,password` |
| GET | `/api/auth/me` | Required | Current public user |
| POST | `/api/game/sessions` | Required | Start a round |
| GET | `/api/game/sessions/{id}` | Required | Resume an owned round |
| POST | `/api/game/sessions/{id}/answers` | Required | Answer, skip, or acknowledge timeout |
| POST | `/api/game/sessions/{id}/end` | Required | End early |
| GET | `/api/leaderboard?mode=add&difficulty=easy&limit=10` | Public | Completed round rankings |
| GET | `/api/history?limit=50` | Required | Current user's finished/unfinished results |

Signup/login return `{token,user:{id,username,email}}`. `/me` returns the user directly. No password hashes appear in API responses.

Start a round with `{mode,level,requestId}`; `requestId` is a UUID reused when retrying that creation. Supported modes: `add,sub,mul,div,fraction`; levels: `easy,medium,hard`.

Session responses contain `id,mode,level,status,score,answeredQuestions,totalQuestions,serverTime,question`. Status is `ACTIVE`, `COMPLETED`, or `ABANDONED`. The current question contains its UUID, visible operands/operator, input metadata, carry/borrow hints, time limit, and `expiresAt`. Fraction operands use `a,b,denominatorA,denominatorB`. Expected answers are never returned.

Submit `{questionId,answerText,carryMap,action}`. Actions are `answer`, `skip`, and `timeout`. Fraction answers use `"numerator/denominator"`; other answers use integer strings. Carry entries follow visible columns from left to right. The response is `{session,result:{answerCorrect,carryCorrect,earnedPoints,timedOut}}`.

The backend owns deadlines and points. Replaying a processed question returns its saved result and current session state. Repeating an ending does not duplicate history. A completed round is saved in the same transaction as its final answer. Client-supplied score totals cannot create rankings.

The old `/api/game/question`, `/api/game/submit`, and `POST /api/score` interfaces are retired. Requests fail rather than accepting browser-computed scores.

Errors use `{message}`: 400 for invalid input, 401 for invalid/missing authentication, 404 for unavailable/other-user sessions, 409 for conflicting requests, and 410 for retired APIs. Score query limits must be 1–100.

## Testing

Backend unit and HTTP integration tests use an isolated in-memory database and a controlled server clock:

```powershell
cd Backend
.\mvnw.cmd verify
```

Frontend checks:

```powershell
cd Frontend
npm.cmd run lint
npm.cmd test
npm.cmd run build
```

Install the browser once, then run the real-backend integration suite:

```powershell
cd Frontend
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

The browser runner starts its own backend/frontend on ports 18080 and 15173, uses a separate temporary file database, and shuts its services down afterward. Override `E2E_API_PORT` and `E2E_WEB_PORT` if those ports are occupied. It exercises all 15 mode/difficulty combinations plus signup, completed results, history, refresh, early ending, logout, mobile layout, and persistence across a backend restart. Screenshots, state snapshots, and service logs are written under `Frontend/output/`.

GitHub Actions runs backend verification, lint, frontend tests, the production build, and browser integration tests on Node 22 and Java 21. Failure artifacts include browser output and backend test reports.

## Project layout

- `Frontend/`: React interface, account/session handling, Vitest/RTL tests, and Playwright runner.
- `Backend/`: Spring API, persisted game sessions, authentication, and JUnit integration tests.
- `.github/workflows/ci.yml`: automated verification.

This project provides local single-player gameplay. Multiplayer, hosted deployment, email delivery, achievements, and password reset are outside the current implementation.
