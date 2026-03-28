from fastapi import APIRouter, Request

from backend.models import ProgressHistory, SessionResponse, TasksData
from backend.services.day_reset import cleanup_old_tasks
from backend.services.calendar_cleanup import cleanup_calendar
from backend.services.storage import load_tasks, load_progress

router = APIRouter()


@router.get("/session")
def get_session(request: Request) -> SessionResponse:
    user_id = request.state.user_id
    cleanup_old_tasks(user_id=user_id)
    raw = load_tasks(user_id=user_id)
    tasks = TasksData(**raw)
    calendar = cleanup_calendar(user_id=user_id)
    progress = ProgressHistory(**load_progress(user_id=user_id))

    return SessionResponse(
        tasks=tasks,
        calendar=calendar,
        progress=progress,
    )
