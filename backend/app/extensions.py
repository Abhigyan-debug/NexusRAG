from flask import request as flask_request
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

db = SQLAlchemy()
jwt = JWTManager()
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[],
    request_filter=lambda: flask_request.method == "OPTIONS",
)
