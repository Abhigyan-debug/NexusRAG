"""Gunicorn config tuned for Render free tier (512MB RAM)."""
import multiprocessing
import os

# Single worker avoids loading ML models twice and reduces OOM risk.
workers = int(os.getenv("WEB_CONCURRENCY", "1"))
threads = int(os.getenv("GUNICORN_THREADS", "2"))
worker_class = "gthread"

# Document processing can exceed the default 30s worker timeout.
timeout = int(os.getenv("GUNICORN_TIMEOUT", "300"))
graceful_timeout = int(os.getenv("GUNICORN_GRACEFUL_TIMEOUT", "120"))
keepalive = 5

# Load app once in master so SentenceTransformer is shared via fork copy-on-write.
preload_app = True

bind = f"0.0.0.0:{os.getenv('PORT', '5000')}"
accesslog = "-"
errorlog = "-"
loglevel = os.getenv("LOG_LEVEL", "info")
capture_output = True

def on_starting(server):
    server.log.info(
        "Gunicorn starting: workers=%s threads=%s timeout=%ss preload=%s",
        workers, threads, timeout, preload_app,
    )
