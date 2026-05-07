"""Re-export all ORM models so Alembic autogenerate sees them."""
from app.db.models.answer import FollowupResult, StudentAnswer
from app.db.models.assignment import Assignment
from app.db.models.assignment_student import AssignmentStudent
from app.db.models.cache import AiSummaryCache
from app.db.models.class_ import Class
from app.db.models.quiz import Quiz, QuizOption, QuizQuestion
from app.db.models.scenario import ScenarioQuestion, ScenarioQuiz
from app.db.models.treatment import TreatmentMessage, TreatmentSession
from app.db.models.user import Student, Teacher, User

__all__ = [
    "AiSummaryCache",
    "Assignment",
    "AssignmentStudent",
    "Class",
    "FollowupResult",
    "Quiz",
    "QuizOption",
    "QuizQuestion",
    "ScenarioQuestion",
    "ScenarioQuiz",
    "Student",
    "StudentAnswer",
    "Teacher",
    "TreatmentMessage",
    "TreatmentSession",
    "User",
]
