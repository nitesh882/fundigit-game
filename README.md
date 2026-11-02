# Fun Digit Game 🎮

A full-stack math quiz game where players solve arithmetic problems against the clock and compete on a leaderboard.

**Live Stack:** React 19 + Vite (Frontend) · Spring Boot 4 + H2 + JWT (Backend)

---

## 📁 Project Structure

```
fundigitgame/
├── Frontend/      # React + Vite + Tailwind CSS
└── Backend/       # Spring Boot + JPA (H2) + JWT
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ & npm
- Java 17+ & Maven 3.6+

### 1. Start the Backend

```bash
cd Backend
mvn spring-boot:run
```
> Runs on **http://localhost:8080**

### 2. Start the Frontend

```bash
cd Frontend
npm install
npm run dev
```
> Runs on **http://localhost:5173**

---

## 🌐 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/health` | ❌ | Health check |
| POST | `/api/auth/signup` | ❌ | Register new user |
| POST | `/api/auth/login` | ❌ | Login & get JWT |
| GET | `/api/game/question` | ❌ | Get a question (`?mode=add&level=easy`) |
| POST | `/api/game/submit` | ❌ | Submit answer |
| POST | `/api/score` | ✅ | Save game score |
| GET | `/api/leaderboard` | ❌ | Top scores (`?mode=add&difficulty=easy`) |
| GET | `/api/history` | ✅ | My game history |

## 🎮 Game Modes & Difficulty

| Mode | Description |
|------|-------------|
| Addition (`add`) | Add two numbers |
| Subtraction (`sub`) | Subtract with borrow hints |
| Multiplication (`mul`) | Multiply numbers |
| Division (`div`) | Clean division |
| Fractions | Add/subtract fractions |

| Level | Timer | Range |
|-------|-------|-------|
| Easy | 30s | 1–9 |
| Medium | 20s | 1–99 |
| Hard | 10s | 1–999 |

## ⚙️ Environment Variables

### Backend (`Backend/src/main/resources/application.properties`)
```properties
server.port=8080
spring.datasource.url=jdbc:h2:mem:testdb
jwt.secret=change-me-for-local
jwt.expiration=3600000
app.cors.allowed-origins=http://localhost:5173
```

### Frontend (`Frontend/.env`)
```env
VITE_API_BASE_URL=http://localhost:8080
```

## 🏗️ Tech Stack

**Frontend:** React 19 · React Router 7 · Vite 7 · Tailwind CSS 4 · Axios

**Backend:** Spring Boot 4 · Spring Security · JPA/Hibernate · H2 (dev) · MySQL-ready · JJWT 0.12

## 📜 License

MIT — free to use and modify.
