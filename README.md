# AI Food Freshness Monitoring Platform

An AI-powered platform that analyses food images, storage conditions, product
information and age to estimate freshness, predict remaining shelf life, detect
visual spoilage indicators, monitor storage compliance and generate actionable
recommendations that reduce food waste.

Built as a complete, runnable full-stack application: FastAPI + PostgreSQL
backend, React + Tailwind frontend, an OpenCV/scikit-learn ML layer with a
replaceable-model architecture, PDF/Excel reporting, Docker Compose deployment
and a CI pipeline.

```
docker compose up --build      # then open http://localhost:3000
```

---

## Table of contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Folder structure](#folder-structure)
- [Quick start (Docker)](#quick-start-docker)
- [Local development](#local-development)
- [Environment variables](#environment-variables)
- [Database setup and migrations](#database-setup-and-migrations)
- [Demo credentials](#demo-credentials)
- [The freshness scoring model](#the-freshness-scoring-model)
- [ML architecture and training](#ml-architecture-and-training)
- [Demo mode](#demo-mode)
- [API documentation](#api-documentation)
- [Testing](#testing)
- [Security](#security)
- [Deployment](#deployment)
- [Screenshots](#screenshots)
- [Limitations](#limitations)
- [Future improvements](#future-improvements)
- [Licence](#licence)

---

## Features

### Authentication and RBAC
- Registration, JWT login, refresh-token rotation with revocation, logout
- bcrypt password hashing (SHA-256 pre-hash so long passwords work), password policy
- OAuth2-compatible architecture; the Swagger *Authorize* button works via the
  password flow
- Five roles with a permission matrix enforced **server-side on every request**

### Food inventory management
- Full CRUD for products, batches and inventory items
- Eight food categories with per-category storage envelopes and shelf-life
  baselines, declared once as data and overridable per deployment/product/batch
- Auto-generated batch numbers and provisional expiry dates
- Search, category/status/freshness/location/batch-number filters, expiry
  windows, date ranges, sorting and pagination on every collection
- Consume / discard tracking that feeds waste analytics
- FIFO and FEFO rotation with an explainable priority score

### Image analysis
- Upload validation: MIME **and** extension **and** magic bytes, size limit,
  sanitised filenames, traversal-proof storage keys, `nosniff` on retrieval
- Pipeline: decode → EXIF orientation → resize → denoise → CLAHE → food-region
  segmentation → colour analysis → texture analysis → food classification →
  spoilage detection → freshness classification → explanation overlay
- Colour: hue histogram, circular hue statistics, browning / dark-spot / pale
  ratios, colour uniformity, CIELAB colourfulness, dominant colours
- Texture: Laplacian variance, Sobel gradients, Canny edge density, GLCM
  (contrast, homogeneity, energy, correlation, entropy), LBP histogram +
  entropy, local variance, morphological ridge ratio
- Nine spoilage indicators with bounding boxes, combined by severity-weighted
  noisy-OR (so one decisive finding is not averaged away)
- Storage abstraction: local filesystem by default, S3 and Azure Blob behind the
  same interface

### Freshness scoring
- The specification's weighted model, with configurable weights and thresholds
- Component scores persisted so the UI can explain **why** a score was produced
- Overall health score combining freshness with spoilage probability
- Confidence reduced for blurry input, poor segmentation and near-boundary scores

### Shelf-life prediction
- Q10-style kinetic baseline using category shelf life, temperature and humidity
  deviation, packaging multiplier, air circulation and current freshness
- Never predicts beyond a declared best-before date
- Remaining days, predicted expiry, confidence interval, risk level and a
  factor-by-factor explanation
- Replaceable by a trained Random Forest / Gradient Boosting / XGBoost regressor

### Storage monitoring
- Temperature, humidity, air circulation, light exposure, storage duration
- Per-category compliance evaluation with a tolerance band (warning vs violation)
- Historical readings, daily min/avg/max trends, compliance rate
- `SensorProvider` abstraction: `MockSensorProvider` (default, **no hardware
  required**) and `MQTTSensorProvider`
- Manual entry and sensor ingestion both supported

### Recommendations
- Rule-based engine, 14 registered rules across the five required categories
- Every recommendation carries a `rule_id`, rationale and the evidence that
  triggered it, so suggestions are auditable and testable

### Alerts and notifications
- Nine alert types, five severities, read/unread and resolved/unresolved
- Deduplicated by a stable key, and **auto-resolved** when the condition clears
- Role-routed fan-out into an in-app notification centre; optional email

### Dashboards and analytics
- Five role-specific dashboards, all responsive
- Freshness distribution, average freshness over time, spoilage rate,
  near-spoilage count, shelf-life distribution, inventory health, storage
  compliance, temperature/humidity trends, category quality, alert trends,
  waste risk and value at risk

### Reporting
- Five report types × PDF and Excel
- PDF: reportlab, with native charts, colour-coded status cells and repeating
  table headers
- Excel: openpyxl, one sheet per table, live charts, auto-filters, frozen panes
- Metadata, filters, summary metrics and the AI disclaimer in both formats

### Platform
- Structured logging with credential redaction, request correlation IDs
- Append-only audit trail with scrubbed metadata
- Consistent error envelope, rate limiting, security headers
- `/health`, `/health/live`, `/health/ready`, `/api/v1/system/models`

---

## Architecture

```
                        ┌─────────────────────────┐
                        │        React UI         │
                        │  Vite · Tailwind · SPA   │
                        └───────────┬─────────────┘
                                    │ REST + JWT
                        ┌───────────▼─────────────┐
                        │   nginx (production)     │  SPA + /api proxy
                        └───────────┬─────────────┘
                                    │
                        ┌───────────▼─────────────┐
                        │        FastAPI           │
                        │  routers · middleware    │
                        │  logging · rate limit    │
                        └───────────┬─────────────┘
                                    │
        ┌──────────────┬────────────┼────────────┬──────────────┐
        ▼              ▼            ▼            ▼              ▼
   Auth & RBAC    Inventory     Freshness    Storage        Analytics
   permissions    products      assessment   monitoring     aggregation
   JWT/refresh    batches       scoring      compliance     dashboards
        │              │            │            │              │
        └──────────────┴────────────┼────────────┴──────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
              AI / ML layer    Repositories     PostgreSQL
                    │          (SQLAlchemy)      19 tables
      ┌─────────────┼─────────────┐
      ▼             ▼             ▼
  Image        Freshness      Shelf-Life
  Analysis      Engine        Prediction
  (OpenCV)   (classifier)     (kinetic)
      │             │             │
      └─────────────┼─────────────┘
                    ▼
          Recommendation Engine  (14 explainable rules)
                    ▼
          Alerts → Notifications → Reports (PDF/XLSX)

  Optional:  IoT sensors → MQTT → SensorProvider → Storage Monitoring
             (MockSensorProvider is the default; no hardware needed)
```

**Key design decisions**

- *Model registry* — inference models sit behind four interfaces
  (`FreshnessModel`, `SpoilageDetectionModel`, `FoodClassificationModel`,
  `ShelfLifeModel`). Swapping a baseline for a trained network is a
  configuration change.
- *Category profiles as data* — every category-specific number lives in
  `core/category_rules.py`, not in `if category == ...` branches.
- *Denormalised read paths* — the latest score, shelf life and status are cached
  on the batch row, so dashboards never re-run inference.
- *Repositories* — query construction is kept out of routers, so all user input
  is parameterised through SQLAlchemy.

---

## Tech stack

**Backend** — Python 3.11+ · FastAPI · Pydantic v2 · SQLAlchemy 2 · Alembic ·
PostgreSQL · PyJWT · bcrypt · reportlab · openpyxl

**ML / CV** — OpenCV (headless) · NumPy · scikit-learn · pandas · Pillow ·
joblib · *optional:* PyTorch, ultralytics YOLO, XGBoost

**Frontend** — React 18 · Vite 6 · Tailwind CSS 3 · React Router 6 · Axios ·
Recharts · date-fns

**Infrastructure** — Docker · Docker Compose · nginx · GitHub Actions

**Testing** — pytest + FastAPI TestClient (237 tests) · Vitest +
Testing Library (29 tests)

---

## Folder structure

```
.
├── backend/
│   ├── app/
│   │   ├── main.py                 FastAPI factory, middleware, /meta
│   │   ├── config.py               typed settings (env-driven)
│   │   ├── database.py             engine / session
│   │   ├── deps.py                 DI: current user, permission guards, pagination
│   │   ├── seed.py                 demo data seeder
│   │   ├── sample_images.py        procedural sample image generator
│   │   ├── core/                   enums, security, errors, logging, category rules
│   │   ├── models/                 SQLAlchemy models (19 tables)
│   │   ├── schemas/                Pydantic request/response models
│   │   ├── repositories/           query layer
│   │   ├── routers/                HTTP endpoints
│   │   ├── middleware/             request logging, rate limit, security headers
│   │   ├── auth/                   permissions matrix + auth service
│   │   ├── inventory/              product / batch / category services
│   │   ├── freshness/              scoring engine + assessment orchestrator
│   │   ├── shelf_life/             prediction service
│   │   ├── storage/                compliance service + sensor providers
│   │   ├── recommendations/        rule engine + FIFO/FEFO rotation
│   │   ├── notifications/          alerts + notification service
│   │   ├── reports/                builders + PDF/XLSX writers
│   │   ├── analytics/              aggregation service
│   │   ├── services/              storage backend, audit
│   │   ├── ml/                     PRODUCTION INFERENCE ONLY
│   │   │   ├── base.py             model interfaces
│   │   │   ├── registry.py         model selection + fallback reporting
│   │   │   ├── preprocessing/      validation, decode, resize, segmentation
│   │   │   ├── image_analysis/     colour, texture, pipeline orchestrator
│   │   │   ├── freshness/          baseline + trained classifier
│   │   │   ├── spoilage/           OpenCV baseline + YOLO interface
│   │   │   ├── shelf_life/         kinetic baseline + trained regressor
│   │   │   └── models/             artefact directory (git-ignored)
│   │   └── utils/
│   ├── alembic/                    migrations
│   ├── tests/                      237 tests
│   ├── scripts/e2e_smoke.py        131-assertion end-to-end check
│   ├── Dockerfile · docker-entrypoint.sh
│   └── requirements.txt · requirements-ml.txt · .env.example
├── frontend/
│   ├── src/
│   │   ├── components/{ui,domain,guards,NotificationPanel}
│   │   ├── charts/                 Recharts wrappers
│   │   ├── context/                Auth, Toast, Meta
│   │   ├── hooks/                  useAsync, usePagination, useDebounced, …
│   │   ├── layouts/                AppLayout, AuthLayout, navigation
│   │   ├── pages/                  18 pages incl. 5 role dashboards
│   │   ├── services/               API client + endpoint modules
│   │   └── utils/format.js         formatting + status system
│   ├── Dockerfile · nginx.conf
│   └── package.json · tailwind.config.js · .env.example
├── ml/
│   ├── datasets/README.md          how to obtain datasets legally
│   ├── preprocessing/features.py   shares production extractors
│   ├── training/                   prepare_dataset, train_freshness, train_spoilage, train_shelf_life
│   ├── evaluation/evaluate.py
│   └── README.md
├── data/sample/                    generated sample images + manifest
├── docs/                           deployment, API, architecture notes
├── reports/                        generated report output
├── docker-compose.yml
└── .github/workflows/ci.yml
```

---

## Quick start (Docker)

Requires Docker Desktop (or Docker Engine + Compose v2).

```bash
git clone <your-repo-url> food-freshness-platform
cd food-freshness-platform

docker compose up --build
```

That single command:

1. starts PostgreSQL 16 and waits for it to be healthy,
2. builds the backend image and applies Alembic migrations,
3. seeds demo data (33 products, 44 batches, 44 real analyses, 1 470 storage
   readings, recommendations, alerts, notifications),
4. builds the frontend and serves it through nginx with an `/api` proxy.

| Service | URL |
| --- | --- |
| Application | <http://localhost:3000> |
| API | <http://localhost:8000> |
| Swagger UI | <http://localhost:8000/docs> |
| ReDoc | <http://localhost:8000/redoc> |
| Health | <http://localhost:8000/health> |

Sign in with any account from [Demo credentials](#demo-credentials).

```bash
docker compose logs -f backend      # follow logs
docker compose down                 # stop
docker compose down -v              # stop and delete data
docker compose --profile mqtt up    # also start an MQTT broker
```

> The compose file's `JWT_SECRET_KEY` and `POSTGRES_PASSWORD` defaults are
> development values. Override them via a `.env` file (or your orchestrator's
> secret store) for anything reachable by others.

---

## Local development

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env                 # optional; defaults work as-is

python -m app.seed --reset           # create the schema + demo data
uvicorn app.main:app --reload --port 8000
```

With no `DATABASE_URL` set the backend uses a local SQLite file
(`backend/freshness.sqlite3`), so it runs with zero infrastructure. Point
`DATABASE_URL` at PostgreSQL for production-equivalent behaviour:

```bash
DATABASE_URL=postgresql+psycopg2://freshness:freshness_dev_password@localhost:5432/freshness
```

### Frontend

```bash
cd frontend
npm install
npm run dev                          # http://localhost:5173
```

The dev server proxies `/api` and `/health` to `http://localhost:8000`, so no
CORS configuration is needed locally.

---

## Environment variables

Full documented list in `backend/.env.example`. The ones that matter most:

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | SQLite file | PostgreSQL connection string |
| `JWT_SECRET_KEY` | dev placeholder | **Must be replaced** outside local use |
| `JWT_ALGORITHM` | `HS256` | Token signing algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` | Access-token lifetime |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | Refresh-token lifetime |
| `CORS_ORIGINS` | localhost dev ports | Comma-separated **or** JSON array |
| `DEMO_MODE` | `true` | `false` loads trained artefacts |
| `MODEL_PATH` | `backend/app/ml/models` | Artefact directory |
| `UPLOAD_DIR` | `backend/uploads` | Image storage root |
| `REPORT_DIR` | `reports/` | Generated report output |
| `SAMPLE_DIR` | `data/sample` | Where the seeder writes sample images |
| `STORAGE_BACKEND` | `local` | `local` · `s3` · `azure` |
| `MAX_UPLOAD_SIZE_MB` | `10` | Upload limit |
| `WEIGHT_VISUAL` / `_STORAGE` / `_SHELF_LIFE` / `_PRODUCT_AGE` | `0.40` / `0.25` / `0.20` / `0.15` | Scoring weights |
| `THRESHOLD_FRESH` / `_GOOD` / `_ACCEPTABLE` / `_NEAR_SPOILAGE` | `90` / `75` / `60` / `30` | Band thresholds |
| `SENSOR_PROVIDER` | `mock` | `mock` · `mqtt` |
| `RATE_LIMIT_ENABLED` | `true` | In-process sliding window |
| `EMAIL_ENABLED` | `false` | Optional SMTP notifications |
| `OAUTH_ENABLED` | `false` | Optional social login |

The frontend reads only `VITE_*` variables — see `frontend/.env.example`. Never
put a secret there; it is compiled into the browser bundle.

---

## Database setup and migrations

Alembic is the schema source of truth; the containerised backend runs
`alembic upgrade head` on start.

```bash
cd backend

alembic upgrade head            # apply migrations
alembic current                 # show the current revision
alembic check                   # fail if the models have drifted
alembic downgrade base          # roll everything back

alembic revision --autogenerate -m "add x"   # after changing a model
```

Seeding:

```bash
python -m app.seed              # idempotent: adds users/products if data exists
python -m app.seed --reset      # DROP everything, then re-seed (dev only)
python -m app.seed --no-analysis  # skip the ML pipeline (much faster)
```

`--reset` refuses to run when `ENVIRONMENT=production`.

---

## Demo credentials

Created by `python -m app.seed`. **Development-only credentials** — they exist
solely so a reviewer can sign in immediately, and the seeder is never run
automatically outside Docker/dev.

| Role | Email | Password |
| --- | --- | --- |
| Administrator | `admin@freshness.example.com` | `Demo@1234` |
| Retail Manager | `manager@freshness.example.com` | `Demo@1234` |
| Warehouse Operator | `warehouse@freshness.example.com` | `Demo@1234` |
| Quality Inspector | `inspector@freshness.example.com` | `Demo@1234` |
| Consumer | `consumer@freshness.example.com` | `Demo@1234` |

Each role lands on a different dashboard and has a genuinely different permission
set — try the same page as several roles to see the RBAC working.

### Role permissions

| Capability | Consumer | Retail Mgr | Warehouse | Inspector | Admin |
| --- | :-: | :-: | :-: | :-: | :-: |
| Add food / batches | ✓ | ✓ | ✓ | — | ✓ |
| Manage products | — | ✓ | — | — | ✓ |
| Upload + analyse images | ✓ | ✓ | — | ✓ | ✓ |
| View freshness / shelf life | ✓ | ✓ | ✓ | ✓ | ✓ |
| Record storage readings | ✓ | ✓ | ✓ | — | ✓ |
| Inspection queue | — | — | — | ✓ | ✓ |
| Analytics | — | ✓ | ✓ | ✓ | ✓ |
| Generate reports | — | ✓ | ✓ | ✓ | ✓ |
| Manage users / system | — | — | — | — | ✓ |
| Audit log | — | — | — | — | ✓ |

---

## The freshness scoring model

```
Freshness Score = 0.40 × Visual Condition
                + 0.25 × Storage Conditions
                + 0.20 × Shelf-Life Prediction
                + 0.15 × Product Age
```

Every component is normalised to 0–100 before weighting, so
`visual = storage = shelf_life = age = 100` yields exactly `100` — asserted by a
test.

| Score | Category |
| --- | --- |
| 90–100 | Fresh |
| 75–89 | Good |
| 60–74 | Acceptable |
| 30–59 | Near Spoilage |
| 0–29 | Spoiled |

Weights and thresholds are configurable (`WEIGHT_*`, `THRESHOLD_*`). The weights
actually applied are stored on each assessment, so historical scores stay
interpretable after a configuration change.

**Component derivation**

- *Visual* — category-weighted blend of the colour-degradation and
  texture-condition scores, minus calibrated per-indicator deductions
- *Storage* — deviation from the category's temperature/humidity envelope, with
  the penalty cap scaling by the category's temperature sensitivity, plus
  circulation and light-exposure penalties
- *Shelf-life* — remaining days as a fraction of expected total life, so "3 days
  left" scores very differently for seafood than for canned goods
- *Product age* — elapsed fraction of expected life

The **Why this score?** panel in the UI shows each component, its weight, its
contribution in points and the arithmetic, alongside the detected indicators and
the measured feature values.

---

## ML architecture and training

Production inference lives in `backend/app/ml/` behind four interfaces:

```python
FreshnessModel           # features (+context) -> class, probability, confidence
SpoilageDetectionModel   # image -> indicators with regions
FoodClassificationModel  # image -> food family (advisory)
ShelfLifeModel           # tabular features -> remaining days + interval
```

`ModelRegistry` selects the implementation. With `DEMO_MODE=false` it loads
trained artefacts from `MODEL_PATH`; anything missing falls back to its baseline
and the fallback is reported.

### Training

```bash
# 1. obtain a dataset yourself — see ml/datasets/README.md
python ml/training/prepare_dataset.py --source ~/Downloads/fruits --target ml/datasets/freshness

# 2. train (extracts the SAME features production uses)
python ml/training/train_freshness.py  --data ml/datasets/freshness
python ml/training/train_shelf_life.py --data ml/datasets/shelf_life/observations.csv
python ml/training/train_spoilage.py   --data ml/datasets/spoilage/data.yaml

# 3. inspect what is installed and what it measured
python ml/evaluation/evaluate.py

# 4. serve it
#    DEMO_MODE=false + restart, or POST /api/v1/admin/system/reload-models
```

Metrics reported: **freshness** accuracy, precision, recall, F1, confusion
matrix; **shelf life** MAE, RMSE, R²; **spoilage** precision, recall, mAP@50,
mAP@50-95. They are written into the artefact and displayed verbatim.

Verify the pipeline without any dataset:

```bash
python ml/training/train_shelf_life.py --synthetic 4000
```

This trains on synthetic samples of the platform's own kinetic baseline. It is
labelled `synthetic: true` everywhere it surfaces, because such a model has
merely re-learned the baseline's arithmetic.

Large artefacts are git-ignored — do not commit them.

---

## Demo mode

`DEMO_MODE=true` (the default) uses deterministic baseline inference. The same
image always produces the same score, which makes the system demonstrable and
testable without a GPU, a dataset or a download.

The UI marks this state in three places: a badge in the header, a badge on every
result, and the **About the AI models** page. The API marks it via
`analysis_label`, `assessment.model.is_demo` and `GET /api/v1/system/models`.

`DEMO_MODE=false` loads trained artefacts. Missing ones fall back to their
baseline with the reason recorded — the platform still works end to end and still
reports honestly what it is using.

---

## API documentation

FastAPI generates OpenAPI 3.1 automatically:

- Swagger UI — <http://localhost:8000/docs> (the *Authorize* button uses the
  OAuth2 password flow)
- ReDoc — <http://localhost:8000/redoc>
- Schema — <http://localhost:8000/openapi.json> (100 documented paths)

Representative endpoints:

```
POST   /api/v1/auth/register           POST   /api/v1/auth/login
POST   /api/v1/auth/refresh            POST   /api/v1/auth/logout
GET    /api/v1/users/me

GET    /api/v1/categories
GET    /api/v1/products                POST   /api/v1/products
GET    /api/v1/products/{id}           PUT    /api/v1/products/{id}
DELETE /api/v1/products/{id}

GET    /api/v1/batches                 POST   /api/v1/batches
GET    /api/v1/batches/{id}            PUT    /api/v1/batches/{id}
GET    /api/v1/batches/rotation        PATCH  /api/v1/batches/{id}/quantity

POST   /api/v1/images                  GET    /api/v1/images/file/{key}
POST   /api/v1/analysis/image          GET    /api/v1/analysis/{id}
GET    /api/v1/freshness/{batch_id}    GET    /api/v1/shelf-life/{batch_id}

GET    /api/v1/storage/{batch_id}      POST   /api/v1/storage/readings
GET    /api/v1/storage/overview        POST   /api/v1/storage/sensors/ingest

GET    /api/v1/recommendations/{batch_id}
GET    /api/v1/alerts                  PATCH  /api/v1/alerts/{id}
GET    /api/v1/notifications

GET    /api/v1/analytics/dashboard     GET    /api/v1/analytics
POST   /api/v1/reports/freshness       POST   /api/v1/reports/inventory
GET    /api/v1/reports/{id}/download

GET    /api/v1/admin/users             GET    /api/v1/admin/audit-logs
GET    /health                         GET    /api/v1/system/models
```

Every error uses one envelope:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_IMAGE",
    "message": "The uploaded file is not a supported image."
  }
}
```

Import `http://localhost:8000/openapi.json` into Postman or Insomnia to get the
whole collection.

---

## Testing

```bash
# backend — 237 tests
cd backend && pytest -q
pytest --cov=app --cov-report=term-missing

# frontend — 29 tests
cd frontend && npm run test

# end-to-end (131 assertions against the in-process app)
cd backend && python scripts/e2e_smoke.py
```

Coverage includes: the scoring formula in isolation (perfect-score identity,
band boundaries, configurable weights/thresholds, clamping); authentication and
JWT primitives; the RBAC matrix and per-endpoint enforcement; product/batch/
inventory CRUD; upload rejection of disguised executables, SVG, empty and
oversized files; path-traversal defences; the full ML pipeline (determinism,
output contracts, fresh-vs-spoiled discrimination, registry fallback); storage
compliance; alert dedupe and auto-resolution; recommendations; FIFO/FEFO
ordering; all ten report type/format combinations verified by magic bytes; audit
redaction; and health/meta/OpenAPI.

CI (`.github/workflows/ci.yml`) additionally verifies migrations against a real
PostgreSQL service, runs `alembic check` for schema drift, builds both Docker
images and asserts the whole stack comes up healthy and authenticates.

---

## Security

- bcrypt hashing with per-password salt; SHA-256 pre-hash so passwords longer
  than bcrypt's 72-byte limit still verify correctly
- JWT with type discrimination (an access token cannot be used as a refresh
  token), single-use refresh rotation, revocation stored as a SHA-256 fingerprint
- Permissions enforced by a FastAPI dependency on every sensitive route; the
  frontend mirrors the matrix only to hide unusable UI
- Public registration cannot self-assign `ADMIN`; the last active admin cannot be
  demoted, deactivated or deleted
- Upload validation on MIME **and** extension **and** magic bytes; sanitised
  filenames that collapse double extensions; server-generated storage keys;
  traversal-proof reads; `X-Content-Type-Options: nosniff` on retrieval
- All queries parameterised through SQLAlchemy; no string-built SQL
- Pydantic validation on every request body and query parameter
- Rate limiting (stricter on auth endpoints), CORS allow-list, security headers
- Secrets exclusively from environment variables; `.env` is git-ignored and the
  app logs an error if a production deployment keeps the development JWT secret
- Logging and audit metadata both scrub credential-like keys
- Non-root container user

---

## Deployment

Detailed guides in [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

### Production checklist

- [ ] Generate a strong `JWT_SECRET_KEY`
      (`python -c "import secrets; print(secrets.token_urlsafe(48))"`)
- [ ] Set `ENVIRONMENT=production`, `DEBUG=false`, `LOG_JSON=true`
- [ ] Point `DATABASE_URL` at managed PostgreSQL with TLS
- [ ] Restrict `CORS_ORIGINS` to your real origin(s)
- [ ] Set `STORAGE_BACKEND=s3` (or `azure`) so uploads survive redeploys
- [ ] Terminate TLS at the load balancer
- [ ] Run `alembic upgrade head` as a release step; leave `SEED_ON_START=false`
- [ ] Replace the in-process rate limiter with a Redis-backed store if you run
      more than one instance
- [ ] Ship logs and set alerts on `/health`
- [ ] Decide `DEMO_MODE`, and if `false`, mount your trained artefacts

### Suggested AWS topology

```
Route 53 → CloudFront → S3          (React build)
                      → ALB → ECS Fargate (FastAPI, 2+ tasks)
                                    → RDS PostgreSQL (Multi-AZ)
                                    → S3 (uploads, STORAGE_BACKEND=s3)
                                    → CloudWatch Logs
                                    → Secrets Manager (JWT_SECRET_KEY, DB creds)
```

Azure equivalent: Static Web Apps + Container Apps + Azure Database for
PostgreSQL + Blob Storage (`STORAGE_BACKEND=azure`) + Key Vault.

Cloud-specific pieces sit behind the `FileStorage` abstraction, so switching
providers is a configuration change rather than a rewrite.

---

## Screenshots

> Placeholder section — add your own captures here. Suggested set:
>
> | View | Suggested filename |
> | --- | --- |
> | Login with demo accounts | `docs/screenshots/01-login.png` |
> | Consumer dashboard | `docs/screenshots/02-consumer-dashboard.png` |
> | Retail dashboard | `docs/screenshots/03-retail-dashboard.png` |
> | Warehouse dashboard | `docs/screenshots/04-warehouse-dashboard.png` |
> | Inspector dashboard | `docs/screenshots/05-inspector-dashboard.png` |
> | Admin dashboard + model provenance | `docs/screenshots/06-admin-dashboard.png` |
> | Analysis workflow steps 1–3 | `docs/screenshots/07-analyze-form.png` |
> | Animated analysing state | `docs/screenshots/08-analyzing.png` |
> | Results + "Why this score?" panel | `docs/screenshots/09-results.png` |
> | Detected regions overlay | `docs/screenshots/10-overlay.png` |
> | Inventory with filters | `docs/screenshots/11-inventory.png` |
> | FIFO/FEFO rotation plan | `docs/screenshots/12-rotation.png` |
> | Storage compliance | `docs/screenshots/13-storage.png` |
> | Analytics | `docs/screenshots/14-analytics.png` |
> | Reports + generated PDF | `docs/screenshots/15-reports.png` |
> | About the AI models | `docs/screenshots/16-model-transparency.png` |

---

## Limitations

Stated plainly, because a project like this is only defensible if it is honest.

1. **No trained models ship with the platform.** The defaults are transparent
   baselines with no accuracy claim. Everything needed to train real models is in
   `ml/`, but you must supply the data.
2. **Baseline heuristics are tuned against synthetic samples**, not a validated
   corpus. They discriminate correctly across the five bands on the shipped
   samples; that is evidence the pipeline works, not evidence of real-world
   accuracy.
3. **Storage envelopes are engineering defaults**, not medical, legal or
   regulatory limits. They are configurable and must be reviewed by a qualified
   food-safety professional before any real use.
4. **Shelf-life prediction is a kinetic approximation.** No microbial growth
   model, no water-activity or pH term, no validation against laboratory studies.
5. **Food classification is deliberately weak.** Colour priors cannot identify a
   specific food; it is advisory metadata and the declared category always wins.
6. **Rate limiting is in-process.** Correct for one worker; use a shared store
   for multi-instance deployments.
7. **Email is architecture only.** In-app notifications are complete; SMTP is
   wired but disabled by default.
8. **MQTT is untested against real hardware.** The interface and broker config
   are provided; `MockSensorProvider` is the default and needs no hardware.
9. **Analytics aggregate in SQL without materialised views.** Fine at demo scale;
   very large deployments will want pre-aggregation.
10. **No multi-tenancy.** Consumers are scoped to their own data, but there is no
    organisation-level isolation.
11. **Performance figures are measured, not extrapolated.** The admin page shows
    real mean prediction latency from stored records; throughput and concurrent
    user capacity depend on your topology and should be benchmarked there.

---

## Future improvements

- Train and publish a CNN freshness classifier with a documented dataset and a
  full evaluation report
- Annotate a spoilage detection set and train the YOLO path
- Run a controlled shelf-life study to replace the kinetic baseline with a
  validated model
- Grad-CAM style saliency overlays once a CNN is in place
- Redis-backed rate limiting and response caching
- Celery/RQ for background report generation and scheduled alert sweeps
- WebSocket push for live alerts instead of polling
- Barcode/QR scanning to create batches from packaging
- Multi-tenant organisations with per-tenant category rule overrides
- Native mobile capture app
- Materialised views for analytics at scale

---

## Licence

MIT — see `LICENSE`.

Note the licences of things you may add: **ultralytics YOLO is AGPL-3.0**, and
every dataset in `ml/datasets/README.md` carries its own terms. Review them
before redistributing anything built on top of them.
