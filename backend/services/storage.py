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


def _read_json(filename: str, default: Any = None) -> Any:
    path = DATA_DIR / filename
    lock = _get_lock(filename)
    with lock:
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return default


def _write_json(filename: str, data: Any) -> None:
    path = DATA_DIR / filename
    tmp_path = path.with_suffix(".tmp")
    lock = _get_lock(filename)
    with lock:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
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
                    id TEXT PRIMARY KEY,
                    text TEXT NOT NULL,
                    done BOOLEAN DEFAULT FALSE,
                    date TEXT NOT NULL
                )""")
                cur.execute("""CREATE TABLE IF NOT EXISTS calendar_entries (
                    task_id TEXT NOT NULL,
                    task_text TEXT NOT NULL,
                    hour INTEGER NOT NULL,
                    date TEXT NOT NULL,
                    done BOOLEAN DEFAULT FALSE,
                    PRIMARY KEY (date, hour)
                )""")
                cur.execute("""CREATE TABLE IF NOT EXISTS progress_history (
                    date TEXT PRIMARY KEY,
                    tasks_total INTEGER DEFAULT 0,
                    tasks_done INTEGER DEFAULT 0,
                    calendar_total INTEGER DEFAULT 0,
                    calendar_done INTEGER DEFAULT 0
                )""")
            conn.commit()
    else:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        today = date.today().isoformat()
        defaults = {
            "tasks.json": {"date": today, "tasks": []},
            "calendar.json": {"entries": []},
            "progress_history.json": {"records": []},
        }
        for filename, default_data in defaults.items():
            if not (DATA_DIR / filename).exists():
                _write_json(filename, default_data)


def load_tasks() -> dict:
    if DATABASE_URL:
        today = date.today().isoformat()
        with _pg_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT DISTINCT date FROM tasks ORDER BY date DESC LIMIT 1")
                row = cur.fetchone()
                task_date = row["date"] if row else today
                cur.execute("SELECT id, text, done FROM tasks WHERE date = %s", (task_date,))
                tasks = [dict(r) for r in cur.fetchall()]
        return {"date": task_date, "tasks": tasks}
    else:
        today = date.today().isoformat()
        return _read_json("tasks.json", {"date": today, "tasks": []})


def save_tasks(data: dict) -> None:
    if DATABASE_URL:
        with _pg_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM tasks WHERE date = %s", (data["date"],))
                for t in data["tasks"]:
                    cur.execute(
                        "INSERT INTO tasks (id, text, done, date) VALUES (%s, %s, %s, %s)",
                        (t["id"], t["text"], t["done"], data["date"]),
                    )
            conn.commit()
    else:
        _write_json("tasks.json", data)


def load_calendar() -> dict:
    if DATABASE_URL:
        with _pg_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    'SELECT task_id AS "taskId", task_text AS "taskText", hour, date, done '
                    "FROM calendar_entries ORDER BY date, hour"
                )
                entries = [dict(r) for r in cur.fetchall()]
        return {"entries": entries}
    else:
        return _read_json("calendar.json", {"entries": []})


def save_calendar(data: dict) -> None:
    if DATABASE_URL:
        with _pg_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM calendar_entries")
                for e in data["entries"]:
                    cur.execute(
                        "INSERT INTO calendar_entries (task_id, task_text, hour, date, done) "
                        "VALUES (%s, %s, %s, %s, %s)",
                        (e["taskId"], e["taskText"], e["hour"], e["date"], e["done"]),
                    )
            conn.commit()
    else:
        _write_json("calendar.json", data)


def load_progress() -> dict:
    if DATABASE_URL:
        with _pg_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT date, tasks_total, tasks_done, calendar_total, calendar_done "
                    "FROM progress_history ORDER BY date"
                )
                records = [dict(r) for r in cur.fetchall()]
        return {"records": records}
    else:
        return _read_json("progress_history.json", {"records": []})


def append_progress(record: dict) -> None:
    if DATABASE_URL:
        with _pg_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO progress_history (date, tasks_total, tasks_done, calendar_total, calendar_done) "
                    "VALUES (%s, %s, %s, %s, %s) "
                    "ON CONFLICT (date) DO UPDATE SET "
                    "tasks_total=EXCLUDED.tasks_total, tasks_done=EXCLUDED.tasks_done, "
                    "calendar_total=EXCLUDED.calendar_total, calendar_done=EXCLUDED.calendar_done",
                    (record["date"], record["tasks_total"], record["tasks_done"],
                     record["calendar_total"], record["calendar_done"]),
                )
            conn.commit()
    else:
        history = _read_json("progress_history.json", {"records": []})
        history["records"].append(record)
        _write_json("progress_history.json", history)


def delete_old_calendar_entries(cutoff_date: str) -> None:
    if DATABASE_URL:
        with _pg_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM calendar_entries WHERE date < %s", (cutoff_date,))
            conn.commit()
