# Deployment Guide — AI Food Freshness Monitoring Platform

## Docker Compose (Recommended)

### Full Stack Launch

```bash
# 1. Build and start all services
docker-compose up --build -d

# 2. Verify all containers are running
docker-compose ps

# Expected output:
# fresh_postgres   running   0.0.0.0:5432->5432/tcp
# fresh_mongo      running   0.0.0.0:27017->27017/tcp
# fresh_redis      running   0.0.0.0:6379->6379/tcp
# fresh_backend    running   0.0.0.0:8000->8000/tcp
# fresh_worker     running
# fresh_frontend   running   0.0.0.0:80->80/tcp

# 3. Seed the database (first time only)
docker exec fresh_backend python scripts/seed_data.py

# 4. Access the platform
# Frontend:  http://localhost
# API Docs:  http://localhost:8000/docs
```

### Stopping Services

```bash
# Stop without removing data
docker-compose stop

# Stop and remove containers (keeps volumes)
docker-compose down

# Full reset (removes all data volumes — DESTRUCTIVE)
docker-compose down -v
```

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Individual service
docker-compose logs -f backend
docker-compose logs -f celery_worker
docker-compose logs -f frontend
```

---

## Service Ports

| Service | Port | Notes |
|---------|------|-------|
| Frontend (NGINX) | `80` | React SPA + proxy |
| FastAPI Backend | `8000` | REST API + Swagger UI |
| PostgreSQL | `5432` | Relational database |
| MongoDB | `27017` | Logs & analytics |
| Redis | `6379` | Celery message broker |

---

## Production Deployment Checklist

### Security
- [ ] Change `JWT_SECRET` to a cryptographically random 64-char string
- [ ] Set `POSTGRES_PASSWORD` to a strong password
- [ ] Remove public port bindings for `db`, `mongo`, `redis` in production `docker-compose.yml`
- [ ] Enable HTTPS with SSL certificate (Let's Encrypt or ACM)
- [ ] Set `allow_origins` in CORS to specific domain(s) only
- [ ] Add rate limiting headers to NGINX config

### NGINX HTTPS Configuration

Add to `docker/nginx.conf` for production:

```nginx
server {
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    # ... rest of config
}

server {
    listen 80;
    return 301 https://$host$request_uri;
}
```

### Scaling Workers

Scale Celery workers independently:

```bash
docker-compose up --scale celery_worker=3 -d
```

### AI Model Updates

```bash
# Retrain models locally
cd ai && python train.py

# Copy new weights into running container
docker cp models/food_freshness_cnn.pth fresh_backend:/app/models/
docker cp models/shelf_life_regressor.pth fresh_backend:/app/models/

# Restart backend to reload weights
docker-compose restart backend
```

---

## GitHub Actions CI/CD

Create `.github/workflows/deploy.yml`:

```yaml
name: Build and Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.10'
      - name: Install dependencies
        run: pip install -r backend/requirements.txt pytest httpx
      - name: Run AI tests
        run: python -m pytest tests/test_ai.py -v

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build Docker images
        run: docker-compose build
      - name: Push to registry
        run: |
          docker tag fresh_backend your-registry/fresh-backend:latest
          docker push your-registry/fresh-backend:latest
```

---

## Environment-Specific Configs

### Development
```bash
# .env
POSTGRES_HOST=localhost
REDIS_HOST=localhost
MONGO_HOST=localhost
```

### Docker (within compose network)
```bash
# docker-compose.yml environment section
POSTGRES_HOST=db
REDIS_HOST=redis
MONGO_HOST=mongo
```

### Production (AWS / Azure)
```bash
POSTGRES_HOST=your-rds-endpoint.amazonaws.com
REDIS_HOST=your-elasticache-endpoint.amazonaws.com
MONGO_HOST=your-documentdb-endpoint.amazonaws.com
```
