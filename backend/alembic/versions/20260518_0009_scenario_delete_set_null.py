"""Fix FK cascade for quiz & scenario deletion.

- assignments.quiz_id: add ondelete SET NULL
- assignments.scenario_quiz_id: add ondelete SET NULL
- assignments CHECK: relax to allow NULL quiz_id / scenario_quiz_id after parent deleted
- student_answers.question_id: make nullable, add ondelete SET NULL
- ai_summary_cache.quiz_id: add ondelete CASCADE
- treatment_sessions.scenario_quiz_id: make nullable, add ondelete SET NULL

Also fix: _replace_questions MissingGreenlet (code-only fix, no migration needed)

Revision ID: 0009
Revises: 0008
"""

from alembic import op

revision = "0009_fk_cascade_fixes"
down_revision = "0008_treatment_phase_cer"


def upgrade() -> None:
    # --- assignments CHECK ---
    op.drop_constraint("assignments_quiz_xor", "assignments", type_="check")
    op.execute(
        "ALTER TABLE assignments ADD CONSTRAINT assignments_quiz_xor "
        "CHECK ("
        "(type='diagnosis' AND scenario_quiz_id IS NULL) "
        "OR (type='scenario' AND quiz_id IS NULL)"
        ")"
    )

    # --- assignments.quiz_id ---
    op.drop_constraint(
        "assignments_quiz_id_fkey", "assignments", type_="foreignkey",
    )
    op.create_foreign_key(
        "assignments_quiz_id_fkey",
        "assignments", "quizzes",
        ["quiz_id"], ["id"],
        ondelete="SET NULL",
    )

    # --- assignments.scenario_quiz_id ---
    op.drop_constraint(
        "assignments_scenario_quiz_id_fkey", "assignments", type_="foreignkey",
    )
    op.create_foreign_key(
        "assignments_scenario_quiz_id_fkey",
        "assignments", "scenario_quizzes",
        ["scenario_quiz_id"], ["id"],
        ondelete="SET NULL",
    )

    # --- student_answers.question_id ---
    op.alter_column(
        "student_answers", "question_id",
        nullable=True,
    )
    op.drop_constraint(
        "student_answers_question_id_fkey", "student_answers", type_="foreignkey",
    )
    op.create_foreign_key(
        "student_answers_question_id_fkey",
        "student_answers", "quiz_questions",
        ["question_id"], ["id"],
        ondelete="SET NULL",
    )

    # --- ai_summary_cache.quiz_id ---
    op.drop_constraint(
        "ai_summary_cache_quiz_id_fkey", "ai_summary_cache", type_="foreignkey",
    )
    op.create_foreign_key(
        "ai_summary_cache_quiz_id_fkey",
        "ai_summary_cache", "quizzes",
        ["quiz_id"], ["id"],
        ondelete="CASCADE",
    )

    # --- treatment_sessions.scenario_quiz_id ---
    op.alter_column(
        "treatment_sessions", "scenario_quiz_id",
        nullable=True,
    )
    op.drop_constraint(
        "treatment_sessions_scenario_quiz_id_fkey", "treatment_sessions",
        type_="foreignkey",
    )
    op.create_foreign_key(
        "treatment_sessions_scenario_quiz_id_fkey",
        "treatment_sessions", "scenario_quizzes",
        ["scenario_quiz_id"], ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    # --- treatment_sessions ---
    op.drop_constraint(
        "treatment_sessions_scenario_quiz_id_fkey", "treatment_sessions",
        type_="foreignkey",
    )
    op.create_foreign_key(
        "treatment_sessions_scenario_quiz_id_fkey",
        "treatment_sessions", "scenario_quizzes",
        ["scenario_quiz_id"], ["id"],
    )
    op.alter_column(
        "treatment_sessions", "scenario_quiz_id",
        nullable=False,
    )

    # --- ai_summary_cache ---
    op.drop_constraint(
        "ai_summary_cache_quiz_id_fkey", "ai_summary_cache", type_="foreignkey",
    )
    op.create_foreign_key(
        "ai_summary_cache_quiz_id_fkey",
        "ai_summary_cache", "quizzes",
        ["quiz_id"], ["id"],
    )

    # --- student_answers ---
    op.drop_constraint(
        "student_answers_question_id_fkey", "student_answers", type_="foreignkey",
    )
    op.create_foreign_key(
        "student_answers_question_id_fkey",
        "student_answers", "quiz_questions",
        ["question_id"], ["id"],
    )
    op.alter_column(
        "student_answers", "question_id",
        nullable=False,
    )

    # --- assignments ---
    op.drop_constraint(
        "assignments_scenario_quiz_id_fkey", "assignments", type_="foreignkey",
    )
    op.create_foreign_key(
        "assignments_scenario_quiz_id_fkey",
        "assignments", "scenario_quizzes",
        ["scenario_quiz_id"], ["id"],
    )
    op.drop_constraint(
        "assignments_quiz_id_fkey", "assignments", type_="foreignkey",
    )
    op.create_foreign_key(
        "assignments_quiz_id_fkey",
        "assignments", "quizzes",
        ["quiz_id"], ["id"],
    )
    op.drop_constraint("assignments_quiz_xor", "assignments", type_="check")
    op.execute(
        "ALTER TABLE assignments ADD CONSTRAINT assignments_quiz_xor "
        "CHECK ("
        "(type='diagnosis' AND quiz_id IS NOT NULL AND scenario_quiz_id IS NULL) "
        "OR (type='scenario' AND scenario_quiz_id IS NOT NULL AND quiz_id IS NULL)"
        ")"
    )
