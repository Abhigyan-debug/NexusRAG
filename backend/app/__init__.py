import os
from flask import Flask, jsonify
from flask_cors import CORS

from app.config import Config
from app.extensions import db, jwt, limiter


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
    os.makedirs(app.config["FAISS_INDEX_PATH"], exist_ok=True)

    db.init_app(app)
    jwt.init_app(app)
   # limiter.init_app(app)

    CORS(app, supports_credentials=True)

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

    @app.route("/api/health")
    def health():
        return jsonify({"status": "healthy", "service": "NexusRAG API"})

    with app.app_context():
        db.create_all()

    return app
