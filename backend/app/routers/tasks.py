from datetime import datetime, time, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .. import schemas
from ..auth import get_current_user
from ..database import get_db
from ..models import Priority, Task, User
from ..nlp import parse_task

router = APIRouter(prefix="/api/tasks", tags=["tasks"])

Scope = Literal["all", "today", "overdue", "upcoming", "done", "no_date"]


def _get_own_task(task_id: int, db: Session, user: User) -> Task:
    task = db.get(Task, task_id)
    if task is None or task.owner_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Задача не найдена")
    return task


@router.post("/parse", response_model=schemas.ParsePreview)
def parse_preview(payload: schemas.TaskCreate, _: User = Depends(get_current_user)):
    result = parse_task(payload.text)
    return schemas.ParsePreview(title=result.title, due_at=result.due_at, matched=result.matched)


@router.get("", response_model=list[schemas.TaskOut])
def list_tasks(
    scope: Scope = "all",
    category: str | None = None,
    priority: Priority | None = None,
    search: str | None = Query(default=None, max_length=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    now = datetime.now()
    start_today = datetime.combine(now.date(), time.min)
    end_today = start_today + timedelta(days=1)

    stmt = select(Task).where(Task.owner_id == user.id)
    if scope == "today":
        stmt = stmt.where(Task.is_done.is_(False), Task.due_at >= start_today, Task.due_at < end_today)
    elif scope == "overdue":
        stmt = stmt.where(Task.is_done.is_(False), Task.due_at < now)
    elif scope == "upcoming":
        stmt = stmt.where(Task.is_done.is_(False), Task.due_at >= end_today)
    elif scope == "done":
        stmt = stmt.where(Task.is_done.is_(True))
    elif scope == "no_date":
        stmt = stmt.where(Task.is_done.is_(False), Task.due_at.is_(None))
    if category:
        stmt = stmt.where(Task.category == category)
    if priority:
        stmt = stmt.where(Task.priority == priority)
    if search:
        stmt = stmt.where(Task.title.ilike(f"%{search}%"))

    stmt = stmt.order_by(Task.is_done, Task.due_at.is_(None), Task.due_at, Task.created_at.desc())
    return list(db.scalars(stmt))


@router.get("/stats", response_model=schemas.TaskStats)
def stats(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    now = datetime.now()
    start_today = datetime.combine(now.date(), time.min)
    end_today = start_today + timedelta(days=1)
    base = select(func.count()).select_from(Task).where(Task.owner_id == user.id)
    return schemas.TaskStats(
        total=db.scalar(base) or 0,
        done=db.scalar(base.where(Task.is_done.is_(True))) or 0,
        overdue=db.scalar(base.where(Task.is_done.is_(False), Task.due_at < now)) or 0,
        today=db.scalar(base.where(Task.is_done.is_(False), Task.due_at >= start_today, Task.due_at < end_today)) or 0,
    )


@router.get("/categories", response_model=list[str])
def categories(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    stmt = (
        select(Task.category)
        .where(Task.owner_id == user.id, Task.category.is_not(None), Task.category != "")
        .distinct()
        .order_by(Task.category)
    )
    return list(db.scalars(stmt))


@router.post("", response_model=schemas.TaskOut, status_code=status.HTTP_201_CREATED)
def create_task(payload: schemas.TaskCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    parsed = parse_task(payload.text)
    task = Task(
        owner_id=user.id,
        title=parsed.title,
        raw_text=payload.text,
        category=(payload.category or "").strip() or None,
        priority=payload.priority,
        due_at=payload.due_at if payload.due_at is not None else parsed.due_at,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.get("/{task_id}", response_model=schemas.TaskOut)
def get_task(task_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return _get_own_task(task_id, db, user)


@router.patch("/{task_id}", response_model=schemas.TaskOut)
def update_task(
    task_id: int, payload: schemas.TaskUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    task = _get_own_task(task_id, db, user)
    data = payload.model_dump(exclude_unset=True, exclude={"clear_due"})
    for field, value in data.items():
        if field == "category":
            value = (value or "").strip() or None
        setattr(task, field, value)
    if payload.clear_due:
        task.due_at = None
    db.commit()
    db.refresh(task)
    return task


@router.post("/{task_id}/toggle", response_model=schemas.TaskOut)
def toggle_task(task_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    task = _get_own_task(task_id, db, user)
    task.is_done = not task.is_done
    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    task = _get_own_task(task_id, db, user)
    db.delete(task)
    db.commit()
