import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL", "sqlite:///nexusrag.db"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "jwt-secret-key")
    JWT_ACCESS_TOKEN_EXPIRES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES", 86400))
    WTF_CSRF_ENABLED = True
    WTF_CSRF_TIME_LIMIT = None
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    GROK_API_KEY = os.getenv("GROK_API_KEY", "")
    LLM_PROVIDER = os.getenv("LLM_PROVIDER", "gemini")  # "gemini" or "grok"
    UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", "uploads")
    MAX_CONTENT_LENGTH = int(os.getenv("MAX_CONTENT_LENGTH", 52428800))
    EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
    FAISS_INDEX_PATH = os.getenv("FAISS_INDEX_PATH", "faiss_index")
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
    ALLOWED_EXTENSIONS = {"pdf", "docx", "txt"}
    CHUNK_SIZE = 1000
    CHUNK_OVERLAP = 200
    TOP_K = 5
