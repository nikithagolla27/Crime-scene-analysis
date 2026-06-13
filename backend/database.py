import sqlite3, json, os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "crimesolver.db")

def _conn():
    c = sqlite3.connect(DB_PATH)
    c.row_factory = sqlite3.Row
    return c

def init_db():
    with _conn() as c:
        c.execute("""
            CREATE TABLE IF NOT EXISTS cases (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                case_id      TEXT UNIQUE NOT NULL,
                filename     TEXT,
                timestamp    TEXT,
                scene_type   TEXT,
                confidence   REAL,
                threat_level TEXT,
                threat_score REAL,
                description  TEXT,
                detections   TEXT,
                validation   TEXT,
                image_path   TEXT,
                created_at   TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        c.commit()
    print("✅ Database initialized")

def save_case(result: dict):
    threat = result.get("threat_level", {})
    clf    = result.get("classification", {})
    with _conn() as c:
        c.execute("""
            INSERT OR REPLACE INTO cases
            (case_id, filename, timestamp, scene_type, confidence,
             threat_level, threat_score, description, detections, validation, image_path)
            VALUES (?,?,?,?,?,?,?,?,?,?,?)
        """, (
            result.get("case_id"),
            result.get("filename"),
            result.get("timestamp"),
            clf.get("scene_type")   if isinstance(clf, dict)    else result.get("scene_type"),
            clf.get("confidence")   if isinstance(clf, dict)    else result.get("confidence"),
            threat.get("level")     if isinstance(threat, dict) else result.get("threat_level"),
            threat.get("score")     if isinstance(threat, dict) else result.get("threat_score"),
            result.get("description"),
            json.dumps(result.get("detections", [])),
            json.dumps(result.get("validation",  {})),
            result.get("image_path"),
        ))
        c.commit()

def get_all_cases() -> list:
    with _conn() as c:
        rows = c.execute("SELECT * FROM cases ORDER BY created_at DESC").fetchall()
        return [_to_dict(r) for r in rows]

def get_case_by_id(case_id: str):
    with _conn() as c:
        row = c.execute("SELECT * FROM cases WHERE case_id=?", (case_id,)).fetchone()
        return _to_dict(row) if row else None

def delete_case_by_id(case_id: str) -> bool:
    with _conn() as c:
        cur = c.execute("DELETE FROM cases WHERE case_id=?", (case_id,))
        c.commit()
        return cur.rowcount > 0

def _to_dict(row) -> dict:
    d = dict(row)
    for field in ("detections", "validation"):
        if d.get(field):
            try:
                d[field] = json.loads(d[field])
            except Exception:
                pass
    return d
