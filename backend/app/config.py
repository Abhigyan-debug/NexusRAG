import os
import logging
import sys
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("nexusrag.startup")


def _mask_database_url(url: str) -> str:
    if not url:
        return "(empty)"
    if url.startswith("sqlite:"):
        return url
    if "@" in url:
        prefix, rest = url.split("@", 1)
        scheme = prefix.split("://")[0] if "://" in prefix else ""
        return f"{scheme}://***@{rest}"
    return url[:32] + "..."


def _resolve_database_uri() -> str:
    """Support SQLite on Render; normalize postgres:// URLs."""
    url = (os.getenv("DATABASE_URL") or "").strip()
    if not url or url.lower() in ("none", "null"):
        data_dir = os.getenv("DATA_DIR") or os.path.join(os.getcwd(), "data")
        os.makedirs(data_dir, exist_ok=True)
        db_path = os.path.join(data_dir, "nexusrag.db").replace("\\", "/")
        return f"sqlite:///{db_path}"

    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    return url


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
    SQLALCHEMY_DATABASE_URI = _resolve_database_uri()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "jwt-secret-key")
    JWT_ACCESS_TOKEN_EXPIRES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES", 86400))
    WTF_CSRF_ENABLED = True
    WTF_CSRF_TIME_LIMIT = None
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    GROK_API_KEY = os.getenv("GROK_API_KEY", "")
    LLM_PROVIDER = os.getenv("LLM_PROVIDER", "gemini")
    UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER") or os.path.join(os.getcwd(), "uploads")
    MAX_CONTENT_LENGTH = int(os.getenv("MAX_CONTENT_LENGTH", 52428800))
    EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
    FAISS_INDEX_PATH = os.getenv("FAISS_INDEX_PATH") or os.path.join(os.getcwd(), "faiss_index")
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
    ALLOWED_EXTENSIONS = {"pdf", "docx", "txt"}
    CHUNK_SIZE = 1000
    CHUNK_OVERLAP = 200
    TOP_K = 5

    USE_HEAVY_NLP = os.getenv("USE_HEAVY_NLP", "false").lower() in ("1", "true", "yes")
    USE_LIGHTWEIGHT_EMBEDDINGS = True
    DOC_PROCESSING_MODE = "thread"
    SKIP_LLM_SUMMARY = os.getenv("SKIP_LLM_SUMMARY", "false").lower() in ("1", "true", "yes")
    EMBEDDING_BATCH_SIZE = int(os.getenv("EMBEDDING_BATCH_SIZE", "16"))


def log_startup_config(app):
    """Log deployment config once at startup (secrets masked)."""
    if logger.handlers:
        return
    handler = logging.StreamHandler(sys.stderr)
    handler.setFormatter(logging.Formatter(
        "%(asctime)s [%(levelname)s] nexusrag.startup: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    ))
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    logger.propagate = False

    logger.info("FRONTEND_URL=%s", app.config.get("FRONTEND_URL"))
    logger.info("DATABASE_URL=%s", _mask_database_url(app.config.get("SQLALCHEMY_DATABASE_URI", "")))
    logger.info("DOC_PROCESSING_MODE=%s", Config.DOC_PROCESSING_MODE)
    logger.info("UPLOAD_FOLDER=%s", app.config.get("UPLOAD_FOLDER"))
    logger.info("FAISS_INDEX_PATH=%s", app.config.get("FAISS_INDEX_PATH"))
    for handler in logger.handlers:
        handler.flush()
