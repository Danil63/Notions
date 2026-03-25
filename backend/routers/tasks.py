from fastapi import APIRouter, Request

from backend.models import TasksData
from backend.services.day_reset import check_and_reset_tasks
from backend.services.storage import save_tasks

router = APIRouter()


@router.get("/tasks")
def get_tasks(request: Request) -> TasksData:
    return check_and_reset_tasks(request.state.user_id)


@router.patch("/tasks")
def patch_tasks(data: TasksData, request: Request) -> TasksData:
    save_tasks(request.state.user_id, data.model_dump())
    return data
