"""FastAPI app entry point."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import adaptive as adaptive_router
from app.routers import admin_classes as admin_classes_router
from app.routers import admin_docx_import as admin_docx_import_router
from app.routers import admin_knowledge_nodes as admin_knowledge_nodes_router
from app.routers import admin_misconceptions as admin_misconceptions_router
from app.routers import admin_parent_nodes as admin_parent_nodes_router
from app.routers import admin_quizzes as admin_quizzes_router
from app.routers import admin_units as admin_units_router
from app.routers import admin_users as admin_users_router
from app.routers import ai as ai_router
from app.routers import answers as answers_router
from app.routers import assignments as assignments_router
from app.routers import auth as auth_router
from app.routers import class_categories as class_categories_router
from app.routers import classes as classes_router

# 概念釐清模組已下線（前端 UI 移除）；router 保留實作檔但不再 mount。
# from app.routers import scenarios as scenarios_router
from app.routers import knowledge_nodes as knowledge_nodes_router
from app.routers import llm as llm_router
from app.routers import misconceptions as misconceptions_router
from app.routers import parent_nodes as parent_nodes_router
from app.routers import quizzes as quizzes_router
from app.routers import students as students_router
from app.routers import units as units_router

# from app.routers import treatment as treatment_router

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
app.include_router(admin_users_router.router, prefix="/api/admin/users", tags=["admin"])
app.include_router(admin_classes_router.router, prefix="/api/admin/classes", tags=["admin"])
app.include_router(admin_units_router.router, prefix="/api/admin/units", tags=["admin"])
# docx 匯入：掛同樣 prefix 讓 URL 自然落在 /api/admin/units/import-docx
app.include_router(admin_docx_import_router.router, prefix="/api/admin/units", tags=["admin"])
app.include_router(admin_quizzes_router.router, prefix="/api/admin/quizzes", tags=["admin"])
app.include_router(admin_knowledge_nodes_router.router, prefix="/api/admin/knowledge-nodes", tags=["admin"])
app.include_router(admin_misconceptions_router.router, prefix="/api/admin/misconceptions", tags=["admin"])
app.include_router(admin_parent_nodes_router.router, prefix="/api/admin/parent-nodes", tags=["admin"])
app.include_router(parent_nodes_router.router, prefix="/api/parent-nodes", tags=["parent-nodes"])
app.include_router(units_router.router, prefix="/api/units", tags=["units"])
app.include_router(knowledge_nodes_router.router, prefix="/api/knowledge-nodes", tags=["knowledge-nodes"])
app.include_router(students_router.router, prefix="/api/students", tags=["students"])
app.include_router(classes_router.router, prefix="/api/classes", tags=["classes"])
app.include_router(class_categories_router.router, prefix="/api/class-categories", tags=["class-categories"])
app.include_router(quizzes_router.router, prefix="/api/quizzes", tags=["quizzes"])
app.include_router(misconceptions_router.router, prefix="/api/misconceptions", tags=["misconceptions"])
# 概念釐清模組已下線（前端 UI 移除）；router 保留實作檔但不再 mount。
# app.include_router(scenarios_router.router, prefix="/api/scenarios", tags=["scenarios"])
app.include_router(assignments_router.router, prefix="/api/assignments", tags=["assignments"])
app.include_router(llm_router.router, prefix="/api/llm", tags=["llm"])
app.include_router(ai_router.router, prefix="/api/ai", tags=["ai"])
app.include_router(adaptive_router.router, prefix="/api/adaptive", tags=["adaptive"])
# P4: answers split into multiple mounts for clean URL design
app.include_router(answers_router.router, prefix="/api", tags=["answers"])  # /api/answers, /api/answers/followups
app.include_router(answers_router.quiz_router, prefix="/api/quizzes", tags=["answers"])  # /api/quizzes/{id}/answers, /stats
app.include_router(answers_router.student_router, prefix="/api/students", tags=["answers"])  # /api/students/{id}/history
# 概念釐清模組已下線（前端 UI 移除）；router 保留實作檔但不再 mount。
# app.include_router(treatment_router.router, prefix="/api/treatment", tags=["treatment"])
# app.include_router(treatment_router.teacher_router, prefix="/api/teachers", tags=["treatment"])
app.include_router(answers_router.teacher_router, prefix="/api/teachers", tags=["answers"])  # /api/teachers/diagnosis-logs
