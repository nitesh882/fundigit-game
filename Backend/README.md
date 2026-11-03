# ViemIt API

Spring Boot 4 + Spring Security + JPA/H2 + JWT. See the [project README](../README.md) for endpoint contracts and game rules.

## Run

Use Java 21 (recommended; compile target Java 17).

Windows:

```powershell
.\mvnw.cmd spring-boot:run
```

macOS/Linux:

```bash
bash ./mvnw spring-boot:run
```

An installed Maven can also run `mvn spring-boot:run`. The API listens on http://localhost:8080 by default. Health: `GET /api/health`.

## Configuration and persistence

Spring reads environment variables; `.env.example` is a reference and is not loaded automatically. For example, in PowerShell:

```powershell
$env:PORT = '8080'
$env:JWT_SECRET = 'your-private-local-signing-key'
.\mvnw.cmd spring-boot:run
```

The default database is `jdbc:h2:file:./data/fundigitgame;WRITE_DELAY=0`. Run from this directory so local data stays under `Backend/data/`. Accounts, active rounds, and results survive restarts. H2 console is disabled. Configure another database with `DB_URL`, `DB_DRIVER`, `DB_USERNAME`, and `DB_PASSWORD`; only the local H2 setup is covered by this project's acceptance tests.

## Tests

```powershell
.\mvnw.cmd verify
```

Tests override the local database with isolated in-memory H2 and use an injectable clock for deadline scenarios. They cover generators, all five modes and three levels, authentication, malformed inputs, answer retries and concurrent submissions, early endings, ownership checks, ranking/history, and attempts to submit arbitrary scores.

Session mutations lock the owned round within a transaction. Creation locks the user and has a unique user/request-ID constraint. Questions have unique session/sequence identifiers, and results have a unique session constraint.
