# Getting Started — From Scratch Setup Guide

## AI-Powered Food Freshness Monitoring Platform

This document walks you through every step needed to get the full platform running locally, from cloning the repo to a working app in your browser. Two paths are covered:

- **Option A — Docker (recommended):** everything runs in containers, no Python or Node install needed
- **Option B — Local dev:** run the frontend and backend directly on your machine (faster hot reload, easier debugging)

---

## Prerequisites

### Option A — Docker

| Tool | Minimum version | Download |
|---|---|---|
| Docker Desktop | 4.x | https://www.docker.com/products/docker-desktop |
| Git | Any | https://git-scm.com |

That's it. Docker handles Python, Node, Postgres, MongoDB, and everything else.

### Option B — Local dev

| Tool | Minimum version | Download |
|---|---|---|
| Git | Any | https://git-scm.com |
| Python | 3.11 or 3.12 | https://www.python.org/downloads |
| Node.js | 20 LTS or 22 | https://nodejs.org |
| Docker Desktop | 4.x | https://www.docker.com/products/docker-desktop (only needed for the databases) |

---

## Step 1 — Clone the repo

```bash
git clone https://github.com/mailech/AI-Food-Freshness-Monitoring-Platform.git
cd AI-Food-Freshness-Monitoring-Platform
git checkout SUMESHA
```

The project structure you'll see:

```
├── backend/       ← FastAPI app, ML models, all routers
├── frontend/      ← Next.js 15 app (App Router)
├── infra/         ← Docker Compose, Nginx, MQTT configs
├── docs/          ← All documentation
└── uploads/       ← Created at runtime, gitignored
```

---

## Option A — Full Stack with Docker

### Step 2A — Set up environment variables

```bash
cd infra
copy .env.example .env        # Windows
# OR
cp .env.example .env          # Mac/Linux
```

Open `infra/.env` and fill in your Google OAuth credentials (optional — skip if you don't need Google sign-in):

```dotenv
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here
JWT_SECRET=replace-with-a-long-random-string
```

> **Skip Google OAuth?** Leave `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` blank. Email/password login will still work.

### Step 3A — Start Docker Desktop

Open Docker Desktop and wait for it to show **"Engine running"** in the bottom-left corner before continuing.

### Step 4A — Build and start all services

```bash
cd infra
docker compose up --build
```

The first run downloads images and builds the app — this takes **5–10 minutes**. Subsequent starts take about 30 seconds.

You will see output from all services streaming in the terminal. Wait until you see:

```
infra-api-1   | INFO:     Application startup complete.
infra-web-1   | ...
```

### Step 5A — Open the app

| What | URL |
|---|---|
| **App (via Nginx)** | http://localhost:80 |
| **Frontend direct** | http://localhost:3000 |
| **Backend API** | http://localhost:8000 |
| **Swagger API docs** | http://localhost:8000/docs |

Sign up with any email and password (8+ characters), or use Google sign-in if you configured the credentials.

### Stopping the stack

```bash
# Stop all containers (keeps data)
docker compose down

# Stop AND delete all data (full reset)
docker compose down -v
```

---

## Option B — Local Development

### Step 2B — Start only the databases with Docker

You still need Postgres and MongoDB. Start just those:

```bash
cd infra
docker compose up postgres mongo -d
```

### Step 3B — Set up the backend

```bash
cd backend

# Copy and fill in env vars
copy .env.example .env        # Windows
cp .env.example .env          # Mac/Linux
```

Open `backend/.env` and set at minimum:

```dotenv
DATABASE_URL=postgresql+psycopg2://ffp:ffp@localhost:5432/ffpdb
MONGO_URL=mongodb://localhost:27017
JWT_SECRET=any-random-string-at-least-32-chars
GOOGLE_CLIENT_ID=              # optional
GOOGLE_CLIENT_SECRET=          # optional
```

Create a Python virtual environment and install dependencies:

```bash
# Windows
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt

# Mac/Linux
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

> **Note:** `tensorflow-cpu` is a large package (~250 MB). The install will take a few minutes on first run.

Start the API:

```bash
uvicorn app.main:app --reload
```

The API is ready when you see:
```
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

On first start it automatically:
- Creates all database tables
- Seeds the 8 food categories (Fruits, Vegetables, Dairy, etc.)
- Runs any pending schema migrations

### Step 4B — Set up the frontend

Open a **new terminal**:

```bash
cd frontend
npm install
```

Create the local env file:

```bash
# Windows
copy nul .env.local            # creates empty file
# Mac/Linux
touch .env.local
```

Open `frontend/.env.local` and add:

```dotenv
# Use mock API (no backend needed) — set to 0 to use real backend
USE_MOCK_API=0

# Point Google OAuth button directly at the backend
NEXT_PUBLIC_API_URL=http://localhost:8000
```

> **Want to run frontend without the backend?** Set `USE_MOCK_API=1` and you can skip Steps 2B and 3B entirely. Any email + any 8-char password will sign you in with demo data.

Start the dev server:

```bash
npm run dev
```

Open **http://localhost:3000**.

---

## Step 6 — Google OAuth (optional)

If you want "Sign in with Google" to work:

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Click **Create credentials → OAuth 2.0 Client ID**
3. Application type: **Web application**
4. Add authorised redirect URI: `http://localhost:8000/api/v1/auth/google/callback`
5. Copy the **Client ID** and **Client Secret**
6. Set them in:
   - `backend/.env` → `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
   - `infra/.env` → same (for Docker)
   - `frontend/.env.local` → `NEXT_PUBLIC_API_URL=http://localhost:8000`
7. Restart the backend (or run `docker compose up --build` for Docker)

---

## Step 7 — Running the test suite

```bash
cd backend

# Activate venv first (Option B only)
.venv\Scripts\activate        # Windows
source .venv/bin/activate     # Mac/Linux

# Install pytest (not in requirements.txt)
pip install pytest

# Run all tests
python -m pytest tests/ -v
```

Tests use an in-memory SQLite database and stub out the TensorFlow CNN, so they run in seconds with no external services needed.

---

## Ports reference

| Service | Port | Notes |
|---|---|---|
| Nginx proxy | 80 | Main entry point in Docker |
| Frontend (Next.js) | 3000 | Direct access |
| Backend (FastAPI) | 8000 | API + Swagger docs at /docs |
| PostgreSQL | 5432 | User `ffp`, password `ffp`, DB `ffpdb` |
| MongoDB | 27017 | No auth in dev |
| MQTT broker | 1883 | Eclipse Mosquitto |

---

## Troubleshooting

### `docker compose up` fails with "port already in use"

Something else is using port 3000, 8000, or 5432. Find and stop it:

```bash
# Windows — find what's on port 3000
netstat -ano | findstr :3000
taskkill /PID <pid> /F

# Mac/Linux
lsof -i :3000
kill -9 <pid>
```

### Backend fails with "database does not exist"

The Postgres container is still initialising. Wait 10 seconds and retry, or run:

```bash
docker compose restart api
```

### `pip install -r requirements.txt` is slow or fails on tensorflow

TensorFlow is large. If it times out, try:

```bash
pip install -r requirements.txt --timeout 300
```

If you don't need the CNN image assessment feature locally, you can comment out `tensorflow-cpu` in `requirements.txt` — all other features still work.

### Frontend shows "Failed to load" after sign-in

In local dev mode (`USE_MOCK_API=0`), the frontend proxies API calls to the backend. Make sure:
- The backend is running on port 8000
- `USE_MOCK_API` is **not** set to `1` in `frontend/.env.local`
- You restarted the Next.js dev server after changing `.env.local`

### Google sign-in redirects back with an error

- Confirm the redirect URI in Google Cloud Console **exactly** matches `http://localhost:8000/api/v1/auth/google/callback`
- Confirm `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in both `backend/.env` and `infra/.env`
- Confirm `NEXT_PUBLIC_API_URL=http://localhost:8000` is in `frontend/.env.local`

---

## Quick start cheat sheet

```bash
# 1. Clone
git clone https://github.com/mailech/AI-Food-Freshness-Monitoring-Platform.git
cd AI-Food-Freshness-Monitoring-Platform && git checkout SUMESHA

# 2. Configure
cp infra/.env.example infra/.env     # fill in Google credentials (optional)

# 3. Start
cd infra && docker compose up --build

# 4. Open
#    App  → http://localhost
#    API  → http://localhost:8000/docs
```
