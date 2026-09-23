from datetime import datetime, timedelta
from functools import wraps

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from sqlalchemy import or_

from app.extensions import db
from app.models import User, UserSession
from app.security import (
    active_session_filters, describe_user_agent, log_activity, session_status, session_lifetime,
)

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")


def admin_required(fn):
    """Checks the role in the database, not the JWT claim, so a demoted admin loses access at once."""
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        user = db.session.get(User, int(get_jwt_identity()))
        if not user or user.role != "admin":
            return jsonify({"error": "Admin access required"}), 403
        return fn(*args, **kwargs)
    return wrapper


def _iso(dt):
    return dt.isoformat() + "Z" if dt else None


@admin_bp.route("/overview", methods=["GET"])
@admin_required
def overview():
    now = datetime.utcnow()
    day_ago = now - timedelta(days=1)
    active = UserSession.query.filter(*active_session_filters())
    return jsonify({
        "total_users": User.query.count(),
        "active_sessions": active.count(),
        "active_users": active.with_entities(UserSession.user_id).distinct().count(),
        "sign_ins_24h": UserSession.query.filter(UserSession.created_at >= day_ago).count(),
        "users_with_2fa": User.query.filter(User.totp_enabled.is_(True)).count(),
    })


@admin_bp.route("/sessions", methods=["GET"])
@admin_required
def list_sessions():
    """Sign-in history across all users (every sign-in creates one session row)."""
    status = request.args.get("status", "active")
    q = (request.args.get("q") or "").strip()
    page = max(1, request.args.get("page", 1, type=int))
    per_page = max(1, min(request.args.get("per_page", 25, type=int), 100))

    query = db.session.query(UserSession, User).join(User, User.id == UserSession.user_id)
    cutoff = datetime.utcnow() - session_lifetime()
    if status == "active":
        query = query.filter(*active_session_filters())
    elif status == "revoked":
        query = query.filter(UserSession.revoked_at.isnot(None))
    elif status == "expired":
        query = query.filter(
            UserSession.revoked_at.is_(None),
            or_(UserSession.created_at < cutoff, UserSession.last_seen_at < cutoff),
        )
    if q:
        like = f"%{q}%"
        query = query.filter(or_(User.email.ilike(like), User.name.ilike(like), UserSession.ip_address.ilike(like)))

    total = query.count()
    rows = (query.order_by(UserSession.created_at.desc())
            .offset((page - 1) * per_page).limit(per_page).all())
    current_sid = get_jwt().get("sid")

    items = []
    for s, u in rows:
        items.append({
            "id": s.id,
            **describe_user_agent(s.user_agent),
            "ip_address": s.ip_address,
            "created_at": _iso(s.created_at),
            "last_seen_at": _iso(s.last_seen_at),
            "revoked_at": _iso(s.revoked_at),
            "status": session_status(s),
            "current": s.id == current_sid,
            "user": {
                "id": u.id,
                "name": u.name,
                "email": u.email,
                "role": u.role,
                "two_factor_enabled": bool(u.totp_enabled),
            },
        })

    return jsonify({
        "items": items,
        "pagination": {"page": page, "per_page": per_page, "total": total,
                       "pages": max(1, (total + per_page - 1) // per_page)},
    })


@admin_bp.route("/sessions/<session_id>", methods=["DELETE"])
@admin_required
def revoke_session(session_id):
    s = db.session.get(UserSession, session_id)
    if not s:
        return jsonify({"error": "Session not found"}), 404
    if s.id == get_jwt().get("sid"):
        return jsonify({"error": "Use Sign Out to end your own session"}), 400
    if not s.revoked_at:
        s.revoked_at = datetime.utcnow()
        info = describe_user_agent(s.user_agent)
        # Shows up in the affected user's own activity feed
        log_activity(s.user_id, "session_revoked_by_admin", f"{info['browser']} on {info['os']}", commit=False)
        db.session.commit()
    return jsonify({"message": "Session revoked"})
