#!/usr/bin/env python3
"""Run the whole VidyaSaathi website with one command.

    python run.py                    the website on localhost:3000 (+ its API)
    python run.py --prod             production build of the frontend
    python run.py --download-models  pre-download the retrieval models first
    python run.py --frontend-only    only the Next.js site on localhost:3000
    python run.py --backend-only     API and legacy UI only, on port 8000

Starts the FastAPI backend (which loads the AI models) and the Next.js
frontend, and stops both on Ctrl+C. On first run it also creates .venv,
installs the Python and frontend dependencies, and copies .env.example to .env.

Needs Python 3.10+ and Node.js 20+ (pnpm is used when installed, else npx pnpm).
"""
import argparse
import os
import shutil
import signal
import subprocess
import sys
import threading
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
FRONTEND = ROOT / "FRONTEND"
VENV = ROOT / ".venv"
WINDOWS = os.name == "nt"
VENV_PYTHON = VENV / ("Scripts/python.exe" if WINDOWS else "bin/python")
FRONTEND_PORT = 3000


def say(message: str) -> None:
    print(f"[run] {message}", flush=True)


def fail(message: str) -> None:
    sys.exit(f"[run] ERROR: {message}")


# -- first-run setup -----------------------------------------------------------

def ensure_venv() -> None:
    """Re-launch inside .venv (creating it if needed) so imports resolve."""
    if Path(sys.prefix).resolve() == VENV.resolve():
        return
    if not VENV_PYTHON.exists():
        if sys.version_info < (3, 10):
            fail("Python 3.10 or newer is required.")
        say("Creating .venv ...")
        subprocess.check_call([sys.executable, "-m", "venv", str(VENV)])
    relaunch = [str(VENV_PYTHON), str(Path(__file__).resolve()), *sys.argv[1:]]
    if not WINDOWS:
        os.execv(relaunch[0], relaunch)
    try:
        sys.exit(subprocess.call(relaunch))
    except KeyboardInterrupt:
        sys.exit(130)


def ensure_backend_deps() -> None:
    try:
        import fastapi, sqlalchemy, uvicorn  # noqa: F401
    except ImportError:
        say("Installing Python dependencies (first run, takes a few minutes) ...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", str(ROOT / "requirements.txt")])


def ensure_env_file() -> None:
    env, example = ROOT / ".env", ROOT / ".env.example"
    if not env.exists() and example.exists():
        shutil.copyfile(example, env)
        say("Created .env from .env.example (set GEMINI_API_KEY there for live AI teaching).")


def pnpm() -> list[str]:
    exe = shutil.which("pnpm")
    if exe:
        return [exe]
    npx = shutil.which("npx")
    if npx:
        return [npx, "--yes", "pnpm"]
    fail("Node.js was not found. Install Node.js 20+ (https://nodejs.org) and run again.")


def ensure_frontend_deps(cmd: list[str]) -> None:
    if not (FRONTEND / "node_modules").exists():
        say("Installing frontend dependencies (first run) ...")
        subprocess.check_call([*cmd, "install"], cwd=FRONTEND)


def env_value(key: str, default: str) -> str:
    """A setting from the environment, else from .env, else the default."""
    if os.getenv(key):
        return os.environ[key]
    try:
        for line in (ROOT / ".env").read_text(encoding="utf-8").splitlines():
            name, _, value = line.partition("=")
            if name.strip() == key and value.strip():
                return value.strip().strip("'\"")
    except OSError:
        pass
    return default


# -- process control -----------------------------------------------------------

def start(cmd: list[str], cwd: Path, env: dict) -> subprocess.Popen:
    """Start a child in its own process group so its whole tree can be stopped."""
    if WINDOWS:
        return subprocess.Popen(cmd, cwd=cwd, env=env, creationflags=subprocess.CREATE_NEW_PROCESS_GROUP)
    return subprocess.Popen(cmd, cwd=cwd, env=env, start_new_session=True)


def stop(proc: subprocess.Popen) -> None:
    if proc.poll() is not None:
        return
    try:
        if WINDOWS:
            subprocess.call(
                ["taskkill", "/F", "/T", "/PID", str(proc.pid)],
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
            )
        else:
            os.killpg(proc.pid, signal.SIGTERM)
            try:
                proc.wait(timeout=10)
            except subprocess.TimeoutExpired:
                os.killpg(proc.pid, signal.SIGKILL)
    except (ProcessLookupError, PermissionError):
        pass


def announce_when_ready(urls: dict[str, str], open_url: str) -> None:
    """Print the addresses once every server answers."""
    def wait() -> None:
        deadline = time.time() + 300
        pending = dict(urls)
        while pending and time.time() < deadline:
            for name, url in list(pending.items()):
                try:
                    urllib.request.urlopen(url, timeout=2).close()
                    del pending[name]
                except Exception:
                    pass
            time.sleep(1)
        if pending:
            say(f"Still waiting on: {', '.join(pending)} (see the output above).")
            return
        print(
            "\n========================================================\n"
            f"  VidyaSaathi is running:  {open_url}\n"
            "  Demo login:  demo@vidyasaathi.in / DemoStudent@123\n"
            "  Press Ctrl+C to stop.\n"
            "========================================================\n",
            flush=True,
        )

    threading.Thread(target=wait, daemon=True).start()


# -- main ----------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="Run the full VidyaSaathi website.")
    parser.add_argument("--prod", action="store_true", help="build and serve the production frontend")
    parser.add_argument("--download-models", action="store_true", help="pre-download the embedding models first")
    parser.add_argument("--backend-only", action="store_true", help="do not start the Next.js frontend")
    parser.add_argument("--frontend-only", action="store_true", help="start only the Next.js frontend (no API)")
    args = parser.parse_args()
    if args.frontend_only and (args.backend_only or args.download_models):
        parser.error("--frontend-only cannot be combined with --backend-only or --download-models")

    if not args.frontend_only:
        ensure_venv()
        ensure_backend_deps()
    ensure_env_file()

    if args.download_models:
        say("Downloading models ...")
        subprocess.check_call([sys.executable, str(ROOT / "scripts" / "setup_and_download_models.py")], cwd=ROOT)

    backend_port = env_value("PORT", "8000")
    backend_url = f"http://localhost:{backend_port}"
    env = dict(os.environ, PYTHONUNBUFFERED="1")
    procs: list[tuple[str, subprocess.Popen]] = []

    # A plain `kill` should clean up the children the same way Ctrl+C does.
    def _terminate(*_):
        raise KeyboardInterrupt

    signal.signal(signal.SIGTERM, _terminate)

    try:
        ready: dict[str, str] = {}
        open_url = backend_url
        if not args.backend_only:
            # The Next.js app is the website; keep port 8000 API-only.
            env["SERVE_LEGACY_UI"] = "false"
        if not args.frontend_only:
            say(f"Starting the API on {backend_url} (the site on port {FRONTEND_PORT} talks to it) ...")
            procs.append(("backend", start([sys.executable, str(ROOT / "scripts" / "run_server.py")], ROOT, env)))
            ready["backend"] = f"{backend_url}/health"

        if not args.backend_only:
            cmd = pnpm()
            ensure_frontend_deps(cmd)
            # Tell the frontend where the backend is unless FRONTEND/.env.local already does.
            fe_env = dict(env)
            fe_env.setdefault("NEXT_PUBLIC_BACKEND_URL", backend_url)
            if args.prod:
                say("Building the frontend ...")
                subprocess.check_call([*cmd, "build"], cwd=FRONTEND, env=fe_env)
            open_url = f"http://localhost:{FRONTEND_PORT}"
            say(f"Starting frontend on {open_url} ...")
            script = "start" if args.prod else "dev"
            procs.append(("frontend", start([*cmd, script], FRONTEND, fe_env)))
            ready["frontend"] = open_url

        announce_when_ready(ready, open_url)

        # Run until either server exits or the user presses Ctrl+C.
        while True:
            for name, proc in procs:
                code = proc.poll()
                if code is not None:
                    say(f"The {name} stopped (exit code {code}). Shutting down.")
                    return
            time.sleep(0.5)
    except KeyboardInterrupt:
        say("Stopping ...")
    finally:
        for _name, proc in reversed(procs):
            stop(proc)


if __name__ == "__main__":
    main()
