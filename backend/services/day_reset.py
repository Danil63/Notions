from datetime import date

from backend.models import TasksData, ProgressRecord
from backend.services.storage import load_tasks, save_tasks, load_calendar, append_progress


def check_and_reset_tasks(user_id: str) -> TasksData:
    today = date.today().isoformat()
    raw = load_tasks(user_id)
    tasks_data = TasksData(**raw)

    if tasks_data.date != today and tasks_data.tasks:
        cal_raw = load_calendar(user_id)
        cal_entries = [e for e in cal_raw.get("entries", []) if e.get("date") == tasks_data.date]

        record = ProgressRecord(
            date=tasks_data.date,
            tasks_total=len(tasks_data.tasks),
            tasks_done=sum(1 for t in tasks_data.tasks if t.done),
            calendar_total=len(cal_entries),
            calendar_done=sum(1 for e in cal_entries if e.get("done", False)),
        )
        append_progress(user_id, record.model_dump())

        tasks_data = TasksData(date=today, tasks=[])
        save_tasks(user_id, tasks_data.model_dump())

    elif tasks_data.date != today:
        tasks_data = TasksData(date=today, tasks=[])
        save_tasks(user_id, tasks_data.model_dump())

    return tasks_data
