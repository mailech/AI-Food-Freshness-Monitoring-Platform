# Deployment

Local Docker Compose first, then AWS and Azure. Every cloud-specific concern sits
behind an abstraction in the code, so moving between them is configuration rather
than a rewrite.

---

## 1. Local (Docker Compose)

```bash
docker compose up --build
```

| Service | URL | Notes |
| --- | --- | --- |
| Application | <http://localhost:3000> | nginx serves the SPA and proxies `/api` |
| API | <http://localhost:8000> | FastAPI |
| Swagger | <http://localhost:8000/docs> | |
| PostgreSQL | `localhost:5432` | `freshness` / `freshness_dev_password` |

The backend entrypoint waits for PostgreSQL, runs `alembic upgrade head`, and
seeds demo data when `SEED_ON_START=true` (the compose default).

Override the development defaults with a `.env` next to `docker-compose.yml`:

```env
POSTGRES_PASSWORD=<strong password>
JWT_SECRET_KEY=<python -c "import secrets; print(secrets.token_urlsafe(48))">
ENVIRONMENT=production
DEBUG=false
LOG_JSON=true
SEED_ON_START=false
CORS_ORIGINS=https://freshness.example.com
```

Useful commands:

```bash
docker compose logs -f backend
docker compose exec backend alembic current
docker compose exec backend python -m app.seed --no-analysis
docker compose exec postgres psql -U freshness -d freshness -c '\dt'
docker compose --profile mqtt up -d          # add the MQTT broker
docker compose down -v                       # stop and delete all data
```

---

## 2. Production checklist

Work through this before exposing the platform to anyone else.

### Secrets and configuration
- [ ] `JWT_SECRET_KEY` is a fresh random value from a secret store, not the
      committed default. The app logs an **error** at startup if a production
      environment still uses the development secret.
- [ ] `ENVIRONMENT=production`, `DEBUG=false`
- [ ] `LOG_JSON=true` so your log shipper can parse records
- [ ] No `.env` file baked into an image; inject variables at runtime

### Database
- [ ] Managed PostgreSQL (RDS / Azure Database), TLS enforced
- [ ] `alembic upgrade head` runs as a **release step**, not on every replica
      boot — set `RUN_MIGRATIONS=false` on the app containers and run migrations
      once from a job
- [ ] `SEED_ON_START=false`; the seeder refuses `--reset` in production but
      should not run at all
- [ ] Automated backups with a tested restore

### Storage
- [ ] `STORAGE_BACKEND=s3` (or `azure`). With `local`, uploads live in the
      container filesystem and are lost on redeploy.
- [ ] `pip install boto3` (S3) or `azure-storage-blob` (Azure) in the image
- [ ] Bucket/container is **private**; the API serves files through an
      authenticated endpoint or a presigned URL

### Network and TLS
- [ ] TLS terminated at the load balancer; HTTP redirected to HTTPS
- [ ] `CORS_ORIGINS` restricted to your real origin(s) — never `*`
- [ ] Only the frontend/ALB is public; the API is reachable through it

### Scaling
- [ ] Replace the in-process rate limiter with a Redis-backed store if you run
      more than one worker (the `RateLimitStore` protocol in
      `app/middleware/rate_limit.py` is a two-method interface)
- [ ] Size `DB_POOL_SIZE` × replicas below your database connection limit
- [ ] Image analysis is CPU-bound — allocate at least 1 vCPU per worker

### Observability
- [ ] `/health/ready` as the readiness probe, `/health/live` as liveness
- [ ] Alert on `status != healthy` and on 5xx rate
- [ ] Ship structured logs; correlate with `X-Request-ID`
- [ ] Watch mean prediction latency on the admin page

### ML
- [ ] Decide `DEMO_MODE`. If `false`, mount trained artefacts read-only at
      `MODEL_PATH` and confirm `GET /api/v1/system/models` shows them as trained
- [ ] If any role still falls back to a baseline, make sure the UI's honesty
      labelling stays enabled (it does by default)

---

## 3. AWS

### Topology

```
Route 53
   │
   ├── CloudFront ──► S3 (React build, static)
   │
   └── ALB (TLS) ──► ECS Fargate service (FastAPI, 2+ tasks)
                          │
                          ├──► RDS PostgreSQL (Multi-AZ, TLS)
                          ├──► S3 (uploads, STORAGE_BACKEND=s3)
                          ├──► CloudWatch Logs
                          └──► Secrets Manager (JWT_SECRET_KEY, DB credentials)
```

### Steps

1. **Database** — create an RDS PostgreSQL 16 instance, Multi-AZ, private subnet,
   security group open only to the ECS task SG.

2. **Uploads bucket** — create a private S3 bucket. Grant the task role
   `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject` on
   `arn:aws:s3:::your-bucket/food-images/*` only.

3. **Secrets** — store `JWT_SECRET_KEY` and the database URL in Secrets Manager
   and reference them from the task definition's `secrets` block.

4. **Backend image**

   ```bash
   aws ecr create-repository --repository-name ffm-backend
   docker build -t ffm-backend ./backend
   docker tag ffm-backend:latest <acct>.dkr.ecr.<region>.amazonaws.com/ffm-backend:latest
   aws ecr get-login-password | docker login --username AWS --password-stdin <acct>.dkr.ecr.<region>.amazonaws.com
   docker push <acct>.dkr.ecr.<region>.amazonaws.com/ffm-backend:latest
   ```

   `boto3` must be in the image for the S3 backend — add it to
   `backend/requirements.txt` before building.

5. **Migration task** — register a one-off task definition that runs
   `alembic upgrade head`, and execute it before each rollout.

6. **Service** — Fargate service behind the ALB, target group health check
   `/health/ready`, `RUN_MIGRATIONS=false`, environment:

   ```
   ENVIRONMENT=production
   DEBUG=false
   LOG_JSON=true
   STORAGE_BACKEND=s3
   S3_BUCKET=your-bucket
   S3_REGION=<region>
   CORS_ORIGINS=https://freshness.example.com
   DEMO_MODE=true            # or false with artefacts mounted
   ```

7. **Frontend** — build with the API origin, then publish:

   ```bash
   cd frontend
   VITE_API_BASE_URL=https://api.freshness.example.com npm run build
   aws s3 sync dist/ s3://your-frontend-bucket --delete
   aws cloudfront create-invalidation --distribution-id <id> --paths '/*'
   ```

   Configure CloudFront's custom error responses to return `/index.html` with
   status 200 for 403/404 so client-side routing works.

   Alternatively deploy the `frontend` container (nginx) behind the same ALB and
   keep `VITE_API_BASE_URL` empty for same-origin requests.

---

## 4. Azure

```
Front Door / Static Web Apps  ──►  React build
        │
        └── Container Apps (FastAPI)
                 ├──► Azure Database for PostgreSQL (Flexible Server)
                 ├──► Blob Storage (STORAGE_BACKEND=azure)
                 ├──► Log Analytics
                 └──► Key Vault (JWT_SECRET_KEY, DB credentials)
```

```bash
# Backend
az acr build --registry <registry> --image ffm-backend:latest ./backend

az containerapp create \
  --name ffm-backend --resource-group <rg> --environment <env> \
  --image <registry>.azurecr.io/ffm-backend:latest \
  --target-port 8000 --ingress external \
  --min-replicas 2 \
  --env-vars ENVIRONMENT=production DEBUG=false LOG_JSON=true \
             STORAGE_BACKEND=azure AZURE_STORAGE_CONTAINER=uploads \
             CORS_ORIGINS=https://freshness.example.com \
  --secrets jwt=<keyvault-ref> db=<keyvault-ref> \
  --env-vars JWT_SECRET_KEY=secretref:jwt DATABASE_URL=secretref:db

# Frontend
cd frontend && VITE_API_BASE_URL=https://<backend-fqdn> npm run build
az staticwebapp create --name ffm-frontend --resource-group <rg> --source ./dist
```

Add `azure-storage-blob` to `backend/requirements.txt` before building for the
Azure storage backend.

---

## 5. Kubernetes sketch

```yaml
# One-shot migration job, run before rolling out the Deployment.
apiVersion: batch/v1
kind: Job
metadata:
  name: ffm-migrate
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: migrate
          image: <registry>/ffm-backend:latest
          command: ["alembic", "upgrade", "head"]
          envFrom:
            - secretRef: { name: ffm-secrets }
            - configMapRef: { name: ffm-config }
---
# API deployment: migrations disabled, probes wired to the health endpoints.
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ffm-backend
spec:
  replicas: 3
  selector:
    matchLabels: { app: ffm-backend }
  template:
    metadata:
      labels: { app: ffm-backend }
    spec:
      containers:
        - name: api
          image: <registry>/ffm-backend:latest
          ports: [{ containerPort: 8000 }]
          env:
            - name: RUN_MIGRATIONS
              value: "false"
          envFrom:
            - secretRef: { name: ffm-secrets }
            - configMapRef: { name: ffm-config }
          readinessProbe:
            httpGet: { path: /health/ready, port: 8000 }
            initialDelaySeconds: 10
          livenessProbe:
            httpGet: { path: /health/live, port: 8000 }
            initialDelaySeconds: 20
          resources:
            requests: { cpu: "500m", memory: "512Mi" }
            limits:   { cpu: "1500m", memory: "1536Mi" }
```

Because the rate limiter is in-process, three replicas means roughly three times
the configured limit. Swap in a Redis-backed store before relying on it.

---

## 6. Serving trained models

```bash
# Train, then place the artefacts where the API expects them.
python ml/training/train_freshness.py --data ml/datasets/freshness
ls backend/app/ml/models/
```

Docker Compose — mount the directory read-only and switch demo mode off:

```yaml
backend:
  environment:
    DEMO_MODE: "false"
  volumes:
    - ./backend/app/ml/models:/app/app/ml/models:ro
```

Kubernetes — mount a PVC or an init-container download at `MODEL_PATH`, then hot
reload without a restart:

```bash
curl -X POST https://api.example.com/api/v1/admin/system/reload-models \
  -H "Authorization: Bearer <admin token>"
```

Confirm what is actually being served:

```bash
curl https://api.example.com/api/v1/system/models
```

Roles listed under `baseline_roles` are still using the transparent baselines, and
`fallback_notes` explains why. The UI's honesty labelling follows this response
automatically.

---

## 7. Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Backend exits with `error parsing value for field "CORS_ORIGINS"` | List variable given a malformed value | Use `a,b` or `["a","b"]` |
| `/health` returns 503 with `database: disconnected` | Wrong `DATABASE_URL`, or the DB is unreachable | Check credentials and the security group |
| Login fails with the seeded accounts | The seed never ran | `docker compose exec backend python -m app.seed` |
| Uploads disappear after redeploy | `STORAGE_BACKEND=local` with no volume | Switch to `s3`/`azure` or mount a volume |
| `alembic check` fails in CI | Models changed without a migration | `alembic revision --autogenerate -m "…"` |
| Analysis returns 400 `INVALID_IMAGE` | Not a real JPEG/PNG, or over the size limit | Check the file; adjust `MAX_UPLOAD_SIZE_MB` |
| Reports 404 on download | Report files stored on ephemeral disk | Mount a volume at `REPORT_DIR` or regenerate |
| Everything is labelled "Demo AI Analysis" | No trained artefacts loaded | See section 6; check `/api/v1/system/models` |
| Rate limits hit sooner than configured | Multiple workers, in-process limiter | Use a shared store |
| Seeder logs "could not write the sample image library" | `SAMPLE_DIR` not writable | Set `SAMPLE_DIR` to a writable path (harmless otherwise) |
