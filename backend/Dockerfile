# =====================================================
# SciLens backend (FastAPI + PostgreSQL) — multi-stage
# =====================================================

# ---- Stage 1: build venv with uv ----
FROM python:3.12-slim AS builder

ENV UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1 \
    UV_PYTHON_DOWNLOADS=never

# install uv
COPY --from=ghcr.io/astral-sh/uv:0.5.11 /uv /uvx /bin/

WORKDIR /app

# install deps (cached layer)
COPY pyproject.toml uv.lock* ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev || uv sync --no-dev

# copy source
COPY app ./app
COPY alembic ./alembic
COPY alembic.ini ./

# ---- Stage 2: runtime ----
FROM python:3.12-slim AS runtime

ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# copy venv + source from builder
COPY --from=builder /app /app

# entrypoint: migrate → seed (if empty) → uvicorn
RUN printf '#!/bin/sh\nset -e\nalembic upgrade head\npython -m app.seed.seed --if-empty\nexec uvicorn app.main:app --host 0.0.0.0 --port 8000 "$@"\n' > /entrypoint.sh \
    && chmod +x /entrypoint.sh

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://localhost:8000/health').status==200 else 1)"

ENTRYPOINT ["/entrypoint.sh"]
