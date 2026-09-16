# ---------------------------------------------------------------------------
# Backend image: FastAPI + OpenCV (headless) + scikit-learn.
#
# Multi-stage so the runtime image carries no compilers. Runs as a non-root
# user and installs no deep-learning frameworks - the platform runs on the
# baseline models by default (see requirements-ml.txt for the optional extras).
# ---------------------------------------------------------------------------
FROM python:3.12-slim AS builder

ENV PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Build-time dependencies for psycopg2 and any wheels that need compiling.
RUN apt-get update && apt-get install --no-install-recommends -y \
        build-essential \
        libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build
COPY requirements.txt .
RUN python -m venv /opt/venv \
    && /opt/venv/bin/pip install --upgrade pip \
    && /opt/venv/bin/pip install -r requirements.txt \
    # TensorFlow (CPU) to serve the Keras CNN freshness model. Large (~500MB);
    # remove this line if you only use the OpenCV/scikit-learn baselines.
    && /opt/venv/bin/pip install "tensorflow-cpu==2.20.0"


# ---------------------------------------------------------------- runtime ---
FROM python:3.12-slim AS runtime

# PROJECT_ROOT resolves to "/" inside the image, so every writable path the
# application uses is pinned explicitly here.
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/opt/venv/bin:$PATH" \
    PYTHONPATH=/app \
    UPLOAD_DIR=/app/uploads \
    REPORT_DIR=/app/reports \
    MODEL_PATH=/app/app/ml/models \
    SAMPLE_DIR=/app/data/sample

# Runtime libraries: libpq for PostgreSQL, libGL/glib for OpenCV, curl for the
# container healthcheck.
RUN apt-get update && apt-get install --no-install-recommends -y \
        libpq5 \
        libglib2.0-0 \
        libgl1 \
        curl \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --shell /bin/bash --uid 10001 appuser

COPY --from=builder /opt/venv /opt/venv

WORKDIR /app
COPY --chown=appuser:appuser . /app

# Writable runtime directories (uploads, generated reports, model artefacts).
RUN mkdir -p /app/uploads /app/reports /app/app/ml/models /app/data/sample \
    && chown -R appuser:appuser /app/uploads /app/reports /app/app/ml/models /app/data

USER appuser
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
    CMD curl -fsS http://localhost:8000/health/live || exit 1

# The entrypoint waits for the database, runs migrations and seeds on request.
COPY --chown=appuser:appuser docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
ENTRYPOINT ["bash", "/usr/local/bin/docker-entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
