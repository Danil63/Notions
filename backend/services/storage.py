import json
import os
import threading
from datetime import date
from pathlib import Path
from typing import Any

DATABASE_URL = os.environ.get("DATABASE_URL")

if DATABASE_URL:
    import psycopg2
    from psycopg2.extras import RealDictCursor

# ========== JSON file backend (local dev) ==========

DATA_DIR = Path(__file__).resolve().parents[2] / "data"
_locks: dict[str, threading.Lock] = {}
_global_lock = threading.Lock()


def _get_lock(filename: str) -> threading.Lock:
    with _global_lock:
        if filename not in _locks:
            _locks[filename] = threading.Lock()
        return _locks[filename]


def _user_dir(user_id: str) -> Path:
    return DATA_DIR / user_id


def _read_json(user_id: str, filename: str, default: Any = None) -> Any:
    path = _user_dir(user_id) / filename
    lock = _get_lock(f"{user_id}/{filename}")
    with lock:
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return default


def _write_json(user_id: str, filename: str, data: Any) -> None:
    user_path = _user_dir(user_id)
    path = user_path / filename
    tmp_path = path.with_suffix(".tmp")
    lock = _get_lock(f"{user_id}/{filename}")
    with lock:
        user_path.mkdir(parents=True, exist_ok=True)
        with open(tmp_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        os.replace(tmp_path, path)


# ========== PostgreSQL backend (production) ==========

def _pg_conn():
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)


# ========== Public interface ==========

def init_storage() -> None:
    if DATABASE_URL:
        with _pg_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("""CREATE TABLE IF NOT EXISTS tasks (
                    user_id TEXT NOT NULL,
                    id TEXT NOT NULL,
                    text TEXT NOT NULL,
                    done BOOLEAN DEFAULT FALSE,
                    date TEXT NOT NULL,
                    PRIMARY KEY (user_id, id, date)
                )""")
                cur.execute("CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks (user_id)")
                cur.execute("""CREATE TABLE IF NOT EXISTS calendar_entries (
                    user_id TEXT NOT NULL,
                    task_id TEXT NOT NULL,
                    task_text TEXT NOT NULL,
                    hour INTEGER NOT NULL,
                    date TEXT NOT NULL,
                    done BOOLEAN DEFAULT FALSE,
                    PRIMARY KEY (user_id, date, hour)
                )""")
                cur.execute("CREATE INDEX IF NOT EXISTS idx_calendar_user ON calendar_entries (user_id)")
                cur.execute("""CREATE TABLE IF NOT EXISTS progress_history (
                    user_id TEXT NOT NULL,
                    date TEXT NOT NULL,
                    tasks_total INTEGER DEFAULT 0,
                    tasks_done INTEGER DEFAULT 0,
                    calendar_total INTEGER DEFAULT 0,
                    calendar_done INTEGER DEFAULT 0,
                    PRIMARY KEY (user_id, date)
                )""")
                cur.execute("CREATE INDEX IF NOT EXISTS idx_progress_user ON progress_history (user_id)")
            conn.commit()
    else:
        DATA_DIR.mkdir(parents=True, exist_ok=True)


def load_tasks(user_id: str) -> dict:
    if DATABASE_URL:
        today = date.today().isoformat()
        with _pg_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT DISTINCT date FROM tasks WHERE user_id = %s ORDER BY date DESC LIMIT 1",
                    (user_id,),
                )
                row = cur.fetchone()
                task_date = row["date"] if row else today
                cur.execute(
                    "SELECT id, text, done FROM tasks WHERE user_id = %s AND date = %s",
                    (user_id, task_date),
                )
                tasks = [dict(r) for r in cur.fetchall()]
        return {"date": task_date, "tasks": tasks}
    else:
        today = date.today().isoformat()
        return _read_json(user_id, "tasks.json", {"date": today, "tasks": []})


def save_tasks(user_id: str, data: dict) -> None:
    if DATABASE_URL:
        with _pg_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM tasks WHERE user_id = %s AND date = %s",
                    (user_id, data["date"]),
                )
                for t in data["tasks"]:
                    cur.execute(
                        "INSERT INTO tasks (user_id, id, text, done, date) VALUES (%s, %s, %s, %s, %s)",
                        (user_id, t["id"], t["text"], t["done"], data["date"]),
                    )
            conn.commit()
    else:
        _write_json(user_id, "tasks.json", data)


def load_calendar(user_id: str) -> dict:
    if DATABASE_URL:
        with _pg_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    'SELECT task_id AS "taskId", task_text AS "taskText", hour, date, done '
                    "FROM calendar_entries WHERE user_id = %s ORDER BY date, hour",
                    (user_id,),
                )
                entries = [dict(r) for r in cur.fetchall()]
        return {"entries": entries}
    else:
        return _read_json(user_id, "calendar.json", {"entries": []})


def save_calendar(user_id: str, data: dict) -> None:
    if DATABASE_URL:
        with _pg_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM calendar_entries WHERE user_id = %s",
                    (user_id,),
                )
                for e in data["entries"]:
                    cur.execute(
                        "INSERT INTO calendar_entries (user_id, task_id, task_text, hour, date, done) "
                        "VALUES (%s, %s, %s, %s, %s, %s)",
                        (user_id, e["taskId"], e["taskText"], e["hour"], e["date"], e["done"]),
                    )
            conn.commit()
    else:
        _write_json(user_id, "calendar.json", data)


def load_progress(user_id: str) -> dict:
    if DATABASE_URL:
        with _pg_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT date, tasks_total, tasks_done, calendar_total, calendar_done "
                    "FROM progress_history WHERE user_id = %s ORDER BY date",
                    (user_id,),
                )
                records = [dict(r) for r in cur.fetchall()]
        return {"records": records}
    else:
        return _read_json(user_id, "progress_history.json", {"records": []})


def append_progress(user_id: str, record: dict) -> None:
    if DATABASE_URL:
        with _pg_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO progress_history (user_id, date, tasks_total, tasks_done, calendar_total, calendar_done) "
                    "VALUES (%s, %s, %s, %s, %s, %s) "
                    "ON CONFLICT (user_id, date) DO UPDATE SET "
                    "tasks_total=EXCLUDED.tasks_total, tasks_done=EXCLUDED.tasks_done, "
                    "calendar_total=EXCLUDED.calendar_total, calendar_done=EXCLUDED.calendar_done",
                    (user_id, record["date"], record["tasks_total"], record["tasks_done"],
                     record["calendar_total"], record["calendar_done"]),
                )
            conn.commit()
    else:
        history = _read_json(user_id, "progress_history.json", {"records": []})
        history["records"].append(record)
        _write_json(user_id, "progress_history.json", history)


def delete_old_calendar_entries(user_id: str, cutoff_date: str) -> None:
    if DATABASE_URL:
        with _pg_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM calendar_entries WHERE user_id = %s AND date < %s",
                    (user_id, cutoff_date),
                )
            conn.commit()
