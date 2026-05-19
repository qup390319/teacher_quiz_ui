"""Add ondelete to remaining unprotected FKs.

Class deletion path (assignments, students need CASCADE on class_id):
- assignments.class_id → classes.id  CASCADE
- students.class_id → classes.id  CASCADE

User (student) deletion path (CASCADE for personal data):
- assignment_students.student_id → users.id  CASCADE
- student_answers.student_id → users.id  CASCADE
- treatment_sessions.student_id → users.id  CASCADE

User (teacher) deletion path (SET NULL on author refs to preserve content):
- quizzes.created_by → users.id  SET NULL
- scenario_quizzes.created_by → users.id  SET NULL

Revision ID: 0010_remaining_fk_cascades
Revises: 0009_fk_cascade_fixes
"""

from alembic import op

revision = "0010_remaining_fk_cascades"
down_revision = "0009_fk_cascade_fixes"


def _replace_fk(table: str, column: str, ref_table: str, ondelete: str) -> None:
    fk_name = f"{table}_{column}_fkey"
    op.drop_constraint(fk_name, table, type_="foreignkey")
    op.create_foreign_key(
        fk_name, table, ref_table,
        [column], ["id"],
        ondelete=ondelete,
    )


def upgrade() -> None:
    # Class deletion
    _replace_fk("assignments", "class_id", "classes", "CASCADE")
    _replace_fk("students", "class_id", "classes", "CASCADE")

    # User (student) deletion
    _replace_fk("assignment_students", "student_id", "users", "CASCADE")
    _replace_fk("student_answers", "student_id", "users", "CASCADE")
    _replace_fk("treatment_sessions", "student_id", "users", "CASCADE")

    # User (teacher) deletion — preserve authored content
    _replace_fk("quizzes", "created_by", "users", "SET NULL")
    _replace_fk("scenario_quizzes", "created_by", "users", "SET NULL")


def _restore_fk(table: str, column: str, ref_table: str) -> None:
    fk_name = f"{table}_{column}_fkey"
    op.drop_constraint(fk_name, table, type_="foreignkey")
    op.create_foreign_key(
        fk_name, table, ref_table,
        [column], ["id"],
    )


def downgrade() -> None:
    _restore_fk("scenario_quizzes", "created_by", "users")
    _restore_fk("quizzes", "created_by", "users")
    _restore_fk("treatment_sessions", "student_id", "users")
    _restore_fk("student_answers", "student_id", "users")
    _restore_fk("assignment_students", "student_id", "users")
    _restore_fk("students", "class_id", "classes")
    _restore_fk("assignments", "class_id", "classes")
