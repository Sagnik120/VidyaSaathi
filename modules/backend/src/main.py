"""VidyaSaathi backend: FastAPI app, routers, static frontend, and startup wiring."""
import logging
import os
from pathlib import Path

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from modules.backend.src.api.account_routes import router as account_router
from modules.backend.src.api.admin_routes import router as admin_router
from modules.backend.src.api.auth_routes import router as auth_router
from modules.backend.src.api.curriculum_routes import router as curriculum_router
from modules.backend.src.api.doubt_routes import router as doubt_router
from modules.backend.src.api.notification_routes import router as notification_router
from modules.backend.src.api.test_routes import router as test_router
from modules.backend.src.api.dashboard_routes import router as dashboard_router
from modules.backend.src.api.lesson_routes import router as lesson_router
from modules.backend.src.api.ws import router as ws_router
from modules.backend.src.config import settings
from modules.backend.src.db.base import init_db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

FRONTEND_DIR = Path(__file__).resolve().parents[2] / "frontend" / "src"

# The grading model is warmed once per process, never once per app start-up.
_GRADER_WARMED = False

app = FastAPI(
    title=settings.app_name,
    description="Adaptive AI teacher — accounts, lessons, live classroom, and progress tracking.",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url=None,
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    # e.g. ^https://shikshak-ai(-[a-z0-9-]+)?\.vercel\.app$ so Vercel preview
    # deployments (random subdomains) can reach the backend too.
    allow_origin_regex=os.getenv("CORS_ORIGIN_REGEX") or None,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


# The syllabus path and dashboards are large JSON; compressing them cuts transfer ~5-10x.
app.add_middleware(GZipMiddleware, minimum_size=1024)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
    if not request.url.path.startswith(settings.api_v1_str):
        # Pages and scripts must be re-checked on every load (a cheap 304 when
        # unchanged). Without this, browsers heuristically cached old files, so
        # after an update a new page could run against an OLD shared script —
        # the module import failed and the page stayed blank.
        response.headers.setdefault("Cache-Control", "no-cache")
    return response


@app.exception_handler(RequestValidationError)
async def validation_handler(_request: Request, exc: RequestValidationError):
    """Return the first field error as a readable sentence the UI can show directly."""
    errors = exc.errors()
    if errors:
        first = errors[0]
        field = ".".join(str(p) for p in first.get("loc", []) if p not in ("body", "query"))
        message = first.get("msg", "Invalid input")
        detail = f"{field}: {message}" if field else message
    else:
        detail = "Invalid request."
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, content={"detail": detail}
    )


async def _event_loop_watchdog() -> None:
    """Warn when the event loop stalls. A stall longer than the WebSocket
    keepalive timeout silently drops every live classroom."""
    import asyncio
    import time

    while True:
        started = time.monotonic()
        await asyncio.sleep(1.0)
        lag = time.monotonic() - started - 1.0
        if lag > 2.0:
            logger.warning("Event loop stalled for %.1fs — live classrooms may disconnect", lag)


@app.on_event("startup")
async def _start_watchdog() -> None:
    import asyncio

    app.state.loop_watchdog = asyncio.create_task(_event_loop_watchdog())
    app.state.media_purge = asyncio.create_task(_purge_expired_media_loop())


async def _purge_expired_media_loop() -> None:
    """Teacher-recorded doubt videos expire after a few days; delete them hourly."""
    import asyncio

    from modules.backend.src.db.base import SessionLocal
    from modules.backend.src.services.school import purge_expired_media

    while True:
        try:
            with SessionLocal() as db:
                purge_expired_media(db)
                db.commit()
        except Exception:
            logger.exception("Expired media purge failed")
        await asyncio.sleep(3600)


@app.on_event("startup")
def on_startup() -> None:
    init_db()
    logger.info("Database ready at %s", settings.database_url)

    # Agent-decision traces are emitted by modules that must not import the
    # backend, so the persistence side is wired up here.
    from modules.backend.src.services import agent_trace_sink

    agent_trace_sink.install()
    if not settings.smtp_configured:
        logger.warning(
            "SMTP is not configured — OTP emails will be written to data/outbox/ "
            "and the code returned in the API response as 'dev_otp'. "
            "Set SMTP_USER and SMTP_PASSWORD in .env for real delivery."
        )
    # Warm the AI container so the first lesson request isn't paying import cost.
    try:
        from modules.backend.src.integrations.container import services

        logger.info("AI services ready: %s", ", ".join(sorted(services)))
    except Exception:
        logger.exception("AI service container failed to initialise")

    # The answer-grading model otherwise loads on the first answer, which
    # stalled that learner's first "Grading…" by several seconds.
    global _GRADER_WARMED
    if _GRADER_WARMED or os.getenv("WARM_GRADER", "true").lower() in ("0", "false", "no"):
        return
    _GRADER_WARMED = True

    def _warm_grader() -> None:
        try:
            from modules.ml_core.src.embeddings.embedding_client import get_similarity

            get_similarity("warm up", "warm up")
            logger.info("Answer-grading model ready")
        except Exception:
            logger.warning("Answer-grading model warm-up failed", exc_info=True)

    import threading

    threading.Thread(target=_warm_grader, name="warm-grader", daemon=True).start()


api = settings.api_v1_str
app.include_router(auth_router, prefix=api)
app.include_router(account_router, prefix=api)
app.include_router(lesson_router, prefix=api)
app.include_router(dashboard_router, prefix=api)
app.include_router(ws_router, prefix=api)
app.include_router(admin_router, prefix=api)
app.include_router(curriculum_router, prefix=api)
app.include_router(doubt_router, prefix=api)
app.include_router(test_router, prefix=api)
app.include_router(notification_router, prefix=api)


@app.get("/health", tags=["system"])
def health_check():
    from modules.backend.src.db.base import engine
    from sqlalchemy import text

    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False

    return {
        "status": "ok" if db_ok else "degraded",
        "database": "ok" if db_ok else "unavailable",
        "email": "smtp" if settings.smtp_configured else "dev-outbox",
        "environment": settings.environment,
        "version": app.version,
    }


# --- Static frontend ------------------------------------------------------
# Mounted last so it never shadows an API route.
# SERVE_LEGACY_UI=false (set by run.py) leaves this port API-only, so the
# Next.js app on port 3000 is the only website.
_SERVE_LEGACY_UI = os.getenv("SERVE_LEGACY_UI", "true").strip().lower() not in ("0", "false", "no", "off")

if not _SERVE_LEGACY_UI:
    logger.info("Legacy static frontend disabled (SERVE_LEGACY_UI=false); serving the API only")
elif FRONTEND_DIR.exists():

    @app.get("/", include_in_schema=False)
    def index():
        return FileResponse(FRONTEND_DIR / "index.html")

    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")
else:
    logger.warning("Frontend directory not found at %s", FRONTEND_DIR)
