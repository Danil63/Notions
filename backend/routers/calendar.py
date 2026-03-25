from fastapi import APIRouter, Request

from backend.models import CalendarData
from backend.services.calendar_cleanup import cleanup_calendar
from backend.services.storage import save_calendar

router = APIRouter()


@router.get("/calendar")
def get_calendar(request: Request) -> CalendarData:
    return cleanup_calendar(request.state.user_id)


@router.patch("/calendar")
def patch_calendar(data: CalendarData, request: Request) -> CalendarData:
    save_calendar(request.state.user_id, data.model_dump())
    return data
