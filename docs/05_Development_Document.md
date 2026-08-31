# Development Document
## AI-Powered Food Freshness Monitoring Platform

Version 1.0 — Developer handbook: environment setup, conventions, implementation details, testing, and deployment.

---

## 1. Tech Stack (Locked)

| Layer | Technology |
|---|---|
| Backend | Python 3.11+, FastAPI, Uvicorn |
| Frontend | JavaScript, React.js, Next.js, Tailwind CSS |
| Databases | PostgreSQL 15+, MongoDB 6+ |
| AI/ML | TensorFlow, PyTorch, Scikit-learn, OpenCV, Pandas, NumPy |
| Computer Vision | YOLO, CNN models, image augmentation libraries |
| Auth | JWT (python-jose / pyjwt), passlib-bcrypt, OAuth2 |
| Charts | Chart.js, Plotly |
| IoT (optional) | MQTT (paho-mqtt), temp/humidity sensors |
| DevOps | Docker, Docker Compose, GitHub Actions, AWS/Azure |
| Tools | VS Code, Git/GitHub, Postman |

---

## 2. Repository Structure

```
food-freshness-platform/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI entrypoint
│   │   ├── core/                   # config.py, security.py, deps.py
│   │   ├── api/v1/                 # routers: auth, items, batches,
│   │   │                           # images, assessments, shelflife,
│   │   │                           # storage, recommendations,
│   │   │                           # dashboards, alerts, reports
│   │   ├── models/                 # SQLAlchemy ORM models
│   │   ├── schemas/                # Pydantic schemas
│   │   ├── services/               # business logic per module
│   │   └── ml/                     # model loading, inference pipelines
│   ├── ml_training/                # notebooks + training scripts
│   ├── tests/
│   ├── alembic/                    # DB migrations
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/                    # Next.js routes
│   │   ├── components/             # shared UI components
│   │   ├── features/               # dashboard/, inventory/, assess/...
│   │   ├── lib/api.js              # axios/fetch client with JWT interceptor
│   │   └── styles/
│   ├── package.json
│   └── Dockerfile
├── infra/
│   ├── docker-compose.yml
│   └── .github/workflows/ci.yml
└── docs/                           # PRD, SRS, Architecture, UI, Dev docs
```

---

## 3. Local Environment Setup

### 3.1 Prerequisites
Python 3.11+, Node 18+, Docker Desktop, Git.

### 3.2 Steps
```powershell
git clone <repo-url> food-freshness-platform
cd food-freshness-platform

# --- Backend ---
python -m venv .venv
.\.venv\Scripts\activate
pip install -r backend\requirements.txt
copy backend\.env.example backend\.env    # fill secrets

# --- Frontend ---
cd frontend
npm install

# --- Full stack via Docker ---
docker compose -f infra\docker-compose.yml up --build
```

### 3.3 Environment Variables (`backend/.env`)
```
DATABASE_URL=postgresql+psycopg2://ffp:ffp@localhost:5432/ffpdb
MONGO_URL=mongodb://localhost:27017/ffp
JWT_SECRET=<random-64-char>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
UPLOAD_DIR=./uploads
MAX_IMAGE_SIZE_MB=10
OAUTH_CLIENT_ID=...
OAUTH_CLIENT_SECRET=...
MQTT_BROKER=optional
```

### 3.4 Database Migration
```powershell
alembic upgrade head
```

---

## 4. Implementation Notes Per Module

### 4.1 Authentication & RBAC
- `POST /auth/register` → hash password with passlib bcrypt → insert user with default role.
- `POST /auth/login` → verify → return access JWT (30 min) + refresh token.
- Dependency: `get_current_user` decodes JWT; `require_role(*roles)` factory guards routers.
- OAuth2: standard authorization-code flow against Google; map to local user record.

### 4.2 Inventory
- CRUD for items/batches via SQLAlchemy; category enum table seeded with the 8 categories.
- Expiry job (background scheduler) flags batches expiring within N days → alert rows.

### 4.3 Image Analysis Pipeline (`services/image_analysis.py`, `ml/`)
1. Validate & save upload; create thumbnail.
2. Preprocess: resize 224×224, normalize.
3. CNN classifier → fresh/spoiled probability.
4. YOLO detector → mold spots, bruises, physical damage bounding boxes.
5. OpenCV features: color histograms (RGB/HSV deltas vs. fresh baseline), texture stats (LBP/GLCM).
6. Aggregate into structured CV output → Mongo `cv_outputs`; summary → Postgres assessment.

Training data: Fruits Freshness Dataset, Vegetable Freshness Dataset, Kaggle Food Freshness Dataset (fresh vs spoiled classification), Food-101 (category support). Apply augmentation (rotation, brightness, flip).

### 4.4 Freshness Assessment Engine
- Maps CV aggregate + metadata → score 0–100 and category buckets:
  - Fresh ≥80 · Good 60–79 · Acceptable 40–59 · Near Spoilage 20–39 · Spoiled <20
- Trend = time series of assessments per item.

### 4.5 Shelf-Life Prediction
- Scikit-learn regression (e.g., GradientBoosting) trained on features:
  `[visual_state_score, product_type_onehot, temperature_c, humidity_pct, packaging_type, storage_duration_days]`
- Output: predicted days remaining, forecast expiry date, confidence interval, risk level.

### 4.6 Scoring Engine (exact formula)
```python
freshness_score = (
    0.40 * visual_condition_score
  + 0.25 * storage_conditions_score
  + 0.20 * shelf_life_prediction_score
  + 0.15 * product_age_score
)
# each component normalized 0–100 beforehand
```

### 4.7 Storage Monitoring
- Manual POST or MQTT subscriber writing `storage_readings`.
- Threshold config per category (e.g., dairy 0–4°C); violations raise alerts + optimization recommendations.

### 4.8 Recommendations, Alerts, Reports
- Rules engine keyed on score bands, expiry proximity, compliance status.
- Reports: build datasets with pandas → export via reportlab (PDF) / openpyxl (Excel).

---

## 5. Coding Conventions

**Backend**
- PEP8 (Black formatter, line length 100), ruff linting.
- Type hints mandatory on service/router functions.
- Routers thin; logic in `services/`; DB access in repositories or service-level sessions.
- Every route documented with OpenAPI response models.

**Frontend**
- Functional React components + hooks; feature-folder organization.
- Tailwind utility classes; extract repeated patterns into components.
- API calls centralized in `lib/api.js`; no fetch in components directly.

**Git**
- Branches: `feat/<module>-<desc>`, `fix/<desc>`, `chore/<desc>`.
- Conventional commits: `feat(auth): add OAuth2 login flow`.
- PRs require CI green + one review.

---

## 6. Testing Strategy

| Level | Tooling | Scope |
|---|---|---|
| Unit | pytest (backend), Jest (frontend) | scoring math, validators, reducers |
| API/Integration | pytest + httpx TestClient, Postman collections | endpoint contracts, RBAC enforcement |
| Model eval | notebooks + scripts | classification accuracy, spoilage detection accuracy, shelf-life MAE |
| E2E | manual scripted workflows (or Playwright) | upload→assess→predict→alert→report |
| Security | OWASP checks | auth bypass, IDOR, injection, upload abuse |
| Performance | locust/k6 | API response time, concurrent users |

Run locally:
```powershell
pytest backend\tests -v          # backend
npm test                          # frontend
newman run postman\collection.json -e postman\local.env
```

---

## 7. CI/CD Pipeline (GitHub Actions)

`.github/workflows/ci.yml` stages:
1. **Lint:** ruff + black --check; eslint frontend.
2. **Test:** pytest with ephemeral Postgres/Mongo services; jest.
3. **Build:** docker build `api`, `web`, `worker` images.
4. **Deploy:** push images to registry; deploy to AWS/Azure target (SSH/ECS/App Service) on main merge.

---

## 8. Deployment Runbook

1. Provision cloud resources (VM/ECS or App Service/ACI, managed Postgres optional).
2. Set production environment variables/secrets in cloud config.
3. `docker compose pull && docker compose up -d` (or platform-native deploy).
4. Run `alembic upgrade head` migration job.
5. Verify `/healthz`, `/readyz`; smoke-test login + image upload.
6. Enable monitoring/logging dashboards; configure alerting.

---

## 9. Performance Optimization Checklist
- Paginate all list endpoints; add DB indexes on FKs + expiry_date.
- Cache dashboard aggregates (short TTL) if needed.
- Serve images via nginx/static storage, not through API process.
- Batch ML inference where possible; keep worker pool sized to load.
- Frontend code-splitting (Next.js dynamic imports) for fast first paint.

## 10. Definition of Done (per feature)
- [ ] Meets corresponding FR in SRS
- [ ] Unit + integration tests passing
- [ ] RBAC enforced server-side
- [ ] Lint/type checks clean
- [ ] Docs updated (API spec auto-generated)
- [ ] Reviewed and merged with CI green
