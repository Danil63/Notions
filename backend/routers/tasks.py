from fastapi import APIRouter, Request

from backend.models import TasksData
from backend.services.day_reset import cleanup_old_tasks
from backend.services.storage import load_tasks, save_tasks

router = APIRouter()


@router.get("/tasks")
def get_tasks(request: Request) -> TasksData:
    user_id = request.state.user_id
    cleanup_old_tasks(user_id=user_id)
    raw = load_tasks(user_id=user_id)
    return TasksData(**raw)


@router.patch("/tasks")
def patch_tasks(data: TasksData, request: Request) -> TasksData:
    save_tasks(user_id=request.state.user_id, data=data.model_dump())
    return data
