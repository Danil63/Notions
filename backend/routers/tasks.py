from fastapi import APIRouter

from backend.models import TasksData
from backend.services.day_reset import check_and_reset_tasks
from backend.services.storage import save_tasks

router = APIRouter()


@router.get("/tasks")
def get_tasks() -> TasksData:
    return check_and_reset_tasks()


@router.patch("/tasks")
def patch_tasks(data: TasksData) -> TasksData:
    save_tasks(data.model_dump())
    return data
