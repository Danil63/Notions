from pydantic import BaseModel


class Task(BaseModel):
    id: str
    text: str
    done: bool
    date: str


class TasksData(BaseModel):
    tasks: list[Task]


class CalendarEntry(BaseModel):
    taskId: str
    taskText: str
    hour: int
    duration: int = 1
    date: str
    done: bool


class CalendarData(BaseModel):
    entries: list[CalendarEntry]


class ProgressRecord(BaseModel):
    date: str
    tasks_total: int
    tasks_done: int
    calendar_total: int
    calendar_done: int


class ProgressHistory(BaseModel):
    records: list[ProgressRecord]


class SessionResponse(BaseModel):
    tasks: TasksData
    calendar: CalendarData
    progress: ProgressHistory
