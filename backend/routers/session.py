from fastapi import APIRouter

from backend.models import SessionResponse
from backend.services.day_reset import check_and_reset_tasks
from backend.services.calendar_cleanup import cleanup_calendar
from backend.services.storage import load_progress

router = APIRouter()


@router.get("/session")
def get_session() -> SessionResponse:
    tasks = check_and_reset_tasks()
    calendar = cleanup_calendar()
    progress = load_progress()

    return SessionResponse(
        tasks=tasks,
        calendar=calendar,
        progress=progress,
    )
