from datetime import date, timedelta

from backend.services.storage import delete_old_tasks

MAX_TASK_AGE_DAYS = 365


def cleanup_old_tasks(user_id: str) -> None:
    cutoff = (date.today() - timedelta(days=MAX_TASK_AGE_DAYS)).isoformat()
    delete_old_tasks(user_id=user_id, cutoff_date=cutoff)
