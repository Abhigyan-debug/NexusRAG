"""Gunicorn config tuned for Render free tier (512MB RAM)."""
import os

workers = int(os.getenv("WEB_CONCURRENCY", "1"))
threads = int(os.getenv("GUNICORN_THREADS", "2"))
worker_class = "gthread"

timeout = int(os.getenv("GUNICORN_TIMEOUT", "300"))
graceful_timeout = int(os.getenv("GUNICORN_GRACEFUL_TIMEOUT", "30"))
keepalive = 5

# preload_app loads the full Flask app (faiss, routes, RAG) in the master
# process before forking — on 512MB Render this commonly OOMs and triggers SIGTERM.
preload_app = os.getenv("GUNICORN_PRELOAD", "false").lower() in ("1", "true", "yes")

bind = f"0.0.0.0:{os.getenv('PORT', '5000')}"
accesslog = "-"
errorlog = "-"
loglevel = os.getenv("LOG_LEVEL", "info")
capture_output = True


def on_starting(server):
    server.log.info(
        "Gunicorn starting: workers=%s threads=%s timeout=%ss preload=%s bind=%s",
        workers, threads, timeout, preload_app, bind,
    )


def when_ready(server):
    server.log.info("Gunicorn ready — accepting connections on %s", bind)


def post_worker_init(worker):
    worker.log.info("Worker booted pid=%s", worker.pid)
