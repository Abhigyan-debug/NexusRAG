from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import os
import uuid
import re
import bcrypt

from app.extensions import db, limiter
from app.models import User
from app.utils import sanitize_input

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.route("/register", methods=["POST"])
@limiter.limit("10 per minute")
def register():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid request body"}), 400

    email = sanitize_input(data.get("email", "")).lower()
    password = data.get("password", "")
    name = sanitize_input(data.get("name", ""))

    if not email or not password or not name:
        return jsonify({"error": "Email, password, and name are required"}), 400
    
    # Proper email + password validation
    if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
        return jsonify({"error": "Invalid email format"}), 400
    if len(password) < 8 or not re.search(r"\d", password) or not re.search(r"[a-zA-Z]", password):
        return jsonify({"error": "Password must be at least 8 characters long and contain both letters and numbers"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered"}), 409

    # Hash passwords securely using bcrypt
    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

    user = User(
        email=email,
        password_hash=hashed.decode('utf-8'),
        name=name,
    )
    db.session.add(user)
    db.session.commit()

    from flask_jwt_extended import create_access_token
    token = create_access_token(identity=str(user.id), additional_claims={"role": user.role})

    return jsonify({"message": "Registration successful", "token": token, "user": user.to_dict()}), 201


@auth_bp.route("/login", methods=["POST"])
@limiter.limit("20 per minute")
def login():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid request body"}), 400

    email = sanitize_input(data.get("email", "")).lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "Invalid email or password"}), 401

    # Verify bcrypt or werkzeug hashes for backward compatibility
    is_valid = False
    if user.password_hash.startswith("pbkdf2:"):
        is_valid = check_password_hash(user.password_hash, password)
    else:
        is_valid = bcrypt.checkpw(password.encode('utf-8'), user.password_hash.encode('utf-8'))

    if not is_valid:
        return jsonify({"error": "Invalid email or password"}), 401

    from flask_jwt_extended import create_access_token
    token = create_access_token(identity=str(user.id), additional_claims={"role": user.role})

    return jsonify({"token": token, "user": user.to_dict()})

@auth_bp.route("/logout", methods=["POST"])
@jwt_required()
def logout():
    # Session management and logout functionality (client will discard token, and we can implement token blocklist later)
    return jsonify({"message": "Successfully logged out"}), 200


@auth_bp.route("/refresh", methods=["POST"])
@jwt_required()
def refresh():
    """Refresh JWT token with extended expiration"""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    from flask_jwt_extended import create_access_token
    new_token = create_access_token(identity=str(user.id), additional_claims={"role": user.role})
    return jsonify({"token": new_token, "user": user.to_dict()})


@auth_bp.route("/profile", methods=["GET"])
@jwt_required()
def profile():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(user.to_dict())


@auth_bp.route("/profile", methods=["PUT"])
@jwt_required()
def update_profile():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json()
    if data.get("name"):
        user.name = sanitize_input(data["name"])
    db.session.commit()
    return jsonify(user.to_dict())
