# ===========================================================
# AI Food Freshness Monitoring Platform — Developer Makefile
# ===========================================================

.PHONY: help up down logs seed train test test-ai test-api clean

help:
	@echo ""
	@echo " AI Food Freshness Monitoring Platform"
	@echo " ======================================"
	@echo " make up         — Build & start all Docker services"
	@echo " make down       — Stop all Docker services"
	@echo " make logs       — Stream logs from all containers"
	@echo " make seed       — Seed the database with demo data"
	@echo " make train      — Train PyTorch AI models"
	@echo " make test       — Run all tests (AI + API)"
	@echo " make test-ai    — Run AI unit tests only"
	@echo " make test-api   — Run API integration tests only"
	@echo " make clean      — Remove test DB artifacts"
	@echo ""

# ─── Docker ───────────────────────────────────────────────
up:
	docker-compose up --build -d

down:
	docker-compose down

logs:
	docker-compose logs -f

seed:
	docker exec fresh_backend python scripts/seed_data.py

# ─── AI ───────────────────────────────────────────────────
train:
	cd ai && python train.py

evaluate:
	cd ai && python evaluate.py

# ─── Testing ──────────────────────────────────────────────
test: test-ai test-api

test-ai:
	python -m pytest tests/test_ai.py -v

test-api:
	python -m pytest tests/test_api.py -v

test-cov:
	python -m pytest tests/ --cov=backend --cov=ai --cov-report=html
	@echo "Coverage report: htmlcov/index.html"

# ─── Frontend ─────────────────────────────────────────────
frontend-install:
	cd frontend && npm install

frontend-dev:
	cd frontend && npm run dev

frontend-build:
	cd frontend && npm run build

# ─── Backend (Local Dev) ──────────────────────────────────
backend-dev:
	uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000

# ─── Cleanup ──────────────────────────────────────────────
clean:
	del /f /q test_food_freshness.db 2>nul || true
	rmdir /s /q .pytest_cache 2>nul || true
	rmdir /s /q htmlcov 2>nul || true
