# AI Food Freshness Monitoring Platform

An AI-powered platform for real-time food freshness monitoring, shelf-life prediction, spoilage detection, and storage recommendations.

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React 19, Tailwind CSS 4 |
| Backend | FastAPI, SQLAlchemy, PostgreSQL, MongoDB |
| ML | TensorFlow CNN (freshness classification) |
| Auth | JWT + Google OAuth2 |
| Infra | Docker Compose, Nginx, Eclipse Mosquitto (MQTT) |

## Quick start (frontend only — no backend required)

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The frontend runs in mock mode by default (`USE_MOCK_API=1` in `.env.local`) — any email + password (8+ chars) will sign you in.

## Full stack (Docker)

```bash
# 1. Copy and fill in secrets
cp infra/.env.example infra/.env
# edit infra/.env with your Google OAuth credentials

# 2. Start all services
cd infra
docker-compose up --build
```

Services:
- Frontend → http://localhost:3000
- Backend API → http://localhost:8000
- API docs (Swagger) → http://localhost:8000/docs
- Nginx proxy → http://localhost:80

## Running the backend locally

```bash
cd backend

# Copy and fill in env vars
cp .env.example .env
# edit .env

# Install dependencies (Python 3.11+)
pip install -r requirements.txt

# Start PostgreSQL + MongoDB (or use Docker)
docker-compose -f ../infra/docker-compose.yml up postgres mongo -d

# Run the API
uvicorn app.main:app --reload
```

## Google OAuth setup

1. Create OAuth 2.0 credentials at [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Add authorised redirect URI: `http://localhost:8000/api/v1/auth/google/callback`
3. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `backend/.env` and `infra/.env`
4. Set `NEXT_PUBLIC_API_URL=http://localhost:8000` in `frontend/.env.local`

## Project structure

```
├── backend/          # FastAPI app, ML models, routers, services
├── frontend/         # Next.js app (App Router)
├── infra/            # Docker Compose, Nginx, Mosquitto configs
├── docs/             # PRD, SRS, Architecture, UI/UX, Testing docs
└── uploads/          # User-uploaded food images (gitignored)
```

## Docs

See the [`docs/`](./docs/) folder for full product, system, architecture, and testing documentation.
