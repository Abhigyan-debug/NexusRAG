import os
import logging
from flask import Flask, jsonify, request
from flask_cors import CORS

from app.config import Config, log_startup_config
from app.extensions import db, jwt, limiter

logger = logging.getLogger("nexusrag.startup")


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
    os.makedirs(app.config["FAISS_INDEX_PATH"], exist_ok=True)

    db.init_app(app)
    jwt.init_app(app)
    limiter.init_app(app)

    origins = _cors_origins(app)

    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": origins
            }
        },
        supports_credentials=True,
        allow_headers=[
            "Content-Type",
            "Authorization",
            "X-Requested-With",
            "X-AI-Model",
            "X-API-Key",
        ],
    )

    @app.before_request
    def handle_preflight():
        if request.method == "OPTIONS":
            resp = app.make_response("")
            origin = request.headers.get("Origin")
            allowed = _cors_origins(app)
            if origin and origin in allowed:
                resp.headers["Access-Control-Allow-Origin"] = origin
            resp.headers["Access-Control-Allow-Headers"] = (
                "Content-Type, Authorization, X-Requested-With, X-AI-Model, X-API-Key"
            )
            resp.headers["Access-Control-Allow-Methods"] = (
                "GET, POST, PUT, DELETE, OPTIONS"
            )
            resp.headers["Access-Control-Allow-Credentials"] = "true"
            resp.headers["Access-Control-Max-Age"] = "86400"
            return resp

    @app.after_request
    def after_request(response):
        origin = request.headers.get("Origin")

        if origin and origin in origins:
            response.headers["Access-Control-Allow-Origin"] = origin

        response.headers["Access-Control-Allow-Headers"] = (
            "Content-Type, Authorization, X-Requested-With, X-AI-Model, X-API-Key"
        )

        response.headers["Access-Control-Allow-Methods"] = (
            "GET, POST, PUT, DELETE, OPTIONS"
        )

        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Max-Age"] = "86400"

        return response

    from app.routes.auth import auth_bp
    from app.routes.documents import documents_bp
    from app.routes.chat import chat_bp
    from app.routes.analytics import analytics_bp
    from app.routes.knowledge_graph import kg_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(documents_bp)
    app.register_blueprint(chat_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(kg_bp)

    @app.route("/")
    @app.route("/api/health")
    @limiter.exempt
    def health():
        return jsonify({
            "status": "healthy",
            "service": "NexusRAG API"
        }), 200

    log_startup_config(app)

    try:
        with app.app_context():
            db.create_all()
            _ensure_document_error_column()
            logger.info("Database initialized OK")
    except Exception as exc:
        logger.error(
            "Database init failed (API will still serve /api/health): %s",
            exc
        )

    return app


def _cors_origins(app):
    origins = {
        app.config.get(
            "FRONTEND_URL",
            "https://nexus-rag-jade.vercel.app"
        ),
        "https://nexus-rag-jade.vercel.app",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    }

    extra = os.getenv("CORS_ORIGINS", "")
    for origin in extra.split(","):
        origin = origin.strip()
        if origin:
            origins.add(origin)

    return list(origins)


def _ensure_document_error_column():
    from sqlalchemy import inspect, text
    from app.extensions import db

    try:
        inspector = inspect(db.engine)

        if "documents" not in inspector.get_table_names():
            return

        columns = {
            c["name"]
            for c in inspector.get_columns("documents")
        }

        if "error_message" not in columns:
            with db.engine.begin() as conn:
                conn.execute(
                    text(
                        "ALTER TABLE documents "
                        "ADD COLUMN error_message TEXT"
                    )
                )
    except Exception:
        pass