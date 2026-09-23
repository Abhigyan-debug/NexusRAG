from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from werkzeug.security import check_password_hash
import os
import re
import bcrypt

from app.extensions import db, limiter
from app.models import User, UserSession
from app.utils import sanitize_input
from app.security import (
    issue_token, log_activity, describe_user_agent,
    active_sessions_query, revoke_sessions, session_to_dict,
    generate_totp_secret, totp_uri, match_totp,
    generate_recovery_codes, verify_second_factor, is_admin_email,
)

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


def _check_password(user, password):
    if user.password_hash.startswith("pbkdf2:"):
        return check_password_hash(user.password_hash, password)
    return bcrypt.checkpw(password.encode("utf-8"), user.password_hash.encode("utf-8"))


def _password_error(password):
    if len(password) < 8 or not re.search(r"\d", password) or not re.search(r"[a-zA-Z]", password):
        return "Password must be at least 8 characters long and contain both letters and numbers"
    return None


def _current_user():
    return db.session.get(User, int(get_jwt_identity()))


def _sync_admin_role(user):
    """Grant admin to accounts listed in ADMIN_EMAILS. Caller commits."""
    if is_admin_email(user.email) and user.role != "admin":
        user.role = "admin"


def _device_label():
    info = describe_user_agent(request.headers.get("User-Agent"))
    return f"{info['browser']} on {info['os']}"


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

    if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
        return jsonify({"error": "Invalid email format"}), 400
    error = _password_error(password)
    if error:
        return jsonify({"error": error}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered"}), 409

    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
    user = User(email=email, password_hash=hashed.decode("utf-8"), name=name)
    _sync_admin_role(user)
    db.session.add(user)
    db.session.commit()

    log_activity(user.id, "account_created", _device_label())
    token = issue_token(user)
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
    if not user or not _check_password(user, password):
        return jsonify({"error": "Invalid email or password"}), 401

    if user.totp_enabled:
        code = (data.get("otp") or "").strip()
        if not code:
            # Password is correct; the client must resend it together with a code
            return jsonify({"two_factor_required": True})
        method = verify_second_factor(user, code)
        if not method:
            return jsonify({"error": "Invalid authentication code", "two_factor_required": True}), 401
        db.session.commit()
        if method == "recovery":
            log_activity(user.id, "recovery_code_used", f"{len(user.totp_recovery_codes or [])} codes left")

    _sync_admin_role(user)
    log_activity(user.id, "signed_in", _device_label())
    token = issue_token(user)
    return jsonify({"token": token, "user": user.to_dict()})


@auth_bp.route("/logout", methods=["POST"])
@jwt_required()
def logout():
    sid = get_jwt().get("sid")
    if sid:
        s = db.session.get(UserSession, sid)
        if s and not s.revoked_at:
            from datetime import datetime
            s.revoked_at = datetime.utcnow()
            db.session.commit()
    return jsonify({"message": "Successfully logged out"}), 200


@auth_bp.route("/refresh", methods=["POST"])
@jwt_required()
def refresh():
    """Refresh JWT token with extended expiration, keeping the same session."""
    user = _current_user()
    if not user:
        return jsonify({"error": "User not found"}), 404
    new_token = issue_token(user, session_id=get_jwt().get("sid"))
    return jsonify({"token": new_token, "user": user.to_dict()})


@auth_bp.route("/profile", methods=["GET"])
@jwt_required()
def profile():
    user = _current_user()
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(user.to_dict())


@auth_bp.route("/profile", methods=["PUT"])
@jwt_required()
def update_profile():
    user = _current_user()
    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json() or {}
    name = sanitize_input(data.get("name", ""))
    if name and name != user.name:
        user.name = name
        log_activity(user.id, "profile_updated", "Display name", commit=False)
    db.session.commit()
    return jsonify(user.to_dict())


@auth_bp.route("/password", methods=["PUT"])
@jwt_required()
@limiter.limit("10 per hour")
def change_password():
    user = _current_user()
    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json() or {}
    if not _check_password(user, data.get("current_password", "")):
        return jsonify({"error": "Current password is incorrect"}), 400
    new = data.get("new_password", "")
    error = _password_error(new)
    if error:
        return jsonify({"error": error}), 400

    user.password_hash = bcrypt.hashpw(new.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    # A password change signs out every other device
    signed_out = revoke_sessions(user.id, keep_session_id=get_jwt().get("sid"))
    log_activity(user.id, "password_changed", _device_label(), commit=False)
    db.session.commit()
    return jsonify({"message": "Password changed successfully", "sessions_revoked": signed_out})


@auth_bp.route("/account", methods=["DELETE"])
@jwt_required()
@limiter.limit("5 per hour")
def delete_account():
    from app.models import Analytics, KnowledgeGraphNode, KnowledgeGraphEdge
    from app.services.rag_pipeline import get_rag_pipeline

    user = _current_user()
    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json(silent=True) or {}
    if not _check_password(user, data.get("password", "")):
        return jsonify({"error": "Password is incorrect"}), 400

    upload_folder = current_app.config["UPLOAD_FOLDER"]
    pipeline = get_rag_pipeline()
    for doc in user.documents.all():
        try:
            pipeline.delete_document_vectors(user.id, doc)
        except Exception:
            current_app.logger.exception("Failed to remove vectors for document %s", doc.id)
        filepath = os.path.join(upload_folder, doc.filename)
        if os.path.exists(filepath):
            os.remove(filepath)

    KnowledgeGraphEdge.query.filter_by(user_id=user.id).delete()
    KnowledgeGraphNode.query.filter_by(user_id=user.id).delete()
    Analytics.query.filter_by(user_id=user.id).delete()
    db.session.delete(user)  # cascades to documents, chunks, chats, sessions and activity
    db.session.commit()
    return jsonify({"message": "Account deleted"})


# ---------------------------------------------------------------------------
# Sessions
# ---------------------------------------------------------------------------

@auth_bp.route("/sessions", methods=["GET"])
@jwt_required()
def list_sessions():
    user_id = int(get_jwt_identity())
    current_sid = get_jwt().get("sid")
    sessions = active_sessions_query(user_id).order_by(UserSession.last_seen_at.desc()).all()
    items = [session_to_dict(s, current_sid) for s in sessions]
    items.sort(key=lambda s: not s["current"])  # current device first
    return jsonify({"sessions": items, "current_session_tracked": bool(current_sid)})


@auth_bp.route("/sessions/<session_id>", methods=["DELETE"])
@jwt_required()
def revoke_session(session_id):
    from datetime import datetime
    user_id = int(get_jwt_identity())
    s = UserSession.query.filter_by(id=session_id, user_id=user_id).first()
    if not s:
        return jsonify({"error": "Session not found"}), 404
    if not s.revoked_at:
        s.revoked_at = datetime.utcnow()
        info = describe_user_agent(s.user_agent)
        log_activity(user_id, "session_revoked", f"{info['browser']} on {info['os']}", commit=False)
        db.session.commit()
    return jsonify({"message": "Session revoked", "current": s.id == get_jwt().get("sid")})


@auth_bp.route("/sessions/revoke-others", methods=["POST"])
@jwt_required()
def revoke_other_sessions():
    user_id = int(get_jwt_identity())
    count = revoke_sessions(user_id, keep_session_id=get_jwt().get("sid"))
    if count:
        log_activity(user_id, "sessions_revoked", f"{count} other device{'s' if count != 1 else ''}", commit=False)
    db.session.commit()
    return jsonify({"message": "Other sessions revoked", "revoked": count})


# ---------------------------------------------------------------------------
# Two-factor authentication
# ---------------------------------------------------------------------------

@auth_bp.route("/2fa/setup", methods=["POST"])
@jwt_required()
@limiter.limit("10 per hour")
def two_factor_setup():
    user = _current_user()
    if user.totp_enabled:
        return jsonify({"error": "Two-factor authentication is already enabled"}), 400
    user.totp_secret = generate_totp_secret()
    user.totp_last_counter = None
    db.session.commit()
    return jsonify({"secret": user.totp_secret, "otpauth_uri": totp_uri(user.totp_secret, user.email)})


@auth_bp.route("/2fa/enable", methods=["POST"])
@jwt_required()
@limiter.limit("20 per hour")
def two_factor_enable():
    user = _current_user()
    if user.totp_enabled:
        return jsonify({"error": "Two-factor authentication is already enabled"}), 400
    if not user.totp_secret:
        return jsonify({"error": "Start setup first"}), 400

    counter = match_totp(user.totp_secret, (request.get_json() or {}).get("code", ""))
    if counter is None:
        return jsonify({"error": "That code is not valid. Check your authenticator app and try again."}), 400

    codes, hashes = generate_recovery_codes()
    user.totp_enabled = True
    user.totp_last_counter = counter
    user.totp_recovery_codes = hashes
    log_activity(user.id, "2fa_enabled", "Authenticator app", commit=False)
    db.session.commit()
    return jsonify({"recovery_codes": codes, "user": user.to_dict()})


@auth_bp.route("/2fa/disable", methods=["POST"])
@jwt_required()
@limiter.limit("10 per hour")
def two_factor_disable():
    user = _current_user()
    if not user.totp_enabled:
        return jsonify({"error": "Two-factor authentication is not enabled"}), 400
    data = request.get_json() or {}
    if not _check_password(user, data.get("password", "")):
        return jsonify({"error": "Password is incorrect"}), 400
    if not verify_second_factor(user, data.get("code", "")):
        return jsonify({"error": "Invalid authentication code"}), 400

    user.totp_enabled = False
    user.totp_secret = None
    user.totp_recovery_codes = None
    user.totp_last_counter = None
    log_activity(user.id, "2fa_disabled", _device_label(), commit=False)
    db.session.commit()
    return jsonify({"user": user.to_dict()})


@auth_bp.route("/2fa/recovery-codes", methods=["POST"])
@jwt_required()
@limiter.limit("10 per hour")
def regenerate_recovery_codes():
    user = _current_user()
    if not user.totp_enabled:
        return jsonify({"error": "Two-factor authentication is not enabled"}), 400
    counter = match_totp(user.totp_secret, (request.get_json() or {}).get("code", ""), user.totp_last_counter)
    if counter is None:
        return jsonify({"error": "Invalid authentication code"}), 400

    codes, hashes = generate_recovery_codes()
    user.totp_last_counter = counter
    user.totp_recovery_codes = hashes
    log_activity(user.id, "recovery_codes_regenerated", None, commit=False)
    db.session.commit()
    return jsonify({"recovery_codes": codes, "user": user.to_dict()})
