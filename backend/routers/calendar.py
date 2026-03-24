from fastapi import APIRouter

from backend.models import CalendarData
from backend.services.calendar_cleanup import cleanup_calendar
from backend.services.storage import save_calendar

router = APIRouter()


@router.get("/calendar")
def get_calendar() -> CalendarData:
    return cleanup_calendar()


@router.patch("/calendar")
def patch_calendar(data: CalendarData) -> CalendarData:
    save_calendar(data.model_dump())
    return data
