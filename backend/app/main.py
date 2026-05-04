"""FastAPI app entry point."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import ai as ai_router
from app.routers import answers as answers_router
from app.routers import assignments as assignments_router
from app.routers import auth as auth_router
from app.routers import classes as classes_router
from app.routers import llm as llm_router
from app.routers import quizzes as quizzes_router
from app.routers import scenarios as scenarios_router
from app.routers import students as students_router
from app.routers import treatment as treatment_router

app = FastAPI(title="SciLens Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(auth_router.router, prefix="/api/auth", tags=["auth"])
app.include_router(students_router.router, prefix="/api/students", tags=["students"])
app.include_router(classes_router.router, prefix="/api/classes", tags=["classes"])
app.include_router(quizzes_router.router, prefix="/api/quizzes", tags=["quizzes"])
app.include_router(scenarios_router.router, prefix="/api/scenarios", tags=["scenarios"])
app.include_router(assignments_router.router, prefix="/api/assignments", tags=["assignments"])
app.include_router(llm_router.router, prefix="/api/llm", tags=["llm"])
app.include_router(ai_router.router, prefix="/api/ai", tags=["ai"])
# P4: answers split into multiple mounts for clean URL design
app.include_router(answers_router.router, prefix="/api", tags=["answers"])  # /api/answers, /api/answers/followups
app.include_router(answers_router.quiz_router, prefix="/api/quizzes", tags=["answers"])  # /api/quizzes/{id}/answers, /stats
app.include_router(answers_router.student_router, prefix="/api/students", tags=["answers"])  # /api/students/{id}/history
app.include_router(treatment_router.router, prefix="/api/treatment", tags=["treatment"])
app.include_router(treatment_router.teacher_router, prefix="/api/teachers", tags=["treatment"])
