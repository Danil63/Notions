from datetime import date, timedelta

from backend.models import CalendarData
from backend.services.storage import load_calendar, save_calendar, delete_old_calendar_entries

MAX_AGE_DAYS = 7


def cleanup_calendar() -> CalendarData:
    cutoff = (date.today() - timedelta(days=MAX_AGE_DAYS)).isoformat()
    delete_old_calendar_entries(cutoff)

    raw = load_calendar()
    entries = raw.get("entries", [])
    entries = [{**e, "done": e.get("done", False)} for e in entries]

    return CalendarData(entries=entries)
