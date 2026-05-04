"""Assignment schemas."""
from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class AssignmentIO(BaseModel):
    id: str
    type: Literal["diagnosis", "scenario"]
    quiz_id: str | None = Field(default=None, serialization_alias="quizId")
    scenario_quiz_id: str | None = Field(default=None, serialization_alias="scenarioQuizId")
    class_id: str = Field(serialization_alias="classId")
    assigned_at: date = Field(serialization_alias="assignedAt")
    due_date: date = Field(serialization_alias="dueDate")
    status: Literal["active", "completed"]
    # Completion stats — computed on read; 0 when no answers yet
    completion_rate: int = Field(default=0, serialization_alias="completionRate")
    submitted_count: int = Field(default=0, serialization_alias="submittedCount")
    total_students: int = Field(default=0, serialization_alias="totalStudents")

    model_config = ConfigDict(populate_by_name=True)


class AssignmentCreate(BaseModel):
    type: Literal["diagnosis", "scenario"] = "diagnosis"
    quiz_id: str | None = Field(default=None, alias="quizId")
    scenario_quiz_id: str | None = Field(default=None, alias="scenarioQuizId")
    class_id: str = Field(alias="classId")
    due_date: date = Field(alias="dueDate")
    status: Literal["active", "completed"] = "active"
    # assignedAt defaults to today on the server

    model_config = ConfigDict(populate_by_name=True)

    @model_validator(mode="after")
    def _check_xor(self) -> "AssignmentCreate":
        if self.type == "diagnosis":
            if not self.quiz_id or self.scenario_quiz_id:
                raise ValueError("diagnosis assignment must have quizId only")
        else:
            if not self.scenario_quiz_id or self.quiz_id:
                raise ValueError("scenario assignment must have scenarioQuizId only")
        return self


class AssignmentUpdate(BaseModel):
    """PATCH body — only modifiable fields."""
    due_date: date | None = Field(default=None, alias="dueDate")
    status: Literal["active", "completed"] | None = None

    model_config = ConfigDict(populate_by_name=True)
