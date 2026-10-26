"""SQLite engine, session factory, and schema bootstrap for VidyaSaathi."""
import logging
import os
from pathlib import Path
from typing import Generator

from datetime import datetime, timezone

from sqlalchemy import DateTime, TypeDecorator, create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from modules.backend.src.config import settings


class UTCDateTime(TypeDecorator):
    """A DateTime that always reads back as timezone-aware UTC.

    SQLite has no native timestamp type and drops tzinfo, so values written as
    aware UTC came back naive. Serialised with `.isoformat()` they then carried
    no offset, and browsers read them as local time — making a document uploaded
    seconds ago render as hours old.
    """

    impl = DateTime
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if value.tzinfo is None:
            # Treat a naive value as UTC; everything here is produced by utcnow().
            return value
        return value.astimezone(timezone.utc).replace(tzinfo=None)

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""
    pass


def _resolve_sqlite_path() -> Path:
    """Resolve the on-disk SQLite file, creating its parent directory."""
    raw = settings.database_url
    if raw.startswith("sqlite:///"):
        rel = raw[len("sqlite:///") :]
        path = Path(rel)
        if not path.is_absolute():
            path = settings.project_root / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        return path
    raise ValueError(f"Only sqlite:/// URLs are supported, got {raw!r}")


DB_PATH = _resolve_sqlite_path()
DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False, "timeout": 30},
    pool_pre_ping=True,
    echo=settings.sql_echo,
)


@event.listens_for(engine, "connect")
def _configure_sqlite(dbapi_connection, _connection_record):
    """Enable WAL + foreign keys on every new connection.

    WAL lets the WebSocket teaching loop write progress while dashboard
    reads happen concurrently, instead of hitting 'database is locked'.
    """
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.execute("PRAGMA synchronous=NORMAL")
    cursor.execute("PRAGMA busy_timeout=30000")
    cursor.close()


SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency yielding a request-scoped database session."""
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def _add_missing_columns() -> None:
    """Add columns that exist on the models but not yet in an older database file.

    create_all() only creates missing *tables*, so a schema addition left every
    existing install querying a column SQLite did not have.
    """
    from sqlalchemy import text

    with engine.begin() as conn:
        for table in Base.metadata.sorted_tables:
            existing = {
                row[1]
                for row in conn.execute(text(f"PRAGMA table_info('{table.name}')"))
            }
            if not existing:
                continue  # create_all() will make the whole table
            for column in table.columns:
                if column.name in existing or column.primary_key:
                    continue
                if not (column.nullable or column.server_default is not None):
                    continue  # needs a real migration, not a silent ALTER
                ddl = column.type.compile(dialect=engine.dialect)
                conn.execute(
                    text(f'ALTER TABLE "{table.name}" ADD COLUMN "{column.name}" {ddl}')
                )
                logging.getLogger(__name__).info(
                    "Added missing column %s.%s", table.name, column.name
                )


# (subject, email, name) for the demo subject teachers.
DEMO_TEACHERS = [
    ("Mathematics", "teacher@vidyasaathi.in", "Meera Iyer"),
    ("Science", "science.teacher@vidyasaathi.in", "Arjun Rao"),
    ("Social Science", "sst.teacher@vidyasaathi.in", "Kavita Sharma"),
    ("English", "english.teacher@vidyasaathi.in", "Rahul Mehta"),
    ("Physics", "physics.teacher@vidyasaathi.in", "Neha Gupta"),
    ("Chemistry", "chemistry.teacher@vidyasaathi.in", "Imran Khan"),
    ("Biology", "biology.teacher@vidyasaathi.in", "Priya Nair"),
    ("History & Civics", "history.teacher@vidyasaathi.in", "Vikram Singh"),
    ("Geography", "geography.teacher@vidyasaathi.in", "Ananya Das"),
]


def _seed_default_users() -> None:
    """Ensure standard demo/test accounts exist with verified status across ephemeral container deploys."""
    if not settings.seed_default_users:
        return
    try:
        from modules.backend.src.db.models import User
        from modules.backend.src.security import hash_password
        from sqlalchemy import select

        with SessionLocal() as db:
            from modules.backend.src.services import curriculum

            # One demo teacher per subject, teaching it in every class (6-10) on
            # every board that has it, so each subject's doubts reach that teacher.
            # The maths teacher is also class teacher (mentor) of every class.
            def teaches(subject: str) -> list[dict]:
                return [{"board": b, "grade": g, "subject": subject}
                        for b in curriculum.BOARDS for g in curriculum.GRADES
                        if subject in curriculum.subjects_for(b, g)]

            all_classes = [f"{b}-{g}" for b in curriculum.BOARDS for g in curriculum.GRADES]
            seed_accounts = [
                {"email": "demo@vidyasaathi.in", "full_name": "Demo Student", "role": "student",
                 "profile": {"board": "CBSE", "grade": "9"}},
                {"email": "admin@vidyasaathi.in", "full_name": "Demo Admin", "role": "admin", "profile": {}},
            ]
            for subject, email, name in DEMO_TEACHERS:
                seed_accounts.append({
                    "email": email, "full_name": name, "role": "teacher",
                    "profile": {"teaching_json": teaches(subject),
                                "class_teacher_of": all_classes if subject == "Mathematics" else []},
                })
            seeded = 0
            for acc in seed_accounts:
                user = db.scalars(select(User).where(User.email == acc["email"])).first()
                if not user:
                    user = User(
                        email=acc["email"],
                        password_hash=hash_password(settings.default_demo_password),
                        full_name=acc["full_name"],
                        is_verified=True,
                        is_active=True,
                        role=acc["role"],
                    )
                    db.add(user)
                    seeded += 1
                # Demo accounts are authoritative: their name, role and teaching are reset on start.
                user.role = acc["role"]
                if user.full_name != acc["full_name"]:
                    user.full_name = acc["full_name"]
                    seeded += 1
                for field, value in acc["profile"].items():
                    if field in ("board", "grade") and getattr(user, field):
                        continue  # a demo student may have changed class on purpose
                    if getattr(user, field) != value:
                        setattr(user, field, value)
                        seeded += 1
            if seeded > 0:
                db.commit()
                logging.getLogger(__name__).info("Seeded %d verified persistent user(s)", seeded)
    except Exception as exc:
        logging.getLogger(__name__).warning("User auto-seed encountered error: %s", exc)


def init_db() -> None:
    """Create all tables and patch in new nullable columns. Safe to call repeatedly."""
    from modules.backend.src.db import models  # noqa: F401  (registers mappers)

    Base.metadata.create_all(bind=engine)
    _add_missing_columns()
    _seed_default_users()

