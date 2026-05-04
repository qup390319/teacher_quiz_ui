"""Initial schema (all 15 tables per spec-11).

Revision ID: 0001_initial
Revises:
Create Date: 2026-04-30
"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers
revision: str = "0001_initial"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ---- users ----
    op.create_table(
        "users",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("account", sa.String(64), nullable=False, unique=True),
        sa.Column("password", sa.String(255), nullable=False),
        sa.Column("role", sa.String(16), nullable=False),
        sa.Column("password_was_default", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("role IN ('teacher','student')", name="users_role_chk"),
    )
    op.create_index("users_role_idx", "users", ["role"])

    # ---- classes ----
    op.create_table(
        "classes",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("name", sa.String(64), nullable=False),
        sa.Column("grade", sa.String(16), nullable=False),
        sa.Column("subject", sa.String(32), nullable=False),
        sa.Column("color", sa.String(7), nullable=False),
        sa.Column("text_color", sa.String(7), nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # ---- teachers ----
    op.create_table(
        "teachers",
        sa.Column("user_id", sa.String(64), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("name", sa.String(64), nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # ---- students ----
    op.create_table(
        "students",
        sa.Column("user_id", sa.String(64), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("name", sa.String(64), nullable=False),
        sa.Column("seat", sa.Integer(), nullable=False),
        sa.Column("class_id", sa.String(32), sa.ForeignKey("classes.id"), nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("seat > 0", name="students_seat_pos"),
        sa.UniqueConstraint("class_id", "seat", name="students_class_seat_idx"),
    )
    op.create_index("students_class_idx", "students", ["class_id"])

    # ---- quizzes ----
    op.create_table(
        "quizzes",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("title", sa.String(128), nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default="draft"),
        sa.Column(
            "knowledge_node_ids",
            postgresql.ARRAY(sa.String(32)),
            nullable=False,
            server_default="{}",
        ),
        sa.Column("created_by", sa.String(64), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("status IN ('draft','published')", name="quizzes_status_chk"),
    )
    op.create_index("quizzes_status_idx", "quizzes", ["status"])
    op.create_index("quizzes_created_by_idx", "quizzes", ["created_by"])

    # ---- quiz_questions ----
    op.create_table(
        "quiz_questions",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("quiz_id", sa.String(32), sa.ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.Column("stem", sa.Text(), nullable=False),
        sa.Column("knowledge_node_id", sa.String(32), nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("quiz_id", "order_index", name="quiz_questions_order_idx"),
    )

    # ---- quiz_options ----
    op.create_table(
        "quiz_options",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("question_id", sa.BigInteger(), sa.ForeignKey("quiz_questions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("tag", sa.String(1), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("diagnosis", sa.String(16), nullable=False),
        sa.CheckConstraint("tag IN ('A','B','C','D')", name="quiz_options_tag_chk"),
        sa.UniqueConstraint("question_id", "tag", name="quiz_options_question_tag_idx"),
    )

    # ---- scenario_quizzes ----
    op.create_table(
        "scenario_quizzes",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("title", sa.String(128), nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default="draft"),
        sa.Column("target_node_id", sa.String(32), nullable=False),
        sa.Column(
            "target_misconceptions",
            postgresql.ARRAY(sa.String(16)),
            nullable=False,
            server_default="{}",
        ),
        sa.Column("created_by", sa.String(64), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("status IN ('draft','published')", name="scenario_quizzes_status_chk"),
    )
    op.create_index("scenario_quizzes_target_node_idx", "scenario_quizzes", ["target_node_id"])

    # ---- scenario_questions ----
    op.create_table(
        "scenario_questions",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("scenario_quiz_id", sa.String(32), sa.ForeignKey("scenario_quizzes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(128), nullable=False),
        sa.Column("scenario_text", sa.Text(), nullable=False),
        sa.Column("scenario_images", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("scenario_image_zoomable", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("initial_message", sa.Text(), nullable=False),
        sa.Column("expert_model", sa.Text(), nullable=False),
        sa.Column(
            "target_misconceptions",
            postgresql.ARRAY(sa.String(16)),
            nullable=False,
            server_default="{}",
        ),
        sa.UniqueConstraint("scenario_quiz_id", "order_index", name="scenario_questions_order_idx"),
    )

    # ---- assignments ----
    op.create_table(
        "assignments",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("type", sa.String(16), nullable=False, server_default="diagnosis"),
        sa.Column("quiz_id", sa.String(32), sa.ForeignKey("quizzes.id"), nullable=True),
        sa.Column("scenario_quiz_id", sa.String(32), sa.ForeignKey("scenario_quizzes.id"), nullable=True),
        sa.Column("class_id", sa.String(32), sa.ForeignKey("classes.id"), nullable=False),
        sa.Column("assigned_at", sa.Date(), nullable=False, server_default=sa.func.current_date()),
        sa.Column("due_date", sa.Date(), nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default="active"),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("type IN ('diagnosis','scenario')", name="assignments_type_chk"),
        sa.CheckConstraint("status IN ('active','completed')", name="assignments_status_chk"),
        sa.CheckConstraint(
            "(type='diagnosis' AND quiz_id IS NOT NULL AND scenario_quiz_id IS NULL) "
            "OR (type='scenario' AND scenario_quiz_id IS NOT NULL AND quiz_id IS NULL)",
            name="assignments_quiz_xor",
        ),
    )
    op.create_index("assignments_class_due_idx", "assignments", ["class_id", "due_date"])
    op.create_index("assignments_quiz_idx", "assignments", ["quiz_id"])
    op.create_index("assignments_scenario_idx", "assignments", ["scenario_quiz_id"])

    # ---- student_answers ----
    op.create_table(
        "student_answers",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("assignment_id", sa.String(64), sa.ForeignKey("assignments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("student_id", sa.String(64), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("question_id", sa.BigInteger(), sa.ForeignKey("quiz_questions.id"), nullable=False),
        sa.Column("selected_tag", sa.String(1), nullable=False),
        sa.Column("diagnosis", sa.String(16), nullable=False),
        sa.Column("answered_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("selected_tag IN ('A','B','C','D')", name="student_answers_tag_chk"),
        sa.UniqueConstraint("assignment_id", "student_id", "question_id", name="student_answers_unique_idx"),
    )
    op.create_index("student_answers_student_idx", "student_answers", ["student_id"])

    # ---- followup_results ----
    op.create_table(
        "followup_results",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("student_answer_id", sa.BigInteger(), sa.ForeignKey("student_answers.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("conversation_log", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("final_status", sa.String(32), nullable=False),
        sa.Column("misconception_code", sa.String(16), nullable=True),
        sa.Column("reasoning_quality", sa.String(16), nullable=False),
        sa.Column("status_change", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("ai_summary", sa.Text(), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("final_status IN ('CORRECT','MISCONCEPTION','UNCERTAIN')", name="followup_status_chk"),
        sa.CheckConstraint("reasoning_quality IN ('SOLID','PARTIAL','WEAK','GUESSING')", name="followup_quality_chk"),
    )

    # ---- treatment_sessions ----
    op.create_table(
        "treatment_sessions",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("scenario_quiz_id", sa.String(32), sa.ForeignKey("scenario_quizzes.id"), nullable=False),
        sa.Column("student_id", sa.String(64), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default="active"),
        sa.Column("current_question_index", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("started_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("completed_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.CheckConstraint("status IN ('active','completed')", name="treatment_sessions_status_chk"),
        sa.UniqueConstraint("scenario_quiz_id", "student_id", name="treatment_sessions_unique_idx"),
    )

    # ---- treatment_messages ----
    op.create_table(
        "treatment_messages",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("session_id", sa.String(64), sa.ForeignKey("treatment_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("question_index", sa.Integer(), nullable=False),
        sa.Column("role", sa.String(8), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("phase", sa.String(16), nullable=True),
        sa.Column("stage", sa.String(16), nullable=True),
        sa.Column("step", sa.Integer(), nullable=True),
        sa.Column("hint_level", sa.Integer(), nullable=True),
        sa.Column("feedback", sa.Text(), nullable=True),
        sa.Column("requires_restatement", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("role IN ('ai','student')", name="treatment_messages_role_chk"),
        sa.CheckConstraint("phase IS NULL OR phase IN ('diagnosis','apprenticeship','completed')", name="treatment_messages_phase_chk"),
        sa.CheckConstraint("stage IS NULL OR stage IN ('claim','evidence','reasoning','revise','complete')", name="treatment_messages_stage_chk"),
        sa.CheckConstraint("step IS NULL OR (step BETWEEN 0 AND 7)", name="treatment_messages_step_chk"),
        sa.CheckConstraint("hint_level IS NULL OR (hint_level BETWEEN 0 AND 3)", name="treatment_messages_hint_chk"),
    )
    op.create_index(
        "treatment_messages_session_q_idx",
        "treatment_messages",
        ["session_id", "question_index", "created_at"],
    )

    # ---- ai_summary_cache ----
    op.create_table(
        "ai_summary_cache",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("scope", sa.String(16), nullable=False),
        sa.Column("scope_id", sa.String(64), nullable=False),
        sa.Column("quiz_id", sa.String(32), sa.ForeignKey("quizzes.id"), nullable=False),
        sa.Column("payload", postgresql.JSONB(), nullable=False),
        sa.Column("citations", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("generated_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("expires_at", sa.TIMESTAMP(timezone=True), nullable=False),
        sa.CheckConstraint("scope IN ('grade','class')", name="ai_summary_cache_scope_chk"),
        sa.UniqueConstraint("scope", "scope_id", "quiz_id", name="ai_summary_cache_unique_idx"),
    )
    op.create_index("ai_summary_cache_expires_idx", "ai_summary_cache", ["expires_at"])


def downgrade() -> None:
    op.drop_table("ai_summary_cache")
    op.drop_table("treatment_messages")
    op.drop_table("treatment_sessions")
    op.drop_table("followup_results")
    op.drop_table("student_answers")
    op.drop_table("assignments")
    op.drop_table("scenario_questions")
    op.drop_table("scenario_quizzes")
    op.drop_table("quiz_options")
    op.drop_table("quiz_questions")
    op.drop_table("quizzes")
    op.drop_table("students")
    op.drop_table("teachers")
    op.drop_table("classes")
    op.drop_table("users")
