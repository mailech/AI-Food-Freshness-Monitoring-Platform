# Testing, Security & Operations Guide

## AI-Powered Food Freshness Monitoring Platform

This document covers Module 12 of the SRS: automated testing, security posture,
deployment, and day-to-day operation of the platform.

---

## 1. Automated Test Suite

Location: `backend/tests/`

| File | Coverage |
|---|---|
| `conftest.py` | SQLite in-memory DB + FastAPI `TestClient` (no Docker/TF needed), inference stub |
| `test_e2e.py` | Auth, inventory CRUD, image upload + assessment, storage monitoring, shelf-life, scoring, recommendations, notifications, reports export, security |

### Running

```powershell
# from repo root, using the project venv
.venv\Scripts\python.exe -m pytest backend\tests -q
```

Requirements for local runs: `pytest`, `httpx`, `email-validator`,
`openpyxl`, `reportlab` (all in `backend/requirements.txt` except pytest).

Tests never touch TensorFlow: the CNN call (`assess_image`) is monkeypatched to
a deterministic result so the suite runs in seconds. The real model path is
covered by manual E2E checks against the running stack (see §4).

### What is asserted

- **API validation**: 401 unauthenticated, 403 wrong owner, 404 unknown
  resources, 409 duplicate email, 422 invalid payloads (bad email, out-of-range
  temperature, unsupported file types).
- **E2E workflows**: register → login → create item → upload image → assessment
  stored → storage readings → compliance → shelf-life → composite score →
  recommendations → notification sync/read → PDF/XLSX export.
- **Scoring correctness**: weighted sub-scores sum exactly to the overall score
  and weights total 1.0.
- **Security isolation**: cross-user item access, uploads, and readings are all
  denied with 403; dashboards only aggregate the owner's items.
- **Idempotency**: notification re-sync does not duplicate alerts.

---

## 2. Security Posture

| Control | Implementation |
|---|---|
| Passwords | bcrypt via passlib (`app/core/security.py`) |
| Sessions | JWT bearer tokens (access + refresh), type-checked on decode |
| Authorization | `_get_owned_item` ownership check on every item-scoped route; Administrator role bypass |
| Input validation | Pydantic schemas with bounds (temp −30…60 °C, humidity 0–100 %) |
| Upload safety | MIME allow-list (JPEG/PNG/WebP) + size cap (`MAX_IMAGE_SIZE_MB`) |
| Secrets | Env vars / `.env`; JWT_SECRET must be changed in production |

Known limitations (documented, acceptable for v1): no refresh-token revocation
list, no rate limiting — add a reverse proxy with rate limiting before public
deployment.

---

## 3. Deployment

```powershell
cd infra
docker compose up -d --build     # postgres + mongo + api :8000 + web :3000
```

- The API runs Alembic-style light migrations at startup
  (`Base.metadata.create_all` + column backfills in `app/main.py`).
- Uploads live in the named volume `uploads`; DB data in `pgdata`.
- Configure production values via environment (see `.env.example`):
  `JWT_SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `EMAILS_ENABLED`, `SMTP_*`.

Health probes: `GET /healthz`, `GET /readyz`.

---

## 4. Manual E2E Verification (real CNN)

1. Open http://localhost:3000, sign up, add an inventory item.
2. On the item page upload a food photo — an assessment card appears with
   freshness category, score bar, spoilage risk, and detected class.
3. Add a storage reading (or hit `/items/{id}/shelf-life`) — remaining days and
   forecast expiry react to temperature/humidity.
4. Check **Dashboard**: distribution chart, consume-first list, alerts,
   compliance summary; Administrators additionally see platform stats.
5. Download reports from `/api/v1/reports/freshness?format=pdf|xlsx`
   (Bearer token required).

---

## 5. User Guide (quick reference)

**Consumer**
- *Inventory*: add items with name + category (+ optional packaging type).
- *Item page*: upload photos to get AI freshness assessments; record storage
  conditions; view predicted expiry with confidence interval.
- *Dashboard*: see what to consume first and what is expiring.

**Retail / Warehouse**
- Record temperature/humidity per item; compliance violations surface as
  recommendations and notifications.
- Use `/inventory/recommendations` for consume-first ordering with FIFO batch
  notes; export compliance and quality reports for audits.

**Administrator**
- Dashboard shows platform-wide stats (users, items, assessments, readings).

---

## 6. Module Traceability

| SRS Module | Status | Where |
|---|---|---|
| 1 Auth & RBAC | Done (pre-existing) | `app/routers/auth.py` |
| 2 Inventory | Done (pre-existing) | `app/routers/inventory.py` |
| 3 Image Analysis | Done | `app/ml/inference.py`, `app/routers/images.py` |
| 4 Freshness Assessment | Done | same as above + `models/images.py` |
| 5 Shelf-Life Prediction | Done | `app/ml/shelf_life.py` |
| 6 Storage Monitoring | Done | `app/models/storage.py`, `app/routers/storage.py` |
| 7 Scoring Engine | Done | `app/ml/freshness_score.py` |
| 8 Recommendations | Done | `app/ml/recommendations.py` |
| 9 Dashboards & Analytics | Done | `app/routers/analytics.py`, frontend dashboard |
| 10 Notifications | Done | `app/ml/alerts.py`, `app/routers/notifications.py` |
| 11 Reports & Export | Done | `app/ml/reports.py`, `app/routers/reports.py` |
| 12 Integration & Deployment | Done | this document, `backend/tests/` |
