from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from .models import Priority


class UserCreate(BaseModel):
    email: EmailStr
    name: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=6, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    name: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class TaskCreate(BaseModel):
    text: str = Field(min_length=1, max_length=500, description="Свободный текст задачи, дата извлекается автоматически")
    category: str | None = Field(default=None, max_length=50)
    priority: Priority = Priority.medium
    due_at: datetime | None = Field(default=None, description="Если задано явно — имеет приоритет над распознанной датой")


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    category: str | None = Field(default=None, max_length=50)
    priority: Priority | None = None
    due_at: datetime | None = None
    clear_due: bool = False
    is_done: bool | None = None


class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    raw_text: str | None
    category: str | None
    priority: Priority
    due_at: datetime | None
    is_done: bool
    created_at: datetime
    updated_at: datetime


class ParsePreview(BaseModel):
    title: str
    due_at: datetime | None
    matched: list[str]


class TaskStats(BaseModel):
    total: int
    done: int
    overdue: int
    today: int
