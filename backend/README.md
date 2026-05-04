# SciLens Backend

FastAPI + PostgreSQL backend for the SciLens misconception diagnosis system.

See `docs/spec-10-backend-architecture.md` for full architecture.

## Local development

```bash
cd backend
uv sync                                  # install deps
uv run alembic upgrade head              # apply migrations
uv run python -m app.seed.seed           # seed mock data
uv run uvicorn app.main:app --reload --port 8000
```

## Docker

```bash
# from project root
docker compose up backend postgres
```

## Tests

```bash
uv run pytest
uv run ruff check .
```
