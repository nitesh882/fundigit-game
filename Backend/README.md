# API

Spring Boot backend (Java 17+, H2, JPA, JWT).

## Quick Start

Windows (PowerShell/CMD):
```bash
mvn spring-boot:run
```

Unix/Git Bash:
```bash
./mvnw spring-boot:run
```

## Default URL

Backend runs on:
`http://localhost:8080`

Health checks:
- `GET /`
- `GET /api/health`

Core endpoints:
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/game/question`
- `POST /api/game/submit`
- `POST /api/score` (Bearer token required)
- `GET /api/leaderboard` (Bearer token required)
- `GET /api/history` (Bearer token required)
