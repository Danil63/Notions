from fastapi import APIRouter, Request

from backend.models import SessionResponse
from backend.services.day_reset import check_and_reset_tasks
from backend.services.calendar_cleanup import cleanup_calendar
from backend.services.storage import load_progress

router = APIRouter()


@router.get("/session")
def get_session(request: Request) -> SessionResponse:
    user_id = request.state.user_id
    tasks = check_and_reset_tasks(user_id)
    calendar = cleanup_calendar(user_id)
    progress = load_progress(user_id)

    return SessionResponse(
        tasks=tasks,
        calendar=calendar,
        progress=progress,
    )
